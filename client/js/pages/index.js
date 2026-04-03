/**
 * 首页概览 — index.html
 */
nav.render('dashboard');

function quickIcon(name) {
  const icons = {
    'clipboard-list': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></svg>`,
    'grid':    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
    'bar-chart': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    'shield':  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    'book':    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>`,
    'refresh': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>`,
  };
  return icons[name] || '';
}

function renderQuickActions() {
  const items = [
    {href:'/pages/curriculum.html', icon:'clipboard-list', label:'培养方案', color:'#eef2ff', icolor:'#4f46e5'},
    {href:'/pages/matrix.html',     icon:'grid',           label:'支撑矩阵', color:'#f5f3ff', icolor:'#7c3aed'},
    {href:'/pages/analysis.html',   icon:'bar-chart',      label:'达成分析', color:'#ecfdf5', icolor:'#059669'},
    {href:'/pages/diagnosis.html',  icon:'shield',         label:'诊断报告', color:'#fffbeb', icolor:'#d97706'},
    {href:'/pages/courses.html',    icon:'book',           label:'课程管理', color:'#eff6ff', icolor:'#2563eb'},
    {href:'/pages/improvement.html',icon:'refresh',        label:'持续改进', color:'#f0fdf4', icolor:'#16a34a'},
  ];
  document.getElementById('quick-actions').innerHTML = items.map(q => `
    <a href="${q.href}" class="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:opacity-90" style="background:${q.color};text-decoration:none">
      <div style="width:36px;height:36px;border-radius:10px;background:${q.icolor}20;display:flex;align-items:center;justify-content:center;color:${q.icolor}">
        ${quickIcon(q.icon)}
      </div>
      <span style="font-size:12px;font-weight:600;color:${q.icolor}">${q.label}</span>
    </a>
  `).join('');
}

function renderOBEFlow() {
  const steps = [
    {label:'社会需求', sub:'行业数据',  bg:'#f5f3ff', c:'#7c3aed', icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`},
    {label:'培养目标', sub:'专业定位',  bg:'#eff6ff', c:'#2563eb', icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`},
    {label:'毕业要求', sub:'指标点',    bg:'#eef2ff', c:'#4f46e5', icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`},
    {label:'课程体系', sub:'支撑关系',  bg:'#ecfdf5', c:'#059669', icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`},
    {label:'课程目标', sub:'ILO',       bg:'#f0fdf4', c:'#16a34a', icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>`},
    {label:'考核评价', sub:'成绩采集',  bg:'#fffbeb', c:'#d97706', icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`},
    {label:'达成分析', sub:'计算报告',  bg:'#fff7ed', c:'#ea580c', icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`},
    {label:'持续改进', sub:'闭环反馈',  bg:'#fef2f2', c:'#dc2626', icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>`},
  ];
  document.getElementById('obe-flow').innerHTML = steps.map((s, i) => `
    <div class="flex items-center" style="flex:1;min-width:0">
      <div class="flex flex-col items-center gap-1.5" style="flex:1;min-width:64px">
        <div style="width:48px;height:48px;border-radius:12px;background:${s.bg};display:flex;align-items:center;justify-content:center;color:${s.c}">
          ${s.icon}
        </div>
        <div style="text-align:center">
          <div style="font-size:12px;font-weight:600;color:var(--color-neutral-700)">${s.label}</div>
          <div style="font-size:10px;color:var(--color-neutral-400)">${s.sub}</div>
        </div>
      </div>
      ${i < 7 ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--color-neutral-300);flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>` : ''}
    </div>
  `).join('');
}

const statIcons = {
  majors:          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  activeVersions:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></svg>`,
  courses:         `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>`,
  teachers:        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
  students:        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  teachingClasses: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
};

const statConfig = [
  { key:'majors',          label:'专业数',   color:'#4f46e5', bg:'#eef2ff' },
  { key:'activeVersions',  label:'有效方案', color:'#7c3aed', bg:'#f5f3ff' },
  { key:'courses',         label:'课程数',   color:'#0891b2', bg:'#ecfeff' },
  { key:'teachers',        label:'教师数',   color:'#059669', bg:'#ecfdf5' },
  { key:'students',        label:'学生数',   color:'#d97706', bg:'#fffbeb' },
  { key:'teachingClasses', label:'教学班',   color:'#dc2626', bg:'#fef2f2' },
];

async function loadDashboard() {
  try {
    const data = await api.dashboard();
    document.getElementById('sync-time').textContent = `更新时间：${new Date().toLocaleTimeString('zh-CN')}`;

    document.getElementById('stats-grid').innerHTML = statConfig.map((cfg) => `
      <div class="stat-card">
        <div class="flex items-start justify-between mb-3">
          <div class="stat-icon" style="background:${cfg.bg};color:${cfg.color}">
            ${statIcons[cfg.key] || ''}
          </div>
        </div>
        <div class="stat-value">${data.stats[cfg.key] ?? 0}</div>
        <div class="stat-label mt-1">${cfg.label}</div>
      </div>
    `).join('');

    const vList = document.getElementById('versions-list');
    if (!data.recentVersions.length) {
      vList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/></svg></div>
          <p class="empty-state-title">暂无培养方案</p>
          <p class="empty-state-desc">请先在专业管理中创建专业，再添加培养方案</p>
          <a href="/pages/majors.html" class="btn btn-primary btn-sm mt-2">前往专业管理</a>
        </div>`;
      return;
    }
    vList.innerHTML = `<div class="space-y-2">
      ${data.recentVersions.map((v) => `
        <div class="flex items-center justify-between px-4 py-3 rounded-xl" style="background:var(--color-neutral-50);border:1px solid var(--color-border-subtle)">
          <div class="flex items-center gap-3">
            <div style="width:36px;height:36px;border-radius:10px;background:var(--color-primary-50);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/></svg>
            </div>
            <div>
              <p style="font-size:13px;font-weight:600;color:var(--color-neutral-800)">${v.major_name} <span style="font-weight:400;color:var(--color-neutral-400)">${v.version}</span></p>
              <p style="font-size:11px;color:var(--color-neutral-400)">${v.college_name} · ${v.grade_year}级</p>
            </div>
          </div>
          <span class="badge ${v.status === 'active' ? 'badge-success' : 'badge-neutral'}">${v.status === 'active' ? '有效' : '草稿'}</span>
        </div>
      `).join('')}
    </div>`;
  } catch (e) {
    toast.error('数据加载失败：' + e.message);
  }
}

renderQuickActions();
renderOBEFlow();
loadDashboard();
