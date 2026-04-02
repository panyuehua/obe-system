/**
 * OBE平台 — 全局共享JS
 * 包含：Toast / Modal / Nav / Loading / 工具函数
 */

// ── Toast ──────────────────────────────────────────────────────
const toast = (() => {
  function getContainer() {
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      c.setAttribute('aria-live', 'polite');
      c.setAttribute('aria-atomic', 'false');
      document.body.appendChild(c);
    }
    return c;
  }

  const icons = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };

  function show(message, type = 'info', duration = 3500) {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `<span class="flex-shrink-0">${icons[type]}</span><span class="flex-1">${message}</span>`;
    getContainer().appendChild(el);

    setTimeout(() => {
      el.style.transition = 'opacity 0.2s, transform 0.2s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(110%)';
      setTimeout(() => el.remove(), 220);
    }, duration);
  }

  return {
    success: (m, d) => show(m, 'success', d),
    error:   (m, d) => show(m, 'error', d),
    warning: (m, d) => show(m, 'warning', d),
    info:    (m, d) => show(m, 'info', d),
  };
})();

// ── Modal ──────────────────────────────────────────────────────
const modal = (() => {
  const closeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  function open({ title, body, onConfirm, onCancel, confirmText = '确定', cancelText = '取消', danger = false, size = '' }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'modal-title');

    const dialog = document.createElement('div');
    dialog.className = `modal-dialog ${size}`;
    dialog.innerHTML = `
      <div class="modal-header">
        <h3 id="modal-title" class="modal-title">${title}</h3>
        <button class="js-close btn btn-ghost btn-icon btn-sm" aria-label="关闭">${closeIcon}</button>
      </div>
      <div class="modal-body">${body}</div>
      <div class="modal-footer">
        <button class="js-cancel btn btn-secondary">${cancelText}</button>
        <button class="js-confirm btn ${danger ? 'btn-danger' : 'btn-primary'}">${confirmText}</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Focus first focusable element
    requestAnimationFrame(() => {
      const focusable = dialog.querySelector('button, input, select, textarea');
      focusable?.focus();
    });

    const close = (cb) => {
      overlay.style.animation = 'fadeOut 0.15s ease forwards';
      setTimeout(() => { overlay.remove(); document.body.style.overflow = ''; cb?.(); }, 150);
    };

    dialog.querySelector('.js-close').onclick  = () => close(onCancel);
    dialog.querySelector('.js-cancel').onclick  = () => close(onCancel);
    dialog.querySelector('.js-confirm').onclick = () => { onConfirm?.(); close(); };
    overlay.onclick = (e) => { if (e.target === overlay) close(onCancel); };

    // Escape key
    const onKey = (e) => { if (e.key === 'Escape') { close(onCancel); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);

    return { close: () => close() };
  }

  function confirm(message, opts = {}) {
    return new Promise((resolve) => {
      open({
        title: opts.title || '确认操作',
        body: `<p class="text-sm text-neutral-600 leading-relaxed">${message}</p>`,
        danger: opts.danger,
        confirmText: opts.danger ? '确认删除' : '确定',
        onConfirm: () => resolve(true),
        onCancel:  () => resolve(false),
      });
    });
  }

  function form({ title, fields, onSubmit, submitText = '保存', size = '' }) {
    const fieldsHtml = fields.map((f) => {
      const id = `field-${f.name}`;
      let input = '';
      if (f.type === 'select') {
        input = `<select id="${id}" name="${f.name}" class="form-select">
          ${(f.options || []).map((o) => `<option value="${o.value}" ${o.value == f.default ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>`;
      } else if (f.type === 'textarea') {
        input = `<textarea id="${id}" name="${f.name}" rows="3" placeholder="${f.placeholder || ''}" class="form-textarea">${f.default || ''}</textarea>`;
      } else {
        input = `<input id="${id}" type="${f.type || 'text'}" name="${f.name}" value="${f.default != null ? f.default : ''}" placeholder="${f.placeholder || ''}" class="form-input" ${f.required ? 'required' : ''}>`;
      }
      return `
        <div class="form-group">
          <label class="form-label" for="${id}">${f.label}${f.required ? '<span class="required">*</span>' : ''}</label>
          ${input}
          ${f.hint ? `<p class="form-hint">${f.hint}</p>` : ''}
          <p class="form-error hidden" id="${id}-error"></p>
        </div>`;
    }).join('');

    const { close } = open({
      title, size,
      body: `<form id="modal-form" novalidate class="space-y-0">${fieldsHtml}</form>`,
      confirmText: submitText,
      onConfirm: () => {
        // prevent default close, handle in onSubmit
      },
    });

    // Override confirm button to validate + submit
    const overlay = document.querySelector('.modal-overlay');
    if (!overlay) return;
    overlay.querySelector('.js-confirm').onclick = () => {
      const form = overlay.querySelector('#modal-form');
      const data = Object.fromEntries(new FormData(form));
      let valid = true;

      // Basic required validation
      fields.filter((f) => f.required).forEach((f) => {
        const val = data[f.name];
        const errEl = overlay.querySelector(`#field-${f.name}-error`);
        if (!val || val.trim() === '') {
          valid = false;
          errEl?.classList.remove('hidden');
          errEl && (errEl.textContent = `${f.label}不能为空`);
          overlay.querySelector(`#field-${f.name}`)?.classList.add('error');
        } else {
          errEl?.classList.add('hidden');
          overlay.querySelector(`#field-${f.name}`)?.classList.remove('error');
        }
      });

      if (valid) onSubmit?.(data, () => close());
    };
  }

  return { open, confirm, form };
})();

// ── Navigation ─────────────────────────────────────────────────
const nav = (() => {
  const menuItems = [
    { icon: 'layout-dashboard', label: '首页概览',   href: '/index.html',            key: 'dashboard' },
    { icon: 'graduation-cap',   label: '专业管理',   href: '/pages/majors.html',     key: 'majors' },
    { icon: 'clipboard-list',   label: '培养方案',   href: '/pages/curriculum.html', key: 'curriculum' },
    { icon: 'book-open',        label: '课程管理',   href: '/pages/courses.html',    key: 'courses' },
    { icon: 'grid-3x3',         label: '支撑矩阵',   href: '/pages/matrix.html',     key: 'matrix' },
    { icon: 'bar-chart-2',      label: '达成度分析', href: '/pages/analysis.html',   key: 'analysis' },
    { icon: 'stethoscope',      label: '诊断报告',   href: '/pages/diagnosis.html',  key: 'diagnosis' },
    { icon: 'refresh-cw',       label: '持续改进',   href: '/pages/improvement.html',key: 'improvement' },
  ];

  function iconSvg(name) {
    // Inline minimal SVG icons (subset of Lucide)
    const icons = {
      'layout-dashboard': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
      'graduation-cap':   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
      'clipboard-list':   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></svg>`,
      'book-open':        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>`,
      'grid-3x3':         `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
      'bar-chart-2':      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
      'stethoscope':      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 105 2H4a2 2 0 00-2 2v5a6 6 0 006 6 6 6 0 006-6V4a2 2 0 00-2-2h-1a.2.2 0 100 .3"/><path d="M8 15v1a6 6 0 006 6 6 6 0 006-6v-4"/><circle cx="20" cy="10" r="2"/></svg>`,
      'refresh-cw':       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>`,
    };
    return icons[name] || `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
  }

  function render(activeKey) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.innerHTML = `
      <div class="flex flex-col h-full">
        <!-- Logo -->
        <div class="px-5 py-4" style="border-bottom:1px solid rgba(255,255,255,0.08)">
          <div class="flex items-center gap-3">
            <div style="width:36px;height:36px;background:linear-gradient(135deg,#6366f1,#4f46e5);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            </div>
            <div>
              <div style="color:#fff;font-size:13px;font-weight:700;line-height:1.3">OBE教管平台</div>
              <div style="color:rgba(255,255,255,0.35);font-size:11px">v1.0 · 一体化管理</div>
            </div>
          </div>
        </div>

        <!-- Nav -->
        <nav class="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="主导航">
          ${menuItems.map((item) => {
            const isActive = item.key === activeKey;
            return `
            <a href="${item.href}" class="nav-item${isActive ? ' active' : ''}" aria-current="${isActive ? 'page' : 'false'}">
              <span class="nav-icon">${iconSvg(item.icon)}</span>
              <span class="nav-label">${item.label}</span>
              ${isActive ? '<span class="nav-active-dot"></span>' : ''}
            </a>`;
          }).join('')}
        </nav>

        <!-- User -->
        <div class="px-4 py-3" style="border-top:1px solid rgba(255,255,255,0.08)">
          <div class="flex items-center gap-3">
            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#ec4899);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div class="flex-1 min-w-0">
              <div style="color:rgba(255,255,255,0.8);font-size:12px;font-weight:600" class="truncate">系统管理员</div>
              <div style="color:rgba(255,255,255,0.35);font-size:11px" class="truncate">admin@school.edu.cn</div>
            </div>
          </div>
        </div>
      </div>`;
  }

  return { render };
})();

// ── Loading helpers ────────────────────────────────────────────
function setLoading(btn, loading) {
  if (loading) {
    btn._origText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".2"/><path d="M21 12a9 9 0 00-9-9"/></svg> 处理中…`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn._origText || btn.innerHTML;
  }
}

// ── Utility functions ──────────────────────────────────────────
function pct(val) {
  if (val == null) return '—';
  return (val * 100).toFixed(1) + '%';
}

function achievementClass(val) {
  if (val == null) return 'neutral';
  if (val >= 0.7)  return 'high';
  if (val >= 0.6)  return 'medium';
  return 'low';
}

function achievementBadge(val, threshold = 0.6) {
  if (val == null) return '<span class="badge badge-neutral">未计算</span>';
  if (val >= threshold) return `<span class="badge badge-success">${pct(val)}</span>`;
  return `<span class="badge badge-error">${pct(val)}</span>`;
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// Expose globals
window.toast  = toast;
window.modal  = modal;
window.nav    = nav;
window.setLoading     = setLoading;
window.pct            = pct;
window.achievementClass  = achievementClass;
window.achievementBadge  = achievementBadge;
window.formatDate     = formatDate;
