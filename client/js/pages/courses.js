/**
 * 课程管理 — courses.html
 */
nav.render('courses');

let allCourses = [];
const natureMap   = { required:'必修', elective:'选修', practice:'实践' };
const natureBadge = { required:'badge-primary', elective:'badge-neutral', practice:'badge-success' };

async function initVersionSelect() {
  try {
    const majors = await api.majors.list();
    const sel = document.getElementById('version-select');
    for (const m of majors) {
      const versions = await api.curriculum.versions(m.id);
      versions.forEach(v => {
        const o = document.createElement('option');
        o.value = v.id;
        o.textContent = `${m.name} · ${v.grade_year}级 (${v.version})`;
        sel.appendChild(o);
      });
    }
  } catch(e) { toast.error(e.message); }
}

async function loadCourses() {
  const vId = document.getElementById('version-select').value;
  if (!vId) return;
  try {
    allCourses = await api.courses.list(vId);
    renderTable(allCourses);
  } catch(e) { toast.error(e.message); }
}

function filterSemester(sem, btn) {
  document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const list = sem === null ? allCourses : allCourses.filter(c => c.semester == sem);
  renderTable(list);
}

function renderTable(courses) {
  if (courses.length) {
    document.getElementById('summary-pills').classList.remove('hidden');
    document.getElementById('sum-count').textContent   = `${courses.length} 门课程`;
    document.getElementById('sum-credits').textContent = `共 ${courses.reduce((s,c)=>s+(+c.credits||0),0).toFixed(1)} 学分`;
    document.getElementById('sum-hours').textContent   = `共 ${courses.reduce((s,c)=>s+(+c.total_hours||0),0)} 学时`;
    document.getElementById('sum-core').textContent    = `${courses.filter(c=>c.is_core).length} 门核心课`;
  } else {
    document.getElementById('summary-pills').classList.add('hidden');
  }

  const tbody = document.getElementById('courses-tbody');
  if (!courses.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg></div><p class="empty-state-title">暂无课程数据</p><p class="empty-state-desc">点击右上角「添加课程」开始配置</p></div></td></tr>`;
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
      <td class="text-center"><span class="badge ${natureBadge[c.nature]||'badge-neutral'}">${natureMap[c.nature]||c.nature}</span></td>
      <td class="text-center" style="font-size:13px;color:var(--color-neutral-600)">第 ${c.semester} 学期</td>
      <td class="text-center">
        ${c.is_core
          ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="display:inline"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
          : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
        }
      </td>
      <td class="text-right">
        <div style="display:flex;justify-content:flex-end;gap:4px">
          <button onclick='openEditModal(${JSON.stringify(c).replace(/'/g,"&#39;")})' class="btn btn-ghost btn-sm btn-icon" aria-label="编辑课程">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button onclick="deleteCourse(${c.id},'${c.name}')" class="btn btn-ghost btn-sm btn-icon" aria-label="删除课程" style="color:var(--color-error)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

const courseFields = (d = {}) => [
  { name:'code',           label:'课程编号', required:true, placeholder:'CS001',   default:d.code },
  { name:'name',           label:'课程名称', required:true, placeholder:'软件工程', default:d.name },
  { name:'credits',        label:'学分',     type:'number', required:true, default:d.credits||3 },
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

function openCreateModal() {
  const vId = document.getElementById('version-select').value;
  if (!vId) { toast.warning('请先选择培养方案版本'); return; }
  modal.form({ title:'添加课程', fields:courseFields(), submitText:'添加课程', size:'lg',
    onSubmit: async (data, close) => {
      try { await api.courses.create({...data, version_id:vId}); close(); toast.success('课程已添加'); loadCourses(); }
      catch(e) { toast.error(e.message); }
    }
  });
}

function openEditModal(c) {
  modal.form({ title:'编辑课程', fields:courseFields(c), submitText:'保存更改', size:'lg',
    onSubmit: async (data, close) => {
      try { await api.courses.update(c.id, data); close(); toast.success('保存成功'); loadCourses(); }
      catch(e) { toast.error(e.message); }
    }
  });
}

async function deleteCourse(id, name) {
  const ok = await modal.confirm(`确定删除课程「<strong>${name}</strong>」？此操作不可恢复。`, { danger:true });
  if (!ok) return;
  try { await api.courses.remove(id); toast.success('删除成功'); loadCourses(); }
  catch(e) { toast.error(e.message); }
}

initVersionSelect();
