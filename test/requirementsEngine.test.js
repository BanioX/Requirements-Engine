import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeFeedback,
  classifyRequirementType,
  findPotentialDuplicates,
  scoreAndPrioritize
} from '../src/engine/requirementsEngine.js';

test('übersetzt eBanking-Kundenärger sauber in User Story, Tasks und Akzeptanzkriterien', () => {
  const result = analyzeFeedback({
    rawFeedback:
      'Kunden im Mobile Banking beschweren sich dauernd, dass nach 3 falschen PIN-Eingaben keine klare Meldung erscheint sowie kein Reset-Hinweis da ist, weil sie sonst 15 Minuten in der Hotline warten müssen.',
    sourceRole: 'Mobile-Banking-Kundschaft',
    feedbackType: 'kunden_aerger',
    urgency: 'kritisch'
  });

  assert.match(result.userStory, /^Als Mobile-Banking-Kundschaft möchte ich .+, damit .+\.$/);
  assert.equal(result.moscow, 'Must');
  assert.equal(result.reqType, 'NFA: Sicherheit & Compliance');
  assert.ok(result.tasks.length >= 3, 'Mindestens 3 Tasks sollten geschnitten werden');
  assert.ok(result.acceptanceCriteria.length >= 3, 'Akzeptanzkriterien sollten erzeugt werden');
  assert.ok(result.priorityScore >= 80);
});

test('lehnt zu kurzes Feedback sauber ab', () => {
  assert.throws(
    () => analyzeFeedback({ rawFeedback: 'kurz' }),
    /mindestens 10 Zeichen/
  );
});

test('klassifiziert Usability- und Performance-Anforderungen korrekt', () => {
  assert.equal(
    classifyRequirementType('Die Suche ist extrem langsam und verursacht oft einen Timeout.'),
    'NFA: Performance & Zuverlässigkeit'
  );
  assert.equal(
    classifyRequirementType('Die Fehlermeldung ist völlig unklar und verwirrend in der Mobile-Ansicht.'),
    'NFA: Usability & Kundenerlebnis'
  );
});

test('Duplikat-Radar erkennt ähnliche Anforderungen zuverlässig', () => {
  const existing = [
    {
      id: 12,
      title: 'PDF-Export für eBanking Jahresauszug vereinfachen',
      raw_feedback: 'Kunden finden den PDF-Export für den Jahresauszug im eBanking nicht.',
      user_story: 'Als Kunde möchte ich den PDF-Export im eBanking schneller finden.',
      status: 'Bereit'
    }
  ];

  const duplicates = findPotentialDuplicates(
    'Im eBanking suchen viele Kunden den PDF-Export für ihren Jahresauszug vergeblich.',
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

test('erkennt Rolle, Kategorie und Dringlichkeit automatisch ohne Dropdown-Auswahl', () => {
  const result = analyzeFeedback({
    rawFeedback: 'Nach 3 falschen Login-Versuchen bricht der Zugang sofort ab und Kunden beschweren sich dauernd bei der Hotline.',
    origin: 'betrieb'
  });

  assert.equal(result.origin, 'betrieb');
  assert.equal(result.sourceRole, 'Support & Betrieb');
  assert.equal(result.feedbackType, 'kunden_aerger');
  assert.equal(result.urgency, 'kritisch');
  assert.equal(result.moscow, 'Must');
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
