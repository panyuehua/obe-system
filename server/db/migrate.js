/**
 * 数据库迁移 — 建表脚本
 * 运行: node db/migrate.js
 */
const db = require('../config/database');

const schema = `
-- ─────────────────────────────────────────────────
--  基础组织结构
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schools (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  short_name TEXT,
  position   TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS colleges (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id  INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  code       TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS teachers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id  INTEGER REFERENCES colleges(id),
  teacher_no  TEXT UNIQUE,
  name        TEXT NOT NULL,
  title       TEXT,
  created_at  TEXT DEFAULT (datetime('now','localtime')),
  updated_at  TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS students (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id  INTEGER REFERENCES colleges(id),
  major_id    INTEGER REFERENCES majors(id),
  student_no  TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  grade       INTEGER,
  class_name  TEXT,
  created_at  TEXT DEFAULT (datetime('now','localtime')),
  updated_at  TEXT DEFAULT (datetime('now','localtime'))
);

-- ─────────────────────────────────────────────────
--  专业与培养方案
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS majors (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  college_id  INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  code        TEXT,
  degree_years INTEGER DEFAULT 3,
  cert_type   TEXT DEFAULT 'vocational',
  created_at  TEXT DEFAULT (datetime('now','localtime')),
  updated_at  TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS curriculum_versions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  major_id    INTEGER NOT NULL REFERENCES majors(id) ON DELETE CASCADE,
  version     TEXT NOT NULL,
  grade_year  INTEGER NOT NULL,
  status      TEXT DEFAULT 'draft',
  created_at  TEXT DEFAULT (datetime('now','localtime')),
  updated_at  TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(major_id, grade_year)
);

-- ─────────────────────────────────────────────────
--  培养目标 & 毕业要求
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS training_objectives (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  version_id  INTEGER NOT NULL REFERENCES curriculum_versions(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now','localtime')),
  updated_at  TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS graduation_requirements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  version_id  INTEGER NOT NULL REFERENCES curriculum_versions(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now','localtime')),
  updated_at  TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS gr_indicators (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  gr_id       INTEGER NOT NULL REFERENCES graduation_requirements(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  description TEXT NOT NULL,
  weight      REAL DEFAULT 1.0,
  threshold   REAL DEFAULT 0.60,
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now','localtime')),
  updated_at  TEXT DEFAULT (datetime('now','localtime'))
);

-- ─────────────────────────────────────────────────
--  课程体系
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS courses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  version_id  INTEGER NOT NULL REFERENCES curriculum_versions(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  credits     REAL DEFAULT 0,
  total_hours INTEGER DEFAULT 0,
  theory_hours INTEGER DEFAULT 0,
  practice_hours INTEGER DEFAULT 0,
  nature      TEXT DEFAULT 'required',
  semester    INTEGER DEFAULT 1,
  is_core     INTEGER DEFAULT 0,
  course_group TEXT,
  created_at  TEXT DEFAULT (datetime('now','localtime')),
  updated_at  TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS course_prerequisites (
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  prereq_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, prereq_id)
);

-- ─────────────────────────────────────────────────
--  支撑关系（OBE核心）
-- ─────────────────────────────────────────────────

-- 培养目标 ↔ 毕业要求（支撑强度）
CREATE TABLE IF NOT EXISTS support_obj_gr (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  objective_id INTEGER NOT NULL REFERENCES training_objectives(id) ON DELETE CASCADE,
  gr_id        INTEGER NOT NULL REFERENCES graduation_requirements(id) ON DELETE CASCADE,
  strength     TEXT DEFAULT 'H',
  created_at   TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(objective_id, gr_id)
);

-- 指标点 ↔ 课程（支撑权重）
CREATE TABLE IF NOT EXISTS support_indicator_course (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  indicator_id INTEGER NOT NULL REFERENCES gr_indicators(id) ON DELETE CASCADE,
  course_id    INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  weight       REAL DEFAULT 1.0,
  created_at   TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(indicator_id, course_id)
);

-- ─────────────────────────────────────────────────
--  教学执行层
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS teaching_classes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id   INTEGER NOT NULL REFERENCES courses(id),
  teacher_id  INTEGER REFERENCES teachers(id),
  semester    INTEGER NOT NULL,
  year        INTEGER NOT NULL,
  class_name  TEXT,
  created_at  TEXT DEFAULT (datetime('now','localtime')),
  updated_at  TEXT DEFAULT (datetime('now','localtime'))
);

-- 课程目标 / ILO
CREATE TABLE IF NOT EXISTS ilos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id    INTEGER NOT NULL REFERENCES teaching_classes(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  description TEXT NOT NULL,
  bloom_level TEXT DEFAULT 'apply',
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now','localtime')),
  updated_at  TEXT DEFAULT (datetime('now','localtime'))
);

-- ILO ↔ 指标点（支撑权重）
CREATE TABLE IF NOT EXISTS ilo_indicator_support (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ilo_id       INTEGER NOT NULL REFERENCES ilos(id) ON DELETE CASCADE,
  indicator_id INTEGER NOT NULL REFERENCES gr_indicators(id) ON DELETE CASCADE,
  weight       REAL DEFAULT 1.0,
  created_at   TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(ilo_id, indicator_id)
);

-- ─────────────────────────────────────────────────
--  考核与成绩
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assessment_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id    INTEGER NOT NULL REFERENCES teaching_classes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT DEFAULT 'homework',
  weight      REAL NOT NULL,
  max_score   REAL DEFAULT 100,
  created_at  TEXT DEFAULT (datetime('now','localtime')),
  updated_at  TEXT DEFAULT (datetime('now','localtime'))
);

-- 考核项 ↔ ILO（覆盖权重）
CREATE TABLE IF NOT EXISTS assessment_ilo_mapping (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id   INTEGER NOT NULL REFERENCES assessment_items(id) ON DELETE CASCADE,
  ilo_id          INTEGER NOT NULL REFERENCES ilos(id) ON DELETE CASCADE,
  weight          REAL DEFAULT 1.0,
  created_at      TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(assessment_id, ilo_id)
);

-- 学生成绩
CREATE TABLE IF NOT EXISTS scores (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id    INTEGER NOT NULL REFERENCES students(id),
  class_id      INTEGER NOT NULL REFERENCES teaching_classes(id),
  assessment_id INTEGER NOT NULL REFERENCES assessment_items(id),
  score         REAL NOT NULL,
  created_at    TEXT DEFAULT (datetime('now','localtime')),
  updated_at    TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(student_id, assessment_id)
);

-- ─────────────────────────────────────────────────
--  持续改进
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS improvement_plans (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  version_id          INTEGER REFERENCES curriculum_versions(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  target_type         TEXT DEFAULT 'general',
  description         TEXT,
  responsible_person  TEXT,
  academic_year       TEXT,
  due_date            TEXT,
  status              TEXT DEFAULT 'pending',
  note                TEXT,
  created_at          TEXT DEFAULT (datetime('now','localtime')),
  updated_at          TEXT DEFAULT (datetime('now','localtime'))
);
`;

try {
  db.exec(schema);
  console.log('✅ 数据库迁移完成');
} catch (err) {
  console.error('❌ 数据库迁移失败:', err.message);
  process.exit(1);
}
