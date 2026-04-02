const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { success, created, notFound } = require('../utils/response');
const db = require('../config/database');

function respondUniqueConflict(res, err) {
  const msg = String(err && err.message || '');
  if (msg.includes('UNIQUE') || msg.includes('constraint')) {
    return res.status(409).json({
      code: 409,
      message: '该专业、届次与版本号的组合已存在，请使用不同的版本号或届次。',
    });
  }
  return null;
}

/**
 * 将源培养方案整包复制为新版本（培养目标、毕业要求、指标点、课程、先修、支撑矩阵、改进计划）。
 * 不复制教学运行数据（教学班、ILO、考核、成绩等）。
 */
function cloneCurriculumVersionTx(sourceVersionId, { major_id, grade_year, version, status }) {
  const src = db.prepare('SELECT * FROM curriculum_versions WHERE id = ?').get(sourceVersionId);
  if (!src) return null;

  const run = db.transaction(() => {
    const mid = major_id != null ? major_id : src.major_id;
    const verIns = db.prepare(`
      INSERT INTO curriculum_versions (major_id, version, grade_year, status)
      VALUES (?, ?, ?, ?)
    `);
    const r0 = verIns.run(mid, version, grade_year, status);
    const newVid = r0.lastInsertRowid;

    const objMap = new Map();
    const oldObjs = db.prepare(
      'SELECT * FROM training_objectives WHERE version_id = ? ORDER BY sort_order, id'
    ).all(sourceVersionId);
    const insObj = db.prepare(`
      INSERT INTO training_objectives (version_id, code, description, sort_order)
      VALUES (?, ?, ?, ?)
    `);
    for (const o of oldObjs) {
      const r = insObj.run(newVid, o.code, o.description, o.sort_order);
      objMap.set(o.id, r.lastInsertRowid);
    }

    const grMap = new Map();
    const oldGrs = db.prepare(
      'SELECT * FROM graduation_requirements WHERE version_id = ? ORDER BY sort_order, id'
    ).all(sourceVersionId);
    const insGr = db.prepare(`
      INSERT INTO graduation_requirements (version_id, code, description, sort_order)
      VALUES (?, ?, ?, ?)
    `);
    for (const g of oldGrs) {
      const r = insGr.run(newVid, g.code, g.description, g.sort_order);
      grMap.set(g.id, r.lastInsertRowid);
    }

    const indMap = new Map();
    const insInd = db.prepare(`
      INSERT INTO gr_indicators (gr_id, code, description, weight, threshold, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const g of oldGrs) {
      const newGrId = grMap.get(g.id);
      const inds = db.prepare('SELECT * FROM gr_indicators WHERE gr_id = ? ORDER BY sort_order, id').all(g.id);
      for (const ind of inds) {
        const r = insInd.run(
          newGrId,
          ind.code,
          ind.description,
          ind.weight,
          ind.threshold,
          ind.sort_order
        );
        indMap.set(ind.id, r.lastInsertRowid);
      }
    }

    const courseMap = new Map();
    const oldCourses = db.prepare(
      'SELECT * FROM courses WHERE version_id = ? ORDER BY semester, id'
    ).all(sourceVersionId);
    const insCourse = db.prepare(`
      INSERT INTO courses (
        version_id, code, name, credits, total_hours, theory_hours, practice_hours,
        nature, semester, is_core, course_group
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of oldCourses) {
      const r = insCourse.run(
        newVid,
        c.code,
        c.name,
        c.credits,
        c.total_hours,
        c.theory_hours,
        c.practice_hours,
        c.nature,
        c.semester,
        c.is_core,
        c.course_group
      );
      courseMap.set(c.id, r.lastInsertRowid);
    }

    const insPrereq = db.prepare(`
      INSERT INTO course_prerequisites (course_id, prereq_id) VALUES (?, ?)
    `);
    const oldPrereqs = db.prepare(`
      SELECT cp.course_id, cp.prereq_id FROM course_prerequisites cp
      JOIN courses c ON cp.course_id = c.id
      WHERE c.version_id = ?
    `).all(sourceVersionId);
    for (const p of oldPrereqs) {
      const nc = courseMap.get(p.course_id);
      const np = courseMap.get(p.prereq_id);
      if (nc && np) insPrereq.run(nc, np);
    }

    const insSog = db.prepare(`
      INSERT INTO support_obj_gr (objective_id, gr_id, strength) VALUES (?, ?, ?)
    `);
    const oldSog = db.prepare(`
      SELECT sog.objective_id, sog.gr_id, sog.strength FROM support_obj_gr sog
      JOIN training_objectives o ON sog.objective_id = o.id
      JOIN graduation_requirements gr ON sog.gr_id = gr.id
      WHERE o.version_id = ? AND gr.version_id = ?
    `).all(sourceVersionId, sourceVersionId);
    for (const row of oldSog) {
      const no = objMap.get(row.objective_id);
      const ng = grMap.get(row.gr_id);
      if (no && ng) {
        try {
          insSog.run(no, ng, row.strength);
        } catch (e) {
          if (!String(e.message).includes('UNIQUE')) throw e;
        }
      }
    }

    const insSic = db.prepare(`
      INSERT INTO support_indicator_course (indicator_id, course_id, weight) VALUES (?, ?, ?)
    `);
    const oldSic = db.prepare(`
      SELECT sic.indicator_id, sic.course_id, sic.weight FROM support_indicator_course sic
      JOIN courses co ON sic.course_id = co.id
      WHERE co.version_id = ?
    `).all(sourceVersionId);
    for (const row of oldSic) {
      const ni = indMap.get(row.indicator_id);
      const nc = courseMap.get(row.course_id);
      if (ni && nc) {
        try {
          insSic.run(ni, nc, row.weight);
        } catch (e) {
          if (!String(e.message).includes('UNIQUE')) throw e;
        }
      }
    }

    const oldPlans = db.prepare(
      'SELECT title, target_type, description, responsible_person, academic_year, due_date, status, note FROM improvement_plans WHERE version_id = ?'
    ).all(sourceVersionId);
    const insPlan = db.prepare(`
      INSERT INTO improvement_plans (
        version_id, title, target_type, description, responsible_person, academic_year, due_date, status, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const pl of oldPlans) {
      insPlan.run(
        newVid,
        pl.title,
        pl.target_type,
        pl.description,
        pl.responsible_person,
        pl.academic_year,
        pl.due_date,
        pl.status,
        pl.note
      );
    }

    return newVid;
  });

  return run();
}

// ─────────────────────────────────────────────────────────────
//  培养方案版本
// ─────────────────────────────────────────────────────────────

// GET /api/curriculum/versions?major_id=1
router.get('/versions', (req, res) => {
  const { major_id } = req.query;
  const whereClause = major_id ? 'WHERE cv.major_id = ?' : '';
  const params = major_id ? [major_id] : [];
  const versions = db.prepare(`
    SELECT
      cv.*,
      m.name  AS major_name,
      m.code  AS major_code,
      col.name AS college_name,
      (SELECT COUNT(*) FROM training_objectives    WHERE version_id = cv.id) AS obj_count,
      (SELECT COUNT(*) FROM graduation_requirements WHERE version_id = cv.id) AS gr_count,
      (SELECT COUNT(*) FROM gr_indicators gi
         JOIN graduation_requirements gr ON gi.gr_id = gr.id
        WHERE gr.version_id = cv.id) AS indicator_count,
      (SELECT COUNT(*) FROM courses WHERE version_id = cv.id) AS course_count
    FROM curriculum_versions cv
    JOIN majors   m   ON cv.major_id   = m.id
    JOIN colleges col ON m.college_id  = col.id
    ${whereClause}
    ORDER BY cv.grade_year DESC, cv.created_at DESC
  `).all(...params);
  success(res, versions);
});

// GET /api/curriculum/versions/:id — 版本详情（含全量体系数据）
router.get('/versions/:id', (req, res) => {
  const version = db.prepare('SELECT * FROM curriculum_versions WHERE id = ?').get(req.params.id);
  if (!version) return notFound(res, '培养方案版本不存在');

  const objectives = db.prepare('SELECT * FROM training_objectives WHERE version_id = ? ORDER BY sort_order').all(version.id);
  const grs = db.prepare('SELECT * FROM graduation_requirements WHERE version_id = ? ORDER BY sort_order').all(version.id);
  const grIds = grs.map((g) => g.id);

  let indicators = [];
  if (grIds.length) {
    indicators = db.prepare(`
      SELECT * FROM gr_indicators WHERE gr_id IN (${grIds.map(() => '?').join(',')}) ORDER BY sort_order
    `).all(...grIds);
  }

  const courses = db.prepare('SELECT * FROM courses WHERE version_id = ? ORDER BY semester').all(version.id);

  // 组装毕业要求树
  const grTree = grs.map((gr) => ({
    ...gr,
    indicators: indicators.filter((i) => i.gr_id === gr.id),
  }));

  success(res, { ...version, objectives, graduationRequirements: grTree, courses });
});

// PUT /api/curriculum/versions/:id — 更新版本基本信息（含状态切换）
router.put('/versions/:id', (req, res) => {
  const version = db.prepare('SELECT id FROM curriculum_versions WHERE id = ?').get(req.params.id);
  if (!version) return notFound(res, '培养方案版本不存在');
  const { grade_year, version: versionName, status } = req.body;
  db.prepare(`
    UPDATE curriculum_versions SET
      grade_year   = COALESCE(?, grade_year),
      version      = COALESCE(?, version),
      status       = COALESCE(?, status),
      updated_at   = datetime('now','localtime')
    WHERE id = ?
  `).run(grade_year || null, versionName || null, status || null, req.params.id);
  success(res, db.prepare('SELECT * FROM curriculum_versions WHERE id = ?').get(req.params.id));
});

// DELETE /api/curriculum/versions/:id
router.delete('/versions/:id', (req, res) => {
  const version = db.prepare('SELECT id FROM curriculum_versions WHERE id = ?').get(req.params.id);
  if (!version) return notFound(res, '培养方案版本不存在');
  db.prepare('DELETE FROM curriculum_versions WHERE id = ?').run(req.params.id);
  success(res, null, '培养方案已删除');
});

// POST /api/curriculum/versions
router.post('/versions', validate([
  body('major_id').isInt({ min: 1 }),
  body('grade_year').isInt({ min: 2000 }),
  body('version').trim().notEmpty(),
]), (req, res) => {
  const { major_id, version, grade_year, status = 'draft' } = req.body;
  try {
    const result = db.prepare(`
      INSERT INTO curriculum_versions (major_id, version, grade_year, status) VALUES (?, ?, ?, ?)
    `).run(major_id, version, grade_year, status);
    created(res, db.prepare('SELECT * FROM curriculum_versions WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) {
    const r = respondUniqueConflict(res, err);
    if (r) return r;
    throw err;
  }
});

// POST /api/curriculum/versions/:id/clone — 整包克隆为新版本（含培养目标、毕业要求、课程与支撑关系等）
router.post('/versions/:id/clone', validate([
  param('id').isInt({ min: 1 }),
  body('grade_year').isInt({ min: 2000 }),
  body('version').trim().notEmpty(),
  body('status').optional().isIn(['draft', 'active']),
  body('major_id').optional().isInt({ min: 1 }),
]), (req, res) => {
  const sourceId = Number(req.params.id);
  const { grade_year, version, status = 'draft' } = req.body;
  const major_id = req.body.major_id != null ? Number(req.body.major_id) : undefined;
  try {
    const newVid = cloneCurriculumVersionTx(sourceId, {
      major_id,
      grade_year: Number(grade_year),
      version,
      status,
    });
    if (newVid == null) return notFound(res, '源培养方案不存在');
    created(res, db.prepare('SELECT * FROM curriculum_versions WHERE id = ?').get(newVid));
  } catch (err) {
    const r = respondUniqueConflict(res, err);
    if (r) return r;
    throw err;
  }
});

// ─────────────────────────────────────────────────────────────
//  培养目标
// ─────────────────────────────────────────────────────────────

// GET /api/curriculum/versions/:id/objectives
router.get('/versions/:id/objectives', (req, res) => {
  const objectives = db.prepare(
    'SELECT * FROM training_objectives WHERE version_id = ? ORDER BY sort_order'
  ).all(req.params.id);
  success(res, objectives);
});

// POST /api/curriculum/versions/:id/objectives
router.post('/versions/:id/objectives', validate([
  body('code').trim().notEmpty().withMessage('编号不能为空'),
  body('description').trim().notEmpty().withMessage('目标描述不能为空'),
]), (req, res) => {
  const version = db.prepare('SELECT id FROM curriculum_versions WHERE id = ?').get(req.params.id);
  if (!version) return notFound(res, '培养方案版本不存在');
  const { code, description, sort_order = 0 } = req.body;
  const result = db.prepare(`
    INSERT INTO training_objectives (version_id, code, description, sort_order) VALUES (?, ?, ?, ?)
  `).run(req.params.id, code, description, sort_order);
  created(res, db.prepare('SELECT * FROM training_objectives WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/curriculum/objectives/:id
router.put('/objectives/:id', (req, res) => {
  const { code, description, sort_order } = req.body;
  db.prepare(`
    UPDATE training_objectives SET
      code = COALESCE(?, code),
      description = COALESCE(?, description),
      sort_order = COALESCE(?, sort_order),
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(code, description, sort_order, req.params.id);
  success(res, db.prepare('SELECT * FROM training_objectives WHERE id = ?').get(req.params.id));
});

// DELETE /api/curriculum/objectives/:id
router.delete('/objectives/:id', (req, res) => {
  db.prepare('DELETE FROM training_objectives WHERE id = ?').run(req.params.id);
  success(res, null, '删除成功');
});

// ─────────────────────────────────────────────────────────────
//  培养目标 ↔ 毕业要求 矩阵
// ─────────────────────────────────────────────────────────────

// GET /api/curriculum/versions/:id/obj-gr-matrix
router.get('/versions/:id/obj-gr-matrix', (req, res) => {
  const vId = req.params.id;
  const objIds = db.prepare(
    'SELECT id FROM training_objectives WHERE version_id = ? ORDER BY sort_order'
  ).all(vId).map((o) => o.id);
  const relations = objIds.length
    ? db.prepare(
        `SELECT objective_id, gr_id FROM support_obj_gr WHERE objective_id IN (${objIds.map(() => '?').join(',')})`
      ).all(...objIds)
    : [];
  success(res, { relations });
});

// POST /api/curriculum/obj-gr-support — upsert
router.post('/obj-gr-support', validate([
  body('objective_id').isInt({ min: 1 }),
  body('gr_id').isInt({ min: 1 }),
]), (req, res) => {
  const { objective_id, gr_id, strength = 'H' } = req.body;
  db.prepare(`
    INSERT INTO support_obj_gr (objective_id, gr_id, strength)
    VALUES (?, ?, ?)
    ON CONFLICT(objective_id, gr_id) DO UPDATE SET strength = excluded.strength
  `).run(objective_id, gr_id, strength);
  success(res, null, '支撑关系已保存');
});

// DELETE /api/curriculum/obj-gr-support
router.delete('/obj-gr-support', (req, res) => {
  const { objective_id, gr_id } = req.body;
  db.prepare('DELETE FROM support_obj_gr WHERE objective_id = ? AND gr_id = ?').run(objective_id, gr_id);
  success(res, null, '已删除');
});

// ─────────────────────────────────────────────────────────────
//  毕业要求 & 指标点
// ─────────────────────────────────────────────────────────────

// GET /api/curriculum/versions/:id/gr
router.get('/versions/:id/gr', (req, res) => {
  const grs = db.prepare('SELECT * FROM graduation_requirements WHERE version_id = ? ORDER BY sort_order').all(req.params.id);
  const grIds = grs.map((g) => g.id);
  const indicators = grIds.length
    ? db.prepare(`SELECT * FROM gr_indicators WHERE gr_id IN (${grIds.map(() => '?').join(',')}) ORDER BY sort_order`).all(...grIds)
    : [];
  success(res, grs.map((gr) => ({ ...gr, indicators: indicators.filter((i) => i.gr_id === gr.id) })));
});

// POST /api/curriculum/versions/:id/gr
router.post('/versions/:id/gr', validate([
  body('code').trim().notEmpty(),
  body('description').trim().notEmpty(),
]), (req, res) => {
  const { code, description, sort_order = 0 } = req.body;
  const result = db.prepare(`
    INSERT INTO graduation_requirements (version_id, code, description, sort_order) VALUES (?, ?, ?, ?)
  `).run(req.params.id, code, description, sort_order);
  created(res, db.prepare('SELECT * FROM graduation_requirements WHERE id = ?').get(result.lastInsertRowid));
});

// POST /api/curriculum/gr/:grId/indicators
router.post('/gr/:grId/indicators', validate([
  body('code').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('weight').isFloat({ min: 0, max: 1 }),
]), (req, res) => {
  const { code, description, weight, threshold = 0.6, sort_order = 0 } = req.body;
  const result = db.prepare(`
    INSERT INTO gr_indicators (gr_id, code, description, weight, threshold, sort_order) VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.params.grId, code, description, weight, threshold, sort_order);
  created(res, db.prepare('SELECT * FROM gr_indicators WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/curriculum/indicators/:id
router.put('/indicators/:id', (req, res) => {
  const { code, description, weight, threshold } = req.body;
  db.prepare(`
    UPDATE gr_indicators SET
      code = COALESCE(?, code),
      description = COALESCE(?, description),
      weight = COALESCE(?, weight),
      threshold = COALESCE(?, threshold),
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(code, description, weight, threshold, req.params.id);
  success(res, db.prepare('SELECT * FROM gr_indicators WHERE id = ?').get(req.params.id));
});

// DELETE /api/curriculum/indicators/:id
router.delete('/indicators/:id', (req, res) => {
  db.prepare('DELETE FROM gr_indicators WHERE id = ?').run(req.params.id);
  success(res, null, '指标点已删除');
});

// PUT /api/curriculum/gr/:id
router.put('/gr/:id', (req, res) => {
  const { code, description, sort_order } = req.body;
  db.prepare(`
    UPDATE graduation_requirements SET
      code        = COALESCE(?, code),
      description = COALESCE(?, description),
      sort_order  = COALESCE(?, sort_order),
      updated_at  = datetime('now','localtime')
    WHERE id = ?
  `).run(code, description, sort_order, req.params.id);
  success(res, db.prepare('SELECT * FROM graduation_requirements WHERE id = ?').get(req.params.id));
});

// DELETE /api/curriculum/gr/:id
router.delete('/gr/:id', (req, res) => {
  db.prepare('DELETE FROM graduation_requirements WHERE id = ?').run(req.params.id);
  success(res, null, '毕业要求已删除');
});

// ─────────────────────────────────────────────────────────────
//  支撑关系配置
// ─────────────────────────────────────────────────────────────

// GET /api/curriculum/versions/:id/support-matrix
router.get('/versions/:id/support-matrix', (req, res) => {
  const { id: versionId } = req.params;
  const indicators = db.prepare(`
    SELECT gri.id, gri.code, gr.code AS gr_code FROM gr_indicators gri
    JOIN graduation_requirements gr ON gri.gr_id = gr.id
    WHERE gr.version_id = ?
  `).all(versionId);

  const courses = db.prepare('SELECT id, code, name FROM courses WHERE version_id = ?').all(versionId);
  const relations = db.prepare(`
    SELECT sic.indicator_id, sic.course_id, sic.weight
    FROM support_indicator_course sic
    JOIN courses c ON sic.course_id = c.id
    WHERE c.version_id = ?
  `).all(versionId);

  success(res, { indicators, courses, relations });
});

// POST /api/curriculum/support — 保存单条支撑关系
router.post('/support', validate([
  body('indicator_id').isInt(),
  body('course_id').isInt(),
  body('weight').isFloat({ min: 0 }),
]), (req, res) => {
  const { indicator_id, course_id, weight } = req.body;
  db.prepare(`
    INSERT INTO support_indicator_course (indicator_id, course_id, weight)
    VALUES (?, ?, ?)
    ON CONFLICT(indicator_id, course_id) DO UPDATE SET weight = excluded.weight
  `).run(indicator_id, course_id, weight);
  success(res, null, '支撑关系已保存');
});

// DELETE /api/curriculum/support
router.delete('/support', (req, res) => {
  const { indicator_id, course_id } = req.body;
  db.prepare('DELETE FROM support_indicator_course WHERE indicator_id = ? AND course_id = ?').run(indicator_id, course_id);
  success(res, null, '支撑关系已删除');
});

module.exports = router;
