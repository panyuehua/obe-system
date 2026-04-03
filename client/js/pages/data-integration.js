/**
 * 数据接入 — data-integration.html
 */
nav.render('data-integration');

  // ── 状态 ──────────────────────────────────────────────────────
  const PAGE_SIZE   = 20;
  let   currentPage = 1;

  const SOURCE_LABEL = { academic: '教务系统', lms: '教学平台', industry: '行业数据' };
  const TYPE_LABEL   = {
    schools: '学校·学院·专业', students: '学生信息', courses: '课程数据',
    curriculum: '培养方案', grades: '学生成绩',
    tasks: '课程任务', scores: '任务成绩', behavior: '学习行为', resources: '资源使用',
    jobs: '招聘岗位', policy: '政策文件',
  };
  const ACADEMIC_TYPES = [
    { key: 'schools',    label: '学校 · 学院 · 专业', icon: '#7c3aed', bg: '#f5f3ff' },
    { key: 'students',   label: '学生信息',       icon: '#2563eb', bg: '#eff6ff' },
    { key: 'courses',    label: '课程开设数据',   icon: '#0891b2', bg: '#ecfeff' },
    { key: 'curriculum', label: '培养方案数据',   icon: '#059669', bg: '#ecfdf5' },
    { key: 'grades',     label: '学生成绩',       icon: '#d97706', bg: '#fffbeb' },
  ];

  // ── 标签页切换 ────────────────────────────────────────────────
  function switchTab(key, btn) {
    document.querySelectorAll('.di-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.di-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`panel-${key}`).classList.add('active');

    if (key === 'quality') loadQuality();
    if (key === 'lms')     loadLmsConfig();
    if (key === 'industry') loadIndustryStats();
  }

  // ── 折叠配置区 ────────────────────────────────────────────────
  function toggleConfig(id) {
    const body    = document.getElementById(id);
    const chevron = document.getElementById(`chevron-${id}`);
    body.classList.toggle('open');
    chevron.classList.toggle('open');
  }

  // ── 总状态加载 ────────────────────────────────────────────────
  async function loadStatus() {
    document.getElementById('last-check').textContent = `更新于 ${new Date().toLocaleTimeString('zh-CN')}`;
    try {
      const data = await api.dataIntegration.status();
      renderAcademicCards(data);
    } catch (e) {
      toast.error('状态加载失败：' + e.message);
    }
  }

  function statusDotClass(status) {
    if (!status) return 'idle';
    return { success: 'success', failed: 'failed', partial: 'partial' }[status] || 'idle';
  }

  // ── Tab1：教务系统卡片 ────────────────────────────────────────
  function renderAcademicCards(data) {
    const counts = data.counts || {};
    // 分项优先来自 counts.*（与接口主 payload 同层）
    const struct = counts.organization || data.structureCounts || {};
    const courseOff = counts.courseOfferings || data.courseOfferings || {};
    const gradeInfo = counts.gradeBreakdown || data.gradeBreakdown || {};
    const src    = data.sources?.academic || {};

    function orgBreakdownHtml() {
      const s = struct.schools ?? 0;
      const c = struct.colleges ?? 0;
      const m = struct.majors ?? 0;
      return `
        <div class="grid grid-cols-3 gap-2 mt-2 text-center">
          <div class="rounded-lg px-1 py-2" style="background:var(--color-neutral-50);border:1px solid var(--color-border-subtle)">
            <p style="font-size:18px;font-weight:700;color:var(--color-neutral-900);line-height:1.2">${s}</p>
            <p style="font-size:10px;color:var(--color-neutral-500);margin-top:2px">学校</p>
          </div>
          <div class="rounded-lg px-1 py-2" style="background:var(--color-neutral-50);border:1px solid var(--color-border-subtle)">
            <p style="font-size:18px;font-weight:700;color:var(--color-neutral-900);line-height:1.2">${c}</p>
            <p style="font-size:10px;color:var(--color-neutral-500);margin-top:2px">学院</p>
          </div>
          <div class="rounded-lg px-1 py-2" style="background:var(--color-neutral-50);border:1px solid var(--color-border-subtle)">
            <p style="font-size:18px;font-weight:700;color:var(--color-neutral-900);line-height:1.2">${m}</p>
            <p style="font-size:10px;color:var(--color-neutral-500);margin-top:2px">专业</p>
          </div>
        </div>
        <p style="font-size:11px;color:var(--color-neutral-400);margin-top:8px">合计 ${counts.schools ?? 0} 条组织记录（分表存储）</p>`;
    }

    function courseBreakdownHtml() {
      const p = courseOff.planCourses ?? 0;
      const tc = courseOff.teachingClasses ?? 0;
      return `
        <div class="grid grid-cols-2 gap-2 mt-2 text-center">
          <div class="rounded-lg px-1 py-2" style="background:var(--color-neutral-50);border:1px solid var(--color-border-subtle)">
            <p style="font-size:18px;font-weight:700;color:var(--color-neutral-900);line-height:1.2">${p}</p>
            <p style="font-size:10px;color:var(--color-neutral-500);margin-top:2px">培养方案课程</p>
          </div>
          <div class="rounded-lg px-1 py-2" style="background:var(--color-neutral-50);border:1px solid var(--color-border-subtle)">
            <p style="font-size:18px;font-weight:700;color:var(--color-neutral-900);line-height:1.2">${tc}</p>
            <p style="font-size:10px;color:var(--color-neutral-500);margin-top:2px">教学班开课</p>
          </div>
        </div>
        <p style="font-size:11px;color:var(--color-neutral-400);margin-top:8px">合计 ${counts.courses ?? 0} 条（方案课程 + 开课班；与教务「开设」对应教学班）</p>`;
    }

    function gradeBreakdownHtml() {
      const n = gradeInfo.scoreRecords ?? counts.grades ?? 0;
      return `
        <p style="font-size:22px;font-weight:700;color:var(--color-neutral-900);line-height:1.2">${n} <span style="font-size:12px;font-weight:400;color:var(--color-neutral-400)">条得分记录</span></p>
        <p style="font-size:11px;color:var(--color-neutral-400);margin-top:6px;line-height:1.5">对应库表 <code style="font-size:10px">scores</code>：学生 × 考核项 的得分，非「一门课一条总评」。</p>`;
    }

    document.getElementById('academic-cards').innerHTML = ACADEMIC_TYPES.map((t) => {
      let countBlock;
      if (t.key === 'schools') countBlock = orgBreakdownHtml();
      else if (t.key === 'courses') countBlock = courseBreakdownHtml();
      else if (t.key === 'grades') countBlock = gradeBreakdownHtml();
      else countBlock = `<p style="font-size:22px;font-weight:700;color:var(--color-neutral-900);line-height:1.2">${counts[t.key] ?? 0} <span style="font-size:12px;font-weight:400;color:var(--color-neutral-400)">条记录</span></p>`;

      return `
      <div class="sync-card">
        <div class="flex items-start justify-between mb-3">
          <div style="width:36px;height:36px;border-radius:10px;background:${t.bg};display:flex;align-items:center;justify-content:center;color:${t.icon}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="sync-status-dot ${statusDotClass(src.status)}"></span>
            <span style="font-size:11px;color:var(--color-neutral-400)">${src.created_at ? formatDate(src.created_at) : '未同步'}</span>
          </div>
        </div>
        <p style="font-size:13px;font-weight:700;color:var(--color-neutral-800);margin-bottom:2px">${t.label}</p>
        ${countBlock}
        <div class="flex gap-2 mt-3">
          <button onclick="syncAcademic('${t.key}', this)" class="btn btn-primary btn-sm flex-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            立即同步
          </button>
          <button onclick="openCsvImport('${t.key}', '${t.label.replace(/'/g, "\\'")}')" class="btn btn-secondary btn-sm flex-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            CSV导入
          </button>
          <button onclick="openDataManager('${t.key}', '${t.label.replace(/'/g, "\\'")}')" class="btn btn-ghost btn-sm" title="数据管理" style="flex-shrink:0;border:1px solid var(--color-border-subtle)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            数据管理
          </button>
        </div>
      </div>
    `;
    }).join('');
  }

  async function syncAcademic(dataType, btn) {
    setLoading(btn, true);
    try {
      const res = await api.dataIntegration.academicSync(dataType);
      toast.success(`${TYPE_LABEL[dataType] || dataType} 同步完成，共 ${res.records} 条记录`);
      await loadStatus();
    } catch (e) {
      toast.error('同步失败：' + e.message);
    } finally {
      setLoading(btn, false);
    }
  }

  async function saveAcademicConfig() {
    toast.info('API 连接配置已保存（实际集成时将对接教务系统接口）');
  }

  // CSV 导入弹窗
  function openCsvImport(type, label) {
    modal.open({
      title: `CSV 导入 — ${label}`,
      size: 'modal-lg',
      body: `
        <div class="space-y-4">
          <div class="rounded-xl p-4" style="background:var(--color-neutral-50);border:1px solid var(--color-border-subtle)">
            <p style="font-size:12px;font-weight:700;color:var(--color-neutral-700);margin-bottom:6px">导入格式说明</p>
            <p style="font-size:12px;color:var(--color-neutral-500);line-height:1.7">文件格式：UTF-8 编码 CSV，第一行为列标题。</p>
          </div>
          <div class="form-group">
            <label class="form-label" for="csv-file">选择 CSV 文件</label>
            <input id="csv-file" type="file" accept=".csv,.txt" class="form-input" style="padding:8px" />
          </div>
          <p id="csv-preview" style="font-size:12px;color:var(--color-neutral-400)"></p>
        </div>`,
      confirmText: '开始导入',
      onConfirm: () => handleCsvImport(type),
    });

    // 预览行数
    setTimeout(() => {
      const fileInput = document.getElementById('csv-file');
      if (fileInput) {
        fileInput.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const lines = ev.target.result.split('\n').filter(Boolean);
            document.getElementById('csv-preview').textContent =
              `已读取 ${lines.length - 1} 行数据（排除标题行）`;
          };
          reader.readAsText(file, 'UTF-8');
        };
      }
    }, 100);
  }

  async function handleCsvImport(type) {
    const fileInput = document.getElementById('csv-file');
    if (!fileInput?.files?.length) {
      toast.warning('请先选择 CSV 文件');
      return;
    }
    const file = fileInput.files[0];
    const text = await file.text();
    const lines = text.split('\n').filter(Boolean);
    const rows  = lines.slice(1).map(line => line.split(',').map(v => v.trim()));

    try {
      const res = await api.dataIntegration.importCsv(type, rows);
      toast.success(`CSV 导入成功，共导入 ${res.imported} 行数据`);
      await loadStatus();
    } catch (e) {
      toast.error('导入失败：' + e.message);
    }
  }

  // ── Tab2：LMS ─────────────────────────────────────────────────
  const LMS_SYNC_TYPES = [
    { key: 'tasks',     label: '课程任务', icon: '#4f46e5', bg: '#eef2ff' },
    { key: 'scores',    label: '学生成绩', icon: '#059669', bg: '#ecfdf5' },
    { key: 'behavior',  label: '学习行为', icon: '#d97706', bg: '#fffbeb' },
    { key: 'resources', label: '资源使用', icon: '#0891b2', bg: '#ecfeff' },
  ];

  async function loadLmsConfig() {
    try {
      const cfg = await api.dataIntegration.lmsConfig();
      if (cfg.platform) document.getElementById('lms-platform').value = cfg.platform;
      if (cfg.base_url) document.getElementById('lms-url').value        = cfg.base_url;
      if (cfg.api_key)  document.getElementById('lms-key').value        = cfg.api_key;
      if (cfg.sync_types) {
        const types = cfg.sync_types.split(',');
        ['tasks','scores','behavior','resources'].forEach(t => {
          const el = document.getElementById(`lms-sync-${t}`);
          if (el) el.checked = types.includes(t);
        });
      }
    } catch (e) { /* 未配置时忽略 */ }
    renderLmsStatusCards();
  }

  function renderLmsStatusCards() {
    document.getElementById('lms-status-cards').innerHTML = LMS_SYNC_TYPES.map(t => `
      <div class="sync-card flex flex-col gap-2">
        <div style="width:32px;height:32px;border-radius:8px;background:${t.bg};display:flex;align-items:center;justify-content:center;color:${t.icon}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        </div>
        <p style="font-size:13px;font-weight:700;color:var(--color-neutral-800)">${t.label}</p>
        <div class="flex items-center gap-1.5 mt-auto">
          <span class="sync-status-dot idle"></span>
          <span style="font-size:11px;color:var(--color-neutral-400)">未同步</span>
        </div>
        <button onclick="triggerLmsSync('${t.key}', this)" class="btn btn-secondary btn-sm" style="margin-top:4px">同步</button>
      </div>
    `).join('');
  }

  async function saveLmsConfig() {
    const btn = document.getElementById('btn-save-lms');
    setLoading(btn, true);
    const syncTypes = ['tasks','scores','behavior','resources']
      .filter(t => document.getElementById(`lms-sync-${t}`)?.checked)
      .join(',');
    try {
      await api.dataIntegration.saveLmsConfig({
        platform:   document.getElementById('lms-platform').value,
        base_url:   document.getElementById('lms-url').value,
        api_key:    document.getElementById('lms-key').value,
        sync_types: syncTypes,
      });
      toast.success('LMS 配置已保存');
    } catch (e) {
      toast.error('保存失败：' + e.message);
    } finally {
      setLoading(btn, false);
    }
  }

  async function triggerLmsSync(type, btn) {
    setLoading(btn, true);
    try {
      await api.dataIntegration.lmsSync();
      toast.success(`${TYPE_LABEL[type] || type} 同步完成`);
    } catch (e) {
      toast.error('同步失败：' + e.message);
    } finally {
      setLoading(btn, false);
    }
  }

  // ── Tab3：行业数据 ────────────────────────────────────────────
  async function loadIndustryStats() {
    try {
      const data = await api.dataIntegration.industryStats();
      if (data.keywords) document.getElementById('industry-keywords').value = data.keywords;
      if (data.jobs?.last_run)    document.getElementById('jobs-last-run').textContent   = `上次采集：${formatDate(data.jobs.last_run)}，共 ${data.jobs.total} 条`;
      if (data.policy?.last_run)  document.getElementById('policy-last-run').textContent = `上次巡检：${formatDate(data.policy.last_run)}，共 ${data.policy.total} 份`;
    } catch (e) { /* 首次加载时无数据，忽略 */ }
  }

  async function triggerScrape(target) {
    const btn = document.getElementById(`btn-scrape-${target}`);
    setLoading(btn, true);
    const keywords = document.getElementById('industry-keywords')?.value || '';
    try {
      await api.dataIntegration.industryScrape(target, keywords);
      toast.success(target === 'jobs' ? '招聘数据采集任务已触发' : '政策巡检任务已触发');
      await loadIndustryStats();
    } catch (e) {
      toast.error('触发失败：' + e.message);
    } finally {
      setLoading(btn, false);
    }
  }

  // ── Tab4：数据质量 ────────────────────────────────────────────
  async function loadQuality() {
    await Promise.all([loadQualityStats(), loadLogs()]);
  }

  async function loadQualityStats() {
    try {
      const s = await api.dataIntegration.qualityStats();
      document.getElementById('quality-stats').innerHTML = `
        <div class="stat-card">
          <div class="flex items-start justify-between mb-3">
            <div class="stat-icon" style="background:#eef2ff;color:#4f46e5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            </div>
          </div>
          <div class="stat-value">${s.total}</div>
          <div class="stat-label mt-1">总同步次数</div>
        </div>
        <div class="stat-card">
          <div class="flex items-start justify-between mb-3">
            <div class="stat-icon" style="background:#ecfdf5;color:#059669">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          <div class="stat-value">${s.successRate}<span style="font-size:16px;font-weight:400;color:var(--color-neutral-400)">%</span></div>
          <div class="stat-label mt-1">成功率</div>
        </div>
        <div class="stat-card">
          <div class="flex items-start justify-between mb-3">
            <div class="stat-icon" style="background:#fef2f2;color:#dc2626">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
          </div>
          <div class="stat-value">${s.anomalies}</div>
          <div class="stat-label mt-1">异常/部分失败</div>
        </div>
      `;
    } catch (e) {
      toast.error('统计加载失败：' + e.message);
    }
  }

  let totalLogs = 0;
  async function loadLogs() {
    const source = document.getElementById('log-filter-source')?.value || '';
    const status = document.getElementById('log-filter-status')?.value || '';
    try {
      const data = await api.dataIntegration.qualityLogs({ source, status, page: currentPage, page_size: PAGE_SIZE });
      totalLogs = data.total;
      renderLogTable(data.logs);
      renderLogPagination(data);
    } catch (e) {
      toast.error('日志加载失败：' + e.message);
    }
  }

  const STATUS_MAP = {
    success: '<span class="badge badge-success">成功</span>',
    failed:  '<span class="badge badge-error">失败</span>',
    partial: '<span class="badge" style="background:#fffbeb;color:#92400e;border:1px solid #fde68a">部分成功</span>',
  };

  function renderLogTable(logs) {
    if (!logs.length) {
      document.getElementById('log-body').innerHTML = `
        <div class="empty-state py-12">
          <div class="empty-state-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
          <p class="empty-state-title">暂无同步记录</p>
          <p class="empty-state-desc">执行同步操作后，日志将显示在此处</p>
        </div>`;
      document.getElementById('log-pagination').style.display = 'none';
      return;
    }
    document.getElementById('log-body').innerHTML = logs.map(log => `
      <div class="log-row">
        <span><span class="badge badge-neutral" style="font-size:11px">${SOURCE_LABEL[log.source] || log.source}</span></span>
        <span style="color:var(--color-neutral-700);font-weight:500">${TYPE_LABEL[log.data_type] || log.data_type}</span>
        <span>${STATUS_MAP[log.status] || log.status}</span>
        <span style="color:var(--color-neutral-700)">${log.records}</span>
        <span style="color:var(--color-neutral-400)">${log.error_msg || (log.triggered_by === 'import' ? 'CSV文件导入' : '手动触发')}</span>
        <span style="color:var(--color-neutral-400)">${formatDate(log.created_at)}</span>
      </div>
    `).join('');
  }

  function renderLogPagination(data) {
    const totalPages = Math.ceil(data.total / PAGE_SIZE);
    const paginationEl = document.getElementById('log-pagination');
    if (data.total <= PAGE_SIZE) {
      paginationEl.style.display = 'none';
      return;
    }
    paginationEl.style.display = 'flex';
    document.getElementById('log-count').textContent = `共 ${data.total} 条记录`;
    document.getElementById('page-indicator').textContent = `第 ${currentPage} / ${totalPages} 页`;
    document.getElementById('btn-prev-page').disabled = currentPage <= 1;
    document.getElementById('btn-next-page').disabled = currentPage >= totalPages;
  }

  function changePage(delta) {
    const totalPages = Math.ceil(totalLogs / PAGE_SIZE);
    const next = currentPage + delta;
    if (next < 1 || next > totalPages) return;
    currentPage = next;
    loadLogs();
  }

  // ── industryScrape 需要传 keywords ──────────────────────────
  // （覆盖 api.js 中的调用）
  const _origScrape = api.dataIntegration.industryScrape;
  api.dataIntegration.industryScrape = (target, keywords) =>
    fetch('/api/data-integration/industry/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, keywords }),
    }).then(r => r.json()).then(j => {
      if (j.code !== 0) throw new Error(j.message);
      return j.data;
    });

  // ══════════════════════════════════════════════════════════════
  //  数据管理抽屉
  // ══════════════════════════════════════════════════════════════

  // 每种数据类型的列配置与表单字段定义
  const DM_CONFIG = {
    schools: {
      subtitle: '管理学校、学院、专业的组织架构数据',
      columns: [
        { key: 'entity_type', label: '类型',   render: v => ({ school:'学校', college:'学院', major:'专业' }[v] || v) },
        { key: 'name',        label: '名称'   },
        { key: 'code',        label: '代码'   },
        { key: 'parent_name', label: '上级单位' },
      ],
      fields: [
        { name: 'entity_type', label: '类型', type: 'select', required: true,
          options: [{ value:'school', label:'学校' }, { value:'college', label:'学院' }, { value:'major', label:'专业' }] },
        { name: 'name', label: '名称', required: true, placeholder: '例如：计算机学院' },
        { name: 'code', label: '代码', placeholder: '例如：CS' },
        { name: 'parent_name', label: '上级单位名称', placeholder: '如为顶级单位可留空' },
      ],
    },
    students: {
      subtitle: '管理学生基本信息与分班数据',
      columns: [
        { key: 'student_no',  label: '学号'   },
        { key: 'name',        label: '姓名'   },
        { key: 'gender',      label: '性别', render: v => ({ male:'男', female:'女' }[v] || v || '—') },
        { key: 'grade_year',  label: '年级'   },
        { key: 'class_name',  label: '班级'   },
        { key: 'major_name',  label: '专业'   },
      ],
      fields: [
        { name: 'student_no', label: '学号', required: true, placeholder: '例如：20230001' },
        { name: 'name',       label: '姓名', required: true },
        { name: 'gender',     label: '性别', type: 'select',
          options: [{ value:'', label:'不填' }, { value:'male', label:'男' }, { value:'female', label:'女' }] },
        { name: 'grade_year', label: '入学年份', type: 'number', placeholder: '例如：2023' },
        { name: 'class_name', label: '班级', placeholder: '例如：软件2301' },
        { name: 'major_name', label: '专业名称', placeholder: '与专业表对应' },
      ],
    },
    courses: {
      subtitle: '管理课程开设与培养方案课程数据',
      columns: [
        { key: 'course_no',   label: '课程号' },
        { key: 'name',        label: '课程名' },
        { key: 'credits',     label: '学分'   },
        { key: 'course_type', label: '类型',
          render: v => ({ required:'必修', elective:'选修', practice:'实践' }[v] || v || '—') },
        { key: 'version_name', label: '培养方案' },
      ],
      fields: [
        { name: 'course_no',   label: '课程号', required: true, placeholder: '例如：CS101' },
        { name: 'name',        label: '课程名', required: true },
        { name: 'credits',     label: '学分',   type: 'number', placeholder: '例如：3' },
        { name: 'course_type', label: '课程类型', type: 'select',
          options: [{ value:'required', label:'必修' }, { value:'elective', label:'选修' }, { value:'practice', label:'实践' }] },
        { name: 'version_name', label: '培养方案版本名', placeholder: '例如：2023版' },
      ],
    },
    curriculum: {
      subtitle: '管理培养方案版本基础数据',
      columns: [
        { key: 'version_name', label: '版本名称' },
        { key: 'major_name',   label: '专业'     },
        { key: 'year',         label: '年份'     },
        { key: 'status',       label: '状态',
          render: v => v === 'active'
            ? '<span class="badge badge-success">启用</span>'
            : '<span class="badge badge-neutral">草稿</span>' },
      ],
      fields: [
        { name: 'version_name', label: '版本名称', required: true, placeholder: '例如：2023版培养方案' },
        { name: 'major_name',   label: '专业名称', placeholder: '例如：软件工程' },
        { name: 'year',         label: '年份', type: 'number', placeholder: '例如：2023' },
        { name: 'status',       label: '状态', type: 'select',
          options: [{ value:'draft', label:'草稿' }, { value:'active', label:'启用' }] },
      ],
    },
    grades: {
      subtitle: '管理学生考核得分记录',
      columns: [
        { key: 'student_no',   label: '学号'   },
        { key: 'student_name', label: '姓名'   },
        { key: 'course_no',    label: '课程号' },
        { key: 'semester',     label: '学期'   },
        { key: 'score',        label: '分数',
          render: v => `<span style="font-weight:600;color:${v>=60?'var(--color-success)':'var(--color-error)'}">${v ?? '—'}</span>` },
      ],
      fields: [
        { name: 'student_no',   label: '学号',   required: true, placeholder: '例如：20230001' },
        { name: 'student_name', label: '姓名' },
        { name: 'course_no',    label: '课程号', required: true, placeholder: '例如：CS101' },
        { name: 'semester',     label: '学期',   required: true, placeholder: '例如：2024-2025-1' },
        { name: 'score',        label: '分数',   type: 'number', required: true, placeholder: '0 ~ 100' },
      ],
    },
  };

  let dmType        = null;
  let dmPage        = 1;
  let dmTotal       = 0;
  let dmEditingId   = null;
  let dmSearchTimer = null;
  const DM_PAGE_SIZE = 15;

  function openDataManager(type, label) {
    dmType      = type;
    dmPage      = 1;
    dmEditingId = null;
    const cfg   = DM_CONFIG[type] || {};

    document.getElementById('dm-title').textContent    = `${label} — 数据管理`;
    document.getElementById('dm-subtitle').textContent = cfg.subtitle || '';
    document.getElementById('dm-search').value         = '';

    document.getElementById('dm-overlay').classList.add('open');
    document.getElementById('dm-drawer').classList.add('open');
    document.body.style.overflow = 'hidden';

    loadDmData();
  }

  function closeDataManager() {
    document.getElementById('dm-overlay').classList.remove('open');
    document.getElementById('dm-drawer').classList.remove('open');
    document.body.style.overflow = '';
  }

  // ESC 关闭抽屉
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDataManager();
  });

  async function loadDmData() {
    const search = document.getElementById('dm-search')?.value || '';
    const body   = document.getElementById('dm-body');
    body.innerHTML = '<div class="dm-empty"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg><p>加载中…</p></div>';
    try {
      const data = await api.dataIntegration.listRecords(dmType, {
        search, page: dmPage, page_size: DM_PAGE_SIZE,
      });
      dmTotal = data.total ?? 0;
      renderDmTable(data.list ?? data.records ?? []);
      renderDmPagination();
    } catch (e) {
      body.innerHTML = `<div class="dm-empty"><p style="color:var(--color-error)">加载失败：${e.message}</p></div>`;
    }
  }

  function renderDmTable(list) {
    const cfg  = DM_CONFIG[dmType];
    const body = document.getElementById('dm-body');

    if (!list.length) {
      body.innerHTML = `
        <div class="dm-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          <p>暂无数据，可点击「添加记录」手动录入，或通过同步/CSV导入</p>
        </div>`;
      document.getElementById('dm-footer').style.display = 'none';
      return;
    }

    const ths = cfg.columns.map(c => `<th>${c.label}</th>`).join('') + '<th style="text-align:right">操作</th>';
    const trs = list.map(row => {
      const tds = cfg.columns.map(c => {
        const val = row[c.key];
        return `<td>${c.render ? c.render(val) : (val ?? '—')}</td>`;
      }).join('');
      const id = row.id ?? row._id ?? row.student_no ?? row.course_no;
      return `<tr>
        ${tds}
        <td style="text-align:right;white-space:nowrap">
          <button onclick='openDmForm(${JSON.stringify(row).replace(/'/g,"&#39;")})' class="btn btn-ghost btn-sm" style="padding:4px 8px" title="编辑">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button onclick="deleteDmRecord('${id}')" class="btn btn-ghost btn-sm" style="padding:4px 8px;color:var(--color-error)" title="删除">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </td>
      </tr>`;
    }).join('');

    body.innerHTML = `<table class="dm-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  }

  function renderDmPagination() {
    const footer     = document.getElementById('dm-footer');
    const totalPages = Math.ceil(dmTotal / DM_PAGE_SIZE);
    if (dmTotal <= DM_PAGE_SIZE) { footer.style.display = 'none'; return; }
    footer.style.display = 'flex';
    document.getElementById('dm-count').textContent           = `共 ${dmTotal} 条记录`;
    document.getElementById('dm-page-indicator').textContent  = `第 ${dmPage} / ${totalPages} 页`;
    document.getElementById('dm-prev').disabled               = dmPage <= 1;
    document.getElementById('dm-next').disabled               = dmPage >= totalPages;
  }

  function dmChangePage(delta) {
    const totalPages = Math.ceil(dmTotal / DM_PAGE_SIZE);
    const next = dmPage + delta;
    if (next < 1 || next > totalPages) return;
    dmPage = next;
    loadDmData();
  }

  function dmSearchDebounce() {
    clearTimeout(dmSearchTimer);
    dmSearchTimer = setTimeout(() => { dmPage = 1; loadDmData(); }, 320);
  }

  // ── 添加 / 编辑表单 ─────────────────────────────────────────
  function openDmForm(record = null) {
    const cfg    = DM_CONFIG[dmType];
    const isEdit = record && (record.id || record._id || record.student_no);
    dmEditingId  = isEdit ? (record.id ?? record._id ?? record.student_no) : null;

    const fieldsHtml = cfg.fields.map(f => {
      const val = record ? (record[f.name] ?? '') : '';
      if (f.type === 'select') {
        const opts = f.options.map(o =>
          `<option value="${o.value}" ${String(val) === String(o.value) ? 'selected' : ''}>${o.label}</option>`
        ).join('');
        return `<div class="form-group">
          <label class="form-label">${f.label}${f.required ? ' <span style="color:var(--color-error)">*</span>' : ''}</label>
          <select id="dmf-${f.name}" class="form-select">${opts}</select>
        </div>`;
      }
      return `<div class="form-group">
        <label class="form-label">${f.label}${f.required ? ' <span style="color:var(--color-error)">*</span>' : ''}</label>
        <input id="dmf-${f.name}" type="${f.type || 'text'}" class="form-input"
          value="${String(val).replace(/"/g,'&quot;')}"
          placeholder="${f.placeholder || ''}" ${f.required ? 'required' : ''} />
      </div>`;
    }).join('');

    modal.open({
      title: isEdit ? `编辑记录` : `添加记录`,
      size:  'modal-lg',
      body:  `<div class="grid grid-cols-1 gap-4" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${fieldsHtml}</div>`,
      confirmText: isEdit ? '保存修改' : '确认添加',
      onConfirm: () => submitDmForm(cfg, isEdit),
    });
  }

  async function submitDmForm(cfg, isEdit) {
    const data = {};
    let valid  = true;

    for (const f of cfg.fields) {
      const el  = document.getElementById(`dmf-${f.name}`);
      const val = el ? el.value.trim() : '';
      if (f.required && !val) {
        toast.warning(`「${f.label}」为必填项`);
        valid = false; break;
      }
      data[f.name] = f.type === 'number' ? (val === '' ? null : Number(val)) : val;
    }
    if (!valid) return;

    try {
      if (isEdit) {
        await api.dataIntegration.updateRecord(dmType, dmEditingId, data);
        toast.success('记录已更新');
      } else {
        await api.dataIntegration.createRecord(dmType, data);
        toast.success('记录已添加');
      }
      loadDmData();
      loadStatus();
    } catch (e) {
      toast.error((isEdit ? '更新' : '添加') + '失败：' + e.message);
    }
  }

  async function deleteDmRecord(id) {
    const ok = await modal.confirm('确定要删除这条记录吗？此操作不可撤销。', { title: '删除确认', danger: true });
    if (!ok) return;
    try {
      await api.dataIntegration.deleteRecord(dmType, id);
      toast.success('已删除');
      loadDmData();
      loadStatus();
    } catch (e) {
      toast.error('删除失败：' + e.message);
    }
  }

  // ── 初始化 ───────────────────────────────────────────────────
  loadStatus();