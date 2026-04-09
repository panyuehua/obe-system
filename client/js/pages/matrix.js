/**
 * 支撑矩阵 — matrix.html
 */
nav.render('matrix');

let matrixData = { indicators: [], courses: [], relations: [] };

// 模式：'check'（简单√支撑）或 'hml'（高中低强度）
let cellMode = 'check';
let currentVersionId = null;   // 当前已加载的版本 ID，用于保存 mode

const strengthCycle = [null, 'H', 'M', 'L'];
const strengthWeight = { H: 1.0, M: 0.6, L: 0.3 };

function applyModeUI(mode) {
  cellMode = mode;
  document.getElementById('mode-btn-check').classList.toggle('active', mode === 'check');
  document.getElementById('mode-btn-hml').classList.toggle('active', mode === 'hml');
  const legend = document.getElementById('hml-legend');
  if (mode === 'hml') legend.classList.remove('hidden');
  else legend.classList.add('hidden');
  updateInfoBar();
}

async function switchMode(mode) {
  applyModeUI(mode);
  if (matrixData.indicators.length) renderMatrix();
  // 持久化到数据库（版本粒度）
  if (currentVersionId) {
    try {
      await api.curriculum.updateVersion(currentVersionId, { matrix_mode: mode });
    } catch(e) {
      toast.error('模式保存失败：' + e.message);
    }
  }
}

function updateInfoBar() {
  const bar = document.getElementById('info-bar');
  const txt = document.getElementById('info-bar-text');
  if (!matrixData.indicators.length) return;
  bar.classList.remove('hidden');
  if (cellMode === 'check') {
    txt.innerHTML = '当前为 <strong>简单支撑</strong> 模式：点击单元格切换 <strong>√ 支撑 ↔ 无</strong>，适合只需标注是否支撑的培养方案。更改实时保存。';
  } else {
    txt.innerHTML = '当前为 <strong>HML 强度</strong> 模式：点击单元格循环切换 <strong>无 → H（高）→ M（中）→ L（低）→ 无</strong>。更改实时保存。';
  }
}

async function initVersionSelect() {
  const majors = await api.majors.list();
  const sel = document.getElementById('version-select');
  for (const m of majors) {
    const vs = await api.curriculum.versions(m.id);
    vs.forEach(v => {
      const o = document.createElement('option');
      o.value = v.id;
      o.textContent = `${m.name} · ${v.grade_year}级`;
      sel.appendChild(o);
    });
  }
}

async function loadMatrix() {
  const vId = document.getElementById('version-select').value;
  if (!vId) return;
  try {
    currentVersionId = vId;
    matrixData = await api.curriculum.supportMatrix(vId);
    // 从 API 返回的 matrix_mode 同步 UI
    applyModeUI(matrixData.matrix_mode || 'check');
    renderMatrix();
  } catch(e) { toast.error(e.message); }
}

function getRelation(indId, courseId) {
  return matrixData.relations.find(r => r.indicator_id == indId && r.course_id == courseId);
}

function getStrength(indId, courseId) {
  const rel = getRelation(indId, courseId);
  if (!rel) return null;
  if (rel.weight >= 0.9) return 'H';
  if (rel.weight >= 0.5) return 'M';
  return 'L';
}

function renderMatrix() {
  const { indicators, courses } = matrixData;
  const body = document.getElementById('matrix-body');

  if (!indicators.length || !courses.length) {
    body.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg></div><p class="empty-state-title">数据不足</p><p class="empty-state-desc">请先完善培养方案中的指标点和课程信息</p></div>`;
    return;
  }

  const total = indicators.length * courses.length;
  const filled = matrixData.relations.length;
  document.getElementById('matrix-stats').innerHTML = `
    <span class="badge badge-neutral">${indicators.length} 个指标点</span>
    <span class="badge badge-neutral">${courses.length} 门课程</span>
    <span class="badge badge-primary">已配置 ${filled} / ${total}</span>
  `;

  const grGroups = {};
  indicators.forEach(ind => {
    const grCode = ind.gr_code || ind.code.split('.')[0];
    if (!grGroups[grCode]) grGroups[grCode] = [];
    grGroups[grCode].push(ind);
  });

  body.innerHTML = `
    <div class="matrix-wrap">
      <table class="matrix-table">
        <thead>
          <tr>
            <th style="min-width:120px;padding:8px 12px;text-align:left;font-size:11px;color:var(--color-neutral-500)">指标点 \\ 课程</th>
            ${courses.map(c => `
              <th class="ind-header" style="font-size:11px;font-weight:600;color:var(--color-neutral-600)" title="${c.name}">
                <span>${c.code}</span>
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${Object.entries(grGroups).map(([grCode, inds]) => `
            <tr>
              <td colspan="${courses.length + 1}" style="padding:6px 8px 2px;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--color-primary-500);background:var(--color-primary-50)">
                ${grCode}
              </td>
            </tr>
            ${inds.map(ind => `
              <tr>
                <th style="padding:4px 12px;font-size:12px;color:var(--color-neutral-700);font-weight:500;text-align:left;white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis" title="${ind.description || ''}">
                  <span style="color:var(--color-primary-500);font-weight:700;margin-right:4px">${ind.code}</span>
                  <span style="color:var(--color-neutral-500);font-size:11px">${(ind.description || '').slice(0,18)}${(ind.description || '').length > 18 ? '…' : ''}</span>
                </th>
                ${courses.map(c => {
                  const strength = getStrength(ind.id, c.id);
                  const rel = getRelation(ind.id, c.id);
                  const isCheck = cellMode === 'check';
                  const hasRelation = !!rel;
                  const cls  = isCheck ? (hasRelation ? 'check' : 'none') : (strength || 'none');
                  const label = isCheck ? (hasRelation ? '√' : '') : (strength || '无');
                  return `
                    <td style="padding:2px;text-align:center">
                      <button class="cell-btn ${cls}"
                        onclick="cycleCell(${ind.id}, ${c.id}, this)"
                        data-ind="${ind.id}" data-course="${c.id}"
                        data-tooltip="${c.name}: ${rel ? '权重 ' + rel.weight : '未关联'}"
                        aria-label="${ind.code} × ${c.code}">
                        ${label}
                      </button>
                    </td>`;
                }).join('')}
              </tr>
            `).join('')}
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

async function cycleCell(indId, courseId, btn) {
  if (cellMode === 'check') {
    await cycleCellCheck(indId, courseId, btn);
  } else {
    await cycleCellHml(indId, courseId, btn);
  }
}

async function cycleCellCheck(indId, courseId, btn) {
  const hasSupport = btn.classList.contains('check');
  // 切换：有支撑 → 无；无 → 有支撑
  const next = !hasSupport;

  const prevCls  = btn.className;
  const prevText = btn.textContent.trim();

  btn.className  = `cell-btn ${next ? 'check' : 'none'}`;
  btn.textContent = next ? '√' : '';

  try {
    if (!next) {
      await api.curriculum.removeSupport({ indicator_id: indId, course_id: courseId });
      matrixData.relations = matrixData.relations.filter(r => !(r.indicator_id == indId && r.course_id == courseId));
    } else {
      const weight = 1.0;
      await api.curriculum.saveSupport({ indicator_id: indId, course_id: courseId, weight });
      const existing = matrixData.relations.find(r => r.indicator_id == indId && r.course_id == courseId);
      if (existing) existing.weight = weight;
      else matrixData.relations.push({ indicator_id: indId, course_id: courseId, weight });
    }
    updateStatsBar();
    btn.setAttribute('data-tooltip', next ? '已支撑' : '未关联');
  } catch(e) {
    toast.error('保存失败：' + e.message);
    btn.className  = prevCls;
    btn.textContent = prevText;
  }
}

async function cycleCellHml(indId, courseId, btn) {
  const current = btn.textContent.trim();
  const currentStrength = (current === '无' || current === '') ? null : current;
  const idx = strengthCycle.indexOf(currentStrength);
  const nextStrength = strengthCycle[(idx + 1) % strengthCycle.length];

  const prevCls  = btn.className;
  const prevText = btn.textContent.trim();

  btn.className  = `cell-btn ${nextStrength || 'none'}`;
  btn.textContent = nextStrength || '无';

  try {
    if (!nextStrength) {
      await api.curriculum.removeSupport({ indicator_id: indId, course_id: courseId });
      matrixData.relations = matrixData.relations.filter(r => !(r.indicator_id == indId && r.course_id == courseId));
    } else {
      const weight = strengthWeight[nextStrength];
      await api.curriculum.saveSupport({ indicator_id: indId, course_id: courseId, weight });
      const existing = matrixData.relations.find(r => r.indicator_id == indId && r.course_id == courseId);
      if (existing) existing.weight = weight;
      else matrixData.relations.push({ indicator_id: indId, course_id: courseId, weight });
    }
    updateStatsBar();
    btn.setAttribute('data-tooltip', nextStrength ? `权重 ${strengthWeight[nextStrength]}` : '未关联');
  } catch(e) {
    toast.error('保存失败：' + e.message);
    btn.className  = prevCls;
    btn.textContent = prevText;
  }
}

function updateStatsBar() {
  const filled = matrixData.relations.length;
  const total  = matrixData.indicators.length * matrixData.courses.length;
  const badge  = document.querySelector('#matrix-stats .badge-primary');
  if (badge) badge.textContent = `已配置 ${filled} / ${total}`;
}

// 初始化分段控件 UI（无版本时默认 check）
applyModeUI('check');
initVersionSelect();
