import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

function createMockStore({ dbHealthy = true } = {}) {
  const stories = [];
  const mentions = [];
  const settings = new Map();
  const processes = [
    {
      id: 1,
      title: 'Demo-Prozess',
      category: 'eBanking-Support',
      owner_role: 'eBanking-Support',
      summary: 'Kurztest',
      review_interval_days: 90,
      next_review_at: '2027-02-01',
      version_nr: 1,
      step_count: 0,
      linked_story_count: 0,
      trafficLight: { status: 'green', label: 'Aktuell', daysRemaining: 40 },
      steps: [],
      linkedStories: []
    }
  ];
  const decisions = [];

  return {
    async getSetting(key, fallback = '') {
      return settings.has(key) ? settings.get(key) : fallback;
    },
    async setSetting(key, value) {
      settings.set(key, String(value));
      return String(value);
    },
    async checkHealth() {
      if (!dbHealthy) throw new Error('DB connection refused');
      return {
        dbConnected: true,
        dbLatencyMs: 2,
        counts: { processes: processes.length, steps: 0, stories: stories.length, decisions: decisions.length }
      };
    },
    async listProcesses() {
      return processes;
    },
    async getProcessWithSteps(id) {
      return processes.find((p) => p.id === id) || null;
    },
    async createProcess(data) {
      const p = {
        id: processes.length + 1,
        title: data.title,
        category: data.category,
        owner_role: data.ownerRole,
        summary: data.summary,
        review_interval_days: Number(data.reviewIntervalDays) || 90,
        next_review_at: '2027-03-01',
        version_nr: 1,
        step_count: 0,
        linked_story_count: 0,
        trafficLight: { status: 'green', label: 'Aktuell', daysRemaining: 90 },
        steps: []
      };
      processes.push(p);
      return p;
    },
    async markProcessReviewed(id) {
      const p = processes.find((x) => x.id === id);
      if (!p) return null;
      p.version_nr += 1;
      return p;
    },
    async listStories() {
      return stories;
    },
    async getStoryById(id) {
      return stories.find((s) => s.id === id) || null;
    },
    async createStory(payload) {
      const dur = Number(payload.durationSeconds) || 0;
      const s = {
        id: stories.length + 1,
        origin: payload.origin || 'kunde',
        channel: payload.channel ?? '',
        submitted_by: payload.submittedBy || '',
        feasibility: payload.feasibility || 'unbewertet',
        source_role: payload.sourceRole,
        feedback_type: payload.feedbackType,
        urgency: payload.urgency,
        raw_feedback: payload.rawFeedback,
        title: payload.title,
        user_story: payload.userStory,
        req_type: payload.reqType,
        moscow: payload.moscow,
        size_estimate: payload.sizeEstimate,
        priority_score: payload.priorityScore,
        votes: 1,
        total_duration_seconds: dur,
        timed_mentions: dur > 0 ? 1 : 0,
        interaction_refs_json: payload.interactionRef ? [{ ref: payload.interactionRef, createdAt: new Date().toISOString() }] : [],
        tasks_json: payload.tasks,
        acceptance_criteria_json: payload.acceptanceCriteria,
        status: 'Eingang',
        decision_reason: '',
        public_response: '',
        internal_note: '',
        created_at: new Date().toISOString(),
        due_date: payload.dueDate,
        trafficLight: { status: 'none', label: 'Kein Termin', daysRemaining: null }
      };
      stories.push(s);
      mentions.push({
        id: mentions.length + 1,
        story_id: s.id,
        delta: 1,
        recorded_by: s.submitted_by,
        duration_seconds: dur,
        interaction_ref: payload.interactionRef || '',
        feedback_note: s.raw_feedback,
        customer_ref: payload.customerRef || '',
        channel: s.channel,
        client_token: payload.clientToken || '',
        created_at: s.created_at
      });
      return s;
    },
    async listStoryMentions(storyId) {
      return mentions.filter((m) => m.story_id === storyId).reverse();
    },
    async upvoteStory(
      id,
      recalculated,
      {
        recordedBy = '',
        durationSeconds = 60,
        interactionRef = '',
        feedbackNote = '',
        customerRef = '',
        channel = '',
        clientToken = ''
      } = {}
    ) {
      const s = stories.find((x) => x.id === id);
      if (!s) return null;
      s.votes += 1;
      s.total_duration_seconds += durationSeconds;
      s.timed_mentions += 1;
      s.priority_score = recalculated.score;
      mentions.push({
        id: mentions.length + 1,
        story_id: id,
        delta: 1,
        recorded_by: recordedBy,
        duration_seconds: durationSeconds,
        interaction_ref: interactionRef,
        feedback_note: feedbackNote,
        customer_ref: customerRef,
        channel,
        client_token: clientToken,
        created_at: new Date().toISOString()
      });
      return s;
    },
    async getReportData({ granularity = 'month' } = {}) {
      const bucket = granularity === 'day' ? '2026-11-25' : granularity === 'week' ? '2026-KW48' : granularity === 'year' ? '2026' : '2026-11';
      return {
        stories,
        mentionsTimeline: [
          {
            bucket,
            total: stories.reduce((a, b) => a + b.votes, 0),
            duration_seconds: stories.reduce((a, b) => a + (b.total_duration_seconds || 0), 0)
          }
        ]
      };
    },
    async deleteStory(id) {
      const idx = stories.findIndex((x) => x.id === id);
      if (idx === -1) return false;
      stories.splice(idx, 1);
      return true;
    },
    async decideStory(id, { status, reason, publicResponse, internalNote }) {
      const s = stories.find((x) => x.id === id);
      if (!s) return null;
      s.status = status;
      s.decision_reason = publicResponse || reason;
      s.public_response = publicResponse || reason;
      s.internal_note = internalNote || '';
      decisions.push({ id: decisions.length + 1, entity_type: 'story', entity_id: id, action: status, reason: s.public_response });
      return s;
    },
    async recordDecisionFeedback(id, { sentiment, comment, author }) {
      const s = stories.find((x) => x.id === id);
      if (!s) return null;
      if (sentiment === 'up') s.decision_up = (s.decision_up || 0) + 1;
      if (sentiment === 'down') s.decision_down = (s.decision_down || 0) + 1;
      s.decision_feedback_json = s.decision_feedback_json || [];
      if (comment) s.decision_feedback_json.push({ sentiment, comment, author });
      return s;
    },
    async listDecisionLog() {
      return decisions;
    }
  };
}

async function withServer(app, fn) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('GET /health liefert HTTP 200 mit DB-Status und Version bei gesunder DB', async () => {
  const app = createApp({
    store: createMockStore({ dbHealthy: true }),
    buildInfo: { version: 'v1.0.0-test', commit: 'abc1234' }
  });

  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.db, 'verbunden');
    assert.equal(body.version, 'v1.0.0-test');
    assert.equal(body.commit, 'abc1234');
  });
});

test('GET /health liefert HTTP 503 bei DB-Ausfall (Negativtest)', async () => {
  const app = createApp({ store: createMockStore({ dbHealthy: false }) });

  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.status, 'degraded');
    assert.equal(body.db, 'getrennt');
  });
});

test('POST /api/stories erzeugt User Story und verlangt bei Entscheid eine Begründung', async () => {
  const app = createApp({ store: createMockStore({ dbHealthy: true }) });

  await withServer(app, async (baseUrl) => {
    const createRes = await fetch(`${baseUrl}/api/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceRole: 'eBanking-Support',
        feedbackType: 'kunden_aerger',
        urgency: 'hoch',
        rawFeedback: 'Kunden finden den PDF-Export im eBanking nicht, weil der Button versteckt ist.'
      })
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.match(created.story.user_story, /^Als eBanking-Support möchte ich/);

    // Fehlende Begründung muss mit HTTP 400 abgelehnt werden
    const badDec = await fetch(`${baseUrl}/api/stories/${created.story.id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Angenommen', reason: '' })
    });
    assert.equal(badDec.status, 400);

    // Gültiger Entscheid mit getrenntem Kunden-Wording und interner Notiz
    const okDec = await fetch(`${baseUrl}/api/stories/${created.story.id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'In Arbeit',
        publicResponse: 'Danke! Wir setzen das im nächsten Release um.',
        internalNote: 'INTERN: Entlastet Support um 20 Tickets/Woche.'
      })
    });
    assert.equal(okDec.status, 200);
    const decided = await okDec.json();
    assert.equal(decided.status, 'In Arbeit');
    assert.match(decided.public_response, /nächsten Release/);
    assert.match(decided.internal_note, /INTERN:/);

    // Löschen eines Eintrags
    const delRes = await fetch(`${baseUrl}/api/stories/${created.story.id}`, { method: 'DELETE' });
    assert.equal(delRes.status, 204);
  });
});

test('GET /api/deadlines/export.ics liefert gültigen Kalender-Download', async () => {
  const app = createApp({ store: createMockStore({ dbHealthy: true }) });

  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/deadlines/export.ics`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/calendar/);
    const text = await res.text();
    assert.match(text, /BEGIN:VCALENDAR/);
  });
});

test('Fireproof: Ungültige IDs, defektes JSON und Überlänge liefern sauber HTTP 400 statt 500', async () => {
  const app = createApp({ store: createMockStore({ dbHealthy: true }) });

  await withServer(app, async (baseUrl) => {
    const badId = await fetch(`${baseUrl}/api/stories/abc/vote`, { method: 'POST' });
    assert.equal(badId.status, 400);

    const badJson = await fetch(`${baseUrl}/api/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"rawFeedback": kaputt'
    });
    assert.equal(badJson.status, 400);

    const tooLong = await fetch(`${baseUrl}/api/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawFeedback: 'x'.repeat(2100) })
    });
    assert.equal(tooLong.status, 400);
  });
});

test('Confluence-Erweiterbarkeit: EMBED_ALLOWED_ORIGINS setzt frame-ancestors gezielt im CSP-Header', async () => {
  const app = createApp({
    store: createMockStore({ dbHealthy: true }),
    embedAllowedOrigins: 'https://*.atlassian.net'
  });

  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/health`);
    const csp = res.headers.get('content-security-policy') || '';
    assert.match(csp, /frame-ancestors 'self' https:\/\/\*\.atlassian\.net/);
  });
});

test('Manager-Schutz: Wenn MANAGER_PIN gesetzt ist, sind Report & CSV für normale User gesperrt (HTTP 403)', async () => {
  const app = createApp({
    store: createMockStore({ dbHealthy: true }),
    managerPin: 'test-pin-99'
  });

  await withServer(app, async (baseUrl) => {
    const deniedRep = await fetch(`${baseUrl}/api/report`);
    assert.equal(deniedRep.status, 403);
    const deniedCsv = await fetch(`${baseUrl}/api/stories/export/csv`);
    assert.equal(deniedCsv.status, 403);

    const okRep = await fetch(`${baseUrl}/api/report`, { headers: { 'x-manager-pin': 'test-pin-99' } });
    assert.equal(okRep.status, 200);
    const okCsv = await fetch(`${baseUrl}/api/stories/export/csv?pin=test-pin-99`);
    assert.equal(okCsv.status, 200);
  });
});

test('Chef-Schalter: Kommentar-Sichtbarkeit umschaltbar zwischen all und own_only', async () => {
  const app = createApp({ store: createMockStore({ dbHealthy: true }) });

  await withServer(app, async (baseUrl) => {
    await fetch(`${baseUrl}/api/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-client-token': 'user-a' },
      body: JSON.stringify({ rawFeedback: 'User A meldet ein wiederkehrendes Problem beim Login.' })
    });
    await fetch(`${baseUrl}/api/stories/1/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-client-token': 'user-b' },
      body: JSON.stringify({ durationText: '02:00', feedbackNote: 'Kommentar von User B' })
    });

    // Standard: Alle sehen alle (2 Einträge)
    const allForA = await (await fetch(`${baseUrl}/api/stories/1/mentions`, { headers: { 'x-client-token': 'user-a' } })).json();
    assert.equal(allForA.length, 2);

    // Chef aktiviert 'own_only'
    const patchRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentsVisibility: 'own_only' })
    });
    assert.equal(patchRes.status, 200);

    // User A sieht nur seinen eigenen Kommentar, User B nur seinen, Chef sieht alle 2
    const onlyA = await (await fetch(`${baseUrl}/api/stories/1/mentions`, { headers: { 'x-client-token': 'user-a' } })).json();
    const onlyB = await (await fetch(`${baseUrl}/api/stories/1/mentions`, { headers: { 'x-client-token': 'user-b' } })).json();
    const chefAll = await (
      await fetch(`${baseUrl}/api/stories/1/mentions`, { headers: { 'x-client-token': 'chef', 'x-manager-mode': '1' } })
    ).json();

    assert.equal(onlyA.length, 1);
    assert.equal(onlyB.length, 1);
    assert.equal(onlyB[0].feedback_note, 'Kommentar von User B');
    assert.equal(chefAll.length, 2);
  });
});

test('GET /api/report nutzt echte M:S-Zeiten statt Pauschalen und quantifizierbare Buchungen', async () => {
  const app = createApp({ store: createMockStore({ dbHealthy: true }) });

  await withServer(app, async (baseUrl) => {
    const createRes = await fetch(`${baseUrl}/api/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawFeedback: 'Sprache im Portal springt nach jeder Sitzung wieder auf Englisch zurück.',
        channel: 'Persönlich',
        submittedBy: 'Anna Beispiel',
        interactionRef: 'CRM-4821',
        durationText: '04:30'
      })
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.equal(created.story.total_duration_seconds, 270);
    assert.equal(created.story.channel, 'Persönlich');
    assert.equal(created.story.interaction_refs_json[0].ref, 'CRM-4821');

    // Upvote ohne Zeit (< 1 Minute) muss sauber mit HTTP 400 abgelehnt werden
    const badVote = await fetch(`${baseUrl}/api/stories/1/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: 1, durationText: '00:45' })
    });
    assert.equal(badVote.status, 400);

    // Mehr als +1 Upvote pro Fall muss ebenfalls mit HTTP 400 abgelehnt werden
    const badMulti = await fetch(`${baseUrl}/api/stories/1/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: 5, durationText: '03:00' })
    });
    assert.equal(badMulti.status, 400);

    // Echter +1 Fall mit individuellem Kundenfeedback, Kunde, Zeit & Ref-ID (03:00 -> gesamt 450 s aus 2 Fällen)
    const voteRes = await fetch(`${baseUrl}/api/stories/1/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        durationText: '3:00',
        feedbackNote: 'Kunde musste Sprache erneut umstellen.',
        customerRef: 'Muster AG',
        recordedBy: 'Max Beispiel',
        interactionRef: 'CRM-9002',
        channel: 'Telefon'
      })
    });
    assert.equal(voteRes.status, 200);
    const voted = await voteRes.json();
    assert.equal(voted.votes, 2);
    assert.equal(voted.total_duration_seconds, 450);

    // Einzelfall-Kacheln abrufen
    const mentionsRes = await fetch(`${baseUrl}/api/stories/1/mentions`);
    assert.equal(mentionsRes.status, 200);
    const mentionsList = await mentionsRes.json();
    assert.equal(mentionsList.length, 2);
    assert.equal(mentionsList[0].customer_ref, 'Muster AG');
    assert.equal(mentionsList[0].duration_seconds, 180);

    const res = await fetch(`${baseUrl}/api/report?from=2026-01-01&to=2026-12-31&granularity=day&timeMode=measured&hourlyRate=120`);
    assert.equal(res.status, 200);
    const rep = await res.json();
    assert.equal(rep.summary.totalStories, 1);
    assert.equal(rep.summary.totalMentions, 2);
    assert.equal(rep.summary.measuredSeconds, 450);
    assert.equal(rep.savings.implementedCount, 0);
    assert.equal(rep.savings.hourlyRate, 120);
    assert.equal(rep.summary.hasEstimated, false);
    assert.equal(rep.filters.granularity, 'day');
    assert.equal(rep.mentionsTimeline[0].bucket, '2026-11-25');
    assert.equal(rep.credits[0].name, 'Anna Beispiel');

    const fbRes = await fetch(`${baseUrl}/api/stories/1/decision-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentiment: 'down', comment: 'Kommt jede Woche wieder rein!', author: 'Anna Beispiel' })
    });
    assert.equal(fbRes.status, 200);
    const updated = await fbRes.json();
    assert.equal(updated.decision_down, 1);
    assert.equal(updated.decision_feedback_json.length, 1);

    const jiraRes = await fetch(`${baseUrl}/api/stories/1/jira`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueType: 'Feature' })
    });
    assert.equal(jiraRes.status, 200);
    const jiraBody = await jiraRes.json();
    assert.equal(jiraBody.mode, 'clipboard');
    assert.match(jiraBody.markup, /h2\. Feature:/);
  });
});
