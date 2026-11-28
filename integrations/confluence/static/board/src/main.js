import { invoke, router } from '@forge/bridge';

const LUCIDE = {
  info: '<svg class="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  alert: '<svg class="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
  check: '<svg class="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
};

const VALUES_MAP = {
  zeitersparnis: { de: 'Effizienz', en: 'Efficiency' },
  kundenaufwand: { de: 'Kundenerlebnis', en: 'Experience' },
  erklaerung: { de: 'Klarheit', en: 'Clarity' },
  fehler: { de: 'Qualität', en: 'Quality' },
  umsatz: { de: 'Umsatz', en: 'Revenue' },
  bindung: { de: 'Kundenbindung', en: 'Retention' }
};

const state = {
  lang: 'de',
  board: null,
  selectedValues: new Set(),
  selectedChannel: '',
  filterFeas: 'alle',
  filterMode: 'all',
  expandedId: null,
  voteOpenId: null
};

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDur(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (s === 0) return '0m';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return r > 0 ? `${m}m ${String(r).padStart(2, '0')}s` : `${m}m`;
  return `${r}s`;
}

function parseMMSS(raw) {
  const txt = String(raw || '').trim();
  if (!txt) return 0;
  if (txt.includes(':')) {
    const [m, s] = txt.split(':').map((x) => parseInt(x || '0', 10) || 0);
    return Math.max(0, m * 60 + Math.min(59, s));
  }
  const m = parseInt(txt, 10);
  return Number.isFinite(m) && m > 0 ? m * 60 : 0;
}

function showToast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.toggle('is-error', Boolean(isError));
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), isError ? 4200 : 2500);
}

function showComposerError(msg, field) {
  document.getElementById('fb-title')?.classList.remove('is-invalid');
  document.getElementById('fb-desc')?.classList.remove('is-invalid');
  document.getElementById('composer-form')?.classList.add('has-error');
  if (field) {
    field.classList.add('is-invalid');
    field.focus();
  }
  const box = document.getElementById('composer-error');
  box.innerHTML = `${LUCIDE.alert}<span>${esc(msg)}</span>`;
  box.classList.remove('hidden');
  showToast(msg, true);
}

function clearComposerError() {
  document.getElementById('composer-form')?.classList.remove('has-error');
  document.getElementById('fb-title')?.classList.remove('is-invalid');
  document.getElementById('fb-desc')?.classList.remove('is-invalid');
  const box = document.getElementById('composer-error');
  box.classList.add('hidden');
  box.innerHTML = '';
}

function updateCharHint() {
  const ta = document.getElementById('fb-desc');
  const hint = document.getElementById('fb-char-hint');
  const len = (ta.value || '').replace(/\s+/g, ' ').trim().length;
  if (len === 0) {
    hint.classList.add('hidden');
    return;
  }
  hint.classList.remove('hidden');
  if (len < 10) {
    hint.classList.remove('is-ok');
    const miss = 10 - len;
    hint.innerHTML =
      state.lang === 'en'
        ? `${LUCIDE.info}<span>${miss} more characters required (${len}/10)</span>`
        : `${LUCIDE.info}<span>Noch ${miss} Zeichen für den Beschrieb nötig (${len}/10)</span>`;
  } else {
    hint.classList.add('is-ok');
    hint.innerHTML =
      state.lang === 'en'
        ? `${LUCIDE.check}<span>${len} characters — ready to submit</span>`
        : `${LUCIDE.check}<span>${len} Zeichen — bereit zum Erfassen</span>`;
    clearComposerError();
  }
}

async function refreshBoard() {
  try {
    state.board = await invoke('getBoard');
    renderBoard();
  } catch (err) {
    document.getElementById('stories-list').innerHTML = `<div class="empty-state">${esc(err.message || 'Ladefehler')}</div>`;
  }
}

function statusTagHtml(status) {
  if (status === 'Umgesetzt') return `<span class="tag tag-green">${state.lang === 'en' ? 'Done' : 'Erledigt'}</span>`;
  if (status === 'Abgelehnt') return `<span class="tag tag-red">${state.lang === 'en' ? 'Rejected' : 'Abgelehnt'}</span>`;
  if (status === 'In Arbeit') return `<span class="tag tag-blue">${state.lang === 'en' ? 'In progress' : 'In Arbeit'}</span>`;
  if (status === 'In Prüfung') return `<span class="tag tag-amber">${state.lang === 'en' ? 'In review' : 'In Prüfung'}</span>`;
  return `<span class="tag">${state.lang === 'en' ? 'New' : 'Neu'}</span>`;
}

function renderBoard() {
  const b = state.board;
  if (!b) return;
  const isEn = state.lang === 'en';
  document.getElementById('actor-pill').textContent = `${b.actor?.displayName || 'Confluence'} · Space ${b.spaceKey}`;

  document.getElementById('kpi-strip').innerHTML = `
    <div class="kpi-card"><div class="kpi-lbl">${isEn ? 'Topics' : 'Themen'}</div><div class="kpi-val">${b.summary.totalStories}</div></div>
    <div class="kpi-card"><div class="kpi-lbl">${isEn ? 'Inquiries' : 'Meldungen'}</div><div class="kpi-val">${b.summary.totalMentions}×</div></div>
    <div class="kpi-card"><div class="kpi-lbl">${isEn ? 'Recorded Time' : 'Erfasste Zeit'}</div><div class="kpi-val">${fmtDur(b.summary.totalSeconds)}</div></div>
    <div class="kpi-card"><div class="kpi-lbl">${isEn ? 'Saved (Done)' : 'Eingespart (Erledigt)'}</div><div class="kpi-val">${fmtDur(b.summary.savedSeconds)}</div></div>
  `;

  let items = b.stories || [];
  if (state.filterFeas !== 'alle') items = items.filter((s) => s.feasibility === state.filterFeas);
  if (state.filterMode === 'active') items = items.filter((s) => ['In Prüfung', 'In Arbeit'].includes(s.status));
  if (state.filterMode === 'done') items = items.filter((s) => ['Umgesetzt', 'Abgelehnt'].includes(s.status));

  const listEl = document.getElementById('stories-list');
  if (items.length === 0) {
    listEl.innerHTML = `<div class="empty-state">${isEn ? 'No entries in this Confluence Space yet.' : 'Noch keine Einträge in diesem Confluence-Space.'}</div>`;
    return;
  }

  listEl.innerHTML = items
    .map((s) => {
      const sid = String(s.id);
      const isExpanded = String(state.expandedId) === sid;
      const isVoteOpen = String(state.voteOpenId) === sid;
      const isOwner = !s.authorId || s.authorId === b.actor?.accountId;
      const vals = (s.businessValues || []).map((v) => `<span class="tag">${esc(VALUES_MAP[v]?.[state.lang] || v)}</span>`).join('');
      const reqTag = s.reqNumber ? `<span class="tag">REQ-${String(s.reqNumber).padStart(2, '0')}</span>` : '';
      const pageOpenBtn = s.webUiPath
        ? `<button type="button" class="text-link js-open-page" data-path="${esc(s.webUiPath)}">${isEn ? 'Open Confluence page ↗' : 'Confluence-Seite öffnen ↗'}</button>`
        : '';

      const voteBoxHtml = isVoteOpen
        ? `
          <div class="inline-panel">
            <div class="panel-block-title">${isEn ? '+1 Log recurring case (min. 01:00)' : '+1 Wiederkehrenden Fall mit realer Zeit erfassen (mind. 01:00)'}</div>
            <form class="inline-form js-vote-form" data-id="${esc(sid)}">
              <input type="text" name="dur" placeholder="MM:SS (z. B. 02:30)" style="width:140px;" required />
              <input type="text" name="note" placeholder="${isEn ? 'Short case feedback (optional)' : 'Kurzes Fall-Feedback (optional)'}" style="flex:1; min-width:180px;" />
              <button type="submit" class="btn-primary">+1 ${isEn ? 'Save' : 'Speichern'}</button>
            </form>
          </div>
        `
        : '';

      const drawerHtml = isExpanded
        ? `
          <div class="inline-panel">
            <div>
              <div class="panel-block-title">${isEn ? 'Effort & Status' : 'Aufwand & Status'}</div>
              <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                <div class="seg-group">
                  ${['einfach', 'mittel', 'aufwaendig']
                    .map(
                      (f) =>
                        `<button type="button" class="seg-btn js-feas ${s.feasibility === f ? 'active' : ''}" data-id="${esc(sid)}" data-feas="${f}">${
                          f === 'einfach' ? (isEn ? 'Easy' : 'Einfach') : f === 'mittel' ? (isEn ? 'Medium' : 'Mittel') : isEn ? 'Complex' : 'Aufwändig'
                        }</button>`
                    )
                    .join('')}
                </div>
                <div class="seg-group">
                  ${['In Prüfung', 'In Arbeit', 'Umgesetzt']
                    .map(
                      (st) =>
                        `<button type="button" class="seg-btn js-status ${s.status === st ? 'active' : ''}" data-id="${esc(sid)}" data-status="${st}">${esc(st)}</button>`
                    )
                    .join('')}
                </div>
                ${pageOpenBtn}
                <button type="button" class="text-link danger js-delete" data-id="${esc(sid)}">${isEn ? 'Move page to trash' : 'In Papierkorb'}</button>
              </div>
              <form class="inline-form js-reject-form" data-id="${esc(sid)}" style="margin-top:8px;">
                <input type="text" name="reason" placeholder="${isEn ? 'Reason to reject…' : 'Begründung für Ablehnung…'}" style="flex:1; min-width:200px;" />
                <button type="submit" class="quiet-btn">${isEn ? 'Reject' : 'Ablehnen'}</button>
              </form>
              ${s.decisionReason ? `<div style="margin-top:6px; font-size:12px; color:var(--silver);"><strong>${isEn ? 'Decision:' : 'Entscheid:'}</strong> ${esc(s.decisionReason)}</div>` : ''}
            </div>

            <div>
              <div class="panel-block-title">${isEn ? 'Logged Cases' : 'Einzelfälle'} (${(s.mentions || []).length})</div>
              <div class="case-list">
                ${(s.mentions || [])
                  .slice(0, 6)
                  .map(
                    (m) => `
                    <div class="case-item">
                      <strong>${esc(m.recordedBy || s.authorName)}</strong> · ${esc(String(m.createdAt || '').slice(0, 10))}
                      ${m.durationSeconds ? ` · <strong>${fmtDur(m.durationSeconds)}</strong>` : ''}
                      ${m.channel ? ` · ${esc(m.channel)}` : ''}
                      ${m.feedbackNote ? `<div style="color:var(--silver-2); margin-top:2px;">${esc(m.feedbackNote)}</div>` : ''}
                    </div>
                  `
                  )
                  .join('')}
              </div>
            </div>

            <div>
              <div class="panel-block-title">${isEn ? 'Relevance Governance' : 'Relevanz-Voting'} (👍 ${s.relevantCount} · 👎 ${s.irrelevantCount})</div>
              <div style="display:flex; gap:6px;">
                <button type="button" class="quiet-btn js-rel" data-id="${esc(sid)}" data-vote="relevant">👍 Relevant (${s.relevantCount})</button>
                <button type="button" class="quiet-btn js-rel" data-id="${esc(sid)}" data-vote="irrelevant">👎 Irrelevant (${s.irrelevantCount})</button>
              </div>
              ${
                s.minorityHint
                  ? `<div class="minority-box">${isEn ? 'Minority opinion detected — worth asking directly:' : 'Minderheitsstimme erkannt — gezielt nachfragen:'} <strong>${esc(s.minorityHint.voters.join(', '))}</strong></div>`
                  : ''
              }
            </div>

            <div>
              <div class="panel-block-title">${isEn ? 'Clarification Questions' : 'Rückfragen'} (${(s.questions || []).length})</div>
              <div class="case-list">
                ${(s.questions || [])
                  .map(
                    (q) => `
                    <div class="case-item">
                      <div><strong>${esc(q.askedBy)}:</strong> ${esc(q.body)}</div>
                      ${
                        q.replyBody
                          ? `<div style="margin-top:4px; color:var(--green);"><strong>${esc(s.authorName)}:</strong> ${esc(q.replyBody)}</div>`
                          : isOwner
                            ? `<form class="inline-form js-reply-form" data-id="${esc(sid)}" data-qid="${q.id}" style="margin-top:5px;">
                                <input type="text" name="reply" placeholder="${isEn ? 'Your answer…' : 'Deine Antwort…'}" style="flex:1;" required />
                                <button type="submit" class="quiet-btn">${isEn ? 'Reply' : 'Antworten'}</button>
                               </form>`
                            : `<div style="margin-top:3px; font-size:11px; color:var(--silver-3);">${isEn ? 'Only the original author can reply.' : 'Nur die Person, welche den Fall erfasst hat, kann antworten.'}</div>`
                      }
                    </div>
                  `
                  )
                  .join('')}
              </div>
              <form class="inline-form js-ask-form" data-id="${esc(sid)}" style="margin-top:6px;">
                <input type="text" name="body" placeholder="${isEn ? 'Ask a clarification question…' : 'Rückfrage an den Erfasser stellen…'}" style="flex:1;" required />
                <button type="submit" class="quiet-btn">${isEn ? 'Ask' : 'Fragen'}</button>
              </form>
            </div>
          </div>
        `
        : '';

      return `
        <article class="story-card">
          <div class="story-row js-toggle" data-id="${esc(sid)}">
            <button type="button" class="vote-btn js-open-vote" data-id="${esc(sid)}" title="${isEn ? 'Log +1 with time' : '+1 mit Zeitaufwand erfassen'}">
              <span class="vote-num">${s.votes}×</span>
              <span class="vote-sub">+1</span>
            </button>
            <div class="story-main">
              <div class="story-head">
                <span class="story-title">${esc(s.title)}</span>
                <div class="meta-row">
                  ${reqTag}
                  ${statusTagHtml(s.status)}
                  ${s.totalDurationSeconds ? `<span class="tag">${fmtDur(s.totalDurationSeconds)}</span>` : ''}
                </div>
              </div>
              <div class="story-desc">${esc(s.description)}</div>
              <div class="meta-row">
                <span>${esc(s.authorName)}</span>
                <span>·</span>
                <span>${esc(String(s.createdAt || '').slice(0, 10))}</span>
                ${s.channel ? `<span class="tag">${esc(s.channel)}</span>` : ''}
                ${s.refId ? `<span class="tag">#${esc(s.refId)}</span>` : ''}
                ${vals}
                ${pageOpenBtn}
              </div>
            </div>
          </div>
          ${voteBoxHtml}
          ${drawerHtml}
        </article>
      `;
    })
    .join('');
}

function openLegal(tab) {
  const modal = document.getElementById('legal-modal');
  const title = document.getElementById('legal-title');
  const body = document.getElementById('legal-body');
  if (tab === 'privacy') {
    title.textContent = state.lang === 'en' ? 'Privacy Policy (Runs on Atlassian)' : 'Datenschutzerklärung (Runs on Atlassian)';
    body.innerHTML = `
      <p><strong>Kein Server, keine externe Datenbank, kein Datenzugriff:</strong> Dieses Confluence-Addon läuft zu 100 % nativ auf der Atlassian-Forge-Plattform (ohne externe Netzwerk-Berechtigungen). Jeder Eintrag wird als echte, sichtbare Confluence-Unterseite in Ihrer eigenen Instanz gespeichert und bleibt auch ohne Addon lesbar. Onestrand | Alban Hyseni erhält zu keinem Zeitpunkt Zugriff auf Ihre Inhalte.</p>
      <p><strong>Verantwortliche Stelle (revDSG / DSGVO):</strong> Ausschliesslich Ihre eigene Organisation als Betreiberin der Confluence-Instanz.</p>
    `;
  } else {
    title.textContent = state.lang === 'en' ? 'Imprint' : 'Impressum';
    body.innerHTML = `
      <p><strong>Onestrand | Alban Hyseni</strong> · 8604 Volketswil, Schweiz · https://onestrand.ch</p>
      <p><strong>Copyright &copy; 2026 Onestrand | Alban Hyseni. Alle Rechte vorbehalten.</strong> Proprietäre Software — Nutzung nur mit vorgängiger schriftlicher Zustimmung; Nutzende erhalten ausschliesslich reaktiv Kenntnis vom Produkt.</p>
      <p><strong>Eigenbetrieb / Atlassian-Tenant:</strong> Der Anbieter stellt weder einen produktiven Server noch eine Datenbank zur Verfügung; sämtliche Daten verbleiben in Ihrer Confluence-Instanz.</p>
    `;
  }
  modal.classList.remove('hidden');
}

function bindEvents() {
  const guide = document.getElementById('guide-banner');
  const guideBtn = document.getElementById('btn-guide');
  const setGuide = (open) => {
    guide.classList.toggle('hidden', !open);
    guideBtn.classList.toggle('active', open);
  };
  if (localStorage.getItem('re_forge_guide_seen') !== '1') setGuide(true);
  guideBtn.addEventListener('click', () => setGuide(guide.classList.contains('hidden')));
  document.getElementById('btn-dismiss-guide').addEventListener('click', () => {
    localStorage.setItem('re_forge_guide_seen', '1');
    setGuide(false);
  });

  document.getElementById('btn-composer-info').addEventListener('click', (ev) => {
    const strip = document.getElementById('composer-info-strip');
    const open = strip.classList.contains('hidden');
    strip.classList.toggle('hidden', !open);
    ev.currentTarget.classList.toggle('active', open);
  });

  document.getElementById('fb-desc').addEventListener('input', updateCharHint);
  document.getElementById('fb-title').addEventListener('input', () => {
    if ((document.getElementById('fb-title').value || '').trim().length >= 3) clearComposerError();
  });

  document.querySelectorAll('.val-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.val;
      if (state.selectedValues.has(v)) state.selectedValues.delete(v);
      else state.selectedValues.add(v);
      btn.classList.toggle('active', state.selectedValues.has(v));
    });
  });

  document.querySelectorAll('.ch-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedChannel = state.selectedChannel === btn.dataset.ch ? '' : btn.dataset.ch;
      document.querySelectorAll('.ch-btn').forEach((b) => b.classList.toggle('active', b.dataset.ch === state.selectedChannel));
    });
  });

  document.querySelectorAll('[data-feas]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.filterFeas = btn.dataset.feas;
      document.querySelectorAll('[data-feas]').forEach((b) => b.classList.toggle('active', b === btn));
      renderBoard();
    });
  });

  document.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.filterMode = btn.dataset.mode;
      document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('active', b === btn));
      renderBoard();
    });
  });

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.lang = btn.dataset.lang === 'en' ? 'en' : 'de';
      document.querySelectorAll('.lang-btn').forEach((b) => b.classList.toggle('active', b.dataset.lang === state.lang));
      updateCharHint();
      renderBoard();
    });
  });

  document.getElementById('composer-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const titleEl = document.getElementById('fb-title');
    const descEl = document.getElementById('fb-desc');
    const title = titleEl.value.replace(/\s+/g, ' ').trim();
    const description = descEl.value.replace(/\s+/g, ' ').trim();
    if (title.length < 3) {
      showComposerError('Bitte gib einen Titel mit mindestens 3 Zeichen ein.', titleEl);
      return;
    }
    if (description.length < 10) {
      showComposerError(`Beschrieb zu kurz: Mindestens 10 Zeichen erforderlich (aktuell ${description.length} von 10).`, descEl);
      updateCharHint();
      return;
    }
    clearComposerError();
    try {
      await invoke('createStory', {
        title,
        description,
        businessValues: [...state.selectedValues],
        channel: state.selectedChannel,
        refId: document.getElementById('fb-ref').value.trim(),
        durationSeconds: parseMMSS(document.getElementById('fb-dur').value)
      });
      titleEl.value = '';
      descEl.value = '';
      document.getElementById('fb-ref').value = '';
      document.getElementById('fb-dur').value = '';
      state.selectedValues.clear();
      state.selectedChannel = '';
      document.querySelectorAll('.val-btn, .ch-btn').forEach((b) => b.classList.remove('active'));
      updateCharHint();
      showToast('Als echte Confluence-Unterseite gespeichert.');
      await refreshBoard();
    } catch (err) {
      showComposerError(err.message || 'Speichern fehlgeschlagen.', descEl);
    }
  });

  document.getElementById('stories-list').addEventListener('click', async (ev) => {
    const openPage = ev.target.closest('.js-open-page');
    if (openPage) {
      ev.stopPropagation();
      const targetPath = openPage.dataset.path;
      if (targetPath) {
        router.open(targetPath.startsWith('/wiki') ? targetPath : `/wiki${targetPath}`);
      }
      return;
    }
    const openVote = ev.target.closest('.js-open-vote');
    if (openVote) {
      ev.stopPropagation();
      const id = String(openVote.dataset.id);
      state.voteOpenId = String(state.voteOpenId) === id ? null : id;
      renderBoard();
      return;
    }
    const feasBtn = ev.target.closest('.js-feas');
    if (feasBtn) {
      ev.stopPropagation();
      await invoke('updateStoryMeta', { storyId: String(feasBtn.dataset.id), feasibility: feasBtn.dataset.feas });
      await refreshBoard();
      return;
    }
    const stBtn = ev.target.closest('.js-status');
    if (stBtn) {
      ev.stopPropagation();
      await invoke('updateStoryMeta', { storyId: String(stBtn.dataset.id), status: stBtn.dataset.status });
      showToast(`Status: ${stBtn.dataset.status}`);
      await refreshBoard();
      return;
    }
    const relBtn = ev.target.closest('.js-rel');
    if (relBtn) {
      ev.stopPropagation();
      await invoke('voteRelevance', { storyId: String(relBtn.dataset.id), vote: relBtn.dataset.vote });
      showToast('Relevanz gespeichert.');
      await refreshBoard();
      return;
    }
    const delBtn = ev.target.closest('.js-delete');
    if (delBtn) {
      ev.stopPropagation();
      await invoke('deleteStory', { storyId: String(delBtn.dataset.id) });
      state.expandedId = null;
      showToast('Confluence-Unterseite in den Papierkorb verschoben.');
      await refreshBoard();
      return;
    }
    const row = ev.target.closest('.js-toggle');
    if (row && !ev.target.closest('form, input, textarea, button, a')) {
      const id = String(row.dataset.id);
      state.expandedId = String(state.expandedId) === id ? null : id;
      renderBoard();
    }
  });

  document.getElementById('stories-list').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const voteForm = ev.target.closest('.js-vote-form');
    if (voteForm) {
      const fd = new FormData(voteForm);
      const sec = parseMMSS(fd.get('dur'));
      if (sec < 60) {
        showToast('Mindestens 1 Minute Zeitaufwand (z. B. 01:00) erfassen.', true);
        return;
      }
      await invoke('addCaseVote', {
        storyId: String(voteForm.dataset.id),
        durationSeconds: sec,
        feedbackNote: String(fd.get('note') || '')
      });
      state.voteOpenId = null;
      showToast(`+1 (${fmtDur(sec)}) auf Confluence-Unterseite gespeichert.`);
      await refreshBoard();
      return;
    }
    const rejForm = ev.target.closest('.js-reject-form');
    if (rejForm) {
      const reason = String(new FormData(rejForm).get('reason') || '').trim();
      if (reason.length < 3) {
        showToast('Bitte eine kurze Begründung für die Ablehnung eingeben.', true);
        return;
      }
      await invoke('updateStoryMeta', { storyId: String(rejForm.dataset.id), status: 'Abgelehnt', decisionReason: reason });
      showToast('Abgelehnt.');
      await refreshBoard();
      return;
    }
    const askForm = ev.target.closest('.js-ask-form');
    if (askForm) {
      const body = String(new FormData(askForm).get('body') || '').trim();
      await invoke('askQuestion', { storyId: String(askForm.dataset.id), body });
      showToast('Rückfrage gespeichert.');
      await refreshBoard();
      return;
    }
    const replyForm = ev.target.closest('.js-reply-form');
    if (replyForm) {
      const replyBody = String(new FormData(replyForm).get('reply') || '').trim();
      try {
        await invoke('replyQuestion', {
          storyId: String(replyForm.dataset.id),
          questionId: Number(replyForm.dataset.qid),
          replyBody
        });
        showToast('Antwort gespeichert.');
        await refreshBoard();
      } catch (err) {
        showToast(err.message, true);
      }
    }
  });

  document.getElementById('btn-csv').addEventListener('click', async () => {
    const res = await invoke('exportCsv');
    const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `requirements-engine-${state.board?.spaceKey || 'confluence'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-imprint').addEventListener('click', () => openLegal('imprint'));
  document.getElementById('btn-privacy').addEventListener('click', () => openLegal('privacy'));
  document.getElementById('btn-close-legal').addEventListener('click', () => document.getElementById('legal-modal').classList.add('hidden'));
  document.getElementById('legal-modal').addEventListener('click', (ev) => {
    if (ev.target.id === 'legal-modal') document.getElementById('legal-modal').classList.add('hidden');
  });
}

bindEvents();
refreshBoard();
