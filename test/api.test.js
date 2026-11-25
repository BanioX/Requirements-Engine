import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

function createMockStore({ dbHealthy = true } = {}) {
  const stories = [];
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
      const s = {
        id: stories.length + 1,
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
        tasks_json: payload.tasks,
        acceptance_criteria_json: payload.acceptanceCriteria,
        status: 'Eingang',
        decision_reason: '',
        due_date: payload.dueDate,
        trafficLight: { status: 'none', label: 'Kein Termin', daysRemaining: null }
      };
      stories.push(s);
      return s;
    },
    async decideStory(id, { status, reason }) {
      const s = stories.find((x) => x.id === id);
      if (!s) return null;
      s.status = status;
      s.decision_reason = reason;
      decisions.push({ id: decisions.length + 1, entity_type: 'story', entity_id: id, action: status, reason });
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

    // Gültiger Entscheid
    const okDec = await fetch(`${baseUrl}/api/stories/${created.story.id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Angenommen', reason: 'Reduziert Support-Anfragen deutlich.' })
    });
    assert.equal(okDec.status, 200);
    const decided = await okDec.json();
    assert.equal(decided.status, 'Angenommen');
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
