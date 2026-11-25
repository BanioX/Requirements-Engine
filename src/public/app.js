const state = {
  viewMode: 'public', // 'public' | 'internal'
  origin: 'kunde',    // 'kunde' | 'betrieb'
  ampel: 'alle',      // 'alle' | 'einfach' | 'mittel' | 'aufwaendig'
  mode: 'top',        // 'top' | 'quickwins' | 'active' | 'done'
  expandedId: null,
  freshId: null,
  pendingDecision: null,
  votedIds: new Set(JSON.parse(localStorage.getItem('re_voted') || '[]'))
};

const EXAMPLES = {
  auszug:
    'Nutzende können aktuell keinen eigenen Auszug oder Beleg für einen freien Zeitraum als PDF erstellen und müssen dafür jedes Mal den Support kontaktieren.',
  passwort:
    'Nach 3 falschen Login-Versuchen erscheint keine klare Meldung mit Lösungsschritt, sodass viele Personen unnötig bei der Hotline anrufen.',
  status:
    'Nach dem Einreichen einer Anfrage sieht man keinen Bearbeitungsstatus, weshalb Kunden oft telefonisch nachfragen.'
};

const WORDING_TEMPLATES = {
  Geprüft: 'Danke für dein Feedback! Wir haben deinen Vorschlag geprüft und bewerten jetzt Nutzen und Aufwand.',
  'In Arbeit': 'Gute Nachricht: Dein Vorschlag fand starken Anklang — unser Team arbeitet bereits an der Umsetzung!',
  Umgesetzt: 'Erledigt! Diese Verbesserung ist ab sofort live. Danke für deinen wertvollen Input!',
  Abgelehnt: 'Danke für deine Idee! Aktuell können wir das leider nicht umsetzen, da Sicherheitsvorgaben oder andere Prioritäten vorgehen.'
};

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), 2600);
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

function ampelPill(item) {
  const feas = item.feasibility || 'mittel';
  const votes = Number(item.votes) || 1;
  if (feas === 'einfach' && votes >= 4) {
    return '<span class="pill-badge pill-green"><span class="ampel-dot dot-green"></span>Quick Win · Einfach</span>';
  }
  if (feas === 'einfach') {
    return '<span class="pill-badge pill-green"><span class="ampel-dot dot-green"></span>Einfach machbar</span>';
  }
  if (feas === 'aufwaendig') {
    return '<span class="pill-badge pill-red"><span class="ampel-dot dot-red"></span>Aufwändig</span>';
  }
  return '<span class="pill-badge pill-amber"><span class="ampel-dot dot-amber"></span>Mittel</span>';
}

function statusPill(status) {
  if (status === 'Umgesetzt') {
    return '<span class="pill-badge pill-green">✓ Erledigt</span>';
  }
  if (status === 'In Arbeit' || status === 'Angenommen') {
    return '<span class="pill-badge pill-blue">● In Arbeit</span>';
  }
  if (status === 'Abgelehnt') {
    return '<span class="pill-badge pill-red">Abgelehnt</span>';
  }
  if (status === 'Geprüft' || status === 'Bereit') {
    return '<span class="pill-badge pill-slate">Geprüft</span>';
  }
  return '<span class="pill-badge pill-slate">Eingereicht</span>';
}

function renderLoopBar(status) {
  if (status === 'Abgelehnt') {
    return `
      <div class="loop-wrap" aria-label="Feedback-Loop">
        <div class="loop-bars">
          <div class="loop-bar-seg filled"></div>
          <div class="loop-bar-seg filled"></div>
          <div class="loop-bar-seg filled-red"></div>
          <div class="loop-bar-seg"></div>
        </div>
        <div class="loop-labels">
          <span class="on">Eingereicht</span>
          <span class="on">Geprüft</span>
          <span class="on-red">Abgelehnt</span>
          <span>–</span>
        </div>
      </div>
    `;
  }

  const rank =
    status === 'Umgesetzt'
      ? 4
      : status === 'In Arbeit' || status === 'Angenommen'
        ? 3
        : status === 'Geprüft' || status === 'Bereit'
          ? 2
          : 1;

  const fillCls = rank === 4 ? 'filled-green' : 'filled';
  const labels = ['Eingereicht', 'Geprüft', 'In Arbeit', 'Erledigt'];

  return `
    <div class="loop-wrap" aria-label="Feedback-Loop">
      <div class="loop-bars">
        ${labels.map((_, idx) => `<div class="loop-bar-seg ${idx + 1 <= rank ? fillCls : ''}"></div>`).join('')}
      </div>
      <div class="loop-labels">
        ${labels.map((lbl, idx) => `<span class="${idx + 1 <= rank ? 'on' : ''}">${lbl}</span>`).join('')}
      </div>
    </div>
  `;
}

async function loadHealth() {
  try {
    const h = await api('/health');
    document.getElementById('ops-dot').className = 'pulse-dot ok';
    document.getElementById('ops-db').textContent = `DB ${h.db} (${h.dbLatencyMs} ms)`;
    document.getElementById('ops-counts').textContent = `${h.counts.stories} Einträge in PostgreSQL`;
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
  if (state.mode === 'quickwins') params.set('sort', 'quickwins');

  const allIdeas = await api(`/api/stories?${params.toString()}`);

  // Ampel-Zähler aktualisieren
  document.getElementById('count-all').textContent = String(allIdeas.length);
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
    listEl.innerHTML = '<div class="empty-state">Noch keine Einträge in dieser Ansicht — wirf oben die erste Idee ein oder wähle «Alle».</div>';
    return;
  }

  const isInternal = state.viewMode === 'internal';

  listEl.innerHTML = ideas
    .map((item) => {
      const feas = item.feasibility || 'mittel';
      const originLabel = item.origin === 'betrieb' ? 'Betrieb / Team' : 'Kunden-Feedback';
      const tasks = Array.isArray(item.tasks_json) ? item.tasks_json : [];
      const doneCount = tasks.filter((t) => t.done).length;
      const taskPct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;
      const criteria = Array.isArray(item.acceptance_criteria_json) ? item.acceptance_criteria_json : [];
      const expanded = state.expandedId === item.id;
      const voted = state.votedIds.has(item.id);
      const pending = state.pendingDecision && state.pendingDecision.id === item.id ? state.pendingDecision : null;

      const replyText = item.public_response || item.decision_reason || '';
      const replyCls =
        item.status === 'Abgelehnt' ? 'is-rejected' : item.status === 'Umgesetzt' ? 'is-done' : '';
      const publicReplyHtml = replyText
        ? `
          <div class="public-reply ${replyCls}">
            <div class="reply-head">Rückmeldung an Nutzende</div>
            <div>${esc(replyText)}</div>
          </div>
        `
        : '';

      const internalNoteHtml =
        isInternal && item.internal_note
          ? `
            <div class="internal-box">
              <div class="internal-head">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>Vertraulich · Nur Betrieb</span>
              </div>
              <div>${esc(item.internal_note)}</div>
            </div>
          `
          : '';

      const drawerHtml =
        expanded && isInternal
          ? `
            <div class="idea-drawer">
              <div class="drawer-section">
                <div class="drawer-label">Machbarkeits-Ampel bewerten (steuert Quick Wins live)</div>
                <div class="ampel-picker">
                  <button type="button" class="feas-btn js-feas ${feas === 'einfach' ? 'active-einfach' : ''}" data-id="${item.id}" data-feas="einfach">
                    <span class="ampel-dot dot-green"></span>
                    <span>Einfach (Quick Win)</span>
                  </button>
                  <button type="button" class="feas-btn js-feas ${feas === 'mittel' ? 'active-mittel' : ''}" data-id="${item.id}" data-feas="mittel">
                    <span class="ampel-dot dot-amber"></span>
                    <span>Mittel</span>
                  </button>
                  <button type="button" class="feas-btn js-feas ${feas === 'aufwaendig' ? 'active-aufwaendig' : ''}" data-id="${item.id}" data-feas="aufwaendig">
                    <span class="ampel-dot dot-red"></span>
                    <span>Aufwändig</span>
                  </button>
                </div>
              </div>

              <div class="drawer-section">
                <div class="drawer-label">Automatisch erzeugte User Story &amp; Umsetzung (${doneCount}/${tasks.length})</div>
                <div class="engine-box">
                  <p class="story-line">${esc(item.user_story)}</p>
                  <div class="task-progress"><div class="task-progress-fill" style="width:${taskPct}%"></div></div>
                  <ul class="task-list">
                    ${tasks
                      .map(
                        (t) => `
                        <li class="${t.done ? 'done' : ''}">
                          <input type="checkbox" class="js-task" data-story-id="${item.id}" data-task-id="${esc(t.id)}" ${t.done ? 'checked' : ''} />
                          <span>${esc(t.title)} <span class="muted">(${t.estimateHours} h)</span></span>
                        </li>`
                      )
                      .join('')}
                  </ul>
                  <div class="drawer-label" style="margin-top:14px;">Akzeptanzkriterien</div>
                  <ol class="criteria-list">
                    ${criteria.map((c) => `<li>${esc(c)}</li>`).join('')}
                  </ol>
                </div>
              </div>

              <div class="drawer-section">
                <div class="drawer-label">Feedback-Loop steuern (Öffentliches Wording &amp; Interne Notiz)</div>
                <div class="decision-top">
                  <div class="segments">
                    <button type="button" class="seg js-pick ${pending?.status === 'Geprüft' ? 'active' : ''}" data-id="${item.id}" data-status="Geprüft">Geprüft</button>
                    <button type="button" class="seg js-pick ${pending?.status === 'In Arbeit' ? 'active' : ''}" data-id="${item.id}" data-status="In Arbeit">In Arbeit</button>
                    <button type="button" class="seg js-pick ${pending?.status === 'Umgesetzt' ? 'active' : ''}" data-id="${item.id}" data-status="Umgesetzt">Erledigt</button>
                    <button type="button" class="seg js-pick ${pending?.status === 'Abgelehnt' ? 'active' : ''}" data-id="${item.id}" data-status="Abgelehnt">Ablehnen</button>
                  </div>
                  <a class="text-link" href="/api/stories/${item.id}/export/markdown">Als Markdown laden</a>
                </div>
                ${
                  pending
                    ? `
                      <form class="decision-form-stack js-decide" data-id="${item.id}" data-status="${esc(pending.status)}">
                        <div class="field-group">
                          <label>Kunden-Wording (öffentlich sichtbar)</label>
                          <textarea name="publicResponse" rows="2" required>${esc(WORDING_TEMPLATES[pending.status] || '')}</textarea>
                        </div>
                        <div class="field-group">
                          <label>Interne Begründung (vertraulich — nur im Betriebs-Modus sichtbar)</label>
                          <input type="text" name="internalNote" value="${esc(item.internal_note || '')}" placeholder="z. B. Budget, Compliance-Vorgabe, geschätzte Ticket-Reduktion…" />
                        </div>
                        <div>
                          <button type="submit" class="btn-primary">Status «${esc(pending.status)}» veröffentlichen</button>
                        </div>
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
            <button type="button" class="vote-box ${voted ? 'voted' : ''} js-vote" data-id="${item.id}" title="Findet Anklang — entlastet im Alltag (+1)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>
              <span class="vote-count">${item.votes}</span>
              <span class="vote-sub">Stimmen</span>
            </button>

            <div class="idea-body ${isInternal ? 'clickable js-toggle' : ''}" data-id="${item.id}">
              <div class="card-badges">
                ${ampelPill(item)}
                ${statusPill(item.status)}
                <span class="pill-badge pill-slate">${originLabel}</span>
              </div>

              <h2 class="idea-title">${esc(item.title)}</h2>
              <p class="idea-text">${esc(item.raw_feedback)}</p>

              ${renderLoopBar(item.status)}
              ${publicReplyHtml}
              ${internalNoteHtml}

              ${
                isInternal
                  ? `
                    <div class="card-foot">
                      <span>Impact-Score ${item.priority_score}/100 · ${doneCount}/${tasks.length} Tasks · REQ-${item.id}</span>
                      <span class="expand-cue">${expanded ? 'Details schliessen ↑' : 'Ampel, Story & Wording öffnen →'}</span>
                    </div>
                  `
                  : ''
              }
            </div>
          </div>
          ${drawerHtml}
        </article>
      `;
    })
    .join('');
}

async function handleSubmit(ev) {
  ev.preventDefault();
  const textarea = document.getElementById('fb-text');
  const dupBanner = document.getElementById('dup-banner');

  try {
    const res = await api('/api/stories', {
      method: 'POST',
      body: JSON.stringify({
        rawFeedback: textarea.value.trim(),
        origin: state.origin
      })
    });

    textarea.value = '';
    state.freshId = res.story.id;
    state.ampel = 'alle';
    document.querySelectorAll('.ampel-chip').forEach((c) => c.classList.toggle('active', c.dataset.ampel === 'alle'));

    if (state.viewMode === 'internal') {
      state.expandedId = res.story.id;
    }

    if (res.duplicates && res.duplicates.length > 0) {
      const top = res.duplicates[0];
      dupBanner.textContent = `Ähnliche Idee bereits vorhanden: «${top.title}» (${top.similarityPercent} % Überschneidung) — am besten dort direkt hochvoten!`;
      dupBanner.classList.remove('hidden');
    } else {
      dupBanner.classList.add('hidden');
    }

    showToast('Danke! Dein Feedback ist jetzt live im Loop.');
    await Promise.all([loadIdeas(), loadHealth()]);
  } catch (err) {
    showToast(err.message);
  }
}

function init() {
  document.getElementById('brand-link').addEventListener('click', (ev) => {
    ev.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.querySelectorAll('[data-view-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.viewMode = btn.dataset.viewMode;
      state.pendingDecision = null;
      document.querySelectorAll('[data-view-mode]').forEach((b) => b.classList.toggle('active', b === btn));
      document.getElementById('internal-ribbon').classList.toggle('hidden', state.viewMode !== 'internal');
      loadIdeas();
    });
  });

  document.querySelectorAll('[data-origin]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.origin = btn.dataset.origin;
      document.querySelectorAll('[data-origin]').forEach((b) => b.classList.toggle('active', b === btn));
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

  document.querySelectorAll('[data-example]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('fb-text').value = EXAMPLES[btn.dataset.example] || '';
      document.getElementById('fb-text').focus();
    });
  });

  document.querySelectorAll('.ampel-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.ampel = btn.dataset.ampel;
      document.querySelectorAll('.ampel-chip').forEach((b) => b.classList.toggle('active', b === btn));
      loadIdeas();
    });
  });

  document.querySelectorAll('.toolbar .seg').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;
      document.querySelectorAll('.toolbar .seg').forEach((b) => b.classList.toggle('active', b === btn));
      loadIdeas();
    });
  });

  document.getElementById('filter-q').addEventListener('input', () => {
    clearTimeout(init._t);
    init._t = setTimeout(loadIdeas, 180);
  });

  document.getElementById('ideas-list').addEventListener('click', async (ev) => {
    const voteBtn = ev.target.closest('.js-vote');
    if (voteBtn) {
      const id = Number(voteBtn.dataset.id);
      try {
        await api(`/api/stories/${id}/vote`, { method: 'POST' });
        state.votedIds.add(id);
        localStorage.setItem('re_voted', JSON.stringify([...state.votedIds]));
        showToast('Stimme gezählt — Ranking aktualisiert.');
        await Promise.all([loadIdeas(), loadHealth()]);
      } catch (err) {
        showToast(err.message);
      }
      return;
    }

    const feasBtn = ev.target.closest('.js-feas');
    if (feasBtn) {
      const id = Number(feasBtn.dataset.id);
      try {
        await api(`/api/stories/${id}/feasibility`, {
          method: 'PATCH',
          body: JSON.stringify({ feasibility: feasBtn.dataset.feas })
        });
        showToast('Machbarkeits-Ampel aktualisiert.');
        await loadIdeas();
      } catch (err) {
        showToast(err.message);
      }
      return;
    }

    const pickBtn = ev.target.closest('.js-pick');
    if (pickBtn) {
      state.pendingDecision = { id: Number(pickBtn.dataset.id), status: pickBtn.dataset.status };
      await loadIdeas();
      return;
    }

    const body = ev.target.closest('.js-toggle');
    if (body && state.viewMode === 'internal') {
      const id = Number(body.dataset.id);
      state.expandedId = state.expandedId === id ? null : id;
      state.pendingDecision = null;
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
      state.pendingDecision = null;
      showToast(`Loop auf «${formEl.dataset.status}» aktualisiert.`);
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
