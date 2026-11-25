import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { analyzeFeedback, scoreAndPrioritize } from './engine/requirementsEngine.js';
import {
  buildIcsCalendar,
  processToMarkdown,
  storiesToCsv,
  storyToMarkdown
} from './engine/exporters.js';

const ALLOWED_DECISION_STATUSES = new Set([
  'Eingang',
  'Geprüft',
  'Bereit',
  'Angenommen',
  'In Arbeit',
  'Zurückgestellt',
  'Abgelehnt',
  'Umgesetzt'
]);

function parsePositiveId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function createWriteRateLimiter({ windowMs = 60_000, maxRequests = 120 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }
    const key = req.ip || 'local';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > maxRequests) {
      return res.status(429).json({ error: 'Zu viele Anfragen. Bitte kurz warten.' });
    }
    return next();
  };
}

export function createApp({ store, buildInfo = {}, embedAllowedOrigins } = {}) {
  const app = express();
  const startedAt = Date.now();
  const versionInfo = {
    version: buildInfo.version || process.env.APP_VERSION || '1.0.0-dev',
    commit: buildInfo.commit || process.env.GIT_SHA || 'local',
    buildTime: buildInfo.buildTime || process.env.BUILD_TIME || new Date().toISOString()
  };

  // Confluence / Intranet Embed-Freigabe via Umgebungsvariable (Default: sicher nur 'self')
  const rawOrigins = embedAllowedOrigins ?? process.env.EMBED_ALLOWED_ORIGINS ?? '';
  const allowedFrames = rawOrigins
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const frameAncestors = allowedFrames.length > 0 ? ["'self'", ...allowedFrames] : ["'self'"];

  app.disable('x-powered-by');
  app.use(
    helmet({
      frameguard: allowedFrames.length > 0 ? false : { action: 'sameorigin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          frameAncestors
        }
      }
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use('/api', createWriteRateLimiter());

  // Ungültiges JSON sauber mit HTTP 400 abfangen (statt 500)
  app.use((err, _req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return res.status(400).json({ error: 'Ungültiges JSON-Format.' });
    }
    return next(err);
  });

  const publicDir = path.resolve(import.meta.dirname, 'public');
  app.use(express.static(publicDir));

  // Muss-Punkt 3: Aktiver Healthcheck mit echter PostgreSQL-Prüfung
  app.get('/health', async (_req, res) => {
    try {
      const health = await store.checkHealth();
      res.status(200).json({
        status: 'ok',
        app: 'Requirements Engine',
        db: health.dbConnected ? 'verbunden' : 'getrennt',
        dbLatencyMs: health.dbLatencyMs,
        counts: health.counts,
        version: versionInfo.version,
        commit: versionInfo.commit,
        buildTime: versionInfo.buildTime,
        uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      res.status(503).json({
        status: 'degraded',
        app: 'Requirements Engine',
        db: 'getrennt',
        error: err.message,
        version: versionInfo.version,
        commit: versionInfo.commit,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Überblick & Compliance-Score
  app.get('/api/overview', async (_req, res, next) => {
    try {
      const [processes, stories, health] = await Promise.all([
        store.listProcesses(),
        store.listStories(),
        store.checkHealth()
      ]);

      const greenProcesses = processes.filter((p) => p.trafficLight.status === 'green').length;
      const yellowProcesses = processes.filter((p) => p.trafficLight.status === 'yellow').length;
      const redProcesses = processes.filter((p) => p.trafficLight.status === 'red').length;
      const complianceScore =
        processes.length > 0
          ? Math.round(((greenProcesses + yellowProcesses * 0.5) / processes.length) * 100)
          : 100;

      res.json({
        version: versionInfo,
        db: { status: 'verbunden', latencyMs: health.dbLatencyMs },
        counts: health.counts,
        complianceScore,
        processHealth: { green: greenProcesses, yellow: yellowProcesses, red: redProcesses },
        mustStoriesOpen: stories.filter((s) => s.moscow === 'Must' && s.status !== 'Umgesetzt' && s.status !== 'Abgelehnt').length
      });
    } catch (err) {
      next(err);
    }
  });

  // Live-Vorschau: Feedback analysieren ohne zu speichern
  app.post('/api/stories/preview', async (req, res, next) => {
    try {
      const { rawFeedback, sourceRole, feedbackType, urgency } = req.body || {};
      const existing = await store.listStories();
      const result = analyzeFeedback({
        rawFeedback,
        sourceRole,
        feedbackType,
        urgency,
        existingStories: existing
      });
      res.json(result);
    } catch (err) {
      if (err.message.includes('mindestens 10 Zeichen')) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  });

  // Stories auflisten (Standard: nach Upvotes sortiert)
  app.get('/api/stories', async (req, res, next) => {
    try {
      const stories = await store.listStories({
        status: req.query.status,
        moscow: req.query.moscow,
        q: req.query.q,
        sort: req.query.sort
      });
      res.json(stories);
    } catch (err) {
      next(err);
    }
  });

  // CSV-Export für Excel
  app.get('/api/stories/export/csv', async (_req, res, next) => {
    try {
      const stories = await store.listStories();
      const csv = `\uFEFF${storiesToCsv(stories)}`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="requirements-engine-backlog.csv"');
      res.send(csv);
    } catch (err) {
      next(err);
    }
  });

  // Feedback einreichen -> automatisch übersetzen & speichern
  app.post('/api/stories', async (req, res, next) => {
    try {
      const { rawFeedback, sourceRole, origin, channel, feasibility, feedbackType, urgency, processId, dueDate } = req.body || {};
      if (typeof rawFeedback !== 'string' || rawFeedback.trim().length > 2000) {
        return res.status(400).json({ error: 'Feedback muss ein Text mit maximal 2000 Zeichen sein.' });
      }
      const allowedChannels = new Set(['E-Mail', 'Telefon', 'Ticket / Chat', 'Intern / Team']);
      const safeChannel = allowedChannels.has(channel) ? channel : 'E-Mail';
      const resolvedOrigin = origin || (safeChannel === 'Intern / Team' ? 'betrieb' : 'kunde');

      const existing = await store.listStories();
      const analyzed = analyzeFeedback({
        rawFeedback,
        sourceRole,
        origin: resolvedOrigin,
        feasibility,
        feedbackType,
        urgency,
        existingStories: existing
      });

      const created = await store.createStory({
        processId: processId ? parsePositiveId(processId) : null,
        channel: safeChannel,
        rawFeedback: rawFeedback.trim(),
        dueDate: dueDate || null,
        ...analyzed
      });

      res.status(201).json({ story: created, duplicates: analyzed.duplicates });
    } catch (err) {
      if (err.message.includes('mindestens 10 Zeichen')) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  });

  // Eintrag entfernen (für den Betrieb)
  app.delete('/api/stories/:id', async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Ungültige ID.' });
      const ok = await store.deleteStory(id);
      if (!ok) return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // Mengen-Zähler (+1 oder +10 bei Massenthemen) mit automatischer Impact-Neuberechnung
  app.post('/api/stories/:id/vote', async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Ungültige ID.' });
      const current = await store.getStoryById(id);
      if (!current) return res.status(404).json({ error: 'Anforderung nicht gefunden.' });

      const rawDelta = Number(req.body?.delta ?? 1);
      const delta = Number.isInteger(rawDelta) && rawDelta >= 1 && rawDelta <= 100 ? rawDelta : 1;

      const recalculated = scoreAndPrioritize({
        rawText: current.raw_feedback,
        urgency: current.urgency,
        feedbackType: current.feedback_type,
        feasibility: current.feasibility || 'mittel',
        votes: Number(current.votes) + delta,
        tasks: Array.isArray(current.tasks_json) ? current.tasks_json : []
      });

      const updated = await store.upvoteStory(id, recalculated, delta);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // Entwickler-Notiz (Systemlogik) & Kunden-Wording direkt aktualisieren
  app.patch('/api/stories/:id/notes', async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Ungültige ID.' });
      const { internalNote, publicResponse } = req.body || {};
      const updated = await store.updateStoryNotes(id, {
        internalNote: internalNote !== undefined ? String(internalNote).trim().slice(0, 1500) : undefined,
        publicResponse: publicResponse !== undefined ? String(publicResponse).trim().slice(0, 1500) : undefined
      });
      if (!updated) return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // Machbarkeit bewerten (einfach / mittel / aufwaendig -> Quick-Win-Score aktualisiert sich live!)
  app.patch('/api/stories/:id/feasibility', async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Ungültige ID.' });
      const { feasibility } = req.body || {};
      if (!['einfach', 'mittel', 'aufwaendig'].includes(feasibility)) {
        return res.status(400).json({ error: 'Machbarkeit muss einfach, mittel oder aufwaendig sein.' });
      }
      const current = await store.getStoryById(id);
      if (!current) return res.status(404).json({ error: 'Anforderung nicht gefunden.' });

      const recalculated = scoreAndPrioritize({
        rawText: current.raw_feedback,
        urgency: current.urgency,
        feedbackType: current.feedback_type,
        feasibility,
        votes: Number(current.votes),
        tasks: Array.isArray(current.tasks_json) ? current.tasks_json : []
      });

      const updated = await store.updateStoryFeasibility(id, feasibility, recalculated);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // Task abhaken / wieder öffnen
  app.patch('/api/stories/:id/tasks/:taskId', async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Ungültige ID.' });
      const updated = await store.toggleStoryTask(id, req.params.taskId);
      if (!updated) return res.status(404).json({ error: 'Story oder Task nicht gefunden.' });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // Entscheid fällen: getrenntes Kunden-Wording (öffentlich) & interne Begründung (vertraulich)
  app.post('/api/stories/:id/decision', async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Ungültige ID.' });
      const { status, reason, publicResponse, internalNote, dueDate, actorRole } = req.body || {};
      if (!ALLOWED_DECISION_STATUSES.has(status)) {
        return res.status(400).json({ error: 'Ungültiger Entscheid-Status.' });
      }
      const customerText = String(publicResponse || reason || '').trim();
      if (customerText.length < 5 || customerText.length > 1500) {
        return res.status(400).json({ error: 'Bitte ein Kunden-Wording zwischen 5 und 1500 Zeichen angeben.' });
      }
      const internalText = internalNote !== undefined ? String(internalNote).trim().slice(0, 1500) : undefined;
      const updated = await store.decideStory(id, {
        status,
        reason: customerText,
        publicResponse: customerText,
        internalNote: internalText,
        dueDate: dueDate || null,
        actorRole: actorRole ? String(actorRole).trim().slice(0, 80) : 'Betriebsverantwortung'
      });
      if (!updated) return res.status(404).json({ error: 'Anforderung nicht gefunden.' });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // Einzel-Story als Markdown exportieren
  app.get('/api/stories/:id/export/markdown', async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Ungültige ID.' });
      const story = await store.getStoryById(id);
      if (!story) return res.status(404).json({ error: 'Anforderung nicht gefunden.' });
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="REQ-${story.id}.md"`);
      res.send(storyToMarkdown(story));
    } catch (err) {
      next(err);
    }
  });

  // Prozesse / Klick-Anleitungen auflisten
  app.get('/api/processes', async (_req, res, next) => {
    try {
      const processes = await store.listProcesses();
      res.json(processes);
    } catch (err) {
      next(err);
    }
  });

  // Einzelner Prozess inkl. Klick-Schritten & verknüpften Stories
  app.get('/api/processes/:id', async (req, res, next) => {
    try {
      const proc = await store.getProcessWithSteps(Number(req.params.id));
      if (!proc) return res.status(404).json({ error: 'Prozess nicht gefunden.' });
      res.json(proc);
    } catch (err) {
      next(err);
    }
  });

  // Neuen Prozess anlegen
  app.post('/api/processes', async (req, res, next) => {
    try {
      const { title, category, ownerRole, summary, reviewIntervalDays } = req.body || {};
      if (!title || String(title).trim().length < 4) {
        return res.status(400).json({ error: 'Bitte einen aussagekräftigen Prozesstitel (mind. 4 Zeichen) angeben.' });
      }
      const created = await store.createProcess({
        title: String(title).trim(),
        category: category ? String(category).trim() : 'Allgemein',
        ownerRole: ownerRole ? String(ownerRole).trim() : 'Betrieb',
        summary: summary ? String(summary).trim() : '',
        reviewIntervalDays
      });
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  // Klick-Schritt (optional mit Screenshot & Markern) hinzufügen
  app.post('/api/processes/:id/steps', async (req, res, next) => {
    try {
      const { actionTitle, uiTarget, details, hintType, screenshotData, markers } = req.body || {};
      if (!actionTitle || String(actionTitle).trim().length < 3) {
        return res.status(400).json({ error: 'Bitte einen Schritt-Titel (mind. 3 Zeichen) angeben.' });
      }
      if (screenshotData && !String(screenshotData).startsWith('data:image/')) {
        return res.status(400).json({ error: 'Ungültiges Bildformat für Screenshot.' });
      }
      const step = await store.addProcessStep(Number(req.params.id), {
        actionTitle: String(actionTitle).trim(),
        uiTarget: uiTarget ? String(uiTarget).trim() : '',
        details: details ? String(details).trim() : '',
        hintType,
        screenshotData: screenshotData || null,
        markers
      });
      if (!step) return res.status(404).json({ error: 'Prozess nicht gefunden.' });
      res.status(201).json(step);
    } catch (err) {
      next(err);
    }
  });

  // Schritt löschen
  app.delete('/api/processes/:id/steps/:stepId', async (req, res, next) => {
    try {
      const ok = await store.deleteProcessStep(Number(req.params.id), Number(req.params.stepId));
      if (!ok) return res.status(404).json({ error: 'Schritt nicht gefunden.' });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // Prozess-Review bestätigen (berechnet nächstes Review-Datum automatisch neu!)
  app.post('/api/processes/:id/review', async (req, res, next) => {
    try {
      const { note, actorRole } = req.body || {};
      const updated = await store.markProcessReviewed(Number(req.params.id), { note, actorRole });
      if (!updated) return res.status(404).json({ error: 'Prozess nicht gefunden.' });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // Prozess als Markdown-Handbuch exportieren
  app.get('/api/processes/:id/export/markdown', async (req, res, next) => {
    try {
      const proc = await store.getProcessWithSteps(Number(req.params.id));
      if (!proc) return res.status(404).json({ error: 'Prozess nicht gefunden.' });
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="PROZESS-${proc.id}.md"`);
      res.send(processToMarkdown(proc, proc.steps));
    } catch (err) {
      next(err);
    }
  });

  // Entscheid-Log abrufen
  app.get('/api/decisions', async (_req, res, next) => {
    try {
      const entries = await store.listDecisionLog(80);
      res.json(entries);
    } catch (err) {
      next(err);
    }
  });

  // Fristen-Radar (Prozesse + Stories mit Fristen)
  app.get('/api/deadlines', async (_req, res, next) => {
    try {
      const [processes, stories] = await Promise.all([store.listProcesses(), store.listStories()]);
      const items = [
        ...processes.map((p) => ({
          uid: `process-${p.id}`,
          kind: 'Prozess-Review',
          entityId: p.id,
          title: p.title,
          owner: p.owner_role,
          dueDate: String(p.next_review_at).slice(0, 10),
          trafficLight: p.trafficLight
        })),
        ...stories
          .filter((s) => s.due_date && s.status !== 'Abgelehnt' && s.status !== 'Umgesetzt')
          .map((s) => ({
            uid: `story-${s.id}`,
            kind: `Story (${s.moscow})`,
            entityId: s.id,
            title: s.title,
            owner: s.source_role,
            dueDate: String(s.due_date).slice(0, 10),
            trafficLight: s.trafficLight
          }))
      ].sort((a, b) => (a.trafficLight.daysRemaining ?? 9999) - (b.trafficLight.daysRemaining ?? 9999));

      res.json(items);
    } catch (err) {
      next(err);
    }
  });

  // 1-Klick iCal (.ics) Export aller Fristen
  app.get('/api/deadlines/export.ics', async (_req, res, next) => {
    try {
      const [processes, stories] = await Promise.all([store.listProcesses(), store.listStories()]);
      const events = [
        ...processes.map((p) => ({
          uid: `process-${p.id}`,
          dueDate: p.next_review_at,
          summary: `[Review] ${p.title}`,
          description: `Verantwortlich: ${p.owner_role} | Intervall: ${p.review_interval_days} Tage`
        })),
        ...stories
          .filter((s) => s.due_date && s.status !== 'Abgelehnt' && s.status !== 'Umgesetzt')
          .map((s) => ({
            uid: `story-${s.id}`,
            dueDate: s.due_date,
            summary: `[${s.moscow}] ${s.title}`,
            description: `${s.user_story} (Status: ${s.status})`
          }))
      ];
      const ics = buildIcsCalendar(events);
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="requirements-engine-fristen.ics"');
      res.send(ics);
    } catch (err) {
      next(err);
    }
  });

  // Fehlerbehandlung
  app.use((err, _req, res, _next) => {
    console.error('[API-Fehler]', err);
    res.status(500).json({ error: 'Interner Serverfehler. Bitte Logs prüfen.' });
  });

  return app;
}
