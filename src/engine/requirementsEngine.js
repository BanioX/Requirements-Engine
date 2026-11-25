/**
 * Lokale, deterministische Requirements-Engine (100 % kostenlos, ohne externe KI-APIs).
 * Übersetzt formloses Feedback / Kundenärger / Ideen in:
 * - Strukturierte User Story ("Als ... möchte ich ..., damit ...")
 * - Geschnittene Tasks inkl. Aufwandschätzung
 * - Akzeptanzkriterien (Gegeben / Wenn / Dann)
 * - Anforderungstyp (FA / NFA), MoSCoW-Priorität, T-Shirt-Grösse & Score
 * - Duplikat-Radar gegen bestehende Einträge
 */

const STOP_WORDS = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer',
  'und', 'oder', 'aber', 'weil', 'damit', 'dass', 'sonst', 'wenn', 'dann', 'auch',
  'noch', 'nur', 'sehr', 'immer', 'wieder', 'nicht', 'kein', 'keine', 'keinen',
  'wir', 'ich', 'sie', 'man', 'uns', 'sich', 'ist', 'sind', 'war', 'wird', 'werden',
  'hat', 'haben', 'kann', 'können', 'muss', 'müssen', 'soll', 'sollen', 'bei', 'mit',
  'von', 'für', 'auf', 'aus', 'vor', 'nach', 'über', 'unter', 'durch', 'zum', 'zur',
  'im', 'in', 'am', 'an', 'es', 'zu', 'um', 'als', 'wie', 'was', 'wer', 'wo', 'mehr',
  'nervt', 'brauchen', 'wäre', 'gibt', 'gehen', 'geht', 'machen', 'macht', 'dauernd',
  'oft', 'oftmals', 'jedes', 'jede', 'jeden', 'bitte', 'aktuell', 'momentan', 'gerade'
]);

const URGENCY_BASE_SCORE = {
  kritisch: 45,
  hoch: 30,
  normal: 15
};

const TYPE_BONUS = {
  kunden_aerger: 25,
  compliance: 25,
  prozess_engpass: 18,
  idee: 10
};

function cleanWhitespace(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function capitalizeFirst(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function lowercaseFirst(text) {
  if (!text) return '';
  // Abkürzungen wie PDF, TWINT, PIN, API, eBanking nicht kleinschreiben
  if (/^[A-ZÄÖÜ]{2,}/.test(text) || /^eBanking/i.test(text)) {
    return text;
  }
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export function extractKeywords(text) {
  const normalized = String(text || '')
    .toLowerCase()
    .replace(/[^a-zäöü0-9\s-]/gi, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^-+|-+$/g, ''))
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
  return [...new Set(normalized)];
}

/**
 * Erkennt Anforderungstyp (Funktionale Anforderung vs. Nicht-funktionale Anforderung)
 */
export function classifyRequirementType(rawText, feedbackType = 'idee') {
  const lower = rawText.toLowerCase();
  if (/(passwort|pin|login|sicher|berechtigung|zugriff|zertifikat|verschlüssel|dsg|compliance|audit|2fa|sperr)/.test(lower) || feedbackType === 'compliance') {
    return 'NFA: Sicherheit & Compliance';
  }
  if (/(langsam|dauer|minute|sekunde|wartezeit|performance|absturz|ausfall|verfügbar|stabil|timeout|hängt)/.test(lower)) {
    return 'NFA: Performance & Zuverlässigkeit';
  }
  if (/(unklar|verwirr|verständ|bedien|klick|übersicht|findet nicht|kompliziert|mobile|fehlermeldung|design)/.test(lower)) {
    return 'NFA: Usability & Kundenerlebnis';
  }
  return 'FA: Funktionale Anforderung';
}

/**
 * Zerlegt den Rohtext in Wunsch/Problem und Nutzen/Begründung
 */
function splitGoalAndBenefit(rawText) {
  const cleaned = cleanWhitespace(rawText).replace(/[.!?]+$/, '');

  // Klar unterscheiden: positiver Nutzen ("damit", "um ... zu") vs. Problem-Ursache ("weil", "sonst", "sodass", "weshalb")
  const patterns = [
    { kind: 'benefit', regex: /\s*,?\s*\bdamit\s+(.+)$/i },
    { kind: 'benefit', regex: /\s*,?\s*\bum\s+(.+?)\s+zu\s+([^\s,.;!?]+.*)$/i },
    { kind: 'cause', regex: /\s*,?\s*\bweil\s+(.+)$/i },
    { kind: 'cause', regex: /\s*,?\s*\bsonst\s+(.+)$/i },
    { kind: 'cause', regex: /\s*,?\s*\bsodass\s+(.+)$/i },
    { kind: 'cause', regex: /\s*,?\s*\bweshalb\s+(.+)$/i }
  ];

  let mainPart = cleaned;
  let benefitPart = '';
  let partKind = 'none';

  for (const { kind, regex } of patterns) {
    const match = cleaned.match(regex);
    if (match) {
      mainPart = cleaned.slice(0, match.index).replace(/[,;:\s]+$/, '');
      benefitPart = match.length >= 3 && match[2] ? `${match[1]} zu ${match[2]}` : match[1];
      partKind = kind;
      break;
    }
  }

  return { mainPart, benefitPart, partKind };
}

/**
 * Formuliert das Ziel für "möchte ich ..." aus formloser Umgangssprache
 */
function normalizeGoalPhrase(mainPart, feedbackType) {
  let phrase = cleanWhitespace(mainPart);

  // Häufige formlose Einleitungen entfernen
  phrase = phrase
    .replace(/^(es nervt(,?\s*dass)?|kunden\s+(im\s+[^\s,]+\s+)?beschweren\s+sich(\s+dauernd)?(,?\s*dass)?|wir\s+brauchen(\s+dringend)?|ich\s+möchte|es\s+wäre\s+(gut|super|toll)(,?\s*wenn)?|es\s+fehlt(\s+ein|\s+eine)?|problem:?\s*|idee:?\s*)/i, '')
    .trim();

  if (!phrase) {
    phrase = cleanWhitespace(mainPart);
  }

  // Wenn das Problem als Negativ-Zustand beschrieben ist, lösungsorientiert rahmen
  if (/(manuell|excel|dauernd|fehler|keine klare meldung|störung|ärger|beschwer|vergessen|kompliziert|absturz|warten)/i.test(phrase)) {
    if (feedbackType === 'kunden_aerger') {
      return `eine klare und geführte Lösung für das Problem «${phrase}» bereitstellen`;
    }
    return `den Ablauf «${phrase}» vereinfachen und automatisieren`;
  }

  // Wenn es bereits wie eine Funktion klingt
  if (/^(einen?|eine|die|der|das|automatisch)/i.test(phrase)) {
    return `${lowercaseFirst(phrase)} nutzen können`;
  }

  return `${lowercaseFirst(phrase)} zuverlässig umsetzen`;
}

/**
 * Formuliert den Nutzen für "damit ..."
 */
function normalizeBenefitPhrase(benefitPart, partKind, feedbackType, reqType) {
  const cleaned = cleanWhitespace(benefitPart);
  if (cleaned) {
    if (partKind === 'cause' || /(vergessen|ausfällt|ärger|beschwer|warten|verloren|schief|fehler|versteckt|anruf|ticket|support|hotline|doppelt|nachfragen)/.test(cleaned)) {
      return `Rückfragen und Reibung spürbar sinken (bisherige Ursache: ${lowercaseFirst(cleaned)})`;
    }
    return lowercaseFirst(cleaned);
  }

  if (feedbackType === 'kunden_aerger') {
    return 'Kundenrückfragen sinken und das Erlebnis spürbar einfacher wird';
  }
  if (feedbackType === 'compliance') {
    return 'Fristen, Nachweise und Sicherheitsvorgaben lückenlos eingehalten werden';
  }
  if (reqType.includes('Usability')) {
    return 'die Bedienung intuitiver wird und weniger Support-Aufwand entsteht';
  }
  return 'wiederkehrende manuelle Arbeit reduziert und Servicequalität gesichert wird';
}

/**
 * Schneidet eine Idee automatisch in umsetzbare Tasks (Story-Slicing)
 */
export function sliceIntoTasks(rawText, reqType) {
  const cleaned = cleanWhitespace(rawText);
  const lower = cleaned.toLowerCase();
  const tasks = [];

  // 1. Aufzählungen / zusammengesetzte Teile im Text erkennen
  const segments = cleaned
    .split(/\s*(?:;|•|\n|\bund\s+ausserdem\b|\bsowie\b|\bausserdem\b|\bzusätzlich\b)\s*/i)
    .map((s) => cleanWhitespace(s))
    .filter((s) => s.length >= 12);

  if (segments.length > 1) {
    segments.slice(0, 4).forEach((seg, idx) => {
      const shortSeg = seg.length > 90 ? `${seg.slice(0, 87)}…` : seg;
      tasks.push({
        id: `task-${idx + 1}`,
        title: `Teilbereich ${idx + 1} umsetzen: ${shortSeg}`,
        estimateHours: 2,
        done: false
      });
    });
  } else {
    tasks.push({
      id: 'task-1',
      title: 'Anforderung fachlich schärfen & Mockup/Ablauf mit Fachbereich abstimmen',
      estimateHours: 1.5,
      done: false
    });
  }

  // 2. Domänenspezifische Tasks automatisch ergänzen
  if (/(export|pdf|csv|excel|bericht|download|kalender|ics)/.test(lower)) {
    tasks.push({
      id: `task-${tasks.length + 1}`,
      title: 'Export-Funktion & Ausgabeformat implementieren und Stichprobe prüfen',
      estimateHours: 2.5,
      done: false
    });
  }
  if (/(meldung|benachrichtigung|erinnerung|frist|ampel|warnung|mail|hinweis)/.test(lower)) {
    tasks.push({
      id: `task-${tasks.length + 1}`,
      title: 'Hinweistexte, Schwellenwerte und Benachrichtigungslogik konfigurieren',
      estimateHours: 2,
      done: false
    });
  }
  if (/(pin|login|passwort|reset|sperr|berechtigung|2fa|sicher|zertifikat)/.test(lower)) {
    tasks.push({
      id: `task-${tasks.length + 1}`,
      title: 'Sicherheits- und Missbrauchsprüfung (Fehlerfälle, Logging, Rechte) durchführen',
      estimateHours: 3,
      done: false
    });
  }
  if (/(mobile|app|ebanking|button|maske|formular|klick|ui|anzeige)/.test(lower)) {
    tasks.push({
      id: `task-${tasks.length + 1}`,
      title: 'Benutzeroberfläche (Desktop & Mobile) anpassen und Usability-Kurztest fahren',
      estimateHours: 2.5,
      done: false
    });
  }

  // Mindestens 3 sinnvolle Tasks (Umsetzung + Abnahme/Doku) garantieren
  if (tasks.length < 2) {
    tasks.push({
      id: `task-${tasks.length + 1}`,
      title: `Kernfunktion (${reqType.split(':')[0]}) implementieren & Datenmodell erweitern`,
      estimateHours: 3,
      done: false
    });
  }

  tasks.push({
    id: `task-${tasks.length + 1}`,
    title: 'Abnahmetest gemäss Akzeptanzkriterien durchführen & Klick-Anleitung aktualisieren',
    estimateHours: 1.5,
    done: false
  });

  // IDs sauber durchnummerieren (max. 6 Tasks)
  return tasks.slice(0, 6).map((t, index) => ({
    ...t,
    id: `T${index + 1}`
  }));
}

/**
 * Generiert strukturierte Akzeptanzkriterien im Gherkin-Stil (Gegeben / Wenn / Dann)
 */
export function generateAcceptanceCriteria(rawText, role, reqType) {
  const lower = rawText.toLowerCase();
  const criteria = [];

  criteria.push(
    `Gegeben eine berechtigte Person aus dem Bereich «${role}», wenn der betroffene Ablauf ausgeführt wird, dann funktioniert die neue Lösung reproduzierbar ohne manuelle Workarounds.`
  );

  if (/(pin|login|passwort|sperr|fehlermeldung|reset)/.test(lower)) {
    criteria.push(
      'Gegeben eine fehlerhafte Eingabe oder gesperrte Sitzung, wenn der Fehlerfall eintritt, dann erscheint innert < 2 Sekunden eine verständliche Meldung mit klarem nächstem Lösungsschritt.'
    );
  } else if (/(export|pdf|csv|excel|kalender)/.test(lower)) {
    criteria.push(
      'Gegeben aktuelle Datensätze im System, wenn der Export ausgelöst wird, dann enthält die erzeugte Datei alle relevanten Felder vollständig, korrekt codiert (UTF-8) und ohne Datenverlust.'
    );
  } else if (/(frist|zertifikat|review|erinnerung|ablauf|wartung)/.test(lower)) {
    criteria.push(
      'Gegeben ein hinterlegtes Fälligkeitsdatum, wenn der Schwellenwert (≤ 14 Tage) unterschritten wird, dann wechselt der Status automatisch auf Warnung und bleibt im Audit-Log nachvollziehbar.'
    );
  } else {
    criteria.push(
      'Gegeben ungültige oder unvollständige Eingaben, wenn der Vorgang abgeschickt wird, dann verhindert das System fehlerhafte Daten und zeigt einen klaren Korrekturhinweis.'
    );
  }

  criteria.push(
    `Gegeben die Abnahme der Anforderung (${reqType}), wenn das Update produktiv ausgerollt wird, dann sind Tests grün, Daten bleiben persistent und die zugehörige Prozess-Anleitung ist aktuell.`
  );

  return criteria;
}

const FEASIBILITY_BONUS = {
  einfach: 25,
  mittel: 10,
  aufwaendig: -5
};

/**
 * Berechnet Impact-Score, Quick-Win-Einstufung (MoSCoW) und T-Shirt-Grösse
 * aus Nutzen (Upvotes) und Machbarkeit (einfach / mittel / aufwaendig).
 */
export function scoreAndPrioritize({
  rawText,
  urgency = 'normal',
  feedbackType = 'idee',
  votes = 1,
  feasibility = 'mittel',
  tasks = []
}) {
  const lower = String(rawText || '').toLowerCase();
  const safeVotes = Math.max(1, Number(votes) || 1);
  const safeFeasibility = Object.hasOwn(FEASIBILITY_BONUS, feasibility) ? feasibility : 'mittel';

  let score =
    safeVotes * 6 +
    FEASIBILITY_BONUS[safeFeasibility] +
    (URGENCY_BASE_SCORE[urgency] || 10) * 0.7 +
    (TYPE_BONUS[feedbackType] || 8) * 0.4;

  if (/(ausfall|sperr|kunde|hotline|support|ticket|beschwer|frist|self-service|beleg|auszug)/.test(lower)) {
    score += 12;
  }
  if (urgency === 'kritisch') {
    score = Math.max(score, 80);
  }
  score = Math.max(5, Math.min(Math.round(score), 100));

  let moscow = 'Could';
  if (urgency === 'kritisch' || (safeFeasibility === 'einfach' && safeVotes >= 4) || safeVotes >= 8 || score >= 75) {
    moscow = 'Must';
  } else if (safeVotes >= 3 || score >= 45) {
    moscow = 'Should';
  }

  let impactLabel = 'Idee';
  if (safeFeasibility === 'einfach' && safeVotes >= 4) {
    impactLabel = 'Quick Win';
  } else if (safeVotes >= 8 && safeFeasibility === 'aufwaendig') {
    impactLabel = 'Grossprojekt';
  } else if (moscow === 'Must' || moscow === 'Should') {
    impactLabel = 'Hoher Nutzen';
  }

  const totalHours = tasks.reduce((sum, t) => sum + (Number(t.estimateHours) || 1), 0);
  let sizeEstimate = 'S';
  if (safeFeasibility === 'aufwaendig' || totalHours > 9) {
    sizeEstimate = 'L';
  } else if (safeFeasibility === 'mittel' || totalHours > 5) {
    sizeEstimate = 'M';
  }

  return { score, moscow, impactLabel, sizeEstimate, totalHours, feasibility: safeFeasibility };
}

/**
 * Erzeugt einen prägnanten Titel aus dem Feedback
 */
function buildShortTitle(mainPart, role) {
  let clean = cleanWhitespace(mainPart)
    .replace(/^(es nervt(,?\s*dass)?|kunden\s+beschweren\s+sich(,?\s*dass)?|wir\s+brauchen(\s+dringend)?|es\s+fehlt\s+)/i, '')
    .trim();

  if (!clean) clean = `Anforderung aus ${role}`;
  clean = capitalizeFirst(clean);
  if (clean.length > 72) {
    clean = `${clean.slice(0, 69).replace(/\s+\S*$/, '')}…`;
  }
  return clean;
}

/**
 * Duplikat-Radar: Vergleicht Stichwörter gegen bestehende Stories
 */
export function findPotentialDuplicates(rawText, existingStories = []) {
  const inputKeywords = extractKeywords(rawText);
  if (inputKeywords.length === 0) return [];

  const inputSet = new Set(inputKeywords);
  const matches = [];

  for (const story of existingStories) {
    const candidateText = `${story.title || ''} ${story.raw_feedback || ''} ${story.user_story || ''}`;
    const candidateKeywords = extractKeywords(candidateText);
    if (candidateKeywords.length === 0) continue;

    const overlap = candidateKeywords.filter((k) => inputSet.has(k));
    const ratio = overlap.length / Math.min(inputKeywords.length, candidateKeywords.length);

    if (overlap.length >= 2 && ratio >= 0.35) {
      matches.push({
        id: story.id,
        title: story.title,
        status: story.status,
        similarityPercent: Math.round(ratio * 100),
        sharedKeywords: overlap.slice(0, 5)
      });
    }
  }

  return matches.sort((a, b) => b.similarityPercent - a.similarityPercent).slice(0, 3);
}

/**
 * Erkennt Rolle / Bereich automatisch aus dem Freitext (damit kein Dropdown nötig ist)
 */
export function detectSourceRole(rawText, origin = 'kunde') {
  const lower = String(rawText || '').toLowerCase();
  if (origin === 'betrieb') {
    if (/(support|hotline|ticket|anruf|rückfrage)/.test(lower)) return 'Support & Betrieb';
    if (/(rechnung|mahnung|buchhaltung|beleg|auszug)/.test(lower)) return 'Administration & Finanzen';
    if (/(server|zertifikat|backup|docker|passwort|datenbank|api|deploy)/.test(lower)) return 'IT-Betrieb';
    return 'Betrieb & Team';
  }
  if (/(support|hotline|ticket|wartezeit)/.test(lower)) return 'Nutzende & Support';
  if (/(beleg|auszug|rechnung|pdf|download|dokument)/.test(lower)) return 'Nutzende (Self-Service)';
  if (/(login|passwort|pin|zugang|app|mobile)/.test(lower)) return 'App-Nutzende';
  return 'Kundschaft / Nutzende';
}

/**
 * Erkennt Feedback-Kategorie automatisch aus dem Freitext
 */
export function detectFeedbackType(rawText) {
  const lower = String(rawText || '').toLowerCase();
  if (/(kunde|kundschaft|beschwer|ärger|hotline|frust|absturz|bricht ab|unzufrieden)/.test(lower)) {
    return 'kunden_aerger';
  }
  if (/(zertifikat|compliance|dsg|gesetz|audit|sicherheit|sperr|pin|2fa|frist)/.test(lower)) {
    return 'compliance';
  }
  if (/(manuell|excel|klick|maske|dauer|stunde|warten|prozess|ablauf|nervt|doppelt)/.test(lower)) {
    return 'prozess_engpass';
  }
  return 'idee';
}

/**
 * Erkennt Dringlichkeit automatisch aus Signalwörtern im Freitext
 */
export function detectUrgency(rawText) {
  const lower = String(rawText || '').toLowerCase();
  if (/(ausfall|sperr|absturz|sofort|kritisch|blockiert|bricht ab|beschweren sich dauernd|sicherheitslücke)/.test(lower)) {
    return 'kritisch';
  }
  if (/(nervt|dauernd|ständig|jeden tag|jede woche|hotline|mahnung|frist|warten|stunde|fehler|kompliziert)/.test(lower)) {
    return 'hoch';
  }
  return 'normal';
}

/**
 * Hauptfunktion: Übersetzt rohes Feedback komplett in ein Requirements-Paket
 */
export function analyzeFeedback({
  rawFeedback,
  sourceRole,
  origin = 'kunde',
  feasibility = 'mittel',
  feedbackType,
  urgency,
  votes = 1,
  existingStories = []
}) {
  const cleaned = cleanWhitespace(rawFeedback);
  if (cleaned.length < 10) {
    throw new Error('Bitte beschreibe das Feedback mit mindestens 10 Zeichen.');
  }

  const safeOrigin = origin === 'betrieb' ? 'betrieb' : 'kunde';
  const role = cleanWhitespace(sourceRole) && sourceRole !== 'Auto'
    ? cleanWhitespace(sourceRole)
    : detectSourceRole(cleaned, safeOrigin);
  const resolvedType = feedbackType && feedbackType !== 'auto'
    ? feedbackType
    : detectFeedbackType(cleaned);
  const resolvedUrgency = urgency && urgency !== 'auto'
    ? urgency
    : detectUrgency(cleaned);

  const reqType = classifyRequirementType(cleaned, resolvedType);
  const { mainPart, benefitPart, partKind } = splitGoalAndBenefit(cleaned);
  const goalPhrase = normalizeGoalPhrase(mainPart, resolvedType);
  const benefitPhrase = normalizeBenefitPhrase(benefitPart, partKind, resolvedType, reqType);

  const title = buildShortTitle(mainPart, role);
  const userStory = `Als ${role} möchte ich ${goalPhrase}, damit ${benefitPhrase}.`;
  const tasks = sliceIntoTasks(cleaned, reqType);
  const acceptanceCriteria = generateAcceptanceCriteria(cleaned, role, reqType);
  const { score, moscow, impactLabel, sizeEstimate, totalHours, feasibility: safeFeasibility } = scoreAndPrioritize({
    rawText: cleaned,
    urgency: resolvedUrgency,
    feedbackType: resolvedType,
    votes,
    feasibility,
    tasks
  });
  const duplicates = findPotentialDuplicates(cleaned, existingStories);

  return {
    origin: safeOrigin,
    feasibility: safeFeasibility,
    sourceRole: role,
    feedbackType: resolvedType,
    urgency: resolvedUrgency,
    title,
    userStory,
    reqType,
    moscow,
    impactLabel,
    sizeEstimate,
    totalEstimatedHours: totalHours,
    priorityScore: score,
    tasks,
    acceptanceCriteria,
    duplicates
  };
}
