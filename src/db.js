import pg from 'pg';
import { calculateTrafficLight } from './engine/exporters.js';

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
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'E-Mail';
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS feasibility TEXT NOT NULL DEFAULT 'mittel';
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS public_response TEXT NOT NULL DEFAULT '';
    ALTER TABLE feedback_stories ADD COLUMN IF NOT EXISTS internal_note TEXT NOT NULL DEFAULT '';

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
}

export function createPostgresStore(pool) {
  return {
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
        `SELECT f.*, p.title AS process_title
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
      const res = await pool.query(
        `INSERT INTO feedback_stories
         (process_id, origin, channel, feasibility, source_role, feedback_type, urgency, raw_feedback, title, user_story, req_type, moscow, size_estimate, priority_score, votes, tasks_json, acceptance_criteria_json, status, due_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,1,$15::jsonb,$16::jsonb,'Eingang',$17)
         RETURNING *`,
        [
          payload.processId || null,
          payload.origin || 'kunde',
          payload.channel || 'E-Mail',
          payload.feasibility || 'mittel',
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
          JSON.stringify(payload.tasks),
          JSON.stringify(payload.acceptanceCriteria),
          payload.dueDate || null
        ]
      );
      const created = res.rows[0];
      await pool.query(
        `INSERT INTO decision_log (entity_type, entity_id, entity_title, action, reason, actor_role)
         VALUES ('story', $1, $2, 'Eingegangenes Feedback', $3, $4)`,
        [
          created.id,
          created.title,
          `Eingegangen via ${created.channel} — automatisch als User Story (${created.moscow}, Machbarkeit: ${created.feasibility}) aufbereitet.`,
          created.source_role
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

    async upvoteStory(id, recalculated) {
      const res = await pool.query(
        `UPDATE feedback_stories
         SET votes = votes + 1, priority_score = $1, moscow = $2, size_estimate = $3, updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [recalculated.score, recalculated.moscow, recalculated.sizeEstimate, id]
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
