import pg from 'pg';
import { calculateTrafficLight } from './engine/exporters.js';

const { Pool } = pg;

function buildDemoSvgDataUrl() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="440" viewBox="0 0 800 440">
    <rect width="800" height="440" fill="#0f172a"/>
    <rect x="0" y="0" width="800" height="52" fill="#1e293b"/>
    <text x="24" y="32" fill="#e2e8f0" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="600">eBanking Admin-Portal — Kontosicherheit &amp; Support</text>
    <rect x="24" y="76" width="210" height="336" rx="10" fill="#1e293b" stroke="#334155"/>
    <text x="42" y="110" fill="#94a3b8" font-family="Segoe UI, Arial, sans-serif" font-size="13">NAVIGATION</text>
    <rect x="36" y="126" width="186" height="36" rx="6" fill="#0f766e"/>
    <text x="50" y="149" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="600">Kontosperren &amp; PIN</text>
    <text x="50" y="192" fill="#cbd5e1" font-family="Segoe UI, Arial, sans-serif" font-size="14">TWINT-Limiten</text>
    <text x="50" y="226" fill="#cbd5e1" font-family="Segoe UI, Arial, sans-serif" font-size="14">Zertifikate &amp; Wartung</text>
    <text x="50" y="260" fill="#cbd5e1" font-family="Segoe UI, Arial, sans-serif" font-size="14">Audit-Protokoll</text>
    <rect x="256" y="76" width="520" height="336" rx="10" fill="#1e293b" stroke="#334155"/>
    <text x="280" y="114" fill="#f8fafc" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="600">Vertrag #EB-DEMO-4821 — Status: Gesperrt (3x Fehl-PIN)</text>
    <rect x="280" y="136" width="472" height="58" rx="8" fill="#3b1d2a" stroke="#be123c"/>
    <text x="298" y="162" fill="#fecdd3" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="600">Sicherheitsprüfung erforderlich vor Entsperrung</text>
    <text x="298" y="182" fill="#fda4af" font-family="Segoe UI, Arial, sans-serif" font-size="12">Identität telefonisch mittels 2-Faktor-Rückruf verifizieren (keine Ausnahmen).</text>
    <rect x="280" y="218" width="224" height="44" rx="8" fill="#0d9488"/>
    <text x="312" y="245" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="600">Rückruf-Code prüfen</text>
    <rect x="524" y="218" width="228" height="44" rx="8" fill="#2563eb"/>
    <text x="562" y="245" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="600">Login entsperren</text>
    <rect x="280" y="290" width="472" height="96" rx="8" fill="#0f172a" stroke="#334155"/>
    <text x="298" y="318" fill="#94a3b8" font-family="Segoe UI, Arial, sans-serif" font-size="12">LETZTE EREIGNISSE (DEMO-DATEN)</text>
    <text x="298" y="344" fill="#cbd5e1" font-family="Segoe UI, Arial, sans-serif" font-size="13">• 08:14 Mobile-App Fehl-PIN (Versuch 3/3) → Automatische Sperre</text>
    <text x="298" y="368" fill="#cbd5e1" font-family="Segoe UI, Arial, sans-serif" font-size="13">• 08:21 Ticket im eBanking-Support eröffnet</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

export function createPool() {
  if (process.env.DATABASE_URL) {
    return new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return new Pool({
    host: process.env.POSTGRES_HOST || 'db',
    port: Number(process.env.POSTGRES_PORT || 5432),
    database: process.env.POSTGRES_DB || 'reqengine',
    user: process.env.POSTGRES_USER || 'reqengine',
    password: process.env.POSTGRES_PASSWORD
  });
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

  const seededCheck = await pool.query(`SELECT value FROM app_meta WHERE key = 'seeded'`);
  if (seededCheck.rowCount === 0) {
    await seedInitialDemoData(pool);
  }
}

async function seedInitialDemoData(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const now = new Date();
    const demoImg = buildDemoSvgDataUrl();

    // Prozess 1: eBanking (Bald prüfen — Gelb)
    const p1 = await client.query(
      `INSERT INTO processes (title, category, owner_role, summary, review_interval_days, next_review_at, version_nr)
       VALUES ($1, $2, $3, $4, $5, $6, 2) RETURNING id`,
      [
        'Mobile-Banking Login-Sperre prüfen & sicher entsperren',
        'eBanking-Support',
        'eBanking-Support',
        'Standard-Klick-Anleitung für gesperrte Mobile-Banking-Zugänge nach 3 fehlgeschlagenen PIN-Eingaben (anonymisierte Demo-Abläufe).',
        90,
        addDays(now, 8)
      ]
    );
    const p1Id = p1.rows[0].id;

    await client.query(
      `INSERT INTO process_steps (process_id, step_order, action_title, ui_target, details, hint_type, screenshot_data, markers_json)
       VALUES
       ($1, 1, 'Vertrag im Admin-Portal öffnen & Rückruf-Code prüfen', 'Admin-Portal → Kontosperren & PIN', 'Kundenidentität zwingend über registrierte Telefonnummer verifizieren, bevor eine Entsperrung ausgelöst wird.', 'warn', $2, $3::jsonb),
       ($1, 2, 'Sperrgrund im Ereignis-Protokoll gegenprüfen', 'Vertragsansicht → Letzte Ereignisse', 'Prüfen, ob nur Fehl-PIN vorliegt oder verdächtige Ausland-Logins sichtbar sind (bei Verdacht an Fraud-Team eskalieren).', 'info', NULL, '[]'::jsonb),
       ($1, 3, 'Entsperrung auslösen & Test-Login begleiten', 'Schaltfläche «Login entsperren»', 'Kundschaft im Telefonat kurz testen lassen, ob das Mobile Banking wieder sauber startet und keine alte App-Version blockiert.', 'tip', NULL, '[]'::jsonb)`,
      [
        p1Id,
        demoImg,
        JSON.stringify([
          { x: 16, y: 33, label: 'Kontosperren öffnen' },
          { x: 49, y: 54, label: 'Rückruf-Code prüfen' },
          { x: 79, y: 54, label: 'Login entsperren' }
        ])
      ]
    );

    // Prozess 2: IT-Betrieb / eBanking Wartung (Überfällig — Rot!)
    const p2 = await client.query(
      `INSERT INTO processes (title, category, owner_role, summary, review_interval_days, next_review_at, version_nr)
       VALUES ($1, $2, $3, $4, $5, $6, 1) RETURNING id`,
      [
        'eBanking-Zertifikats- & Backup-Restore-Kontrolle',
        'IT-Betrieb',
        'IT-Betrieb',
        'Quartalsweise Prüfung aller TLS-Zertifikate, Healthchecks und einer echten Backup-Wiederherstellung in der Testumgebung.',
        90,
        addDays(now, -3)
      ]
    );
    const p2Id = p2.rows[0].id;

    await client.query(
      `INSERT INTO process_steps (process_id, step_order, action_title, ui_target, details, hint_type)
       VALUES
       ($1, 1, 'Ablaufdaten aller produktiven Zertifikate prüfen', 'Monitoring → Zertifikate', 'Alle Zertifikate mit Restlaufzeit unter 30 Tagen sofort zur Erneuerung einplanen.', 'warn'),
       ($1, 2, 'Datenbank-Dump in isolierte Test-Instanz einspielen', 'Docker Test-Stack → pg_restore', 'Verifizieren, dass die Tabellen vollständig geladen werden und /health HTTP 200 liefert.', 'info'),
       ($1, 3, 'Prüfresultat mit Datum im Audit-Protokoll abhaken', 'Requirements Engine → Als aktuell bestätigen', 'Durch den Klick wird automatisch das nächste Quartals-Review berechnet.', 'tip')`,
      [p2Id]
    );

    // Prozess 3: Branchenneutrales KMU-Beispiel (Aktuell — Grün)
    const p3 = await client.query(
      `INSERT INTO processes (title, category, owner_role, summary, review_interval_days, next_review_at, version_nr)
       VALUES ($1, $2, $3, $4, $5, $6, 1) RETURNING id`,
      [
        'Monatsabschluss-Belege prüfen & freigeben (KMU-Standard)',
        'Buchhaltung',
        'Buchhaltung',
        'Branchenneutraler Ablauf zur strukturierten Prüfung offener Kreditoren und Fristen vor Monatsende.',
        180,
        addDays(now, 64)
      ]
    );
    const p3Id = p3.rows[0].id;

    await client.query(
      `INSERT INTO process_steps (process_id, step_order, action_title, ui_target, details, hint_type)
       VALUES
       ($1, 1, 'Offene Posten nach Fälligkeit sortieren', 'ERP → Kreditoren → Offene Posten', 'Alle Belege mit Fälligkeit innerhalb der nächsten 10 Tage markieren.', 'info'),
       ($1, 2, 'Vier-Augen-Freigabe über CHF 5000 einholen', 'Freigabe-Workflow → Stellvertretung', 'Bei Abwesenheit der Leitung greift automatisch die hinterlegte Stellvertretung.', 'warn')`,
      [p3Id]
    );

    // Demo-Stories (anonymisierte eBanking- & KMU-Beispiele)
    const s1 = await client.query(
      `INSERT INTO feedback_stories
       (process_id, source_role, feedback_type, urgency, raw_feedback, title, user_story, req_type, moscow, size_estimate, priority_score, votes, tasks_json, acceptance_criteria_json, status, decision_reason, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15,$16,$17) RETURNING id`,
      [
        p1Id,
        'Mobile-Banking-Kundschaft',
        'kunden_aerger',
        'kritisch',
        'Kunden im Mobile Banking beschweren sich dauernd, dass nach 3 falschen PIN-Eingaben nur ein kryptischer Fehlercode erscheint und sie 15 Minuten in der Hotline warten müssen, weil kein geführter Self-Service-Hinweis angezeigt wird.',
        'Klare Fehlermeldung & geführter Hinweis bei Mobile-Banking PIN-Sperre',
        'Als Mobile-Banking-Kundschaft möchte ich eine klare und geführte Lösung für das Problem «nach 3 falschen PIN-Eingaben erscheint nur ein kryptischer Fehlercode» bereitstellen, damit Risiken und Reibung vermieden werden (Auslöser: kein geführter Self-Service-Hinweis vorhanden).',
        'NFA: Sicherheit & Compliance',
        'Must',
        'M',
        95,
        7,
        JSON.stringify([
          { id: 'T1', title: 'Fehlermeldungstexte im Mobile Banking verständlich formulieren (DE/FR/IT)', estimateHours: 2, done: true },
          { id: 'T2', title: 'Sicherheits- und Missbrauchsprüfung für Self-Service-Hinweis durchführen', estimateHours: 3, done: false },
          { id: 'T3', title: 'Abnahmetest durchführen & Support-Klick-Anleitung aktualisieren', estimateHours: 1.5, done: false }
        ]),
        JSON.stringify([
          'Gegeben 3 fehlgeschlagene PIN-Eingaben im Mobile Banking, wenn die Sperre greift, dann erscheint innert < 2 Sekunden eine verständliche Meldung mit klarem Entsperr-Weg.',
          'Gegeben ein Sicherheits-Review, wenn die neue Meldung live geht, dann werden keine sensiblen Kontodetails preisgegeben.'
        ]),
        'Angenommen',
        'Hohes Anrufvolumen im eBanking-Support (über 40 Tickets/Woche). Für nächsten Release priorisiert.',
        addDays(now, 10)
      ]
    );

    const s2 = await client.query(
      `INSERT INTO feedback_stories
       (process_id, source_role, feedback_type, urgency, raw_feedback, title, user_story, req_type, moscow, size_estimate, priority_score, votes, tasks_json, acceptance_criteria_json, status, decision_reason, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15,$16,$17) RETURNING id`,
      [
        null,
        'eBanking-Support',
        'prozess_engpass',
        'hoch',
        'Beim Erhöhen von TWINT-Tageslimiten müssen wir aktuell zwischen 3 Masken wechseln sowie die Änderung zusätzlich manuell im Ticket protokollieren, weil kein 1-Klick-Audit-Export existiert.',
        'TWINT-Limit-Anpassung mit automatischem Audit-Eintrag vereinfachen',
        'Als eBanking-Support möchte ich den Ablauf «beim Erhöhen von TWINT-Tageslimiten zwischen 3 Masken wechseln» vereinfachen und automatisieren, damit Risiken und Reibung vermieden werden (Auslöser: kein 1-Klick-Audit-Export existiert).',
        'FA: Funktionale Anforderung',
        'Should',
        'M',
        68,
        4,
        JSON.stringify([
          { id: 'T1', title: 'Masken-Ablauf mit Support-Team konsolidieren', estimateHours: 2, done: false },
          { id: 'T2', title: 'Export-Funktion & automatische Protokollierung implementieren', estimateHours: 2.5, done: false },
          { id: 'T3', title: 'Abnahmetest durchführen & Klick-Anleitung ergänzen', estimateHours: 1.5, done: false }
        ]),
        JSON.stringify([
          'Gegeben eine berechtigte Person im eBanking-Support, wenn eine TWINT-Limit-Änderung gespeichert wird, dann wird der Audit-Eintrag automatisch erstellt.',
          'Gegeben ein Export-Wunsch, wenn CSV/Markdown erzeugt wird, dann sind Zeitstempel und Begründung vollständig enthalten.'
        ]),
        'Bereit',
        'Fachlich vorgeprüft — bereit für den nächsten Sprint-Entscheid.',
        addDays(now, 21)
      ]
    );

    await client.query(
      `INSERT INTO decision_log (entity_type, entity_id, entity_title, action, reason, actor_role)
       VALUES
       ('story', $1, 'Klare Fehlermeldung & geführter Hinweis bei Mobile-Banking PIN-Sperre', 'Angenommen', 'Hohes Anrufvolumen im eBanking-Support (über 40 Tickets/Woche). Für nächsten Release priorisiert.', 'Product Owner / Betrieb'),
       ('story', $2, 'TWINT-Limit-Anpassung mit automatischem Audit-Eintrag vereinfachen', 'Bereit', 'Aufwand geschätzt und Akzeptanzkriterien geschärft; Entscheid im kommenden Steuerungsausschuss.', 'Requirements Engineering'),
       ('process', $3, 'Mobile-Banking Login-Sperre prüfen & sicher entsperren', 'Review geplant', 'Klick-Anleitung v2 mit Screenshot-Markern hinterlegt; nächstes Review in 8 Tagen fällig.', 'eBanking-Support')`,
      [s1.rows[0].id, s2.rows[0].id, p1Id]
    );

    await client.query(`INSERT INTO app_meta (key, value) VALUES ('seeded', 'true')`);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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

    async listStories({ status, moscow, q } = {}) {
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
      const res = await pool.query(
        `SELECT f.*, p.title AS process_title
         FROM feedback_stories f
         LEFT JOIN processes p ON p.id = f.process_id
         ${whereSql}
         ORDER BY f.priority_score DESC, f.created_at DESC`,
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
         (process_id, source_role, feedback_type, urgency, raw_feedback, title, user_story, req_type, moscow, size_estimate, priority_score, votes, tasks_json, acceptance_criteria_json, status, due_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,1,$12::jsonb,$13::jsonb,'Eingang',$14)
         RETURNING *`,
        [
          payload.processId || null,
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
         VALUES ('story', $1, $2, 'Automatisch erfasst', $3, $4)`,
        [
          created.id,
          created.title,
          `Feedback automatisch in User Story (${created.moscow}, Grösse ${created.size_estimate}, ${payload.tasks.length} Tasks) übersetzt.`,
          created.source_role
        ]
      );
      return {
        ...created,
        trafficLight: calculateTrafficLight(created.due_date)
      };
    },

    async upvoteStory(id, recalculated) {
      const res = await pool.query(
        `UPDATE feedback_stories
         SET votes = votes + 1, priority_score = $1, moscow = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [recalculated.score, recalculated.moscow, id]
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

    async decideStory(storyId, { status, reason, dueDate, actorRole }) {
      const existing = await pool.query(`SELECT * FROM feedback_stories WHERE id = $1`, [storyId]);
      if (existing.rowCount === 0) return null;
      const res = await pool.query(
        `UPDATE feedback_stories
         SET status = $1, decision_reason = $2, due_date = COALESCE($3, due_date), updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [status, reason, dueDate || null, storyId]
      );
      const updated = res.rows[0];
      await pool.query(
        `INSERT INTO decision_log (entity_type, entity_id, entity_title, action, reason, actor_role)
         VALUES ('story', $1, $2, $3, $4, $5)`,
        [updated.id, updated.title, status, reason, actorRole || 'Betriebsverantwortung']
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
