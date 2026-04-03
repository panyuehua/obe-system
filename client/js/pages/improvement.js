/**
 * 持续改进 — improvement.html
 */
nav.render('improvement');

let allPlans = [];
let currentStatus = null;
let editingPlanId = null;
let selectedNewStatus = null;
let currentVersionId = null;

const statusConfig = {
  pending:     { label:'待启', color:'#f59e0b', bg:'#fffbeb', border:'#fde68a', badgeClass:'badge-warning' },
  in_progress: { label:'进行', color:'var(--color-primary-600)', bg:'var(--color-primary-50)', border:'var(--color-primary-200)', badgeClass:'badge-primary' },
  completed:   { label:'已完', color:'#10b981', bg:'#ecfdf5', border:'#a7f3d0', badgeClass:'badge-success' },
  verified:    { label:'已验', color:'#6366f1', bg:'#eef2ff', border:'#c7d2fe', badgeClass:'badge-info' },
};

const targetTypes = {
  graduation_requirement: '毕业要求',
  indicator:              '指标点',
  course:                 '课程',
  ilo:                    'ILO',
  general:                '综合',
};

async function initVersionSelect() {
  try {
    const majors = await api.majors.list();
    const sel = document.getElementById('version-select');
    for (const m of majors) {
      const versions = await api.curriculum.versions(m.id);
      versions.forEach(v => {
        const o = document.createElement('option');
        o.value = v.id;
        o.textContent = `${m.name} · ${v.grade_year}(${v.version})`;
        sel.appendChild(o);
      });
    }
  } catch(e) { toast.error(e.message); }
}

async function loadPlans() {
  currentVersionId = document.getElementById('version-select').value;
  if (!currentVersionId) return;
  try {
    allPlans = await api.improvement.list(currentVersionId);
    updateBanner();
    filterStatus(currentStatus, document.querySelector('.tab-item.active'));
  } catch(e) { toast.error(e.message); }
}

function updateBanner() {
  const banner = document.getElementById('cqi-banner');
  banner.classList.remove('hidden');
  const counts = { pending:0, in_progress:0, completed:0, verified:0 };
  allPlans.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });
  document.getElementById('cnt-pending').textContent   = counts.pending;
  document.getElementById('cnt-progress').textContent  = counts.in_progress;
  document.getElementById('cnt-completed').textContent = counts.completed;
  document.getElementById('cnt-verified').textContent  = counts.verified;
  const total = allPlans.length;
  const done  = counts.completed + counts.verified;
  document.getElementById('banner-text').textContent = total
    ? `${total} 个改进计划· ${done} 个已完成或验证`
    : '暂无改进计划，点击右上角新建';
}

function filterStatus(status, btn) {
  currentStatus = status;
  document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const list = status ? allPlans.filter(p => p.status === status) : allPlans;
  document.getElementById('filter-count').textContent = list.length ? `共 ${list.length} 条` : '';
  renderPlans(list);
}

function renderPlans(plans) {
  const grid = document.getElementById('plans-grid');
  if (!plans.length) {
    grid.innerHTML = `
      <div class="card" style="grid-column:1/-1">
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          </div>
          <p class="empty-state-title">${currentVersionId ? '暂无改进计划' : '请先选择培养方案版本'}</p>
          <p class="empty-state-desc">${currentVersionId ? '点击右上角「新建改进计划」开始记录' : '选择后将显示改进计划列表'}</p>
        </div>
      </div>`;
    return;
  }

  grid.innerHTML = plans.map(p => {
    const sc = statusConfig[p.status] || statusConfig.pending;
    const typeLabel = targetTypes[p.target_type] || p.target_type || '';
    const dueDate = p.due_date ? formatDate(p.due_date) : null;
    const isOverdue = dueDate && new Date(p.due_date) < new Date() && p.status !== 'verified' && p.status !== 'completed';

    return `
    <div class="card" style="border-left:3px solid ${sc.color};transition:box-shadow 0.2s" onmouseover="this.style.boxShadow='var(--shadow-md)'" onmouseout="this.style.boxShadow=''">
      <div style="padding:16px">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div style="flex:1;min-width:0">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <span class="badge ${sc.badgeClass}" style="font-size:11px">${sc.label}</span>
              <span class="badge badge-neutral" style="font-size:10px">${typeLabel}</span>
              ${isOverdue ? `<span class="badge badge-danger" style="font-size:10px">已逾期</span>` : ''}
            </div>
            <h3 style="font-size:14px;font-weight:700;color:var(--color-neutral-800);line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${p.title}</h3>
          </div>
          <div style="display:flex;gap:2px;flex-shrink:0">
            <button onclick='openEditModal(${JSON.stringify(p).replace(/'/g,"&#39;")})' class="btn btn-ghost btn-icon btn-sm" aria-label="编辑">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button onclick="deletePlan(${p.id},'${p.title.replace(/'/g,"\\'")}')" class="btn btn-ghost btn-icon btn-sm" aria-label="删除" style="color:var(--color-error)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            </button>
          </div>
        </div>

        ${p.description ? `<p style="font-size:12px;color:var(--color-neutral-500);line-height:1.6;margin-bottom:12px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical">${p.description}</p>` : ''}

        <div class="flex items-center gap-4 flex-wrap" style="font-size:11px;color:var(--color-neutral-400);margin-bottom:14px">
          ${p.responsible_person ? `
          <span class="flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            ${p.responsible_person}
          </span>` : ''}
          ${dueDate ? `
          <span class="flex items-center gap-1" style="${isOverdue ? 'color:#ef4444;font-weight:600' : ''}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            截止 ${dueDate}${isOverdue ? ' · 已逾期' : ''}
          </span>` : ''}
          ${p.academic_year ? `
          <span class="flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${p.academic_year}
          </span>` : ''}
        </div>

        <div style="border-top:1px solid var(--color-border);padding-top:12px">
          <button onclick="openStatusModal(${p.id},'${p.status}')" class="btn btn-secondary btn-sm" style="width:100%;justify-content:center;gap:6px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            更新状态
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

const planFields = (d = {}) => [
  { name:'title',              label:'计划标题',   required:true, placeholder:'如：优化高等数学考核方式', default:d.title },
  { name:'target_type',        label:'改进对象类型', type:'select',
    options:[
      {value:'graduation_requirement',label:'毕业要求'},
      {value:'indicator',            label:'指标点'},
      {value:'course',               label:'课程'},
      {value:'ilo',                  label:'ILO'},
      {value:'general',              label:'综合'},
    ], default:d.target_type||'graduation_requirement' },
  { name:'description',        label:'问题描述与改进措施', type:'textarea', rows:4, placeholder:'描述发现的问题及具体改进方案', default:d.description },
  { name:'responsible_person', label:'责任人',     placeholder:'如：张三',  default:d.responsible_person },
  { name:'academic_year',      label:'学年',       placeholder:'如：2024-2025', default:d.academic_year },
  { name:'due_date',           label:'截止日期',   type:'date', default:d.due_date ? d.due_date.slice(0,10) : '' },
];

function openCreateModal() {
  if (!currentVersionId) { toast.warning('请先选择培养方案版本'); return; }
  modal.form({
    title:'新建改进计划',
    fields: planFields(),
    submitText: '创建计划',
    size: 'lg',
    onSubmit: async (data, close) => {
      try {
        await api.improvement.create({ ...data, version_id: currentVersionId });
        close(); toast.success('改进计划已创建'); loadPlans();
      } catch(e) { toast.error(e.message); }
    }
  });
}

function openEditModal(p) {
  modal.form({
    title:'编辑改进计划',
    fields: planFields(p),
    submitText: '保存更改',
    size: 'lg',
    onSubmit: async (data, close) => {
      try {
        await api.improvement.update(p.id, data);
        close(); toast.success('保存成功'); loadPlans();
      } catch(e) { toast.error(e.message); }
    }
  });
}

async function deletePlan(id, title) {
  const ok = await modal.confirm(`确定删除改进计划「<strong>${title}</strong>」？此操作不可恢复。`, { danger:true });
  if (!ok) return;
  try { await api.improvement.remove(id); toast.success('删除成功'); loadPlans(); }
  catch(e) { toast.error(e.message); }
}

function openStatusModal(planId, curStatus) {
  editingPlanId = planId;
  selectedNewStatus = curStatus;
  document.getElementById('status-note').value = '';

  const opts = document.getElementById('status-options');
  opts.innerHTML = Object.entries(statusConfig).map(([key, sc]) => `
    <button
      onclick="selectStatus('${key}', this)"
      class="status-opt-btn"
      data-status="${key}"
      style="border:2px solid ${key === curStatus ? sc.color : 'var(--color-border)'};
             background:${key === curStatus ? sc.bg : 'transparent'};
             border-radius:10px;padding:10px 12px;cursor:pointer;text-align:left;transition:all 0.15s">
      <div class="flex items-center gap-2">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${sc.color};flex-shrink:0"></span>
        <span style="font-size:13px;font-weight:600;color:var(--color-neutral-800)">${sc.label}</span>
        ${key === curStatus ? `<span style="margin-left:auto;font-size:10px;color:${sc.color}">当前</span>` : ''}
      </div>
    </button>
  `).join('');

  document.getElementById('status-modal').style.display = 'flex';
  document.getElementById('status-modal').focus();
}

function selectStatus(status, btn) {
  selectedNewStatus = status;
  document.querySelectorAll('.status-opt-btn').forEach(b => {
    const s = b.dataset.status;
    const sc = statusConfig[s];
    b.style.border = `2px solid ${s === status ? sc.color : 'var(--color-border)'}`;
    b.style.background = s === status ? sc.bg : 'transparent';
  });
}

function closeStatusModal() {
  document.getElementById('status-modal').style.display = 'none';
  editingPlanId = null;
  selectedNewStatus = null;
}

async function confirmStatusUpdate() {
  if (!editingPlanId || !selectedNewStatus) return;
  const btn = document.getElementById('status-confirm-btn');
  setLoading(btn, true);
  try {
    const note = document.getElementById('status-note').value.trim();
    await api.improvement.updateStatus(editingPlanId, { status: selectedNewStatus, note });
    closeStatusModal();
    toast.success(`状态已更新为「${statusConfig[selectedNewStatus].label}」`);
    loadPlans();
  } catch(e) {
    toast.error(e.message);
  } finally {
    setLoading(btn, false);
  }
}

document.getElementById('status-modal').addEventListener('click', function(e) {
  if (e.target === this) closeStatusModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeStatusModal();
});

initVersionSelect();
