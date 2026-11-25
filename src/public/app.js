const state = {
  processes: [],
  selectedProcessId: null,
  selectedProcessDetail: null,
  stories: [],
  stepDraftImage: null,
  stepDraftMarkers: []
};

const EXAMPLES = {
  ebanking: {
    role: 'Mobile-Banking-Kundschaft',
    type: 'kunden_aerger',
    urgency: 'hoch',
    text: 'Kunden im eBanking finden den PDF-Export für den Zins- und Jahresauszug nicht und rufen dauernd die Hotline an, weil der Button tief im Untermenü versteckt ist sowie keine Druckvorschau existiert.'
  },
  mobile: {
    role: 'eBanking-Support',
    type: 'kunden_aerger',
    urgency: 'kritisch',
    text: 'Bei der 2FA-Push-Freigabe im Mobile Banking bricht der Login nach 20 Sekunden ohne verständliche Fehlermeldung ab, sodass Kunden Zahlungen doppelt erfassen und den Support anrufen müssen.'
  },
  kmu: {
    role: 'Buchhaltung',
    type: 'prozess_engpass',
    urgency: 'hoch',
    text: 'Vor Ferien müssen wir alle offenen Kreditoren-Fristen manuell in Excel zusammensuchen sowie die Stellvertretung per E-Mail informieren, weil sonst Mahnungen vergessen gehen.'
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

function showToast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => el.classList.add('hidden'), 3200);
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

function badgeForTrafficLight(tl) {
  if (!tl || tl.status === 'none') return '<span class="badge badge-neutral">Kein Termin</span>';
  const cls = tl.status === 'red' ? 'badge-red' : tl.status === 'yellow' ? 'badge-yellow' : 'badge-green';
  return `<span class="badge ${cls}">${esc(tl.label)}</span>`;
}

function badgeForMoscow(moscow) {
  const cls = moscow === 'Must' ? 'badge-must' : moscow === 'Should' ? 'badge-should' : 'badge-could';
  return `<span class="badge ${cls}">${esc(moscow)}</span>`;
}

// --- Tabs ---
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    const active = btn.dataset.tab === tabName;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });
  if (tabName === 'decisions') {
    loadDeadlinesAndDecisions();
  }
}

// --- Live-Betriebs-Panel & KPIs ---
async function loadHealthAndOverview() {
  try {
    const [health, overview] = await Promise.all([api('/health'), api('/api/overview')]);
    document.getElementById('ops-dot').className = 'dot ok';
    document.getElementById('ops-db').textContent = `${health.db} (${health.dbLatencyMs} ms)`;
    document.getElementById('ops-counts').textContent = `${health.counts.processes} Prozesse · ${health.counts.stories} Stories · ${health.counts.decisions} Entscheide`;
    document.getElementById('ops-health').textContent = `OK (${health.uptimeSeconds}s)`;
    document.getElementById('ops-version').textContent = health.version;
    document.getElementById('ops-commit').textContent = String(health.commit || 'local').slice(0, 7);

    document.getElementById('kpi-compliance').textContent = `${overview.complianceScore} %`;
    document.getElementById('kpi-ampel-summary').textContent =
      `${overview.processHealth.green} aktuell · ${overview.processHealth.yellow} bald fällig · ${overview.processHealth.red} überfällig`;
    document.getElementById('kpi-must').textContent = String(overview.mustStoriesOpen);
    document.getElementById('kpi-processes').textContent = String(overview.counts.processes);
    document.getElementById('kpi-steps').textContent = `${overview.counts.steps} Klick-Schritte in PostgreSQL`;
    document.getElementById('kpi-decisions').textContent = String(overview.counts.decisions);
  } catch (err) {
    document.getElementById('ops-dot').className = 'dot err';
    document.getElementById('ops-db').textContent = 'getrennt';
    document.getElementById('ops-health').textContent = 'FEHLER';
  }
}

// --- Requirements Engine Tab ---
function renderPreview(result) {
  const dupHtml =
    result.duplicates && result.duplicates.length > 0
      ? `<div class="dup-alert">
          <strong>Duplikat-Radar:</strong> Ähnliche Einträge gefunden:
          <ul>${result.duplicates
            .map(
              (d) =>
                `<li>REQ-${d.id}: <strong>${esc(d.title)}</strong> (${d.similarityPercent} % Überschneidung, Status: ${esc(d.status)})</li>`
            )
            .join('')}</ul>
        </div>`
      : '';

  document.getElementById('preview-content').className = '';
  document.getElementById('preview-content').innerHTML = `
    <div class="badge-row">
      ${badgeForMoscow(result.moscow)}
      <span class="badge badge-blue">${esc(result.reqType)}</span>
      <span class="badge badge-neutral">Score ${result.priorityScore}/100</span>
      <span class="badge badge-neutral">Grösse ${esc(result.sizeEstimate)} (~${result.totalEstimatedHours} h)</span>
    </div>
    <h3 style="margin-top:12px;">${esc(result.title)}</h3>
    <div class="story-quote">${esc(result.userStory)}</div>
    <h4>Automatisch geschnittene Tasks (${result.tasks.length})</h4>
    <ul class="task-checklist">
      ${result.tasks
        .map((t) => `<li><strong>${esc(t.id)}</strong> <span>${esc(t.title)} <em>(${t.estimateHours} h)</em></span></li>`)
        .join('')}
    </ul>
    <h4>Akzeptanzkriterien</h4>
    <ol class="criteria-list">
      ${result.acceptanceCriteria.map((c) => `<li>${esc(c)}</li>`).join('')}
    </ol>
    ${dupHtml}
  `;
}

async function handlePreview() {
  const rawFeedback = document.getElementById('fb-text').value;
  try {
    const result = await api('/api/stories/preview', {
      method: 'POST',
      body: JSON.stringify({
        rawFeedback,
        sourceRole: document.getElementById('fb-role').value,
        feedbackType: document.getElementById('fb-type').value,
        urgency: document.getElementById('fb-urgency').value
      })
    });
    renderPreview(result);
  } catch (err) {
    showToast(err.message);
  }
}

async function handleFeedbackSubmit(event) {
  event.preventDefault();
  try {
    const payload = {
      rawFeedback: document.getElementById('fb-text').value,
      sourceRole: document.getElementById('fb-role').value,
      feedbackType: document.getElementById('fb-type').value,
      urgency: document.getElementById('fb-urgency').value,
      processId: document.getElementById('fb-process').value || null,
      dueDate: document.getElementById('fb-due').value || null
    };
    const res = await api('/api/stories', { method: 'POST', body: JSON.stringify(payload) });
    renderPreview({
      ...res.story,
      userStory: res.story.user_story,
      reqType: res.story.req_type,
      sizeEstimate: res.story.size_estimate,
      priorityScore: res.story.priority_score,
      totalEstimatedHours: (res.story.tasks_json || []).reduce((s, t) => s + (Number(t.estimateHours) || 1), 0),
      tasks: res.story.tasks_json || [],
      acceptanceCriteria: res.story.acceptance_criteria_json || [],
      duplicates: res.duplicates || []
    });
    document.getElementById('fb-text').value = '';
    showToast(`REQ-${res.story.id} automatisch erzeugt und in PostgreSQL gespeichert.`);
    await Promise.all([loadStories(), loadHealthAndOverview()]);
  } catch (err) {
    showToast(err.message);
  }
}

async function loadStories() {
  const params = new URLSearchParams();
  const status = document.getElementById('filter-status').value;
  const moscow = document.getElementById('filter-moscow').value;
  const q = document.getElementById('filter-q').value.trim();
  if (status && status !== 'Alle') params.set('status', status);
  if (moscow && moscow !== 'Alle') params.set('moscow', moscow);
  if (q) params.set('q', q);

  const stories = await api(`/api/stories?${params.toString()}`);
  state.stories = stories;
  const container = document.getElementById('stories-list');

  if (stories.length === 0) {
    container.innerHTML = '<p class="muted">Keine Anforderungen für diesen Filter gefunden.</p>';
    return;
  }

  container.innerHTML = stories
    .map((s) => {
      const tasks = Array.isArray(s.tasks_json) ? s.tasks_json : [];
      const doneCount = tasks.filter((t) => t.done).length;
      const criteria = Array.isArray(s.acceptance_criteria_json) ? s.acceptance_criteria_json : [];
      return `
        <article class="story-item" data-story-id="${s.id}">
          <div class="story-top">
            <div>
              <div class="badge-row">
                <span class="badge badge-neutral">REQ-${s.id}</span>
                ${badgeForMoscow(s.moscow)}
                <span class="badge badge-blue">${esc(s.status)}</span>
                <span class="badge badge-neutral">Score ${s.priority_score}</span>
                <span class="badge badge-neutral">Grösse ${esc(s.size_estimate)}</span>
                ${s.due_date ? badgeForTrafficLight(s.trafficLight) : ''}
              </div>
              <h3 class="story-title" style="margin-top:8px;">${esc(s.title)}</h3>
              <p class="muted">Rolle: <strong>${esc(s.source_role)}</strong> · ${esc(s.req_type)}${s.process_title ? ` · Prozess: <em>${esc(s.process_title)}</em>` : ''}</p>
            </div>
            <div class="badge-row">
              <button type="button" class="btn btn-secondary btn-sm js-vote" data-id="${s.id}">▲ Vote (${s.votes})</button>
              <a class="btn btn-secondary btn-sm" href="/api/stories/${s.id}/export/markdown">Markdown</a>
            </div>
          </div>

          <div class="story-quote">${esc(s.user_story)}</div>
          <p class="muted"><strong>Roh-Feedback:</strong> ${esc(s.raw_feedback)}</p>

          <details open>
            <summary style="cursor:pointer; font-weight:600; font-size:0.88rem; margin-top:8px;">
              Tasks (${doneCount}/${tasks.length} erledigt) &amp; Akzeptanzkriterien (${criteria.length})
            </summary>
            <ul class="task-checklist">
              ${tasks
                .map(
                  (t) => `
                  <li class="${t.done ? 'done' : ''}">
                    <input type="checkbox" class="js-toggle-task" data-story-id="${s.id}" data-task-id="${esc(t.id)}" ${t.done ? 'checked' : ''} />
                    <span><strong>${esc(t.id)}</strong> ${esc(t.title)} <em>(${t.estimateHours} h)</em></span>
                  </li>`
                )
                .join('')}
            </ul>
            <ol class="criteria-list">
              ${criteria.map((c) => `<li>${esc(c)}</li>`).join('')}
            </ol>
          </details>

          ${s.decision_reason ? `<p class="muted" style="margin-top:8px;"><strong>Aktuelle Entscheid-Begründung:</strong> ${esc(s.decision_reason)}</p>` : ''}

          <form class="decision-box js-decision-form" data-id="${s.id}">
            <select name="status" aria-label="Neuer Status">
              ${['Bereit', 'Angenommen', 'Zurückgestellt', 'Abgelehnt', 'Umgesetzt']
                .map((st) => `<option value="${st}" ${s.status === st ? 'selected' : ''}>${st}</option>`)
                .join('')}
            </select>
            <input type="text" name="reason" required placeholder="Begründung für Entscheid-Log eingeben…" />
            <input type="date" name="dueDate" value="${s.due_date ? esc(String(s.due_date).slice(0, 10)) : ''}" aria-label="Frist" />
            <button type="submit" class="btn btn-primary btn-sm">Entscheid protokollieren</button>
          </form>
        </article>
      `;
    })
    .join('');
}

// --- Klick-Anleitungen Tab ---
async function loadProcesses() {
  const processes = await api('/api/processes');
  state.processes = processes;

  // Dropdown im Feedback-Formular befüllen
  const select = document.getElementById('fb-process');
  const prevVal = select.value;
  select.innerHTML =
    '<option value="">Keine Verknüpfung</option>' +
    processes.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join('');
  select.value = prevVal;

  const listEl = document.getElementById('processes-list');
  if (processes.length === 0) {
    listEl.innerHTML = '<p class="muted">Noch keine Prozesse vorhanden.</p>';
    return;
  }

  if (!state.selectedProcessId || !processes.some((p) => p.id === state.selectedProcessId)) {
    state.selectedProcessId = processes[0].id;
  }

  listEl.innerHTML = processes
    .map(
      (p) => `
      <button type="button" class="process-card-btn ${p.id === state.selectedProcessId ? 'active' : ''}" data-proc-id="${p.id}">
        <div class="badge-row">
          ${badgeForTrafficLight(p.trafficLight)}
          <span class="badge badge-neutral">${esc(p.category)}</span>
        </div>
        <strong>${esc(p.title)}</strong>
        <span class="muted">${p.step_count} Schritte · v${p.version_nr} · Review: ${esc(String(p.next_review_at).slice(0, 10))}</span>
      </button>
    `
    )
    .join('');

  await loadProcessDetail(state.selectedProcessId);
}

async function loadProcessDetail(id) {
  const proc = await api(`/api/processes/${id}`);
  state.selectedProcessDetail = proc;
  state.stepDraftImage = null;
  state.stepDraftMarkers = [];

  const detailEl = document.getElementById('process-detail');
  const stepsHtml =
    proc.steps.length > 0
      ? proc.steps
          .map((step) => {
            const markers = Array.isArray(step.markers_json) ? step.markers_json : [];
            const imgBlock = step.screenshot_data
              ? `
                <div class="screenshot-stage">
                  <img src="${esc(step.screenshot_data)}" alt="Screenshot zu Schritt ${step.step_order}" />
                  ${markers
                    .map(
                      (m, idx) =>
                        `<span class="click-marker" style="left:${m.x}%; top:${m.y}%;" title="${esc(m.label || `Klick ${idx + 1}`)}">${idx + 1}</span>`
                    )
                    .join('')}
                </div>
                ${
                  markers.length > 0
                    ? `<div class="marker-legend">${markers
                        .map((m, idx) => `<span><strong>(${idx + 1})</strong> ${esc(m.label || 'Klick-Punkt')}</span>`)
                        .join(' · ')}</div>`
                    : ''
                }
              `
              : '';

            return `
              <div class="step-card hint-${esc(step.hint_type || 'info')}">
                <div class="step-header">
                  <label class="step-check-label">
                    <input type="checkbox" />
                    <span>Schritt ${step.step_order}: ${esc(step.action_title)}</span>
                  </label>
                  <button type="button" class="btn btn-danger btn-sm no-print js-del-step" data-proc-id="${proc.id}" data-step-id="${step.id}">Entfernen</button>
                </div>
                ${step.ui_target ? `<div class="ui-path">Klick-Pfad: ${esc(step.ui_target)}</div>` : ''}
                ${step.details ? `<p style="margin:8px 0 0;">${esc(step.details)}</p>` : ''}
                ${imgBlock}
              </div>
            `;
          })
          .join('')
      : '<p class="muted">Noch keine Klick-Schritte hinterlegt — füge unten den ersten Schritt hinzu.</p>';

  detailEl.innerHTML = `
    <div class="card-header">
      <div>
        <div class="badge-row">
          ${badgeForTrafficLight(proc.trafficLight)}
          <span class="badge badge-blue">${esc(proc.category)}</span>
          <span class="badge badge-neutral">Version v${proc.version_nr}</span>
          <span class="badge badge-neutral">Intervall: ${proc.review_interval_days} Tage</span>
        </div>
        <h2 style="margin-top:8px;">${esc(proc.title)}</h2>
        <p class="muted">Verantwortlich: <strong>${esc(proc.owner_role)}</strong> · Nächstes Review: <strong>${esc(String(proc.next_review_at).slice(0, 10))}</strong></p>
      </div>
      <div class="badge-row no-print">
        <button type="button" class="btn btn-primary btn-sm" id="btn-confirm-review">Als aktuell bestätigen</button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-report-feedback">Problem / Idee melden</button>
        <a class="btn btn-secondary btn-sm" href="/api/processes/${proc.id}/export/markdown">Markdown</a>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-print-proc">Drucken / PDF</button>
      </div>
    </div>

    ${proc.summary ? `<p>${esc(proc.summary)}</p>` : ''}

    <h3>Interaktive Klick-Anleitung (Mitmach-Modus: Schritte einfach abhaken)</h3>
    ${stepsHtml}

    <hr class="divider no-print" />
    <div class="no-print">
      <h3>Neuen Klick-Schritt hinzufügen</h3>
      <form id="step-form" class="form-stack">
        <div class="form-row">
          <label>
            Aktion / Schritt-Titel
            <input type="text" id="step-title" required placeholder="z. B. Button «Freigeben» anklicken" />
          </label>
          <label>
            Menü- / Klick-Pfad
            <input type="text" id="step-target" placeholder="z. B. Portal → Zahlungen → Limiten" />
          </label>
          <label>
            Hinweis-Typ
            <select id="step-hint">
              <option value="info">Standard</option>
              <option value="tip">Tipp / Best Practice</option>
              <option value="warn">Wichtig / Sicherheitshinweis</option>
            </select>
          </label>
        </div>
        <label>
          Beschreibung
          <textarea id="step-details" rows="2" placeholder="Was passiert nach dem Klick oder worauf muss geachtet werden?"></textarea>
        </label>

        <div>
          <label>Screenshot (optional) — mit <strong>Ctrl+V</strong> einfügen oder Datei wählen, danach direkt ins Bild klicken für Marker (1), (2)…</label>
          <div id="paste-zone" class="paste-zone" tabindex="0">
            Hier klicken und Screenshot mit <strong>Ctrl+V</strong> einfügen — oder Bilddatei auswählen:
            <div style="margin-top:8px;">
              <input type="file" id="step-file" accept="image/*" />
            </div>
          </div>
          <div id="step-preview-wrap" style="margin-top:10px;"></div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Schritt speichern</button>
        </div>
      </form>
    </div>
  `;

  bindProcessDetailHandlers(proc);
}

function compressImageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1100;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Datei konnte nicht geladen werden.'));
    reader.readAsDataURL(file);
  });
}

function renderStepDraftPreview() {
  const wrap = document.getElementById('step-preview-wrap');
  if (!wrap) return;
  if (!state.stepDraftImage) {
    wrap.innerHTML = '';
    return;
  }
  wrap.innerHTML = `
    <div class="badge-row" style="margin-bottom:6px;">
      <span class="muted">Klicke ins Bild, um nummerierte Klick-Marker zu setzen (${state.stepDraftMarkers.length} gesetzt).</span>
      <button type="button" class="btn btn-secondary btn-sm" id="btn-undo-marker">Letzten Marker entfernen</button>
      <button type="button" class="btn btn-danger btn-sm" id="btn-clear-img">Bild entfernen</button>
    </div>
    <div class="screenshot-stage clickable" id="draft-stage">
      <img src="${esc(state.stepDraftImage)}" alt="Vorschau Screenshot" />
      ${state.stepDraftMarkers
        .map(
          (m, idx) =>
            `<span class="click-marker" style="left:${m.x}%; top:${m.y}%;">${idx + 1}</span>`
        )
        .join('')}
    </div>
  `;

  document.getElementById('draft-stage').addEventListener('click', (ev) => {
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = Math.round(((ev.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((ev.clientY - rect.top) / rect.height) * 1000) / 10;
    state.stepDraftMarkers.push({ x, y, label: `Klick ${state.stepDraftMarkers.length + 1}` });
    renderStepDraftPreview();
  });

  document.getElementById('btn-undo-marker').addEventListener('click', () => {
    state.stepDraftMarkers.pop();
    renderStepDraftPreview();
  });

  document.getElementById('btn-clear-img').addEventListener('click', () => {
    state.stepDraftImage = null;
    state.stepDraftMarkers = [];
    renderStepDraftPreview();
  });
}

function bindProcessDetailHandlers(proc) {
  document.getElementById('btn-confirm-review').addEventListener('click', async () => {
    try {
      const updated = await api(`/api/processes/${proc.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ actorRole: proc.owner_role })
      });
      showToast(`Review bestätigt! Nächster Prüftermin: ${String(updated.next_review_at).slice(0, 10)}`);
      await Promise.all([loadProcesses(), loadHealthAndOverview()]);
    } catch (err) {
      showToast(err.message);
    }
  });

  document.getElementById('btn-report-feedback').addEventListener('click', () => {
    document.getElementById('fb-process').value = String(proc.id);
    switchTab('requirements');
    document.getElementById('fb-text').focus();
    showToast(`Prozess «${proc.title}» im Feedback-Formular vorausgewählt.`);
  });

  document.getElementById('btn-print-proc').addEventListener('click', () => window.print());

  document.querySelectorAll('.js-del-step').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await api(`/api/processes/${btn.dataset.procId}/steps/${btn.dataset.stepId}`, { method: 'DELETE' });
        showToast('Schritt entfernt.');
        await Promise.all([loadProcesses(), loadHealthAndOverview()]);
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  const pasteZone = document.getElementById('paste-zone');
  pasteZone.addEventListener('paste', async (ev) => {
    const items = ev.clipboardData?.items || [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        ev.preventDefault();
        try {
          state.stepDraftImage = await compressImageToDataUrl(item.getAsFile());
          state.stepDraftMarkers = [];
          renderStepDraftPreview();
          showToast('Screenshot eingefügt — klicke ins Bild für Klick-Marker.');
        } catch (err) {
          showToast(err.message);
        }
        return;
      }
    }
  });

  document.getElementById('step-file').addEventListener('change', async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      state.stepDraftImage = await compressImageToDataUrl(file);
      state.stepDraftMarkers = [];
      renderStepDraftPreview();
    } catch (err) {
      showToast(err.message);
    }
  });

  document.getElementById('step-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try {
      await api(`/api/processes/${proc.id}/steps`, {
        method: 'POST',
        body: JSON.stringify({
          actionTitle: document.getElementById('step-title').value,
          uiTarget: document.getElementById('step-target').value,
          details: document.getElementById('step-details').value,
          hintType: document.getElementById('step-hint').value,
          screenshotData: state.stepDraftImage,
          markers: state.stepDraftMarkers
        })
      });
      showToast('Klick-Schritt gespeichert.');
      await Promise.all([loadProcesses(), loadHealthAndOverview()]);
    } catch (err) {
      showToast(err.message);
    }
  });
}

// --- Tab 3: Fristen & Entscheid-Log ---
async function loadDeadlinesAndDecisions() {
  const [deadlines, decisions] = await Promise.all([api('/api/deadlines'), api('/api/decisions')]);

  const dWrap = document.getElementById('deadlines-list');
  if (deadlines.length === 0) {
    dWrap.innerHTML = '<p class="muted">Aktuell keine offenen Fristen.</p>';
  } else {
    dWrap.innerHTML = `
      <table>
        <thead>
          <tr><th>Ampel</th><th>Typ</th><th>Thema</th><th>Verantwortlich</th><th>Fällig</th></tr>
        </thead>
        <tbody>
          ${deadlines
            .map(
              (d) => `
              <tr>
                <td>${badgeForTrafficLight(d.trafficLight)}</td>
                <td>${esc(d.kind)}</td>
                <td><strong>${esc(d.title)}</strong></td>
                <td>${esc(d.owner)}</td>
                <td>${esc(d.dueDate)}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  const logEl = document.getElementById('decisions-list');
  if (decisions.length === 0) {
    logEl.innerHTML = '<p class="muted">Noch keine Einträge im Entscheid-Log.</p>';
  } else {
    logEl.innerHTML = decisions
      .map(
        (entry) => `
        <div class="timeline-item">
          <div class="badge-row">
            <span class="badge badge-blue">${esc(entry.action)}</span>
            <span class="badge badge-neutral">${entry.entity_type === 'process' ? 'Prozess' : 'Anforderung'} #${entry.entity_id}</span>
            <span class="timeline-meta">${new Date(entry.created_at).toLocaleString('de-CH')} · ${esc(entry.actor_role)}</span>
          </div>
          <strong style="display:block; margin-top:4px;">${esc(entry.entity_title)}</strong>
          <p class="muted" style="margin-top:2px;">${esc(entry.reason)}</p>
        </div>
      `
      )
      .join('');
  }
}

// --- Globale Event-Listener ---
function initEvents() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const ex = EXAMPLES[chip.dataset.example];
      if (!ex) return;
      document.getElementById('fb-role').value = ex.role;
      document.getElementById('fb-type').value = ex.type;
      document.getElementById('fb-urgency').value = ex.urgency;
      document.getElementById('fb-text').value = ex.text;
      handlePreview();
    });
  });

  document.getElementById('btn-preview').addEventListener('click', handlePreview);
  document.getElementById('feedback-form').addEventListener('submit', handleFeedbackSubmit);

  document.getElementById('filter-status').addEventListener('change', loadStories);
  document.getElementById('filter-moscow').addEventListener('change', loadStories);
  document.getElementById('filter-q').addEventListener('input', () => {
    clearTimeout(initEvents._searchTimer);
    initEvents._searchTimer = setTimeout(loadStories, 220);
  });

  // Event-Delegation für dynamische Story-Buttons & Formulare
  document.getElementById('stories-list').addEventListener('click', async (ev) => {
    const voteBtn = ev.target.closest('.js-vote');
    if (voteBtn) {
      try {
        await api(`/api/stories/${voteBtn.dataset.id}/vote`, { method: 'POST' });
        showToast('Vote gezählt & Prioritäts-Score neu berechnet.');
        await Promise.all([loadStories(), loadHealthAndOverview()]);
      } catch (err) {
        showToast(err.message);
      }
    }
  });

  document.getElementById('stories-list').addEventListener('change', async (ev) => {
    const cb = ev.target.closest('.js-toggle-task');
    if (cb) {
      try {
        await api(`/api/stories/${cb.dataset.storyId}/tasks/${cb.dataset.taskId}`, { method: 'PATCH' });
        await loadStories();
      } catch (err) {
        showToast(err.message);
      }
    }
  });

  document.getElementById('stories-list').addEventListener('submit', async (ev) => {
    const form = ev.target.closest('.js-decision-form');
    if (!form) return;
    ev.preventDefault();
    try {
      const fd = new FormData(form);
      await api(`/api/stories/${form.dataset.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          status: fd.get('status'),
          reason: fd.get('reason'),
          dueDate: fd.get('dueDate') || null
        })
      });
      showToast('Entscheid im Entscheid-Log protokolliert.');
      await Promise.all([loadStories(), loadHealthAndOverview()]);
    } catch (err) {
      showToast(err.message);
    }
  });

  // Prozess-Auswahl & Neuer Prozess
  document.getElementById('processes-list').addEventListener('click', (ev) => {
    const btn = ev.target.closest('.process-card-btn');
    if (!btn) return;
    state.selectedProcessId = Number(btn.dataset.procId);
    loadProcesses();
  });

  document.getElementById('process-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try {
      const created = await api('/api/processes', {
        method: 'POST',
        body: JSON.stringify({
          title: document.getElementById('proc-title').value,
          category: document.getElementById('proc-category').value,
          ownerRole: document.getElementById('proc-owner').value,
          reviewIntervalDays: Number(document.getElementById('proc-interval').value),
          summary: document.getElementById('proc-summary').value
        })
      });
      state.selectedProcessId = created.id;
      document.getElementById('proc-title').value = '';
      document.getElementById('proc-summary').value = '';
      showToast(`Klick-Anleitung «${created.title}» angelegt.`);
      await Promise.all([loadProcesses(), loadHealthAndOverview()]);
    } catch (err) {
      showToast(err.message);
    }
  });
}

async function boot() {
  initEvents();
  await Promise.all([loadHealthAndOverview(), loadProcesses(), loadStories()]);
  setInterval(loadHealthAndOverview, 20000);
}

boot();
