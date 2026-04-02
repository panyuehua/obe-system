const express = require('express');
const router = express.Router();
const { success, notFound } = require('../utils/response');
const db = require('../config/database');
const { calcFullAchievement, calcClassIloAchievement } = require('../services/achievementCalc');
const { diagnose } = require('../services/diagnosisService');

// GET /api/analysis/version/:id — 某培养方案完整达成度分析
router.get('/version/:id', (req, res) => {
  const version = db.prepare('SELECT * FROM curriculum_versions WHERE id = ?').get(req.params.id);
  if (!version) return notFound(res, '培养方案版本不存在');
  const result = calcFullAchievement(version.id);
  success(res, { version, ...result });
});

// GET /api/analysis/class/:classId — 单课程达成度分析
router.get('/class/:classId', (req, res) => {
  const cls = db.prepare('SELECT tc.*, c.name AS course_name FROM teaching_classes tc JOIN courses c ON tc.course_id = c.id WHERE tc.id = ?').get(req.params.classId);
  if (!cls) return notFound(res, '教学班不存在');
  const result = calcClassIloAchievement(cls.id);
  success(res, { class: cls, ...result });
});

// GET /api/analysis/diagnosis/:versionId — 诊断报告
router.get('/diagnosis/:versionId', (req, res) => {
  const version = db.prepare('SELECT * FROM curriculum_versions WHERE id = ?').get(req.params.versionId);
  if (!version) return notFound(res, '培养方案版本不存在');
  const result = diagnose(version.id);
  success(res, { version, ...result });
});

// GET /api/analysis/dashboard — 仪表盘概览数据
router.get('/dashboard', (req, res) => {
  const stats = {
    majors: db.prepare('SELECT COUNT(*) AS count FROM majors').get().count,
    courses: db.prepare('SELECT COUNT(*) AS count FROM courses').get().count,
    teachers: db.prepare('SELECT COUNT(*) AS count FROM teachers').get().count,
    students: db.prepare('SELECT COUNT(*) AS count FROM students').get().count,
    activeVersions: db.prepare("SELECT COUNT(*) AS count FROM curriculum_versions WHERE status = 'active'").get().count,
    teachingClasses: db.prepare('SELECT COUNT(*) AS count FROM teaching_classes').get().count,
  };

  // 最近活跃的培养方案版本
  const recentVersions = db.prepare(`
    SELECT cv.*, m.name AS major_name, c.name AS college_name
    FROM curriculum_versions cv
    JOIN majors m ON cv.major_id = m.id
    JOIN colleges c ON m.college_id = c.id
    ORDER BY cv.grade_year DESC
    LIMIT 5
  `).all();

  success(res, { stats, recentVersions });
});

module.exports = router;
