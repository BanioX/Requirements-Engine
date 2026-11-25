const currentYear = new Date().getFullYear();

const state = {
  view: 'board', // 'board' | 'report'
  channel: 'E-Mail',
  ampel: 'alle',
  mode: 'all', // 'all' | 'active' | 'done'
  expandedId: null,
  freshId: null,
  pendingStatus: null,
  pendingDecFeedback: null, // { id, sentiment }
  votedIds: new Set(JSON.parse(localStorage.getItem('re_voted') || '[]')),
  report: {
    from: `${currentYear}-01-01`,
    to: `${currentYear}-12-31`,
    feasibility: 'Alle',
    status: 'Alle',
    minutesPerRequest: 6
  }
};

const WORDING_TEMPLATES = {
  Geprüft: 'Vielen Dank für Ihre Rückmeldung. Wir prüfen Ihren Vorschlag intern.',
  'In Arbeit': 'Vielen Dank für Ihren Hinweis — wir arbeiten bereits an einer Verbesserung.',
  Umgesetzt: 'Die von Ihnen angeregte Verbesserung ist ab sofort verfügbar. Besten Dank!',
  Abgelehnt: 'Vielen Dank für Ihren Vorschlag. Aktuell können wir dies leider nicht umsetzen.'
};

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDateCH(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), 2200);
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function ampelDot(feasibility) {
  if (feasibility === 'einfach') return '<span class="dot-sm dot-green" title="Einfach"></span>';
  if (feasibility === 'aufwaendig') return '<span class="dot-sm dot-red" title="Aufwändig"></span>';
  return '<span class="dot-sm dot-amber" title="Mittel"></span>';
}

function statusBadge(status) {
  if (status === 'Umgesetzt') return '<span class="tag-mini tag-green">Erledigt</span>';
  if (status === 'Abgelehnt') return '<span class="tag-mini tag-red">Abgelehnt</span>';
  if (status === 'In Arbeit' || status === 'Angenommen') return '<span class="tag-mini">In Arbeit</span>';
  if (status === 'Geprüft' || status === 'Bereit') return '<span class="tag-mini">Geprüft</span>';
  return '<span class="tag-mini">Neu</span>';
}

function loopBars(status) {
  if (status === 'Abgelehnt') {
    return `
      <div class="loop-bars" title="Eingegangen → Geprüft → Abgelehnt">
        <div class="loop-seg on"></div>
        <div class="loop-seg on"></div>
        <div class="loop-seg on-red"></div>
        <div class="loop-seg"></div>
      </div>
    `;
  }
  const rank =
    status === 'Umgesetzt' ? 4 : status === 'In Arbeit' || status === 'Angenommen' ? 3 : status === 'Geprüft' || status === 'Bereit' ? 2 : 1;
  const cls = rank === 4 ? 'on-green' : 'on';
  return `
    <div class="loop-bars" title="Status: ${esc(status)}">
      ${[1, 2, 3, 4].map((n) => `<div class="loop-seg ${n <= rank ? cls : ''}"></div>`).join('')}
    </div>
  `;
}

function setView(viewName) {
  state.view = viewName;
  const isReport = viewName === 'report';
  document.getElementById('board-view').classList.toggle('hidden', isReport);
  document.getElementById('report-view').classList.toggle('hidden', !isReport);
  document.getElementById('board-search-wrap').classList.toggle('hidden', isReport);
  const btn = document.getElementById('btn-toggle-report');
  btn.classList.toggle('active', isReport);
  btn.textContent = isReport ? '← Board' : 'Report';
  if (isReport) {
    loadReport();
  }
}

async function loadHealth() {
  try {
    const h = await api('/health');
    document.getElementById('ops-dot').className = 'pulse-dot ok';
    document.getElementById('ops-db').textContent = `DB ${h.db} (${h.dbLatencyMs} ms)`;
    document.getElementById('ops-counts').textContent = `${h.counts.stories} Einträge`;
    document.getElementById('ops-version').textContent = h.version;
    document.getElementById('ops-commit').textContent = String(h.commit || 'local').slice(0, 7);
  } catch {
    document.getElementById('ops-dot').className = 'pulse-dot err';
    document.getElementById('ops-db').textContent = 'DB getrennt';
  }
}

async function loadIdeas() {
  const params = new URLSearchParams();
  const q = document.getElementById('filter-q').value.trim();
  if (q) params.set('q', q);

  const allIdeas = await api(`/api/stories?${params.toString()}`);

  const totalMentions = allIdeas.reduce((sum, i) => sum + (Number(i.votes) || 1), 0);
  document.getElementById('count-all').textContent = `${allIdeas.length} (${totalMentions}×)`;
  document.getElementById('count-green').textContent = String(allIdeas.filter((i) => (i.feasibility || 'mittel') === 'einfach').length);
  document.getElementById('count-amber').textContent = String(allIdeas.filter((i) => (i.feasibility || 'mittel') === 'mittel').length);
  document.getElementById('count-red').textContent = String(allIdeas.filter((i) => (i.feasibility || 'mittel') === 'aufwaendig').length);

  let ideas = allIdeas;
  if (state.ampel !== 'alle') {
    ideas = ideas.filter((i) => (i.feasibility || 'mittel') === state.ampel);
  }
  if (state.mode === 'active') {
    ideas = ideas.filter((i) => ['In Arbeit', 'Angenommen', 'Geprüft'].includes(i.status));
  } else if (state.mode === 'done') {
    ideas = ideas.filter((i) => ['Umgesetzt', 'Abgelehnt'].includes(i.status));
  }

  const listEl = document.getElementById('ideas-list');
  if (ideas.length === 0) {
    listEl.innerHTML = '<div class="empty-state">Noch keine Einträge.</div>';
    return;
  }

  listEl.innerHTML = ideas
    .map((item) => {
      const feas = item.feasibility || 'mittel';
      const channel = item.channel || 'E-Mail';
      const author = item.submitted_by ? ` · ${item.submitted_by}` : '';
      const dateStr = fmtDateCH(item.created_at);
      const tasks = Array.isArray(item.tasks_json) ? item.tasks_json : [];
      const expanded = state.expandedId === item.id;
      const voted = state.votedIds.has(item.id);
      const pending = state.pendingStatus && state.pendingStatus.id === item.id ? state.pendingStatus : null;
      const pendingFb = state.pendingDecFeedback && state.pendingDecFeedback.id === item.id ? state.pendingDecFeedback : null;
      const wording = item.public_response || item.decision_reason || '';
      const postMentions = Number(item.post_decision_mentions) || 0;
      const decUp = Number(item.decision_up) || 0;
      const decDown = Number(item.decision_down) || 0;
      const decComments = Array.isArray(item.decision_feedback_json) ? item.decision_feedback_json : [];
      const hasDecision = ['Abgelehnt', 'Umgesetzt', 'In Arbeit', 'Angenommen'].includes(item.status);
      const hasPressure = (item.status === 'Abgelehnt' && postMentions > 0) || decDown > decUp;

      const pressureBadge = hasPressure
        ? `<span class="tag-mini tag-pressure">${postMentions > 0 ? `+${postMentions}× nach Ablehnung` : 'Neu prüfen'}</span>`
        : '';

      const decisionVoteHtml = hasDecision
        ? `
          <div class="decision-vote-row">
            <span>Entscheid:</span>
            <button type="button" class="dv-btn js-dec-vote" data-id="${item.id}" data-sentiment="up" title="Mit Entscheid einverstanden">👍 ${decUp}</button>
            <button type="button" class="dv-btn js-dec-vote ${decDown > decUp ? 'down-hot' : ''}" data-id="${item.id}" data-sentiment="down" title="Unzufrieden / Druck erhöhen">👎 ${decDown}</button>
            <button type="button" class="text-link js-dec-comment-open" data-id="${item.id}">+ Feedback</button>
          </div>
          ${
            pendingFb
              ? `
                <form class="decision-form js-dec-comment-form" data-id="${item.id}" style="margin-top:6px;">
                  <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <input type="text" name="comment" required placeholder="Kurze Rückmeldung zum Entscheid…" style="flex:1 1 200px;" autofocus />
                    <button type="submit" class="st-btn active">Senden</button>
                  </div>
                </form>
              `
              : ''
          }
          ${
            decComments.length > 0
              ? `<div class="dv-comments">${decComments
                  .slice(-3)
                  .map(
                    (c) =>
                      `<div class="dv-comment ${c.sentiment === 'down' ? 'is-down' : ''}">${c.sentiment === 'down' ? '👎' : '👍'} ${esc(c.comment)}${c.author ? ` <span style="color:#94a3b8;">— ${esc(c.author)}</span>` : ''}</div>`
                  )
                  .join('')}</div>`
              : ''
          }
        `
        : '';

      const notesHtml = `
        ${
          wording
            ? `<div class="note-line">
                <div><span class="note-key">Kunden-Wording</span>${esc(wording)}</div>
                <button type="button" class="text-link js-copy" data-text="${esc(wording)}">Kopieren</button>
              </div>`
            : ''
        }
        ${
          item.internal_note
            ? `<div class="note-line internal">
                <div><span class="note-key">Systemlogik / Dev</span>${esc(item.internal_note)}</div>
              </div>`
            : ''
        }
        ${decisionVoteHtml}
      `;

      const drawerHtml = expanded
        ? `
          <div class="idea-drawer">
            <div class="drawer-row">
              <div class="feas-group">
                <button type="button" class="feas-btn js-feas ${feas === 'einfach' ? 'active-einfach' : ''}" data-id="${item.id}" data-feas="einfach"><span class="dot-sm dot-green"></span>Einfach</button>
                <button type="button" class="feas-btn js-feas ${feas === 'mittel' ? 'active-mittel' : ''}" data-id="${item.id}" data-feas="mittel"><span class="dot-sm dot-amber"></span>Mittel</button>
                <button type="button" class="feas-btn js-feas ${feas === 'aufwaendig' ? 'active-aufwaendig' : ''}" data-id="${item.id}" data-feas="aufwaendig"><span class="dot-sm dot-red"></span>Aufwändig</button>
                <button type="button" class="feas-btn js-vote-bulk" data-id="${item.id}" data-delta="10">+10 Meldungen</button>
              </div>
              <div style="display:flex; gap:12px; flex-wrap:wrap;">
                <button type="button" class="text-link js-jira" data-id="${item.id}" data-type="Story">→ Jira Story</button>
                <button type="button" class="text-link js-jira" data-id="${item.id}" data-type="Feature">→ Jira Feature</button>
                <a class="text-link" href="/api/stories/${item.id}/export/markdown">Markdown</a>
                <button type="button" class="text-link danger js-delete" data-id="${item.id}">Löschen</button>
              </div>
            </div>

            <form class="decision-form js-notes" data-id="${item.id}">
              <input type="text" name="internalNote" value="${esc(item.internal_note || '')}" placeholder="Systemlogik / Entwickler-Notiz (intern)…" />
              <div style="display:flex; justify-content:flex-end;">
                <button type="submit" class="st-btn active">Notiz sichern</button>
              </div>
            </form>

            <div class="story-box">
              <div class="drawer-label">User Story &amp; Tasks</div>
              <p class="story-line">${esc(item.user_story)}</p>
              <ul class="task-list">
                ${tasks
                  .map(
                    (t) => `
                    <li class="${t.done ? 'done' : ''}">
                      <input type="checkbox" class="js-task" data-story-id="${item.id}" data-task-id="${esc(t.id)}" ${t.done ? 'checked' : ''} />
                      <span>${esc(t.title)}</span>
                    </li>`
                  )
                  .join('')}
              </ul>
            </div>

            <div>
              <div class="drawer-label">Status &amp; Kunden-Wording</div>
              <div class="feas-group">
                <button type="button" class="st-btn js-pick ${pending?.status === 'Geprüft' ? 'active' : ''}" data-id="${item.id}" data-status="Geprüft">Geprüft</button>
                <button type="button" class="st-btn js-pick ${pending?.status === 'In Arbeit' ? 'active' : ''}" data-id="${item.id}" data-status="In Arbeit">In Arbeit</button>
                <button type="button" class="st-btn js-pick ${pending?.status === 'Umgesetzt' ? 'active' : ''}" data-id="${item.id}" data-status="Umgesetzt">Erledigt</button>
                <button type="button" class="st-btn js-pick ${pending?.status === 'Abgelehnt' ? 'active' : ''}" data-id="${item.id}" data-status="Abgelehnt">Ablehnen</button>
              </div>
              ${
                pending
                  ? `
                    <form class="decision-form js-decide" data-id="${item.id}" data-status="${esc(pending.status)}" style="margin-top:10px;">
                      <textarea name="publicResponse" rows="2" required placeholder="Kunden-Wording (E-Mail / Telefon)">${esc(WORDING_TEMPLATES[pending.status] || '')}</textarea>
                      <input type="text" name="internalNote" value="${esc(item.internal_note || '')}" placeholder="Systemlogik / Interne Begründung (optional)" />
                      <div><button type="submit" class="btn-primary">Speichern</button></div>
                    </form>
                  `
                  : ''
              }
            </div>
          </div>
        `
        : '';

      return `
        <article class="idea-card ${state.freshId === item.id ? 'fresh' : ''}">
          <div class="idea-row">
            <button type="button" class="vote-box ${voted ? 'voted' : ''} js-vote" data-id="${item.id}" title="Meldung zählen (+1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>
              <span class="vote-count">${item.votes}×</span>
            </button>
            <div class="idea-body js-toggle" data-id="${item.id}">
              <div class="card-head">
                <h2 class="idea-title">${esc(item.title)}</h2>
                <div class="head-meta">
                  ${item.jira_key ? `<a class="tag-mini" href="${esc(item.jira_url || '#')}" target="_blank" rel="noopener" style="text-decoration:none;">${esc(item.jira_key)}</a>` : ''}
                  ${pressureBadge}
                  ${ampelDot(feas)}
                  <span>${esc(channel)}</span>
                  ${statusBadge(item.status)}
                </div>
              </div>
              <p class="idea-text">${esc(item.raw_feedback)}</p>
              <div style="margin-top:5px; font-size:0.75rem; color:#64748b;">
                ${esc(dateStr)}${esc(author)}
              </div>
              ${loopBars(item.status)}
              ${notesHtml}
            </div>
          </div>
          ${drawerHtml}
        </article>
      `;
    })
    .join('');
}

// --- Management-Report mit SVG-Grafiken (Ampel-Donut, Ressourcen-Balken, Monatsverlauf, Credits) ---
function buildDonutSvg({ einfach, mittel, aufwaendig }) {
  const total = einfach + mittel + aufwaendig;
  const r = 46;
  const c = 2 * Math.PI * r;
  if (total === 0) {
    return `
      <svg width="124" height="124" viewBox="0 0 124 124" aria-label="Ampel-Verteilung">
        <circle cx="62" cy="62" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="14"/>
        <text x="62" y="66" text-anchor="middle" font-size="14" font-weight="700" fill="#64748b">0</text>
      </svg>
    `;
  }
  const segs = [
    { val: einfach, color: '#22c55e' },
    { val: mittel, color: '#f59e0b' },
    { val: aufwaendig, color: '#ef4444' }
  ];
  let offset = 0;
  const circles = segs
    .filter((s) => s.val > 0)
    .map((s) => {
      const len = (s.val / total) * c;
      const el = `<circle cx="62" cy="62" r="${r}" fill="none" stroke="${s.color}" stroke-width="14" stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 62 62)"/>`;
      offset += len;
      return el;
    })
    .join('');

  return `
    <svg width="124" height="124" viewBox="0 0 124 124" aria-label="Ampel-Verteilung">
      <circle cx="62" cy="62" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="14"/>
      ${circles}
      <text x="62" y="61" text-anchor="middle" font-size="20" font-weight="700" fill="#0f172a">${total}</text>
      <text x="62" y="76" text-anchor="middle" font-size="10" fill="#64748b">Themen</text>
    </svg>
  `;
}

function buildMonthlySvg(mentionsByMonth = []) {
  if (!mentionsByMonth.length) {
    return '<div class="empty-state" style="padding:18px;">Keine Monatsdaten im gewählten Zeitraum.</div>';
  }
  const maxVal = Math.max(...mentionsByMonth.map((m) => m.total), 1);
  const w = 620;
  const h = 135;
  const padL = 24;
  const padB = 24;
  const chartH = h - padB - 18;
  const slotW = (w - padL * 2) / Math.max(mentionsByMonth.length, 1);
  const barW = Math.min(34, Math.max(12, slotW - 10));

  const bars = mentionsByMonth
    .map((m, i) => {
      const bh = Math.max(4, Math.round((m.total / maxVal) * chartH));
      const x = padL + i * slotW + (slotW - barW) / 2;
      const y = h - padB - bh;
      return `
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh}" rx="4" fill="#0f172a"/>
        <text x="${(x + barW / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="600" fill="#0f172a">${m.total}×</text>
        <text x="${(x + barW / 2).toFixed(1)}" y="${h - 7}" text-anchor="middle" font-size="10" fill="#64748b">${esc(m.month.slice(5))}/${esc(m.month.slice(2, 4))}</text>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${w} ${h}" width="100%" style="max-height:150px; display:block;" aria-label="Monatsverlauf Meldungen">
      <line x1="${padL}" y1="${h - padB}" x2="${w - padL}" y2="${h - padB}" stroke="#e2e8f0" stroke-width="1"/>
      ${bars}
    </svg>
  `;
}

async function loadReport() {
  const { from, to, feasibility, status, minutesPerRequest } = state.report;
  const params = new URLSearchParams({
    from,
    to,
    feasibility,
    status,
    minutesPerRequest: String(minutesPerRequest)
  });

  document.getElementById('rep-csv-link').href = `/api/stories/export/csv?${params.toString()}`;
  const rep = await api(`/api/report?${params.toString()}`);

  const maxDriver = Math.max(...rep.topResourceDrivers.map((d) => d.mentions), 1);
  const driversHtml =
    rep.topResourceDrivers.length === 0
      ? '<div class="empty-state" style="padding:18px;">Keine Einträge im gewählten Filter.</div>'
      : `<div class="hbar-list">
          ${rep.topResourceDrivers
            .map((d) => {
              const pct = Math.max(6, Math.round((d.mentions / maxDriver) * 100));
              return `
                <div class="hbar-item">
                  <div class="hbar-meta">
                    <span style="font-weight:550; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(d.title)}</span>
                    <span style="white-space:nowrap; color:#475569;"><strong>${d.mentions}×</strong> · ${d.hours} h</span>
                  </div>
                  <div class="hbar-track">
                    <div class="hbar-fill hbar-${esc(d.feasibility)}" style="width:${pct}%"></div>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>`;

  const creditsHtml =
    rep.credits.length > 0
      ? `
        <div class="chart-title" style="margin-top:6px;">Ideengeber &amp; Credits</div>
        <div class="credits-grid">
          ${rep.credits
            .map(
              (c) => `
              <div class="credit-card">
                <div class="credit-name">${esc(c.name)}</div>
                <div style="color:#64748b; margin-top:2px;">${c.ideas} Ideen · ${c.implemented} umgesetzt · ${c.mentions}× Meldungen</div>
              </div>
            `
            )
            .join('')}
        </div>
      `
      : '';

  const rowsHtml =
    rep.stories.length === 0
      ? '<tr><td colspan="7" style="color:#64748b; text-align:center; padding:18px;">Keine Einträge für diesen Zeitraum / Filter.</td></tr>'
      : rep.stories
          .map((s) => {
            const hrs = Math.round((((Number(s.votes) || 1) * minutesPerRequest) / 60) * 10) / 10;
            return `
              <tr>
                <td style="white-space:nowrap;">${esc(fmtDateCH(s.created_at))}</td>
                <td>
                  <strong>${esc(s.title)}</strong>
                  ${s.internal_note ? `<div style="color:#b45309; font-size:0.75rem;">Dev: ${esc(s.internal_note)}</div>` : ''}
                </td>
                <td>${esc(s.submitted_by || '–')}</td>
                <td>${esc(s.channel || 'E-Mail')}</td>
                <td>${ampelDot(s.feasibility)} ${esc(s.feasibility || 'mittel')}</td>
                <td>${esc(s.status)}</td>
                <td style="white-space:nowrap;"><strong>${s.votes}×</strong> (${hrs} h)</td>
              </tr>
            `;
          })
          .join('');

  const pressureHtml =
    rep.pressureItems && rep.pressureItems.length > 0
      ? `
        <div class="pressure-box">
          <div class="chart-title" style="color:#b91c1c; margin-bottom:6px;">Wiedervorlage &amp; Handlungsdruck (trotz Ablehnung weiter gefragt / unzufrieden)</div>
          ${rep.pressureItems
            .map(
              (p) => `
              <div class="pressure-item">
                <span><strong>${esc(p.title)}</strong> (${esc(p.status)})</span>
                <span style="white-space:nowrap; color:#b91c1c; font-weight:600;">
                  ${p.postDecisionMentions > 0 ? `+${p.postDecisionMentions}× danach` : `${p.totalMentions}× total`} · 👍 ${p.decisionUp} / 👎 ${p.decisionDown}
                </span>
              </div>
            `
            )
            .join('')}
        </div>
      `
      : '';

  document.getElementById('report-sheet').innerHTML = `
    <div class="rep-head">
      <div>
        <h1>Requirements Engine — Management-Report</h1>
        <div class="rep-sub">
          Zeitraum: <strong>${esc(fmtDateCH(from))} – ${esc(fmtDateCH(to))}</strong>
          · Filter: Ampel ${esc(feasibility)} · Status ${esc(status)}
        </div>
      </div>
      <div class="rep-sub">Erstellt am ${esc(fmtDateCH(rep.generatedAt))}</div>
    </div>

    ${pressureHtml}

    <div class="rep-kpis">
      <div class="rep-kpi">
        <span class="rep-kpi-label">Themen</span>
        <span class="rep-kpi-val">${rep.summary.totalStories}</span>
        <span class="rep-kpi-sub">${rep.byStatus.erledigt} umgesetzt · ${rep.byStatus.inArbeit} in Arbeit</span>
      </div>
      <div class="rep-kpi">
        <span class="rep-kpi-label">Anfragen Total</span>
        <span class="rep-kpi-val">${rep.summary.totalMentions}×</span>
        <span class="rep-kpi-sub">Erfasste Kunden- &amp; Team-Meldungen</span>
      </div>
      <div class="rep-kpi">
        <span class="rep-kpi-label">Ressourcen-Aufwand</span>
        <span class="rep-kpi-val">${rep.summary.totalHours} h</span>
        <span class="rep-kpi-sub">≈ ${rep.summary.totalWorkdays} Arbeitstage (à ${minutesPerRequest} Min.)</span>
      </div>
      <div class="rep-kpi">
        <span class="rep-kpi-label">Umsetzungsquote</span>
        <span class="rep-kpi-val">${rep.summary.implementationRate} %</span>
        <span class="rep-kpi-sub">${rep.byFeasibility.einfach} Quick Wins (Einfach)</span>
      </div>
    </div>

    <div class="rep-charts">
      <div class="chart-card">
        <h3 class="chart-title">Machbarkeits-Ampel</h3>
        <div class="donut-wrap">
          ${buildDonutSvg(rep.byFeasibility)}
          <div class="donut-legend">
            <div class="donut-legend-row"><span><span class="dot-sm dot-green"></span> Einfach</span><strong>${rep.byFeasibility.einfach}</strong></div>
            <div class="donut-legend-row"><span><span class="dot-sm dot-amber"></span> Mittel</span><strong>${rep.byFeasibility.mittel}</strong></div>
            <div class="donut-legend-row"><span><span class="dot-sm dot-red"></span> Aufwändig</span><strong>${rep.byFeasibility.aufwaendig}</strong></div>
          </div>
        </div>
      </div>

      <div class="chart-card">
        <h3 class="chart-title">Top Ressourcen-Treiber (Meldungen &amp; Stunden)</h3>
        ${driversHtml}
      </div>
    </div>

    <div class="chart-card" style="margin-bottom:22px;">
      <h3 class="chart-title">Monatlicher Verlauf der Anfragen</h3>
      ${buildMonthlySvg(rep.mentionsByMonth)}
    </div>

    ${creditsHtml}

    <div class="chart-title">Einzelübersicht (${rep.stories.length})</div>
    <table class="rep-table">
      <thead>
        <tr>
          <th>Datum</th>
          <th>Thema</th>
          <th>Idee von</th>
          <th>Kanal</th>
          <th>Ampel</th>
          <th>Status</th>
          <th>Menge / Aufwand</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

async function handleSubmit(ev) {
  ev.preventDefault();
  const textarea = document.getElementById('fb-text');
  const authorInput = document.getElementById('fb-author');
  const dupBanner = document.getElementById('dup-banner');
  const author = authorInput.value.trim();

  if (author) {
    localStorage.setItem('re_author', author);
  }

  try {
    const res = await api('/api/stories', {
      method: 'POST',
      body: JSON.stringify({
        rawFeedback: textarea.value.trim(),
        channel: state.channel,
        submittedBy: author,
        origin: state.channel === 'Intern / Team' ? 'betrieb' : 'kunde'
      })
    });

    textarea.value = '';
    state.freshId = res.story.id;
    state.ampel = 'alle';
    document.querySelectorAll('.ampel-btn[data-ampel]').forEach((b) => b.classList.toggle('active', b.dataset.ampel === 'alle'));

    if (res.duplicates && res.duplicates.length > 0) {
      const top = res.duplicates[0];
      dupBanner.textContent = `Ähnlich zu «${top.title}» (${top.similarityPercent} %).`;
      dupBanner.classList.remove('hidden');
    } else {
      dupBanner.classList.add('hidden');
    }

    showToast('Erfasst.');
    await Promise.all([loadIdeas(), loadHealth()]);
  } catch (err) {
    showToast(err.message);
  }
}

function init() {
  if (new URLSearchParams(window.location.search).get('embed') === '1') {
    document.body.classList.add('embed-mode');
  }

  const savedAuthor = localStorage.getItem('re_author') || '';
  document.getElementById('fb-author').value = savedAuthor;

  document.getElementById('rep-from').value = state.report.from;
  document.getElementById('rep-to').value = state.report.to;

  document.getElementById('brand-link').addEventListener('click', (ev) => {
    ev.preventDefault();
    setView('board');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('btn-toggle-report').addEventListener('click', () => {
    setView(state.view === 'report' ? 'board' : 'report');
  });

  document.getElementById('btn-export-pdf').addEventListener('click', () => window.print());

  document.getElementById('rep-from').addEventListener('change', (ev) => {
    state.report.from = ev.target.value;
    loadReport();
  });
  document.getElementById('rep-to').addEventListener('change', (ev) => {
    state.report.to = ev.target.value;
    loadReport();
  });
  document.getElementById('rep-year-curr').addEventListener('click', () => {
    state.report.from = `${currentYear}-01-01`;
    state.report.to = `${currentYear}-12-31`;
    document.getElementById('rep-from').value = state.report.from;
    document.getElementById('rep-to').value = state.report.to;
    loadReport();
  });
  document.getElementById('rep-year-prev').addEventListener('click', () => {
    state.report.from = `${currentYear - 1}-01-01`;
    state.report.to = `${currentYear - 1}-12-31`;
    document.getElementById('rep-from').value = state.report.from;
    document.getElementById('rep-to').value = state.report.to;
    loadReport();
  });

  document.querySelectorAll('[data-rep-feas]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.report.feasibility = btn.dataset.repFeas;
      document.querySelectorAll('[data-rep-feas]').forEach((b) => b.classList.toggle('active', b === btn));
      loadReport();
    });
  });

  document.querySelectorAll('[data-rep-status]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.report.status = btn.dataset.repStatus;
      document.querySelectorAll('[data-rep-status]').forEach((b) => b.classList.toggle('active', b === btn));
      loadReport();
    });
  });

  document.querySelectorAll('[data-rep-min]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.report.minutesPerRequest = Number(btn.dataset.repMin);
      document.querySelectorAll('[data-rep-min]').forEach((b) => b.classList.toggle('active', b === btn));
      loadReport();
    });
  });

  document.querySelectorAll('.ch-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.channel = btn.dataset.channel;
      document.querySelectorAll('.ch-btn').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  const form = document.getElementById('feedback-form');
  form.addEventListener('submit', handleSubmit);
  document.getElementById('fb-text').addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
      ev.preventDefault();
      form.requestSubmit();
    }
  });

  document.querySelectorAll('.ampel-btn[data-ampel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.ampel = btn.dataset.ampel;
      document.querySelectorAll('.ampel-btn[data-ampel]').forEach((b) => b.classList.toggle('active', b === btn));
      loadIdeas();
    });
  });

  document.querySelectorAll('.status-group .st-btn[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;
      document.querySelectorAll('.status-group .st-btn[data-mode]').forEach((b) => b.classList.toggle('active', b === btn));
      loadIdeas();
    });
  });

  document.getElementById('filter-q').addEventListener('input', () => {
    clearTimeout(init._t);
    init._t = setTimeout(loadIdeas, 180);
  });

  document.getElementById('ideas-list').addEventListener('click', async (ev) => {
    const copyBtn = ev.target.closest('.js-copy');
    if (copyBtn) {
      ev.stopPropagation();
      try {
        await navigator.clipboard.writeText(copyBtn.dataset.text || '');
        showToast('Kopiert.');
      } catch {
        showToast('Kopieren fehlgeschlagen.');
      }
      return;
    }

    const jiraBtn = ev.target.closest('.js-jira');
    if (jiraBtn) {
      ev.stopPropagation();
      const id = Number(jiraBtn.dataset.id);
      const issueType = jiraBtn.dataset.type || 'Story';
      try {
        const res = await api(`/api/stories/${id}/jira`, {
          method: 'POST',
          body: JSON.stringify({ issueType })
        });
        if (res.mode === 'api') {
          showToast(`Jira ${issueType} erstellt: ${res.jiraKey}`);
          await loadIdeas();
        } else {
          try {
            await navigator.clipboard.writeText(res.markup || '');
            showToast(`Jira-${issueType} in Zwischenablage kopiert.`);
          } catch {
            showToast(`Jira-${issueType} bereit.`);
          }
        }
      } catch (err) {
        showToast(err.message);
      }
      return;
    }

    const delBtn = ev.target.closest('.js-delete');
    if (delBtn) {
      ev.stopPropagation();
      await api(`/api/stories/${delBtn.dataset.id}`, { method: 'DELETE' });
      state.expandedId = null;
      showToast('Gelöscht.');
      await Promise.all([loadIdeas(), loadHealth()]);
      return;
    }

    const decVoteBtn = ev.target.closest('.js-dec-vote');
    if (decVoteBtn) {
      ev.stopPropagation();
      const id = Number(decVoteBtn.dataset.id);
      const sentiment = decVoteBtn.dataset.sentiment;
      await api(`/api/stories/${id}/decision-feedback`, {
        method: 'POST',
        body: JSON.stringify({
          sentiment,
          author: localStorage.getItem('re_author') || ''
        })
      });
      showToast(sentiment === 'down' ? 'Unzufriedenheit gezählt.' : 'Zustimmung gezählt.');
      await loadIdeas();
      return;
    }

    const decCommentOpen = ev.target.closest('.js-dec-comment-open');
    if (decCommentOpen) {
      ev.stopPropagation();
      const id = Number(decCommentOpen.dataset.id);
      state.pendingDecFeedback = state.pendingDecFeedback?.id === id ? null : { id, sentiment: 'down' };
      await loadIdeas();
      return;
    }

    const voteBulk = ev.target.closest('.js-vote-bulk');
    if (voteBulk) {
      ev.stopPropagation();
      const id = Number(voteBulk.dataset.id);
      const delta = Number(voteBulk.dataset.delta || 10);
      await api(`/api/stories/${id}/vote`, { method: 'POST', body: JSON.stringify({ delta }) });
      showToast(`+${delta} Meldungen gezählt.`);
      await Promise.all([loadIdeas(), loadHealth()]);
      return;
    }

    const voteBtn = ev.target.closest('.js-vote');
    if (voteBtn) {
      const id = Number(voteBtn.dataset.id);
      await api(`/api/stories/${id}/vote`, { method: 'POST' });
      state.votedIds.add(id);
      localStorage.setItem('re_voted', JSON.stringify([...state.votedIds]));
      await Promise.all([loadIdeas(), loadHealth()]);
      return;
    }

    const feasBtn = ev.target.closest('.js-feas');
    if (feasBtn) {
      await api(`/api/stories/${feasBtn.dataset.id}/feasibility`, {
        method: 'PATCH',
        body: JSON.stringify({ feasibility: feasBtn.dataset.feas })
      });
      await loadIdeas();
      return;
    }

    const pickBtn = ev.target.closest('.js-pick');
    if (pickBtn) {
      state.pendingStatus = { id: Number(pickBtn.dataset.id), status: pickBtn.dataset.status };
      await loadIdeas();
      return;
    }

    const body = ev.target.closest('.js-toggle');
    if (body) {
      const id = Number(body.dataset.id);
      state.expandedId = state.expandedId === id ? null : id;
      state.pendingStatus = null;
      await loadIdeas();
    }
  });

  document.getElementById('ideas-list').addEventListener('change', async (ev) => {
    const cb = ev.target.closest('.js-task');
    if (!cb) return;
    await api(`/api/stories/${cb.dataset.storyId}/tasks/${cb.dataset.taskId}`, { method: 'PATCH' });
    await loadIdeas();
  });

  document.getElementById('ideas-list').addEventListener('submit', async (ev) => {
    const decCommentForm = ev.target.closest('.js-dec-comment-form');
    if (decCommentForm) {
      ev.preventDefault();
      const comment = new FormData(decCommentForm).get('comment');
      await api(`/api/stories/${decCommentForm.dataset.id}/decision-feedback`, {
        method: 'POST',
        body: JSON.stringify({
          sentiment: 'down',
          comment,
          author: localStorage.getItem('re_author') || ''
        })
      });
      state.pendingDecFeedback = null;
      showToast('Rückmeldung zum Entscheid gespeichert.');
      await loadIdeas();
      return;
    }

    const notesForm = ev.target.closest('.js-notes');
    if (notesForm) {
      ev.preventDefault();
      const fd = new FormData(notesForm);
      await api(`/api/stories/${notesForm.dataset.id}/notes`, {
        method: 'PATCH',
        body: JSON.stringify({ internalNote: fd.get('internalNote') })
      });
      showToast('Notiz gespeichert.');
      await loadIdeas();
      return;
    }

    const formEl = ev.target.closest('.js-decide');
    if (!formEl) return;
    ev.preventDefault();
    const fd = new FormData(formEl);
    try {
      await api(`/api/stories/${formEl.dataset.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          status: formEl.dataset.status,
          publicResponse: fd.get('publicResponse'),
          internalNote: fd.get('internalNote')
        })
      });
      state.pendingStatus = null;
      showToast('Gespeichert.');
      await Promise.all([loadIdeas(), loadHealth()]);
    } catch (err) {
      showToast(err.message);
    }
  });

  loadHealth();
  loadIdeas();
  setInterval(loadHealth, 20000);
}

init();
