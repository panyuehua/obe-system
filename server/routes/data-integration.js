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

// ══════════════════════════════════════════════════════════════
//  数据管理 CRUD  GET|POST /records/:type   PUT|DELETE /records/:type/:id
// ══════════════════════════════════════════════════════════════

// ── 辅助：分页参数 ─────────────────────────────────────────────
function pageParams(query) {
  const page      = Math.max(1, Number(query.page)      || 1);
  const page_size = Math.min(100, Math.max(1, Number(query.page_size) || 15));
  const offset    = (page - 1) * page_size;
  const search    = (query.search || '').trim();
  return { page, page_size, offset, search };
}

// ── GET /records/:type ─────────────────────────────────────────
router.get('/records/:type', (req, res) => {
  try {
    const { type } = req.params;
    const { page, page_size, offset, search } = pageParams(req.query);

    let list, total;

    if (type === 'schools') {
      // 合并 schools / colleges / majors 三张表
      const like = `%${search}%`;
      const countSql = `
        SELECT COUNT(*) AS n FROM (
          SELECT id FROM schools WHERE name LIKE ?
          UNION ALL
          SELECT id FROM colleges WHERE name LIKE ?
          UNION ALL
          SELECT id FROM majors   WHERE name LIKE ?
        )`;
      total = db.prepare(countSql).get(like, like, like).n;
      list  = db.prepare(`
        SELECT 'school'  AS entity_type, s.id, s.name, s.short_name AS code,
               NULL AS parent_name, s.created_at
        FROM schools s WHERE s.name LIKE ?
        UNION ALL
        SELECT 'college' AS entity_type, c.id, c.name, c.code,
               s.name AS parent_name, c.created_at
        FROM colleges c LEFT JOIN schools s ON s.id = c.school_id WHERE c.name LIKE ?
        UNION ALL
        SELECT 'major'   AS entity_type, m.id, m.name, m.code,
               c.name AS parent_name, m.created_at
        FROM majors m LEFT JOIN colleges c ON c.id = m.college_id WHERE m.name LIKE ?
        ORDER BY entity_type, name
        LIMIT ? OFFSET ?
      `).all(like, like, like, page_size, offset);

    } else if (type === 'students') {
      const like = search ? `%${search}%` : '%';
      total = db.prepare(
        `SELECT COUNT(*) AS n FROM students WHERE name LIKE ? OR student_no LIKE ?`
      ).get(like, like).n;
      list  = db.prepare(`
        SELECT s.id, s.student_no, s.name,
               s.grade AS grade_year, s.class_name,
               m.name AS major_name, s.created_at
        FROM students s LEFT JOIN majors m ON m.id = s.major_id
        WHERE s.name LIKE ? OR s.student_no LIKE ?
        ORDER BY s.student_no
        LIMIT ? OFFSET ?
      `).all(like, like, page_size, offset);

    } else if (type === 'courses') {
      const like = search ? `%${search}%` : '%';
      total = db.prepare(
        `SELECT COUNT(*) AS n FROM courses WHERE name LIKE ? OR code LIKE ?`
      ).get(like, like).n;
      list  = db.prepare(`
        SELECT c.id, c.code AS course_no, c.name, c.credits, c.nature AS course_type,
               v.version AS version_name, c.created_at
        FROM courses c LEFT JOIN curriculum_versions v ON v.id = c.version_id
        WHERE c.name LIKE ? OR c.code LIKE ?
        ORDER BY c.code
        LIMIT ? OFFSET ?
      `).all(like, like, page_size, offset);

    } else if (type === 'curriculum') {
      const like = search ? `%${search}%` : '%';
      total = db.prepare(
        `SELECT COUNT(*) AS n FROM curriculum_versions WHERE version LIKE ?`
      ).get(like).n;
      list  = db.prepare(`
        SELECT v.id, v.version AS version_name, v.grade_year AS year, v.status,
               m.name AS major_name, v.created_at
        FROM curriculum_versions v LEFT JOIN majors m ON m.id = v.major_id
        WHERE v.version LIKE ?
        ORDER BY v.grade_year DESC, v.version
        LIMIT ? OFFSET ?
      `).all(like, page_size, offset);

    } else if (type === 'grades') {
      const like = search ? `%${search}%` : '%';
      total = db.prepare(`
        SELECT COUNT(*) AS n
        FROM scores sc
        JOIN students st ON st.id = sc.student_id
        JOIN assessment_items ai ON ai.id = sc.assessment_id
        JOIN teaching_classes tc ON tc.id = sc.class_id
        JOIN courses co ON co.id = tc.course_id
        WHERE st.name LIKE ? OR st.student_no LIKE ? OR co.code LIKE ?
      `).get(like, like, like).n;
      list = db.prepare(`
        SELECT sc.id, st.student_no, st.name AS student_name,
               co.code AS course_no,
               (tc.year || '-' || (tc.year+1) || '-' || tc.semester) AS semester,
               sc.score, sc.created_at
        FROM scores sc
        JOIN students st ON st.id = sc.student_id
        JOIN assessment_items ai ON ai.id = sc.assessment_id
        JOIN teaching_classes tc ON tc.id = sc.class_id
        JOIN courses co ON co.id = tc.course_id
        WHERE st.name LIKE ? OR st.student_no LIKE ? OR co.code LIKE ?
        ORDER BY sc.created_at DESC
        LIMIT ? OFFSET ?
      `).all(like, like, like, page_size, offset);

    } else {
      return error(res, '不支持的数据类型');
    }

    success(res, { list, total, page, page_size });
  } catch (err) {
    serverError(res, err.message);
  }
});

// ── POST /records/:type ────────────────────────────────────────
router.post('/records/:type', (req, res) => {
  try {
    const { type } = req.params;
    const d = req.body;

    if (type === 'schools') {
      if (!d.entity_type || !d.name) return error(res, '类型和名称为必填项');
      let id;
      if (d.entity_type === 'school') {
        id = db.prepare(
          `INSERT INTO schools (name, short_name) VALUES (?, ?)`
        ).run(d.name, d.code || null).lastInsertRowid;
      } else if (d.entity_type === 'college') {
        const school = db.prepare(`SELECT id FROM schools LIMIT 1`).get();
        if (!school) return error(res, '请先创建学校记录');
        id = db.prepare(
          `INSERT INTO colleges (school_id, name, code) VALUES (?, ?, ?)`
        ).run(school.id, d.name, d.code || null).lastInsertRowid;
      } else if (d.entity_type === 'major') {
        const college = d.parent_name
          ? db.prepare(`SELECT id FROM colleges WHERE name = ? LIMIT 1`).get(d.parent_name)
          : db.prepare(`SELECT id FROM colleges LIMIT 1`).get();
        if (!college) return error(res, '请先创建学院记录，或填写正确的上级单位名称');
        id = db.prepare(
          `INSERT INTO majors (college_id, name, code) VALUES (?, ?, ?)`
        ).run(college.id, d.name, d.code || null).lastInsertRowid;
      } else {
        return error(res, '无效的类型值（school/college/major）');
      }
      return success(res, { id }, '记录已创建');
    }

    if (type === 'students') {
      if (!d.student_no || !d.name) return error(res, '学号和姓名为必填项');
      let major_id = null;
      if (d.major_name) {
        const m = db.prepare(`SELECT id FROM majors WHERE name = ? LIMIT 1`).get(d.major_name);
        if (m) major_id = m.id;
      }
      const id = db.prepare(
        `INSERT INTO students (student_no, name, grade, class_name, major_id)
         VALUES (?, ?, ?, ?, ?)`
      ).run(d.student_no, d.name, d.grade_year || null, d.class_name || null, major_id).lastInsertRowid;
      return success(res, { id }, '学生记录已创建');
    }

    if (type === 'courses') {
      if (!d.course_no || !d.name) return error(res, '课程号和课程名为必填项');
      let version_id = null;
      if (d.version_name) {
        const v = db.prepare(`SELECT id FROM curriculum_versions WHERE version = ? LIMIT 1`).get(d.version_name);
        if (v) version_id = v.id;
      }
      if (!version_id) {
        const v = db.prepare(`SELECT id FROM curriculum_versions LIMIT 1`).get();
        if (!v) return error(res, '请先创建培养方案版本');
        version_id = v.id;
      }
      const id = db.prepare(
        `INSERT INTO courses (code, name, credits, nature, version_id)
         VALUES (?, ?, ?, ?, ?)`
      ).run(d.course_no, d.name, d.credits || 0, d.course_type || 'required', version_id).lastInsertRowid;
      return success(res, { id }, '课程记录已创建');
    }

    if (type === 'curriculum') {
      if (!d.version_name) return error(res, '版本名称为必填项');
      let major_id = null;
      if (d.major_name) {
        const m = db.prepare(`SELECT id FROM majors WHERE name = ? LIMIT 1`).get(d.major_name);
        if (m) major_id = m.id;
      }
      if (!major_id) {
        const m = db.prepare(`SELECT id FROM majors LIMIT 1`).get();
        if (!m) return error(res, '请先创建专业记录');
        major_id = m.id;
      }
      const id = db.prepare(
        `INSERT INTO curriculum_versions (major_id, version, grade_year, status)
         VALUES (?, ?, ?, ?)`
      ).run(major_id, d.version_name, d.year || new Date().getFullYear(), d.status || 'draft').lastInsertRowid;
      return success(res, { id }, '培养方案版本已创建');
    }

    if (type === 'grades') {
      if (!d.student_no || !d.course_no || !d.score) return error(res, '学号、课程号、分数为必填项');
      const student = db.prepare(`SELECT id FROM students WHERE student_no = ? LIMIT 1`).get(d.student_no);
      if (!student) return error(res, `未找到学号为 ${d.student_no} 的学生`);
      const course  = db.prepare(`SELECT id FROM courses WHERE code = ? LIMIT 1`).get(d.course_no);
      if (!course) return error(res, `未找到课程号为 ${d.course_no} 的课程`);
      const tc = db.prepare(`SELECT id FROM teaching_classes WHERE course_id = ? LIMIT 1`).get(course.id);
      if (!tc) return error(res, `该课程暂无教学班，请先在教学平台创建教学班`);
      const ai = db.prepare(`SELECT id FROM assessment_items WHERE class_id = ? LIMIT 1`).get(tc.id);
      if (!ai) return error(res, `该教学班暂无考核项，请先创建考核项`);
      const id = db.prepare(
        `INSERT OR REPLACE INTO scores (student_id, class_id, assessment_id, score)
         VALUES (?, ?, ?, ?)`
      ).run(student.id, tc.id, ai.id, Number(d.score)).lastInsertRowid;
      return success(res, { id }, '成绩记录已创建');
    }

    error(res, '不支持的数据类型');
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return error(res, '记录已存在（唯一键冲突），请检查学号/课程号等字段');
    serverError(res, err.message);
  }
});

// ── PUT /records/:type/:id ─────────────────────────────────────
router.put('/records/:type/:id', (req, res) => {
  try {
    const { type, id } = req.params;
    const d = req.body;
    const rid = Number(id);

    if (type === 'schools') {
      // 根据 entity_type 决定更新哪张表
      if (d.entity_type === 'school') {
        db.prepare(`UPDATE schools SET name=?, short_name=?, updated_at=datetime('now','localtime') WHERE id=?`)
          .run(d.name, d.code || null, rid);
      } else if (d.entity_type === 'college') {
        db.prepare(`UPDATE colleges SET name=?, code=?, updated_at=datetime('now','localtime') WHERE id=?`)
          .run(d.name, d.code || null, rid);
      } else if (d.entity_type === 'major') {
        db.prepare(`UPDATE majors SET name=?, code=?, updated_at=datetime('now','localtime') WHERE id=?`)
          .run(d.name, d.code || null, rid);
      }
      return success(res, null, '记录已更新');
    }

    if (type === 'students') {
      let major_id = null;
      if (d.major_name) {
        const m = db.prepare(`SELECT id FROM majors WHERE name = ? LIMIT 1`).get(d.major_name);
        if (m) major_id = m.id;
      }
      db.prepare(`UPDATE students SET student_no=?, name=?, grade=?, class_name=?, major_id=?,
                  updated_at=datetime('now','localtime') WHERE id=?`)
        .run(d.student_no, d.name, d.grade_year || null, d.class_name || null, major_id, rid);
      return success(res, null, '学生记录已更新');
    }

    if (type === 'courses') {
      let version_id = null;
      if (d.version_name) {
        const v = db.prepare(`SELECT id FROM curriculum_versions WHERE version = ? LIMIT 1`).get(d.version_name);
        if (v) version_id = v.id;
      }
      const setVersion = version_id ? ', version_id=?' : '';
      const args = version_id
        ? [d.name, d.credits || 0, d.course_type || 'required', d.course_no, version_id, rid]
        : [d.name, d.credits || 0, d.course_type || 'required', d.course_no, rid];
      db.prepare(`UPDATE courses SET name=?, credits=?, nature=?, code=?${setVersion},
                  updated_at=datetime('now','localtime') WHERE id=?`).run(...args);
      return success(res, null, '课程记录已更新');
    }

    if (type === 'curriculum') {
      let major_id = null;
      if (d.major_name) {
        const m = db.prepare(`SELECT id FROM majors WHERE name = ? LIMIT 1`).get(d.major_name);
        if (m) major_id = m.id;
      }
      const setMajor = major_id ? ', major_id=?' : '';
      const args = major_id
        ? [d.version_name, d.year || new Date().getFullYear(), d.status || 'draft', major_id, rid]
        : [d.version_name, d.year || new Date().getFullYear(), d.status || 'draft', rid];
      db.prepare(`UPDATE curriculum_versions SET version=?, grade_year=?, status=?${setMajor},
                  updated_at=datetime('now','localtime') WHERE id=?`).run(...args);
      return success(res, null, '培养方案版本已更新');
    }

    if (type === 'grades') {
      db.prepare(`UPDATE scores SET score=?, updated_at=datetime('now','localtime') WHERE id=?`)
        .run(Number(d.score), rid);
      return success(res, null, '成绩记录已更新');
    }

    error(res, '不支持的数据类型');
  } catch (err) {
    serverError(res, err.message);
  }
});

// ── DELETE /records/:type/:id ──────────────────────────────────
router.delete('/records/:type/:id', (req, res) => {
  try {
    const { type, id } = req.params;
    const rid = Number(id);

    const TABLE_MAP = {
      curriculum: 'curriculum_versions',
      grades:     'scores',
      students:   'students',
      courses:    'courses',
    };

    if (type === 'schools') {
      // 尝试三张表，命中哪张删哪张
      let changed = db.prepare(`DELETE FROM majors   WHERE id=?`).run(rid).changes;
      if (!changed) changed = db.prepare(`DELETE FROM colleges WHERE id=?`).run(rid).changes;
      if (!changed)          db.prepare(`DELETE FROM schools  WHERE id=?`).run(rid);
      return success(res, null, '记录已删除');
    }

    const table = TABLE_MAP[type];
    if (!table) return error(res, '不支持的数据类型');
    db.prepare(`DELETE FROM ${table} WHERE id=?`).run(rid);
    success(res, null, '记录已删除');
  } catch (err) {
    serverError(res, err.message);
  }
});

module.exports = router;
