import pg from 'pg';
import { calculateTrafficLight } from './engine/exporters.js';
import { hashPassword, normalizeRole } from './auth.js';

const { Pool } = pg;

export function createPool() {
  const baseOpts = {
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000
  };
  const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL, ...baseOpts })
    : new Pool({
        host: process.env.POSTGRES_HOST || 'db',
        port: Number(process.env.POSTGRES_PORT || 5432),
        database: process.env.POSTGRES_DB || 'reqengine',
        user: process.env.POSTGRES_USER || 'reqengine',
        password: process.env.POSTGRES_PASSWORD,
        ...baseOpts
      });

  // Fireproof: Idle-Client-Verbindungsabbrüche (z. B. DB-Neustart) abfangen, damit der Node-Prozess nie abstürzt
  pool.on('error', (err) => {
    console.error('[DB-Pool] Verbindung unterbrochen (Auto-Reconnect aktiv):', err.message);
  });

  return pool;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

export async function initDatabase(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user',
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS processes (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Allgemein',
      owner_role TEXT NOT NULL DEFAULT 'Betrieb',
      summary TEXT NOT NULL DEFAULT '',
      review_interval_days INTEGER NOT NULL DEFAULT 90,
      last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      next_review_at DATE NOT NULL,
      version_nr INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS process_steps (
      id SERIAL PRIMARY KEY,
      process_id INTEGER NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL,
      action_title TEXT NOT NULL,
      ui_target TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '',
      hint_type TEXT NOT NULL DEFAULT 'info',
      screenshot_data TEXT,
      markers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS feedback_stories (
      id SERIAL PRIMARY KEY,
      process_id INTEGER REFERENCES processes(id) ON DELETE SET NULL,
      source_role TEXT NOT NULL,
      feedback_type TEXT NOT NULL DEFAULT 'idee',
      urgency TEXT NOT NULL DEFAULT 'normal',
      raw_feedback TEXT NOT NULL,
      title TEXT NOT NULL,
      user_story TEXT NOT NULL,
      req_type TEXT NOT NULL,
      moscow TEXT NOT NULL,
      size_estimate TEXT NOT NULL DEFAULT 'M',
      priority_score INTEGER NOT NULL DEFAULT 50,
      votes INTEGER NOT NULL DEFAULT 1,
      tasks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      acceptance_criteria_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'Eingang',
      decision_reason TEXT NOT NULL DEFAULT '',
      due_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'kunde';
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT '';
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS submitted_by TEXT NOT NULL DEFAULT '';
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS feasibility TEXT NOT NULL DEFAULT 'unbewertet';
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS public_response TEXT NOT NULL DEFAULT '';
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS internal_note TEXT NOT NULL DEFAULT '';
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS post_decision_mentions INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS decision_up INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS decision_down INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS decision_feedback_json JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS jira_key TEXT NOT NULL DEFAULT '';
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS jira_url TEXT NOT NULL DEFAULT '';
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS total_duration_seconds INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS timed_mentions INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS interaction_refs_json JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS business_values_json JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS owner_client_token TEXT NOT NULL DEFAULT '';

    UPDATE feedback_stories
    SET decided_at = updated_at
    WHERE decided_at IS NULL AND status IN ('In Prüfung', 'Abgelehnt', 'Umgesetzt', 'In Arbeit', 'Angenommen');

    CREATE TABLE IF NOT EXISTS story_mentions (
      id SERIAL PRIMARY KEY,
      story_id INTEGER NOT NULL REFERENCES feedback_stories(id) ON DELETE CASCADE,
      delta INTEGER NOT NULL DEFAULT 1,
      recorded_by TEXT NOT NULL DEFAULT '',
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      interaction_ref TEXT NOT NULL DEFAULT '',
      feedback_note TEXT NOT NULL DEFAULT '',
      customer_ref TEXT NOT NULL DEFAULT '',
      channel TEXT NOT NULL DEFAULT '',
      client_token TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE story_mentions ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE story_mentions ADD COLUMN IF NOT EXISTS interaction_ref TEXT NOT NULL DEFAULT '';
    ALTER TABLE story_mentions ADD COLUMN IF NOT EXISTS feedback_note TEXT NOT NULL DEFAULT '';
    ALTER TABLE story_mentions ADD COLUMN IF NOT EXISTS customer_ref TEXT NOT NULL DEFAULT '';
    ALTER TABLE story_mentions ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT '';
    ALTER TABLE story_mentions ADD COLUMN IF NOT EXISTS client_token TEXT NOT NULL DEFAULT '';

    UPDATE feedback_stories f
    SET owner_client_token = COALESCE(
      (SELECT m.client_token FROM story_mentions m WHERE m.story_id = f.id AND m.client_token <> '' ORDER BY m.id ASC LIMIT 1),
      ''
    )
    WHERE f.owner_client_token = '';

    CREATE TABLE IF NOT EXISTS story_questions (
      id SERIAL PRIMARY KEY,
      story_id INTEGER NOT NULL REFERENCES feedback_stories(id) ON DELETE CASCADE,
      author_name TEXT NOT NULL DEFAULT '',
      author_role TEXT NOT NULL DEFAULT 'supervisor',
      author_token TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL,
      reply_body TEXT NOT NULL DEFAULT '',
      reply_author TEXT NOT NULL DEFAULT '',
      replied_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      recipient_token TEXT NOT NULL DEFAULT '',
      recipient_role TEXT NOT NULL DEFAULT '',
      story_id INTEGER NOT NULL REFERENCES feedback_stories(id) ON DELETE CASCADE,
      story_title TEXT NOT NULL DEFAULT '',
      sender_name TEXT NOT NULL DEFAULT '',
      sender_role TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS story_relevance_votes (
      id SERIAL PRIMARY KEY,
      story_id INTEGER NOT NULL REFERENCES feedback_stories(id) ON DELETE CASCADE,
      voter_token TEXT NOT NULL,
      voter_name TEXT NOT NULL DEFAULT '',
      voter_role TEXT NOT NULL DEFAULT 'user',
      vote TEXT NOT NULL CHECK (vote IN ('relevant', 'irrelevant')),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (story_id, voter_token)
    );

    CREATE TABLE IF NOT EXISTS notification_subscriptions (
      client_token TEXT PRIMARY KEY,
      user_name TEXT NOT NULL DEFAULT '',
      on_implemented BOOLEAN NOT NULL DEFAULT TRUE,
      on_threshold BOOLEAN NOT NULL DEFAULT FALSE,
      threshold_count INTEGER NOT NULL DEFAULT 5,
      on_decision BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Historische Meldungen sauber angleichen, falls Einträge vor story_mentions gezählt wurden
    INSERT INTO story_mentions (story_id, delta, recorded_by, duration_seconds, created_at)
    SELECT f.id, (f.votes - COALESCE(m.sum_delta, 0)), f.submitted_by, 0, f.created_at
    FROM feedback_stories f
    LEFT JOIN (
      SELECT story_id, SUM(delta)::int AS sum_delta FROM story_mentions GROUP BY story_id
    ) m ON m.story_id = f.id
    WHERE f.votes > COALESCE(m.sum_delta, 0);

    CREATE TABLE IF NOT EXISTS decision_log (
      id SERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      entity_title TEXT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT NOT NULL,
      actor_role TEXT NOT NULL DEFAULT 'Betriebsverantwortung',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Optionales Admin-Seeding aus lokalen Umgebungsvariablen (niemals hartcodiert im Repo)
  const envAdminUser = String(process.env.ADMIN_USERNAME || '').trim().toLowerCase();
  const envAdminPass = String(process.env.ADMIN_PASSWORD || '').trim();
  if (envAdminUser.length >= 2 && envAdminPass.length >= 6) {
    const existing = await pool.query(`SELECT id FROM users WHERE LOWER(username) = $1`, [envAdminUser]);
    if (existing.rowCount === 0) {
      await pool.query(
        `INSERT INTO users (username, display_name, role, password_hash) VALUES ($1, $2, 'admin', $3)`,
        [envAdminUser, process.env.ADMIN_DISPLAY_NAME || 'Chef / Admin', hashPassword(envAdminPass)]
      );
    }
  }
}

export function createPostgresStore(pool) {
  return {
    async getSetting(key, fallback = '') {
      const res = await pool.query(`SELECT value FROM app_meta WHERE key = $1`, [key]);
      return res.rowCount > 0 ? res.rows[0].value : fallback;
    },

    async setSetting(key, value) {
      await pool.query(
        `INSERT INTO app_meta (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, String(value)]
      );
      return String(value);
    },

    async countAdmins() {
      const res = await pool.query(`SELECT COUNT(*)::int AS cnt FROM users WHERE role = 'admin'`);
      return res.rows[0]?.cnt ?? 0;
    },

    async findUserByUsername(username) {
      const res = await pool.query(`SELECT * FROM users WHERE LOWER(username) = LOWER($1)`, [username]);
      return res.rowCount > 0 ? res.rows[0] : null;
    },

    async createUser({ username, displayName, role = 'user', passwordHash }) {
      const cleanUser = String(username || '').trim().toLowerCase();
      const safeRole = normalizeRole(role);
      const res = await pool.query(
        `INSERT INTO users (username, display_name, role, password_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, display_name, role, created_at`,
        [cleanUser, String(displayName || cleanUser).trim().slice(0, 80), safeRole, passwordHash]
      );
      return res.rows[0];
    },

    async listUsers() {
      const res = await pool.query(
        `SELECT id, username, display_name, role, created_at FROM users ORDER BY id ASC`
      );
      return res.rows;
    },

    async updateUserRole(id, role) {
      const safeRole = normalizeRole(role);
      const res = await pool.query(
        `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, display_name, role, created_at`,
        [safeRole, id]
      );
      return res.rowCount > 0 ? res.rows[0] : null;
    },

    async checkHealth() {
      const start = Date.now();
      await pool.query('SELECT 1');
      const dbLatencyMs = Date.now() - start;
      const countsRes = await pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM processes) AS processes,
          (SELECT COUNT(*)::int FROM process_steps) AS steps,
          (SELECT COUNT(*)::int FROM feedback_stories) AS stories,
          (SELECT COUNT(*)::int FROM decision_log) AS decisions
      `);
      return {
        dbConnected: true,
        dbLatencyMs,
        counts: countsRes.rows[0]
      };
    },

    async listProcesses() {
      const res = await pool.query(`
        SELECT p.*,
          (SELECT COUNT(*)::int FROM process_steps s WHERE s.process_id = p.id) AS step_count,
          (SELECT COUNT(*)::int FROM feedback_stories f WHERE f.process_id = p.id) AS linked_story_count
        FROM processes p
        ORDER BY p.next_review_at ASC, p.id DESC
      `);
      return res.rows.map((row) => ({
        ...row,
        trafficLight: calculateTrafficLight(row.next_review_at)
      }));
    },

    async getProcessWithSteps(id) {
      const procRes = await pool.query(`SELECT * FROM processes WHERE id = $1`, [id]);
      if (procRes.rowCount === 0) return null;
      const stepsRes = await pool.query(
        `SELECT * FROM process_steps WHERE process_id = $1 ORDER BY step_order ASC, id ASC`,
        [id]
      );
      const storiesRes = await pool.query(
        `SELECT id, title, moscow, status, priority_score, votes FROM feedback_stories WHERE process_id = $1 ORDER BY priority_score DESC`,
        [id]
      );
      const proc = procRes.rows[0];
      return {
        ...proc,
        trafficLight: calculateTrafficLight(proc.next_review_at),
        steps: stepsRes.rows,
        linkedStories: storiesRes.rows
      };
    },

    async createProcess({ title, category, ownerRole, summary, reviewIntervalDays }) {
      const interval = Math.max(7, Math.min(Number(reviewIntervalDays) || 90, 730));
      const nextReview = addDays(new Date(), interval);
      const res = await pool.query(
        `INSERT INTO processes (title, category, owner_role, summary, review_interval_days, next_review_at)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [title, category || 'Allgemein', ownerRole || 'Betrieb', summary || '', interval, nextReview]
      );
      const created = res.rows[0];
      await pool.query(
        `INSERT INTO decision_log (entity_type, entity_id, entity_title, action, reason, actor_role)
         VALUES ('process', $1, $2, 'Prozess angelegt', $3, $4)`,
        [created.id, created.title, `Klick-Anleitung mit Review-Intervall von ${interval} Tagen erstellt.`, created.owner_role]
      );
      return {
        ...created,
        step_count: 0,
        linked_story_count: 0,
        trafficLight: calculateTrafficLight(created.next_review_at)
      };
    },

    async addProcessStep(processId, { actionTitle, uiTarget, details, hintType, screenshotData, markers }) {
      const exists = await pool.query(`SELECT id FROM processes WHERE id = $1`, [processId]);
      if (exists.rowCount === 0) return null;

      const maxOrderRes = await pool.query(
        `SELECT COALESCE(MAX(step_order), 0)::int AS max_order FROM process_steps WHERE process_id = $1`,
        [processId]
      );
      const nextOrder = maxOrderRes.rows[0].max_order + 1;
      const safeHint = ['info', 'tip', 'warn'].includes(hintType) ? hintType : 'info';
      const safeMarkers = Array.isArray(markers)
        ? markers.slice(0, 12).map((m) => ({
            x: Math.max(0, Math.min(100, Number(m.x) || 0)),
            y: Math.max(0, Math.min(100, Number(m.y) || 0)),
            label: String(m.label || '').slice(0, 80)
          }))
        : [];

      const res = await pool.query(
        `INSERT INTO process_steps (process_id, step_order, action_title, ui_target, details, hint_type, screenshot_data, markers_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb) RETURNING *`,
        [processId, nextOrder, actionTitle, uiTarget || '', details || '', safeHint, screenshotData || null, JSON.stringify(safeMarkers)]
      );

      await pool.query(`UPDATE processes SET updated_at = NOW() WHERE id = $1`, [processId]);
      return res.rows[0];
    },

    async deleteProcessStep(processId, stepId) {
      const del = await pool.query(
        `DELETE FROM process_steps WHERE id = $1 AND process_id = $2 RETURNING id`,
        [stepId, processId]
      );
      if (del.rowCount === 0) return false;
      // Reihenfolge sauber neu durchnummerieren
      const remaining = await pool.query(
        `SELECT id FROM process_steps WHERE process_id = $1 ORDER BY step_order ASC, id ASC`,
        [processId]
      );
      for (let i = 0; i < remaining.rows.length; i += 1) {
        await pool.query(`UPDATE process_steps SET step_order = $1 WHERE id = $2`, [i + 1, remaining.rows[i].id]);
      }
      await pool.query(`UPDATE processes SET updated_at = NOW() WHERE id = $1`, [processId]);
      return true;
    },

    async markProcessReviewed(processId, { note, actorRole }) {
      const existing = await pool.query(`SELECT * FROM processes WHERE id = $1`, [processId]);
      if (existing.rowCount === 0) return null;
      const proc = existing.rows[0];
      const nextReview = addDays(new Date(), proc.review_interval_days);

      const updated = await pool.query(
        `UPDATE processes
         SET last_reviewed_at = NOW(), next_review_at = $1, version_nr = version_nr + 1, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [nextReview, processId]
      );

      await pool.query(
        `INSERT INTO decision_log (entity_type, entity_id, entity_title, action, reason, actor_role)
         VALUES ('process', $1, $2, 'Review bestätigt', $3, $4)`,
        [
          proc.id,
          proc.title,
          note || `Anleitung geprüft und als aktuell bestätigt. Nächstes Review: ${nextReview}.`,
          actorRole || proc.owner_role
        ]
      );

      const row = updated.rows[0];
      return {
        ...row,
        trafficLight: calculateTrafficLight(row.next_review_at)
      };
    },

    async listStories({ status, moscow, q, sort } = {}) {
      const clauses = [];
      const params = [];

      if (status && status !== 'Alle') {
        params.push(status);
        clauses.push(`f.status = $${params.length}`);
      }
      if (moscow && moscow !== 'Alle') {
        params.push(moscow);
        clauses.push(`f.moscow = $${params.length}`);
      }
      if (q && q.trim()) {
        params.push(`%${q.trim()}%`);
        clauses.push(`(f.title ILIKE $${params.length} OR f.raw_feedback ILIKE $${params.length} OR f.user_story ILIKE $${params.length} OR f.source_role ILIKE $${params.length})`);
      }

      const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const orderSql =
        sort === 'newest'
          ? 'ORDER BY f.created_at DESC, f.id DESC'
          : sort === 'quickwins'
            ? "ORDER BY (CASE WHEN f.feasibility = 'einfach' THEN 0 WHEN f.feasibility = 'mittel' THEN 1 ELSE 2 END) ASC, f.votes DESC, f.priority_score DESC"
            : 'ORDER BY f.priority_score DESC, f.votes DESC, f.created_at DESC';

      const res = await pool.query(
        `SELECT f.*, p.title AS process_title,
                COALESCE((
                  SELECT SUM(CASE WHEN q.reply_body <> '' THEN 2 ELSE 1 END)::int
                  FROM story_questions q WHERE q.story_id = f.id
                ), 0) AS question_activity_count,
                COALESCE((
                  SELECT COUNT(*)::int FROM story_questions q WHERE q.story_id = f.id AND q.reply_body = ''
                ), 0) AS open_questions_count,
                COALESCE((
                  SELECT COUNT(*)::int FROM story_relevance_votes rv WHERE rv.story_id = f.id AND rv.vote = 'relevant'
                ), 0) AS relevance_up,
                COALESCE((
                  SELECT COUNT(*)::int FROM story_relevance_votes rv WHERE rv.story_id = f.id AND rv.vote = 'irrelevant'
                ), 0) AS relevance_down
         FROM feedback_stories f
         LEFT JOIN processes p ON p.id = f.process_id
         ${whereSql}
         ${orderSql}`,
        params
      );
      return res.rows.map((row) => ({
        ...row,
        trafficLight: calculateTrafficLight(row.due_date)
      }));
    },

    async getStoryById(id) {
      const res = await pool.query(
        `SELECT f.*, p.title AS process_title
         FROM feedback_stories f
         LEFT JOIN processes p ON p.id = f.process_id
         WHERE f.id = $1`,
        [id]
      );
      if (res.rowCount === 0) return null;
      return {
        ...res.rows[0],
        trafficLight: calculateTrafficLight(res.rows[0].due_date)
      };
    },

    async createStory(payload) {
      const safeDur = Math.max(0, Math.min(28800, Math.round(Number(payload.durationSeconds) || 0)));
      const timed = safeDur > 0 ? 1 : 0;
      const safeRef = typeof payload.interactionRef === 'string' ? payload.interactionRef.trim().slice(0, 64) : '';
      const initialRefs = safeRef
        ? [{ ref: safeRef, channel: payload.channel || '', createdAt: new Date().toISOString() }]
        : [];
      const safeValues = Array.isArray(payload.businessValues)
        ? [...new Set(payload.businessValues.map((v) => String(v || '').trim().slice(0, 40)).filter(Boolean))].slice(0, 8)
        : [];
      const safeClient = typeof payload.clientToken === 'string' ? payload.clientToken.trim().slice(0, 64) : '';
      const res = await pool.query(
        `INSERT INTO feedback_stories
         (process_id, origin, channel, submitted_by, feasibility, source_role, feedback_type, urgency, raw_feedback, title, user_story, req_type, moscow, size_estimate, priority_score, votes, total_duration_seconds, timed_mentions, interaction_refs_json, business_values_json, owner_client_token, tasks_json, acceptance_criteria_json, status, due_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,1,$16,$17,$18::jsonb,$19::jsonb,$20,$21::jsonb,$22::jsonb,'Eingang',$23)
         RETURNING *`,
        [
          payload.processId || null,
          payload.origin || 'kunde',
          payload.channel ?? '',
          payload.submittedBy || '',
          payload.feasibility || 'unbewertet',
          payload.sourceRole,
          payload.feedbackType,
          payload.urgency,
          payload.rawFeedback,
          payload.title,
          payload.userStory,
          payload.reqType,
          payload.moscow,
          payload.sizeEstimate,
          payload.priorityScore,
          safeDur,
          timed,
          JSON.stringify(initialRefs),
          JSON.stringify(safeValues),
          safeClient,
          JSON.stringify(payload.tasks),
          JSON.stringify(payload.acceptanceCriteria),
          payload.dueDate || null
        ]
      );
      const created = res.rows[0];
      const safeCustomer = typeof payload.customerRef === 'string' ? payload.customerRef.trim().slice(0, 100) : '';
      await pool.query(
        `INSERT INTO story_mentions (story_id, delta, recorded_by, duration_seconds, interaction_ref, feedback_note, customer_ref, channel, client_token)
         VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          created.id,
          created.submitted_by || '',
          safeDur,
          safeRef,
          created.raw_feedback || '',
          safeCustomer,
          created.channel || '',
          safeClient
        ]
      );
      await pool.query(
        `INSERT INTO decision_log (entity_type, entity_id, entity_title, action, reason, actor_role)
         VALUES ('story', $1, $2, 'Eingegangenes Feedback', $3, $4)`,
        [
          created.id,
          created.title,
          `Erfasst${created.channel ? ` via ${created.channel}` : ''}${safeRef ? ` [${safeRef}]` : ''}${created.submitted_by ? ` (${created.submitted_by})` : ''}.`,
          created.submitted_by || created.source_role
        ]
      );
      return {
        ...created,
        trafficLight: calculateTrafficLight(created.due_date)
      };
    },

    async deleteStory(id) {
      const del = await pool.query(`DELETE FROM feedback_stories WHERE id = $1 RETURNING id`, [id]);
      if (del.rowCount === 0) return false;
      await pool.query(`DELETE FROM decision_log WHERE entity_type = 'story' AND entity_id = $1`, [id]);
      return true;
    },

    async mergeStories(sourceId, targetId, { actorRole = 'Supervisor' } = {}) {
      if (sourceId === targetId) return null;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const srcRes = await client.query(`SELECT * FROM feedback_stories WHERE id = $1 FOR UPDATE`, [sourceId]);
        const tgtRes = await client.query(`SELECT * FROM feedback_stories WHERE id = $1 FOR UPDATE`, [targetId]);
        if (srcRes.rowCount === 0 || tgtRes.rowCount === 0) {
          await client.query('ROLLBACK');
          return null;
        }
        const src = srcRes.rows[0];
        const tgt = tgtRes.rows[0];

        // Alle Einzelfälle & Zeitstempel verlustfrei ins Zielthema verschieben
        await client.query(`UPDATE story_mentions SET story_id = $1 WHERE story_id = $2`, [targetId, sourceId]);

        const mergedRefs = [
          ...(Array.isArray(tgt.interaction_refs_json) ? tgt.interaction_refs_json : []),
          ...(Array.isArray(src.interaction_refs_json) ? src.interaction_refs_json : [])
        ].slice(-50);

        const mergedValues = [
          ...new Set([
            ...(Array.isArray(tgt.business_values_json) ? tgt.business_values_json : []),
            ...(Array.isArray(src.business_values_json) ? src.business_values_json : [])
          ])
        ].slice(0, 8);

        const nextVotes = Number(tgt.votes || 1) + Number(src.votes || 1);
        const nextDur = Number(tgt.total_duration_seconds || 0) + Number(src.total_duration_seconds || 0);
        const nextTimed = Number(tgt.timed_mentions || 0) + Number(src.timed_mentions || 0);
        const nextPost =
          tgt.status === 'Abgelehnt'
            ? Number(tgt.post_decision_mentions || 0) + Number(src.votes || 1)
            : Number(tgt.post_decision_mentions || 0);

        const updatedRes = await client.query(
          `UPDATE feedback_stories
           SET votes = $1,
               total_duration_seconds = $2,
               timed_mentions = $3,
               post_decision_mentions = $4,
               interaction_refs_json = $5::jsonb,
               business_values_json = $6::jsonb,
               updated_at = NOW()
           WHERE id = $7 RETURNING *`,
          [nextVotes, nextDur, nextTimed, nextPost, JSON.stringify(mergedRefs), JSON.stringify(mergedValues), targetId]
        );

        await client.query(`DELETE FROM feedback_stories WHERE id = $1`, [sourceId]);
        await client.query(
          `INSERT INTO decision_log (entity_type, entity_id, entity_title, action, reason, actor_role)
           VALUES ('story', $1, $2, 'Zusammengeführt', $3, $4)`,
          [
            targetId,
            tgt.title,
            `Duplikat «${src.title}» (${src.votes}×) verlustfrei in dieses Thema zusammengeführt.`,
            actorRole
          ]
        );
        await client.query('COMMIT');
        return {
          ...updatedRes.rows[0],
          trafficLight: calculateTrafficLight(updatedRes.rows[0].due_date)
        };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async listStoryMentions(storyId, limit = 150) {
      const res = await pool.query(
        `SELECT id, story_id, delta, recorded_by, duration_seconds, interaction_ref, feedback_note, customer_ref, channel, client_token, created_at
         FROM story_mentions
         WHERE story_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT $2`,
        [storyId, Math.max(1, Math.min(300, Number(limit) || 150))]
      );
      return res.rows;
    },

    async listStoryQuestions(storyId) {
      const res = await pool.query(
        `SELECT id, story_id, author_name, author_role, body, reply_body, reply_author, replied_at, created_at
         FROM story_questions
         WHERE story_id = $1
         ORDER BY created_at ASC, id ASC`,
        [storyId]
      );
      return res.rows;
    },

    async createStoryQuestion(storyId, { authorName, authorRole, authorToken, body }) {
      const storyRes = await pool.query(`SELECT id, title, owner_client_token FROM feedback_stories WHERE id = $1`, [storyId]);
      if (storyRes.rowCount === 0) return null;
      const story = storyRes.rows[0];
      const res = await pool.query(
        `INSERT INTO story_questions (story_id, author_name, author_role, author_token, body)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, story_id, author_name, author_role, body, reply_body, reply_author, replied_at, created_at`,
        [storyId, authorName || '', authorRole || 'supervisor', authorToken || '', body]
      );
      if (story.owner_client_token && story.owner_client_token !== authorToken) {
        await pool.query(
          `INSERT INTO notifications (recipient_token, recipient_role, story_id, story_title, sender_name, sender_role, message)
           VALUES ($1, 'owner', $2, $3, $4, $5, $6)`,
          [story.owner_client_token, story.id, story.title, authorName || '', authorRole || 'supervisor', body.slice(0, 220)]
        );
      }
      return res.rows[0];
    },

    async replyToStoryQuestion(storyId, questionId, { replyBody, replyAuthor }) {
      const qRes = await pool.query(
        `SELECT q.*, f.title AS story_title
         FROM story_questions q
         JOIN feedback_stories f ON f.id = q.story_id
         WHERE q.id = $1 AND q.story_id = $2`,
        [questionId, storyId]
      );
      if (qRes.rowCount === 0) return null;
      const q = qRes.rows[0];
      const res = await pool.query(
        `UPDATE story_questions
         SET reply_body = $1, reply_author = $2, replied_at = NOW()
         WHERE id = $3 AND story_id = $4
         RETURNING id, story_id, author_name, author_role, body, reply_body, reply_author, replied_at, created_at`,
        [replyBody, replyAuthor || '', questionId, storyId]
      );
      if (q.author_token || q.author_role) {
        await pool.query(
          `INSERT INTO notifications (recipient_token, recipient_role, story_id, story_title, sender_name, sender_role, message)
           VALUES ($1, $2, $3, $4, $5, 'owner', $6)`,
          [q.author_token || '', q.author_role || 'supervisor', storyId, q.story_title || '', replyAuthor || 'Autor', replyBody.slice(0, 220)]
        );
      }
      return res.rows[0];
    },

    async listNotifications({ clientToken = '', role = '' } = {}) {
      if (!clientToken && !role) return [];
      const res = await pool.query(
        `SELECT id, story_id, story_title, sender_name, sender_role, message, is_read, created_at
         FROM notifications
         WHERE (recipient_token <> '' AND recipient_token = $1)
            OR (recipient_token = '' AND recipient_role <> '' AND recipient_role = $2)
         ORDER BY created_at DESC, id DESC
         LIMIT 25`,
        [clientToken, role]
      );
      return res.rows;
    },

    async markNotificationsRead({ clientToken = '', role = '', id = null } = {}) {
      if (id) {
        await pool.query(
          `UPDATE notifications SET is_read = TRUE
           WHERE id = $1
             AND ((recipient_token <> '' AND recipient_token = $2)
               OR (recipient_token = '' AND recipient_role <> '' AND recipient_role = $3))`,
          [id, clientToken, role]
        );
        return;
      }
      await pool.query(
        `UPDATE notifications SET is_read = TRUE
         WHERE (recipient_token <> '' AND recipient_token = $1)
            OR (recipient_token = '' AND recipient_role <> '' AND recipient_role = $2)`,
        [clientToken, role]
      );
    },

    async upsertRelevanceVote(storyId, { voterToken, voterName = '', voterRole = 'user', vote }) {
      const existing = await pool.query(`SELECT id FROM feedback_stories WHERE id = $1`, [storyId]);
      if (existing.rowCount === 0) return null;
      await pool.query(
        `INSERT INTO story_relevance_votes (story_id, voter_token, voter_name, voter_role, vote, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (story_id, voter_token)
         DO UPDATE SET vote = EXCLUDED.vote, voter_name = EXCLUDED.voter_name, voter_role = EXCLUDED.voter_role, updated_at = NOW()`,
        [storyId, voterToken, String(voterName || '').slice(0, 80), voterRole || 'user', vote]
      );
      const counts = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE vote = 'relevant')::int AS relevance_up,
           COUNT(*) FILTER (WHERE vote = 'irrelevant')::int AS relevance_down
         FROM story_relevance_votes WHERE story_id = $1`,
        [storyId]
      );
      return {
        storyId,
        vote,
        relevanceUp: counts.rows[0]?.relevance_up ?? 0,
        relevanceDown: counts.rows[0]?.relevance_down ?? 0
      };
    },

    async listRelevanceVotes(storyId) {
      const res = await pool.query(
        `SELECT id, story_id, voter_name, voter_role, vote, updated_at
         FROM story_relevance_votes
         WHERE story_id = $1
         ORDER BY updated_at DESC, id DESC`,
        [storyId]
      );
      return res.rows;
    },

    async getMyRelevanceVotes(voterToken) {
      if (!voterToken) return {};
      const res = await pool.query(
        `SELECT story_id, vote FROM story_relevance_votes WHERE voter_token = $1`,
        [voterToken]
      );
      const out = {};
      for (const r of res.rows) out[r.story_id] = r.vote;
      return out;
    },

    async getNotificationSubscription(clientToken) {
      if (!clientToken) {
        return { onImplemented: true, onThreshold: false, thresholdCount: 5, onDecision: false };
      }
      const res = await pool.query(
        `SELECT on_implemented, on_threshold, threshold_count, on_decision
         FROM notification_subscriptions WHERE client_token = $1`,
        [clientToken]
      );
      if (res.rowCount === 0) {
        return { onImplemented: true, onThreshold: false, thresholdCount: 5, onDecision: false };
      }
      const r = res.rows[0];
      return {
        onImplemented: Boolean(r.on_implemented),
        onThreshold: Boolean(r.on_threshold),
        thresholdCount: Number(r.threshold_count) || 5,
        onDecision: Boolean(r.on_decision)
      };
    },

    async saveNotificationSubscription(clientToken, { userName = '', onImplemented, onThreshold, thresholdCount = 5, onDecision }) {
      const safeThresh = Math.max(2, Math.min(100, Number(thresholdCount) || 5));
      await pool.query(
        `INSERT INTO notification_subscriptions (client_token, user_name, on_implemented, on_threshold, threshold_count, on_decision, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (client_token)
         DO UPDATE SET user_name = EXCLUDED.user_name,
                       on_implemented = EXCLUDED.on_implemented,
                       on_threshold = EXCLUDED.on_threshold,
                       threshold_count = EXCLUDED.threshold_count,
                       on_decision = EXCLUDED.on_decision,
                       updated_at = NOW()`,
        [clientToken, String(userName || '').slice(0, 80), Boolean(onImplemented), Boolean(onThreshold), safeThresh, Boolean(onDecision)]
      );
      return {
        onImplemented: Boolean(onImplemented),
        onThreshold: Boolean(onThreshold),
        thresholdCount: safeThresh,
        onDecision: Boolean(onDecision)
      };
    },

    async notifyEvent({ eventType, story, senderName = '', senderRole = 'admin', message = '' }) {
      if (!story) return 0;
      const recipients = new Set();

      // Bei Umgesetzt wird der Erfasser (Autor) des Falls automatisch informiert
      if (eventType === 'implemented' && story.owner_client_token) {
        recipients.add(story.owner_client_token);
      }

      // Smarte Event-Abos auswerten
      let subRes;
      if (eventType === 'implemented') {
        subRes = await pool.query(`SELECT client_token FROM notification_subscriptions WHERE on_implemented = TRUE`);
      } else if (eventType === 'threshold') {
        subRes = await pool.query(
          `SELECT client_token FROM notification_subscriptions WHERE on_threshold = TRUE AND threshold_count = $1`,
          [Number(story.votes) || 0]
        );
      } else if (eventType === 'decision') {
        subRes = await pool.query(`SELECT client_token FROM notification_subscriptions WHERE on_decision = TRUE`);
      }
      if (subRes) {
        for (const r of subRes.rows) {
          if (r.client_token) recipients.add(r.client_token);
        }
      }

      let sent = 0;
      for (const token of recipients) {
        await pool.query(
          `INSERT INTO notifications (recipient_token, recipient_role, story_id, story_title, sender_name, sender_role, message)
           VALUES ($1, 'subscriber', $2, $3, $4, $5, $6)`,
          [token, story.id, story.title || '', senderName || '', senderRole || 'admin', message.slice(0, 220)]
        );
        sent += 1;
      }
      return sent;
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
      const safeDur = Math.max(60, Math.min(28800, Math.round(Number(durationSeconds) || 60)));
      const safeRef = typeof interactionRef === 'string' ? interactionRef.trim().slice(0, 64) : '';
      const safeNote = typeof feedbackNote === 'string' ? feedbackNote.trim().slice(0, 1000) : '';
      const safeCustomer = typeof customerRef === 'string' ? customerRef.trim().slice(0, 100) : '';
      const safeAuthor = typeof recordedBy === 'string' ? recordedBy.trim().slice(0, 80) : '';
      const safeChannel = typeof channel === 'string' ? channel.trim().slice(0, 40) : '';
      const safeClient = typeof clientToken === 'string' ? clientToken.trim().slice(0, 64) : '';

      const existing = await pool.query(`SELECT interaction_refs_json FROM feedback_stories WHERE id = $1`, [id]);
      if (existing.rowCount === 0) return null;
      const prevRefs = Array.isArray(existing.rows[0].interaction_refs_json)
        ? existing.rows[0].interaction_refs_json
        : [];
      const nextRefs = safeRef
        ? [...prevRefs.slice(-49), { ref: safeRef, createdAt: new Date().toISOString() }]
        : prevRefs;

      const res = await pool.query(
        `UPDATE feedback_stories
         SET votes = votes + 1,
             post_decision_mentions = CASE
               WHEN status = 'Abgelehnt' THEN post_decision_mentions + 1
               ELSE post_decision_mentions
             END,
             total_duration_seconds = total_duration_seconds + $4,
             timed_mentions = timed_mentions + 1,
             interaction_refs_json = $5::jsonb,
             priority_score = $1,
             moscow = $2,
             size_estimate = $3,
             updated_at = NOW()
         WHERE id = $6 RETURNING *`,
        [recalculated.score, recalculated.moscow, recalculated.sizeEstimate, safeDur, JSON.stringify(nextRefs), id]
      );
      if (res.rowCount === 0) return null;
      await pool.query(
        `INSERT INTO story_mentions (story_id, delta, recorded_by, duration_seconds, interaction_ref, feedback_note, customer_ref, channel, client_token)
         VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, safeAuthor, safeDur, safeRef, safeNote, safeCustomer, safeChannel, safeClient]
      );
      return {
        ...res.rows[0],
        trafficLight: calculateTrafficLight(res.rows[0].due_date)
      };
    },

    async recordDecisionFeedback(id, { sentiment, comment, author, clientToken = '' }) {
      const existing = await pool.query(`SELECT * FROM feedback_stories WHERE id = $1`, [id]);
      if (existing.rowCount === 0) return null;
      const list = Array.isArray(existing.rows[0].decision_feedback_json)
        ? existing.rows[0].decision_feedback_json
        : [];
      const updatedList = comment
        ? [
            ...list.slice(-29),
            {
              sentiment,
              comment,
              author: author || '',
              clientToken: clientToken || '',
              createdAt: new Date().toISOString()
            }
          ]
        : list;

      const upInc = sentiment === 'up' ? 1 : 0;
      const downInc = sentiment === 'down' ? 1 : 0;
      const res = await pool.query(
        `UPDATE feedback_stories
         SET decision_up = decision_up + $1,
             decision_down = decision_down + $2,
             decision_feedback_json = $3::jsonb,
             updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [upInc, downInc, JSON.stringify(updatedList), id]
      );
      return {
        ...res.rows[0],
        trafficLight: calculateTrafficLight(res.rows[0].due_date)
      };
    },

    async setStoryJiraLink(id, { jiraKey, jiraUrl }) {
      const res = await pool.query(
        `UPDATE feedback_stories
         SET jira_key = $1, jira_url = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [jiraKey || '', jiraUrl || '', id]
      );
      if (res.rowCount === 0) return null;
      return {
        ...res.rows[0],
        trafficLight: calculateTrafficLight(res.rows[0].due_date)
      };
    },

    async getReportData({ from, to, status, feasibility, granularity = 'month', storyId = null } = {}) {
      const clauses = [];
      const params = [];
      const mentionDateClauses = [];

      if (from) {
        params.push(from);
        const idx = params.length;
        mentionDateClauses.push(`m.created_at >= $${idx}::date`);
      }
      if (to) {
        params.push(to);
        const idx = params.length;
        mentionDateClauses.push(`m.created_at < ($${idx}::date + INTERVAL '1 day')`);
      }

      if (from && to) {
        clauses.push(
          `((f.created_at >= $1::date AND f.created_at < ($2::date + INTERVAL '1 day')) OR COALESCE(mp.period_mentions, 0) > 0)`
        );
      } else if (from) {
        clauses.push(`(f.created_at >= $1::date OR COALESCE(mp.period_mentions, 0) > 0)`);
      } else if (to) {
        clauses.push(`(f.created_at < ($1::date + INTERVAL '1 day') OR COALESCE(mp.period_mentions, 0) > 0)`);
      }

      if (status && status !== 'Alle') {
        if (status === 'Offen') {
          clauses.push(`f.status IN ('Eingang', 'In Prüfung', 'Geprüft', 'Bereit')`);
        } else if (status === 'In Arbeit') {
          clauses.push(`f.status IN ('In Arbeit', 'Angenommen')`);
        } else {
          params.push(status);
          clauses.push(`f.status = $${params.length}`);
        }
      }
      if (feasibility && feasibility !== 'Alle') {
        params.push(feasibility);
        clauses.push(`f.feasibility = $${params.length}`);
      }

      const mentionJoinWhere = mentionDateClauses.length > 0 ? `WHERE ${mentionDateClauses.join(' AND ')}` : '';
      const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

      const storiesRes = await pool.query(
        `SELECT f.*,
                COALESCE(mp.period_mentions, f.votes)::int AS period_mentions,
                COALESCE(mp.period_duration_seconds, 0)::int AS period_duration_seconds,
                COALESCE(mp.period_timed_mentions, 0)::int AS period_timed_mentions
         FROM feedback_stories f
         LEFT JOIN (
           SELECT m.story_id,
                  SUM(m.delta)::int AS period_mentions,
                  SUM(m.duration_seconds)::int AS period_duration_seconds,
                  SUM(CASE WHEN m.duration_seconds > 0 THEN m.delta ELSE 0 END)::int AS period_timed_mentions
           FROM story_mentions m
           ${mentionJoinWhere}
           GROUP BY m.story_id
         ) mp ON mp.story_id = f.id
         ${whereSql}
         ORDER BY COALESCE(mp.period_duration_seconds, 0) DESC, COALESCE(mp.period_mentions, f.votes) DESC, f.created_at DESC`,
        params
      );

      const allowedGranularity = {
        day: { trunc: 'day', fmt: 'YYYY-MM-DD' },
        week: { trunc: 'week', fmt: 'IYYY-"KW"IW' },
        month: { trunc: 'month', fmt: 'YYYY-MM' },
        year: { trunc: 'year', fmt: 'YYYY' }
      };
      const gran = allowedGranularity[granularity] || allowedGranularity.month;

      const targetStories = storyId
        ? storiesRes.rows.filter((r) => r.id === Number(storyId))
        : storiesRes.rows;
      const storyIds = targetStories.map((r) => r.id);

      let mentionsTimeline = [];
      if (storyIds.length > 0) {
        const mParams = [storyIds];
        const mClauses = ['story_id = ANY($1::int[])'];
        if (from) {
          mParams.push(from);
          mClauses.push(`created_at >= $${mParams.length}::date`);
        }
        if (to) {
          mParams.push(to);
          mClauses.push(`created_at < ($${mParams.length}::date + INTERVAL '1 day')`);
        }
        const mRes = await pool.query(
          `SELECT TO_CHAR(DATE_TRUNC('${gran.trunc}', created_at), '${gran.fmt}') AS bucket,
                  COALESCE(SUM(delta), 0)::int AS total,
                  COALESCE(SUM(duration_seconds), 0)::int AS duration_seconds
           FROM story_mentions
           WHERE ${mClauses.join(' AND ')}
           GROUP BY 1
           ORDER BY 1 ASC`,
          mParams
        );
        mentionsTimeline = mRes.rows;
      }

      return {
        stories: storiesRes.rows,
        mentionsTimeline
      };
    },

    async updateStoryNotes(id, { internalNote, publicResponse }) {
      const res = await pool.query(
        `UPDATE feedback_stories
         SET internal_note = COALESCE($1, internal_note),
             public_response = COALESCE($2, public_response),
             updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [internalNote ?? null, publicResponse ?? null, id]
      );
      if (res.rowCount === 0) return null;
      return {
        ...res.rows[0],
        trafficLight: calculateTrafficLight(res.rows[0].due_date)
      };
    },

    async updateStoryFeasibility(id, feasibility, recalculated) {
      const res = await pool.query(
        `UPDATE feedback_stories
         SET feasibility = $1, priority_score = $2, moscow = $3, size_estimate = $4, updated_at = NOW()
         WHERE id = $5 RETURNING *`,
        [feasibility, recalculated.score, recalculated.moscow, recalculated.sizeEstimate, id]
      );
      if (res.rowCount === 0) return null;
      return {
        ...res.rows[0],
        trafficLight: calculateTrafficLight(res.rows[0].due_date)
      };
    },

    async toggleStoryTask(storyId, taskId) {
      const existing = await pool.query(`SELECT * FROM feedback_stories WHERE id = $1`, [storyId]);
      if (existing.rowCount === 0) return null;
      const tasks = Array.isArray(existing.rows[0].tasks_json) ? existing.rows[0].tasks_json : [];
      let found = false;
      const updatedTasks = tasks.map((t) => {
        if (t.id === taskId) {
          found = true;
          return { ...t, done: !t.done };
        }
        return t;
      });
      if (!found) return null;

      const res = await pool.query(
        `UPDATE feedback_stories SET tasks_json = $1::jsonb, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [JSON.stringify(updatedTasks), storyId]
      );
      return {
        ...res.rows[0],
        trafficLight: calculateTrafficLight(res.rows[0].due_date)
      };
    },

    async decideStory(storyId, { status, reason, publicResponse, internalNote, dueDate, actorRole }) {
      const existing = await pool.query(`SELECT * FROM feedback_stories WHERE id = $1`, [storyId]);
      if (existing.rowCount === 0) return null;
      const finalPublic = publicResponse || reason || '';
      const finalInternal = internalNote ?? existing.rows[0].internal_note ?? '';
      const res = await pool.query(
        `UPDATE feedback_stories
         SET status = $1,
             decision_reason = $2,
             public_response = $3,
             internal_note = $4,
             decided_at = NOW(),
             post_decision_mentions = CASE WHEN $1 = 'Abgelehnt' THEN 0 ELSE post_decision_mentions END,
             due_date = COALESCE($5, due_date),
             updated_at = NOW()
         WHERE id = $6 RETURNING *`,
        [status, finalPublic, finalPublic, finalInternal, dueDate || null, storyId]
      );
      const updated = res.rows[0];
      await pool.query(
        `INSERT INTO decision_log (entity_type, entity_id, entity_title, action, reason, actor_role)
         VALUES ('story', $1, $2, $3, $4, $5)`,
        [updated.id, updated.title, status, finalPublic, actorRole || 'Betriebsverantwortung']
      );
      return {
        ...updated,
        trafficLight: calculateTrafficLight(updated.due_date)
      };
    },

    async listDecisionLog(limit = 60) {
      const res = await pool.query(
        `SELECT * FROM decision_log ORDER BY created_at DESC, id DESC LIMIT $1`,
        [limit]
      );
      return res.rows;
    }
  };
}
