const state = {
  channel: 'E-Mail',
  ampel: 'alle',
  mode: 'all', // 'all' | 'active' | 'done'
  expandedId: null,
  freshId: null,
  pendingStatus: null, // { id, status }
  votedIds: new Set(JSON.parse(localStorage.getItem('re_voted') || '[]'))
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
      const tasks = Array.isArray(item.tasks_json) ? item.tasks_json : [];
      const expanded = state.expandedId === item.id;
      const voted = state.votedIds.has(item.id);
      const pending = state.pendingStatus && state.pendingStatus.id === item.id ? state.pendingStatus : null;
      const wording = item.public_response || item.decision_reason || '';

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
              <div style="display:flex; gap:12px;">
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
                  ${ampelDot(feas)}
                  <span>${esc(channel)}</span>
                  ${statusBadge(item.status)}
                </div>
              </div>
              <p class="idea-text">${esc(item.raw_feedback)}</p>
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

async function handleSubmit(ev) {
  ev.preventDefault();
  const textarea = document.getElementById('fb-text');
  const dupBanner = document.getElementById('dup-banner');

  try {
    const res = await api('/api/stories', {
      method: 'POST',
      body: JSON.stringify({
        rawFeedback: textarea.value.trim(),
        channel: state.channel,
        origin: state.channel === 'Intern / Team' ? 'betrieb' : 'kunde'
      })
    });

    textarea.value = '';
    state.freshId = res.story.id;
    state.ampel = 'alle';
    document.querySelectorAll('.ampel-btn').forEach((b) => b.classList.toggle('active', b.dataset.ampel === 'alle'));

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

  document.getElementById('brand-link').addEventListener('click', (ev) => {
    ev.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  document.querySelectorAll('.ampel-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.ampel = btn.dataset.ampel;
      document.querySelectorAll('.ampel-btn').forEach((b) => b.classList.toggle('active', b === btn));
      loadIdeas();
    });
  });

  document.querySelectorAll('.status-group .st-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;
      document.querySelectorAll('.status-group .st-btn').forEach((b) => b.classList.toggle('active', b === btn));
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

    const delBtn = ev.target.closest('.js-delete');
    if (delBtn) {
      ev.stopPropagation();
      await api(`/api/stories/${delBtn.dataset.id}`, { method: 'DELETE' });
      state.expandedId = null;
      showToast('Gelöscht.');
      await Promise.all([loadIdeas(), loadHealth()]);
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
