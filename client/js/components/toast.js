/**
 * Toast 通知组件
 * 用法: toast.success('操作成功') / toast.error('出错了') / toast.info('提示')
 */
const toast = (() => {
  let container;

  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none';
      document.body.appendChild(container);
    }
    return container;
  }

  function show(message, type = 'info', duration = 3000) {
    const colors = {
      success: 'bg-emerald-500',
      error:   'bg-red-500',
      warning: 'bg-amber-500',
      info:    'bg-blue-500',
    };
    const icons = {
      success: '✓',
      error:   '✕',
      warning: '⚠',
      info:    'ℹ',
    };

    const el = document.createElement('div');
    el.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg text-white text-sm shadow-lg
      transform translate-x-full transition-all duration-300 ${colors[type] || colors.info}`;
    el.innerHTML = `
      <span class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-white/20 font-bold text-xs">
        ${icons[type]}
      </span>
      <span>${message}</span>
    `;

    getContainer().appendChild(el);
    requestAnimationFrame(() => {
      el.classList.remove('translate-x-full');
    });

    setTimeout(() => {
      el.classList.add('translate-x-full', 'opacity-0');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  return {
    success: (msg, dur) => show(msg, 'success', dur),
    error:   (msg, dur) => show(msg, 'error', dur),
    warning: (msg, dur) => show(msg, 'warning', dur),
    info:    (msg, dur) => show(msg, 'info', dur),
  };
})();

window.toast = toast;
