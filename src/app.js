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
  'Bereit',
  'Angenommen',
  'Zurückgestellt',
  'Abgelehnt',
  'Umgesetzt'
]);

export function createApp({ store, buildInfo = {} }) {
  const app = express();
  const startedAt = Date.now();
  const versionInfo = {
    version: buildInfo.version || process.env.APP_VERSION || '1.0.0-dev',
    commit: buildInfo.commit || process.env.GIT_SHA || 'local',
    buildTime: buildInfo.buildTime || process.env.BUILD_TIME || new Date().toISOString()
  };

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"]
        }
      }
    })
  );

  app.use(express.json({ limit: '6mb' }));

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

  // Stories auflisten
  app.get('/api/stories', async (req, res, next) => {
    try {
      const stories = await store.listStories({
        status: req.query.status,
        moscow: req.query.moscow,
        q: req.query.q
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
      const { rawFeedback, sourceRole, feedbackType, urgency, processId, dueDate } = req.body || {};
      const existing = await store.listStories();
      const analyzed = analyzeFeedback({
        rawFeedback,
        sourceRole,
        feedbackType,
        urgency,
        existingStories: existing
      });

      const created = await store.createStory({
        processId: processId ? Number(processId) : null,
        sourceRole: (sourceRole || 'Fachbereich').trim(),
        feedbackType: feedbackType || 'idee',
        urgency: urgency || 'normal',
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

  // Upvote (+1) mit automatischer Score-Neuberechnung
  app.post('/api/stories/:id/vote', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const current = await store.getStoryById(id);
      if (!current) return res.status(404).json({ error: 'Anforderung nicht gefunden.' });

      const recalculated = scoreAndPrioritize({
        rawText: current.raw_feedback,
        urgency: current.urgency,
        feedbackType: current.feedback_type,
        votes: Number(current.votes) + 1,
        tasks: Array.isArray(current.tasks_json) ? current.tasks_json : []
      });

      const updated = await store.upvoteStory(id, recalculated);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // Task abhaken / wieder öffnen
  app.patch('/api/stories/:id/tasks/:taskId', async (req, res, next) => {
    try {
      const updated = await store.toggleStoryTask(Number(req.params.id), req.params.taskId);
      if (!updated) return res.status(404).json({ error: 'Story oder Task nicht gefunden.' });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // Entscheid fällen (mit verpflichtender Begründung -> Entscheid-Log)
  app.post('/api/stories/:id/decision', async (req, res, next) => {
    try {
      const { status, reason, dueDate, actorRole } = req.body || {};
      if (!ALLOWED_DECISION_STATUSES.has(status)) {
        return res.status(400).json({ error: 'Ungültiger Entscheid-Status.' });
      }
      if (!reason || String(reason).trim().length < 5) {
        return res.status(400).json({ error: 'Bitte eine kurze Begründung (mind. 5 Zeichen) angeben.' });
      }
      const updated = await store.decideStory(Number(req.params.id), {
        status,
        reason: String(reason).trim(),
        dueDate: dueDate || null,
        actorRole: actorRole ? String(actorRole).trim() : 'Betriebsverantwortung'
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
      const story = await store.getStoryById(Number(req.params.id));
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
