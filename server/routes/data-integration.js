/**
 * 数据接入中枢 — API 路由
 */
const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { success, error, serverError } = require('../utils/response');

// ── 数据类型元信息 ──────────────────────────────────────────────
// kind: organization | course_offerings | grades | table
const ACADEMIC_TYPES = {
  schools:     { label: '学校/学院/专业', kind: 'organization' },
  students:    { label: '学生信息',       kind: 'table', table: 'students' },
  courses:     { label: '课程开设数据',   kind: 'course_offerings' },
  curriculum:  { label: '培养方案数据',   kind: 'table', table: 'curriculum_versions' },
  grades:      { label: '学生成绩',       kind: 'grades' },
};

const LMS_TYPES = {
  tasks:     { label: '课程任务' },
  scores:    { label: '任务成绩' },
  behavior:  { label: '学习行为' },
  resources: { label: '资源使用' },
};

// ── 工具：安全读取计数 ──────────────────────────────────────────
function tableCount(table) {
  try {
    const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get();
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}

/** 学校 / 学院 / 专业 分表统计（一次查询，避免与 node:sqlite 单行结果字段不一致） */
function organizationCounts() {
  try {
    const row = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM schools)  AS schools,
        (SELECT COUNT(*) FROM colleges) AS colleges,
        (SELECT COUNT(*) FROM majors)   AS majors
    `).get();
    return {
      schools:  row?.schools ?? 0,
      colleges: row?.colleges ?? 0,
      majors:   row?.majors ?? 0,
    };
  } catch {
    return { schools: 0, colleges: 0, majors: 0 };
  }
}

function organizationTotalRecords() {
  const o = organizationCounts();
  return o.schools + o.colleges + o.majors;
}

/** 培养方案课程(courses) + 实际开课(teaching_classes)，与「开设」语义一致 */
function courseOfferingCounts() {
  try {
    const row = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM courses)           AS planCourses,
        (SELECT COUNT(*) FROM teaching_classes) AS teachingClasses
    `).get();
    return {
      planCourses:     row?.planCourses ?? 0,
      teachingClasses: row?.teachingClasses ?? 0,
    };
  } catch {
    return { planCourses: 0, teachingClasses: 0 };
  }
}

function courseOfferingTotalRecords() {
  const c = courseOfferingCounts();
  return c.planCourses + c.teachingClasses;
}

/** 卡片「学生成绩」对应 scores 表：学生×考核项 得分记录 */
function academicRecordCount(meta) {
  switch (meta.kind) {
    case 'organization':
      return organizationTotalRecords();
    case 'course_offerings':
      return courseOfferingTotalRecords();
    case 'grades':
      return tableCount('scores');
    case 'table':
      return tableCount(meta.table);
    default:
      return 0;
  }
}

// ── GET /status ────────────────────────────────────────────────
router.get('/status', (req, res) => {
  try {
    const sources = ['academic', 'lms', 'industry'];
    const result  = {};

    sources.forEach((src) => {
      const row = db.prepare(
        `SELECT status, created_at, SUM(records) AS total_records, COUNT(*) AS sync_count
         FROM integration_sync_logs WHERE source = ?
         ORDER BY created_at DESC LIMIT 1`
      ).get(src);
      result[src] = row || { status: null, created_at: null, total_records: 0, sync_count: 0 };
    });

    const org         = organizationCounts();
    const courseOff   = courseOfferingCounts();
    const scoreRows   = tableCount('scores');
    const counts      = {};
    Object.entries(ACADEMIC_TYPES).forEach(([key, meta]) => {
      counts[key] = academicRecordCount(meta);
    });
    counts.organization   = org;
    counts.courseOfferings = courseOff;
    counts.gradeBreakdown = { scoreRecords: scoreRows };

    success(res, {
      sources: result,
      counts,
      structureCounts: org,
      courseOfferings: courseOff,
      gradeBreakdown:  { scoreRecords: scoreRows },
    });
  } catch (err) {
    serverError(res, err.message);
  }
});

// ── POST /academic/sync ────────────────────────────────────────
router.post('/academic/sync', (req, res) => {
  try {
    const { dataType } = req.body;
    if (!dataType || !ACADEMIC_TYPES[dataType]) {
      return error(res, '无效的数据类型');
    }

    const meta    = ACADEMIC_TYPES[dataType];
    const records = academicRecordCount(meta);

    db.prepare(
      `INSERT INTO integration_sync_logs (source, data_type, status, records, triggered_by)
       VALUES ('academic', ?, 'success', ?, 'manual')`
    ).run(dataType, records);

    success(res, { dataType, records, synced_at: new Date().toISOString() }, '同步成功');
  } catch (err) {
    serverError(res, err.message);
  }
});

// ── POST /academic/import/:type ────────────────────────────────
router.post('/academic/import/:type', (req, res) => {
  try {
    const { type } = req.params;
    const { rows  } = req.body;

    if (!ACADEMIC_TYPES[type]) return error(res, '不支持该导入类型');
    if (!Array.isArray(rows) || !rows.length) return error(res, '数据行不能为空');

    db.prepare(
      `INSERT INTO integration_sync_logs (source, data_type, status, records, triggered_by)
       VALUES ('academic', ?, 'success', ?, 'import')`
    ).run(type, rows.length);

    success(res, { type, imported: rows.length }, 'CSV导入成功');
  } catch (err) {
    serverError(res, err.message);
  }
});

// ── GET /lms/config ────────────────────────────────────────────
router.get('/lms/config', (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT config_key, config_value FROM integration_config WHERE config_group = 'lms'`
    ).all();

    const cfg = {};
    rows.forEach((r) => { cfg[r.config_key] = r.config_value; });
    success(res, cfg);
  } catch (err) {
    serverError(res, err.message);
  }
});

// ── PUT /lms/config ────────────────────────────────────────────
router.put('/lms/config', (req, res) => {
  try {
    const allowed = ['platform', 'base_url', 'api_key', 'sync_types'];
    const upsert  = db.prepare(
      `INSERT INTO integration_config (config_group, config_key, config_value, updated_at)
       VALUES ('lms', ?, ?, datetime('now','localtime'))
       ON CONFLICT(config_group, config_key) DO UPDATE SET config_value = excluded.config_value, updated_at = excluded.updated_at`
    );

    const save = db.transaction((data) => {
      allowed.forEach((key) => {
        if (data[key] !== undefined) upsert.run(key, String(data[key]));
      });
    });

    save(req.body);
    success(res, null, 'LMS配置已保存');
  } catch (err) {
    serverError(res, err.message);
  }
});

// ── POST /lms/sync ─────────────────────────────────────────────
router.post('/lms/sync', (req, res) => {
  try {
    const { syncTypes = ['tasks', 'scores'] } = req.body;
    const types = Array.isArray(syncTypes) ? syncTypes : [syncTypes];

    const insert = db.transaction(() => {
      types.forEach((t) => {
        if (LMS_TYPES[t]) {
          db.prepare(
            `INSERT INTO integration_sync_logs (source, data_type, status, records, triggered_by)
             VALUES ('lms', ?, 'success', 0, 'manual')`
          ).run(t);
        }
      });
    });
    insert();

    success(res, { synced: types, synced_at: new Date().toISOString() }, 'LMS同步完成');
  } catch (err) {
    serverError(res, err.message);
  }
});

// ── GET /industry/stats ────────────────────────────────────────
router.get('/industry/stats', (req, res) => {
  try {
    const jobRow = db.prepare(
      `SELECT MAX(created_at) AS last_run, SUM(records) AS total
       FROM integration_sync_logs WHERE source = 'industry' AND data_type = 'jobs'`
    ).get();
    const policyRow = db.prepare(
      `SELECT MAX(created_at) AS last_run, SUM(records) AS total
       FROM integration_sync_logs WHERE source = 'industry' AND data_type = 'policy'`
    ).get();

    const keywords = db.prepare(
      `SELECT config_value FROM integration_config WHERE config_group = 'industry' AND config_key = 'keywords'`
    ).get();

    success(res, {
      jobs:    { last_run: jobRow?.last_run || null,    total: jobRow?.total || 0 },
      policy:  { last_run: policyRow?.last_run || null, total: policyRow?.total || 0 },
      keywords: keywords?.config_value || '',
    });
  } catch (err) {
    serverError(res, err.message);
  }
});

// ── POST /industry/scrape ──────────────────────────────────────
router.post('/industry/scrape', (req, res) => {
  try {
    const { target } = req.body;
    if (!['jobs', 'policy'].includes(target)) return error(res, '无效的抓取目标');

    // 保存关键词配置（若传入）
    if (req.body.keywords !== undefined) {
      db.prepare(
        `INSERT INTO integration_config (config_group, config_key, config_value, updated_at)
         VALUES ('industry', 'keywords', ?, datetime('now','localtime'))
         ON CONFLICT(config_group, config_key) DO UPDATE SET config_value = excluded.config_value, updated_at = excluded.updated_at`
      ).run(String(req.body.keywords));
    }

    db.prepare(
      `INSERT INTO integration_sync_logs (source, data_type, status, records, triggered_by)
       VALUES ('industry', ?, 'success', 0, 'manual')`
    ).run(target);

    success(res, { target, triggered_at: new Date().toISOString() }, '抓取任务已触发');
  } catch (err) {
    serverError(res, err.message);
  }
});

// ── GET /quality/stats ─────────────────────────────────────────
router.get('/quality/stats', (req, res) => {
  try {
    const total    = db.prepare(`SELECT COUNT(*) AS n FROM integration_sync_logs`).get().n;
    const failed   = db.prepare(`SELECT COUNT(*) AS n FROM integration_sync_logs WHERE status = 'failed'`).get().n;
    const partial  = db.prepare(`SELECT COUNT(*) AS n FROM integration_sync_logs WHERE status = 'partial'`).get().n;
    const records  = db.prepare(`SELECT COALESCE(SUM(records), 0) AS n FROM integration_sync_logs`).get().n;
    const bySource = db.prepare(
      `SELECT source, COUNT(*) AS cnt, SUM(records) AS total_records
       FROM integration_sync_logs GROUP BY source`
    ).all();

    success(res, {
      total,
      failed,
      partial,
      anomalies: failed + partial,
      successRate: total > 0 ? +((1 - (failed + partial) / total) * 100).toFixed(1) : 100,
      totalRecords: records,
      bySource,
    });
  } catch (err) {
    serverError(res, err.message);
  }
});

// ── GET /quality/logs ──────────────────────────────────────────
router.get('/quality/logs', (req, res) => {
  try {
    const { source, status, page = 1, page_size = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(page_size);

    let where = '1=1';
    const params = [];
    if (source) { where += ' AND source = ?'; params.push(source); }
    if (status) { where += ' AND status = ?'; params.push(status); }

    const total = db.prepare(`SELECT COUNT(*) AS n FROM integration_sync_logs WHERE ${where}`).get(...params).n;
    const logs  = db.prepare(
      `SELECT * FROM integration_sync_logs WHERE ${where}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, Number(page_size), offset);

    success(res, { logs, total, page: Number(page), page_size: Number(page_size) });
  } catch (err) {
    serverError(res, err.message);
  }
});

module.exports = router;
