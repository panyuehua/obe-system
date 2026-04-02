const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { success, created, notFound, serverError } = require('../utils/response');
const db = require('../config/database');

// GET /api/majors — 获取所有专业
router.get('/', (req, res) => {
  const majors = db.prepare(`
    SELECT m.*, c.name AS college_name,
           (SELECT COUNT(*) FROM curriculum_versions cv WHERE cv.major_id = m.id) AS version_count
    FROM majors m
    LEFT JOIN colleges c ON m.college_id = c.id
    ORDER BY c.name, m.name
  `).all();
  success(res, majors);
});

// GET /api/majors/:id — 获取单个专业详情
router.get('/:id', (req, res) => {
  const major = db.prepare(`
    SELECT m.*, c.name AS college_name, c.code AS college_code
    FROM majors m LEFT JOIN colleges c ON m.college_id = c.id
    WHERE m.id = ?
  `).get(req.params.id);
  if (!major) return notFound(res, '专业不存在');
  success(res, major);
});

// POST /api/majors — 新建专业
const createRules = [
  body('name').trim().notEmpty().withMessage('专业名称不能为空'),
  body('college_id').isInt({ min: 1 }).withMessage('所属学院ID无效'),
  body('code').optional().trim(),
  body('degree_years').optional().isInt({ min: 1, max: 5 }),
];
router.post('/', validate(createRules), (req, res) => {
  const { name, college_id, code, degree_years = 3, cert_type = 'vocational' } = req.body;
  const result = db.prepare(`
    INSERT INTO majors (name, college_id, code, degree_years, cert_type)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, college_id, code, degree_years, cert_type);
  const major = db.prepare('SELECT * FROM majors WHERE id = ?').get(result.lastInsertRowid);
  created(res, major, '专业创建成功');
});

// PUT /api/majors/:id — 更新专业
router.put('/:id', validate([
  param('id').isInt(),
  body('name').optional().trim().notEmpty(),
]), (req, res) => {
  const { name, code, degree_years, cert_type } = req.body;
  const major = db.prepare('SELECT id FROM majors WHERE id = ?').get(req.params.id);
  if (!major) return notFound(res, '专业不存在');

  db.prepare(`
    UPDATE majors SET
      name = COALESCE(?, name),
      code = COALESCE(?, code),
      degree_years = COALESCE(?, degree_years),
      cert_type = COALESCE(?, cert_type),
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(name, code, degree_years, cert_type, req.params.id);

  success(res, db.prepare('SELECT * FROM majors WHERE id = ?').get(req.params.id));
});

// DELETE /api/majors/:id
router.delete('/:id', (req, res) => {
  const major = db.prepare('SELECT id FROM majors WHERE id = ?').get(req.params.id);
  if (!major) return notFound(res, '专业不存在');
  db.prepare('DELETE FROM majors WHERE id = ?').run(req.params.id);
  success(res, null, '删除成功');
});

module.exports = router;
