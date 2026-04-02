/**
 * Modal 对话框组件
 * 用法:
 *   modal.open({ title, content, onConfirm, confirmText })
 *   modal.confirm('确定删除？').then(confirmed => ...)
 *   modal.form({ title, fields, onSubmit })
 */
const modal = (() => {
  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 backdrop-blur-sm';
    overlay.style.animation = 'fadeIn 0.15s ease';
    return overlay;
  }

  function open({ title, content, onConfirm, onCancel, confirmText = '确定', cancelText = '取消', danger = false }) {
    const overlay = createOverlay();
    const dialog = document.createElement('div');
    dialog.className = 'bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all';
    dialog.style.animation = 'slideUp 0.2s ease';
    dialog.innerHTML = `
      <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
        <h3 class="text-lg font-semibold text-gray-800">${title}</h3>
        <button class="modal-close text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">✕</button>
      </div>
      <div class="px-6 py-4 text-gray-600 text-sm">${content}</div>
      <div class="flex justify-end gap-3 px-6 pb-5 pt-2">
        <button class="modal-cancel px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">${cancelText}</button>
        <button class="modal-confirm px-4 py-2 text-sm text-white rounded-lg transition-colors font-medium ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}">${confirmText}</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const close = () => {
      overlay.style.animation = 'fadeOut 0.15s ease forwards';
      setTimeout(() => { overlay.remove(); document.body.style.overflow = ''; }, 150);
    };

    dialog.querySelector('.modal-close').onclick = () => { close(); onCancel?.(); };
    dialog.querySelector('.modal-cancel').onclick = () => { close(); onCancel?.(); };
    dialog.querySelector('.modal-confirm').onclick = () => { onConfirm?.(); close(); };
    overlay.onclick = (e) => { if (e.target === overlay) { close(); onCancel?.(); } };

    return { close };
  }

  function confirm(message, { title = '确认操作', danger = false } = {}) {
    return new Promise((resolve) => {
      open({
        title, danger,
        content: `<p>${message}</p>`,
        confirmText: danger ? '确定删除' : '确定',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }

  function form({ title, fields, onSubmit, submitText = '保存' }) {
    const fieldHtml = fields.map((f) => `
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">
          ${f.label}${f.required ? ' <span class="text-red-500">*</span>' : ''}
        </label>
        ${f.type === 'select'
          ? `<select name="${f.name}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              ${(f.options || []).map((o) => `<option value="${o.value}" ${o.value == f.default ? 'selected' : ''}>${o.label}</option>`).join('')}
             </select>`
          : f.type === 'textarea'
          ? `<textarea name="${f.name}" rows="3" placeholder="${f.placeholder || ''}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none">${f.default || ''}</textarea>`
          : `<input type="${f.type || 'text'}" name="${f.name}" value="${f.default || ''}" placeholder="${f.placeholder || ''}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">`
        }
        ${f.hint ? `<p class="mt-1 text-xs text-gray-400">${f.hint}</p>` : ''}
      </div>
    `).join('');

    const overlay = createOverlay();
    const dialog = document.createElement('div');
    dialog.className = 'bg-white rounded-2xl shadow-2xl w-full max-w-lg';
    dialog.style.animation = 'slideUp 0.2s ease';
    dialog.innerHTML = `
      <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
        <h3 class="text-lg font-semibold text-gray-800">${title}</h3>
        <button class="modal-close text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
      </div>
      <form class="modal-form px-6 py-4 max-h-[60vh] overflow-y-auto">${fieldHtml}</form>
      <div class="flex justify-end gap-3 px-6 pb-5 pt-2 border-t border-gray-100">
        <button type="button" class="modal-cancel px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
        <button type="button" class="modal-submit px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium">${submitText}</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const close = () => { overlay.remove(); document.body.style.overflow = ''; };

    dialog.querySelector('.modal-close').onclick = close;
    dialog.querySelector('.modal-cancel').onclick = close;
    dialog.querySelector('.modal-submit').onclick = () => {
      const formEl = dialog.querySelector('.modal-form');
      const data = Object.fromEntries(new FormData(formEl));
      onSubmit?.(data, close);
    };
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
  }

  return { open, confirm, form };
})();

// CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
  @keyframes fadeOut { from { opacity: 1 } to { opacity: 0 } }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
`;
document.head.appendChild(style);
window.modal = modal;
