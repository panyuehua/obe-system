/**
 * 侧边导航渲染组件 — 支持收缩/展开
 */
const nav = (() => {
  const menuItems = [
    {
      key: 'dashboard',
      label: '首页概览',
      href: '/index.html',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>`,
    },
    {
      key: 'majors',
      label: '专业管理',
      href: '/pages/majors.html',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>`,
    },
    {
      key: 'curriculum',
      label: '培养方案',
      href: '/pages/curriculum.html',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
        <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/>
      </svg>`,
    },
    {
      key: 'matrix',
      label: '支撑矩阵',
      href: '/pages/matrix.html',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
      </svg>`,
    },
    {
      key: 'analysis',
      label: '达成度分析',
      href: '/pages/analysis.html',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>`,
    },
    {
      key: 'diagnosis',
      label: '诊断报告',
      href: '/pages/diagnosis.html',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>`,
    },
    {
      key: 'improvement',
      label: '持续改进',
      href: '/pages/improvement.html',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
      </svg>`,
    },
  ];

  const COLLAPSE_KEY = 'obe_sidebar_collapsed';

  function isCollapsed() {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  }

  function toggleCollapse() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const next = !sidebar.classList.contains('collapsed');
    sidebar.classList.toggle('collapsed', next);
    localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
  }

  function render(activeKey) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    if (isCollapsed()) sidebar.classList.add('collapsed');

    sidebar.innerHTML = `
      <div class="flex flex-col h-full">

        <!-- Brand / Logo -->
        <div class="sidebar-brand">
          <div class="sidebar-logo-mark">OBE</div>
          <div class="sidebar-brand-text">
            <div class="sidebar-brand-name">教管一体化平台</div>
            <div class="sidebar-brand-sub">OBE成果导向教育</div>
          </div>
          <button class="sidebar-toggle" id="sidebar-toggle-btn" aria-label="收缩/展开侧边栏">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          <div class="nav-section-label">核心功能</div>

          ${menuItems.slice(0, 3).map((item) => {
            const isActive = item.key === activeKey;
            return `
              <a href="${item.href}"
                class="nav-item${isActive ? ' active' : ''}"
                data-tooltip="${item.label}"
                aria-current="${isActive ? 'page' : 'false'}">
                <span class="nav-icon">${item.icon}</span>
                <span class="nav-label">${item.label}</span>
                ${isActive ? '<span class="nav-active-dot"></span>' : ''}
              </a>
            `;
          }).join('')}

          <div class="nav-section-label" style="margin-top:20px">OBE 分析</div>

          ${menuItems.slice(4).map((item) => {
            const isActive = item.key === activeKey;
            return `
              <a href="${item.href}"
                class="nav-item${isActive ? ' active' : ''}"
                data-tooltip="${item.label}"
                aria-current="${isActive ? 'page' : 'false'}">
                <span class="nav-icon">${item.icon}</span>
                <span class="nav-label">${item.label}</span>
                ${isActive ? '<span class="nav-active-dot"></span>' : ''}
              </a>
            `;
          }).join('')}
        </nav>

        <!-- User Footer -->
        <div class="sidebar-user">
          <div class="sidebar-avatar">管</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">系统管理员</div>
            <div class="sidebar-user-email">admin@school.edu.cn</div>
          </div>
        </div>

      </div>
    `;

    // Bind toggle button
    document.getElementById('sidebar-toggle-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      toggleCollapse();
    });
  }

  return { render, toggleCollapse };
})();

window.nav = nav;
