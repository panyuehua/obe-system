const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { success, created, notFound } = require('../utils/response');
const db = require('../config/database');

// GET /api/improvement?version_id=X[&status=Y]
router.get('/', (req, res) => {
  const { version_id, status } = req.query;
  let sql = 'SELECT * FROM improvement_plans WHERE 1=1';
  const params = [];
  if (version_id) { sql += ' AND version_id = ?'; params.push(version_id); }
  if (status)     { sql += ' AND status = ?';     params.push(status); }
  sql += ' ORDER BY created_at DESC';
  success(res, db.prepare(sql).all(...params));
});

// GET /api/improvement/:id
router.get('/:id', (req, res) => {
  const plan = db.prepare('SELECT * FROM improvement_plans WHERE id = ?').get(req.params.id);
  if (!plan) return notFound(res, '改进计划不存在');
  success(res, plan);
});

// POST /api/improvement
router.post('/', validate([
  body('title').trim().notEmpty().withMessage('计划标题不能为空'),
  body('version_id').isInt({ min: 1 }).withMessage('version_id 无效'),
]), (req, res) => {
  const {
    version_id, title, target_type = 'general', description,
    responsible_person, academic_year, due_date, status = 'pending',
  } = req.body;
  const result = db.prepare(`
    INSERT INTO improvement_plans
      (version_id, title, target_type, description, responsible_person, academic_year, due_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(version_id, title, target_type, description, responsible_person, academic_year, due_date, status);
  created(res, db.prepare('SELECT * FROM improvement_plans WHERE id = ?').get(result.lastInsertRowid), '改进计划已创建');
});

// PUT /api/improvement/:id — 全量更新
router.put('/:id', validate([
  param('id').isInt(),
]), (req, res) => {
  const plan = db.prepare('SELECT id FROM improvement_plans WHERE id = ?').get(req.params.id);
  if (!plan) return notFound(res, '改进计划不存在');
  const {
    title, target_type, description, responsible_person,
    academic_year, due_date,
  } = req.body;
  db.prepare(`
    UPDATE improvement_plans SET
      title               = COALESCE(?, title),
      target_type         = COALESCE(?, target_type),
      description         = COALESCE(?, description),
      responsible_person  = COALESCE(?, responsible_person),
      academic_year       = COALESCE(?, academic_year),
      due_date            = COALESCE(?, due_date),
      updated_at          = datetime('now','localtime')
    WHERE id = ?
  `).run(title, target_type, description, responsible_person, academic_year, due_date, req.params.id);
  success(res, db.prepare('SELECT * FROM improvement_plans WHERE id = ?').get(req.params.id));
});

// PUT /api/improvement/:id/status
router.put('/:id/status', validate([
  param('id').isInt(),
  body('status').isIn(['pending', 'in_progress', 'completed', 'verified']).withMessage('状态值无效'),
]), (req, res) => {
  const plan = db.prepare('SELECT id FROM improvement_plans WHERE id = ?').get(req.params.id);
  if (!plan) return notFound(res, '改进计划不存在');
  const { status, note } = req.body;
  db.prepare(`
    UPDATE improvement_plans SET
      status     = ?,
      note       = COALESCE(?, note),
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(status, note || null, req.params.id);
  success(res, db.prepare('SELECT * FROM improvement_plans WHERE id = ?').get(req.params.id));
});

// DELETE /api/improvement/:id
router.delete('/:id', (req, res) => {
  const plan = db.prepare('SELECT id FROM improvement_plans WHERE id = ?').get(req.params.id);
  if (!plan) return notFound(res, '改进计划不存在');
  db.prepare('DELETE FROM improvement_plans WHERE id = ?').run(req.params.id);
  success(res, null, '删除成功');
});

module.exports = router;
