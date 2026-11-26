import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeFeedback,
  classifyRequirementType,
  findPotentialDuplicates,
  scoreAndPrioritize
} from '../src/engine/requirementsEngine.js';

test('übersetzt Kundenärger nach RE-Lehrbuch in User Story, Teilanforderungen und Akzeptanzkriterien', () => {
  const result = analyzeFeedback({
    rawFeedback:
      'Nach 3 falschen PIN-Eingaben erscheint keine klare Meldung sowie kein Reset-Hinweis, weil man sonst 15 Minuten warten muss.',
    sourceRole: 'Kundschaft',
    feedbackType: 'kunden_aerger',
    urgency: 'kritisch'
  });

  assert.match(result.userStory, /^Als Kundschaft möchte ich .+, damit .+\.$/);
  assert.equal(result.moscow, 'Must');
  assert.equal(result.reqType, 'NFA: Sicherheit & Schutz');
  assert.equal(result.feasibility, 'unbewertet');
  assert.ok(result.tasks.length >= 2, 'Aufzählung sollte in Teilanforderungen zerlegt werden');
  assert.ok(result.acceptanceCriteria.length >= 3, 'Akzeptanzkriterien (Gegeben/Wenn/Dann) sollten erzeugt werden');
  assert.ok(result.priorityScore >= 80);
});

test('lehnt zu kurzes Feedback sauber ab', () => {
  assert.throws(
    () => analyzeFeedback({ rawFeedback: 'kurz' }),
    /mindestens 10 Zeichen/
  );
});

test('klassifiziert Usability- und Performance-Anforderungen nach IREB korrekt', () => {
  assert.equal(
    classifyRequirementType('Die Suche ist extrem langsam und verursacht oft einen Timeout.'),
    'NFA: Effizienz & Zeitverhalten'
  );
  assert.equal(
    classifyRequirementType('Die Fehlermeldung ist völlig unklar und verwirrend.'),
    'NFA: Benutzbarkeit (Usability)'
  );
});

test('Duplikat-Radar erkennt ähnliche Anforderungen zuverlässig', () => {
  const existing = [
    {
      id: 12,
      title: 'PDF-Export für Jahresauszug vereinfachen',
      raw_feedback: 'Kunden finden den PDF-Export für den Jahresauszug nicht.',
      user_story: 'Als Kunde möchte ich den PDF-Export schneller finden.',
      status: 'Bereit'
    }
  ];

  const duplicates = findPotentialDuplicates(
    'Viele Kunden suchen den PDF-Export für ihren Jahresauszug vergeblich.',
    existing
  );

  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].id, 12);
  assert.ok(duplicates[0].similarityPercent >= 35);
});

test('Team-Votes erhöhen den Prioritäts-Score automatisch', () => {
  const base = scoreAndPrioritize({ rawText: 'Export verbessern', urgency: 'normal', feedbackType: 'idee', votes: 1 });
  const voted = scoreAndPrioritize({ rawText: 'Export verbessern', urgency: 'normal', feedbackType: 'idee', votes: 6 });

  assert.ok(voted.score > base.score);
});

test('bleibt branchenneutral ohne branchenspezifische Unterstellungen', () => {
  const result = analyzeFeedback({
    rawFeedback: 'Nach 3 falschen Versuchen bricht der Ablauf sofort ab und Kunden beschweren sich dauernd.',
    origin: 'betrieb'
  });

  assert.equal(result.origin, 'betrieb');
  assert.equal(result.sourceRole, 'Team / Betrieb');
  assert.equal(result.feedbackType, 'kunden_aerger');
  assert.equal(result.urgency, 'kritisch');
  assert.equal(result.moscow, 'Must');
  assert.equal(result.tasks.length, 0, 'Einzelanforderung erzeugt keine erfundenen Checklisten-Tasks');
});

test('Machbarkeit «einfach» + Nutzen-Votes stufen Idee automatisch als Quick Win ein', () => {
  const quickWin = scoreAndPrioritize({
    rawText: 'Eigenen Auszug direkt als PDF herunterladen',
    votes: 5,
    feasibility: 'einfach'
  });
  const complex = scoreAndPrioritize({
    rawText: 'Eigenen Auszug direkt als PDF herunterladen',
    votes: 5,
    feasibility: 'aufwaendig'
  });

  assert.equal(quickWin.impactLabel, 'Quick Win');
  assert.equal(quickWin.moscow, 'Must');
  assert.ok(quickWin.score > complex.score);
});
