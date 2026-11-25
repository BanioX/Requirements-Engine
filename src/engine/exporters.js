/**
 * Export- & Ampel-Hilfsfunktionen für Requirements Engine:
 * - Automatische Aktualitäts- & Fristen-Ampel (Grün / Gelb <= 14 Tage / Rot überfällig)
 * - Markdown-Spezifikation (für Teams/E-Mail/Dokumentation)
 * - CSV-Export (für Excel)
 * - iCal (.ics) Export für Outlook / Google Calendar
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateTrafficLight(dueDateValue, now = new Date()) {
  if (!dueDateValue) {
    return { status: 'none', label: 'Kein Termin', daysRemaining: null };
  }

  const due = new Date(dueDateValue);
  if (Number.isNaN(due.getTime())) {
    return { status: 'none', label: 'Ungültig', daysRemaining: null };
  }

  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startOfDue = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const daysRemaining = Math.round((startOfDue - startOfToday) / DAY_MS);

  if (daysRemaining < 0) {
    return {
      status: 'red',
      label: `Überfällig (${Math.abs(daysRemaining)} T.)`,
      daysRemaining
    };
  }
  if (daysRemaining <= 14) {
    return {
      status: 'yellow',
      label: daysRemaining === 0 ? 'Heute fällig' : `Bald fällig (${daysRemaining} T.)`,
      daysRemaining
    };
  }
  return {
    status: 'green',
    label: `Aktuell (${daysRemaining} T.)`,
    daysRemaining
  };
}

export function storyToMarkdown(story) {
  const tasks = Array.isArray(story.tasks_json) ? story.tasks_json : [];
  const criteria = Array.isArray(story.acceptance_criteria_json) ? story.acceptance_criteria_json : [];

  const taskLines = tasks
    .map((t) => `- [${t.done ? 'x' : ' '}] **${t.id}** ${t.title} _(${t.estimateHours} h)_`)
    .join('\n');

  const criteriaLines = criteria.map((c, i) => `${i + 1}. ${c}`).join('\n');

  return [
    `# [${story.moscow}] ${story.title}`,
    '',
    `- **ID:** REQ-${story.id}`,
    `- **Bereich / Rolle:** ${story.source_role}`,
    `- **Typ:** ${story.req_type}`,
    `- **Priorität / Score:** ${story.moscow} (${story.priority_score}/100 · Grösse ${story.size_estimate} · Votes: ${story.votes})`,
    `- **Status:** ${story.status}${story.due_date ? ` · **Frist:** ${String(story.due_date).slice(0, 10)}` : ''}`,
    '',
    '## User Story',
    `> ${story.user_story}`,
    '',
    '## Ursprüngliches Feedback',
    story.raw_feedback,
    '',
    '## Geschnittene Tasks',
    taskLines || '- Keine Tasks erfasst',
    '',
    '## Akzeptanzkriterien',
    criteriaLines || '- Keine Kriterien erfasst',
    story.decision_reason ? `\n## Entscheid-Begründung\n${story.decision_reason}` : ''
  ].join('\n');
}

export function processToMarkdown(proc, steps = []) {
  const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);
  const stepBlocks = sorted
    .map((s) => {
      const markerCount = Array.isArray(s.markers_json) ? s.markers_json.length : 0;
      const hintBadge = s.hint_type && s.hint_type !== 'info' ? ` [${s.hint_type.toUpperCase()}]` : '';
      return [
        `### Schritt ${s.step_order}: ${s.action_title}${hintBadge}`,
        s.ui_target ? `- **Klick-Ziel / Pfad:** \`${s.ui_target}\`` : '',
        s.details ? `- **Beschreibung:** ${s.details}` : '',
        markerCount > 0 ? `- **Screenshot-Klickpunkte:** ${markerCount} markiert` : ''
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');

  return [
    `# Klick-Anleitung: ${proc.title}`,
    '',
    `- **Kategorie:** ${proc.category}`,
    `- **Verantwortlich:** ${proc.owner_role}`,
    `- **Version:** v${proc.version_nr}`,
    `- **Prüfintervall:** alle ${proc.review_interval_days} Tage`,
    `- **Nächstes Review:** ${String(proc.next_review_at || '').slice(0, 10)}`,
    '',
    proc.summary ? `${proc.summary}\n` : '',
    '## Schritte',
    stepBlocks || '_Noch keine Schritte hinterlegt._'
  ].join('\n');
}

function escapeCsvCell(value) {
  const str = String(value ?? '');
  if (/[;"\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatSecondsMMSS(totalSec) {
  const sec = Math.max(0, Math.round(Number(totalSec) || 0));
  if (sec === 0) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function storiesToCsv(stories = []) {
  const header = [
    'ID',
    'Datum',
    'Idee von',
    'Meldungen',
    'Erfasste Zeit (MM:SS)',
    'Ø Dauer (MM:SS)',
    'Machbarkeit',
    'Kanal',
    'Titel',
    'Status',
    'Score',
    'User Story',
    'Kunden-Wording',
    'Systemlogik / Dev'
  ];
  const rows = stories.map((s) => {
    const totalSec = Number(s.period_duration_seconds ?? s.total_duration_seconds ?? 0);
    const timed = Number(s.period_timed_mentions ?? s.timed_mentions ?? 0);
    const avgSec = timed > 0 ? Math.round(totalSec / timed) : 0;
    return [
      `REQ-${s.id}`,
      s.created_at ? String(s.created_at).slice(0, 10) : '',
      s.submitted_by || '',
      s.period_mentions ?? s.votes ?? 1,
      formatSecondsMMSS(totalSec),
      formatSecondsMMSS(avgSec),
      s.feasibility || 'mittel',
      s.channel || 'E-Mail',
      s.title,
      s.status,
      s.priority_score,
      s.user_story,
      s.public_response || s.decision_reason || '',
      s.internal_note || ''
    ];
  });

  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(';')).join('\r\n');
}

function formatIcsDate(dateValue) {
  const d = new Date(dateValue);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function escapeIcsText(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function buildIcsCalendar(events = [], now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Requirements Engine//Fristen-Waechter//DE',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Requirements Engine Fristen'
  ];

  for (const ev of events) {
    if (!ev.dueDate) continue;
    const dateStr = formatIcsDate(ev.dueDate);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcsText(ev.uid)}@requirements-engine.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `SUMMARY:${escapeIcsText(ev.summary)}`,
      `DESCRIPTION:${escapeIcsText(ev.description || '')}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}
