/**
 * 培养方案 — curriculum.html
 */
nav.render('curriculum');

  /* ─── 全局状态 ─── */
  let allVersions        = [];
  let allMajors          = [];
  let currentVersionId   = null;
  let currentVersionData = null;
  let activeTab          = 'objectives';
  let objGrRelations     = null; // Set of "objId_grId"
  let sicRelations       = null; // Map of "indId_courseId" -> weight
  let sicMode            = 'check'; // 'check' | 'hml'
  let matrixLoaded       = { 'obj-gr': false, 'matrix': false, 'courses': false };
  let cvCourses          = [];  // 当前版本课程缓存

  /* ═══════════════════════════════════════════════════════
     初始化 & 列表
  ════════════════════════════════════════════════════════ */

  async function init() {
    try {
      [allVersions, allMajors] = await Promise.all([
        api.curriculum.allVersions(),
        api.majors.list(),
      ]);
      const sel = document.getElementById('filter-major');
      allMajors.forEach(m => {
        const o = document.createElement('option');
        o.value = m.id; o.textContent = m.name; sel.appendChild(o);
      });
      const params = new URLSearchParams(location.search);
      if (params.get('major_id')) sel.value = params.get('major_id');
      if (params.get('version_id')) {
        await openDetail(Number(params.get('version_id')));
        return;
      }
      filterVersions();
    } catch(e) { toast.error('数据加载失败：' + e.message); }
  }

  function filterVersions() {
    const q       = (document.getElementById('search-input').value || '').toLowerCase();
    const majorId = document.getElementById('filter-major').value;
    const status  = document.getElementById('filter-status').value;
    const filtered = allVersions.filter(v => {
      if (q       && !(v.major_name||'').toLowerCase().includes(q) && !(v.college_name||'').toLowerCase().includes(q)) return false;
      if (majorId && String(v.major_id) !== majorId) return false;
      if (status  && v.status !== status) return false;
      return true;
    });
    renderVersionsGrid(filtered);
  }

  function renderVersionsGrid(list) {
    document.getElementById('count-label').textContent = `共 ${list.length} 个培养方案`;
    const grid = document.getElementById('versions-grid');
    if (!list.length) {
      grid.innerHTML = `
        <div class="col-span-3">
          <div class="card">
            <div class="empty-state">
              <div class="empty-state-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></svg>
              </div>
              <p class="empty-state-title">暂无培养方案</p>
              <p class="empty-state-desc">点击右上角「新建培养方案」创建第一个，或先在<a href="/pages/majors.html" style="color:var(--color-primary-600)">专业管理</a>中添加专业。</p>
              <button onclick="openCreateVersionModal()" class="btn btn-primary btn-sm mt-2">新建培养方案</button>
            </div>
          </div>
        </div>`;
      return;
    }
    grid.innerHTML = list.map(v => {
      const isActive = v.status === 'active';
      const initial  = (v.major_code || v.major_name || '?').slice(0, 2).toUpperCase();
      return `
      <div class="card card-hover" style="cursor:default">
        <div class="card-body">
          <div class="flex items-start justify-between mb-3">
            <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--color-primary-500),var(--color-primary-700));display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <span style="color:#fff;font-size:13px;font-weight:700">${initial}</span>
            </div>
            <span class="badge ${isActive ? 'badge-success' : 'badge-neutral'}">${isActive ? '有效' : '草稿'}</span>
          </div>
          <h3 style="font-size:15px;font-weight:700;color:var(--color-neutral-900);margin-bottom:2px">${v.major_name}</h3>
          <div class="flex items-center gap-2 mb-3">
            <span style="font-size:12px;color:var(--color-neutral-400)">${v.college_name}</span>
            <span style="width:3px;height:3px;border-radius:50%;background:var(--color-neutral-300)"></span>
            <span style="font-size:12px;color:var(--color-neutral-500);font-weight:600">${v.grade_year}级</span>
            <span style="width:3px;height:3px;border-radius:50%;background:var(--color-neutral-300)"></span>
            <span style="font-size:12px;color:var(--color-neutral-400);font-family:monospace">${v.version}</span>
          </div>
          <div class="grid grid-cols-4 gap-1 mb-3 text-center">
            ${[
              { val: v.obj_count,       label: '培养目标', color: 'var(--color-primary-600)', bg: 'var(--color-primary-50)' },
              { val: v.gr_count,        label: '毕业要求', color: '#7c3aed', bg: '#f5f3ff' },
              { val: v.indicator_count, label: '指标点',   color: '#0891b2', bg: '#ecfeff' },
              { val: v.course_count,    label: '课程',     color: '#059669', bg: '#ecfdf5' },
            ].map(s => `
              <div style="padding:6px 4px;border-radius:8px;background:${s.bg}">
                <div style="font-size:16px;font-weight:700;color:${s.color}">${s.val}</div>
                <div style="font-size:10px;color:var(--color-neutral-500)">${s.label}</div>
              </div>
            `).join('')}
          </div>
          <div class="flex items-center gap-2 pt-3" style="border-top:1px solid var(--color-border-subtle)">
            <button onclick="openDetail(${v.id})" class="btn btn-primary btn-sm" style="flex:1">进入方案</button>
            <button onclick="openEditVersionModal(${JSON.stringify(v).replace(/"/g,'&quot;')})" class="btn btn-ghost btn-sm btn-icon" aria-label="编辑">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button onclick="deleteVersion(${v.id},'${(v.major_name||'').replace(/'/g,"\\'")} ${v.grade_year}级')" class="btn btn-ghost btn-sm btn-icon" style="color:var(--color-error)" aria-label="删除">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            </button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  function showList() {
    document.getElementById('header-list').classList.remove('hidden');
    document.getElementById('header-detail').classList.add('hidden');
    document.getElementById('view-list').classList.remove('hidden');
    document.getElementById('view-list').classList.add('page-enter');
    document.getElementById('view-detail').classList.add('hidden');
    currentVersionId = null; currentVersionData = null;
    objGrRelations = null; sicRelations = null;
    matrixLoaded = { 'obj-gr': false, 'matrix': false, 'courses': false };
    cvCourses = [];
    api.curriculum.allVersions().then(d => { allVersions = d; filterVersions(); }).catch(() => {});
  }

  /* ═══════════════════════════════════════════════════════
     版本 CRUD
  ════════════════════════════════════════════════════════ */

  function versionFormFields(d = {}, majors = []) {
    return [
      { name:'major_id',   label:'所属专业',  required:true, type:'select',
        options: majors.map(m => ({ value: m.id, label: m.name })), default: d.major_id || '' },
      { name:'grade_year', label:'届次（入学年份）', type:'number', required:true,
        placeholder:'如 2023', default: d.grade_year || new Date().getFullYear() },
      { name:'version',    label:'版本号', required:true, placeholder:'如 v1.0 或 2021版', default: d.version || 'v1.0' },
      { name:'status',     label:'状态', type:'select',
        options:[{value:'draft',label:'草稿'},{value:'active',label:'有效'}], default: d.status || 'draft' },
    ];
  }

  function openCreateVersionModal() {
    modal.form({
      title: '新建培养方案', submitText: '创建',
      fields: versionFormFields({}, allMajors),
      onSubmit: async (data, close) => {
        try {
          await api.curriculum.createVersion({ ...data, major_id: Number(data.major_id), grade_year: Number(data.grade_year) });
          close(); toast.success('培养方案已创建');
          allVersions = await api.curriculum.allVersions(); filterVersions();
        } catch(e) { toast.error(e.message); }
      }
    });
  }

  function openEditVersionModal(v) {
    modal.form({
      title: '编辑培养方案', submitText: '保存',
      fields: [
        { name:'grade_year', label:'届次（入学年份）', type:'number', required:true, default: v.grade_year },
        { name:'version',    label:'版本号', required:true, default: v.version },
        { name:'status',     label:'状态', type:'select',
          options:[{value:'draft',label:'草稿'},{value:'active',label:'有效'}], default: v.status },
      ],
      onSubmit: async (data, close) => {
        try {
          await api.curriculum.updateVersion(v.id, { ...data, grade_year: Number(data.grade_year) });
          close(); toast.success('已保存');
          allVersions = await api.curriculum.allVersions(); filterVersions();
        } catch(e) { toast.error(e.message); }
      }
    });
  }

  async function deleteVersion(id, label) {
    const ok = await modal.confirm(
      `确定要删除 <strong>${label}</strong> 培养方案吗？<br><br>该方案下的所有培养目标、毕业要求、指标点将一并删除，且不可恢复。`,
      { title: '删除培养方案', danger: true }
    );
    if (!ok) return;
    try {
      await api.curriculum.deleteVersion(id); toast.success('已删除');
      allVersions = await api.curriculum.allVersions(); filterVersions();
    } catch(e) { toast.error(e.message); }
  }

  /* ═══════════════════════════════════════════════════════
     进入详情 & 标签切换
  ════════════════════════════════════════════════════════ */

  async function openDetail(vId) {
    try {
      currentVersionId = vId;
      matrixLoaded = { 'obj-gr': false, 'matrix': false, 'courses': false };
      objGrRelations = null; sicRelations = null; cvCourses = [];
      await loadCurriculum(vId);
      document.getElementById('header-list').classList.add('hidden');
      document.getElementById('header-detail').classList.remove('hidden');
      document.getElementById('view-list').classList.add('hidden');
      document.getElementById('view-detail').classList.remove('hidden');
      switchTab('objectives');
    } catch(e) { toast.error('加载失败：' + e.message); }
  }

  function switchTab(tab) {
    activeTab = tab;
    ['objectives','gr','grs','obj-gr','courses','matrix'].forEach(t => {
      document.getElementById('tab-' + t).classList.toggle('hidden', t !== tab);
      document.getElementById('tab-btn-' + t).classList.toggle('active', t === tab);
    });
    if (tab === 'obj-gr'  && !matrixLoaded['obj-gr'])   loadObjGrMatrix();
    if (tab === 'matrix'  && !matrixLoaded['matrix'])    loadSicMatrix();
    if (tab === 'courses' && !matrixLoaded['courses'])   loadCvCourses();
  }

  async function loadCurriculum(vId) {
    const data = await api.curriculum.getVersion(vId);
    currentVersionData = data;

    const versionMeta = allVersions.find(v => v.id === vId) || {};
    const isActive = data.status === 'active';
    document.getElementById('detail-title').textContent    = (versionMeta.major_name || '') + ' 培养方案';
    document.getElementById('detail-subtitle').textContent = (versionMeta.college_name || '') + ' · ' + data.grade_year + '级';
    document.getElementById('detail-version-badge').textContent = data.version;
    document.getElementById('detail-status-badge').textContent  = isActive ? '有效' : '草稿';
    document.getElementById('detail-status-badge').className    = 'badge ' + (isActive ? 'badge-success' : 'badge-neutral');
    document.getElementById('btn-toggle-status').textContent    = isActive ? '设为草稿' : '设为有效';

    renderStats(data);
    renderObjectives(data.objectives || []);
    renderGROnly(data.graduationRequirements || []);
    renderGR(data.graduationRequirements || []);

    // 若对应标签当前可见则刷新
    if (activeTab === 'obj-gr')  { matrixLoaded['obj-gr']  = false; loadObjGrMatrix(); }
    if (activeTab === 'matrix')  { matrixLoaded['matrix']  = false; loadSicMatrix(); }
    if (activeTab === 'courses') { matrixLoaded['courses'] = false; loadCvCourses(); }
  }

  function renderStats(data) {
    const grs        = data.graduationRequirements || [];
    const indicators = grs.flatMap(g => g.indicators || []);
    document.getElementById('stats-bar').innerHTML = [
      { label:'培养目标', value:(data.objectives||[]).length, color:'var(--color-primary-600)', bg:'var(--color-primary-50)' },
      { label:'毕业要求', value:grs.length,                   color:'#7c3aed', bg:'#f5f3ff' },
      { label:'指标点数', value:indicators.length,            color:'#0891b2', bg:'#ecfeff' },
      { label:'课程数量', value:(data.courses||[]).length,    color:'#059669', bg:'#ecfdf5' },
    ].map(s => `
      <div class="stat-card" style="padding:12px 16px">
        <div class="stat-value" style="font-size:1.4rem;color:${s.color}">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    `).join('');
  }

  /* ═══════════════════════════════════════════════════════
     Tab 1: 培养目标
  ════════════════════════════════════════════════════════ */

  function renderObjectives(objectives) {
    const el = document.getElementById('objectives-list');
    if (!objectives.length) {
      el.innerHTML = `<p style="font-size:13px;color:var(--color-neutral-400);text-align:center;padding:20px 0">暂无培养目标，点击右上角「添加目标」</p>`;
      return;
    }
    el.innerHTML = objectives.map(o => `
      <div class="flex items-start gap-3 px-4 py-3 rounded-xl" style="background:var(--color-neutral-50);border:1px solid var(--color-border-subtle)">
        <span style="flex-shrink:0;width:32px;height:32px;border-radius:8px;background:var(--color-primary-100);color:var(--color-primary-700);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:1px">${o.code}</span>
        <p style="flex:1;font-size:13px;color:var(--color-neutral-700);line-height:1.7">${o.description}</p>
        <div class="flex items-center gap-1 flex-shrink-0">
          <button onclick="editObjective(${JSON.stringify(o).replace(/"/g,'&quot;')})" class="btn btn-ghost btn-sm btn-icon" aria-label="编辑">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button onclick="deleteObjective(${o.id},'${(o.code||'').replace(/'/g,"\\'")}', event)" class="btn btn-ghost btn-sm btn-icon" style="color:var(--color-error)" aria-label="删除">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  function addObjective() {
    if (!currentVersionId) { toast.warning('请先进入培养方案'); return; }
    const objs = currentVersionData?.objectives || [];
    const nextNum = objs.length + 1;
    modal.form({ title:'添加培养目标', submitText:'添加',
      fields:[
        { name:'code',        label:'编号', required:true, default:`TO${nextNum}`, hint:'建议使用 TO1、TO2 格式' },
        { name:'description', label:'目标描述', type:'textarea', required:true, placeholder:'描述该培养目标期望学生毕业后能够达到的目标' },
        { name:'sort_order',  label:'排序', type:'number', default: nextNum },
      ],
      onSubmit: async (data, close) => {
        try {
          await fetch(`/api/curriculum/versions/${currentVersionId}/objectives`, {
            method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)
          });
          close(); toast.success('培养目标已添加'); await loadCurriculum(currentVersionId);
        } catch(e) { toast.error(e.message); }
      }
    });
  }

  function editObjective(obj) {
    modal.form({ title:`编辑培养目标 ${obj.code}`, submitText:'保存',
      fields:[
        { name:'code',        label:'编号', required:true, default:obj.code },
        { name:'description', label:'目标描述', type:'textarea', required:true, default:obj.description },
        { name:'sort_order',  label:'排序', type:'number', default:obj.sort_order },
      ],
      onSubmit: async (data, close) => {
        try {
          await fetch(`/api/curriculum/objectives/${obj.id}`, {
            method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)
          });
          close(); toast.success('已保存'); await loadCurriculum(currentVersionId);
        } catch(e) { toast.error(e.message); }
      }
    });
  }

  async function deleteObjective(id, code, e) {
    e && e.stopPropagation();
    const ok = await modal.confirm(`确定删除培养目标 <strong>${code}</strong>？`, { title:'删除培养目标', danger:true });
    if (!ok) return;
    try {
      await api.curriculum.deleteObjective(id); toast.success('已删除'); await loadCurriculum(currentVersionId);
    } catch(e) { toast.error(e.message); }
  }

  /* ═══════════════════════════════════════════════════════
     Tab 2: 毕业要求（仅 GR 列表，无指标点展开）
  ════════════════════════════════════════════════════════ */

  function renderGROnly(grs) {
    const el = document.getElementById('gr-only-list');
    const badge = document.getElementById('gr-only-health');
    if (!grs.length) {
      el.innerHTML = `<p style="font-size:13px;color:var(--color-neutral-400);text-align:center;padding:20px 0">暂无毕业要求，点击右上角「添加毕业要求」</p>`;
      badge.textContent = '';
      badge.className = 'badge badge-neutral';
      return;
    }
    badge.textContent = `共 ${grs.length} 条`;
    badge.className = 'badge badge-primary';
    el.innerHTML = grs.map(gr => `
      <div class="flex items-start gap-3 px-4 py-3 rounded-xl" style="background:var(--color-neutral-50);border:1px solid var(--color-border-subtle)">
        <span style="flex-shrink:0;padding:2px 10px;border-radius:6px;background:var(--color-primary-600);color:#fff;font-size:11px;font-weight:700;margin-top:2px">${gr.code}</span>
        <p style="flex:1;font-size:13px;color:var(--color-neutral-700);line-height:1.7">${gr.description}</p>
        <div class="flex items-center gap-1 flex-shrink-0">
          <button onclick="editGR(${JSON.stringify(gr).replace(/"/g,'&quot;')})" class="btn btn-ghost btn-sm btn-icon" aria-label="编辑毕业要求">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button onclick="deleteGR(${gr.id},'${(gr.code||'').replace(/'/g,"\\'")}', event)" class="btn btn-ghost btn-sm btn-icon" style="color:var(--color-error)" aria-label="删除毕业要求">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  /* ═══════════════════════════════════════════════════════
     Tab 3: 毕业指标点（GR 分组展开指标点）
  ════════════════════════════════════════════════════════ */

  function renderGR(grs) {
    const el = document.getElementById('gr-list');
    if (!grs.length) {
      el.innerHTML = `<div class="empty-state" style="padding:32px 24px"><div class="empty-state-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><p class="empty-state-title">暂无毕业要求</p><p class="empty-state-desc">点击右上角「添加毕业要求」开始配置</p></div>`;
      document.getElementById('gr-health').textContent = '';
      return;
    }
    const total = grs.reduce((s, g) => s + (g.indicators||[]).length, 0);
    document.getElementById('gr-health').textContent = `${grs.length} 条要求 · ${total} 个指标点`;
    document.getElementById('gr-health').className   = 'badge badge-primary';

    el.innerHTML = grs.map(gr => `
      <div>
        <div class="flex items-start gap-3 px-5 py-3" style="background:var(--color-primary-50)">
          <span style="flex-shrink:0;padding:2px 8px;border-radius:6px;background:var(--color-primary-600);color:#fff;font-size:11px;font-weight:700;margin-top:2px">${gr.code}</span>
          <p style="flex:1;font-size:13px;font-weight:600;color:var(--color-primary-900);line-height:1.6">${gr.description}</p>
          <div class="flex items-center gap-1 flex-shrink-0">
            <button onclick="addIndicator(${gr.id},'${gr.code}')" class="btn btn-secondary btn-sm" style="min-height:30px">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              指标点
            </button>
            <button onclick="editGR(${JSON.stringify(gr).replace(/"/g,'&quot;')})" class="btn btn-ghost btn-sm btn-icon" aria-label="编辑毕业要求">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button onclick="deleteGR(${gr.id},'${(gr.code||'').replace(/'/g,"\\'")}', event)" class="btn btn-ghost btn-sm btn-icon" style="color:var(--color-error)" aria-label="删除毕业要求">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div>
        </div>
        ${(gr.indicators||[]).map(ind => `
          <div class="flex items-start gap-3 px-5 py-2.5 hover:bg-gray-50" style="border-bottom:1px solid var(--color-border-subtle)">
            <span style="flex-shrink:0;font-size:11px;color:var(--color-primary-500);font-weight:700;font-family:monospace;padding-top:2px;width:52px">${ind.code}</span>
            <p style="flex:1;font-size:13px;color:var(--color-neutral-600);line-height:1.6">${ind.description}</p>
            <div class="flex items-center gap-2 flex-shrink-0">
              <div style="text-align:right">
                <div style="font-size:10px;color:var(--color-neutral-400)">权重</div>
                <div style="font-size:13px;font-weight:600;color:var(--color-neutral-700)">${ind.weight}</div>
              </div>
              <button onclick="editIndicator(${JSON.stringify(ind).replace(/"/g,'&quot;')})" class="btn btn-ghost btn-sm btn-icon" aria-label="编辑指标点">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button onclick="deleteIndicator(${ind.id},'${(ind.code||'').replace(/'/g,"\\'")}', event)" class="btn btn-ghost btn-sm btn-icon" style="color:var(--color-error)" aria-label="删除指标点">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              </button>
            </div>
          </div>
        `).join('')}
        ${!(gr.indicators||[]).length ? `<div style="padding:10px 20px 10px 73px;font-size:12px;color:var(--color-neutral-400)">暂无指标点，点击右侧「+ 指标点」添加</div>` : ''}
      </div>
    `).join('');
  }

  function addGR() {
    if (!currentVersionId) { toast.warning('请先进入培养方案'); return; }
    const grs = currentVersionData?.graduationRequirements || [];
    const nextNum = grs.length + 1;
    modal.form({ title:'添加毕业要求', submitText:'添加',
      fields:[
        { name:'code',        label:'编号', required:true, default:`GR${nextNum}`, hint:'建议使用 GR1、GR2 或 1、2 格式' },
        { name:'description', label:'要求描述', type:'textarea', required:true, placeholder:'该毕业要求的完整描述' },
        { name:'sort_order',  label:'排序', type:'number', default: nextNum },
      ],
      onSubmit: async (data, close) => {
        try { await api.curriculum.createGR(currentVersionId, data); close(); toast.success('毕业要求已添加'); await loadCurriculum(currentVersionId); }
        catch(e) { toast.error(e.message); }
      }
    });
  }

  function editGR(gr) {
    modal.form({ title:`编辑毕业要求 ${gr.code}`, submitText:'保存',
      fields:[
        { name:'code',        label:'编号', required:true, default:gr.code },
        { name:'description', label:'要求描述', type:'textarea', required:true, default:gr.description },
        { name:'sort_order',  label:'排序', type:'number', default:gr.sort_order },
      ],
      onSubmit: async (data, close) => {
        try {
          await fetch(`/api/curriculum/gr/${gr.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
          close(); toast.success('已保存'); await loadCurriculum(currentVersionId);
        } catch(e) { toast.error(e.message); }
      }
    });
  }

  async function deleteGR(id, code, e) {
    e && e.stopPropagation();
    const ok = await modal.confirm(`确定删除毕业要求 <strong>${code}</strong>？<br>其下所有指标点也将一并删除。`, { title:'删除毕业要求', danger:true });
    if (!ok) return;
    try {
      await api.curriculum.deleteGR(id); toast.success('已删除'); await loadCurriculum(currentVersionId);
    } catch(e) { toast.error(e.message); }
  }

  function addIndicator(grId, grCode) {
    modal.form({ title:`添加指标点 — ${grCode}`, submitText:'添加',
      fields:[
        { name:'code',        label:'指标点编号', required:true, placeholder:`${grCode}.1` },
        { name:'description', label:'描述', type:'textarea', required:true },
        { name:'weight',      label:'权重 (0~1)', type:'number', required:true, default:0.5, hint:'同一毕业要求下各指标点权重之和建议为 1.0' },
        { name:'threshold',   label:'达成阈值', type:'number', default:0.60, hint:'建议 0.60（60%）' },
      ],
      onSubmit: async (data, close) => {
        try { await api.curriculum.createIndicator(grId, data); close(); toast.success('指标点已添加'); await loadCurriculum(currentVersionId); }
        catch(e) { toast.error(e.message); }
      }
    });
  }

  function editIndicator(ind) {
    modal.form({ title:`编辑指标点 ${ind.code}`, submitText:'保存',
      fields:[
        { name:'code',        label:'编号', required:true, default:ind.code },
        { name:'description', label:'描述', type:'textarea', required:true, default:ind.description },
        { name:'weight',      label:'权重', type:'number', required:true, default:ind.weight },
        { name:'threshold',   label:'达成阈值', type:'number', default:ind.threshold },
      ],
      onSubmit: async (data, close) => {
        try { await api.curriculum.updateIndicator(ind.id, data); close(); toast.success('保存成功'); await loadCurriculum(currentVersionId); }
        catch(e) { toast.error(e.message); }
      }
    });
  }

  async function deleteIndicator(id, code, e) {
    e && e.stopPropagation();
    const ok = await modal.confirm(`确定删除指标点 <strong>${code}</strong>？`, { title:'删除指标点', danger:true });
    if (!ok) return;
    try {
      await api.curriculum.deleteIndicator(id); toast.success('已删除'); await loadCurriculum(currentVersionId);
    } catch(e) { toast.error(e.message); }
  }

  /* ═══════════════════════════════════════════════════════
     Tab 3: 毕业要求 ↔ 毕业指标点 权重矩阵
  ════════════════════════════════════════════════════════ */

  async function loadObjGrMatrix() {
    const wrap = document.getElementById('obj-gr-matrix-wrap');
    if (!currentVersionData) return;

    const grs = currentVersionData.graduationRequirements || [];
    const allIndicators = grs.flatMap(g => g.indicators || []);

    if (!grs.length || !allIndicators.length) {
      wrap.innerHTML = `<div class="empty-state" style="padding:32px 0">
        <div class="empty-state-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg></div>
        <p class="empty-state-title">请先在「毕业指标点」标签页中录入毕业要求及其指标点</p>
        <p class="empty-state-desc">毕业要求：${grs.length} 条 &nbsp;|&nbsp; 指标点：${allIndicators.length} 个</p>
      </div>`;
      matrixLoaded['obj-gr'] = true;
      return;
    }

    renderObjGrMatrix(grs);
    matrixLoaded['obj-gr'] = true;
  }

  function renderObjGrMatrix(grs) {
    const wrap = document.getElementById('obj-gr-matrix-wrap');

    // 扁平化所有指标点（列头）
    const allIndicators = grs.flatMap(g =>
      (g.indicators || []).map(ind => ({ ...ind, grId: g.id, grCode: g.code }))
    );

    // 列头：两行 —— 第一行按GR分组，第二行列出指标点编号（竖排）
    let grGroupRow = `<th rowspan="2" style="min-width:240px;padding-bottom:8px;text-align:left;vertical-align:bottom;font-size:12px;color:var(--color-neutral-500)">毕业要求 \\ 指标点</th>`;
    let indColRow  = '';

    grs.forEach(gr => {
      const inds = gr.indicators || [];
      if (!inds.length) return;
      grGroupRow += `<th colspan="${inds.length}" style="text-align:center;font-size:11px;font-weight:700;color:var(--color-primary-700);background:var(--color-primary-50) !important;border-radius:4px;padding:3px 4px !important">${gr.code}</th>`;
      inds.forEach(ind => {
        indColRow += `<th class="vtxt" title="${ind.description}" style="min-width:48px">
          <span style="font-size:10px;font-weight:700;color:var(--color-neutral-600)">${ind.code}</span>
        </th>`;
      });
    });

    // 行：每条毕业要求一行，列出其各指标点的权重
    const bodyRows = grs.map(gr => {
      const inds = gr.indicators || [];
      const weightSum = inds.reduce((s, ind) => s + (Number(ind.weight) || 0), 0);
      const isOk = Math.abs(weightSum - 1) < 0.01;

      const cells = allIndicators.map(ind => {
        if (ind.grId === gr.id) {
          const w = Number(ind.weight) || 0;
          const alpha = Math.min(1, w / 0.5);
          const bg = `rgba(37,99,235,${(alpha * 0.75 + 0.12).toFixed(2)})`;
          const fg = alpha > 0.5 ? '#fff' : 'var(--color-primary-700)';
          return `<td style="padding:3px;text-align:center">
            <div style="width:44px;height:36px;border-radius:6px;background:${bg};color:${fg};font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:auto" title="${ind.code} 权重：${w}">
              ${w > 0 ? w.toFixed(2).replace(/\.?0+$/, '') : '—'}
            </div>
          </td>`;
        }
        return `<td style="padding:3px;text-align:center">
          <div style="width:44px;height:36px;border-radius:6px;background:var(--color-neutral-50);display:flex;align-items:center;justify-content:center;margin:auto;color:var(--color-neutral-200);font-size:13px">·</div>
        </td>`;
      }).join('');

      return `<tr>
        <th style="padding:6px 16px 6px 0;border-bottom:1px solid var(--color-border-subtle)">
          <div style="display:flex;align-items:flex-start;gap:8px">
            <span style="flex-shrink:0;padding:1px 6px;border-radius:4px;background:var(--color-primary-600);color:#fff;font-size:10px;font-weight:700;font-family:monospace;white-space:nowrap">${gr.code}</span>
            <span style="font-size:12px;color:var(--color-neutral-600);line-height:1.5;max-width:160px">${gr.description}</span>
            <span style="flex-shrink:0;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;background:${isOk ? '#f0fdf4' : '#fffbeb'};color:${isOk ? '#15803d' : '#b45309'};border:1px solid ${isOk ? '#bbf7d0' : '#fde68a'}" title="权重合计">∑${weightSum.toFixed(2)}</span>
          </div>
        </th>
        ${cells}
      </tr>`;
    }).join('');

    wrap.innerHTML = `
      <div class="matrix-outer">
        <table class="matrix-tbl">
          <thead>
            <tr>${grGroupRow}</tr>
            <tr>${indColRow}</tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
      <div style="display:flex;align-items:center;gap:16px;margin-top:12px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--color-neutral-400)">
          <span style="display:inline-block;width:32px;height:16px;border-radius:3px;background:rgba(37,99,235,0.87)"></span>高权重（≥ 0.5）
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--color-neutral-400)">
          <span style="display:inline-block;width:32px;height:16px;border-radius:3px;background:rgba(37,99,235,0.30)"></span>低权重（< 0.5）
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--color-neutral-400)">
          <span style="display:inline-block;width:32px;height:16px;border-radius:3px;background:#f0fdf4;border:1px solid #bbf7d0"></span>∑ = 1.00 权重达标
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--color-neutral-400)">
          <span style="display:inline-block;width:32px;height:16px;border-radius:3px;background:#fffbeb;border:1px solid #fde68a"></span>∑ ≠ 1.00 权重未达标
        </div>
      </div>
    `;
  }

  /* ═══════════════════════════════════════════════════════
     Tab 4: 课程管理
  ════════════════════════════════════════════════════════ */

  const cvNatureMap   = { required:'必修', elective:'选修', practice:'实践' };
  const cvNatureBadge = { required:'badge-primary', elective:'badge-neutral', practice:'badge-success' };

  async function loadCvCourses() {
    if (!currentVersionId) return;
    try {
      cvCourses = await api.courses.list(currentVersionId);
      renderCvSemesterBar();
      renderCvTable(cvCourses);
      matrixLoaded['courses'] = true;
    } catch(e) { toast.error('加载课程失败：' + e.message); }
  }

  function renderCvSemesterBar() {
    const bar = document.getElementById('cv-semester-bar');
    const sems = [...new Set(cvCourses.map(c => c.semester).filter(Boolean))].sort((a,b) => a-b);
    bar.innerHTML = `<span style="font-size:11px;color:var(--color-neutral-400);margin-right:4px">学期：</span>
      <button class="tab-item active" onclick="cvFilterSemester(null,this)">全部</button>
      ${sems.map(s => `<button class="tab-item" onclick="cvFilterSemester(${s},this)">第${s}学期</button>`).join('')}`;
    bar.classList.remove('hidden');
  }

  function cvFilterSemester(sem, btn) {
    document.querySelectorAll('#cv-semester-bar .tab-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCvTable(sem === null ? cvCourses : cvCourses.filter(c => c.semester == sem));
  }

  function renderCvTable(courses) {
    const pills = document.getElementById('cv-summary-pills');
    if (courses.length) {
      pills.classList.remove('hidden');
      document.getElementById('cv-sum-count').textContent   = `${courses.length} 门课程`;
      document.getElementById('cv-sum-credits').textContent = `${courses.reduce((s,c)=>s+(+c.credits||0),0).toFixed(1)} 学分`;
      document.getElementById('cv-sum-hours').textContent   = `${courses.reduce((s,c)=>s+(+c.total_hours||0),0)} 学时`;
      document.getElementById('cv-sum-core').textContent    = `${courses.filter(c=>c.is_core).length} 门核心课`;
    } else {
      pills.classList.add('hidden');
    }
    const tbody = document.getElementById('cv-courses-tbody');
    if (!courses.length) {
      tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state" style="padding:32px 0">
        <div class="empty-state-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg></div>
        <p class="empty-state-title">暂无课程</p><p class="empty-state-desc">点击右上角「添加课程」开始配置</p>
      </div></td></tr>`;
      return;
    }
    tbody.innerHTML = courses.map(c => `
      <tr>
        <td><code style="font-size:12px;color:var(--color-neutral-500);background:var(--color-neutral-100);padding:2px 6px;border-radius:4px">${c.code}</code></td>
        <td>
          <div class="flex items-center gap-2">
            <span style="font-size:13px;font-weight:600;color:var(--color-neutral-800)">${c.name}</span>
            ${c.course_group ? `<span class="badge badge-neutral" style="font-size:10px">${c.course_group}</span>` : ''}
          </div>
        </td>
        <td class="text-center" style="font-size:13px;font-weight:600;font-variant-numeric:tabular-nums">${c.credits}</td>
        <td class="text-center" style="font-size:13px;color:var(--color-neutral-600);font-variant-numeric:tabular-nums">${c.total_hours}</td>
        <td class="text-center" style="font-size:12px;color:var(--color-neutral-400);font-variant-numeric:tabular-nums">${c.theory_hours} / ${c.practice_hours}</td>
        <td class="text-center"><span class="badge ${cvNatureBadge[c.nature]||'badge-neutral'}">${cvNatureMap[c.nature]||c.nature}</span></td>
        <td class="text-center" style="font-size:13px;color:var(--color-neutral-600)">第 ${c.semester} 学期</td>
        <td class="text-center">
          ${c.is_core
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="display:inline"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
          }
        </td>
        <td class="text-right">
          <div style="display:flex;justify-content:flex-end;gap:4px">
            <button onclick='cvEditCourse(${JSON.stringify(c).replace(/'/g,"&#39;")})' class="btn btn-ghost btn-sm btn-icon" aria-label="编辑">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button onclick="cvDeleteCourse(${c.id},'${c.name.replace(/'/g,"\\'")}')" class="btn btn-ghost btn-sm btn-icon" style="color:var(--color-error)" aria-label="删除">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  const cvCourseFields = (d = {}) => [
    { name:'code',           label:'课程编号', required:true, placeholder:'CS001',    default:d.code },
    { name:'name',           label:'课程名称', required:true, placeholder:'软件工程',  default:d.name },
    { name:'credits',        label:'学分',     type:'number', required:true,           default:d.credits||3 },
    { name:'total_hours',    label:'总学时',   type:'number', default:d.total_hours||54 },
    { name:'theory_hours',   label:'理论学时', type:'number', default:d.theory_hours||36 },
    { name:'practice_hours', label:'实践学时', type:'number', default:d.practice_hours||18 },
    { name:'nature',  label:'课程性质', type:'select',
      options:[{value:'required',label:'必修'},{value:'elective',label:'选修'},{value:'practice',label:'实践'}],
      default:d.nature||'required' },
    { name:'semester',     label:'开课学期', type:'number', default:d.semester||1 },
    { name:'is_core',      label:'核心课程', type:'select',
      options:[{value:'0',label:'否'},{value:'1',label:'是'}], default:d.is_core?'1':'0' },
    { name:'course_group', label:'课程组', placeholder:'如：专业核心课', default:d.course_group||'' },
  ];

  function cvAddCourse() {
    if (!currentVersionId) return;
    modal.form({ title:'添加课程', fields:cvCourseFields(), submitText:'添加课程', size:'lg',
      onSubmit: async (data, close) => {
        try {
          await api.courses.create({ ...data, version_id: currentVersionId });
          close(); toast.success('课程已添加');
          matrixLoaded['courses'] = false; loadCvCourses();
          // 同步 currentVersionData 里的课程（矩阵 tab 下次打开会重新加载）
          matrixLoaded['matrix'] = false;
        } catch(e) { toast.error(e.message); }
      }
    });
  }

  function cvEditCourse(c) {
    modal.form({ title:'编辑课程', fields:cvCourseFields(c), submitText:'保存更改', size:'lg',
      onSubmit: async (data, close) => {
        try {
          await api.courses.update(c.id, data);
          close(); toast.success('保存成功');
          matrixLoaded['courses'] = false; loadCvCourses();
          matrixLoaded['matrix'] = false;
        } catch(e) { toast.error(e.message); }
      }
    });
  }

  async function cvDeleteCourse(id, name) {
    const ok = await modal.confirm(`确定删除课程「<strong>${name}</strong>」？此操作不可恢复。`, { danger:true });
    if (!ok) return;
    try {
      await api.courses.remove(id);
      toast.success('删除成功');
      matrixLoaded['courses'] = false; loadCvCourses();
      matrixLoaded['matrix'] = false;
    } catch(e) { toast.error(e.message); }
  }

  /* ═══════════════════════════════════════════════════════
     Tab 5: 毕业要求实现矩阵（课程 × 指标点）
  ════════════════════════════════════════════════════════ */

  async function loadSicMatrix() {
    const wrap = document.getElementById('sic-matrix-wrap');
    if (!currentVersionData) return;

    const grs = currentVersionData.graduationRequirements || [];
    const allIndicators = grs.flatMap(g => (g.indicators||[]).map(ind => ({ ...ind, grCode: g.code })));
    const courses = (currentVersionData.courses || []).sort((a,b) => (a.semester||0)-(b.semester||0) || (a.name||'').localeCompare(b.name||''));

    if (!allIndicators.length || !courses.length) {
      wrap.innerHTML = `<div class="empty-state" style="padding:32px 0">
        <div class="empty-state-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
        <p class="empty-state-title">请先录入毕业要求（含指标点）与课程数据</p>
        <p class="empty-state-desc">指标点：${allIndicators.length} 个 &nbsp;|&nbsp; 课程：${courses.length} 门</p>
      </div>`;
      matrixLoaded['matrix'] = true;
      return;
    }

    try {
      const data = await api.curriculum.supportMatrix(currentVersionId);
      // 用 Map 存储权重，key = "indId_courseId"
      sicRelations = new Map(data.relations.map(r => [`${r.indicator_id}_${r.course_id}`, r.weight]));
      // 同步 HML 权重配置
      hmlWeight.H = data.hml_weight_h ?? 1.0;
      hmlWeight.M = data.hml_weight_m ?? 0.6;
      hmlWeight.L = data.hml_weight_l ?? 0.3;
      hmlCycle[1] = hmlWeight.H;
      hmlCycle[2] = hmlWeight.M;
      hmlCycle[3] = hmlWeight.L;
      // 同步数据库中保存的模式
      applySicModeUI(data.matrix_mode || 'check');
      renderSicMatrix(grs, allIndicators, courses);
      matrixLoaded['matrix'] = true;
    } catch(e) { toast.error('加载矩阵失败：' + e.message); }
  }

  function renderSicMatrix(grs, allIndicators, courses) {
    const wrap = document.getElementById('sic-matrix-wrap');

    // 列头：先按 GR 分组，再列出指标点（垂直文字）
    let grGroupRow = `<th rowspan="2" style="min-width:160px;padding-bottom:8px;text-align:left;vertical-align:bottom;font-size:12px;color:var(--color-neutral-500)">课程名称</th>`;
    let indRow = '';

    grs.forEach(gr => {
      const inds = gr.indicators || [];
      if (!inds.length) return;
      grGroupRow += `<th colspan="${inds.length}" class="gr-group-th">${gr.code}</th>`;
      inds.forEach(ind => {
        indRow += `<th class="vtxt" title="${ind.description}" style="min-width:38px">
          <span style="font-size:10px;font-weight:700;color:var(--color-neutral-600)">${ind.code}</span>
        </th>`;
      });
    });

    const bodyRows = courses.map(course => {
      const cells = allIndicators.map(ind => {
        const key    = `${ind.id}_${course.id}`;
        const weight = sicRelations.get(key);   // undefined = 无关联
        let cls, label;
        if (sicMode === 'hml') {
          if (weight === undefined) { cls = 'off'; label = ''; }
          else if (weight >= 0.9)  { cls = 'H';   label = 'H'; }
          else if (weight >= 0.5)  { cls = 'M';   label = 'M'; }
          else                     { cls = 'L';   label = 'L'; }
        } else {
          cls   = weight !== undefined ? 'on' : 'off';
          label = weight !== undefined ? '√'  : '';
        }
        return `<td style="padding:3px;text-align:center">
          <button class="mcell ${cls}"
            title="${course.name} ↔ ${ind.code}"
            onclick="toggleSic(${ind.id},${course.id},this)">
            ${label}
          </button>
        </td>`;
      }).join('');

      const semester = course.semester ? `第${course.semester}学期` : '';
      return `<tr>
        <th>
          <div style="display:flex;align-items:center;gap:6px">
            ${course.is_core ? `<span style="flex-shrink:0;width:4px;height:4px;border-radius:50%;background:var(--color-primary-500)"></span>` : '<span style="flex-shrink:0;width:4px"></span>'}
            <span style="font-size:12px;color:var(--color-neutral-800);line-height:1.4">${course.name}</span>
            ${semester ? `<span style="flex-shrink:0;font-size:10px;color:var(--color-neutral-400)">${semester}</span>` : ''}
          </div>
        </th>
        ${cells}
      </tr>`;
    }).join('');

    const legendCheck = `<p style="font-size:11px;color:var(--color-neutral-400);margin-top:12px">
      <span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:var(--color-primary-600);vertical-align:middle;margin-right:4px"></span>
      √ 表示该课程支撑对应指标点，点击切换 &nbsp;|&nbsp; 蓝色实心点表示核心课程
    </p>`;
    const legendHml = `<p style="font-size:11px;color:var(--color-neutral-400);margin-top:12px">
      点击单元格循环切换：<strong style="color:var(--color-neutral-600)">无 → H（高）→ M（中）→ L（低）→ 无</strong> &nbsp;|&nbsp; 蓝色实心点表示核心课程
    </p>`;

    wrap.innerHTML = `
      <div class="matrix-outer">
        <table class="matrix-tbl">
          <thead>
            <tr>${grGroupRow}</tr>
            <tr>${indRow}</tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
      ${sicMode === 'hml' ? legendHml : legendCheck}
    `;
  }

  // 仅更新 UI，不触发 API
  function applySicModeUI(mode) {
    sicMode = mode;
    const btnCheck = document.getElementById('sic-mode-btn-check');
    const btnHml   = document.getElementById('sic-mode-btn-hml');
    const legend   = document.getElementById('sic-hml-legend');
    if (btnCheck) btnCheck.classList.toggle('active', mode === 'check');
    if (btnHml)   btnHml.classList.toggle('active',   mode === 'hml');
    if (legend)   legend.style.display = mode === 'hml' ? 'flex' : 'none';
    if (mode === 'hml') updateHmlBadges();
  }

  // 切换模式：更新 UI + 持久化到 DB + 重渲染
  async function switchSicMode(mode) {
    if (!currentVersionId) return;
    applySicModeUI(mode);
    if (sicRelations) {
      // 重新渲染（需要拿到 grs/indicators/courses，直接从 currentVersionData 取）
      const grs = currentVersionData.graduationRequirements || [];
      const allIndicators = grs.flatMap(g => (g.indicators||[]).map(ind => ({ ...ind, grCode: g.code })));
      const courses = (currentVersionData.courses || []).sort((a,b) => (a.semester||0)-(b.semester||0) || (a.name||'').localeCompare(b.name||''));
      renderSicMatrix(grs, allIndicators, courses);
    }
    try {
      await api.curriculum.updateVersion(currentVersionId, { matrix_mode: mode });
    } catch(e) { toast.error('模式保存失败：' + e.message); }
  }

  let hmlCycle  = [undefined, 1.0, 0.6, 0.3]; // undefined = 无关联
  let hmlWeight = { H: 1.0, M: 0.6, L: 0.3 };

  function updateHmlBadges() {
    const bh = document.getElementById('hml-badge-h');
    const bm = document.getElementById('hml-badge-m');
    const bl = document.getElementById('hml-badge-l');
    if (bh) bh.textContent = `H=${hmlWeight.H}`;
    if (bm) bm.textContent = `M=${hmlWeight.M}`;
    if (bl) bl.textContent = `L=${hmlWeight.L}`;
  }

  function openHmlWeightSettings() {
    modal.form({
      title: 'HML 权重配置',
      fields: [
        { name:'h', label:'H（高）权重', type:'number', required:true, default: hmlWeight.H, placeholder:'0.0 ~ 1.0' },
        { name:'m', label:'M（中）权重', type:'number', required:true, default: hmlWeight.M, placeholder:'0.0 ~ 1.0' },
        { name:'l', label:'L（低）权重', type:'number', required:true, default: hmlWeight.L, placeholder:'0.0 ~ 1.0' },
      ],
      submitText: '保存',
      onSubmit: async (data, close) => {
        const h = parseFloat(data.h), m = parseFloat(data.m), l = parseFloat(data.l);
        if ([h,m,l].some(v => isNaN(v) || v < 0 || v > 1)) {
          toast.warning('权重值须在 0 ~ 1 之间'); return;
        }
        hmlWeight.H = h; hmlWeight.M = m; hmlWeight.L = l;
        hmlCycle[1] = h; hmlCycle[2] = m; hmlCycle[3] = l;
        updateHmlBadges();
        close();
        // 持久化到 DB
        try {
          await api.curriculum.updateVersion(currentVersionId, { hml_weight_h: h, hml_weight_m: m, hml_weight_l: l });
          toast.success('HML 权重已保存');
        } catch(e) { toast.error('保存失败：' + e.message); }
      }
    });
  }

  async function toggleSic(indId, courseId, btn) {
    const key = `${indId}_${courseId}`;
    if (sicMode === 'hml') {
      await toggleSicHml(indId, courseId, btn, key);
    } else {
      await toggleSicCheck(indId, courseId, btn, key);
    }
  }

  async function toggleSicCheck(indId, courseId, btn, key) {
    const isOn = sicRelations.has(key);
    const prevCls = btn.className; const prevTxt = btn.textContent;
    try {
      if (isOn) {
        btn.className = 'mcell off'; btn.textContent = '';
        await api.curriculum.removeSupport({ indicator_id: indId, course_id: courseId });
        sicRelations.delete(key);
      } else {
        btn.className = 'mcell on'; btn.textContent = '√';
        await api.curriculum.saveSupport({ indicator_id: indId, course_id: courseId, weight: 1.0 });
        sicRelations.set(key, 1.0);
      }
    } catch(e) {
      toast.error('保存失败：' + e.message);
      btn.className = prevCls; btn.textContent = prevTxt;
    }
  }

  async function toggleSicHml(indId, courseId, btn, key) {
    const curWeight = sicRelations.get(key); // undefined | 1.0 | 0.6 | 0.3
    const idx  = hmlCycle.indexOf(curWeight);
    const next = hmlCycle[(idx + 1) % hmlCycle.length];
    const prevCls = btn.className; const prevTxt = btn.textContent;

    let nextCls, nextLabel;
    if (next === undefined)     { nextCls = 'off'; nextLabel = ''; }
    else if (next >= 0.9)       { nextCls = 'H';   nextLabel = 'H'; }
    else if (next >= 0.5)       { nextCls = 'M';   nextLabel = 'M'; }
    else                        { nextCls = 'L';   nextLabel = 'L'; }

    btn.className = `mcell ${nextCls}`; btn.textContent = nextLabel;

    try {
      if (next === undefined) {
        await api.curriculum.removeSupport({ indicator_id: indId, course_id: courseId });
        sicRelations.delete(key);
      } else {
        await api.curriculum.saveSupport({ indicator_id: indId, course_id: courseId, weight: next });
        sicRelations.set(key, next);
      }
    } catch(e) {
      toast.error('保存失败：' + e.message);
      btn.className = prevCls; btn.textContent = prevTxt;
    }
  }

  /* ═══════════════════════════════════════════════════════
     版本状态 & 修订版
  ════════════════════════════════════════════════════════ */

  async function toggleVersionStatus() {
    if (!currentVersionId || !currentVersionData) return;
    const newStatus = currentVersionData.status === 'active' ? 'draft' : 'active';
    try {
      await api.curriculum.updateVersion(currentVersionId, { status: newStatus });
      toast.success(newStatus === 'active' ? '已设为有效' : '已设为草稿');
      await loadCurriculum(currentVersionId);
      allVersions = await api.curriculum.allVersions();
    } catch(e) { toast.error(e.message); }
  }

  function openCreateRevisionModal() {
    if (!currentVersionData) return;
    modal.form({
      title: '新建修订版', submitText: '创建',
      fields: [
        { name:'grade_year', label:'届次（入学年份）', type:'number', required:true, default: currentVersionData.grade_year, hint:'将复制当前方案全部内容' },
        { name:'version',    label:'版本号', required:true, default: bumpVersion(currentVersionData.version), hint:'新版本标识，建议递增' },
        { name:'status',     label:'状态', type:'select',
          options:[{value:'draft',label:'草稿'},{value:'active',label:'有效'}], default: 'draft' },
      ],
      onSubmit: async (data, close) => {
        try {
          const newVer = await api.curriculum.cloneVersion(currentVersionId, {
            grade_year: Number(data.grade_year), version: data.version, status: data.status,
          });
          close(); toast.success('已复制为新版本，即将跳转');
          allVersions = await api.curriculum.allVersions();
          setTimeout(() => openDetail(newVer.id), 800);
        } catch(e) { toast.error(e.message); }
      }
    });
  }

  function bumpVersion(v) {
    if (!v) return 'v1.1';
    const m = v.match(/(\d+)$/);
    if (!m) return v + '.1';
    return v.slice(0, m.index) + (Number(m[1]) + 1);
  }

  init();