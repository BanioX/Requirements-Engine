const state = {
  viewMode: 'public', // 'public' (Nutzersicht) | 'internal' (Betrieb / vertraulich)
  origin: 'kunde',    // 'kunde' | 'betrieb'
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

const FEASIBILITY_LABELS = {
  einfach: 'Einfach machbar',
  mittel: 'Mittel',
  aufwaendig: 'Aufwändig'
};

const WORDING_TEMPLATES = {
  Geprüft: 'Danke für dein Feedback! Wir haben den Vorschlag geprüft und bewerten nun Nutzen und Aufwand.',
  'In Arbeit': 'Gute Nachricht: Dein Feedback fand grossen Anklang — wir arbeiten bereits an der Umsetzung!',
  Umgesetzt: 'Erledigt! Die Verbesserung ist ab sofort live. Danke fürs Mitgestalten!',
  Abgelehnt: 'Danke für deinen Vorschlag! Aktuell können wir das leider nicht umsetzen, weil andere Themen oder Sicherheitsvorgaben Vorrang haben.'
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

function impactBadge(item) {
  const feas = item.feasibility || 'mittel';
  const votes = Number(item.votes) || 1;
  if (feas === 'einfach' && votes >= 4) {
    return '<span class="badge-soft badge-quickwin">Quick Win</span>';
  }
  if (votes >= 8 && feas === 'aufwaendig') {
    return '<span class="badge-soft badge-big">Grossprojekt</span>';
  }
  if (votes >= 5) {
    return '<span class="badge-soft badge-high">Hoher Anklang</span>';
  }
  return '<span class="badge-soft badge-neutral">Offen</span>';
}

function renderLoopTrack(status) {
  if (status === 'Abgelehnt') {
    return `
      <div class="loop-track" aria-label="Status im Feedback-Loop">
        <span class="loop-step reached">1. Eingereicht</span>
        <span class="loop-arrow">→</span>
        <span class="loop-step reached">2. Geprüft</span>
        <span class="loop-arrow">→</span>
        <span class="loop-step rejected">3. Abgelehnt (mit Begründung)</span>
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

  const steps = ['1. Eingereicht', '2. Geprüft', '3. In Arbeit', '4. Erledigt'];
  return `
    <div class="loop-track" aria-label="Status im Feedback-Loop">
      ${steps
        .map(
          (label, idx) =>
            `<span class="loop-step ${idx + 1 <= rank ? 'reached' : ''}">${label}</span>`
        )
        .join('<span class="loop-arrow">→</span>')}
    </div>
  `;
}

async function loadHealth() {
  try {
    const h = await api('/health');
    document.getElementById('ops-dot').className = 'dot ok';
    document.getElementById('ops-db').textContent = `DB ${h.db} (${h.dbLatencyMs} ms)`;
    document.getElementById('ops-counts').textContent = `${h.counts.stories} Feedbacks in PostgreSQL`;
    document.getElementById('ops-version').textContent = h.version;
    document.getElementById('ops-commit').textContent = String(h.commit || 'local').slice(0, 7);
  } catch {
    document.getElementById('ops-dot').className = 'dot err';
    document.getElementById('ops-db').textContent = 'DB getrennt';
  }
}

async function loadIdeas() {
  const params = new URLSearchParams();
  const q = document.getElementById('filter-q').value.trim();
  if (q) params.set('q', q);
  if (state.mode === 'quickwins') params.set('sort', 'quickwins');

  let ideas = await api(`/api/stories?${params.toString()}`);
  if (state.mode === 'active') {
    ideas = ideas.filter((i) => ['In Arbeit', 'Angenommen', 'Geprüft'].includes(i.status));
  } else if (state.mode === 'done') {
    ideas = ideas.filter((i) => ['Umgesetzt', 'Abgelehnt'].includes(i.status));
  }

  const listEl = document.getElementById('ideas-list');
  if (ideas.length === 0) {
    listEl.innerHTML = '<p class="muted">Noch keine Einträge in dieser Ansicht — reiche oben die erste Idee ein.</p>';
    return;
  }

  const isInternal = state.viewMode === 'internal';

  listEl.innerHTML = ideas
    .map((item) => {
      const feas = item.feasibility || 'mittel';
      const originLabel = item.origin === 'betrieb' ? 'Betrieb / Team' : 'Kunden-Feedback';
      const tasks = Array.isArray(item.tasks_json) ? item.tasks_json : [];
      const doneCount = tasks.filter((t) => t.done).length;
      const criteria = Array.isArray(item.acceptance_criteria_json) ? item.acceptance_criteria_json : [];
      const expanded = state.expandedId === item.id;
      const voted = state.votedIds.has(item.id);
      const pending = state.pendingDecision && state.pendingDecision.id === item.id ? state.pendingDecision : null;

      const replyText = item.public_response || item.decision_reason || '';
      const replyCls =
        item.status === 'Abgelehnt' ? 'is-rejected' : item.status === 'Umgesetzt' ? 'is-done' : '';
      const publicReplyHtml = replyText
        ? `<div class="public-reply ${replyCls}"><strong>Rückmeldung:</strong> ${esc(replyText)}</div>`
        : '';

      const internalNoteHtml =
        isInternal && item.internal_note
          ? `<div class="internal-box"><strong>Nur intern (vertraulich):</strong> ${esc(item.internal_note)}</div>`
          : '';

      const drawerHtml =
        expanded && isInternal
          ? `
            <div class="idea-drawer">
              <div class="drawer-label">Machbarkeit bewerten (steuert Quick Wins)</div>
              <div class="feasibility-row">
                <span class="muted" style="font-size:0.83rem;">Umsetzungsaufwand:</span>
                <div class="segments">
                  <button type="button" class="seg js-feas ${feas === 'einfach' ? 'active' : ''}" data-id="${item.id}" data-feas="einfach">Einfach</button>
                  <button type="button" class="seg js-feas ${feas === 'mittel' ? 'active' : ''}" data-id="${item.id}" data-feas="mittel">Mittel</button>
                  <button type="button" class="seg js-feas ${feas === 'aufwaendig' ? 'active' : ''}" data-id="${item.id}" data-feas="aufwaendig">Aufwändig</button>
                </div>
              </div>

              <div class="drawer-label">Automatisch generierte User Story</div>
              <p class="story-line">${esc(item.user_story)}</p>

              <div class="drawer-label">Umsetzungsschritte (${doneCount}/${tasks.length})</div>
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

              <div class="drawer-label">Akzeptanzkriterien</div>
              <ol class="criteria-list">
                ${criteria.map((c) => `<li>${esc(c)}</li>`).join('')}
              </ol>

              <div class="decision-bar">
                <div class="decision-top">
                  <div class="segments">
                    <button type="button" class="seg js-pick ${pending?.status === 'Geprüft' ? 'active' : ''}" data-id="${item.id}" data-status="Geprüft">Geprüft</button>
                    <button type="button" class="seg js-pick ${pending?.status === 'In Arbeit' ? 'active' : ''}" data-id="${item.id}" data-status="In Arbeit">In Arbeit</button>
                    <button type="button" class="seg js-pick ${pending?.status === 'Umgesetzt' ? 'active' : ''}" data-id="${item.id}" data-status="Umgesetzt">Erledigt</button>
                    <button type="button" class="seg js-pick ${pending?.status === 'Abgelehnt' ? 'active' : ''}" data-id="${item.id}" data-status="Abgelehnt">Ablehnen</button>
                  </div>
                  <a class="text-link" href="/api/stories/${item.id}/export/markdown">Markdown</a>
                </div>
                ${
                  pending
                    ? `
                      <form class="decision-form-stack js-decide" data-id="${item.id}" data-status="${esc(pending.status)}">
                        <textarea name="publicResponse" rows="2" required placeholder="Öffentliches Kunden-Wording (für alle sichtbar)…">${esc(WORDING_TEMPLATES[pending.status] || '')}</textarea>
                        <input type="text" name="internalNote" value="${esc(item.internal_note || '')}" placeholder="Interne Begründung (vertraulich — nur im Betriebs-Modus sichtbar, optional)" />
                        <div><button type="submit" class="btn-primary">Loop aktualisieren</button></div>
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
              <span class="vote-arrow">▲</span>
              <span class="vote-count">${item.votes}</span>
              <span class="vote-sub">Stimmen</span>
            </button>
            <div class="idea-body ${isInternal ? 'js-toggle' : ''}" data-id="${item.id}">
              <h2 class="idea-title">${esc(item.title)}</h2>
              <p class="idea-text">${esc(item.raw_feedback)}</p>
              ${renderLoopTrack(item.status)}
              ${publicReplyHtml}
              ${internalNoteHtml}
              <div class="idea-meta">
                ${impactBadge(item)}
                <span>${originLabel}</span>
                ${isInternal ? `<span>· ${esc(FEASIBILITY_LABELS[feas] || 'Mittel')}</span>` : ''}
                ${isInternal ? `<span>· ${expanded ? 'Weniger' : 'Machbarkeit, Story & Wording →'}</span>` : ''}
              </div>
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
    if (state.viewMode === 'internal') {
      state.expandedId = res.story.id;
    }

    if (res.duplicates && res.duplicates.length > 0) {
      const top = res.duplicates[0];
      dupBanner.textContent = `Ähnliches Feedback existiert bereits: «${top.title}» (${top.similarityPercent} % Überschneidung) — am besten dort direkt hochvoten!`;
      dupBanner.classList.remove('hidden');
    } else {
      dupBanner.classList.add('hidden');
    }

    showToast('Danke! Dein Feedback ist jetzt live im Loop und kann gevotet werden.');
    await Promise.all([loadIdeas(), loadHealth()]);
  } catch (err) {
    showToast(err.message);
  }
}

function init() {
  document.querySelectorAll('[data-view-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.viewMode = btn.dataset.viewMode;
      state.pendingDecision = null;
      document.querySelectorAll('[data-view-mode]').forEach((b) => b.classList.toggle('active', b === btn));
      loadIdeas();
    });
  });

  document.querySelectorAll('[data-origin]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.origin = btn.dataset.origin;
      document.querySelectorAll('[data-origin]').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  document.getElementById('feedback-form').addEventListener('submit', handleSubmit);

  document.querySelectorAll('[data-example]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('fb-text').value = EXAMPLES[btn.dataset.example] || '';
      document.getElementById('fb-text').focus();
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
        showToast(`Machbarkeit auf «${FEASIBILITY_LABELS[feasBtn.dataset.feas]}» gesetzt.`);
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
    const form = ev.target.closest('.js-decide');
    if (!form) return;
    ev.preventDefault();
    const fd = new FormData(form);
    try {
      await api(`/api/stories/${form.dataset.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          status: form.dataset.status,
          publicResponse: fd.get('publicResponse'),
          internalNote: fd.get('internalNote')
        })
      });
      state.pendingDecision = null;
      showToast('Feedback-Loop & Wording gespeichert.');
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
