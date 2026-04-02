/**
 * 达成度计算服务
 * 实现OBE四层达成度计算逻辑：
 * 考核成绩 → ILO达成 → 指标点达成 → 毕业要求达成 → 培养目标达成
 */
const db = require('../config/database');

/**
 * 计算单个教学班的ILO达成度
 * @param {number} classId - 教学班ID
 * @returns {{ ilos: Array, classAchievement: number }}
 */
function calcClassIloAchievement(classId) {
  const ilos = db.prepare('SELECT * FROM ilos WHERE class_id = ?').all(classId);
  if (!ilos.length) return { ilos: [], classAchievement: null };

  const iloResults = ilos.map((ilo) => {
    // 获取考核项 + ILO映射
    const mappings = db.prepare(`
      SELECT aim.weight AS ilo_weight, ai.max_score,
             AVG(s.score) AS avg_score
      FROM assessment_ilo_mapping aim
      JOIN assessment_items ai ON aim.assessment_id = ai.id
      LEFT JOIN scores s ON s.assessment_id = ai.id AND s.class_id = ?
      WHERE aim.ilo_id = ?
      GROUP BY aim.assessment_id
    `).all(classId, ilo.id);

    if (!mappings.length) return { ...ilo, achievement: null };

    const weightSum = mappings.reduce((s, m) => s + m.ilo_weight, 0);
    if (!weightSum) return { ...ilo, achievement: null };

    const weighted = mappings.reduce((s, m) => {
      const rate = m.avg_score != null ? m.avg_score / m.max_score : 0;
      return s + rate * m.ilo_weight;
    }, 0);

    return { ...ilo, achievement: weighted / weightSum };
  });

  // 班级课程目标综合达成（等权均值）
  const valid = iloResults.filter((i) => i.achievement !== null);
  const classAchievement = valid.length
    ? valid.reduce((s, i) => s + i.achievement, 0) / valid.length
    : null;

  return { ilos: iloResults, classAchievement };
}

/**
 * 计算某指标点的达成度（基于支撑它的所有ILO）
 * @param {number} indicatorId
 * @param {number} versionId - 用于限定课程范围
 * @returns {number|null}
 */
function calcIndicatorAchievement(indicatorId, versionId) {
  // 获取支撑该指标点的所有 (ilo, support_weight)
  const supports = db.prepare(`
    SELECT iis.ilo_id, iis.weight AS support_weight,
           i.class_id
    FROM ilo_indicator_support iis
    JOIN ilos i ON iis.ilo_id = i.id
    JOIN teaching_classes tc ON i.class_id = tc.id
    JOIN courses c ON tc.course_id = c.id
    WHERE iis.indicator_id = ? AND c.version_id = ?
  `).all(indicatorId, versionId);

  if (!supports.length) return null;

  let weightedSum = 0;
  let weightTotal = 0;

  for (const sup of supports) {
    const { ilos } = calcClassIloAchievement(sup.class_id);
    const ilo = ilos.find((i) => i.id === sup.ilo_id);
    if (ilo && ilo.achievement !== null) {
      weightedSum += ilo.achievement * sup.support_weight;
      weightTotal += sup.support_weight;
    }
  }

  return weightTotal > 0 ? weightedSum / weightTotal : null;
}

/**
 * 计算某届培养方案的全量达成度报告
 * @param {number} versionId
 */
function calcFullAchievement(versionId) {
  const grs = db.prepare('SELECT * FROM graduation_requirements WHERE version_id = ? ORDER BY sort_order').all(versionId);
  const objectives = db.prepare('SELECT * FROM training_objectives WHERE version_id = ? ORDER BY sort_order').all(versionId);

  const grResults = grs.map((gr) => {
    const indicators = db.prepare('SELECT * FROM gr_indicators WHERE gr_id = ? ORDER BY sort_order').all(gr.id);

    let grWeightSum = 0, grWeighted = 0;
    const indResults = indicators.map((ind) => {
      const achievement = calcIndicatorAchievement(ind.id, versionId);
      if (achievement !== null) {
        grWeighted += achievement * ind.weight;
        grWeightSum += ind.weight;
      }
      return { ...ind, achievement, reached: achievement !== null && achievement >= ind.threshold };
    });

    const grAchievement = grWeightSum > 0 ? grWeighted / grWeightSum : null;
    return { ...gr, achievement: grAchievement, indicators: indResults };
  });

  // 培养目标达成
  const objResults = objectives.map((obj) => {
    const relations = db.prepare(`
      SELECT sog.gr_id, sog.strength FROM support_obj_gr sog WHERE sog.objective_id = ?
    `).all(obj.id);

    const strengthMap = { H: 3, M: 2, L: 1 };
    let weighted = 0, weightSum = 0;

    for (const rel of relations) {
      const gr = grResults.find((g) => g.id === rel.gr_id);
      if (gr && gr.achievement !== null) {
        const s = strengthMap[rel.strength] || 1;
        weighted += gr.achievement * s;
        weightSum += s;
      }
    }

    return { ...obj, achievement: weightSum > 0 ? weighted / weightSum : null };
  });

  return { objectives: objResults, graduationRequirements: grResults };
}

module.exports = { calcClassIloAchievement, calcIndicatorAchievement, calcFullAchievement };
