const currentYear = new Date().getFullYear();

function getOrCreateClientId() {
  let id = localStorage.getItem('re_client_id');
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 36);
    localStorage.setItem('re_client_id', id);
  }
  return id;
}

const CLIENT_ID = getOrCreateClientId();

// Open-Source Lucide Icons (MIT License — 100 % inline SVG, ohne externes CDN)
const LUCIDE = {
  clock: '<svg class="lucide" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  thumbsUp: '<svg class="lucide" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>',
  thumbsDown: '<svg class="lucide" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>',
  user: '<svg class="lucide" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  shieldCheck: '<svg class="lucide" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>',
  logOut: '<svg class="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>',
  barChart: '<svg class="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
  arrowUpRight: '<svg class="lucide" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>',
  trash: '<svg class="lucide" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  copy: '<svg class="lucide" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
  users: '<svg class="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  check: '<svg class="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  minus: '<svg class="lucide" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/></svg>'
};

const ROLE_NAMES = {
  user: 'Nutzer',
  supervisor: 'Supervisor',
  manager: 'Manager',
  admin: 'Admin'
};

const state = {
  view: 'board', // 'board' | 'report'
  user: null, // { id, username, displayName, role: 'admin' | 'user' }
  hasAdmin: false,
  authMode: 'login', // 'login' | 'register'
  channel: '',
  ampel: 'alle',
  mode: 'all', // 'all' | 'active' | 'done'
  commentsVisibility: 'all', // 'all' | 'own_only'
  expandedId: null,
  expandedMentions: [],
  activeMentionId: null,
  showAllMentions: false,
  effortId: null,
  effortChannel: '',
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
    minutesPerRequest: 5,
    hourlyRate: '',
    managerPin: sessionStorage.getItem('re_mgr_pin') || ''
  }
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

// --- Wiederverwendbarer Zeit- & 2-Spalten Scroll-Wheel Picker (ohne Dropdown-Menüs) ---
function renderDurationPickerHtml({ idAttr = '', initialSec = 0, placeholder = 'Zeit' } = {}) {
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
      <span class="dur-icon" aria-hidden="true">${LUCIDE.clock}</span>
      <input
        type="text"
        class="dur-input"
        inputmode="numeric"
        placeholder="${esc(placeholder)}"
        value="${esc(valStr)}"
        aria-label="Zeitaufwand (Minuten:Sekunden)"
        title="Zeitaufwand z. B. 04:30 eingeben oder mit Mausrad drehen"
      />
      <button type="button" class="dur-wheel-btn" aria-label="Zeitrad öffnen" title="Zeitrad (Min : Sek)">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="dur-popover hidden" role="dialog" aria-label="Zeitaufwand wählen">
        <div class="wheel-head"><span>Min</span><span></span><span>Sek</span></div>
        <div class="wheel-body">
          <div class="wheel-highlight" aria-hidden="true"></div>
          <div class="wheel-col" data-wheel="min">${minItems}</div>
          <div class="wheel-colon">:</div>
          <div class="wheel-col" data-wheel="sec">${secItems}</div>
        </div>
        <div class="wheel-foot">
          <button type="button" class="text-link js-wheel-clear">Leeren</button>
          <button type="button" class="st-btn active js-wheel-done" style="padding:3px 10px;">OK</button>
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

  // Leeren / OK im Zeitrad
  popover.querySelector('.js-wheel-clear')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    setSeconds(0, { syncText: true, syncWheel: true, smoothScroll: true });
  });
  popover.querySelector('.js-wheel-done')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    closePopover();
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
  const baseHeaders = {
    'Content-Type': 'application/json',
    'x-client-token': CLIENT_ID
  };
  if (state.report.managerPin) baseHeaders['x-manager-pin'] = state.report.managerPin;

  const res = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: { ...baseHeaders, ...(options.headers || {}) }
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function isAdminUser() {
  return state.user?.role === 'admin';
}

function canViewReports() {
  return ['admin', 'manager'].includes(state.user?.role) || !state.hasAdmin;
}

function canSeeAllCommentsUi() {
  return ['admin', 'manager', 'supervisor'].includes(state.user?.role);
}

function renderAuthState() {
  const profBtn = document.getElementById('btn-profile');
  const profIcon = document.getElementById('profile-icon');
  const profLabel = document.getElementById('profile-label');
  const repBtn = document.getElementById('btn-toggle-report');
  const pop = document.getElementById('profile-popover');

  const allowRep = canViewReports();
  repBtn?.classList.toggle('hidden', !allowRep);
  document.getElementById('rep-vis-pills')?.classList.toggle('hidden', !isAdminUser() && state.hasAdmin);
  if (!allowRep && state.view === 'report') {
    setView('board');
  }

  if (state.user) {
    const elevated = canSeeAllCommentsUi();
    const roleLabel = ROLE_NAMES[state.user.role] || 'Nutzer';
    profBtn.classList.toggle('is-admin', elevated);
    profBtn.classList.toggle('is-user', !elevated);
    profIcon.outerHTML = elevated
      ? LUCIDE.shieldCheck.replace('<svg ', '<svg id="profile-icon" ')
      : LUCIDE.user.replace('<svg ', '<svg id="profile-icon" ');
    profLabel.textContent = state.user.displayName || state.user.username;
    profLabel.classList.remove('hidden');
    profBtn.title = `${state.user.displayName} (${roleLabel})`;

    pop.innerHTML = `
      <div class="pop-user-head">
        <span class="pop-user-name">${esc(state.user.displayName)}</span>
        <span class="pop-user-sub">
          <span>@${esc(state.user.username)}</span>
          <span class="tag-mini ${elevated ? 'tag-blue' : ''}">${esc(roleLabel)}</span>
        </span>
      </div>
      ${
        canViewReports()
          ? `<button type="button" class="pop-action" id="pop-open-report">${LUCIDE.barChart}<span>Manager-Report</span></button>`
          : ''
      }
      ${
        isAdminUser()
          ? `<button type="button" class="pop-action" id="pop-open-roles">${LUCIDE.users}<span>Rechte &amp; Benutzer</span></button>`
          : ''
      }
      <button type="button" class="pop-action danger" id="pop-logout">${LUCIDE.logOut}<span>Abmelden</span></button>
    `;
  } else {
    profBtn.classList.remove('is-admin', 'is-user');
    profIcon.outerHTML = LUCIDE.user.replace('<svg ', '<svg id="profile-icon" ');
    profLabel.textContent = '';
    profLabel.classList.add('hidden');
    profBtn.title = 'Anmelden / Profil';
    pop.classList.add('hidden');
  }
}

async function openRolesModal() {
  const modal = document.getElementById('roles-modal');
  const body = document.getElementById('roles-modal-body');
  modal.classList.remove('hidden');
  body.innerHTML = '<div style="padding:16px; color:var(--silver-3);">Lade Rechtematrix…</div>';

  try {
    const data = await api('/api/users');
    const matrixRows = data.roles
      .map((r) => {
        const p = r.permissions;
        return `
          <tr>
            <td>${esc(r.label)}</td>
            <td>${p.captureFeedback ? LUCIDE.check : LUCIDE.minus}</td>
            <td>${p.seeAllComments ? LUCIDE.check : '<span style="font-size:0.7rem; color:var(--silver-3);">Opt.</span>'}</td>
            <td>${p.decideStories ? LUCIDE.check : LUCIDE.minus}</td>
            <td>${p.viewReports ? LUCIDE.check : LUCIDE.minus}</td>
            <td>${p.manageUsers ? LUCIDE.check : LUCIDE.minus}</td>
          </tr>
        `;
      })
      .join('');

    const userRows = data.users
      .map(
        (u) => `
        <div class="user-role-row">
          <div>
            <strong style="font-size:0.84rem; color:var(--ink);">${esc(u.display_name || u.username)}</strong>
            <div style="font-size:0.73rem; color:var(--silver-3);">@${esc(u.username)}</div>
          </div>
          <div class="channel-group" role="group" aria-label="Rolle für ${esc(u.username)}">
            ${data.roles
              .map(
                (r) =>
                  `<button type="button" class="ch-btn js-set-role ${u.role === r.id ? 'active' : ''}" data-uid="${u.id}" data-role="${r.id}">${esc(r.label)}</button>`
              )
              .join('')}
          </div>
        </div>
      `
      )
      .join('');

    body.innerHTML = `
      <div class="drawer-label">Rechtematrix</div>
      <table class="matrix-table">
        <thead>
          <tr>
            <th>Rolle</th>
            <th>Erfassen</th>
            <th>Alle Komm.</th>
            <th>Entscheide</th>
            <th>Report / Excel</th>
            <th>Rechte</th>
          </tr>
        </thead>
        <tbody>${matrixRows}</tbody>
      </table>
      <div class="drawer-label">Registrierte Benutzer (${data.users.length})</div>
      <div class="user-role-list">${userRows || '<div style="font-size:0.8rem; color:var(--silver-3);">Keine Konten vorhanden.</div>'}</div>
    `;
  } catch (err) {
    body.innerHTML = `<div class="auth-error">${esc(err.message)}</div>`;
  }
}

function closeRolesModal() {
  document.getElementById('roles-modal')?.classList.add('hidden');
}

function openAuthModal(mode = 'login', customHint = '') {
  state.authMode = mode;
  const modal = document.getElementById('auth-modal');
  const title = document.getElementById('auth-modal-title');
  const hint = document.getElementById('auth-modal-hint');
  const nameWrap = document.getElementById('auth-name-wrap');
  const submitBtn = document.getElementById('auth-submit-btn');
  const errBox = document.getElementById('auth-error');

  errBox.classList.add('hidden');
  document.querySelectorAll('.auth-tab').forEach((t) => t.classList.toggle('active', t.dataset.authMode === mode));
  const isReg = mode === 'register';
  nameWrap.classList.toggle('hidden', !isReg);
  title.textContent = isReg ? 'Konto erstellen' : 'Anmelden';
  submitBtn.textContent = isReg ? 'Konto erstellen' : 'Anmelden';
  hint.textContent =
    customHint ||
    (isReg && !state.hasAdmin
      ? 'Erstes Konto erhält automatisch Admin-Rechte (Chef).'
      : isReg
        ? 'Neues Nutzer-Konto für dein Team.'
        : 'Mit Benutzername und Passwort anmelden.');

  modal.classList.remove('hidden');
  modal.querySelector(isReg ? 'input[name="displayName"]' : 'input[name="username"]')?.focus();
}

function closeAuthModal() {
  document.getElementById('auth-modal')?.classList.add('hidden');
  document.getElementById('auth-form')?.reset();
  document.getElementById('auth-error')?.classList.add('hidden');
}

async function loadAuthAndSettings() {
  try {
    const [me, s] = await Promise.all([api('/api/auth/me'), api('/api/settings')]);
    state.user = me.user || null;
    state.hasAdmin = Boolean(me.hasAdmin);
    state.commentsVisibility = s.commentsVisibility === 'own_only' ? 'own_only' : 'all';
    document.querySelectorAll('[data-vis]').forEach((b) => {
      b.classList.toggle('active', b.dataset.vis === state.commentsVisibility);
    });
    renderAuthState();
  } catch {
    renderAuthState();
  }
}

function ampelDot(feasibility) {
  if (feasibility === 'einfach') return '<span class="dot-sm dot-green" title="Einfach"></span>';
  if (feasibility === 'mittel') return '<span class="dot-sm dot-amber" title="Mittel"></span>';
  if (feasibility === 'aufwaendig') return '<span class="dot-sm dot-red" title="Aufwändig"></span>';
  return '<span class="dot-sm dot-open" title="Unbewertet"></span>';
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
  const lbl = document.getElementById('btn-report-label');
  btn.classList.toggle('active', isReport);
  if (lbl) lbl.textContent = isReport ? 'Board' : 'Manager-Report';
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
  document.getElementById('count-green').textContent = String(allIdeas.filter((i) => i.feasibility === 'einfach').length);
  document.getElementById('count-amber').textContent = String(allIdeas.filter((i) => i.feasibility === 'mittel').length);
  document.getElementById('count-red').textContent = String(allIdeas.filter((i) => i.feasibility === 'aufwaendig').length);

  let ideas = allIdeas;
  if (state.ampel !== 'alle') {
    ideas = ideas.filter((i) => i.feasibility === state.ampel);
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
      const feas = item.feasibility || 'unbewertet';
      const channel = (item.channel || '').trim();
      const author = item.submitted_by ? ` · ${item.submitted_by}` : '';
      const dateStr = fmtDateCH(item.created_at);
      const tasks = Array.isArray(item.tasks_json) ? item.tasks_json : [];
      const criteria = Array.isArray(item.acceptance_criteria_json) ? item.acceptance_criteria_json : [];
      const expanded = state.expandedId === item.id;
      const effortOpen = state.effortId === item.id;
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
      const refs = Array.isArray(item.interaction_refs_json) ? item.interaction_refs_json : [];
      const cutoff90d = Date.now() - 90 * 24 * 60 * 60 * 1000;
      const recentRefs = refs.filter((r) => !r.createdAt || new Date(r.createdAt).getTime() >= cutoff90d);

      const pressureBadge = hasPressure
        ? `<span class="tag-mini tag-pressure">${postMentions > 0 ? `+${postMentions}× nach Ablehnung` : 'Neu prüfen'}</span>`
        : '';

      const timeChip =
        totalSec > 0
          ? `<span class="time-chip" title="Echt erfasster Zeitaufwand aus ${timedCnt} Fällen">${LUCIDE.clock} ${esc(fmtDurationHuman(totalSec))}${avgSec > 0 ? ` · Ø ${esc(fmtMMSS(avgSec))}` : ''}</span>`
          : '';

      const loopFollowupChip =
        item.status === 'Umgesetzt' && recentRefs.length > 0
          ? `<span class="tag-mini tag-green" title="Innerhalb von 90 Tagen umgesetzt — aktive Rückmeldung an diese Ref-IDs sinnvoll">Rückmeldung sinnvoll (${recentRefs.length} Ref.)</span>`
          : '';

      const refsLine =
        refs.length > 0
          ? `<div class="idea-meta-line" style="margin-top:5px;">
              ${refs
                .slice(-5)
                .map((r) => `<span class="tag-mini" style="font-family:ui-monospace,Consolas,monospace;">#${esc(r.ref)}</span>`)
                .join('')}
              ${refs.length > 5 ? `<span style="color:var(--silver-3);">+${refs.length - 5} weitere</span>` : ''}
            </div>`
          : '';

      const decisionVoteHtml = hasDecision
        ? `
          <div class="decision-vote-row">
            <span>Entscheid:</span>
            <button type="button" class="dv-btn js-dec-vote" data-id="${item.id}" data-sentiment="up" title="Mit Entscheid einverstanden">${LUCIDE.thumbsUp} ${decUp}</button>
            <button type="button" class="dv-btn js-dec-vote ${decDown > decUp ? 'down-hot' : ''}" data-id="${item.id}" data-sentiment="down" title="Unzufrieden / Druck erhöhen">${LUCIDE.thumbsDown} ${decDown}</button>
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
                      `<div class="dv-comment ${c.sentiment === 'down' ? 'is-down' : ''}">${c.sentiment === 'down' ? LUCIDE.thumbsDown : LUCIDE.thumbsUp} <span>${esc(c.comment)}${c.author ? ` <span style="color:var(--silver-3);">— ${esc(c.author)}</span>` : ''}</span></div>`
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
                <div><span class="note-key">Rückmeldung / Entscheid</span>${esc(wording)}</div>
                <button type="button" class="text-link js-copy" data-text="${esc(wording)}">${LUCIDE.copy} Kopieren</button>
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

      const effortBarHtml = effortOpen
        ? `
          <form class="quant-box js-quant-form" data-id="${item.id}" style="margin-top:10px;">
            <div class="quant-row">
              ${renderDurationPickerHtml({ initialSec: 0, placeholder: 'Zeit' })}
              <input type="text" name="customerRef" class="author-input" placeholder="Kunde (optional)" aria-label="Betroffener Kunde (optional)" style="width:132px;" />
              <input type="text" name="recordedBy" class="author-input" placeholder="Erfasst von" aria-label="Erfasst von (optional)" style="width:124px;" />
              <input type="text" name="interactionRef" class="ref-input" placeholder="CRM / Ref-ID" aria-label="CRM- oder Ticket-Referenz (optional)" style="width:102px;" />
            </div>
            <div class="quant-row">
              <input type="text" name="feedbackNote" class="quant-note-input" placeholder="Kundenfeedback zu diesem Fall (optional)…" aria-label="Kundenfeedback zu diesem Fall" />
              <div class="channel-group" role="group" aria-label="Kanal dieses Falls">
                ${['Persönlich', 'Telefon', 'Chat', 'E-Mail']
                  .map(
                    (ch) =>
                      `<button type="button" class="ch-btn js-eff-ch ${state.effortChannel === ch ? 'active' : ''}" data-channel="${ch}">${ch}</button>`
                  )
                  .join('')}
              </div>
              <button type="submit" class="btn-primary js-quant-submit">+1 Erfassen</button>
            </div>
          </form>
        `
        : '';

      const mentionsList = expanded ? state.expandedMentions : [];
      const visibleMentions = state.showAllMentions ? mentionsList : mentionsList.slice(0, 12);
      const activeMention =
        mentionsList.find((m) => m.id === state.activeMentionId) || mentionsList[0] || null;

      function renderCasePreviewHtml(m) {
        if (!m) return '';
        const dt = fmtDateCH(m.created_at);
        const tm = m.created_at ? new Date(m.created_at).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) : '';
        const dur = Number(m.duration_seconds) || 0;
        return `
          <div class="case-preview-top">
            <span>${esc(dt)}${tm ? ` · ${esc(tm)}` : ''}</span>
            <div style="display:flex; gap:6px; align-items:center;">
              ${dur > 0 ? `<span class="time-chip">${LUCIDE.clock} ${esc(fmtMMSS(dur))}</span>` : ''}
              ${m.channel ? `<span class="tag-mini">${esc(m.channel)}</span>` : ''}
              ${m.interaction_ref ? `<span class="tag-mini" style="font-family:ui-monospace,Consolas,monospace;">#${esc(m.interaction_ref)}</span>` : ''}
            </div>
          </div>
          <p class="case-preview-quote ${m.feedback_note ? '' : 'muted'}">
            ${m.feedback_note ? esc(m.feedback_note) : 'Ohne Zusatztext erfasst'}
          </p>
          ${
            m.customer_ref || m.recorded_by
              ? `<div class="case-preview-meta">
                  ${m.customer_ref ? `<span>Kunde: <strong>${esc(m.customer_ref)}</strong></span>` : ''}
                  ${m.recorded_by ? `<span>Erfasst von: <strong>${esc(m.recorded_by)}</strong></span>` : ''}
                </div>`
              : ''
          }
        `;
      }

      const tilesHtml = expanded
        ? `
          <div class="tiles-section">
            <div class="tiles-head">
              <div class="drawer-label" style="margin:0;">
                ${state.commentsVisibility === 'own_only' && !canSeeAllCommentsUi() ? `Eigene Feedbacks (${mentionsList.length})` : `Feedbacks & Logs (${mentionsList.length})`}
              </div>
              ${
                mentionsList.length > 12
                  ? `<button type="button" class="text-link js-toggle-all-mentions">${state.showAllMentions ? 'Weniger' : `Alle ${mentionsList.length} anzeigen`}</button>`
                  : ''
              }
            </div>
            ${
              mentionsList.length === 0
                ? '<div style="font-size:0.8rem; color:var(--silver-3);">Noch keine Einzelfälle erfasst.</div>'
                : `
                  <div class="badge-cloud">
                    ${visibleMentions
                      .map((m) => {
                        const shortDate = m.created_at ? fmtDateCH(m.created_at).slice(0, 5) : '';
                        const dur = Number(m.duration_seconds) || 0;
                        const label = m.customer_ref || m.recorded_by || m.channel || '';
                        const isActive = activeMention && activeMention.id === m.id;
                        return `
                          <button type="button" class="case-badge js-case-badge ${isActive ? 'active' : ''}" data-mention-id="${m.id}">
                            <span>${esc(shortDate)}</span>
                            ${dur > 0 ? `<span class="case-badge-dur">${esc(fmtMMSS(dur))}</span>` : ''}
                            ${label ? `<span>${esc(label.slice(0, 16))}</span>` : ''}
                            ${m.interaction_ref ? `<span class="case-badge-ref">#${esc(m.interaction_ref.slice(0, 12))}</span>` : ''}
                          </button>
                        `;
                      })
                      .join('')}
                  </div>
                  <div class="case-preview" id="case-preview-box">${renderCasePreviewHtml(activeMention)}</div>
                `
            }
          </div>
        `
        : '';

      const drawerHtml = expanded
        ? `
          <div class="idea-drawer">
            ${tilesHtml}

            <div class="drawer-row">
              <div class="feas-group">
                <button type="button" class="feas-btn js-feas ${feas === 'einfach' ? 'active-einfach' : ''}" data-id="${item.id}" data-feas="einfach"><span class="dot-sm dot-green"></span>Einfach</button>
                <button type="button" class="feas-btn js-feas ${feas === 'mittel' ? 'active-mittel' : ''}" data-id="${item.id}" data-feas="mittel"><span class="dot-sm dot-amber"></span>Mittel</button>
                <button type="button" class="feas-btn js-feas ${feas === 'aufwaendig' ? 'active-aufwaendig' : ''}" data-id="${item.id}" data-feas="aufwaendig"><span class="dot-sm dot-red"></span>Aufwändig</button>
              </div>
              <div style="display:flex; gap:12px; flex-wrap:wrap;">
                <button type="button" class="text-link js-jira" data-id="${item.id}" title="Übergibt als Story oder Feature (je nach Ampel)">${LUCIDE.arrowUpRight} Jira</button>
                <button type="button" class="text-link danger js-delete" data-id="${item.id}">${LUCIDE.trash} Löschen</button>
              </div>
            </div>

            <form class="decision-form js-notes" data-id="${item.id}">
              <input type="text" name="internalNote" value="${esc(item.internal_note || '')}" placeholder="Systemlogik / Fachnotiz (intern)…" />
              <div style="display:flex; justify-content:flex-end;">
                <button type="submit" class="st-btn active">Notiz sichern</button>
              </div>
            </form>

            <div>
              <div class="drawer-label">Status &amp; Begründung</div>
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
                      <textarea name="publicResponse" rows="2" required placeholder="Begründung / Rückmeldung zum Entscheid…"></textarea>
                      <input type="text" name="internalNote" value="${esc(item.internal_note || '')}" placeholder="Interne Fachnotiz (optional)" />
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
            <button type="button" class="vote-box ${voted || effortOpen ? 'voted' : ''} js-vote" data-id="${item.id}" title="Upvote mit Zeitaufwand erfassen (min. 1 Min.)">
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
                  ${channel ? `<span>${esc(channel)}</span>` : ''}
                  ${statusBadge(item.status)}
                </div>
              </div>
              <p class="idea-text">${esc(item.raw_feedback)}</p>
              <div class="idea-meta-line">
                <span>${esc(dateStr)}${esc(author)}</span>
                ${timeChip}
                ${loopFollowupChip}
              </div>
              ${effortBarHtml}
              ${refsLine}
              ${loopBars(item.status)}
              ${notesHtml}
            </div>
          </div>
          ${drawerHtml}
        </article>
      `;
    })
    .join('');

  // Hover- & Klick-Vorschau für die kompakten Fall-Badges
  const previewBox = listEl.querySelector('#case-preview-box');
  if (previewBox) {
    const updatePreview = (mentionId) => {
      const m = state.expandedMentions.find((x) => x.id === mentionId);
      if (!m) return;
      state.activeMentionId = mentionId;
      listEl.querySelectorAll('.js-case-badge').forEach((b) => {
        b.classList.toggle('active', Number(b.dataset.mentionId) === mentionId);
      });
      const dt = fmtDateCH(m.created_at);
      const tm = m.created_at ? new Date(m.created_at).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) : '';
      const dur = Number(m.duration_seconds) || 0;
      previewBox.innerHTML = `
        <div class="case-preview-top">
          <span>${esc(dt)}${tm ? ` · ${esc(tm)}` : ''}</span>
          <div style="display:flex; gap:6px; align-items:center;">
            ${dur > 0 ? `<span class="time-chip">${LUCIDE.clock} ${esc(fmtMMSS(dur))}</span>` : ''}
            ${m.channel ? `<span class="tag-mini">${esc(m.channel)}</span>` : ''}
            ${m.interaction_ref ? `<span class="tag-mini" style="font-family:ui-monospace,Consolas,monospace;">#${esc(m.interaction_ref)}</span>` : ''}
          </div>
        </div>
        <p class="case-preview-quote ${m.feedback_note ? '' : 'muted'}">
          ${m.feedback_note ? esc(m.feedback_note) : 'Ohne Zusatztext erfasst'}
        </p>
        ${
          m.customer_ref || m.recorded_by
            ? `<div class="case-preview-meta">
                ${m.customer_ref ? `<span>Kunde: <strong>${esc(m.customer_ref)}</strong></span>` : ''}
                ${m.recorded_by ? `<span>Erfasst von: <strong>${esc(m.recorded_by)}</strong></span>` : ''}
              </div>`
            : ''
        }
      `;
    };
    listEl.querySelectorAll('.js-case-badge').forEach((badge) => {
      badge.addEventListener('mouseenter', () => updatePreview(Number(badge.dataset.mentionId)));
      badge.addEventListener('click', (ev) => {
        ev.stopPropagation();
        updatePreview(Number(badge.dataset.mentionId));
      });
    });
  }

  // Zeitrad-Picker und Kanal-Toggles im +1 Upvote-Formular aktivieren
  listEl.querySelectorAll('.js-quant-form').forEach((formEl) => {
    const picker = formEl.querySelector('[data-dur-picker]');
    const submitBtn = formEl.querySelector('.js-quant-submit');

    function syncSubmitLabel() {
      const sec = Number(picker?.dataset.sec || 0);
      submitBtn.textContent = sec >= 60 ? `+1 · ${fmtDurationHuman(sec)}` : '+1 Erfassen';
    }

    bindDurationPicker(picker, syncSubmitLabel);
    formEl.querySelectorAll('.js-eff-ch').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const next = state.effortChannel === btn.dataset.channel ? '' : btn.dataset.channel;
        state.effortChannel = next;
        formEl.querySelectorAll('.js-eff-ch').forEach((b) => b.classList.toggle('active', b.dataset.channel === next));
      });
    });
    syncSubmitLabel();
  });
}

// --- Management-Report mit SVG-Grafiken (ONESTRAND Dark + A4 Print-Safe) ---
function buildDonutSvg({ einfach = 0, mittel = 0, aufwaendig = 0, unbewertet = 0 }) {
  const total = einfach + mittel + aufwaendig + unbewertet;
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
    { val: aufwaendig, color: '#ef4444' },
    { val: unbewertet, color: '#94a3b8' }
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
        <text x="${(x + barW / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="600" fill="#0f172a">${m.total}×${esc(durHint)}</text>
        <text x="${(x + barW / 2).toFixed(1)}" y="${h - 8}" text-anchor="middle" font-size="9.5" fill="#64748b">${esc(lbl)}</text>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${w} ${h}" width="100%" style="max-height:160px; display:block;" aria-label="Verlauf Meldungen">
      <defs>
        <linearGradient id="osBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2f84ff"/>
          <stop offset="100%" stop-color="#0a6cff"/>
        </linearGradient>
      </defs>
      <line x1="${padL}" y1="${h - padB}" x2="${w - padL}" y2="${h - padB}" stroke="#e2e8f0" stroke-width="1"/>
      ${bars}
    </svg>
  `;
}

async function loadReport() {
  const { from, to, granularity, storyId, feasibility, status, timeMode, minutesPerRequest, hourlyRate } = state.report;
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
  if (hourlyRate && Number(hourlyRate) > 0) params.set('hourlyRate', String(hourlyRate));

  const csvParams = new URLSearchParams(params);
  if (state.report.managerPin) csvParams.set('pin', state.report.managerPin);
  document.getElementById('rep-csv-link').href = `/api/stories/export/csv?${csvParams.toString()}`;

  let rep;
  try {
    rep = await api(`/api/report?${params.toString()}`, {
      headers: state.report.managerPin ? { 'x-manager-pin': state.report.managerPin } : {}
    });
    document.querySelector('.report-controls')?.classList.remove('hidden');
  } catch (err) {
    document.querySelector('.report-controls')?.classList.add('hidden');
    document.getElementById('report-sheet').innerHTML = `
      <form id="mgr-pin-form" style="max-width:340px; margin:24px auto; display:flex; flex-direction:column; gap:10px; text-align:center;">
        <div class="drawer-label" style="margin:0;">Manager-Freigabe</div>
        <p style="margin:0; font-size:0.84rem; color:var(--silver-2);">${esc(err.message)}</p>
        <input type="password" name="pin" required autofocus placeholder="Manager-PIN" class="author-input" style="width:100%; text-align:center;" />
        <button type="submit" class="btn-primary">Freischalten</button>
      </form>
    `;
    document.getElementById('mgr-pin-form')?.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const pin = String(new FormData(ev.target).get('pin') || '').trim();
      state.report.managerPin = pin;
      sessionStorage.setItem('re_mgr_pin', pin);
      loadReport();
    });
    return;
  }

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
                <td>${esc(s.channel || '–')}</td>
                <td>${ampelDot(s.feasibility)} ${esc(s.feasibility || 'unbewertet')}</td>
                <td>${esc(s.status)}</td>
                <td style="white-space:nowrap;"><strong>${s.report_mentions}×</strong> · ${esc(durText)}${avgText}</td>
              </tr>
            `;
          })
          .join('');

  const savingsHtml =
    rep.savings && rep.savings.implementedCount > 0
      ? `
        <div class="savings-box">
          <div class="chart-title" style="color:var(--green); margin-bottom:6px;">
            Wirkung &amp; Einsparung — ${rep.savings.implementedCount} umgesetzte Themen (${rep.savings.savedMentions}× gelöste Anfragen${rep.savings.savedSeconds > 0 ? ` · ${esc(fmtDurationHuman(rep.savings.savedSeconds, { estimated: rep.summary.hasEstimated }))}` : ''}${rep.savings.savedCostChf ? ` · CHF ${rep.savings.savedCostChf.toLocaleString('de-CH')}.–` : ''})
          </div>
          ${rep.savings.topSavedItems
            .map(
              (item) => `
              <div class="savings-item">
                <span><strong>${esc(item.title)}</strong></span>
                <span style="white-space:nowrap; color:var(--green); font-weight:600;">
                  ${item.mentions}×${item.seconds > 0 ? ` · ${esc(fmtDurationHuman(item.seconds, { estimated: item.isEstimated }))}` : ''}${item.costChf ? ` · CHF ${item.costChf.toLocaleString('de-CH')}.–` : ''}
                </span>
              </div>
            `
            )
            .join('')}
        </div>
      `
      : '';

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
        ? `Echt erfasst (${rep.summary.totalTimedMentions} von ${rep.summary.totalMentions})`
        : 'Noch keine Zeiten erfasst'
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
          · Ampel: ${esc(feasibility)} · Status: ${esc(status)} · Basis: ${timeMode === 'measured' ? 'Echt erfasst' : 'Hochrechnung (~)'}
        </div>
      </div>
      <div class="rep-sub">Erstellt am ${esc(fmtDateCH(rep.generatedAt))}</div>
    </div>

    ${savingsHtml}
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
        <span class="rep-kpi-sub">${rep.summary.totalTimedMentions}× mit Zeitaufwand</span>
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
            ${rep.byFeasibility.unbewertet > 0 ? `<div class="donut-legend-row"><span><span class="dot-sm dot-open"></span> Unbewertet</span><strong>${rep.byFeasibility.unbewertet}</strong></div>` : ''}
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
  const refInput = document.getElementById('fb-ref');
  const dupBanner = document.getElementById('dup-banner');
  const author = authorInput.value.trim();
  const interactionRef = refInput.value.trim();

  try {
    const res = await api('/api/stories', {
      method: 'POST',
      body: JSON.stringify({
        rawFeedback: textarea.value.trim(),
        channel: state.channel,
        submittedBy: author,
        interactionRef,
        durationSeconds: state.composerDurationSec,
        origin: 'kunde'
      })
    });

    textarea.value = '';
    refInput.value = '';
    state.channel = '';
    document.querySelectorAll('.ch-btn').forEach((b) => b.classList.remove('active'));
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

  // Omnichannel: PWA Service Worker & optionaler 1-Klick-Installationsknopf (Desktop/Mobile)
  if ('serviceWorker' in navigator && !document.body.classList.contains('embed-mode')) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  let deferredPrompt = null;
  const installBtn = document.getElementById('btn-install-app');
  window.addEventListener('beforeinstallprompt', (ev) => {
    ev.preventDefault();
    deferredPrompt = ev;
    installBtn?.classList.remove('hidden');
  });
  installBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.classList.add('hidden');
  });

  // Composer Zeit- & Wheel-Picker einhängen
  const durSlot = document.getElementById('composer-dur-slot');
  durSlot.innerHTML = renderDurationPickerHtml({ idAttr: 'composer-dur-picker', initialSec: 0, placeholder: 'Zeit' });
  bindDurationPicker(document.getElementById('composer-dur-picker'), (sec) => {
    state.composerDurationSec = sec;
  });

  // Keine vorausgefüllten Felder beim Start
  document.getElementById('fb-author').value = '';

  document.getElementById('rep-from').value = state.report.from;
  document.getElementById('rep-to').value = state.report.to;

  document.getElementById('brand-link').addEventListener('click', (ev) => {
    ev.preventDefault();
    setView('board');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Profil-Button, Account-Popover & Login-Maske
  document.getElementById('btn-profile').addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (state.user) {
      document.getElementById('profile-popover').classList.toggle('hidden');
    } else {
      openAuthModal(state.hasAdmin ? 'login' : 'register');
    }
  });

  document.getElementById('profile-popover').addEventListener('click', async (ev) => {
    if (ev.target.closest('#pop-open-report')) {
      document.getElementById('profile-popover').classList.add('hidden');
      setView('report');
      return;
    }
    if (ev.target.closest('#pop-open-roles')) {
      document.getElementById('profile-popover').classList.add('hidden');
      openRolesModal();
      return;
    }
    if (ev.target.closest('#pop-logout')) {
      await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
      state.user = null;
      state.expandedId = null;
      state.expandedMentions = [];
      document.getElementById('profile-popover').classList.add('hidden');
      renderAuthState();
      showToast('Abgemeldet.');
      await loadIdeas();
    }
  });

  document.getElementById('btn-close-roles').addEventListener('click', closeRolesModal);
  document.getElementById('roles-modal').addEventListener('click', async (ev) => {
    if (ev.target.id === 'roles-modal') {
      closeRolesModal();
      return;
    }
    const roleBtn = ev.target.closest('.js-set-role');
    if (roleBtn) {
      try {
        await api(`/api/users/${roleBtn.dataset.uid}/role`, {
          method: 'PATCH',
          body: JSON.stringify({ role: roleBtn.dataset.role })
        });
        showToast(`Rolle auf ${ROLE_NAMES[roleBtn.dataset.role] || roleBtn.dataset.role} gesetzt.`);
        await openRolesModal();
      } catch (err) {
        showToast(err.message);
      }
    }
  });

  document.addEventListener('click', (ev) => {
    if (!ev.target.closest('.profile-wrap')) {
      document.getElementById('profile-popover')?.classList.add('hidden');
    }
  });

  document.getElementById('btn-close-auth').addEventListener('click', closeAuthModal);
  document.getElementById('auth-modal').addEventListener('click', (ev) => {
    if (ev.target.id === 'auth-modal') closeAuthModal();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      closeAuthModal();
      closeRolesModal();
    }
  });

  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => openAuthModal(tab.dataset.authMode));
  });

  document.getElementById('auth-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const errBox = document.getElementById('auth-error');
    errBox.classList.add('hidden');
    const fd = new FormData(ev.target);
    const endpoint = state.authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          displayName: String(fd.get('displayName') || '').trim(),
          username: String(fd.get('username') || '').trim(),
          password: String(fd.get('password') || '')
        })
      });
      state.user = res.user;
      if (res.hasAdmin || res.user?.role === 'admin') state.hasAdmin = true;
      closeAuthModal();
      renderAuthState();
      showToast(`Angemeldet als ${res.user.displayName}${res.user.role === 'admin' ? ' (Admin)' : ''}.`);
      state.expandedId = null;
      await loadIdeas();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.remove('hidden');
    }
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

  document.getElementById('rep-rate')?.addEventListener('input', (ev) => {
    state.report.hourlyRate = ev.target.value.trim();
    clearTimeout(init._rateT);
    init._rateT = setTimeout(loadReport, 220);
  });

  document.querySelectorAll('[data-vis]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        const res = await api('/api/settings', {
          method: 'PATCH',
          body: JSON.stringify({ commentsVisibility: btn.dataset.vis })
        });
        state.commentsVisibility = res.commentsVisibility;
        document.querySelectorAll('[data-vis]').forEach((b) => b.classList.toggle('active', b.dataset.vis === state.commentsVisibility));
        showToast(
          state.commentsVisibility === 'own_only'
            ? 'Aktiv: User sehen nur eigene Kommentare (Chef sieht alle).'
            : 'Aktiv: Alle sehen alle Kommentare.'
        );
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  document.querySelectorAll('.ch-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = state.channel === btn.dataset.channel ? '' : btn.dataset.channel;
      state.channel = next;
      document.querySelectorAll('.ch-btn').forEach((b) => b.classList.toggle('active', b.dataset.channel === next));
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
    const toggleAllBtn = ev.target.closest('.js-toggle-all-mentions');
    if (toggleAllBtn) {
      ev.stopPropagation();
      state.showAllMentions = !state.showAllMentions;
      await loadIdeas();
      return;
    }

    if (ev.target.closest('.dur-picker') || ev.target.closest('.js-quant-form') || ev.target.closest('.case-preview')) return;

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
      try {
        const res = await api(`/api/stories/${id}/jira`, {
          method: 'POST',
          body: JSON.stringify({})
        });
        const kind = res.issueType || 'Story';
        if (res.mode === 'api') {
          showToast(`Jira ${kind} erstellt: ${res.jiraKey}`);
          await loadIdeas();
        } else {
          try {
            await navigator.clipboard.writeText(res.markup || '');
            showToast(`Jira-${kind} kopiert.`);
          } catch {
            showToast(`Jira-${kind} bereit.`);
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
      ev.stopPropagation();
      const id = Number(voteBtn.dataset.id);
      state.effortId = state.effortId === id ? null : id;
      state.effortChannel = '';
      await loadIdeas();
      if (state.effortId === id) {
        const durEl = document.querySelector(`.js-quant-form[data-id="${id}"] .dur-input`);
        durEl?.focus();
      }
      return;
    }

    const feasBtn = ev.target.closest('.js-feas');
    if (feasBtn) {
      const isAlreadyActive = feasBtn.classList.contains(`active-${feasBtn.dataset.feas}`);
      await api(`/api/stories/${feasBtn.dataset.id}/feasibility`, {
        method: 'PATCH',
        body: JSON.stringify({ feasibility: isAlreadyActive ? 'unbewertet' : feasBtn.dataset.feas })
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
      if (state.expandedId === id) {
        state.expandedId = null;
        state.expandedMentions = [];
        state.activeMentionId = null;
        state.showAllMentions = false;
      } else {
        state.expandedId = id;
        state.showAllMentions = false;
        state.expandedMentions = await api(`/api/stories/${id}/mentions`).catch(() => []);
        state.activeMentionId = state.expandedMentions[0]?.id ?? null;
      }
      state.pendingStatus = null;
      await loadIdeas();
    }
  });

  document.getElementById('ideas-list').addEventListener('submit', async (ev) => {
    const quantForm = ev.target.closest('.js-quant-form');
    if (quantForm) {
      ev.preventDefault();
      const id = Number(quantForm.dataset.id);
      const picker = quantForm.querySelector('[data-dur-picker]');
      const durInput = picker?.querySelector('.dur-input');
      const refVal = (quantForm.querySelector('input[name="interactionRef"]')?.value || '').trim();
      const feedbackNote = (quantForm.querySelector('input[name="feedbackNote"]')?.value || '').trim();
      const customerRef = (quantForm.querySelector('input[name="customerRef"]')?.value || '').trim();
      const recordedBy = (quantForm.querySelector('input[name="recordedBy"]')?.value || '').trim();
      const durationSeconds = durInput && durInput.value.trim() ? parseMMSS(durInput.value) : Number(picker?.dataset.sec || 0);

      if (durationSeconds < 60) {
        showToast('Mindestens 1 Minute Zeitaufwand (z. B. 01:00) erfassen.');
        durInput?.focus();
        return;
      }

      try {
        await api(`/api/stories/${id}/vote`, {
          method: 'POST',
          body: JSON.stringify({
            delta: 1,
            durationSeconds,
            interactionRef: refVal,
            feedbackNote,
            customerRef,
            recordedBy,
            channel: state.effortChannel
          })
        });
        state.votedIds.add(id);
        localStorage.setItem('re_voted', JSON.stringify([...state.votedIds]));
        state.effortId = null;
        state.effortChannel = '';
        if (state.expandedId === id) {
          state.expandedMentions = await api(`/api/stories/${id}/mentions`).catch(() => []);
        }
        showToast(`+1 (${fmtDurationHuman(durationSeconds)}) erfasst.`);
        await Promise.all([loadIdeas(), loadHealth()]);
      } catch (err) {
        showToast(err.message);
      }
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
  loadAuthAndSettings();
  loadIdeas();
  setInterval(loadHealth, 20000);
}

init();
