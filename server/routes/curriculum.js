const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { success, created, notFound } = require('../utils/response');
const db = require('../config/database');

// ─────────────────────────────────────────────────────────────
//  培养方案版本
// ─────────────────────────────────────────────────────────────

// GET /api/curriculum/versions?major_id=1
router.get('/versions', (req, res) => {
  const { major_id } = req.query;
  const versions = major_id
    ? db.prepare('SELECT * FROM curriculum_versions WHERE major_id = ? ORDER BY grade_year DESC').all(major_id)
    : db.prepare('SELECT * FROM curriculum_versions ORDER BY grade_year DESC').all();
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

// POST /api/curriculum/versions
router.post('/versions', validate([
  body('major_id').isInt({ min: 1 }),
  body('grade_year').isInt({ min: 2000 }),
  body('version').trim().notEmpty(),
]), (req, res) => {
  const { major_id, version, grade_year, status = 'draft' } = req.body;
  const result = db.prepare(`
    INSERT INTO curriculum_versions (major_id, version, grade_year, status) VALUES (?, ?, ?, ?)
  `).run(major_id, version, grade_year, status);
  created(res, db.prepare('SELECT * FROM curriculum_versions WHERE id = ?').get(result.lastInsertRowid));
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
