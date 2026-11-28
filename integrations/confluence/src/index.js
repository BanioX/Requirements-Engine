import Resolver from '@forge/resolver';
import api, { assumeTrustedRoute, route } from '@forge/api';
import { createConfluencePagesStore } from './confluencePagesStore.js';

const resolver = new Resolver();

function createConfluenceClient() {
  return {
    async requestJson(pathStr, { method = 'GET', body } = {}) {
      const opts = {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {})
      };
      const res = await api.asUser().requestConfluence(assumeTrustedRoute(pathStr), opts);
      if (res.status === 204) return null;
      const text = await res.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = { raw: text };
      }
      if (!res.ok) {
        const msg = parsed?.errors?.[0]?.title || parsed?.message || `Confluence API HTTP ${res.status}`;
        throw new Error(msg);
      }
      return parsed;
    }
  };
}

const store = createConfluencePagesStore(createConfluenceClient());

async function resolveContext(req) {
  const ctx = req.context || {};
  const ext = ctx.extension || {};
  const parentPageId = ext.content?.id ? String(ext.content.id) : '';
  const spaceKey = ext.space?.key || 'Confluence';
  const accountId = ctx.accountId || 'confluence-user';

  if (!parentPageId) {
    throw new Error('Bitte speichere/veröffentliche die Confluence-Seite zuerst, damit Unterseiten angelegt werden können.');
  }

  let displayName = 'Confluence-Nutzer';
  try {
    const res = await api.asUser().requestConfluence(route`/wiki/rest/api/user/current`);
    if (res.ok) {
      const me = await res.json();
      displayName = me.displayName || me.publicName || displayName;
    }
  } catch {
    // Fallback ohne Abbruch
  }

  return {
    parentPageId,
    spaceKey,
    actor: { accountId, displayName }
  };
}

resolver.define('getBoard', async (req) => {
  const { parentPageId, spaceKey, actor } = await resolveContext(req);
  return store.getBoard({ parentPageId, spaceKey, actor });
});

resolver.define('createStory', async (req) => {
  const { parentPageId, actor } = await resolveContext(req);
  const story = await store.createStory({ parentPageId, actor, payload: req.payload });
  return { ok: true, story };
});

resolver.define('addCaseVote', async (req) => {
  const { actor } = await resolveContext(req);
  const story = await store.addCaseVote({ actor, payload: req.payload });
  return { ok: true, story };
});

resolver.define('updateStoryMeta', async (req) => {
  const { actor } = await resolveContext(req);
  const story = await store.updateStoryMeta({ actor, payload: req.payload });
  return { ok: true, story };
});

resolver.define('askQuestion', async (req) => {
  const { actor } = await resolveContext(req);
  const story = await store.askQuestion({ actor, payload: req.payload });
  return { ok: true, story };
});

resolver.define('replyQuestion', async (req) => {
  const { actor } = await resolveContext(req);
  const story = await store.replyQuestion({ actor, payload: req.payload });
  return { ok: true, story };
});

resolver.define('voteRelevance', async (req) => {
  const { actor } = await resolveContext(req);
  const story = await store.voteRelevance({ actor, payload: req.payload });
  return { ok: true, story };
});

resolver.define('deleteStory', async (req) => {
  await resolveContext(req);
  return store.deleteStory({ payload: req.payload });
});

resolver.define('exportCsv', async (req) => {
  const { parentPageId, spaceKey, actor } = await resolveContext(req);
  const board = await store.getBoard({ parentPageId, spaceKey, actor });
  return { csv: store.buildCsv(board.stories) };
});

export const handler = resolver.getDefinitions();
