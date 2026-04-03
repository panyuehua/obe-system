/**
 * 诊断报告 — diagnosis.html
 */
nav.render('diagnosis');
let allIssues = [];

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
  sel.addEventListener('change', () => {
    document.getElementById('btn-diagnose').disabled = !sel.value;
  });
}

async function runDiagnosis() {
  const vId = document.getElementById('version-select').value;
  if (!vId) return;
  const btn = document.getElementById('btn-diagnose');
  setLoading(btn, true);
  try {
    const data = await api.analysis.diagnosis(vId);
    allIssues = data.issues || [];
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('results').classList.remove('hidden');
    renderHealthBanner(data.summary);
    renderSummaryCards(data.summary);
    renderIssues(allIssues);
  } catch(e) {
    toast.error('诊断失败：' + e.message);
  } finally {
    setLoading(btn, false);
  }
}

function renderHealthBanner(summary) {
  const el = document.getElementById('health-banner');
  if (summary.healthy) {
    el.style.cssText = 'background:#ecfdf5;border:1px solid #a7f3d0';
    el.innerHTML = `
      <div style="width:44px;height:44px;border-radius:12px;background:#d1fae5;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div>
        <p style="font-size:15px;font-weight:700;color:#065f46">培养方案结构健康</p>
        <p style="font-size:13px;color:#047857;margin-top:2px">未发现任何结构性问题，方案逻辑完整、支撑关系完整</p>
      </div>`;
  } else {
    el.style.cssText = `background:${summary.errors>0?'#fef2f2':'#fffbeb'};border:1px solid ${summary.errors>0?'#fca5a5':'#fde68a'}`;
    el.innerHTML = `
      <div style="width:44px;height:44px;border-radius:12px;background:${summary.errors>0?'#fee2e2':'#fef3c7'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${summary.errors>0?'#b91c1c':'#92400e'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <div>
        <p style="font-size:15px;font-weight:700;color:${summary.errors>0?'#991b1b':'#92400e'}">发现 ${summary.total} 个结构性问题</p>
        <p style="font-size:13px;color:${summary.errors>0?'#b91c1c':'#a16207'};margin-top:2px">包含 ${summary.errors} 个错误，${summary.warnings} 个警告，请按优先级逐一修复</p>
      </div>`;
  }
}

function renderSummaryCards(summary) {
  document.getElementById('summary-cards').innerHTML = [
    { label:'错误',   value:summary.errors,   color:'#b91c1c', bg:'#fee2e2' },
    { label:'警告',   value:summary.warnings, color:'#92400e', bg:'#fef3c7' },
    { label:'问题总计', value:summary.total,  color:summary.healthy?'#065f46':'#374151', bg:summary.healthy?'#d1fae5':'var(--color-neutral-100)' },
  ].map(s => `
    <div class="stat-card">
      <div class="stat-icon mb-2" style="background:${s.bg}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div class="stat-value" style="color:${s.color}">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join('');
}

function filterIssues(level, btn) {
  document.querySelectorAll('#issue-filter .tab-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = level === 'all' ? allIssues : allIssues.filter(i => i.level === level);
  renderIssues(filtered);
}

function renderIssues(issues) {
  const el = document.getElementById('issues-list');
  if (!issues.length) {
    el.innerHTML = `<div class="empty-state" style="padding:32px 0"><div class="empty-state-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><p class="empty-state-title">无匹配问题</p></div>`;
    return;
  }
  el.innerHTML = issues.map(issue => `
    <div class="issue-card ${issue.level}">
      <div class="issue-icon ${issue.level}">
        ${issue.level === 'error'
          ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
          : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
        }
      </div>
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="badge ${issue.level==='error'?'badge-error':'badge-warning'}">${issue.level==='error'?'错误':'警告'}</span>
          <code style="font-size:11px;color:var(--color-neutral-500);background:rgba(0,0,0,0.05);padding:1px 6px;border-radius:4px">${issue.code}</code>
        </div>
        <p style="font-size:13px;color:${issue.level==='error'?'#7f1d1d':'#78350f'};line-height:1.6">${issue.message}</p>
        ${issue.target ? `<p style="font-size:11px;color:var(--color-neutral-400);margin-top:4px">关联对象 ${issue.target.type} · ${issue.target.code}</p>` : ''}
      </div>
      <a href="${getFixLink(issue)}" class="btn btn-secondary btn-sm flex-shrink-0" style="align-self:center">前往修复</a>
    </div>
  `).join('');
}

function getFixLink(issue) {
  if (issue.type === 'unsupported_indicator' || issue.type === 'low_support_weight') return '/pages/matrix.html';
  if (issue.type === 'unsupported_objective') return '/pages/curriculum.html';
  if (issue.type === 'no_ilo') return '/pages/courses.html';
  return '/pages/curriculum.html';
}

initVersionSelect();
