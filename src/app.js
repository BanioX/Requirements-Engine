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
import { pushStoryToJira, storiesToJiraCsv } from './engine/jiraBridge.js';
import {
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  SESSION_COOKIE,
  VALID_ROLES,
  buildClearSessionCookie,
  buildSessionCookie,
  createSessionSecret,
  hasPermission,
  hashPassword,
  normalizeRole,
  parseCookies,
  signSessionToken,
  verifyPassword,
  verifySessionToken
} from './auth.js';

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

function parseDurationSeconds(rawSeconds, rawText) {
  if (rawSeconds !== undefined && rawSeconds !== null && rawSeconds !== '') {
    const n = Number(rawSeconds);
    if (Number.isFinite(n) && n >= 0) {
      return Math.min(28800, Math.round(n));
    }
  }
  if (typeof rawText === 'string' && rawText.trim()) {
    const cleaned = rawText.trim();
    const parts = cleaned.split(':');
    if (parts.length === 2) {
      const m = Number(parts[0]);
      const s = Number(parts[1]);
      if (Number.isFinite(m) && Number.isFinite(s) && m >= 0 && s >= 0) {
        return Math.min(28800, Math.round(m * 60 + s));
      }
    } else if (/^\d+$/.test(cleaned)) {
      return Math.min(28800, Number(cleaned) * 60);
    }
  }
  return 0;
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

export function createApp({ store, buildInfo = {}, embedAllowedOrigins, managerPin, sessionSecret } = {}) {
  const app = express();
  const startedAt = Date.now();
  const configuredManagerPin = String(managerPin ?? process.env.MANAGER_PIN ?? '').trim();
  const signingSecret = createSessionSecret(sessionSecret ?? process.env.SESSION_SECRET);

  function getSessionUser(req) {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[SESSION_COOKIE];
    return verifySessionToken(token, signingSecret);
  }

  function getClientToken(req) {
    const user = getSessionUser(req);
    if (user) return `u:${user.id}`;
    return String(req.headers['x-client-token'] || '')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 64);
  }

  async function canSeeAllComments(req) {
    const user = getSessionUser(req);
    if (user && hasPermission(user.role, 'seeAllComments')) return true;
    if (configuredManagerPin) {
      const provided = String(req.headers['x-manager-pin'] || req.query.pin || '').trim();
      if (provided === configuredManagerPin) return true;
    }
    const adminCount = store.countAdmins ? await store.countAdmins() : 0;
    if (adminCount === 0 && !configuredManagerPin) {
      return String(req.headers['x-manager-mode'] || req.query.manager || '') === '1';
    }
    return false;
  }

  async function requireReportAccess(req, res, next) {
    try {
      const user = getSessionUser(req);
      if (user && hasPermission(user.role, 'viewReports')) return next();
      if (configuredManagerPin) {
        const provided = String(req.headers['x-manager-pin'] || req.query.pin || '').trim();
        if (provided === configuredManagerPin) return next();
      }
      const adminCount = store.countAdmins ? await store.countAdmins() : 0;
      if (adminCount === 0 && !configuredManagerPin) return next();
      return res.status(403).json({ error: 'Report & Excel-Export sind nur für Manager und Admins freigegeben.' });
    } catch (err) {
      return next(err);
    }
  }

  async function requireAdminAccess(req, res, next) {
    try {
      const user = getSessionUser(req);
      if (user && hasPermission(user.role, 'manageUsers')) return next();
      if (configuredManagerPin) {
        const provided = String(req.headers['x-manager-pin'] || req.query.pin || '').trim();
        if (provided === configuredManagerPin) return next();
      }
      const adminCount = store.countAdmins ? await store.countAdmins() : 0;
      if (adminCount === 0 && !configuredManagerPin) return next();
      return res.status(403).json({ error: 'Diese Einstellung ist nur für Admins freigegeben.' });
    } catch (err) {
      return next(err);
    }
  }

  async function requireDecideAccess(req, res, next) {
    try {
      const user = getSessionUser(req);
      if (user && hasPermission(user.role, 'decideStories')) return next();
      if (configuredManagerPin) {
        const provided = String(req.headers['x-manager-pin'] || req.query.pin || '').trim();
        if (provided === configuredManagerPin) return next();
      }
      const adminCount = store.countAdmins ? await store.countAdmins() : 0;
      if (adminCount === 0 && !configuredManagerPin) return next();
      return res.status(403).json({ error: 'Diese Aktion ist nur für Supervisor, Manager oder Admin freigegeben.' });
    } catch (err) {
      return next(err);
    }
  }

  async function getCommentsVisibility() {
    if (!store.getSetting) return 'all';
    const val = await store.getSetting('comments_visibility', 'all');
    return val === 'own_only' ? 'own_only' : 'all';
  }
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

  // Authentifizierung & Rechtematrix (Nutzer, Supervisor, Manager, Admin)
  app.get('/api/auth/me', async (req, res, next) => {
    try {
      const user = getSessionUser(req);
      const adminCount = store.countAdmins ? await store.countAdmins() : 0;
      res.json({
        user,
        permissions: user ? ROLE_PERMISSIONS[normalizeRole(user.role)] : null,
        roles: VALID_ROLES.map((r) => ({ id: r, label: ROLE_LABELS[r], permissions: ROLE_PERMISSIONS[r] })),
        hasAdmin: adminCount > 0,
        managerPinRequired: Boolean(configuredManagerPin)
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/register', async (req, res, next) => {
    try {
      if (!store.findUserByUsername || !store.createUser) {
        return res.status(501).json({ error: 'Benutzerverwaltung nicht verfügbar.' });
      }
      const username = String(req.body?.username || '').trim().toLowerCase();
      const displayName = String(req.body?.displayName || '').trim().slice(0, 80);
      const password = String(req.body?.password || '');

      if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
        return res.status(400).json({ error: 'Benutzername: 3–32 Zeichen (Buchstaben, Zahlen, . _ -).' });
      }
      if (password.length < 6 || password.length > 128) {
        return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein.' });
      }

      const existing = await store.findUserByUsername(username);
      if (existing) {
        return res.status(409).json({ error: 'Dieser Benutzername ist bereits vergeben.' });
      }

      // Erster Account im System wird automatisch Admin, alle weiteren starten als Nutzer (oder frei durch Admin)
      const adminCount = store.countAdmins ? await store.countAdmins() : 0;
      const currentUser = getSessionUser(req);
      const requestedRole = normalizeRole(req.body?.role);
      const role = adminCount === 0 ? 'admin' : currentUser && hasPermission(currentUser.role, 'manageUsers') ? requestedRole : 'user';

      const created = await store.createUser({
        username,
        displayName: displayName || username,
        role,
        passwordHash: hashPassword(password)
      });

      const sessionUser = {
        id: created.id,
        username: created.username,
        displayName: created.display_name,
        role: created.role
      };
      const token = signSessionToken(sessionUser, signingSecret);
      const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
      res.setHeader('Set-Cookie', buildSessionCookie(token, { secure: isHttps }));
      res.status(201).json({ user: sessionUser, hasAdmin: true });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      if (!store.findUserByUsername) {
        return res.status(501).json({ error: 'Benutzerverwaltung nicht verfügbar.' });
      }
      const username = String(req.body?.username || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      if (!username || !password) {
        return res.status(400).json({ error: 'Benutzername und Passwort eingeben.' });
      }
      const user = await store.findUserByUsername(username);
      if (!user || !verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ error: 'Benutzername oder Passwort ungültig.' });
      }
      const sessionUser = {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: normalizeRole(user.role)
      };
      const token = signSessionToken(sessionUser, signingSecret);
      const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
      res.setHeader('Set-Cookie', buildSessionCookie(token, { secure: isHttps }));
      res.json({ user: sessionUser });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.setHeader('Set-Cookie', buildClearSessionCookie());
    res.json({ ok: true });
  });

  // Benutzer- & Rechteverwaltung (nur Admin)
  app.get('/api/users', requireAdminAccess, async (_req, res, next) => {
    try {
      const users = store.listUsers ? await store.listUsers() : [];
      res.json({
        users,
        roles: VALID_ROLES.map((r) => ({ id: r, label: ROLE_LABELS[r], permissions: ROLE_PERMISSIONS[r] }))
      });
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/users/:id/role', requireAdminAccess, async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Ungültige Benutzer-ID.' });
      const nextRole = req.body?.role;
      if (!VALID_ROLES.includes(nextRole)) {
        return res.status(400).json({ error: 'Ungültige Rolle (user, supervisor, manager, admin).' });
      }
      if (!store.listUsers || !store.updateUserRole) {
        return res.status(501).json({ error: 'Benutzerverwaltung nicht verfügbar.' });
      }
      const allUsers = await store.listUsers();
      const target = allUsers.find((u) => u.id === id);
      if (!target) return res.status(404).json({ error: 'Benutzer nicht gefunden.' });

      if (target.role === 'admin' && nextRole !== 'admin') {
        const remainingAdmins = allUsers.filter((u) => u.role === 'admin' && u.id !== id).length;
        if (remainingAdmins === 0) {
          return res.status(400).json({ error: 'Mindestens ein Admin muss bestehen bleiben.' });
        }
      }

      const updated = await store.updateUserRole(id, nextRole);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // Betriebs-Einstellungen (Kommentar-Sichtbarkeit: 'all' vs. 'own_only' — durch Admin/Chef umschaltbar)
  app.get('/api/settings', async (_req, res, next) => {
    try {
      const [commentsVisibility, adminCount] = await Promise.all([
        getCommentsVisibility(),
        store.countAdmins ? store.countAdmins() : 0
      ]);
      res.json({
        commentsVisibility,
        hasAdmin: adminCount > 0,
        managerPinRequired: Boolean(configuredManagerPin)
      });
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/settings', requireAdminAccess, async (req, res, next) => {
    try {
      const { commentsVisibility } = req.body || {};
      if (!['all', 'own_only'].includes(commentsVisibility)) {
        return res.status(400).json({ error: 'commentsVisibility muss all oder own_only sein.' });
      }
      if (store.setSetting) {
        await store.setSetting('comments_visibility', commentsVisibility);
      }
      res.json({ commentsVisibility, managerPinRequired: Boolean(configuredManagerPin) });
    } catch (err) {
      next(err);
    }
  });

  // Stories auflisten (filtert Entscheid-Kommentare wenn Chef 'own_only' aktiviert hat)
  app.get('/api/stories', async (req, res, next) => {
    try {
      const [stories, visibility, privileged] = await Promise.all([
        store.listStories({
          status: req.query.status,
          moscow: req.query.moscow,
          q: req.query.q,
          sort: req.query.sort
        }),
        getCommentsVisibility(),
        canSeeAllComments(req)
      ]);
      const token = getClientToken(req);

      const sanitized = stories.map((s) => {
        const list = Array.isArray(s.decision_feedback_json) ? s.decision_feedback_json : [];
        const visibleList =
          visibility === 'own_only' && !privileged
            ? list.filter((c) => c.clientToken && c.clientToken === token)
            : list;
        return {
          ...s,
          decision_feedback_json: visibleList.map(({ clientToken: _omit, ...rest }) => rest)
        };
      });
      res.json(sanitized);
    } catch (err) {
      next(err);
    }
  });

  // CSV-Export für Excel (nur Manager & Admin, unterstützt alle Report-Filter)
  app.get('/api/stories/export/csv', requireReportAccess, async (req, res, next) => {
    try {
      const hasReportFilters = req.query.from || req.query.to || req.query.status || req.query.feasibility;
      const stories =
        hasReportFilters && store.getReportData
          ? (
              await store.getReportData({
                from: req.query.from,
                to: req.query.to,
                status: req.query.status,
                feasibility: req.query.feasibility
              })
            ).stories
          : await store.listStories();
      const csv = `\uFEFF${storiesToCsv(stories)}`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="requirements-engine-report.csv"');
      res.send(csv);
    } catch (err) {
      next(err);
    }
  });

  // Management-Report API (nur Manager & Admin; Zeitraum 01.01.XXXX - 31.12.XXXX, echte Zeiten & Einsparung)
  app.get('/api/report', requireReportAccess, async (req, res, next) => {
    try {
      const isoDate = /^\d{4}-\d{2}-\d{2}$/;
      const from = isoDate.test(String(req.query.from || '')) ? String(req.query.from) : null;
      const to = isoDate.test(String(req.query.to || '')) ? String(req.query.to) : null;
      const status = req.query.status ? String(req.query.status) : 'Alle';
      const feasibility = req.query.feasibility ? String(req.query.feasibility) : 'Alle';
      const granularity = ['day', 'week', 'month', 'year'].includes(String(req.query.granularity))
        ? String(req.query.granularity)
        : 'month';
      const storyId = req.query.storyId ? parsePositiveId(req.query.storyId) : null;
      const timeMode = req.query.timeMode === 'projected' ? 'projected' : 'measured';
      const minutesPerRequest = Math.max(1, Math.min(60, Number(req.query.minutesPerRequest) || 5));
      const rawRate = Number(req.query.hourlyRate);
      const hourlyRate = Number.isFinite(rawRate) && rawRate > 0 && rawRate <= 2000 ? rawRate : null;

      const data = await store.getReportData({ from, to, status, feasibility, granularity, storyId });
      const rawStories = data.stories || [];
      const mentionsTimeline = data.mentionsTimeline || data.mentionsByMonth || [];

      const stories = rawStories.map((s) => {
        const mentions = Number(s.period_mentions ?? s.votes ?? 1);
        const measuredSeconds = Number(s.period_duration_seconds ?? s.total_duration_seconds ?? 0);
        const timedMentions = Number(s.period_timed_mentions ?? s.timed_mentions ?? 0);
        const avgSeconds = timedMentions > 0 ? Math.round(measuredSeconds / timedMentions) : 0;

        let effectiveSeconds = measuredSeconds;
        let isEstimated = false;
        if (timeMode === 'projected') {
          if (timedMentions > 0) {
            effectiveSeconds = avgSeconds * mentions;
            isEstimated = timedMentions < mentions;
          } else {
            effectiveSeconds = mentions * minutesPerRequest * 60;
            isEstimated = true;
          }
        }

        const effectiveHours = Math.round((effectiveSeconds / 3600) * 100) / 100;
        return {
          ...s,
          report_mentions: mentions,
          report_measured_seconds: measuredSeconds,
          report_timed_mentions: timedMentions,
          report_avg_seconds: avgSeconds,
          report_effective_seconds: effectiveSeconds,
          report_effective_hours: effectiveHours,
          report_is_estimated: isEstimated
        };
      });

      const totalStories = stories.length;
      const totalMentions = stories.reduce((sum, s) => sum + s.report_mentions, 0);
      const totalTimedMentions = stories.reduce((sum, s) => sum + s.report_timed_mentions, 0);
      const measuredSeconds = stories.reduce((sum, s) => sum + s.report_measured_seconds, 0);
      const effectiveSeconds = stories.reduce((sum, s) => sum + s.report_effective_seconds, 0);
      const hasEstimated = stories.some((s) => s.report_is_estimated);
      const totalHours = Math.round((effectiveSeconds / 3600) * 10) / 10;
      const totalWorkdays = Math.round((effectiveSeconds / 3600 / 8.2) * 10) / 10;

      const byFeasibility = {
        einfach: stories.filter((s) => s.feasibility === 'einfach').length,
        mittel: stories.filter((s) => s.feasibility === 'mittel').length,
        aufwaendig: stories.filter((s) => s.feasibility === 'aufwaendig').length,
        unbewertet: stories.filter((s) => !['einfach', 'mittel', 'aufwaendig'].includes(s.feasibility)).length
      };

      const byStatus = {
        offen: stories.filter((s) => ['Eingang', 'Geprüft', 'Bereit'].includes(s.status)).length,
        inArbeit: stories.filter((s) => ['In Arbeit', 'Angenommen'].includes(s.status)).length,
        erledigt: stories.filter((s) => s.status === 'Umgesetzt').length,
        abgelehnt: stories.filter((s) => s.status === 'Abgelehnt').length
      };

      const byChannelMap = new Map();
      const creditsMap = new Map();
      for (const s of stories) {
        const ch = (s.channel || '').trim() || 'Ohne Kanal';
        byChannelMap.set(ch, (byChannelMap.get(ch) || 0) + s.report_mentions);

        const author = (s.submitted_by || '').trim() || 'Nicht angegeben';
        const prev = creditsMap.get(author) || { name: author, ideas: 0, implemented: 0, mentions: 0 };
        prev.ideas += 1;
        prev.mentions += s.report_mentions;
        if (s.status === 'Umgesetzt') prev.implemented += 1;
        creditsMap.set(author, prev);
      }

      const credits = [...creditsMap.values()]
        .filter((c) => c.name !== 'Nicht angegeben')
        .sort((a, b) => b.implemented - a.implemented || b.mentions - a.mentions || b.ideas - a.ideas)
        .slice(0, 10);

      const topResourceDrivers = [...stories]
        .sort((a, b) => b.report_effective_seconds - a.report_effective_seconds || b.report_mentions - a.report_mentions)
        .slice(0, 6)
        .map((s) => ({
          id: s.id,
          title: s.title,
          feasibility: s.feasibility || 'mittel',
          status: s.status,
          mentions: s.report_mentions,
          timedMentions: s.report_timed_mentions,
          measuredSeconds: s.report_measured_seconds,
          avgSeconds: s.report_avg_seconds,
          effectiveSeconds: s.report_effective_seconds,
          hours: Math.round((s.report_effective_seconds / 3600) * 10) / 10,
          isEstimated: s.report_is_estimated
        }));

      const implementationRate =
        totalStories > 0 ? Math.round((byStatus.erledigt / totalStories) * 100) : 0;

      // Realer Wirkungs- & Einsparungs-Nachweis (nur aus tatsächlich umgesetzten Themen)
      const implementedStories = stories.filter((s) => s.status === 'Umgesetzt');
      const savedMentions = implementedStories.reduce((sum, s) => sum + s.report_mentions, 0);
      const savedSeconds = implementedStories.reduce((sum, s) => sum + s.report_effective_seconds, 0);
      const savedHours = Math.round((savedSeconds / 3600) * 100) / 100;
      const savedCostChf = hourlyRate && savedSeconds > 0 ? Math.round((savedSeconds / 3600) * hourlyRate) : null;
      const topSavedItems = [...implementedStories]
        .sort((a, b) => b.report_effective_seconds - a.report_effective_seconds || b.report_mentions - a.report_mentions)
        .slice(0, 4)
        .map((s) => ({
          id: s.id,
          title: s.title,
          mentions: s.report_mentions,
          seconds: s.report_effective_seconds,
          costChf: hourlyRate && s.report_effective_seconds > 0 ? Math.round((s.report_effective_seconds / 3600) * hourlyRate) : null,
          isEstimated: s.report_is_estimated
        }));

      const pressureItems = stories
        .filter((s) => (Number(s.post_decision_mentions) || 0) > 0 || (Number(s.decision_down) || 0) > (Number(s.decision_up) || 0))
        .map((s) => ({
          id: s.id,
          title: s.title,
          status: s.status,
          totalMentions: s.report_mentions,
          postDecisionMentions: Number(s.post_decision_mentions) || 0,
          decisionUp: Number(s.decision_up) || 0,
          decisionDown: Number(s.decision_down) || 0,
          feedbackCount: Array.isArray(s.decision_feedback_json) ? s.decision_feedback_json.length : 0
        }))
        .sort((a, b) => b.postDecisionMentions - a.postDecisionMentions || b.decisionDown - a.decisionDown);

      const peakBucket =
        mentionsTimeline.length > 0
          ? [...mentionsTimeline].sort((a, b) => b.total - a.total)[0]
          : null;

      res.json({
        filters: { from, to, status, feasibility, granularity, storyId, timeMode, minutesPerRequest, hourlyRate },
        generatedAt: new Date().toISOString(),
        summary: {
          totalStories,
          totalMentions,
          totalTimedMentions,
          measuredSeconds,
          effectiveSeconds,
          hasEstimated,
          totalHours,
          totalWorkdays,
          implementationRate
        },
        savings: {
          implementedCount: implementedStories.length,
          savedMentions,
          savedSeconds,
          savedHours,
          hourlyRate,
          savedCostChf,
          topSavedItems
        },
        byFeasibility,
        byStatus,
        byChannel: [...byChannelMap.entries()].map(([channel, mentions]) => ({ channel, mentions })),
        mentionsTimeline,
        peakBucket,
        topResourceDrivers,
        pressureItems,
        credits,
        stories
      });
    } catch (err) {
      next(err);
    }
  });

  // Feedback einreichen -> automatisch übersetzen & speichern
  app.post('/api/stories', async (req, res, next) => {
    try {
      const {
        title: customTitle,
        rawFeedback,
        businessValues,
        sourceRole,
        origin,
        channel,
        submittedBy,
        feasibility,
        feedbackType,
        urgency,
        processId,
        dueDate,
        durationSeconds,
        durationText,
        interactionRef,
        customerRef
      } = req.body || {};
      if (typeof rawFeedback !== 'string' || rawFeedback.trim().length > 2000) {
        return res.status(400).json({ error: 'Feedback muss ein Text mit maximal 2000 Zeichen sein.' });
      }
      const allowedChannels = new Set(['', 'Persönlich', 'Telefon', 'Chat', 'E-Mail']);
      const safeChannel = allowedChannels.has(channel) ? channel : '';
      const allowedValues = new Set([
        'zeitersparnis',
        'kundenaufwand',
        'erklaerung',
        'fehler',
        'umsatz'
      ]);
      const safeBusinessValues = Array.isArray(businessValues)
        ? [...new Set(businessValues.map((v) => String(v || '').trim()).filter((v) => allowedValues.has(v)))]
        : [];
      const safeCustomTitle = typeof customTitle === 'string' ? customTitle.trim().slice(0, 140) : '';
      const resolvedOrigin = origin || 'kunde';
      const sessionUser = getSessionUser(req);
      const safeAuthor =
        (typeof submittedBy === 'string' && submittedBy.trim().slice(0, 80)) ||
        (sessionUser ? sessionUser.displayName : '');
      const safeRef = typeof interactionRef === 'string' ? interactionRef.trim().slice(0, 64) : '';
      const safeCustomer = typeof customerRef === 'string' ? customerRef.trim().slice(0, 100) : '';
      const parsedDuration = parseDurationSeconds(durationSeconds, durationText);

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
        submittedBy: safeAuthor,
        businessValues: safeBusinessValues,
        durationSeconds: parsedDuration,
        interactionRef: safeRef,
        customerRef: safeCustomer,
        clientToken: getClientToken(req),
        rawFeedback: rawFeedback.trim(),
        dueDate: dueDate || null,
        ...analyzed,
        title: safeCustomTitle || analyzed.title
      });

      res.status(201).json({ story: created, duplicates: analyzed.duplicates });
    } catch (err) {
      if (err.message.includes('mindestens 10 Zeichen')) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  });

  // Eintrag entfernen (Supervisor / Manager / Admin)
  app.delete('/api/stories/:id', requireDecideAccess, async (req, res, next) => {
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

  // Duplikate verlustfrei zusammenführen (alle Fälle, Zeiten & Ref-IDs wandern ins Zielthema)
  app.post('/api/stories/:id/merge', requireDecideAccess, async (req, res, next) => {
    try {
      const sourceId = parsePositiveId(req.params.id);
      const targetId = parsePositiveId(req.body?.targetId);
      if (!sourceId || !targetId || sourceId === targetId) {
        return res.status(400).json({ error: 'Bitte ein gültiges Zielthema wählen.' });
      }
      if (!store.mergeStories) {
        return res.status(501).json({ error: 'Zusammenführen nicht verfügbar.' });
      }
      const user = getSessionUser(req);
      const merged = await store.mergeStories(sourceId, targetId, {
        actorRole: user ? user.displayName : 'Betriebsverantwortung'
      });
      if (!merged) return res.status(404).json({ error: 'Quell- oder Zielthema nicht gefunden.' });
      res.json(merged);
    } catch (err) {
      next(err);
    }
  });

  // Alle einzelnen Kundenfeedbacks / Fall-Logs zu einer Anforderung (beachtet Chef-Schalter 'own_only')
  app.get('/api/stories/:id/mentions', async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Ungültige ID.' });
      const current = await store.getStoryById(id);
      if (!current) return res.status(404).json({ error: 'Anforderung nicht gefunden.' });
      const [allMentions, visibility, privileged] = await Promise.all([
        store.listStoryMentions ? store.listStoryMentions(id, req.query.limit) : [],
        getCommentsVisibility(),
        canSeeAllComments(req)
      ]);
      const token = getClientToken(req);

      const visible =
        visibility === 'own_only' && !privileged
          ? allMentions.filter((m) => m.client_token && m.client_token === token)
          : allMentions;

      res.setHeader('X-Comments-Visibility', visibility);
      res.setHeader('X-Total-Mentions', String(allMentions.length));
      res.json(visible.map(({ client_token: _omit, ...rest }) => rest));
    } catch (err) {
      next(err);
    }
  });

  // Strikter +1 Upvote pro Fall — zwingend mit Zeitaufwand (min. 1 Min.) + optionalem Kundenfeedback / Kunde / Ref-ID
  app.post('/api/stories/:id/vote', async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Ungültige ID.' });
      const current = await store.getStoryById(id);
      if (!current) return res.status(404).json({ error: 'Anforderung nicht gefunden.' });

      if (req.body?.delta !== undefined && Number(req.body.delta) !== 1) {
        return res.status(400).json({ error: 'Pro Fall ist genau +1 Upvote möglich.' });
      }

      const durationSeconds = parseDurationSeconds(req.body?.durationSeconds, req.body?.durationText);
      if (durationSeconds < 60) {
        return res.status(400).json({ error: 'Zeitaufwand erforderlich (mindestens 01:00).' });
      }

      const allowedChannels = new Set(['', 'Persönlich', 'Telefon', 'Chat', 'E-Mail']);
      const safeChannel = allowedChannels.has(req.body?.channel) ? req.body.channel : '';
      const sessionUser = getSessionUser(req);
      const recordedBy =
        (typeof req.body?.recordedBy === 'string' && req.body.recordedBy.trim().slice(0, 80)) ||
        (sessionUser ? sessionUser.displayName : '');
      const interactionRef = typeof req.body?.interactionRef === 'string' ? req.body.interactionRef.trim().slice(0, 64) : '';
      const feedbackNote = typeof req.body?.feedbackNote === 'string' ? req.body.feedbackNote.trim().slice(0, 1000) : '';
      const customerRef = typeof req.body?.customerRef === 'string' ? req.body.customerRef.trim().slice(0, 100) : '';

      const recalculated = scoreAndPrioritize({
        rawText: current.raw_feedback,
        urgency: current.urgency,
        feedbackType: current.feedback_type,
        feasibility: current.feasibility || 'unbewertet',
        votes: Number(current.votes) + 1,
        tasks: Array.isArray(current.tasks_json) ? current.tasks_json : []
      });

      const updated = await store.upvoteStory(id, recalculated, {
        recordedBy,
        durationSeconds,
        interactionRef,
        feedbackNote,
        customerRef,
        channel: safeChannel,
        clientToken: getClientToken(req)
      });
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

  // Machbarkeit bewerten (Supervisor / Manager / Admin)
  app.patch('/api/stories/:id/feasibility', requireDecideAccess, async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Ungültige ID.' });
      const { feasibility } = req.body || {};
      if (!['einfach', 'mittel', 'aufwaendig', 'unbewertet'].includes(feasibility)) {
        return res.status(400).json({ error: 'Machbarkeit muss einfach, mittel, aufwaendig oder unbewertet sein.' });
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

  // Entscheid fällen (Supervisor / Manager / Admin)
  app.post('/api/stories/:id/decision', requireDecideAccess, async (req, res, next) => {
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

  // Zufriedenheits-Voting & Rückmeldung zu einem getroffenen Entscheid (👍 / 👎 + Kommentar)
  app.post('/api/stories/:id/decision-feedback', async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Ungültige ID.' });
      const { sentiment, comment, author } = req.body || {};
      if (!['up', 'down'].includes(sentiment)) {
        return res.status(400).json({ error: 'Sentiment muss up oder down sein.' });
      }
      const cleanComment = typeof comment === 'string' ? comment.trim().slice(0, 500) : '';
      const cleanAuthor = typeof author === 'string' ? author.trim().slice(0, 80) : '';
      const updated = await store.recordDecisionFeedback(id, {
        sentiment,
        comment: cleanComment,
        author: cleanAuthor,
        clientToken: getClientToken(req)
      });
      if (!updated) return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // Jira-kompatibler CSV-Export (Issues -> Import Issues from CSV als Story/Feature)
  app.get('/api/stories/export/jira-csv', async (_req, res, next) => {
    try {
      const stories = await store.listStories();
      const csv = `\uFEFF${storiesToJiraCsv(stories)}`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="requirements-engine-jira-import.csv"');
      res.send(csv);
    } catch (err) {
      next(err);
    }
  });

  // Einzelne Anforderung direkt als Jira Story oder Feature übertragen (REST API v3 oder Markup-Fallback)
  app.post('/api/stories/:id/jira', async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Ungültige ID.' });
      const story = await store.getStoryById(id);
      if (!story) return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
      const issueType = ['Story', 'Feature'].includes(req.body?.issueType) ? req.body.issueType : undefined;

      const result = await pushStoryToJira(story, { issueType });
      if (result.mode === 'api' && store.setStoryJiraLink) {
        await store.setStoryJiraLink(id, { jiraKey: result.jiraKey, jiraUrl: result.jiraUrl });
      }
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: err.message });
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

  // Entscheid- & Audit-Log abrufen (Supervisor / Manager / Admin)
  app.get('/api/decisions', requireDecideAccess, async (_req, res, next) => {
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
