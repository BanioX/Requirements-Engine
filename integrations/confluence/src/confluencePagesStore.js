/**
 * 100 % nativer Confluence-Seiten-Speicher für ONESTRAND · Requirements Engine.
 *
 * Funktionsprinzip ("Runs on Atlassian" — 0 externe Server):
 * - Jeder erfasste Eintrag wird direkt als ECHTE, sichtbare Confluence-Unterseite
 *   unterhalb der aktuellen Board-Seite erstellt (Confluence REST API v2).
 * - Der lesbare Seiteninhalt (Confluence Storage XHTML) enthält Übersichtstabelle,
 *   Beschrieb, Einzelfälle (+1 mit MM:SS), Rückfragen und Relevanz-Protokoll.
 *   Selbst wenn das Addon deinstalliert wird, bleiben alle Einträge als normale Seiten erhalten!
 * - Die strukturierten JSON-Daten hängen als Confluence Page Property ("onestrand_req_v1")
 *   direkt an derselben Unterseite — damit bleiben Board, Summen und CSV immer 1:1 synchron.
 */

const PROP_KEY = 'onestrand_req_v1';
const ALLOWED_CHANNELS = new Set(['', 'Persönlich', 'Telefon', 'Chat', 'E-Mail']);
const ALLOWED_VALUES = new Set(['zeitersparnis', 'kundenaufwand', 'erklaerung', 'fehler', 'umsatz', 'bindung']);
const ALLOWED_FEASIBILITY = new Set(['unbewertet', 'einfach', 'mittel', 'aufwaendig']);
const ALLOWED_STATUSES = new Set(['Eingang', 'In Prüfung', 'In Arbeit', 'Umgesetzt', 'Abgelehnt']);

const VALUE_LABELS = {
  zeitersparnis: 'Effizienz',
  kundenaufwand: 'Kundenerlebnis',
  erklaerung: 'Klarheit',
  fehler: 'Qualität',
  umsatz: 'Umsatz',
  bindung: 'Kundenbindung'
};

function cleanText(raw, maxLen = 2000) {
  return String(raw || '').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

function escXml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function parseDurationSeconds(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.min(28800, Math.round(raw)));
  }
  const txt = String(raw || '').trim();
  if (!txt) return 0;
  if (txt.includes(':')) {
    const [mStr, sStr] = txt.split(':');
    const m = Math.max(0, Math.min(480, parseInt(mStr || '0', 10) || 0));
    const s = Math.max(0, Math.min(59, parseInt(sStr || '0', 10) || 0));
    return m * 60 + s;
  }
  const mins = parseInt(txt, 10);
  if (!Number.isFinite(mins) || mins <= 0) return 0;
  return Math.min(480, mins) * 60;
}

export function formatDurationMMSS(totalSec) {
  const sec = Math.max(0, Math.round(Number(totalSec) || 0));
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function computeMajorityWarning(relevanceVotes = []) {
  const up = relevanceVotes.filter((v) => v.vote === 'relevant');
  const down = relevanceVotes.filter((v) => v.vote === 'irrelevant');
  let minority = null;
  if (up.length >= 3 && down.length >= 1 && down.length <= 2) {
    minority = { side: 'irrelevant', voters: down.map((v) => v.voterName) };
  } else if (down.length >= 3 && up.length >= 1 && up.length <= 2) {
    minority = { side: 'relevant', voters: up.map((v) => v.voterName) };
  }
  return { relevantCount: up.length, irrelevantCount: down.length, minority };
}

export function enrichStory(story) {
  const mentions = Array.isArray(story.mentions) ? story.mentions : [];
  const totalDurationSeconds = mentions.reduce((sum, m) => sum + (Number(m.durationSeconds) || 0), 0);
  const rel = computeMajorityWarning(story.relevanceVotes || []);
  return {
    ...story,
    votes: Math.max(1, mentions.length),
    totalDurationSeconds,
    relevantCount: rel.relevantCount,
    irrelevantCount: rel.irrelevantCount,
    minorityHint: rel.minority
  };
}

/**
 * Erzeugt sauberes Confluence Storage XHTML für die sichtbare Unterseite.
 * Bleibt auch ohne Addon vollständig lesbar und durchsuchbar!
 */
export function renderConfluencePageXhtml(rawStory) {
  const s = enrichStory(rawStory);
  const valuesText = (s.businessValues || []).map((v) => VALUE_LABELS[v] || v).join(', ') || '–';
  const mentionsRows = (s.mentions || [])
    .map(
      (m) =>
        `<tr><td>${escXml(String(m.createdAt || '').slice(0, 10))}</td><td>${escXml(m.recordedBy || s.authorName)}</td><td>${escXml(
          formatDurationMMSS(m.durationSeconds || 0)
        )}</td><td>${escXml(m.channel || '–')}</td><td>${escXml(m.feedbackNote || '–')}</td></tr>`
    )
    .join('');

  const qaRows = (s.questions || [])
    .map(
      (q) =>
        `<li><p><strong>${escXml(q.askedBy)}:</strong> ${escXml(q.body)}</p>${
          q.replyBody ? `<p><strong>Antwort (${escXml(s.authorName)}):</strong> ${escXml(q.replyBody)}</p>` : ''
        }</li>`
    )
    .join('');

  const relText = `Relevant: ${s.relevantCount} · Irrelevant: ${s.irrelevantCount}${
    s.minorityHint ? ` (Minderheitsstimme: ${s.minorityHint.voters.join(', ')})` : ''
  }`;

  return [
    `<p><em>Erfasst mit ONESTRAND · Requirements Engine (100 % nativ in Confluence gespeichert — kein externer Server).</em></p>`,
    `<table><tbody>`,
    `<tr><th>Status</th><td>${escXml(s.status || 'Eingang')}</td><th>Aufwand</th><td>${escXml(s.feasibility || 'unbewertet')}</td></tr>`,
    `<tr><th>Meldungen</th><td>${s.votes}×</td><th>Erfasste Zeit</th><td>${escXml(formatDurationMMSS(s.totalDurationSeconds))}</td></tr>`,
    `<tr><th>Erfasst von</th><td>${escXml(s.authorName || '–')}</td><th>Kanal / Ref.</th><td>${escXml(s.channel || '–')} ${
      s.refId ? `(#${escXml(s.refId)})` : ''
    }</td></tr>`,
    `<tr><th>Mehrwert</th><td colspan="3">${escXml(valuesText)}</td></tr>`,
    `<tr><th>Relevanz-Voting</th><td colspan="3">${escXml(relText)}</td></tr>`,
    `</tbody></table>`,
    `<h2>Beschrieb</h2>`,
    `<p>${escXml(s.description)}</p>`,
    s.decisionReason ? `<h2>Entscheid &amp; Begründung</h2><p>${escXml(s.decisionReason)}</p>` : '',
    s.internalNote ? `<h2>Fachnotiz</h2><p>${escXml(s.internalNote)}</p>` : '',
    `<h2>Einzelfälle (${(s.mentions || []).length})</h2>`,
    `<table><thead><tr><th>Datum</th><th>Erfasst von</th><th>Dauer</th><th>Kanal</th><th>Rückmeldung</th></tr></thead><tbody>${mentionsRows}</tbody></table>`,
    qaRows ? `<h2>Rückfragen &amp; Antworten</h2><ul>${qaRows}</ul>` : ''
  ]
    .filter(Boolean)
    .join('');
}

export function buildChildPageTitle(reqNumber, title) {
  const num = String(reqNumber).padStart(2, '0');
  return `[REQ-${num}] ${title}`.slice(0, 240);
}

/**
 * Erstellt den Confluence-Seiten-Store auf Basis eines injizierbaren HTTP-Clients
 * (in Produktion: api.asUser().requestConfluence, im Test: In-Memory-Mock).
 */
export function createConfluencePagesStore({ requestJson }) {
  async function getParentPageInfo(parentPageId) {
    const page = await requestJson(`/wiki/api/v2/pages/${encodeURIComponent(parentPageId)}`);
    if (!page || !page.spaceId) {
      throw new Error('Übergeordnete Confluence-Seite konnte nicht gelesen werden.');
    }
    return {
      pageId: String(page.id),
      spaceId: String(page.spaceId),
      title: page.title || 'Requirements Board'
    };
  }

  async function readPageProperty(pageId) {
    const res = await requestJson(`/wiki/api/v2/pages/${encodeURIComponent(pageId)}/properties?key=${PROP_KEY}`);
    const list = Array.isArray(res?.results) ? res.results : [];
    return list.find((p) => p.key === PROP_KEY) || null;
  }

  async function writePageProperty(pageId, storyObj, existingProp = null) {
    if (existingProp && existingProp.id) {
      const nextVer = (Number(existingProp.version?.number) || 1) + 1;
      return requestJson(`/wiki/api/v2/pages/${encodeURIComponent(pageId)}/properties/${encodeURIComponent(existingProp.id)}`, {
        method: 'PUT',
        body: {
          key: PROP_KEY,
          value: storyObj,
          version: { number: nextVer, message: 'Requirements Engine Aktualisierung' }
        }
      });
    }
    return requestJson(`/wiki/api/v2/pages/${encodeURIComponent(pageId)}/properties`, {
      method: 'POST',
      body: {
        key: PROP_KEY,
        value: storyObj
      }
    });
  }

  async function syncChildPage(pageId, storyObj, versionMessage = 'Requirements Engine Update') {
    const [currentPage, existingProp] = await Promise.all([
      requestJson(`/wiki/api/v2/pages/${encodeURIComponent(pageId)}`),
      readPageProperty(pageId)
    ]);
    const nextPageVersion = (Number(currentPage?.version?.number) || 1) + 1;
    const pageTitle = buildChildPageTitle(storyObj.reqNumber || storyObj.id, storyObj.title);
    const updatedPage = await requestJson(`/wiki/api/v2/pages/${encodeURIComponent(pageId)}`, {
      method: 'PUT',
      body: {
        id: String(pageId),
        status: 'current',
        title: pageTitle,
        body: {
          representation: 'storage',
          value: renderConfluencePageXhtml(storyObj)
        },
        version: {
          number: nextPageVersion,
          message: versionMessage
        }
      }
    });
    const enriched = {
      ...storyObj,
      pageId: String(pageId),
      webUiPath: updatedPage?._links?.webui || storyObj.webUiPath || ''
    };
    await writePageProperty(pageId, enriched, existingProp);
    return enrichStory(enriched);
  }

  async function listStoriesUnderParent(parentPageId) {
    const childrenRes = await requestJson(`/wiki/api/v2/pages/${encodeURIComponent(parentPageId)}/children?limit=100`);
    const childPages = Array.isArray(childrenRes?.results) ? childrenRes.results : [];
    const loaded = await Promise.all(
      childPages.map(async (cp) => {
        try {
          const prop = await readPageProperty(cp.id);
          if (!prop || !prop.value || !prop.value.title) return null;
          return enrichStory({
            ...prop.value,
            id: String(cp.id),
            pageId: String(cp.id),
            webUiPath: cp._links?.webui || prop.value.webUiPath || `/wiki/pages/viewpage.action?pageId=${cp.id}`
          });
        } catch {
          return null;
        }
      })
    );
    return loaded.filter(Boolean);
  }

  async function getBoard({ parentPageId, spaceKey, actor }) {
    const stories = (await listStoriesUnderParent(parentPageId)).sort(
      (a, b) => b.votes - a.votes || b.totalDurationSeconds - a.totalDurationSeconds || (b.reqNumber || 0) - (a.reqNumber || 0)
    );
    const totalMentions = stories.reduce((sum, s) => sum + s.votes, 0);
    const totalSeconds = stories.reduce((sum, s) => sum + s.totalDurationSeconds, 0);
    const doneStories = stories.filter((s) => s.status === 'Umgesetzt');
    const savedSeconds = doneStories.reduce((sum, s) => sum + s.totalDurationSeconds, 0);

    return {
      parentPageId: String(parentPageId),
      spaceKey: spaceKey || 'Confluence',
      storageMode: 'Echte Confluence-Unterseiten (0 externe Server)',
      actor,
      summary: {
        totalStories: stories.length,
        totalMentions,
        totalSeconds,
        implementedCount: doneStories.length,
        savedSeconds
      },
      stories
    };
  }

  async function createStory({ parentPageId, actor, payload }) {
    const title = cleanText(payload?.title, 140);
    const description = cleanText(payload?.description, 2000);
    if (title.length < 3) {
      throw new Error('Bitte gib einen Titel mit mindestens 3 Zeichen ein.');
    }
    if (description.length < 10) {
      throw new Error('Beschrieb zu kurz: Mindestens 10 Zeichen erforderlich.');
    }

    const [parentInfo, existingStories] = await Promise.all([
      getParentPageInfo(parentPageId),
      listStoriesUnderParent(parentPageId)
    ]);

    const nextReqNum = existingStories.reduce((max, s) => Math.max(max, Number(s.reqNumber) || 0), 0) + 1;
    const channel = ALLOWED_CHANNELS.has(payload?.channel) ? payload.channel : '';
    const businessValues = Array.isArray(payload?.businessValues)
      ? [...new Set(payload.businessValues.map((v) => String(v)).filter((v) => ALLOWED_VALUES.has(v)))]
      : [];
    const refId = cleanText(payload?.refId, 64);
    const durationSeconds = parseDurationSeconds(payload?.durationSeconds);
    const now = new Date().toISOString();

    const draftStory = {
      reqNumber: nextReqNum,
      title,
      description,
      businessValues,
      channel,
      refId,
      authorId: actor.accountId,
      authorName: actor.displayName,
      feasibility: 'unbewertet',
      status: 'Eingang',
      decisionReason: '',
      internalNote: '',
      createdAt: now,
      updatedAt: now,
      mentions: [
        {
          id: 1,
          createdAt: now,
          durationSeconds,
          channel,
          refId,
          feedbackNote: description,
          recordedBy: actor.displayName,
          recordedById: actor.accountId
        }
      ],
      questions: [],
      relevanceVotes: []
    };

    const pageTitle = buildChildPageTitle(nextReqNum, title);
    const createdPage = await requestJson('/wiki/api/v2/pages', {
      method: 'POST',
      body: {
        spaceId: parentInfo.spaceId,
        parentId: parentInfo.pageId,
        status: 'current',
        title: pageTitle,
        body: {
          representation: 'storage',
          value: renderConfluencePageXhtml(draftStory)
        }
      }
    });

    const pageId = String(createdPage.id);
    const savedStory = {
      ...draftStory,
      id: pageId,
      pageId,
      webUiPath: createdPage?._links?.webui || `/wiki/pages/viewpage.action?pageId=${pageId}`
    };

    await writePageProperty(pageId, savedStory, null);
    return enrichStory(savedStory);
  }

  async function loadSingleStory(pageId) {
    const prop = await readPageProperty(pageId);
    if (!prop || !prop.value) throw new Error('Confluence-Eintrag nicht gefunden.');
    return prop.value;
  }

  async function addCaseVote({ actor, payload }) {
    const pageId = String(payload?.storyId || '').trim();
    const durationSeconds = parseDurationSeconds(payload?.durationSeconds);
    if (durationSeconds < 60) {
      throw new Error('Mindestens 1 Minute Zeitaufwand (z. B. 01:00) erfassen.');
    }
    const story = await loadSingleStory(pageId);
    const channel = ALLOWED_CHANNELS.has(payload?.channel) ? payload.channel : '';
    const now = new Date().toISOString();
    story.mentions = story.mentions || [];
    story.mentions.unshift({
      id: story.mentions.length + 1,
      createdAt: now,
      durationSeconds,
      channel,
      refId: cleanText(payload?.refId, 64),
      feedbackNote: cleanText(payload?.feedbackNote, 800),
      recordedBy: actor.displayName,
      recordedById: actor.accountId
    });
    story.updatedAt = now;
    return syncChildPage(pageId, story, `+1 Fall (${formatDurationMMSS(durationSeconds)}) durch ${actor.displayName}`);
  }

  async function updateStoryMeta({ actor, payload }) {
    const pageId = String(payload?.storyId || '').trim();
    const story = await loadSingleStory(pageId);
    const changes = [];

    if (payload?.feasibility !== undefined) {
      const f = String(payload.feasibility);
      if (!ALLOWED_FEASIBILITY.has(f)) throw new Error('Ungültige Aufwand-Stufe.');
      story.feasibility = f;
      changes.push(`Aufwand: ${f}`);
    }
    if (payload?.status !== undefined) {
      const st = String(payload.status);
      if (!ALLOWED_STATUSES.has(st)) throw new Error('Ungültiger Status.');
      const reason = cleanText(payload?.decisionReason, 800);
      if (st === 'Abgelehnt' && reason.length < 3) {
        throw new Error('Bei einer Ablehnung ist eine kurze Begründung erforderlich.');
      }
      story.status = st;
      if (reason) story.decisionReason = reason;
      changes.push(`Status: ${st}`);
    }
    if (payload?.internalNote !== undefined) {
      story.internalNote = cleanText(payload.internalNote, 1500);
      changes.push('Fachnotiz');
    }
    story.updatedAt = new Date().toISOString();
    return syncChildPage(pageId, story, `${changes.join(', ') || 'Update'} (${actor.displayName})`);
  }

  async function askQuestion({ actor, payload }) {
    const pageId = String(payload?.storyId || '').trim();
    const body = cleanText(payload?.body, 800);
    if (body.length < 3) throw new Error('Bitte eine Rückfrage eingeben.');
    const story = await loadSingleStory(pageId);
    const now = new Date().toISOString();
    story.questions = story.questions || [];
    story.questions.push({
      id: story.questions.length + 1,
      askedBy: actor.displayName,
      askedById: actor.accountId,
      body,
      createdAt: now,
      replyBody: '',
      repliedAt: null
    });
    story.updatedAt = now;
    return syncChildPage(pageId, story, `Rückfrage von ${actor.displayName}`);
  }

  async function replyQuestion({ actor, payload }) {
    const pageId = String(payload?.storyId || '').trim();
    const questionId = Number(payload?.questionId);
    const replyBody = cleanText(payload?.replyBody, 1000);
    if (replyBody.length < 2) throw new Error('Bitte eine Antwort eingeben.');

    const story = await loadSingleStory(pageId);
    if (story.authorId && actor.accountId && story.authorId !== actor.accountId) {
      throw new Error('Nur die Person, welche den Fall erfasst hat, kann auf Rückfragen antworten.');
    }
    const q = (story.questions || []).find((item) => item.id === questionId);
    if (!q) throw new Error('Rückfrage nicht gefunden.');
    q.replyBody = replyBody;
    q.repliedAt = new Date().toISOString();
    story.updatedAt = q.repliedAt;
    return syncChildPage(pageId, story, `Antwort von ${actor.displayName}`);
  }

  async function voteRelevance({ actor, payload }) {
    const pageId = String(payload?.storyId || '').trim();
    const vote = payload?.vote === 'irrelevant' ? 'irrelevant' : 'relevant';
    const story = await loadSingleStory(pageId);
    story.relevanceVotes = story.relevanceVotes || [];
    const existing = story.relevanceVotes.find((v) => v.voterId === actor.accountId);
    const now = new Date().toISOString();
    if (existing) {
      existing.vote = vote;
      existing.voterName = actor.displayName;
      existing.updatedAt = now;
    } else {
      story.relevanceVotes.push({
        voterId: actor.accountId,
        voterName: actor.displayName,
        vote,
        updatedAt: now
      });
    }
    story.updatedAt = now;
    return syncChildPage(pageId, story, `Relevanz-Stimme (${vote}) von ${actor.displayName}`);
  }

  async function deleteStory({ payload }) {
    const pageId = String(payload?.storyId || '').trim();
    await requestJson(`/wiki/api/v2/pages/${encodeURIComponent(pageId)}`, { method: 'DELETE' });
    return { deleted: true, id: pageId };
  }

  function buildCsv(stories) {
    const escCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const header = ['REQ', 'Confluence-Page-ID', 'Datum', 'Titel', 'Erfasst von', 'Kanal', 'Aufwand', 'Status', 'Menge', 'Dauer (Minuten)', 'Dauer (MM:SS)', 'Mehrwert'];
    const lines = [header.map(escCsv).join(';')];
    for (const s of stories) {
      const sec = Number(s.totalDurationSeconds) || 0;
      const mins = (sec / 60).toFixed(1);
      lines.push(
        [
          `REQ-${String(s.reqNumber || 0).padStart(2, '0')}`,
          s.pageId || s.id,
          String(s.createdAt || '').slice(0, 10),
          s.title,
          s.authorName,
          s.channel || '',
          s.feasibility || 'unbewertet',
          s.status || 'Eingang',
          s.votes || 1,
          mins,
          formatDurationMMSS(sec),
          (s.businessValues || []).map((v) => VALUE_LABELS[v] || v).join(', ')
        ]
          .map(escCsv)
          .join(';')
      );
    }
    return `\uFEFF${lines.join('\r\n')}`;
  }

  return {
    getBoard,
    createStory,
    addCaseVote,
    updateStoryMeta,
    askQuestion,
    replyQuestion,
    voteRelevance,
    deleteStory,
    buildCsv
  };
}
