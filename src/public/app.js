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
  composerDurationSec: 0,
  report: {
    from: `${currentYear}-01-01`,
    to: `${currentYear}-12-31`,
    granularity: 'month', // 'day' | 'week' | 'month' | 'year'
    storyId: null,
    feasibility: 'Alle',
    status: 'Alle',
    timeMode: 'measured', // 'measured' | 'projected'
    minutesPerRequest: 5
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

function parseMMSS(raw) {
  const txt = String(raw ?? '').trim();
  if (!txt) return 0;
  if (txt.includes(':')) {
    const [mStr, sStr] = txt.split(':');
    const m = Math.max(0, Math.min(480, parseInt(mStr || '0', 10) || 0));
    const s = Math.max(0, Math.min(59, parseInt(sStr || '0', 10) || 0));
    return m * 60 + s;
  }
  const mins = parseInt(txt, 10);
  if (!Number.isFinite(mins) || mins <= 0) return 0;
  return Math.min(480, mins) * 60;
}

function fmtMMSS(totalSec) {
  const sec = Math.max(0, Math.round(Number(totalSec) || 0));
  if (sec === 0) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtDurationHuman(totalSec, { estimated = false } = {}) {
  const sec = Math.max(0, Math.round(Number(totalSec) || 0));
  if (sec === 0) return '–';
  const prefix = estimated ? '~' : '';
  const hours = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const remSec = sec % 60;
  if (hours > 0) {
    return `${prefix}${hours} h ${String(mins).padStart(2, '0')} m`;
  }
  if (mins > 0) {
    return remSec > 0 ? `${prefix}${mins}m ${String(remSec).padStart(2, '0')}s` : `${prefix}${mins}m`;
  }
  return `${prefix}${remSec}s`;
}

// --- Wiederverwendbarer M:S + 2-Spalten Scroll-Wheel Picker (ohne Dropdown-Menüs) ---
function renderDurationPickerHtml({ idAttr = '', initialSec = 0, placeholder = 'M:S' } = {}) {
  const minItems = Array.from({ length: 61 }, (_, i) => {
    const lbl = String(i).padStart(2, '0');
    return `<div class="wheel-opt" data-val="${i}">${lbl}</div>`;
  }).join('');

  const secItems = Array.from({ length: 12 }, (_, idx) => {
    const val = idx * 5;
    const lbl = String(val).padStart(2, '0');
    return `<div class="wheel-opt" data-val="${val}">${lbl}</div>`;
  }).join('');

  const valStr = initialSec > 0 ? fmtMMSS(initialSec) : '';
  return `
    <div class="dur-picker" data-dur-picker ${idAttr ? `id="${esc(idAttr)}"` : ''} data-sec="${initialSec}">
      <span class="dur-icon" aria-hidden="true">⏱</span>
      <input
        type="text"
        class="dur-input"
        inputmode="numeric"
        placeholder="${esc(placeholder)}"
        value="${esc(valStr)}"
        aria-label="Dauer in Minuten:Sekunden"
        title="Dauer M:S eintippen oder mit Mausrad drehen"
      />
      <button type="button" class="dur-wheel-btn" aria-label="Zeitrad öffnen" title="Zeitrad (Min : Sek)">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="dur-popover hidden" role="dialog" aria-label="Zeitrad Minuten und Sekunden">
        <div class="wheel-head"><span>Min</span><span></span><span>Sek</span></div>
        <div class="wheel-body">
          <div class="wheel-highlight" aria-hidden="true"></div>
          <div class="wheel-col" data-wheel="min">${minItems}</div>
          <div class="wheel-colon">:</div>
          <div class="wheel-col" data-wheel="sec">${secItems}</div>
        </div>
        <div class="wheel-presets">
          <button type="button" class="wp-btn" data-preset="120">2:00</button>
          <button type="button" class="wp-btn" data-preset="300">5:00</button>
          <button type="button" class="wp-btn" data-preset="600">10:00</button>
          <button type="button" class="wp-btn" data-preset="900">15:00</button>
          <button type="button" class="wp-btn" data-preset="0">0:00</button>
        </div>
      </div>
    </div>
  `;
}

function bindDurationPicker(pickerEl, onChange) {
  if (!pickerEl || pickerEl.dataset.bound === '1') return;
  pickerEl.dataset.bound = '1';

  const input = pickerEl.querySelector('.dur-input');
  const toggleBtn = pickerEl.querySelector('.dur-wheel-btn');
  const popover = pickerEl.querySelector('.dur-popover');
  const minCol = pickerEl.querySelector('[data-wheel="min"]');
  const secCol = pickerEl.querySelector('[data-wheel="sec"]');
  const ITEM_H = 32;
  let syncingWheel = false;

  function highlightSelected(minVal, secVal) {
    minCol.querySelectorAll('.wheel-opt').forEach((el) => {
      el.classList.toggle('is-selected', Number(el.dataset.val) === minVal);
    });
    const nearestSec = Math.round(secVal / 5) * 5;
    secCol.querySelectorAll('.wheel-opt').forEach((el) => {
      el.classList.toggle('is-selected', Number(el.dataset.val) === (nearestSec >= 60 ? 55 : nearestSec));
    });
  }

  function scrollWheelsTo(totalSec, smoothScroll = false) {
    const m = Math.min(60, Math.floor(totalSec / 60));
    const s = totalSec % 60;
    const secIdx = Math.min(11, Math.round(s / 5));
    syncingWheel = true;
    minCol.scrollTo({ top: m * ITEM_H, behavior: smoothScroll ? 'smooth' : 'auto' });
    secCol.scrollTo({ top: secIdx * ITEM_H, behavior: smoothScroll ? 'smooth' : 'auto' });
    highlightSelected(m, s);
    setTimeout(() => {
      syncingWheel = false;
    }, smoothScroll ? 220 : 40);
  }

  function setSeconds(totalSec, { syncText = true, syncWheel = true, smoothScroll = false } = {}) {
    const clamped = Math.max(0, Math.min(28800, Math.round(totalSec || 0)));
    pickerEl.dataset.sec = String(clamped);
    if (syncText) {
      input.value = clamped > 0 ? fmtMMSS(clamped) : '';
    }
    if (syncWheel && !popover.classList.contains('hidden')) {
      scrollWheelsTo(clamped, smoothScroll);
    }
    if (typeof onChange === 'function') onChange(clamped);
  }

  function openPopover() {
    document.querySelectorAll('.dur-popover:not(.hidden)').forEach((other) => {
      if (other !== popover) {
        other.classList.add('hidden');
        other.closest('.dur-picker')?.classList.remove('is-open');
      }
    });
    popover.classList.remove('hidden');
    pickerEl.classList.add('is-open');
    scrollWheelsTo(Number(pickerEl.dataset.sec || 0), false);
  }

  function closePopover() {
    popover.classList.add('hidden');
    pickerEl.classList.remove('is-open');
  }

  toggleBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (popover.classList.contains('hidden')) openPopover();
    else closePopover();
  });

  // Direkte M:S Eingabe
  input.addEventListener('input', () => {
    const sec = parseMMSS(input.value);
    pickerEl.dataset.sec = String(sec);
    if (!popover.classList.contains('hidden')) {
      scrollWheelsTo(sec, false);
    }
    if (typeof onChange === 'function') onChange(sec);
  });

  input.addEventListener('blur', () => {
    const sec = parseMMSS(input.value);
    setSeconds(sec, { syncText: true, syncWheel: false });
  });

  // Mausrad direkt über dem M:S-Feld (±15s, mit Shift ±60s)
  input.addEventListener(
    'wheel',
    (ev) => {
      ev.preventDefault();
      const step = ev.shiftKey ? 60 : 15;
      const cur = Number(pickerEl.dataset.sec || 0);
      const next = ev.deltaY < 0 ? cur + step : Math.max(0, cur - step);
      setSeconds(next, { syncText: true, syncWheel: true, smoothScroll: false });
    },
    { passive: false }
  );

  // Pfeiltasten ↑ / ↓ im Eingabefeld
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
      ev.preventDefault();
      const step = ev.shiftKey ? 60 : 15;
      const cur = Number(pickerEl.dataset.sec || 0);
      const next = ev.key === 'ArrowUp' ? cur + step : Math.max(0, cur - step);
      setSeconds(next, { syncText: true, syncWheel: true, smoothScroll: false });
    } else if (ev.key === 'Escape') {
      closePopover();
    }
  });

  // 2-Spalten Scroll-Wheel synchronisieren
  let scrollTimer = null;
  function handleWheelScroll() {
    if (syncingWheel) return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const m = Math.max(0, Math.min(60, Math.round(minCol.scrollTop / ITEM_H)));
      const sIdx = Math.max(0, Math.min(11, Math.round(secCol.scrollTop / ITEM_H)));
      const s = sIdx * 5;
      highlightSelected(m, s);
      setSeconds(m * 60 + s, { syncText: true, syncWheel: false });
    }, 55);
  }
  minCol.addEventListener('scroll', handleWheelScroll, { passive: true });
  secCol.addEventListener('scroll', handleWheelScroll, { passive: true });

  // Klick direkt auf eine Zahl im Wheel
  minCol.addEventListener('click', (ev) => {
    const opt = ev.target.closest('.wheel-opt');
    if (!opt) return;
    ev.stopPropagation();
    const curS = Number(pickerEl.dataset.sec || 0) % 60;
    const m = Number(opt.dataset.val);
    setSeconds(m * 60 + curS, { syncText: true, syncWheel: true, smoothScroll: true });
  });

  secCol.addEventListener('click', (ev) => {
    const opt = ev.target.closest('.wheel-opt');
    if (!opt) return;
    ev.stopPropagation();
    const curM = Math.floor(Number(pickerEl.dataset.sec || 0) / 60);
    const s = Number(opt.dataset.val);
    setSeconds(curM * 60 + s, { syncText: true, syncWheel: true, smoothScroll: true });
  });

  // Schnell-Presets (2:00 / 5:00 / 10:00 / 15:00 / 0:00)
  popover.querySelectorAll('.wp-btn').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      setSeconds(Number(btn.dataset.preset || 0), { syncText: true, syncWheel: true, smoothScroll: true });
    });
  });

  popover.addEventListener('click', (ev) => ev.stopPropagation());

  pickerEl._setSeconds = setSeconds;
}

document.addEventListener('click', (ev) => {
  if (!ev.target.closest('.dur-picker')) {
    document.querySelectorAll('.dur-popover:not(.hidden)').forEach((pop) => {
      pop.classList.add('hidden');
      pop.closest('.dur-picker')?.classList.remove('is-open');
    });
  }
});

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), 2400);
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
  if (status === 'In Arbeit' || status === 'Angenommen') return '<span class="tag-mini tag-blue">In Arbeit</span>';
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
      const totalSec = Number(item.total_duration_seconds) || 0;
      const timedCnt = Number(item.timed_mentions) || 0;
      const avgSec = timedCnt > 0 ? Math.round(totalSec / timedCnt) : 0;

      const pressureBadge = hasPressure
        ? `<span class="tag-mini tag-pressure">${postMentions > 0 ? `+${postMentions}× nach Ablehnung` : 'Neu prüfen'}</span>`
        : '';

      const timeChip =
        totalSec > 0
          ? `<span class="time-chip" title="Echt erfasste Gesprächs-/Taskdauer aus ${timedCnt} Fällen">⏱ ${esc(fmtDurationHuman(totalSec))}${avgSec > 0 ? ` · Ø ${esc(fmtMMSS(avgSec))}` : ''}</span>`
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
                      `<div class="dv-comment ${c.sentiment === 'down' ? 'is-down' : ''}">${c.sentiment === 'down' ? '👎' : '👍'} ${esc(c.comment)}${c.author ? ` <span style="color:var(--silver-3);">— ${esc(c.author)}</span>` : ''}</div>`
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
            <form class="quant-box js-quant-form" data-id="${item.id}">
              <span class="drawer-label" style="margin:0;">Meldungen &amp; Dauer</span>
              <div class="qty-stepper">
                <button type="button" class="qty-btn js-qty-step" data-step="-1" aria-label="Weniger">−</button>
                <input type="number" name="delta" class="qty-input" min="1" max="1000" value="1" aria-label="Anzahl Meldungen" />
                <button type="button" class="qty-btn js-qty-step" data-step="1" aria-label="Mehr">+</button>
              </div>
              <button type="button" class="feas-btn js-qty-set" data-val="5">5×</button>
              <button type="button" class="feas-btn js-qty-set" data-val="10">10×</button>
              ${renderDurationPickerHtml({ initialSec: avgSec, placeholder: 'M:S / Fall' })}
              <button type="submit" class="btn-primary js-quant-submit">Buchen</button>
            </form>

            <div class="drawer-row">
              <div class="feas-group">
                <button type="button" class="feas-btn js-feas ${feas === 'einfach' ? 'active-einfach' : ''}" data-id="${item.id}" data-feas="einfach"><span class="dot-sm dot-green"></span>Einfach</button>
                <button type="button" class="feas-btn js-feas ${feas === 'mittel' ? 'active-mittel' : ''}" data-id="${item.id}" data-feas="mittel"><span class="dot-sm dot-amber"></span>Mittel</button>
                <button type="button" class="feas-btn js-feas ${feas === 'aufwaendig' ? 'active-aufwaendig' : ''}" data-id="${item.id}" data-feas="aufwaendig"><span class="dot-sm dot-red"></span>Aufwändig</button>
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
            <button type="button" class="vote-box ${voted ? 'voted' : ''} js-vote" data-id="${item.id}" title="Schnell zählen (+1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>
              <span class="vote-count">${item.votes}×</span>
            </button>
            <div class="idea-body js-toggle" data-id="${item.id}">
              <div class="card-head">
                <h2 class="idea-title">${esc(item.title)}</h2>
                <div class="head-meta">
                  ${item.jira_key ? `<a class="tag-mini tag-blue" href="${esc(item.jira_url || '#')}" target="_blank" rel="noopener" style="text-decoration:none;">${esc(item.jira_key)}</a>` : ''}
                  ${pressureBadge}
                  ${ampelDot(feas)}
                  <span>${esc(channel)}</span>
                  ${statusBadge(item.status)}
                </div>
              </div>
              <p class="idea-text">${esc(item.raw_feedback)}</p>
              <div class="idea-meta-line">
                <span>${esc(dateStr)}${esc(author)}</span>
                ${timeChip}
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

  // Alle Zeitrad-Picker im aufgeklappten Drawer aktivieren + Live-Vorschau am Buchen-Button
  listEl.querySelectorAll('.js-quant-form').forEach((formEl) => {
    const picker = formEl.querySelector('[data-dur-picker]');
    const qtyInput = formEl.querySelector('input[name="delta"]');
    const submitBtn = formEl.querySelector('.js-quant-submit');

    function syncSubmitLabel() {
      const qty = Math.max(1, Math.min(1000, parseInt(qtyInput.value, 10) || 1));
      const perSec = Number(picker?.dataset.sec || 0);
      const total = qty * perSec;
      submitBtn.textContent = total > 0 ? `+${qty}× (${fmtDurationHuman(total)})` : `+${qty}× buchen`;
    }

    bindDurationPicker(picker, syncSubmitLabel);
    qtyInput.addEventListener('input', syncSubmitLabel);
    formEl.querySelectorAll('.js-qty-step').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const cur = parseInt(qtyInput.value, 10) || 1;
        qtyInput.value = String(Math.max(1, Math.min(1000, cur + Number(btn.dataset.step))));
        syncSubmitLabel();
      });
    });
    formEl.querySelectorAll('.js-qty-set').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        qtyInput.value = btn.dataset.val;
        syncSubmitLabel();
      });
    });
    syncSubmitLabel();
  });
}

// --- Management-Report mit SVG-Grafiken (ONESTRAND Dark + A4 Print-Safe) ---
function buildDonutSvg({ einfach, mittel, aufwaendig }) {
  const total = einfach + mittel + aufwaendig;
  const r = 46;
  const c = 2 * Math.PI * r;
  if (total === 0) {
    return `
      <svg width="124" height="124" viewBox="0 0 124 124" aria-label="Ampel-Verteilung">
        <circle class="svg-track" cx="62" cy="62" r="${r}" fill="none" stroke="rgba(206,214,228,0.16)" stroke-width="14"/>
        <text class="svg-muted" x="62" y="66" text-anchor="middle" font-size="14" font-weight="700" fill="#9aa1ac">0</text>
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
      <circle class="svg-track" cx="62" cy="62" r="${r}" fill="none" stroke="rgba(206,214,228,0.12)" stroke-width="14"/>
      ${circles}
      <text class="svg-ink" x="62" y="61" text-anchor="middle" font-size="20" font-weight="700" fill="#f4f6f9">${total}</text>
      <text class="svg-muted" x="62" y="76" text-anchor="middle" font-size="10" fill="#9aa1ac">Themen</text>
    </svg>
  `;
}

function formatBucketLabel(bucket, granularity) {
  const s = String(bucket || '');
  if (granularity === 'day' && s.length === 10) return `${s.slice(8, 10)}.${s.slice(5, 7)}`;
  if (granularity === 'month' && s.length === 7) return `${s.slice(5, 7)}/${s.slice(2, 4)}`;
  return s;
}

function buildTimelineSvg(timeline = [], granularity = 'month') {
  if (!timeline.length) {
    return '<div class="empty-state" style="padding:18px;">Keine Verlaufdaten im gewählten Zeitraum.</div>';
  }
  const maxVal = Math.max(...timeline.map((m) => m.total), 1);
  const w = 640;
  const h = 148;
  const padL = 24;
  const padB = 28;
  const chartH = h - padB - 24;
  const slotW = (w - padL * 2) / Math.max(timeline.length, 1);
  const barW = Math.min(36, Math.max(10, slotW - 8));

  const bars = timeline
    .map((m, i) => {
      const bh = Math.max(5, Math.round((m.total / maxVal) * chartH));
      const x = padL + i * slotW + (slotW - barW) / 2;
      const y = h - padB - bh;
      const lbl = formatBucketLabel(m.bucket || m.month, granularity);
      const durHint = Number(m.duration_seconds) > 0 ? ` · ${fmtDurationHuman(m.duration_seconds)}` : '';
      return `
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh}" rx="5" fill="url(#osBarGrad)"/>
        <text class="svg-ink" x="${(x + barW / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="600" fill="#f4f6f9">${m.total}×${esc(durHint)}</text>
        <text class="svg-muted" x="${(x + barW / 2).toFixed(1)}" y="${h - 8}" text-anchor="middle" font-size="9.5" fill="#9aa1ac">${esc(lbl)}</text>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${w} ${h}" width="100%" style="max-height:160px; display:block;" aria-label="Verlauf Meldungen">
      <defs>
        <linearGradient id="osBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#5aa2ff"/>
          <stop offset="100%" stop-color="#0a6cff"/>
        </linearGradient>
      </defs>
      <line class="svg-track" x1="${padL}" y1="${h - padB}" x2="${w - padL}" y2="${h - padB}" stroke="rgba(206,214,228,0.18)" stroke-width="1"/>
      ${bars}
    </svg>
  `;
}

async function loadReport() {
  const { from, to, granularity, storyId, feasibility, status, timeMode, minutesPerRequest } = state.report;
  const params = new URLSearchParams({
    from,
    to,
    granularity,
    feasibility,
    status,
    timeMode,
    minutesPerRequest: String(minutesPerRequest)
  });
  if (storyId) params.set('storyId', String(storyId));

  document.getElementById('rep-csv-link').href = `/api/stories/export/csv?${params.toString()}`;
  const rep = await api(`/api/report?${params.toString()}`);

  const granLabels = { day: 'Tag', week: 'Woche', month: 'Monat', year: 'Jahr' };
  const focusedStory = storyId ? rep.stories.find((s) => s.id === storyId) : null;

  const hasAnyEffectiveTime = rep.topResourceDrivers.some((d) => d.effectiveSeconds > 0);
  const maxDriver = Math.max(
    ...rep.topResourceDrivers.map((d) => (hasAnyEffectiveTime ? d.effectiveSeconds : d.mentions)),
    1
  );

  const driversHtml =
    rep.topResourceDrivers.length === 0
      ? '<div class="empty-state" style="padding:18px;">Keine Einträge im gewählten Filter.</div>'
      : `<div class="hbar-list">
          ${rep.topResourceDrivers
            .map((d) => {
              const metricVal = hasAnyEffectiveTime ? d.effectiveSeconds : d.mentions;
              const pct = Math.max(6, Math.round((metricVal / maxDriver) * 100));
              const isSelected = storyId === d.id;
              const durLabel =
                d.effectiveSeconds > 0
                  ? fmtDurationHuman(d.effectiveSeconds, { estimated: d.isEstimated })
                  : 'keine Zeit';
              return `
                <div class="hbar-item js-focus-story ${isSelected ? 'is-selected' : ''}" data-id="${d.id}" title="Klicken für Einzelverlauf dieses Themas">
                  <div class="hbar-meta">
                    <span style="font-weight:${isSelected ? '700' : '550'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(d.title)}</span>
                    <span style="white-space:nowrap; color:var(--silver-2);"><strong>${d.mentions}×</strong> · ${esc(durLabel)}</span>
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
                <div style="color:var(--silver-2); margin-top:2px;">${c.ideas} Ideen · ${c.implemented} umgesetzt · ${c.mentions}× Meldungen</div>
              </div>
            `
            )
            .join('')}
        </div>
      `
      : '';

  const rowsHtml =
    rep.stories.length === 0
      ? '<tr><td colspan="7" style="color:var(--silver-3); text-align:center; padding:18px;">Keine Einträge für diesen Zeitraum / Filter.</td></tr>'
      : rep.stories
          .map((s) => {
            const effSec = Number(s.report_effective_seconds) || 0;
            const avgSec = Number(s.report_avg_seconds) || 0;
            const durText =
              effSec > 0
                ? fmtDurationHuman(effSec, { estimated: s.report_is_estimated })
                : '–';
            const avgText = avgSec > 0 ? ` <span style="color:var(--silver-3);">(Ø ${esc(fmtMMSS(avgSec))})</span>` : '';
            return `
              <tr>
                <td style="white-space:nowrap;">${esc(fmtDateCH(s.created_at))}</td>
                <td>
                  <strong>${esc(s.title)}</strong>
                  ${s.internal_note ? `<div style="color:var(--amber); font-size:0.75rem;">Dev: ${esc(s.internal_note)}</div>` : ''}
                </td>
                <td>${esc(s.submitted_by || '–')}</td>
                <td>${esc(s.channel || 'E-Mail')}</td>
                <td>${ampelDot(s.feasibility)} ${esc(s.feasibility || 'mittel')}</td>
                <td>${esc(s.status)}</td>
                <td style="white-space:nowrap;"><strong>${s.report_mentions}×</strong> · ${esc(durText)}${avgText}</td>
              </tr>
            `;
          })
          .join('');

  const pressureHtml =
    rep.pressureItems && rep.pressureItems.length > 0
      ? `
        <div class="pressure-box">
          <div class="chart-title" style="color:var(--red); margin-bottom:6px;">Wiedervorlage &amp; Handlungsdruck (trotz Ablehnung weiter gefragt / unzufrieden)</div>
          ${rep.pressureItems
            .map(
              (p) => `
              <div class="pressure-item">
                <span><strong>${esc(p.title)}</strong> (${esc(p.status)})</span>
                <span style="white-space:nowrap; color:var(--red); font-weight:600;">
                  ${p.postDecisionMentions > 0 ? `+${p.postDecisionMentions}× danach` : `${p.totalMentions}× total`} · 👍 ${p.decisionUp} / 👎 ${p.decisionDown}
                </span>
              </div>
            `
            )
            .join('')}
        </div>
      `
      : '';

  const effortVal =
    rep.summary.effectiveSeconds > 0
      ? fmtDurationHuman(rep.summary.effectiveSeconds, { estimated: rep.summary.hasEstimated })
      : '0m';
  const effortSub =
    timeMode === 'measured'
      ? rep.summary.totalTimedMentions > 0
        ? `100 % echt erfasst (${rep.summary.totalTimedMentions} von ${rep.summary.totalMentions} Fällen)`
        : 'Noch keine M:S-Dauern erfasst'
      : `Hochrechnung (~ ≈ ${rep.summary.totalWorkdays} Arbeitstage)`;

  document.getElementById('report-sheet').innerHTML = `
    <div class="rep-head">
      <div>
        <div class="rep-brand-row">
          <img src="/assets/mark.svg" alt="ONESTRAND" />
          <span class="rep-brand-label">ONESTRAND · REQUIREMENTS ENGINE</span>
        </div>
        <h1>Management-Report</h1>
        <div class="rep-sub">
          Zeitraum: <strong>${esc(fmtDateCH(from))} – ${esc(fmtDateCH(to))}</strong>
          · Ampel: ${esc(feasibility)} · Status: ${esc(status)} · Basis: ${timeMode === 'measured' ? 'Echt erfasst (M:S)' : 'Hochrechnung (~)'}
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
        <span class="rep-kpi-sub">${rep.summary.totalTimedMentions}× mit M:S-Zeiterfassung</span>
      </div>
      <div class="rep-kpi">
        <span class="rep-kpi-label">Ressourcen-Aufwand</span>
        <span class="rep-kpi-val">${esc(effortVal)}</span>
        <span class="rep-kpi-sub">${esc(effortSub)}</span>
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
        <h3 class="chart-title">Top Ressourcen-Treiber (Meldungen &amp; Dauer)</h3>
        ${driversHtml}
      </div>
    </div>

    <div class="chart-card" style="margin-bottom:22px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
        <h3 class="chart-title" style="margin:0;">
          Verlauf pro ${esc(granLabels[granularity])}${focusedStory ? ` — ${esc(focusedStory.title)}` : ' (alle Themen)'}
        </h3>
        <div style="display:flex; gap:10px; align-items:center; font-size:0.77rem; color:var(--silver-2);">
          ${rep.peakBucket ? `<span>Spitze: <strong style="color:var(--ink);">${esc(formatBucketLabel(rep.peakBucket.bucket, granularity))} (${rep.peakBucket.total}×)</strong></span>` : ''}
          ${focusedStory ? '<button type="button" class="text-link no-print" id="btn-reset-focus">Alle Themen</button>' : ''}
        </div>
      </div>
      ${buildTimelineSvg(rep.mentionsTimeline || [], granularity)}
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
          <th>Menge / Dauer</th>
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
        durationSeconds: state.composerDurationSec,
        origin: state.channel === 'Intern / Team' ? 'betrieb' : 'kunde'
      })
    });

    textarea.value = '';
    state.composerDurationSec = 0;
    const compPicker = document.getElementById('composer-dur-picker');
    if (compPicker?._setSeconds) compPicker._setSeconds(0, { syncText: true, syncWheel: false });

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

    showToast(res.story.total_duration_seconds > 0 ? `Erfasst (${fmtDurationHuman(res.story.total_duration_seconds)}).` : 'Erfasst.');
    await Promise.all([loadIdeas(), loadHealth()]);
  } catch (err) {
    showToast(err.message);
  }
}

function init() {
  if (new URLSearchParams(window.location.search).get('embed') === '1') {
    document.body.classList.add('embed-mode');
  }

  // Composer M:S + Wheel-Picker einhängen
  const durSlot = document.getElementById('composer-dur-slot');
  durSlot.innerHTML = renderDurationPickerHtml({ idAttr: 'composer-dur-picker', initialSec: 0, placeholder: 'M:S' });
  bindDurationPicker(document.getElementById('composer-dur-picker'), (sec) => {
    state.composerDurationSec = sec;
  });

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

  function applyQuickRange(fromIso, toIso, gran) {
    state.report.from = fromIso;
    state.report.to = toIso;
    document.getElementById('rep-from').value = fromIso;
    document.getElementById('rep-to').value = toIso;
    if (gran) {
      state.report.granularity = gran;
      document.querySelectorAll('[data-rep-gran]').forEach((b) => b.classList.toggle('active', b.dataset.repGran === gran));
    }
    loadReport();
  }

  function isoDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }

  document.getElementById('rep-range-today').addEventListener('click', () => {
    const t = isoDaysAgo(0);
    applyQuickRange(t, t, 'day');
  });
  document.getElementById('rep-range-7d').addEventListener('click', () => {
    applyQuickRange(isoDaysAgo(6), isoDaysAgo(0), 'day');
  });
  document.getElementById('rep-range-30d').addEventListener('click', () => {
    applyQuickRange(isoDaysAgo(29), isoDaysAgo(0), 'day');
  });
  document.getElementById('rep-year-curr').addEventListener('click', () => {
    applyQuickRange(`${currentYear}-01-01`, `${currentYear}-12-31`, 'month');
  });
  document.getElementById('rep-year-prev').addEventListener('click', () => {
    applyQuickRange(`${currentYear - 1}-01-01`, `${currentYear - 1}-12-31`, 'month');
  });

  document.querySelectorAll('[data-rep-gran]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.report.granularity = btn.dataset.repGran;
      document.querySelectorAll('[data-rep-gran]').forEach((b) => b.classList.toggle('active', b === btn));
      loadReport();
    });
  });

  document.querySelectorAll('[data-rep-timemode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.report.timeMode = btn.dataset.repTimemode;
      document.querySelectorAll('[data-rep-timemode]').forEach((b) => b.classList.toggle('active', b === btn));
      document.getElementById('rep-min-pills').classList.toggle('hidden', state.report.timeMode !== 'projected');
      loadReport();
    });
  });

  document.getElementById('report-sheet').addEventListener('click', (ev) => {
    if (ev.target.closest('#btn-reset-focus')) {
      state.report.storyId = null;
      loadReport();
      return;
    }
    const item = ev.target.closest('.js-focus-story');
    if (item) {
      const id = Number(item.dataset.id);
      state.report.storyId = state.report.storyId === id ? null : id;
      loadReport();
    }
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
    if (ev.target.closest('.dur-picker') || ev.target.closest('.qty-stepper')) return;

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

    const voteBtn = ev.target.closest('.js-vote');
    if (voteBtn) {
      const id = Number(voteBtn.dataset.id);
      await api(`/api/stories/${id}/vote`, {
        method: 'POST',
        body: JSON.stringify({ delta: 1, recordedBy: localStorage.getItem('re_author') || '' })
      });
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
    const quantForm = ev.target.closest('.js-quant-form');
    if (quantForm) {
      ev.preventDefault();
      const id = Number(quantForm.dataset.id);
      const delta = Math.max(1, Math.min(1000, parseInt(quantForm.querySelector('input[name="delta"]').value, 10) || 1));
      const picker = quantForm.querySelector('[data-dur-picker]');
      const durInput = picker?.querySelector('.dur-input');
      const durationSeconds = durInput && durInput.value.trim() ? parseMMSS(durInput.value) : Number(picker?.dataset.sec || 0);
      await api(`/api/stories/${id}/vote`, {
        method: 'POST',
        body: JSON.stringify({
          delta,
          durationSeconds,
          recordedBy: localStorage.getItem('re_author') || ''
        })
      });
      const totalAdded = delta * durationSeconds;
      showToast(totalAdded > 0 ? `+${delta}× (${fmtDurationHuman(totalAdded)}) gebucht.` : `+${delta}× gebucht.`);
      await Promise.all([loadIdeas(), loadHealth()]);
      return;
    }

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
