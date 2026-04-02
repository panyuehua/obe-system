const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { success, created, notFound } = require('../utils/response');
const db = require('../config/database');

// ─────────────────────────────────────────────────────────────
//  教学班
// ─────────────────────────────────────────────────────────────

router.get('/classes', (req, res) => {
  const { course_id, year, semester } = req.query;
  let sql = `
    SELECT tc.*, c.name AS course_name, c.code AS course_code,
           t.name AS teacher_name
    FROM teaching_classes tc
    LEFT JOIN courses c ON tc.course_id = c.id
    LEFT JOIN teachers t ON tc.teacher_id = t.id
    WHERE 1=1
  `;
  const params = [];
  if (course_id) { sql += ' AND tc.course_id = ?'; params.push(course_id); }
  if (year)      { sql += ' AND tc.year = ?';      params.push(year); }
  if (semester)  { sql += ' AND tc.semester = ?';  params.push(semester); }
  success(res, db.prepare(sql).all(...params));
});

router.post('/classes', validate([
  body('course_id').isInt({ min: 1 }),
  body('year').isInt({ min: 2000 }),
  body('semester').isInt({ min: 1, max: 2 }),
]), (req, res) => {
  const { course_id, teacher_id, semester, year, class_name } = req.body;
  const result = db.prepare(`
    INSERT INTO teaching_classes (course_id, teacher_id, semester, year, class_name)
    VALUES (?, ?, ?, ?, ?)
  `).run(course_id, teacher_id, semester, year, class_name);
  created(res, db.prepare('SELECT * FROM teaching_classes WHERE id = ?').get(result.lastInsertRowid));
});

// ─────────────────────────────────────────────────────────────
//  ILO（课程目标）
// ─────────────────────────────────────────────────────────────

router.get('/classes/:classId/ilos', (req, res) => {
  const ilos = db.prepare(`
    SELECT i.*, GROUP_CONCAT(gri.code) AS indicator_codes
    FROM ilos i
    LEFT JOIN ilo_indicator_support iis ON iis.ilo_id = i.id
    LEFT JOIN gr_indicators gri ON iis.indicator_id = gri.id
    WHERE i.class_id = ?
    GROUP BY i.id
    ORDER BY i.sort_order
  `).all(req.params.classId);
  success(res, ilos);
});

router.post('/classes/:classId/ilos', validate([
  body('code').trim().notEmpty(),
  body('description').trim().notEmpty(),
]), (req, res) => {
  const { code, description, bloom_level = 'apply', sort_order = 0 } = req.body;
  const result = db.prepare(`
    INSERT INTO ilos (class_id, code, description, bloom_level, sort_order) VALUES (?, ?, ?, ?, ?)
  `).run(req.params.classId, code, description, bloom_level, sort_order);

  // 关联指标点
  if (req.body.indicator_ids && Array.isArray(req.body.indicator_ids)) {
    const insSupport = db.prepare('INSERT OR IGNORE INTO ilo_indicator_support (ilo_id, indicator_id, weight) VALUES (?, ?, ?)');
    req.body.indicator_ids.forEach(({ id, weight = 1.0 }) => insSupport.run(result.lastInsertRowid, id, weight));
  }

  created(res, db.prepare('SELECT * FROM ilos WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/ilos/:id', (req, res) => {
  const { code, description, bloom_level } = req.body;
  db.prepare(`
    UPDATE ilos SET code = COALESCE(?, code), description = COALESCE(?, description),
      bloom_level = COALESCE(?, bloom_level), updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(code, description, bloom_level, req.params.id);
  success(res, db.prepare('SELECT * FROM ilos WHERE id = ?').get(req.params.id));
});

// ─────────────────────────────────────────────────────────────
//  考核方案
// ─────────────────────────────────────────────────────────────

router.get('/classes/:classId/assessments', (req, res) => {
  const items = db.prepare('SELECT * FROM assessment_items WHERE class_id = ?').all(req.params.classId);
  const classId = parseInt(req.params.classId);
  const itemIds = items.map((i) => i.id);
  const mappings = itemIds.length
    ? db.prepare(`SELECT aim.*, i.code AS ilo_code FROM assessment_ilo_mapping aim JOIN ilos i ON aim.ilo_id = i.id WHERE aim.assessment_id IN (${itemIds.map(() => '?').join(',')})`).all(...itemIds)
    : [];
  success(res, items.map((item) => ({
    ...item,
    ilo_mappings: mappings.filter((m) => m.assessment_id === item.id),
  })));
});

router.post('/classes/:classId/assessments', validate([
  body('name').trim().notEmpty(),
  body('weight').isFloat({ min: 0, max: 1 }),
]), (req, res) => {
  const { name, type = 'homework', weight, max_score = 100 } = req.body;
  const result = db.prepare(`
    INSERT INTO assessment_items (class_id, name, type, weight, max_score) VALUES (?, ?, ?, ?, ?)
  `).run(req.params.classId, name, type, weight, max_score);

  if (req.body.ilo_mappings && Array.isArray(req.body.ilo_mappings)) {
    const ins = db.prepare('INSERT OR IGNORE INTO assessment_ilo_mapping (assessment_id, ilo_id, weight) VALUES (?, ?, ?)');
    req.body.ilo_mappings.forEach(({ ilo_id, weight: w = 1.0 }) => ins.run(result.lastInsertRowid, ilo_id, w));
  }
  created(res, db.prepare('SELECT * FROM assessment_items WHERE id = ?').get(result.lastInsertRowid));
});

// ─────────────────────────────────────────────────────────────
//  成绩录入
// ─────────────────────────────────────────────────────────────

router.post('/scores/batch', (req, res) => {
  const { scores } = req.body; // [{ student_id, class_id, assessment_id, score }]
  if (!Array.isArray(scores) || !scores.length) return success(res, null, '无成绩数据');

  const ins = db.prepare(`
    INSERT INTO scores (student_id, class_id, assessment_id, score)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(student_id, assessment_id) DO UPDATE SET score = excluded.score,
      updated_at = datetime('now','localtime')
  `);
  const insertMany = db.transaction((rows) => rows.forEach((r) => ins.run(r.student_id, r.class_id, r.assessment_id, r.score)));
  insertMany(scores);
  success(res, { imported: scores.length });
});

module.exports = router;
