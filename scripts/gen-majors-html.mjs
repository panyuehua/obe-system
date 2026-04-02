/**
 * Writes client/pages/majors.html as UTF-8. Source file is ASCII-only (\u escapes).
 * Run from repo root: node scripts/gen-majors-html.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, '../client/pages/majors.html');

// Chinese strings as \u escapes
const U = {
  title: '\u4e13\u4e1a\u7ba1\u7406 \u2014 OBE\u6559\u7ba1\u5e73\u53f0',
  h1: '\u4e13\u4e1a\u7ba1\u7406',
  subtitle:
    '\u7ef4\u62a4\u4e13\u4e1a\u57fa\u672c\u4fe1\u606f\u4e0e\u57f9\u517b\u65b9\u6848\u3001\u8bfe\u7a0b\u4f53\u7cfb\u7684\u5173\u8054',
  addMajor: '\u6dfb\u52a0\u4e13\u4e1a',
  searchPh: '\u641c\u7d22\u4e13\u4e1a\u540d\u79f0\u6216\u4ee3\u7801\u2026',
  certV: '\u9ad8\u804c\u4e13\u79d1',
  certE: '\u5de5\u7a0b\u8ba4\u8bc1',
  certO: '\u5176\u4ed6',
  loadErr: '\u52a0\u8f7d\u5931\u8d25\uff1a',
  emptyTitle: '\u6682\u65e0\u4e13\u4e1a',
  emptyDesc:
    '\u70b9\u51fb\u53f3\u4e0a\u89d2\u300c\u6dfb\u52a0\u4e13\u4e1a\u300d\u521b\u5efa\u7b2c\u4e00\u4e2a\u4e13\u4e1a\uff0c\u6216\u4ece\u6559\u52a1\u7cfb\u7edf\u540c\u6b65\u6570\u636e\u3002',
  yearSuf: '\u5e74\u5236',
  verSuffix: '\u4e2a\u57f9\u517b\u65b9\u6848\u7248\u672c',
  btnCurr: '\u57f9\u517b\u65b9\u6848',
  ariaEdit: '\u7f16\u8f91',
  ariaDel: '\u5220\u9664',
  fName: '\u4e13\u4e1a\u540d\u79f0',
  phName: '\u4f8b\u5982\uff1a\u8f6f\u4ef6\u6280\u672f',
  fCode: '\u4e13\u4e1a\u4ee3\u7801',
  phCode: '\u5982 RJ',
  fCollege: '\u5b66\u9662 ID',
  fYears: '\u5b66\u5236\uff08\u5e74\uff09',
  fCert: '\u8ba4\u8bc1\u7c7b\u578b',
  modalAdd: '\u6dfb\u52a0\u4e13\u4e1a',
  submitCreate: '\u521b\u5efa',
  modalEdit: '\u7f16\u8f91\u4e13\u4e1a',
  submitSave: '\u4fdd\u5b58',
  toastCreated: '\u4e13\u4e1a\u5df2\u521b\u5efa',
  toastSaved: '\u5df2\u4fdd\u5b58',
  toastDeleted: '\u5df2\u5220\u9664',
  delTitle: '\u5220\u9664\u786e\u8ba4',
};

// delete confirm body: "确定要删除专业 <strong>${name}</strong> 吗？..." — runtime template
const delMsg =
  '\u786e\u5b9a\u8981\u5220\u9664\u4e13\u4e1a <strong>${name}</strong> \u5417\uff1f<br><br>' +
  '\u82e5\u8be5\u4e13\u4e1a\u4e0b\u5b58\u5728\u57f9\u517b\u65b9\u6848\u7248\u672c\uff0c\u8bf7\u5148\u5904\u7406\u6216\u786e\u8ba4\u53ef\u4e00\u5e76\u6e05\u7406\u76f8\u5173\u6570\u636e\u3002';

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${U.title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="/css/design-system.css" />
</head>
<body>
<div class="flex h-screen overflow-hidden">
  <aside id="sidebar" class=""></aside>
  <main class="flex-1 flex flex-col overflow-hidden">

    <header class="page-header">
      <div>
        <h1 class="page-title">${U.h1}</h1>
        <p class="page-subtitle">${U.subtitle}</p>
      </div>
      <button onclick="openCreateModal()" class="btn btn-primary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        ${U.addMajor}
      </button>
    </header>

    <div class="flex-1 overflow-y-auto p-6 page-enter">

      <div class="flex items-center gap-3 mb-5">
        <div class="relative flex-1 max-w-xs">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-neutral-400)"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input id="search-input" type="search" placeholder="${U.searchPh}" oninput="filterMajors()"
            class="form-input pl-8" style="min-height:40px;padding-top:8px;padding-bottom:8px" />
        </div>
        <span id="count-label" class="text-xs" style="color:var(--color-neutral-400);margin-left:auto"></span>
      </div>

      <div id="majors-grid" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div class="skeleton h-44 rounded-2xl"></div>
        <div class="skeleton h-44 rounded-2xl"></div>
        <div class="skeleton h-44 rounded-2xl"></div>
      </div>
    </div>
  </main>
</div>

<script src="/js/api.js"></script>
<script src="/js/app.js"></script>
<script>
  nav.render('majors');

  let allMajors = [];
  const certMap = { vocational:'${U.certV}', engineering:'${U.certE}', other:'${U.certO}' };
  const certColor = { vocational:'badge-primary', engineering:'badge-info', other:'badge-neutral' };

  async function loadMajors() {
    try {
      allMajors = await api.majors.list();
      renderGrid(allMajors);
    } catch (e) { toast.error('${U.loadErr}' + e.message); }
  }

  function filterMajors() {
    const q = document.getElementById('search-input').value.toLowerCase();
    renderGrid(allMajors.filter(m => m.name.toLowerCase().includes(q) || (m.code||'').toLowerCase().includes(q)));
  }

  function renderGrid(list) {
    document.getElementById('count-label').textContent = '\\u5171 ' + list.length + ' \\u4e2a\\u4e13\\u4e1a';
    const grid = document.getElementById('majors-grid');
    if (!list.length) {
      grid.innerHTML = \`
        <div class="col-span-3">
          <div class="card">
            <div class="empty-state">
              <div class="empty-state-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              </div>
              <p class="empty-state-title">${U.emptyTitle}</p>
              <p class="empty-state-desc">${U.emptyDesc}</p>
              <button onclick="openCreateModal()" class="btn btn-primary btn-sm mt-2">${U.addMajor}</button>
            </div>
          </div>
        </div>\`;
      return;
    }
    grid.innerHTML = list.map((m) => \`
      <div class="card card-hover">
        <div class="card-body">
          <div class="flex items-start justify-between mb-4">
            <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--color-primary-500),var(--color-primary-700));display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <span style="color:#fff;font-size:13px;font-weight:700">\${m.code ? m.code.slice(0,2).toUpperCase() : m.name.slice(0,1)}</span>
            </div>
            <span class="badge \${certColor[m.cert_type]||'badge-neutral'}">\${certMap[m.cert_type]||m.cert_type}</span>
          </div>

          <h3 style="font-size:15px;font-weight:700;color:var(--color-neutral-900);margin-bottom:4px">\${m.name}</h3>
          <div class="flex items-center gap-3 mb-4">
            <span style="font-size:12px;color:var(--color-neutral-400)">\${m.college_name}</span>
            <span style="width:3px;height:3px;border-radius:50%;background:var(--color-neutral-300)"></span>
            <span style="font-size:12px;color:var(--color-neutral-400)">\${m.degree_years} ${U.yearSuf}</span>
            \${m.code ? \`<span style="width:3px;height:3px;border-radius:50%;background:var(--color-neutral-300)"></span><span style="font-size:12px;color:var(--color-neutral-400);font-family:monospace">\${m.code}</span>\` : ''}
          </div>

          <div class="flex items-center gap-2 pt-3" style="border-top:1px solid var(--color-border-subtle)">
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-neutral-400)"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/></svg>
              <span style="font-size:12px;color:var(--color-neutral-500)">\${m.version_count} ${U.verSuffix}</span>
            </div>
            <a href="/pages/curriculum.html?major_id=\${m.id}" class="btn btn-secondary btn-sm">${U.btnCurr}</a>
            <button onclick='openEditModal(\${JSON.stringify(m).replace(/'/g,"&#39;")})' class="btn btn-ghost btn-sm" aria-label="${U.ariaEdit}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button onclick="deleteMajor(\${m.id}, \${JSON.stringify(m.name)})" class="btn btn-ghost btn-sm" aria-label="${U.ariaDel}" style="color:var(--color-error)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    \`).join('');
  }

  const formFields = (d = {}) => [
    { name:'name',         label:'${U.fName}',   required:true, placeholder:'${U.phName}', default:d.name },
    { name:'code',         label:'${U.fCode}',   placeholder:'${U.phCode}',              default:d.code },
    { name:'college_id',   label:'${U.fCollege}', type:'number', required:true,       default:d.college_id||1 },
    { name:'degree_years', label:'${U.fYears}', type:'number',                       default:d.degree_years||3 },
    { name:'cert_type',    label:'${U.fCert}',   type:'select',
      options:[{value:'vocational',label:'${U.certV}'},{value:'engineering',label:'${U.certE}'},{value:'other',label:'${U.certO}'}],
      default:d.cert_type||'vocational' },
  ];

  function openCreateModal() {
    modal.form({ title:'${U.modalAdd}', fields:formFields(), submitText:'${U.submitCreate}',
      onSubmit: async (data, close) => {
        try { await api.majors.create(data); close(); toast.success('${U.toastCreated}'); loadMajors(); }
        catch(e) { toast.error(e.message); }
      }
    });
  }

  function openEditModal(m) {
    modal.form({ title:'${U.modalEdit}', fields:formFields(m), submitText:'${U.submitSave}',
      onSubmit: async (data, close) => {
        try { await api.majors.update(m.id, data); close(); toast.success('${U.toastSaved}'); loadMajors(); }
        catch(e) { toast.error(e.message); }
      }
    });
  }

  async function deleteMajor(id, name) {
    const ok = await modal.confirm(\`${delMsg}\`, { title:'${U.delTitle}', danger:true });
    if (!ok) return;
    try { await api.majors.remove(id); toast.success('${U.toastDeleted}'); loadMajors(); }
    catch(e) { toast.error(e.message); }
  }

  loadMajors();
</script>
</body>
</html>
`;

fs.writeFileSync(out, html, 'utf8');
console.log('Wrote', out);
