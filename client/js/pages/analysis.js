/**
 * 达成度分析 — analysis.html
 */
nav.render('analysis');

async function initVersionSelect() {
  const majors = await api.majors.list();
  const sel = document.getElementById('version-select');
  for (const m of majors) {
    const vs = await api.curriculum.versions(m.id);
    vs.forEach(v => {
      const o = document.createElement('option');
      o.value = v.id;
      o.textContent = `${m.name} · ${v.grade_year}级`;
      sel.appendChild(o);
    });
  }
  sel.addEventListener('change', () => {
    document.getElementById('btn-run').disabled = !sel.value;
  });
}

async function loadAnalysis() {
  const vId = document.getElementById('version-select').value;
  if (!vId) return;
  const btn = document.getElementById('btn-run');
  setLoading(btn, true);
  try {
    const data = await api.analysis.version(vId);
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('results').classList.remove('hidden');
    renderSummary(data);
    renderObjectives(data.objectives || []);
    renderGRTable(data.graduationRequirements || []);
    renderRadar(data.graduationRequirements || []);
    renderIndicatorDetail(data.graduationRequirements || []);
  } catch(e) {
    toast.error('计算失败：' + e.message);
  } finally {
    setLoading(btn, false);
  }
}

function renderSummary(data) {
  const grs = data.graduationRequirements || [];
  const objs = data.objectives || [];
  const allInds = grs.flatMap(g => g.indicators || []);
  const reached = allInds.filter(i => i.reached).length;
  const total   = allInds.length;
  const avgGR   = grs.filter(g => g.achievement != null).reduce((s,g,_,a) => s + g.achievement/a.length, 0);
  const avgObj  = objs.filter(o => o.achievement != null).reduce((s,o,_,a) => s + o.achievement/a.length, 0);

  document.getElementById('summary-cards').innerHTML = [
    { label:'毕业要求达成均值', value: avgGR ? pct(avgGR) : '无', sub: `${grs.length} 条要求`,
      color: achievementClass(avgGR), icon: '🛡' },
    { label:'培养目标达成均值', value: avgObj ? pct(avgObj) : '无', sub: `${objs.length} 个目标`,
      color: achievementClass(avgObj), icon: '🎯' },
    { label:'指标点达标率',     value: total ? `${reached}/${total}` : '无', sub: `${total ? Math.round(reached/total*100) : 0}% 达标`,
      color: total && reached/total >= 0.8 ? 'high' : 'medium', icon: '📊' },
    { label:'数据覆盖',         value: grs.filter(g=>g.achievement!=null).length + '/' + grs.length,
      sub: '毕业要求已计算', color: 'neutral', icon: '💻' },
  ].map(s => `
    <div class="stat-card">
      <div class="flex items-start justify-between mb-2">
        <div class="stat-icon" style="background:${s.color==='high'?'#ecfdf5':s.color==='medium'?'#fffbeb':s.color==='low'?'#fef2f2':'var(--color-neutral-100)'}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${s.color==='high'?'#059669':s.color==='medium'?'#d97706':s.color==='low'?'#dc2626':'#64748b'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      </div>
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
      <div style="font-size:11px;color:var(--color-neutral-400);margin-top:2px">${s.sub}</div>
    </div>
  `).join('');
}

function renderObjectives(objectives) {
  const el = document.getElementById('objectives-results');
  if (!objectives.length) { el.innerHTML = '<div class="p-4 text-sm text-gray-400 text-center">暂无培养目标数据</div>'; return; }
  el.innerHTML = objectives.map(o => `
    <div class="flex items-center gap-4 px-5 py-3">
      <span style="flex-shrink:0;width:28px;height:28px;border-radius:8px;background:var(--color-primary-50);color:var(--color-primary-700);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center">${o.code}</span>
      <div class="flex-1 min-w-0">
        <p style="font-size:12px;color:var(--color-neutral-600);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${o.description}</p>
        <div class="progress-bar mt-1.5" style="max-width:200px">
          <div class="progress-fill ${achievementClass(o.achievement)}" style="width:${o.achievement ? Math.round(o.achievement*100) : 0}%"></div>
        </div>
      </div>
      <div style="flex-shrink:0;text-align:right">
        ${achievementBadge(o.achievement)}
      </div>
    </div>
  `).join('');
}

function renderGRTable(grs) {
  const reached = grs.filter(g => g.achievement != null && g.achievement >= 0.6).length;
  const total   = grs.filter(g => g.achievement != null).length;
  document.getElementById('gr-summary-pills').innerHTML = `
    <span class="badge badge-success">${reached} 达标</span>
    <span class="badge badge-error">${total - reached} 未达标</span>
    <span class="badge badge-neutral">${grs.length - total} 未计算</span>
  `;

  document.getElementById('gr-tbody').innerHTML = grs.map(gr => `
    <tr>
      <td><span style="font-weight:700;color:var(--color-primary-600)">${gr.code}</span></td>
      <td style="max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${gr.description}">${gr.description}</td>
      <td class="text-center"><span class="badge badge-neutral">${(gr.indicators||[]).length}</span></td>
      <td class="text-center">${achievementBadge(gr.achievement)}</td>
      <td class="text-center">
        ${gr.achievement == null
          ? '<span class="badge badge-neutral">未计算</span>'
          : gr.achievement >= 0.6
            ? '<span class="badge badge-success"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> 达标</span>'
            : '<span class="badge badge-error"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> 未达标</span>'
        }
      </td>
      <td style="padding-right:20px">
        <div class="progress-bar">
          <div class="progress-fill ${achievementClass(gr.achievement)}" style="width:${gr.achievement ? Math.round(gr.achievement*100) : 0}%"></div>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderRadar(grs) {
  const svg = document.getElementById('radar-svg');
  const cx = 120, cy = 120, r = 90;
  const n = grs.length;
  if (!n) { svg.innerHTML = ''; return; }

  const points = grs.map((_, i) => {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2;
    return { cos: Math.cos(angle), sin: Math.sin(angle) };
  });

  let html = '';
  [0.25, 0.5, 0.75, 1].forEach(ratio => {
    const rr = r * ratio;
    const pts = points.map(p => `${cx + rr * p.cos},${cy + rr * p.sin}`).join(' ');
    html += `<polygon points="${pts}" class="radar-ring"/>`;
    html += `<text x="${cx + rr * points[0].cos + 4}" y="${cy + rr * points[0].sin}" style="font-size:9px;fill:var(--color-neutral-400)">${Math.round(ratio*100)}%</text>`;
  });

  points.forEach(p => {
    html += `<line x1="${cx}" y1="${cy}" x2="${cx + r * p.cos}" y2="${cy + r * p.sin}" class="radar-axis"/>`;
  });

  const dataPts = grs.map((gr, i) => {
    const v = gr.achievement != null ? gr.achievement : 0;
    return `${cx + r * v * points[i].cos},${cy + r * v * points[i].sin}`;
  }).join(' ');
  html += `<polygon points="${dataPts}" class="radar-area"/>`;

  grs.forEach((gr, i) => {
    const v = gr.achievement != null ? gr.achievement : 0;
    const dx = cx + r * v * points[i].cos;
    const dy = cy + r * v * points[i].sin;
    html += `<circle cx="${dx}" cy="${dy}" r="4" class="radar-dot"><title>${gr.code}: ${pct(gr.achievement)}</title></circle>`;
    const lx = cx + (r + 16) * points[i].cos;
    const ly = cy + (r + 16) * points[i].sin;
    html += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" style="font-size:10px;font-weight:700;fill:var(--color-neutral-600)">${gr.code}</text>`;
  });

  svg.innerHTML = html;
}

function renderIndicatorDetail(grs) {
  const el = document.getElementById('ind-detail');
  const all = grs.flatMap(gr => (gr.indicators||[]).map(ind => ({ ...ind, gr_code: gr.code })));
  if (!all.length) { el.innerHTML = '<div class="p-4 text-sm text-gray-400 text-center">暂无指标点数据</div>'; return; }

  document.getElementById('ind-note').textContent = `${all.length} 个指标点`;
  el.innerHTML = all.map(ind => `
    <div class="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
      <span style="flex-shrink:0;width:52px;font-size:11px;font-weight:700;color:var(--color-primary-400);font-family:monospace">${ind.code}</span>
      <p style="flex:1;font-size:13px;color:var(--color-neutral-600);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${ind.description}">${ind.description}</p>
      <div class="flex items-center gap-4 flex-shrink-0">
        <div class="progress-bar" style="width:120px">
          <div class="progress-fill ${achievementClass(ind.achievement)}" style="width:${ind.achievement ? Math.round(ind.achievement*100) : 0}%"></div>
        </div>
        ${achievementBadge(ind.achievement, ind.threshold)}
        ${ind.reached
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
        }
      </div>
    </div>
  `).join('');
}

initVersionSelect();
