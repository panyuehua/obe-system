/**
 * 逻辑诊断服务
 * 自动检测培养方案中的结构性问题
 */
const db = require('../config/database');

/**
 * 对某个培养方案版本执行全量诊断
 * @param {number} versionId
 * @returns {{ issues: Array, summary: Object }}
 */
function diagnose(versionId) {
  const issues = [];

  // ── 1. 支撑孤岛检测：指标点无任何课程支撑 ────────────────
  const unsupportedIndicators = db.prepare(`
    SELECT gri.id, gri.code, gri.description, gr.code AS gr_code
    FROM gr_indicators gri
    JOIN graduation_requirements gr ON gri.gr_id = gr.id
    WHERE gr.version_id = ?
      AND gri.id NOT IN (
        SELECT DISTINCT indicator_id FROM support_indicator_course
        JOIN courses c ON support_indicator_course.course_id = c.id
        WHERE c.version_id = ?
      )
  `).all(versionId, versionId);

  unsupportedIndicators.forEach((ind) => {
    issues.push({
      level: 'error',
      type: 'unsupported_indicator',
      code: `ISLAND_${ind.code}`,
      message: `指标点 ${ind.gr_code}-${ind.code} 无任何课程支撑，形成"支撑孤岛"`,
      target: { type: 'indicator', id: ind.id, code: ind.code },
    });
  });

  // ── 2. 权重失衡：某指标点的总支撑权重过低 ─────────────────
  const weightCheck = db.prepare(`
    SELECT gri.id, gri.code, gr.code AS gr_code,
           SUM(sic.weight) AS total_weight
    FROM gr_indicators gri
    JOIN graduation_requirements gr ON gri.gr_id = gr.id
    JOIN support_indicator_course sic ON sic.indicator_id = gri.id
    JOIN courses c ON sic.course_id = c.id
    WHERE gr.version_id = ? AND c.version_id = ?
    GROUP BY gri.id
    HAVING total_weight < 0.5
  `).all(versionId, versionId);

  weightCheck.forEach((ind) => {
    issues.push({
      level: 'warning',
      type: 'low_support_weight',
      code: `LOW_WEIGHT_${ind.code}`,
      message: `指标点 ${ind.gr_code}-${ind.code} 的课程支撑权重之和为 ${ind.total_weight.toFixed(2)}，建议 ≥ 0.5`,
      target: { type: 'indicator', id: ind.id, code: ind.code },
    });
  });

  // ── 3. 培养目标孤岛：培养目标无毕业要求支撑 ──────────────
  const unsupportedObjectives = db.prepare(`
    SELECT to_.id, to_.code, to_.description
    FROM training_objectives to_
    WHERE to_.version_id = ?
      AND to_.id NOT IN (SELECT DISTINCT objective_id FROM support_obj_gr)
  `).all(versionId);

  unsupportedObjectives.forEach((obj) => {
    issues.push({
      level: 'error',
      type: 'unsupported_objective',
      code: `OBJ_ISLAND_${obj.code}`,
      message: `培养目标 ${obj.code} 未与任何毕业要求关联，无法进行达成度计算`,
      target: { type: 'objective', id: obj.id, code: obj.code },
    });
  });

  // ── 4. 课程无ILO：已开课但未设课程目标 ───────────────────
  const noIloCourses = db.prepare(`
    SELECT tc.id AS class_id, c.name AS course_name, c.code AS course_code
    FROM teaching_classes tc
    JOIN courses c ON tc.course_id = c.id
    WHERE c.version_id = ?
      AND tc.id NOT IN (SELECT DISTINCT class_id FROM ilos)
  `).all(versionId);

  noIloCourses.forEach((cls) => {
    issues.push({
      level: 'warning',
      type: 'no_ilo',
      code: `NO_ILO_${cls.course_code}`,
      message: `课程 ${cls.course_name}(${cls.course_code}) 已开课但未配置课程目标(ILO)`,
      target: { type: 'teaching_class', id: cls.class_id, code: cls.course_code },
    });
  });

  // ── 5. 指标点二级权重求和校验 ─────────────────────────────
  const grWeightCheck = db.prepare(`
    SELECT gr.id, gr.code,
           ABS(SUM(gri.weight) - 1.0) AS deviation,
           SUM(gri.weight) AS total_weight
    FROM graduation_requirements gr
    JOIN gr_indicators gri ON gri.gr_id = gr.id
    WHERE gr.version_id = ?
    GROUP BY gr.id
    HAVING deviation > 0.05
  `).all(versionId);

  grWeightCheck.forEach((gr) => {
    issues.push({
      level: 'warning',
      type: 'weight_sum_error',
      code: `WEIGHT_SUM_${gr.code}`,
      message: `毕业要求 ${gr.code} 下各指标点权重之和为 ${gr.total_weight.toFixed(2)}，建议总和为 1.0`,
      target: { type: 'graduation_requirement', id: gr.id, code: gr.code },
    });
  });

  const summary = {
    total: issues.length,
    errors: issues.filter((i) => i.level === 'error').length,
    warnings: issues.filter((i) => i.level === 'warning').length,
    healthy: issues.length === 0,
  };

  return { issues, summary };
}

module.exports = { diagnose };
