/**
 * 演示数据种子
 * 运行: node db/seed.js
 */
const db = require('../config/database');

const seed = db.transaction(() => {
  // ── School ───────────────────────────────────────────────
  const school = db.prepare(`
    INSERT OR IGNORE INTO schools (id, name, short_name, position)
    VALUES (1, '示范职业技术学院', '示范职院', '以立德树人为根本，培养高素质技术技能型人才')
  `).run();

  // ── College ──────────────────────────────────────────────
  db.prepare(`
    INSERT OR IGNORE INTO colleges (id, school_id, name, code)
    VALUES (1, 1, '信息技术学院', 'IT')
  `).run();

  // ── Teachers ─────────────────────────────────────────────
  db.prepare(`INSERT OR IGNORE INTO teachers (id, college_id, teacher_no, name, title) VALUES (1, 1, 'T001', '张明华', '副教授')`).run();
  db.prepare(`INSERT OR IGNORE INTO teachers (id, college_id, teacher_no, name, title) VALUES (2, 1, 'T002', '李晓燕', '讲师')`).run();
  db.prepare(`INSERT OR IGNORE INTO teachers (id, college_id, teacher_no, name, title) VALUES (3, 1, 'T003', '王大志', '教授')`).run();

  // ── Major ────────────────────────────────────────────────
  db.prepare(`
    INSERT OR IGNORE INTO majors (id, college_id, name, code, degree_years, cert_type)
    VALUES (1, 1, '软件技术', 'RJ', 3, 'vocational')
  `).run();

  // ── Curriculum Version ───────────────────────────────────
  db.prepare(`
    INSERT OR IGNORE INTO curriculum_versions (id, major_id, version, grade_year, status)
    VALUES (1, 1, 'v2024', 2024, 'active')
  `).run();

  // ── Training Objectives ──────────────────────────────────
  const objectives = [
    [1, 1, 'TO1', '具备扎实的软件开发基础理论知识，能够运用所学知识分析和解决软件工程领域的实际问题'],
    [2, 1, 'TO2', '掌握主流软件开发技术与工具，具备独立承担软件项目开发与维护的能力'],
    [3, 1, 'TO3', '具备良好的职业道德、团队协作精神和持续学习能力，适应软件行业快速发展'],
  ];
  const insObj = db.prepare(`INSERT OR IGNORE INTO training_objectives (id, version_id, code, description, sort_order) VALUES (?, ?, ?, ?, ?)`);
  objectives.forEach(([id, vid, code, desc], i) => insObj.run(id, vid, code, desc, i));

  // ── Graduation Requirements ──────────────────────────────
  const grs = [
    [1, 1, 'GR1', '工程知识：掌握软件开发相关的数学、自然科学、工程基础和专业知识', 1],
    [2, 1, 'GR2', '问题分析：能够应用数学和工程科学基础知识，识别、表达和分析软件工程问题', 2],
    [3, 1, 'GR3', '设计与开发：能够设计满足特定需求的软件系统，并能综合考虑社会、健康、安全等因素', 3],
    [4, 1, 'GR4', '工具使用：能够针对软件工程问题选择、使用恰当的技术、资源、工具和方法', 4],
    [5, 1, 'GR5', '团队合作：能够在多学科背景下的团队中承担个体、团队成员及负责人的角色', 5],
    [6, 1, 'GR6', '持续学习：具有自主学习和终身学习的意识，有不断学习和适应发展的能力', 6],
  ];
  const insGR = db.prepare(`INSERT OR IGNORE INTO graduation_requirements (id, version_id, code, description, sort_order) VALUES (?, ?, ?, ?, ?)`);
  grs.forEach(([id, vid, code, desc, sort]) => insGR.run(id, vid, code, desc, sort));

  // ── GR Indicators ────────────────────────────────────────
  const indicators = [
    [1, 1, 'GR1.1', '掌握高等数学、线性代数等数学基础知识', 0.5, 0.6],
    [2, 1, 'GR1.2', '掌握计算机组成原理、操作系统等专业基础知识', 0.5, 0.6],
    [3, 2, 'GR2.1', '能够识别和定义软件工程问题的本质', 0.4, 0.6],
    [4, 2, 'GR2.2', '能够建立数学模型对软件问题进行分析', 0.6, 0.6],
    [5, 3, 'GR3.1', '能够设计软件系统架构和模块', 0.5, 0.6],
    [6, 3, 'GR3.2', '能够编写规范的、可维护的代码', 0.5, 0.6],
    [7, 4, 'GR4.1', '能够熟练使用主流开发工具和框架', 0.6, 0.6],
    [8, 4, 'GR4.2', '能够使用版本控制、测试、部署工具', 0.4, 0.6],
    [9, 5, 'GR5.1', '能够在团队中有效沟通和协作', 1.0, 0.6],
    [10, 6, 'GR6.1', '具备主动学习新技术的意识和方法', 1.0, 0.6],
  ];
  const insInd = db.prepare(`INSERT OR IGNORE INTO gr_indicators (id, gr_id, code, description, weight, threshold) VALUES (?, ?, ?, ?, ?, ?)`);
  indicators.forEach(([id, gid, code, desc, w, t]) => insInd.run(id, gid, code, desc, w, t));

  // ── Courses ──────────────────────────────────────────────
  const courses = [
    [1, 1, 'CS001', '高等数学', 4, 64, 64, 0, 'required', 1, 0],
    [2, 1, 'CS002', '程序设计基础', 4, 72, 36, 36, 'required', 1, 1],
    [3, 1, 'CS003', '数据结构与算法', 4, 72, 54, 18, 'required', 2, 1],
    [4, 1, 'CS004', '数据库原理与应用', 3, 54, 36, 18, 'required', 2, 0],
    [5, 1, 'CS005', '软件工程', 3, 54, 36, 18, 'required', 3, 1],
    [6, 1, 'CS006', 'Web前端开发', 4, 72, 36, 36, 'required', 3, 0],
    [7, 1, 'CS007', '后端开发技术', 4, 72, 36, 36, 'required', 4, 0],
    [8, 1, 'CS008', '综合项目实训', 6, 108, 0, 108, 'required', 5, 1],
  ];
  const insCourse = db.prepare(`INSERT OR IGNORE INTO courses (id, version_id, code, name, credits, total_hours, theory_hours, practice_hours, nature, semester, is_core) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  courses.forEach((c) => insCourse.run(...c));

  // ── Support Obj→GR ───────────────────────────────────────
  const objGr = [[1,1,'H'],[1,2,'H'],[1,3,'M'],[2,3,'H'],[2,4,'H'],[2,5,'M'],[3,5,'H'],[3,6,'H']];
  const insObjGr = db.prepare(`INSERT OR IGNORE INTO support_obj_gr (objective_id, gr_id, strength) VALUES (?, ?, ?)`);
  objGr.forEach(([oid, gid, s]) => insObjGr.run(oid, gid, s));

  // ── Support Indicator→Course ─────────────────────────────
  const indCourse = [
    [1,1,0.5],[1,2,0.5],[2,2,0.4],[2,3,0.6],
    [3,3,0.5],[3,4,0.5],[4,3,0.6],[4,4,0.4],
    [5,5,0.4],[5,6,0.3],[5,7,0.3],[6,2,0.3],[6,5,0.4],[6,7,0.3],
    [7,5,0.3],[7,6,0.4],[7,7,0.3],[8,6,0.4],[8,7,0.3],[8,8,0.3],
    [9,5,0.5],[9,8,0.5],[10,5,0.5],[10,8,0.5],
  ];
  const insIC = db.prepare(`INSERT OR IGNORE INTO support_indicator_course (indicator_id, course_id, weight) VALUES (?, ?, ?)`);
  indCourse.forEach(([iid, cid, w]) => insIC.run(iid, cid, w));

  console.log('✅ 演示数据写入完成');
});

try {
  seed();
} catch (err) {
  console.error('❌ 种子数据写入失败:', err.message);
  process.exit(1);
}
