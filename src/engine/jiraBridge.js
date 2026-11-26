/**
 * Jira-Brücke für Requirements Engine:
 * - Erzeugt echtes Jira REST API v3 Payload (Atlassian Document Format) für "Story" oder "Feature"
 * - Erzeugt sauberes Jira-Wiki-Markup (für 1-Klick-Kopieren ohne API-Zugang)
 * - Erzeugt Jira-kompatibles CSV (Issues -> Import Issues from CSV)
 */

export function mapPriorityToJira(moscow) {
  if (moscow === 'Must') return 'High';
  if (moscow === 'Should') return 'Medium';
  return 'Low';
}

export function resolveJiraIssueType(story, requestedType) {
  if (requestedType === 'Feature' || requestedType === 'Story') return requestedType;
  return story.feasibility === 'aufwaendig' ? 'Feature' : 'Story';
}

export function buildJiraWikiMarkup(story, requestedType) {
  const issueType = resolveJiraIssueType(story, requestedType);
  const tasks = Array.isArray(story.tasks_json) ? story.tasks_json : [];
  const criteria = Array.isArray(story.acceptance_criteria_json) ? story.acceptance_criteria_json : [];
  const refs = Array.isArray(story.interaction_refs_json) ? story.interaction_refs_json : [];
  const postMentions = Number(story.post_decision_mentions) || 0;
  const totalSec = Number(story.total_duration_seconds) || 0;
  const durStr =
    totalSec > 0
      ? `${Math.floor(totalSec / 60)}m ${String(totalSec % 60).padStart(2, '0')}s`
      : '';

  const headerSection =
    issueType === 'Feature'
      ? [
          `h2. Feature: ${story.title}`,
          '',
          'h3. Business-Case & Volumen',
          `* *Erfasste Fälle:* ${story.votes || 1}x${postMentions > 0 ? ` (+${postMentions}x nach Ablehnung)` : ''}`,
          durStr ? `* *Erfasster Zeitaufwand:* ${durStr}` : '',
          `* *Anforderungstyp:* ${story.req_type || 'FA: Funktionale Anforderung'}`,
          `* *Machbarkeit:* ${story.feasibility || 'unbewertet'}`,
          story.submitted_by ? `* *Ideengeber:* ${story.submitted_by}` : '',
          refs.length > 0 ? `* *CRM / Ref-IDs:* ${refs.map((r) => `#${r.ref}`).join(', ')}` : ''
        ]
      : [
          `h2. Story: ${story.title}`,
          '',
          `{quote}${story.user_story}{quote}`,
          '',
          'h3. Kontext & Nachweis',
          `* *Anforderungstyp:* ${story.req_type || 'FA: Funktionale Anforderung'}`,
          `* *Erfasste Fälle:* ${story.votes || 1}x${durStr ? ` · Zeitaufwand: ${durStr}` : ''}`,
          story.channel ? `* *Kanal:* ${story.channel}` : '',
          `* *Machbarkeit:* ${story.feasibility || 'unbewertet'}`,
          story.submitted_by ? `* *Ideengeber:* ${story.submitted_by}` : '',
          refs.length > 0 ? `* *CRM / Ref-IDs:* ${refs.map((r) => `#${r.ref}`).join(', ')}` : ''
        ];

  return [
    ...headerSection,
    story.internal_note ? `* *Systemlogik / Fachnotiz:* ${story.internal_note}` : '',
    '',
    'h3. Ursprüngliches Feedback',
    story.raw_feedback,
    tasks.length > 0 ? '\nh3. Teilanforderungen' : '',
    ...tasks.map((t) => `* ${t.title}`),
    '',
    'h3. Akzeptanzkriterien (Gegeben / Wenn / Dann)',
    ...criteria.map((c) => `# ${c}`),
    story.public_response ? `\nh3. Rückmeldung / Entscheid\n${story.public_response}` : ''
  ]
    .filter((line) => line !== null && line !== undefined && line !== '')
    .join('\n')
    .trim();
}

export function buildJiraRestPayload(story, { projectKey, issueType = 'Story' }) {
  const plainDescription = buildJiraWikiMarkup(story, issueType);
  const safeType = issueType === 'Feature' ? 'Feature' : 'Story';

  return {
    fields: {
      project: { key: projectKey },
      summary: story.title.slice(0, 240),
      issuetype: { name: safeType },
      priority: { name: mapPriorityToJira(story.moscow) },
      labels: [
        'requirements-engine',
        `ampel-${story.feasibility || 'mittel'}`,
        `meldungen-${story.votes || 1}`
      ],
      description: {
        type: 'doc',
        version: 1,
        content: plainDescription.split('\n\n').map((block) => ({
          type: 'paragraph',
          content: [{ type: 'text', text: block }]
        }))
      }
    }
  };
}

function escapeJiraCsv(val) {
  const s = String(val ?? '');
  if (/[,"\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function storiesToJiraCsv(stories = [], defaultIssueType = 'Story') {
  const header = ['Summary', 'Issue Type', 'Priority', 'Labels', 'Description'];
  const rows = stories.map((s) => [
    s.title,
    s.feasibility === 'aufwaendig' ? 'Feature' : defaultIssueType,
    mapPriorityToJira(s.moscow),
    `requirements-engine ampel-${s.feasibility || 'mittel'}`,
    buildJiraWikiMarkup(s, s.feasibility === 'aufwaendig' ? 'Feature' : defaultIssueType)
  ]);
  return [header, ...rows].map((r) => r.map(escapeJiraCsv).join(',')).join('\r\n');
}

export async function pushStoryToJira(story, { issueType, env = process.env, fetchImpl = fetch } = {}) {
  const resolvedType = resolveJiraIssueType(story, issueType);
  const baseUrl = String(env.JIRA_BASE_URL || '').replace(/\/+$/, '');
  const email = String(env.JIRA_EMAIL || '').trim();
  const apiToken = String(env.JIRA_API_TOKEN || '').trim();
  const projectKey = String(env.JIRA_PROJECT_KEY || '').trim();

  if (!baseUrl || !email || !apiToken || !projectKey) {
    return {
      mode: 'clipboard',
      issueType: resolvedType,
      markup: buildJiraWikiMarkup(story, resolvedType),
      message: 'Jira-API nicht in .env konfiguriert — Jira-Markup bereit zum Einfügen.'
    };
  }

  const payload = buildJiraRestPayload(story, { projectKey, issueType: resolvedType });
  const auth = Buffer.from(`${email}:${apiToken}`, 'utf8').toString('base64');

  const res = await fetchImpl(`${baseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Jira API Fehler (HTTP ${res.status}): ${errText.slice(0, 180)}`);
  }

  const data = await res.json();
  return {
    mode: 'api',
    issueType,
    jiraKey: data.key,
    jiraUrl: `${baseUrl}/browse/${data.key}`
  };
}
