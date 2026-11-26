import { createApp } from './app.js';
import { createSessionSecret } from './auth.js';
import { createPool, createPostgresStore, initDatabase } from './db.js';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

async function waitForDatabase(pool, maxRetries = 20, delayMs = 1500) {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      console.log(`[Startup] Warte auf PostgreSQL (Versuch ${attempt}/${maxRetries}): ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('PostgreSQL konnte nach mehreren Versuchen nicht erreicht werden.');
}

async function start() {
  const pool = createPool();
  await waitForDatabase(pool);
  await initDatabase(pool);

  const store = createPostgresStore(pool);

  // Persistentes Session-Signing-Secret in PostgreSQL app_meta, damit Logins Container-Neustarts & Auto-Deploys überstehen
  let sessionSecret = String(process.env.SESSION_SECRET || '').trim();
  if (sessionSecret.length < 16) {
    sessionSecret = await store.getSetting('session_secret', '');
    if (sessionSecret.length < 16) {
      sessionSecret = createSessionSecret();
      await store.setSetting('session_secret', sessionSecret);
    }
  }

  const app = createApp({ store, sessionSecret });

  const server = app.listen(PORT, HOST, () => {
    console.log(
      `[Requirements Engine] läuft auf http://${HOST}:${PORT} (Version: ${process.env.APP_VERSION || '1.0.0-dev'}, Commit: ${process.env.GIT_SHA || 'local'})`
    );
  });

  const shutdown = async (signal) => {
    console.log(`[Shutdown] Signal ${signal} empfangen — beende sauber...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('[Fatal]', err);
  process.exit(1);
});
