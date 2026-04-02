const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { success, created, notFound } = require('../utils/response');
const db = require('../config/database');

// GET /api/courses?version_id=1
router.get('/', (req, res) => {
  const { version_id } = req.query;
  const courses = version_id
    ? db.prepare('SELECT * FROM courses WHERE version_id = ? ORDER BY semester, id').all(version_id)
    : db.prepare('SELECT * FROM courses ORDER BY semester').all();
  success(res, courses);
});

// GET /api/courses/:id
router.get('/:id', (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return notFound(res, '课程不存在');
  // 支撑的指标点
  const indicators = db.prepare(`
    SELECT gri.id, gri.code, gri.description, gr.code AS gr_code, sic.weight
    FROM support_indicator_course sic
    JOIN gr_indicators gri ON sic.indicator_id = gri.id
    JOIN graduation_requirements gr ON gri.gr_id = gr.id
    WHERE sic.course_id = ?
  `).all(req.params.id);
  success(res, { ...course, indicators });
});

// POST /api/courses
router.post('/', validate([
  body('version_id').isInt({ min: 1 }),
  body('name').trim().notEmpty(),
  body('code').trim().notEmpty(),
  body('credits').isFloat({ min: 0 }),
]), (req, res) => {
  const { version_id, code, name, credits = 0, total_hours = 0,
          theory_hours = 0, practice_hours = 0, nature = 'required',
          semester = 1, is_core = 0, course_group } = req.body;
  const result = db.prepare(`
    INSERT INTO courses (version_id, code, name, credits, total_hours, theory_hours,
      practice_hours, nature, semester, is_core, course_group)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(version_id, code, name, credits, total_hours, theory_hours,
         practice_hours, nature, semester, is_core ? 1 : 0, course_group);
  created(res, db.prepare('SELECT * FROM courses WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/courses/:id
router.put('/:id', (req, res) => {
  const fields = ['code', 'name', 'credits', 'total_hours', 'theory_hours',
                  'practice_hours', 'nature', 'semester', 'is_core', 'course_group'];
  const updates = fields.filter((f) => req.body[f] !== undefined);
  if (!updates.length) return success(res, null, '无需更新');

  const sets = updates.map((f) => `${f} = ?`).join(', ');
  const values = updates.map((f) => req.body[f]);
  db.prepare(`UPDATE courses SET ${sets}, updated_at = datetime('now','localtime') WHERE id = ?`)
    .run(...values, req.params.id);
  success(res, db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id));
});

// DELETE /api/courses/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
  success(res, null, '删除成功');
});

module.exports = router;
