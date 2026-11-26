/**
 * Lokale, deterministische Requirements-Engine nach Lehrbuch (IREB / Pohl & Rupp).
 * 100 % kostenlos, branchenneutral, ohne externe KI-APIs und ohne vorausgefüllte Annahmen.
 * Übersetzt Rohfeedback in:
 * - Anforderungstyp (FA / NFA / Randbedingung)
 * - Strukturierte User Story ("Als ... möchte ich ..., damit ...")
 * - Prüfbare Akzeptanzkriterien (Gegeben / Wenn / Dann)
 * - MoSCoW-Priorisierung & Duplikat-Radar
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
  if (/^[A-ZÄÖÜ]{2,}/.test(text)) {
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
 * Klassifiziert nach IREB-Lehrbuch:
 * Funktionale Anforderung (FA), Qualitätsanforderung (NFA nach ISO 25010) oder Randbedingung.
 */
export function classifyRequirementType(rawText, feedbackType = 'idee') {
  const lower = String(rawText || '').toLowerCase();
  if (/(gesetz|dsg|dsgvo|compliance|audit|richtlinie|vorschrift|pflicht|norm|regul)/.test(lower) || feedbackType === 'compliance') {
    return 'Randbedingung: Recht & Vorgaben';
  }
  if (/(passwort|pin|login|sicher|berechtigung|zugriff|zertifikat|verschlüssel|schutz|2fa|sperr)/.test(lower)) {
    return 'NFA: Sicherheit & Schutz';
  }
  if (/(langsam|dauer|minute|sekunde|wartezeit|performance|absturz|ausfall|verfügbar|stabil|timeout|hängt)/.test(lower)) {
    return 'NFA: Effizienz & Zeitverhalten';
  }
  if (/(unklar|verwirr|verständ|bedien|klick|übersicht|findet nicht|kompliziert|sprache|fehlermeldung|design)/.test(lower)) {
    return 'NFA: Benutzbarkeit (Usability)';
  }
  return 'FA: Funktionale Anforderung';
}

function splitGoalAndBenefit(rawText) {
  const cleaned = cleanWhitespace(rawText).replace(/[.!?]+$/, '');
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

function normalizeGoalPhrase(mainPart, feedbackType) {
  let phrase = cleanWhitespace(mainPart);
  phrase = phrase
    .replace(/^(es nervt(,?\s*dass)?|kunden\s+beschweren\s+sich(\s+dauernd)?(,?\s*dass)?|wir\s+brauchen(\s+dringend)?|ich\s+möchte|es\s+wäre\s+(gut|super|toll)(,?\s*wenn)?|es\s+fehlt(\s+ein|\s+eine)?|problem:?\s*|idee:?\s*)/i, '')
    .trim();

  if (!phrase) phrase = cleanWhitespace(mainPart);

  if (/(manuell|dauernd|fehler|keine klare meldung|störung|ärger|beschwer|vergessen|kompliziert|absturz|warten)/i.test(phrase)) {
    if (feedbackType === 'kunden_aerger') {
      return `eine klare Lösung für «${phrase}» erhalten`;
    }
    return `den Ablauf «${phrase}» vereinfachen`;
  }

  if (/^(einen?|eine|die|der|das|automatisch)/i.test(phrase)) {
    return `${lowercaseFirst(phrase)} nutzen können`;
  }

  return `${lowercaseFirst(phrase)} umsetzen können`;
}

function normalizeBenefitPhrase(benefitPart, partKind, feedbackType, reqType) {
  const cleaned = cleanWhitespace(benefitPart);
  if (cleaned) {
    if (partKind === 'cause' || /(vergessen|ausfällt|ärger|beschwer|warten|verloren|schief|fehler|versteckt|anruf|rückfrage|doppelt|nachfragen)/.test(cleaned)) {
      return `Rückfragen und Reibung sinken (Ausgangslage: ${lowercaseFirst(cleaned)})`;
    }
    return lowercaseFirst(cleaned);
  }

  if (feedbackType === 'kunden_aerger') {
    return 'wiederkehrende Rückfragen reduziert werden';
  }
  if (reqType.startsWith('Randbedingung')) {
    return 'Vorgaben und Nachweise verlässlich eingehalten werden';
  }
  if (reqType.includes('Usability')) {
    return 'die Nutzung ohne unnötige Hürden gelingt';
  }
  return 'der Bedarf effizient und nachvollziehbar erfüllt wird';
}

/**
 * Zerlegt nur dann in Teilanforderungen, wenn der Rohtext tatsächlich mehrere
 * getrennte Teilpunkte aufzählt — keine erfundenen generischen Checklisten!
 */
export function sliceIntoTasks(rawText) {
  const cleaned = cleanWhitespace(rawText);
  const segments = cleaned
    .split(/\s*(?:;|•|\n|\bund\s+ausserdem\b|\bsowie\b|\bausserdem\b|\bzusätzlich\b)\s*/i)
    .map((s) => cleanWhitespace(s))
    .filter((s) => s.length >= 12);

  if (segments.length <= 1) {
    return [];
  }

  return segments.slice(0, 5).map((seg, idx) => ({
    id: `T${idx + 1}`,
    title: seg.length > 100 ? `${seg.slice(0, 97)}…` : seg,
    estimateHours: 0,
    done: false
  }));
}

/**
 * Prüfbare Akzeptanzkriterien nach Lehrbuch (Gegeben / Wenn / Dann) —
 * strikt branchenneutral, ohne IT-spezifische oder branchenfremde Annahmen.
 */
export function generateAcceptanceCriteria(rawText, role, reqType) {
  const lower = String(rawText || '').toLowerCase();
  const criteria = [
    `Gegeben die Rolle «${role}», wenn der beschriebene Anwendungsfall eintritt, dann ist das erwartete Ergebnis reproduzierbar und ohne Umweg erreichbar.`
  ];

  if (/(fehler|ungültig|sperr|abbruch|meldung|hinweis)/.test(lower)) {
    criteria.push(
      'Gegeben ein Fehler- oder Ausnahmefall, wenn dieser ausgelöst wird, dann erscheint ein verständlicher Hinweis mit klarem nächstem Schritt.'
    );
  } else if (/(export|bericht|liste|auszug|datei|dokument|druck)/.test(lower)) {
    criteria.push(
      'Gegeben relevante Einträge, wenn die Ausgabe erzeugt wird, dann sind alle benötigten Angaben vollständig und korrekt dargestellt.'
    );
  } else if (/(sprache|einstellung|profil|präferenz|dauerhaft|permanent|merken)/.test(lower)) {
    criteria.push(
      'Gegeben eine geänderte Einstellung, wenn eine neue Sitzung oder ein neuer Vorgang startet, dann bleibt die gewählte Einstellung bestehen.'
    );
  } else {
    criteria.push(
      'Gegeben ein typischer Grenz- oder Ausnahmefall, wenn dieser eintritt, dann bleibt das Verhalten eindeutig und nachvollziehbar.'
    );
  }

  criteria.push(
    `Gegeben die Abnahme gemäss Anforderungstyp (${reqType}), wenn die Umsetzung überprüft wird, dann ist die Erfüllung anhand realer Stichproben belegt.`
  );

  return criteria;
}

const FEASIBILITY_BONUS = {
  einfach: 25,
  mittel: 10,
  unbewertet: 0,
  aufwaendig: -5
};

/**
 * Priorisierung nach Nutzen (Meldungen) und optionaler Machbarkeit (Ampel).
 */
export function scoreAndPrioritize({
  rawText,
  urgency = 'normal',
  feedbackType = 'idee',
  votes = 1,
  feasibility = 'unbewertet',
  tasks = []
}) {
  const lower = String(rawText || '').toLowerCase();
  const safeVotes = Math.max(1, Number(votes) || 1);
  const safeFeasibility = Object.hasOwn(FEASIBILITY_BONUS, feasibility) ? feasibility : 'unbewertet';

  let score =
    safeVotes * 6 +
    FEASIBILITY_BONUS[safeFeasibility] +
    (URGENCY_BASE_SCORE[urgency] || 10) * 0.7 +
    (TYPE_BONUS[feedbackType] || 8) * 0.4;

  if (/(ausfall|sperr|kunde|beschwer|frist|dringend|blockiert)/.test(lower)) {
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

  let impactLabel = 'Anforderung';
  if (safeFeasibility === 'einfach' && safeVotes >= 4) {
    impactLabel = 'Quick Win';
  } else if (safeVotes >= 8 && safeFeasibility === 'aufwaendig') {
    impactLabel = 'Grossvorhaben';
  } else if (moscow === 'Must' || moscow === 'Should') {
    impactLabel = 'Hoher Bedarf';
  }

  const totalHours = tasks.reduce((sum, t) => sum + (Number(t.estimateHours) || 0), 0);
  let sizeEstimate = 'Offen';
  if (safeFeasibility === 'einfach') sizeEstimate = 'S';
  else if (safeFeasibility === 'mittel') sizeEstimate = 'M';
  else if (safeFeasibility === 'aufwaendig') sizeEstimate = 'L';

  return { score, moscow, impactLabel, sizeEstimate, totalHours, feasibility: safeFeasibility };
}

function buildShortTitle(mainPart, role) {
  let clean = cleanWhitespace(mainPart)
    .replace(/^(es nervt(,?\s*dass)?|kunden\s+beschweren\s+sich(,?\s*dass)?|wir\s+brauchen(\s+dringend)?|es\s+fehlt\s+)/i, '')
    .trim();

  if (!clean) clean = `Anforderung (${role})`;
  clean = capitalizeFirst(clean);
  if (clean.length > 72) {
    clean = `${clean.slice(0, 69).replace(/\s+\S*$/, '')}…`;
  }
  return clean;
}

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
 * Branchenneutrale Stakeholder-Rolle (ohne branchenspezifische Unterstellungen).
 */
export function detectSourceRole(_rawText, origin = 'kunde') {
  if (origin === 'betrieb') return 'Team / Betrieb';
  return 'Nutzende / Kundschaft';
}

export function detectFeedbackType(rawText) {
  const lower = String(rawText || '').toLowerCase();
  if (/(kunde|kundschaft|beschwer|ärger|frust|absturz|bricht ab|unzufrieden)/.test(lower)) {
    return 'kunden_aerger';
  }
  if (/(gesetz|compliance|dsg|dsgvo|audit|sicherheit|sperr|frist|vorschrift)/.test(lower)) {
    return 'compliance';
  }
  if (/(manuell|dauer|stunde|warten|prozess|ablauf|nervt|doppelt|umständlich)/.test(lower)) {
    return 'prozess_engpass';
  }
  return 'idee';
}

export function detectUrgency(rawText) {
  const lower = String(rawText || '').toLowerCase();
  if (/(ausfall|sperr|absturz|sofort|kritisch|blockiert|bricht ab|beschweren sich dauernd|sicherheitslücke)/.test(lower)) {
    return 'kritisch';
  }
  if (/(nervt|dauernd|ständig|jeden tag|jede woche|frist|warten|fehler|kompliziert)/.test(lower)) {
    return 'hoch';
  }
  return 'normal';
}

export function analyzeFeedback({
  rawFeedback,
  sourceRole,
  origin = 'kunde',
  feasibility = 'unbewertet',
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
  const tasks = sliceIntoTasks(cleaned);
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
