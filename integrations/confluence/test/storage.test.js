import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createConfluencePagesStore, renderConfluencePageXhtml } from '../src/confluencePagesStore.js';

function createMockConfluenceApi() {
  let seq = 1000;
  const pages = new Map([
    [
      '500',
      {
        id: '500',
        spaceId: '777',
        parentId: null,
        title: 'Requirements Board',
        version: { number: 1 },
        body: { value: '<p>Board</p>' },
        _links: { webui: '/spaces/TEAM/pages/500/Requirements+Board' }
      }
    ]
  ]);
  const props = new Map(); // pageId -> [{ id, key, value, version }]

  return {
    pages,
    async requestJson(pathStr, { method = 'GET', body } = {}) {
      if (method === 'GET' && /^\/wiki\/api\/v2\/pages\/(\d+)$/.test(pathStr)) {
        const id = pathStr.match(/\/pages\/(\d+)$/)[1];
        if (!pages.has(id)) throw new Error('404');
        return structuredClone(pages.get(id));
      }
      if (method === 'GET' && /^\/wiki\/api\/v2\/pages\/(\d+)\/children/.test(pathStr)) {
        const pid = pathStr.match(/\/pages\/(\d+)\/children/)[1];
        const results = [...pages.values()].filter((p) => p.parentId === pid);
        return { results: structuredClone(results) };
      }
      if (method === 'POST' && pathStr === '/wiki/api/v2/pages') {
        const id = String(++seq);
        const created = {
          id,
          spaceId: String(body.spaceId),
          parentId: String(body.parentId),
          title: body.title,
          version: { number: 1 },
          body: body.body,
          _links: { webui: `/spaces/TEAM/pages/${id}/${encodeURIComponent(body.title)}` }
        };
        pages.set(id, created);
        return structuredClone(created);
      }
      if (method === 'PUT' && /^\/wiki\/api\/v2\/pages\/(\d+)$/.test(pathStr)) {
        const id = pathStr.match(/\/pages\/(\d+)$/)[1];
        const cur = pages.get(id);
        const updated = { ...cur, title: body.title, body: body.body, version: body.version };
        pages.set(id, updated);
        return structuredClone(updated);
      }
      if (method === 'DELETE' && /^\/wiki\/api\/v2\/pages\/(\d+)$/.test(pathStr)) {
        const id = pathStr.match(/\/pages\/(\d+)$/)[1];
        pages.delete(id);
        props.delete(id);
        return null;
      }
      if (method === 'GET' && /^\/wiki\/api\/v2\/pages\/(\d+)\/properties/.test(pathStr)) {
        const id = pathStr.match(/\/pages\/(\d+)\/properties/)[1];
        return { results: structuredClone(props.get(id) || []) };
      }
      if (method === 'POST' && /^\/wiki\/api\/v2\/pages\/(\d+)\/properties$/.test(pathStr)) {
        const id = pathStr.match(/\/pages\/(\d+)\/properties$/)[1];
        const item = { id: `prop-${++seq}`, key: body.key, value: body.value, version: { number: 1 } };
        const arr = props.get(id) || [];
        arr.push(item);
        props.set(id, arr);
        return structuredClone(item);
      }
      if (method === 'PUT' && /^\/wiki\/api\/v2\/pages\/(\d+)\/properties\/([^/]+)$/.test(pathStr)) {
        const [, id, propId] = pathStr.match(/\/pages\/(\d+)\/properties\/([^/]+)$/);
        const arr = props.get(id) || [];
        const idx = arr.findIndex((p) => p.id === propId);
        arr[idx] = { id: propId, key: body.key, value: body.value, version: body.version };
        return structuredClone(arr[idx]);
      }
      throw new Error(`Unbekannter Mock-Pfad: ${method} ${pathStr}`);
    }
  };
}

test('Forge manifest.yml hat ZERO externe Server-Berechtigungen & echte Confluence-Seiten-Scopes', () => {
  const manifest = fs.readFileSync(path.resolve(import.meta.dirname, '..', 'manifest.yml'), 'utf8');
  assert.match(manifest, /read:page:confluence/);
  assert.match(manifest, /write:page:confluence/);
  assert.match(manifest, /delete:page:confluence/);
  assert.doesNotMatch(manifest, /external:/);
  assert.doesNotMatch(manifest, /re\.onestrand\.ch/);
  assert.doesNotMatch(manifest, /trycloudflare\.com/);
});

test('Jede Idee erzeugt echte Confluence-Unterseite, aktualisiert Version bei +1/Q&A/Relevanz & löscht sauber', async () => {
  const mock = createMockConfluenceApi();
  const store = createConfluencePagesStore(mock);
  const author = { accountId: 'acc-1', displayName: 'Alban Hyseni' };
  const other = { accountId: 'acc-2', displayName: 'Nadia Dev' };

  await assert.rejects(
    () => store.createStory({ parentPageId: '500', actor: author, payload: { title: 'Test', description: 'Test' } }),
    /mindestens 10 Zeichen/i
  );

  const created = await store.createStory({
    parentPageId: '500',
    actor: author,
    payload: {
      title: 'Retourenetikett mobil anzeigen',
      description: 'Kunden möchten das Retourenetikett direkt auf dem Smartphone vorzeigen.',
      businessValues: ['kundenaufwand', 'zeitersparnis'],
      channel: 'Telefon',
      durationSeconds: 180
    }
  });
  assert.equal(created.reqNumber, 1);
  assert.equal(created.votes, 1);
  assert.equal(created.totalDurationSeconds, 180);

  // Prüfe echte angelegte Confluence-Unterseite!
  const childPage = mock.pages.get(created.pageId);
  assert.ok(childPage, 'Echte Confluence-Unterseite muss angelegt worden sein');
  assert.equal(childPage.parentId, '500');
  assert.equal(childPage.spaceId, '777');
  assert.equal(childPage.title, '[REQ-01] Retourenetikett mobil anzeigen');
  assert.match(childPage.body.value, /Retourenetikett direkt auf dem Smartphone/);
  assert.match(childPage.body.value, /03:00/);

  // +1 aktualisiert echte Confluence-Seite inkl. Versionsnummer 2
  const voted = await store.addCaseVote({
    actor: other,
    payload: { storyId: created.pageId, durationSeconds: 120, channel: 'Chat', feedbackNote: 'Erneut gefragt' }
  });
  assert.equal(voted.votes, 2);
  assert.equal(voted.totalDurationSeconds, 300);
  assert.equal(mock.pages.get(created.pageId).version.number, 2);
  assert.match(mock.pages.get(created.pageId).body.value, /05:00/);
  assert.match(mock.pages.get(created.pageId).body.value, /Erneut gefragt/);

  // Rückfrage + Autoren-Sperre
  await store.askQuestion({ actor: other, payload: { storyId: created.pageId, body: 'Auch für Ausland?' } });
  await assert.rejects(
    () => store.replyQuestion({ actor: other, payload: { storyId: created.pageId, questionId: 1, replyBody: 'Fremd' } }),
    /Nur die Person/
  );
  await store.replyQuestion({ actor: author, payload: { storyId: created.pageId, questionId: 1, replyBody: 'Vorerst nur Schweiz.' } });
  assert.match(mock.pages.get(created.pageId).body.value, /Vorerst nur Schweiz/);

  // Relevanz-Voting mit Minderheitsstimme
  await store.voteRelevance({ actor: { accountId: 'u1', displayName: 'A' }, payload: { storyId: created.pageId, vote: 'relevant' } });
  await store.voteRelevance({ actor: { accountId: 'u2', displayName: 'B' }, payload: { storyId: created.pageId, vote: 'relevant' } });
  await store.voteRelevance({ actor: { accountId: 'u3', displayName: 'C' }, payload: { storyId: created.pageId, vote: 'relevant' } });
  const withMin = await store.voteRelevance({ actor: { accountId: 'u4', displayName: 'D' }, payload: { storyId: created.pageId, vote: 'irrelevant' } });
  assert.deepEqual(withMin.minorityHint, { side: 'irrelevant', voters: ['D'] });

  // Board liest direkt aus den Confluence-Unterseiten
  const board = await store.getBoard({ parentPageId: '500', spaceKey: 'TEAM', actor: author });
  assert.equal(board.summary.totalStories, 1);
  assert.equal(board.summary.totalMentions, 2);
  assert.equal(board.summary.totalSeconds, 300);
  assert.match(store.buildCsv(board.stories), /REQ-01/);

  // Papierkorb entfernt Unterseite
  await store.deleteStory({ payload: { storyId: created.pageId } });
  assert.equal(mock.pages.has(created.pageId), false);
});

test('renderConfluencePageXhtml erzeugt sauberes, XML-escaped Confluence-HTML', () => {
  const html = renderConfluencePageXhtml({
    title: 'A & B',
    description: 'Prüfe <script> & "Zeichen"',
    authorName: 'Alban',
    mentions: [{ createdAt: '2026-11-28', durationSeconds: 90, feedbackNote: 'OK' }]
  });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /01:30/);
});
