import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIcsCalendar,
  calculateTrafficLight,
  storiesToCsv,
  storyToMarkdown
} from '../src/engine/exporters.js';

test('Ampel-Berechnung erkennt Grün, Gelb (<= 14 Tage) und Rot (überfällig)', () => {
  const ref = new Date('2026-12-01T12:00:00Z');

  assert.equal(calculateTrafficLight('2027-01-15', ref).status, 'green');
  assert.equal(calculateTrafficLight('2026-12-10', ref).status, 'yellow');
  assert.equal(calculateTrafficLight('2026-11-28', ref).status, 'red');
  assert.equal(calculateTrafficLight(null, ref).status, 'none');
});

test('iCal-Export erzeugt gültige VCALENDAR- und VEVENT-Struktur', () => {
  const ics = buildIcsCalendar(
    [
      {
        uid: 'process-1',
        dueDate: '2026-12-20',
        summary: '[Review] Mobile-Banking Anleitung',
        description: 'Prüfung alle 90 Tage'
      }
    ],
    new Date('2026-12-01T10:00:00Z')
  );

  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /BEGIN:VEVENT/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261220/);
  assert.match(ics, /SUMMARY:\[Review\] Mobile-Banking Anleitung/);
  assert.match(ics, /END:VCALENDAR/);
});

test('Markdown- und CSV-Export enthalten zentrale Story-Felder', () => {
  const story = {
    id: 5,
    title: 'TWINT-Limit vereinfachen',
    source_role: 'eBanking-Support',
    req_type: 'FA: Funktionale Anforderung',
    moscow: 'Should',
    priority_score: 68,
    size_estimate: 'M',
    votes: 3,
    status: 'Angenommen',
    due_date: '2026-12-30',
    user_story: 'Als eBanking-Support möchte ich TWINT-Limiten schneller anpassen, damit Wartezeiten sinken.',
    raw_feedback: 'Zu viele Klicks bei TWINT-Limiten.',
    tasks_json: [{ id: 'T1', title: 'Maske vereinfachen', estimateHours: 2, done: false }],
    acceptance_criteria_json: ['Gegeben Support-Rolle, wenn Limit geändert wird, dann wird ein Audit-Log erzeugt.'],
    decision_reason: 'Wichtige Entlastung im Support.'
  };

  const md = storyToMarkdown(story);
  assert.match(md, /# \[Should\] TWINT-Limit vereinfachen/);
  assert.match(md, /REQ-5/);

  const csv = storiesToCsv([story]);
  assert.match(csv, /^ID;Datum;Idee von;Meldungen;Machbarkeit;Kanal;Titel;/);
  assert.match(csv, /REQ-5;;;3;mittel;E-Mail;TWINT-Limit vereinfachen;/);
});
