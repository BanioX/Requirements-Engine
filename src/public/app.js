const currentYear = new Date().getFullYear();

function getOrCreateClientId() {
  let id = localStorage.getItem('re_client_id');
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 36);
    localStorage.setItem('re_client_id', id);
  }
  return id;
}

const CLIENT_ID = getOrCreateClientId();

// Open-Source Lucide Icons (MIT License — 100 % inline SVG, ohne externes CDN)
const LUCIDE = {
  clock: '<svg class="lucide" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  thumbsUp: '<svg class="lucide" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>',
  thumbsDown: '<svg class="lucide" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>',
  user: '<svg class="lucide" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  shieldCheck: '<svg class="lucide" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>',
  logOut: '<svg class="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>',
  barChart: '<svg class="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
  trash: '<svg class="lucide" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  copy: '<svg class="lucide" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
  users: '<svg class="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  gitMerge: '<svg class="lucide" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>',
  check: '<svg class="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  minus: '<svg class="lucide" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
  messageSquare: '<svg class="lucide" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
};

const I18N = {
  de: {
    search: 'Suchen',
    install: 'Installieren',
    report: 'Report',
    board: 'Board',
    titlePlaceholder: 'Titel der Idee',
    capturePlaceholder: 'Beschrieb der Idee oder des Problems…',
    valueLabel: 'Mehrwert',
    valZeitersparnis: 'Effizienz',
    valKundenaufwand: 'Kundenerlebnis',
    valErklaerung: 'Klarheit',
    valFehler: 'Qualität',
    valUmsatz: 'Umsatz',
    valBindung: 'Kundenbindung',
    authorPlaceholder: 'Erfasst von',
    refPlaceholder: 'Referenz',
    timePlaceholder: 'Zeit',
    secShort: 'Sek',
    clear: 'Leeren',
    submit: 'Erfassen',
    chPersonal: 'Persönlich',
    chPhone: 'Telefon',
    chChat: 'Chat',
    chEmail: 'E-Mail',
    all: 'Alle',
    easy: 'Einfach',
    medium: 'Mittel',
    complex: 'Aufwändig',
    unrated: 'Unbewertet',
    inProgress: 'In Arbeit',
    done: 'Erledigt',
    implemented: 'Umgesetzt',
    inReview: 'In Prüfung',
    reviewed: 'Geprüft',
    rejected: 'Abgelehnt',
    newBadge: 'Neu',
    open: 'Offen',
    empty: 'Noch keine Einträge.',
    today: 'Heute',
    d7: '7 T.',
    d30: '30 T.',
    year: 'Jahr',
    prevYear: 'Vorjahr',
    perDay: 'Pro Tag',
    perWeek: 'Pro Woche',
    perMonth: 'Pro Monat',
    perYear: 'Pro Jahr',
    exportPdf: 'PDF exportieren',
    timeBasis: 'Zeitbasis:',
    fallbackEmpty: 'Fallback falls leer:',
    measured: 'Echt erfasst',
    projected: 'Hochrechnung (~)',
    commentsLbl: 'Kommentar-Sichtbarkeit',
    commentsDesc: 'Steuert, ob normale Nutzer fremde Einzelfälle sehen.',
    visAll: 'Alle sehen alle',
    visOwn: 'Nur eigene (Chef alle)',
    signIn: 'Anmelden',
    signInProfile: 'Anmelden',
    register: 'Konto erstellen',
    signOut: 'Abmelden',
    rolesAndUsers: 'Rechte & Benutzer',
    rolesModalTitle: 'Rechtematrix & Benutzer',
    rolesModalHint: 'Rollen pro Person per Klick zuweisen (mehrere Admins, Manager, Devs & Supervisoren möglich).',
    auditLog: 'Audit-Protokoll',
    auditEmpty: 'Noch keine Einträge im Protokoll.',
    matrixTitle: 'Rechtematrix',
    colRole: 'Rolle',
    colCapture: 'Erfassen',
    colAllComm: 'Kommentare',
    colReview: 'Prüfen',
    colDevelop: 'Umsetzen',
    colDecide: 'Entscheid',
    colReport: 'Report',
    colRights: 'Rechte',
    registeredUsers: 'Registrierte Benutzer',
    noAccounts: 'Keine Konten vorhanden.',
    loading: 'Lade…',
    hintFirstAdmin: 'Erstes Konto erhält automatisch Admin-Rechte (Chef).',
    hintNewUser: 'Neues Nutzer-Konto für dein Team.',
    hintLogin: 'Mit Benutzername und Passwort anmelden.',
    username: 'Benutzername',
    password: 'Passwort',
    customerOpt: 'Kunde (optional)',
    loggedBy: 'Erfasst von',
    caseFeedback: 'Kundenfeedback zu diesem Fall (optional)…',
    addVote: '+1 Erfassen',
    voteTitle: 'Upvote mit Zeitaufwand erfassen (min. 1 Min.)',
    casesTitle: 'Feedbacks & Logs',
    ownCasesTitle: 'Eigene Feedbacks',
    showLess: 'Weniger',
    showAllPrefix: 'Alle',
    showAllSuffix: 'anzeigen',
    noCases: 'Noch keine Einzelfälle erfasst.',
    noNote: 'Ohne Zusatztext erfasst',
    customer: 'Kunde',
    merge: 'Zusammenführen',
    mergePrompt: 'In welches Zielthema zusammenführen?',
    cancel: 'Abbrechen',
    noMergeTarget: 'Kein weiteres Thema vorhanden.',
    delete: 'Löschen',
    saveNote: 'Notiz sichern',
    notePlaceholder: 'Interne Fachnotiz…',
    statusAndReason: 'Status & Begründung',
    rejectBtn: 'Ablehnen',
    reasonPlaceholder: 'Begründung zum Entscheid…',
    internalOpt: 'Interne Fachnotiz (optional)',
    save: 'Speichern',
    send: 'Senden',
    decisionLbl: 'Entscheid:',
    decFeedbackPlaceholder: 'Kurze Rückmeldung zum Entscheid…',
    feedbackDecisionKey: 'Entscheid',
    internalNoteKey: 'Fachnotiz',
    questionsTitle: 'Rückfragen',
    askQuestionPlaceholder: 'Rückfrage an den Erfasser schreiben…',
    askBtn: 'Rückfrage senden',
    replyPlaceholder: 'Deine Antwort auf diese Rückfrage…',
    replyBtn: 'Antworten',
    onlyAuthorHint: 'Nur die Person, welche den Fall erfasst hat, kann antworten.',
    notifTitle: 'Benachrichtigungen',
    notifEmpty: 'Keine Benachrichtigungen.',
    notifMarkAll: 'Alle gelesen',
    subImplemented: 'Abo: Umgesetzt',
    subThreshold: 'Abo: Ab 5×',
    subDecision: 'Abo: Entscheide',
    subSaved: 'Benachrichtigungs-Abo aktualisiert.',
    relRelevant: 'Relevant',
    relIrrelevant: 'Irrelevant',
    relLogTitle: 'Relevanz-Protokoll',
    minorityHint: 'Minderheitsstimme erkannt — gezielt nachfragen:',
    toastRelSaved: 'Relevanz gespeichert.',
    toastQuestionSent: 'Rückfrage gesendet (+1).',
    toastReplySent: 'Antwort gesendet (+1).',
    roleDev: 'Dev',
    roleOwner: 'Autor',
    copy: 'Kopieren',
    reReview: 'Neu prüfen',
    afterReject: 'nach Ablehnung',
    followupUseful: 'Rückmeldung sinnvoll',
    refShort: 'Ref.',
    moreSuffix: 'weitere',
    repTitle: 'Management-Report',
    repPeriod: 'Zeitraum',
    repFeasLbl: 'Aufwand',
    repBasis: 'Basis',
    repGenerated: 'Erstellt am',
    repTopics: 'Themen',
    repTotalInq: 'Anfragen Total',
    repWithTime: 'mit Zeitaufwand',
    repEffort: 'Ressourcen-Aufwand',
    repNoTimes: 'Noch keine Zeiten erfasst',
    repWorkdays: 'Arbeitstage',
    repOf: 'von',
    repRate: 'Umsetzungsquote',
    repQuickWins: 'Quick Wins (Einfach)',
    repAmpel: 'Umsetzungsaufwand',
    repDrivers: 'Top Ressourcen-Treiber (Meldungen & Dauer)',
    repNoFilterMatch: 'Keine Einträge im gewählten Filter.',
    repNoTimeline: 'Keine Verlaufdaten im gewählten Zeitraum.',
    repNoTime: 'keine Zeit',
    repTrendPer: 'Verlauf pro',
    repAllTopics: '(alle Themen)',
    repPeak: 'Spitze',
    repShowAllTopics: 'Alle Themen',
    repOverview: 'Einzelübersicht',
    repEmptyTable: 'Keine Einträge im gewählten Zeitraum.',
    repSavings: 'Wirkung & Einsparung',
    repImplTopics: 'umgesetzte Themen',
    repSolvedInq: 'gelöste Anfragen',
    repPressure: 'Wiedervorlage & Handlungsdruck',
    repAfterwards: 'danach',
    repCredits: 'Ideengeber & Credits',
    repIdeaOne: 'Idee',
    repIdeas: 'Ideen',
    repMentions: 'Meldungen',
    thDate: 'Datum',
    thTopic: 'Thema',
    thAuthor: 'Erfasst von',
    thChannel: 'Kanal',
    thAmpel: 'Aufwand',
    thStatus: 'Status',
    thVolume: 'Menge',
    thDuration: 'Dauer',
    granDay: 'Tag',
    granWeek: 'Woche',
    granMonth: 'Monat',
    granYear: 'Jahr',
    mgrAccess: 'Manager-Freigabe',
    unlock: 'Freischalten',
    roleUser: 'Nutzer',
    roleSupervisor: 'Supervisor',
    roleManager: 'Manager',
    roleAdmin: 'Admin',
    entries: 'Einträge',
    dbDisconnected: 'DB getrennt',
    toastSaved: 'Gespeichert.',
    toastCaptured: 'Erfasst.',
    toastCopied: 'Kopiert.',
    toastCopyFail: 'Kopieren fehlgeschlagen.',
    toastDeleted: 'Gelöscht.',
    toastMerged: 'Themen verlustfrei zusammengeführt.',
    toastSignedOut: 'Abgemeldet.',
    toastNoteSaved: 'Notiz gespeichert.',
    toastDecFbSaved: 'Rückmeldung zum Entscheid gespeichert.',
    toastVoteDown: 'Unzufriedenheit gezählt.',
    toastVoteUp: 'Zustimmung gezählt.',
    toastMinTime: 'Mindestens 1 Minute Zeitaufwand (z. B. 01:00) erfassen.',
    toastVisOwn: 'Aktiv: User sehen nur eigene Kommentare (Chef sieht alle).',
    toastVisAll: 'Aktiv: Alle sehen alle Kommentare.',
    toastSimilarTo: 'Ähnlich zu',
    iosInstallTitle: 'Als iPhone-App installieren',
    iosInstallHint: 'Direkt als eigenständige App auf dem Home-Bildschirm speichern:',
    iosStep1: 'In Safari unten auf das Teilen-Symbol tippen.',
    iosStep2: 'Nach unten scrollen und «Zum Home-Bildschirm» wählen.',
    iosStep3: 'Oben rechts auf «Hinzufügen» tippen — fertig.',
    iosInstallOk: 'Verstanden'
  },
  en: {
    search: 'Search',
    install: 'Install',
    report: 'Report',
    board: 'Board',
    titlePlaceholder: 'Idea title',
    capturePlaceholder: 'Description of the idea or problem…',
    valueLabel: 'Value',
    valZeitersparnis: 'Efficiency',
    valKundenaufwand: 'Experience',
    valErklaerung: 'Clarity',
    valFehler: 'Quality',
    valUmsatz: 'Revenue',
    valBindung: 'Retention',
    authorPlaceholder: 'Logged by',
    refPlaceholder: 'Reference',
    timePlaceholder: 'Time',
    secShort: 'Sec',
    clear: 'Clear',
    submit: 'Submit',
    chPersonal: 'In-person',
    chPhone: 'Phone',
    chChat: 'Chat',
    chEmail: 'E-mail',
    all: 'All',
    easy: 'Easy',
    medium: 'Medium',
    complex: 'Complex',
    unrated: 'Unrated',
    inProgress: 'In progress',
    done: 'Done',
    implemented: 'Implemented',
    inReview: 'In review',
    reviewed: 'Reviewed',
    rejected: 'Rejected',
    newBadge: 'New',
    open: 'Open',
    empty: 'No entries yet.',
    today: 'Today',
    d7: '7d',
    d30: '30d',
    year: 'Year',
    prevYear: 'Prev year',
    perDay: 'Daily',
    perWeek: 'Weekly',
    perMonth: 'Monthly',
    perYear: 'Yearly',
    exportPdf: 'Export PDF',
    timeBasis: 'Time basis:',
    fallbackEmpty: 'Fallback if empty:',
    measured: 'Recorded',
    projected: 'Projected (~)',
    commentsLbl: 'Comment visibility',
    commentsDesc: 'Controls whether regular users see other users’ comments.',
    visAll: 'All visible',
    visOwn: 'Own only (Admin all)',
    signIn: 'Sign in',
    signInProfile: 'Sign in',
    register: 'Create account',
    signOut: 'Sign out',
    rolesAndUsers: 'Roles & Users',
    rolesModalTitle: 'Roles & Permissions',
    rolesModalHint: 'Assign roles per person with one click (multiple admins, managers, devs & supervisors supported).',
    auditLog: 'Audit Log',
    auditEmpty: 'No audit log entries yet.',
    matrixTitle: 'Permission Matrix',
    colRole: 'Role',
    colCapture: 'Capture',
    colAllComm: 'Comments',
    colReview: 'Review',
    colDevelop: 'Build',
    colDecide: 'Decide',
    colReport: 'Report',
    colRights: 'Rights',
    registeredUsers: 'Registered Users',
    noAccounts: 'No accounts yet.',
    loading: 'Loading…',
    hintFirstAdmin: 'The first account automatically gets Admin rights.',
    hintNewUser: 'Create a new user account for your team.',
    hintLogin: 'Sign in with username and password.',
    username: 'Username',
    password: 'Password',
    customerOpt: 'Customer (optional)',
    loggedBy: 'Logged by',
    caseFeedback: 'Customer feedback for this case (optional)…',
    addVote: '+1 Submit',
    voteTitle: 'Log +1 case with time spent (min. 1 min)',
    casesTitle: 'Feedback & Logs',
    ownCasesTitle: 'My Feedback',
    showLess: 'Show less',
    showAllPrefix: 'Show all',
    showAllSuffix: '',
    noCases: 'No individual cases logged yet.',
    noNote: 'Logged without note',
    customer: 'Customer',
    merge: 'Merge',
    mergePrompt: 'Merge into which target topic?',
    cancel: 'Cancel',
    noMergeTarget: 'No other topic available.',
    delete: 'Delete',
    saveNote: 'Save note',
    notePlaceholder: 'Internal note…',
    statusAndReason: 'Status & Decision',
    rejectBtn: 'Reject',
    reasonPlaceholder: 'Reason for decision…',
    internalOpt: 'Internal note (optional)',
    save: 'Save',
    send: 'Send',
    decisionLbl: 'Decision:',
    decFeedbackPlaceholder: 'Brief feedback on this decision…',
    feedbackDecisionKey: 'Decision',
    internalNoteKey: 'Technical note',
    questionsTitle: 'Questions',
    askQuestionPlaceholder: 'Ask the author a clarification question…',
    askBtn: 'Send question',
    replyPlaceholder: 'Your answer to this question…',
    replyBtn: 'Reply',
    onlyAuthorHint: 'Only the person who logged this case can reply.',
    notifTitle: 'Notifications',
    notifEmpty: 'No notifications.',
    notifMarkAll: 'Mark all read',
    subImplemented: 'Alert: Done',
    subThreshold: 'Alert: 5×+',
    subDecision: 'Alert: Decisions',
    subSaved: 'Notification alert updated.',
    relRelevant: 'Relevant',
    relIrrelevant: 'Irrelevant',
    relLogTitle: 'Relevance Log',
    minorityHint: 'Minority opinion detected — worth asking directly:',
    toastRelSaved: 'Relevance recorded.',
    toastQuestionSent: 'Question sent (+1).',
    toastReplySent: 'Reply sent (+1).',
    roleDev: 'Dev',
    roleOwner: 'Author',
    copy: 'Copy',
    reReview: 'Re-review',
    afterReject: 'after rejection',
    followupUseful: 'Follow-up useful',
    refShort: 'ref.',
    moreSuffix: 'more',
    repTitle: 'Management Report',
    repPeriod: 'Period',
    repFeasLbl: 'Effort',
    repBasis: 'Basis',
    repGenerated: 'Generated on',
    repTopics: 'Topics',
    repTotalInq: 'Total Inquiries',
    repWithTime: 'with recorded time',
    repEffort: 'Resource Effort',
    repNoTimes: 'No times recorded yet',
    repWorkdays: 'workdays',
    repOf: 'of',
    repRate: 'Completion Rate',
    repQuickWins: 'Quick Wins (Easy)',
    repAmpel: 'Implementation Effort',
    repDrivers: 'Top Resource Drivers (Volume & Time)',
    repNoFilterMatch: 'No entries match the selected filter.',
    repNoTimeline: 'No timeline data in selected range.',
    repNoTime: 'no time',
    repTrendPer: 'Trend per',
    repAllTopics: '(all topics)',
    repPeak: 'Peak',
    repShowAllTopics: 'All topics',
    repOverview: 'Detailed Overview',
    repEmptyTable: 'No entries in selected period.',
    repSavings: 'Impact & Savings',
    repImplTopics: 'implemented topics',
    repSolvedInq: 'resolved inquiries',
    repPressure: 'Re-review & Pressure',
    repAfterwards: 'afterwards',
    repCredits: 'Contributors & Credits',
    repIdeaOne: 'idea',
    repIdeas: 'ideas',
    repMentions: 'mentions',
    thDate: 'Date',
    thTopic: 'Topic',
    thAuthor: 'Logged by',
    thChannel: 'Channel',
    thAmpel: 'Effort',
    thStatus: 'Status',
    thVolume: 'Volume',
    thDuration: 'Duration',
    granDay: 'Day',
    granWeek: 'Week',
    granMonth: 'Month',
    granYear: 'Year',
    mgrAccess: 'Manager Access',
    unlock: 'Unlock',
    roleUser: 'User',
    roleSupervisor: 'Supervisor',
    roleManager: 'Manager',
    roleAdmin: 'Admin',
    entries: 'entries',
    dbDisconnected: 'DB disconnected',
    toastSaved: 'Saved.',
    toastCaptured: 'Captured.',
    toastCopied: 'Copied.',
    toastCopyFail: 'Copy failed.',
    toastDeleted: 'Deleted.',
    toastMerged: 'Topics merged losslessly.',
    toastSignedOut: 'Signed out.',
    toastNoteSaved: 'Note saved.',
    toastDecFbSaved: 'Decision feedback saved.',
    toastVoteDown: 'Disagreement recorded.',
    toastVoteUp: 'Approval recorded.',
    toastMinTime: 'Please record at least 1 minute (e.g. 01:00).',
    toastVisOwn: 'Active: Users only see own comments (Admins see all).',
    toastVisAll: 'Active: Everyone sees all comments.',
    toastSimilarTo: 'Similar to',
    iosInstallTitle: 'Install as iPhone App',
    iosInstallHint: 'Save directly to your Home Screen as a standalone app:',
    iosStep1: 'Tap the Share icon at the bottom of Safari.',
    iosStep2: 'Scroll down and choose «Add to Home Screen».',
    iosStep3: 'Tap «Add» in the top-right corner — done.',
    iosInstallOk: 'Got it'
  }
};

function t(key) {
  return I18N[state.lang]?.[key] ?? I18N.de[key] ?? key;
}

function roleLabelFor(roleId) {
  if (roleId === 'admin') return t('roleAdmin');
  if (roleId === 'manager') return t('roleManager');
  if (roleId === 'dev') return t('roleDev');
  if (roleId === 'supervisor') return t('roleSupervisor');
  if (roleId === 'owner') return t('roleOwner');
  return t('roleUser');
}

function roleBadgeHtml(roleId) {
  const cls =
    roleId === 'dev'
      ? 'tag-role-dev'
      : roleId === 'supervisor'
        ? 'tag-role-supervisor'
        : roleId === 'owner'
          ? 'tag-role-owner'
          : roleId === 'admin' || roleId === 'manager'
            ? 'tag-blue'
            : '';
  return `<span class="tag-mini ${cls}">${esc(roleLabelFor(roleId))}</span>`;
}

function channelDisplay(ch) {
  if (state.lang !== 'en') return ch;
  if (ch === 'Persönlich') return 'In-person';
  if (ch === 'Telefon') return 'Phone';
  if (ch === 'E-Mail') return 'E-mail';
  return ch;
}

function feasDisplay(f) {
  if (f === 'einfach') return t('easy');
  if (f === 'mittel') return t('medium');
  if (f === 'aufwaendig') return t('complex');
  if (f === 'Alle') return t('all');
  return t('unrated');
}

function statusDisplay(s) {
  if (s === 'Umgesetzt') return t('done');
  if (s === 'Abgelehnt') return t('rejected');
  if (s === 'In Arbeit' || s === 'Angenommen') return t('inProgress');
  if (s === 'In Prüfung') return t('inReview');
  if (s === 'Geprüft' || s === 'Bereit') return t('reviewed');
  if (s === 'Offen') return t('open');
  if (s === 'Alle') return t('all');
  return t('newBadge');
}

const BUSINESS_VALUE_KEYS = {
  zeitersparnis: 'valZeitersparnis',
  kundenaufwand: 'valKundenaufwand',
  erklaerung: 'valErklaerung',
  fehler: 'valFehler',
  umsatz: 'valUmsatz',
  bindung: 'valBindung'
};

function valueDisplay(code) {
  const key = BUSINESS_VALUE_KEYS[code];
  return key ? t(key) : code;
}

const state = {
  lang: localStorage.getItem('re_lang') === 'en' ? 'en' : 'de',
  view: 'board', // 'board' | 'report'
  user: null, // { id, username, displayName, role }
  hasAdmin: false,
  authMode: 'login', // 'login' | 'register'
  channel: '',
  businessValues: new Set(),
  ampel: 'alle',
  mode: 'all', // 'all' | 'active' | 'done'
  commentsVisibility: 'all', // 'all' | 'own_only'
  expandedId: null,
  expandedMentions: [],
  expandedQuestions: [],
  expandedIsOwner: false,
  expandedRelevance: null,
  notifications: [],
  unreadNotifs: 0,
  subscription: { onImplemented: true, onThreshold: false, thresholdCount: 5, onDecision: false },
  activeMentionId: null,
  showAllMentions: false,
  mergeSourceId: null,
  rolesTab: 'matrix', // 'matrix' | 'audit'
  allStoriesCache: [],
  effortId: null,
  effortChannel: '',
  freshId: null,
  pendingStatus: null,
  pendingDecFeedback: null, // { id, sentiment }
  votedIds: new Set(JSON.parse(localStorage.getItem('re_voted') || '[]')),
  composerDurationSec: 0,
  report: {
    from: `${currentYear}-01-01`,
    to: `${currentYear}-12-31`,
    granularity: 'month', // 'day' | 'week' | 'month' | 'year'
    storyId: null,
    feasibility: 'Alle',
    status: 'Alle',
    timeMode: 'measured', // 'measured' | 'projected'
    minutesPerRequest: 5,
    hourlyRate: '',
    managerPin: sessionStorage.getItem('re_mgr_pin') || ''
  }
};

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDateCH(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function parseMMSS(raw) {
  const txt = String(raw ?? '').trim();
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

function fmtMMSS(totalSec) {
  const sec = Math.max(0, Math.round(Number(totalSec) || 0));
  if (sec === 0) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtDurationHuman(totalSec, { estimated = false } = {}) {
  const sec = Math.max(0, Math.round(Number(totalSec) || 0));
  if (sec === 0) return '–';
  const prefix = estimated ? '~' : '';
  const hours = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const remSec = sec % 60;
  if (hours > 0) {
    return `${prefix}${hours} h ${String(mins).padStart(2, '0')} m`;
  }
  if (mins > 0) {
    return remSec > 0 ? `${prefix}${mins}m ${String(remSec).padStart(2, '0')}s` : `${prefix}${mins}m`;
  }
  return `${prefix}${remSec}s`;
}

// --- Wiederverwendbarer Zeit- & 2-Spalten Scroll-Wheel Picker (ohne Dropdown-Menüs) ---
function renderDurationPickerHtml({ idAttr = '', initialSec = 0, placeholder = 'Zeit' } = {}) {
  const minItems = Array.from({ length: 61 }, (_, i) => {
    const lbl = String(i).padStart(2, '0');
    return `<div class="wheel-opt" data-val="${i}">${lbl}</div>`;
  }).join('');

  const secItems = Array.from({ length: 12 }, (_, idx) => {
    const val = idx * 5;
    const lbl = String(val).padStart(2, '0');
    return `<div class="wheel-opt" data-val="${val}">${lbl}</div>`;
  }).join('');

  const valStr = initialSec > 0 ? fmtMMSS(initialSec) : '';
  return `
    <div class="dur-picker" data-dur-picker ${idAttr ? `id="${esc(idAttr)}"` : ''} data-sec="${initialSec}">
      <span class="dur-icon" aria-hidden="true">${LUCIDE.clock}</span>
      <input
        type="text"
        class="dur-input"
        inputmode="numeric"
        placeholder="${esc(placeholder)}"
        value="${esc(valStr)}"
        aria-label="Zeitaufwand (Minuten:Sekunden)"
        title="Zeitaufwand z. B. 04:30 eingeben oder mit Mausrad drehen"
      />
      <button type="button" class="dur-wheel-btn" aria-label="Zeitrad öffnen" title="Zeitrad (Min : Sek)">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="dur-popover hidden" role="dialog" aria-label="Zeitaufwand wählen">
        <div class="wheel-head"><span>Min</span><span></span><span>${esc(t('secShort'))}</span></div>
        <div class="wheel-body">
          <div class="wheel-highlight" aria-hidden="true"></div>
          <div class="wheel-col" data-wheel="min">${minItems}</div>
          <div class="wheel-colon">:</div>
          <div class="wheel-col" data-wheel="sec">${secItems}</div>
        </div>
        <div class="wheel-foot">
          <button type="button" class="text-link js-wheel-clear">${esc(t('clear'))}</button>
          <button type="button" class="st-btn active js-wheel-done" style="padding:3px 10px;">OK</button>
        </div>
      </div>
    </div>
  `;
}

function bindDurationPicker(pickerEl, onChange) {
  if (!pickerEl || pickerEl.dataset.bound === '1') return;
  pickerEl.dataset.bound = '1';

  const input = pickerEl.querySelector('.dur-input');
  const toggleBtn = pickerEl.querySelector('.dur-wheel-btn');
  const popover = pickerEl.querySelector('.dur-popover');
  const minCol = pickerEl.querySelector('[data-wheel="min"]');
  const secCol = pickerEl.querySelector('[data-wheel="sec"]');
  const ITEM_H = 32;
  let syncingWheel = false;

  function highlightSelected(minVal, secVal) {
    minCol.querySelectorAll('.wheel-opt').forEach((el) => {
      el.classList.toggle('is-selected', Number(el.dataset.val) === minVal);
    });
    const nearestSec = Math.round(secVal / 5) * 5;
    secCol.querySelectorAll('.wheel-opt').forEach((el) => {
      el.classList.toggle('is-selected', Number(el.dataset.val) === (nearestSec >= 60 ? 55 : nearestSec));
    });
  }

  function scrollWheelsTo(totalSec, smoothScroll = false) {
    const m = Math.min(60, Math.floor(totalSec / 60));
    const s = totalSec % 60;
    const secIdx = Math.min(11, Math.round(s / 5));
    syncingWheel = true;
    minCol.scrollTo({ top: m * ITEM_H, behavior: smoothScroll ? 'smooth' : 'auto' });
    secCol.scrollTo({ top: secIdx * ITEM_H, behavior: smoothScroll ? 'smooth' : 'auto' });
    highlightSelected(m, s);
    setTimeout(() => {
      syncingWheel = false;
    }, smoothScroll ? 220 : 40);
  }

  function setSeconds(totalSec, { syncText = true, syncWheel = true, smoothScroll = false } = {}) {
    const clamped = Math.max(0, Math.min(28800, Math.round(totalSec || 0)));
    pickerEl.dataset.sec = String(clamped);
    if (syncText) {
      input.value = clamped > 0 ? fmtMMSS(clamped) : '';
    }
    if (syncWheel && !popover.classList.contains('hidden')) {
      scrollWheelsTo(clamped, smoothScroll);
    }
    if (typeof onChange === 'function') onChange(clamped);
  }

  function openPopover() {
    document.querySelectorAll('.dur-popover:not(.hidden)').forEach((other) => {
      if (other !== popover) {
        other.classList.add('hidden');
        other.closest('.dur-picker')?.classList.remove('is-open');
      }
    });
    popover.classList.remove('hidden');
    pickerEl.classList.add('is-open');
    scrollWheelsTo(Number(pickerEl.dataset.sec || 0), false);
  }

  function closePopover() {
    popover.classList.add('hidden');
    pickerEl.classList.remove('is-open');
  }

  toggleBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (popover.classList.contains('hidden')) openPopover();
    else closePopover();
  });

  // Direkte M:S Eingabe
  input.addEventListener('input', () => {
    const sec = parseMMSS(input.value);
    pickerEl.dataset.sec = String(sec);
    if (!popover.classList.contains('hidden')) {
      scrollWheelsTo(sec, false);
    }
    if (typeof onChange === 'function') onChange(sec);
  });

  input.addEventListener('blur', () => {
    const sec = parseMMSS(input.value);
    setSeconds(sec, { syncText: true, syncWheel: false });
  });

  // Mausrad direkt über dem M:S-Feld (±15s, mit Shift ±60s)
  input.addEventListener(
    'wheel',
    (ev) => {
      ev.preventDefault();
      const step = ev.shiftKey ? 60 : 15;
      const cur = Number(pickerEl.dataset.sec || 0);
      const next = ev.deltaY < 0 ? cur + step : Math.max(0, cur - step);
      setSeconds(next, { syncText: true, syncWheel: true, smoothScroll: false });
    },
    { passive: false }
  );

  // Pfeiltasten ↑ / ↓ im Eingabefeld
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
      ev.preventDefault();
      const step = ev.shiftKey ? 60 : 15;
      const cur = Number(pickerEl.dataset.sec || 0);
      const next = ev.key === 'ArrowUp' ? cur + step : Math.max(0, cur - step);
      setSeconds(next, { syncText: true, syncWheel: true, smoothScroll: false });
    } else if (ev.key === 'Escape') {
      closePopover();
    }
  });

  // 2-Spalten Scroll-Wheel synchronisieren
  let scrollTimer = null;
  function handleWheelScroll() {
    if (syncingWheel) return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const m = Math.max(0, Math.min(60, Math.round(minCol.scrollTop / ITEM_H)));
      const sIdx = Math.max(0, Math.min(11, Math.round(secCol.scrollTop / ITEM_H)));
      const s = sIdx * 5;
      highlightSelected(m, s);
      setSeconds(m * 60 + s, { syncText: true, syncWheel: false });
    }, 55);
  }
  minCol.addEventListener('scroll', handleWheelScroll, { passive: true });
  secCol.addEventListener('scroll', handleWheelScroll, { passive: true });

  // Klick direkt auf eine Zahl im Wheel
  minCol.addEventListener('click', (ev) => {
    const opt = ev.target.closest('.wheel-opt');
    if (!opt) return;
    ev.stopPropagation();
    const curS = Number(pickerEl.dataset.sec || 0) % 60;
    const m = Number(opt.dataset.val);
    setSeconds(m * 60 + curS, { syncText: true, syncWheel: true, smoothScroll: true });
  });

  secCol.addEventListener('click', (ev) => {
    const opt = ev.target.closest('.wheel-opt');
    if (!opt) return;
    ev.stopPropagation();
    const curM = Math.floor(Number(pickerEl.dataset.sec || 0) / 60);
    const s = Number(opt.dataset.val);
    setSeconds(curM * 60 + s, { syncText: true, syncWheel: true, smoothScroll: true });
  });

  // Leeren / OK im Zeitrad
  popover.querySelector('.js-wheel-clear')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    setSeconds(0, { syncText: true, syncWheel: true, smoothScroll: true });
  });
  popover.querySelector('.js-wheel-done')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    closePopover();
  });

  popover.addEventListener('click', (ev) => ev.stopPropagation());

  pickerEl._setSeconds = setSeconds;
}

document.addEventListener('click', (ev) => {
  if (!ev.target.closest('.dur-picker')) {
    document.querySelectorAll('.dur-popover:not(.hidden)').forEach((pop) => {
      pop.classList.add('hidden');
      pop.closest('.dur-picker')?.classList.remove('is-open');
    });
  }
});

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), 2400);
}

async function api(url, options = {}) {
  const baseHeaders = {
    'Content-Type': 'application/json',
    'x-client-token': CLIENT_ID
  };
  if (state.report.managerPin) baseHeaders['x-manager-pin'] = state.report.managerPin;

  const res = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: { ...baseHeaders, ...(options.headers || {}) }
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function isAdminUser() {
  return state.user?.role === 'admin';
}

function canViewReports() {
  return ['admin', 'manager'].includes(state.user?.role) || !state.hasAdmin;
}

function canSeeAllCommentsUi() {
  return ['admin', 'manager', 'dev', 'supervisor'].includes(state.user?.role);
}

function canReviewUi() {
  return ['admin', 'manager', 'dev', 'supervisor'].includes(state.user?.role) || !state.hasAdmin;
}

function canDevelopUi() {
  return ['admin', 'manager', 'dev'].includes(state.user?.role) || !state.hasAdmin;
}

function canDecideUi() {
  return ['admin', 'manager'].includes(state.user?.role) || !state.hasAdmin;
}

async function loadNotifications() {
  try {
    const res = await api('/api/notifications');
    state.notifications = Array.isArray(res.items) ? res.items : [];
    state.unreadNotifs = Number(res.unreadCount) || 0;
    if (res.subscription) {
      state.subscription = res.subscription;
    }
    renderNotifications();
  } catch {
    // still fail silently on offline
  }
}

function renderNotifications() {
  const badge = document.getElementById('notif-badge');
  const pop = document.getElementById('notif-popover');
  if (badge) {
    badge.textContent = String(state.unreadNotifs > 9 ? '9+' : state.unreadNotifs);
    badge.classList.toggle('hidden', state.unreadNotifs <= 0);
  }
  if (!pop) return;
  const sub = state.subscription || { onImplemented: true, onThreshold: false, thresholdCount: 5, onDecision: false };
  const subBarHtml = `
    <div class="sub-bar" role="group" aria-label="Smart Alerts">
      <button type="button" class="sub-pill js-sub-toggle ${sub.onImplemented ? 'active' : ''}" data-sub="onImplemented">${esc(t('subImplemented'))}</button>
      <button type="button" class="sub-pill js-sub-toggle ${sub.onThreshold ? 'active' : ''}" data-sub="onThreshold">${esc(t('subThreshold'))}</button>
      <button type="button" class="sub-pill js-sub-toggle ${sub.onDecision ? 'active' : ''}" data-sub="onDecision">${esc(t('subDecision'))}</button>
    </div>
  `;
  const rows =
    state.notifications.length === 0
      ? `<div style="font-size:0.8rem; color:var(--silver-3); padding:8px 4px;">${esc(t('notifEmpty'))}</div>`
      : state.notifications
          .map((n) => {
            const dt = fmtDateCH(n.created_at);
            const tm = n.created_at ? new Date(n.created_at).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) : '';
            return `
              <button type="button" class="notif-item ${n.is_read ? '' : 'unread'} js-notif-open" data-nid="${n.id}" data-story="${n.story_id}">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; font-size:0.72rem; color:var(--silver-3);">
                  <span style="display:inline-flex; align-items:center; gap:5px;">
                    ${roleBadgeHtml(n.sender_role)}
                    <strong>${esc(n.sender_name || '')}</strong>
                  </span>
                  <span>${esc(dt)} ${esc(tm)}</span>
                </div>
                <div style="font-size:0.79rem; font-weight:600; color:var(--ink);">${esc(n.story_title)}</div>
                <div style="font-size:0.77rem; color:var(--silver-2);">${esc(n.message)}</div>
              </button>
            `;
          })
          .join('');
  pop.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding-bottom:6px; border-bottom:1px solid var(--line);">
      <strong style="font-size:0.82rem; color:var(--ink);">${esc(t('notifTitle'))}</strong>
      ${state.unreadNotifs > 0 ? `<button type="button" class="text-link js-notif-read-all">${esc(t('notifMarkAll'))}</button>` : ''}
    </div>
    ${subBarHtml}
    <div style="display:flex; flex-direction:column; gap:6px;">${rows}</div>
  `;
}

async function openStoryDrawer(storyId) {
  state.expandedId = storyId;
  state.showAllMentions = false;
  state.pendingStatus = null;
  const [mentions, qData, relData] = await Promise.all([
    api(`/api/stories/${storyId}/mentions`).catch(() => []),
    api(`/api/stories/${storyId}/questions`).catch(() => ({ isOwner: false, questions: [] })),
    canReviewUi() ? api(`/api/stories/${storyId}/relevance`).catch(() => null) : Promise.resolve(null)
  ]);
  state.expandedMentions = mentions;
  state.activeMentionId = mentions[0]?.id ?? null;
  state.expandedQuestions = Array.isArray(qData.questions) ? qData.questions : [];
  state.expandedIsOwner = Boolean(qData.isOwner);
  state.expandedRelevance = relData;
}

function renderAuthState() {
  const profBtn = document.getElementById('btn-profile');
  const profIcon = document.getElementById('profile-icon');
  const profLabel = document.getElementById('profile-label');
  const repBtn = document.getElementById('btn-toggle-report');
  const pop = document.getElementById('profile-popover');

  const allowRep = canViewReports();
  repBtn?.classList.toggle('hidden', !allowRep);
  if (!allowRep && state.view === 'report') {
    setView('board');
  }

  if (state.user) {
    const elevated = canSeeAllCommentsUi();
    const roleLabel = roleLabelFor(state.user.role);
    profBtn.classList.toggle('is-admin', elevated);
    profBtn.classList.toggle('is-user', !elevated);
    profIcon.outerHTML = elevated
      ? LUCIDE.shieldCheck.replace('<svg ', '<svg id="profile-icon" ')
      : LUCIDE.user.replace('<svg ', '<svg id="profile-icon" ');
    profLabel.textContent = state.user.displayName || state.user.username;
    profLabel.classList.remove('hidden');
    profBtn.title = `${state.user.displayName} (${roleLabel})`;

    pop.innerHTML = `
      <div class="pop-user-head">
        <span class="pop-user-name">${esc(state.user.displayName)}</span>
        <span class="pop-user-sub">
          <span>@${esc(state.user.username)}</span>
          <span class="tag-mini ${elevated ? 'tag-blue' : ''}">${esc(roleLabel)}</span>
        </span>
      </div>
      ${
        canViewReports()
          ? `<button type="button" class="pop-action" id="pop-open-report">${LUCIDE.barChart}<span>${esc(t('report'))}</span></button>`
          : ''
      }
      ${
        isAdminUser()
          ? `<button type="button" class="pop-action" id="pop-open-roles">${LUCIDE.users}<span>${esc(t('rolesAndUsers'))}</span></button>`
          : ''
      }
      <button type="button" class="pop-action danger" id="pop-logout">${LUCIDE.logOut}<span>${esc(t('signOut'))}</span></button>
    `;
  } else {
    profBtn.classList.remove('is-admin', 'is-user');
    profIcon.outerHTML = LUCIDE.user.replace('<svg ', '<svg id="profile-icon" ');
    profLabel.textContent = '';
    profLabel.classList.add('hidden');
    profBtn.title = t('signInProfile');
    pop.classList.add('hidden');
  }
}

async function openRolesModal(tab = state.rolesTab || 'matrix') {
  state.rolesTab = tab;
  const modal = document.getElementById('roles-modal');
  const body = document.getElementById('roles-modal-body');
  modal.classList.remove('hidden');
  body.innerHTML = `<div style="padding:16px; color:var(--silver-3);">${esc(t('loading'))}</div>`;

  const tabsHtml = `
    <div class="auth-tabs" style="margin-bottom:16px;">
      <button type="button" class="auth-tab js-roles-tab ${tab === 'matrix' ? 'active' : ''}" data-rtab="matrix">${esc(t('rolesAndUsers'))}</button>
      <button type="button" class="auth-tab js-roles-tab ${tab === 'audit' ? 'active' : ''}" data-rtab="audit">${esc(t('auditLog'))}</button>
    </div>
  `;

  try {
    if (tab === 'audit') {
      const entries = await api('/api/decisions');
      const rows =
        entries.length === 0
          ? `<div style="font-size:0.82rem; color:var(--silver-3); padding:10px 0;">${esc(t('auditEmpty'))}</div>`
          : entries
              .map((d) => {
                const dt = fmtDateCH(d.created_at);
                const tm = d.created_at
                  ? new Date(d.created_at).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
                  : '';
                return `
                  <div class="user-role-row" style="align-items:flex-start;">
                    <div style="flex:1; min-width:0;">
                      <div style="font-size:0.73rem; color:var(--silver-3);">${esc(dt)} · ${esc(tm)} · <strong>${esc(d.actor_role || '')}</strong></div>
                      <div style="font-size:0.84rem; font-weight:600; color:var(--ink); margin-top:2px;">${esc(d.entity_title)}</div>
                      <div style="font-size:0.79rem; color:var(--silver-2); margin-top:2px;">${esc(d.reason)}</div>
                    </div>
                    <span class="tag-mini tag-blue">${esc(d.action)}</span>
                  </div>
                `;
              })
              .join('');
      body.innerHTML = `${tabsHtml}<div class="user-role-list">${rows}</div>`;
      return;
    }

    const data = await api('/api/users');
    const matrixRows = data.roles
      .map((r) => {
        const p = r.permissions;
        return `
          <tr>
            <td>${roleBadgeHtml(r.id)}</td>
            <td>${p.captureFeedback ? LUCIDE.check : LUCIDE.minus}</td>
            <td>${p.seeAllComments ? LUCIDE.check : '<span style="font-size:0.7rem; color:var(--silver-3);">Opt.</span>'}</td>
            <td>${p.reviewStories ? LUCIDE.check : LUCIDE.minus}</td>
            <td>${p.developStories ? LUCIDE.check : LUCIDE.minus}</td>
            <td>${p.decideStories ? LUCIDE.check : LUCIDE.minus}</td>
            <td>${p.viewReports ? LUCIDE.check : LUCIDE.minus}</td>
            <td>${p.manageUsers ? LUCIDE.check : LUCIDE.minus}</td>
          </tr>
        `;
      })
      .join('');

    const userRows = data.users
      .map(
        (u) => `
        <div class="user-role-row">
          <div>
            <strong style="font-size:0.84rem; color:var(--ink);">${esc(u.display_name || u.username)}</strong>
            <div style="font-size:0.73rem; color:var(--silver-3);">@${esc(u.username)}</div>
          </div>
          <div class="channel-group" role="group" aria-label="Rolle für ${esc(u.username)}">
            ${data.roles
              .map(
                (r) =>
                  `<button type="button" class="ch-btn js-set-role ${u.role === r.id ? 'active' : ''}" data-uid="${u.id}" data-role="${r.id}">${esc(roleLabelFor(r.id))}</button>`
              )
              .join('')}
          </div>
        </div>
      `
      )
      .join('');

    body.innerHTML = `
      ${tabsHtml}
      <div class="drawer-label">${esc(t('commentsLbl'))}</div>
      <div class="user-role-row" style="margin-bottom:16px;">
        <div>
          <strong style="font-size:0.84rem; color:var(--ink);">${esc(t('commentsLbl'))}</strong>
          <div style="font-size:0.74rem; color:var(--silver-3);">${esc(t('commentsDesc'))}</div>
        </div>
        <div class="channel-group" role="group" aria-label="${esc(t('commentsLbl'))}">
          <button type="button" class="ch-btn js-admin-vis ${state.commentsVisibility === 'all' ? 'active' : ''}" data-vis="all">${esc(t('visAll'))}</button>
          <button type="button" class="ch-btn js-admin-vis ${state.commentsVisibility === 'own_only' ? 'active' : ''}" data-vis="own_only">${esc(t('visOwn'))}</button>
        </div>
      </div>
      <div class="drawer-label">${esc(t('matrixTitle'))}</div>
      <div style="overflow-x:auto;">
      <table class="matrix-table">
        <thead>
          <tr>
            <th>${esc(t('colRole'))}</th>
            <th>${esc(t('colCapture'))}</th>
            <th>${esc(t('colAllComm'))}</th>
            <th>${esc(t('colReview'))}</th>
            <th>${esc(t('colDevelop'))}</th>
            <th>${esc(t('colDecide'))}</th>
            <th>${esc(t('colReport'))}</th>
            <th>${esc(t('colRights'))}</th>
          </tr>
        </thead>
        <tbody>${matrixRows}</tbody>
      </table>
      </div>
      <div class="drawer-label">${esc(t('registeredUsers'))} (${data.users.length})</div>
      <div class="user-role-list">${userRows || `<div style="font-size:0.8rem; color:var(--silver-3);">${esc(t('noAccounts'))}</div>`}</div>
    `;
  } catch (err) {
    body.innerHTML = `${tabsHtml}<div class="auth-error">${esc(err.message)}</div>`;
  }
}

function closeRolesModal() {
  document.getElementById('roles-modal')?.classList.add('hidden');
}

function openAuthModal(mode = 'login', customHint = '') {
  state.authMode = mode;
  const modal = document.getElementById('auth-modal');
  const title = document.getElementById('auth-modal-title');
  const hint = document.getElementById('auth-modal-hint');
  const nameWrap = document.getElementById('auth-name-wrap');
  const submitBtn = document.getElementById('auth-submit-btn');
  const errBox = document.getElementById('auth-error');

  errBox.classList.add('hidden');
  document.querySelectorAll('.auth-tab[data-auth-mode]').forEach((tabEl) => tabEl.classList.toggle('active', tabEl.dataset.authMode === mode));
  const isReg = mode === 'register';
  nameWrap.classList.toggle('hidden', !isReg);
  title.textContent = isReg ? t('register') : t('signIn');
  submitBtn.textContent = isReg ? t('register') : t('signIn');
  hint.textContent =
    customHint ||
    (isReg && !state.hasAdmin
      ? t('hintFirstAdmin')
      : isReg
        ? t('hintNewUser')
        : t('hintLogin'));

  modal.classList.remove('hidden');
  modal.querySelector(isReg ? 'input[name="displayName"]' : 'input[name="username"]')?.focus();
}

function closeAuthModal() {
  document.getElementById('auth-modal')?.classList.add('hidden');
  document.getElementById('auth-form')?.reset();
  document.getElementById('auth-error')?.classList.add('hidden');
}

async function loadAuthAndSettings() {
  try {
    const [me, s] = await Promise.all([api('/api/auth/me'), api('/api/settings')]);
    state.user = me.user || null;
    state.hasAdmin = Boolean(me.hasAdmin);
    state.commentsVisibility = s.commentsVisibility === 'own_only' ? 'own_only' : 'all';
    document.querySelectorAll('[data-vis]').forEach((b) => {
      b.classList.toggle('active', b.dataset.vis === state.commentsVisibility);
    });
    renderAuthState();
  } catch {
    renderAuthState();
  }
}

function ampelDot(feasibility) {
  if (feasibility === 'einfach') return `<span class="dot-sm dot-green" title="${esc(t('easy'))}"></span>`;
  if (feasibility === 'mittel') return `<span class="dot-sm dot-amber" title="${esc(t('medium'))}"></span>`;
  if (feasibility === 'aufwaendig') return `<span class="dot-sm dot-red" title="${esc(t('complex'))}"></span>`;
  return `<span class="dot-sm dot-open" title="${esc(t('unrated'))}"></span>`;
}

function statusBadge(status) {
  if (status === 'Umgesetzt') return `<span class="tag-mini tag-green">${esc(t('done'))}</span>`;
  if (status === 'Abgelehnt') return `<span class="tag-mini tag-red">${esc(t('rejected'))}</span>`;
  if (status === 'In Arbeit' || status === 'Angenommen') return `<span class="tag-mini tag-blue">${esc(t('inProgress'))}</span>`;
  if (status === 'In Prüfung') return `<span class="tag-mini tag-amber">${esc(t('inReview'))}</span>`;
  if (status === 'Geprüft' || status === 'Bereit') return `<span class="tag-mini">${esc(t('reviewed'))}</span>`;
  return `<span class="tag-mini">${esc(t('newBadge'))}</span>`;
}

function loopBars(status) {
  if (status === 'Abgelehnt') {
    return `
      <div class="loop-bars" title="${esc(statusDisplay(status))}">
        <div class="loop-seg on"></div>
        <div class="loop-seg on"></div>
        <div class="loop-seg on-red"></div>
        <div class="loop-seg"></div>
      </div>
    `;
  }
  const rank =
    status === 'Umgesetzt'
      ? 4
      : status === 'In Arbeit' || status === 'Angenommen'
        ? 3
        : status === 'In Prüfung' || status === 'Geprüft' || status === 'Bereit'
          ? 2
          : 1;
  const cls = rank === 4 ? 'on-green' : 'on';
  return `
    <div class="loop-bars" title="Status: ${esc(statusDisplay(status))}">
      ${[1, 2, 3, 4].map((n) => `<div class="loop-seg ${n <= rank ? cls : ''}"></div>`).join('')}
    </div>
  `;
}

function applyLanguageToStaticUi() {
  document.documentElement.lang = state.lang === 'en' ? 'en' : 'de-CH';
  document.querySelectorAll('.lang-btn').forEach((b) => b.classList.toggle('active', b.dataset.lang === state.lang));

  const qEl = document.getElementById('filter-q');
  if (qEl) qEl.placeholder = t('search');
  const instSpan = document.querySelector('#btn-install-app [data-i18n="install"]');
  if (instSpan) instSpan.textContent = t('install');
  const repLbl = document.getElementById('btn-report-label');
  if (repLbl) repLbl.textContent = state.view === 'report' ? t('board') : t('report');

  const fbTitle = document.getElementById('fb-title');
  if (fbTitle) fbTitle.placeholder = t('titlePlaceholder');
  const fbText = document.getElementById('fb-text');
  if (fbText) fbText.placeholder = t('capturePlaceholder');
  const fbValLbl = document.getElementById('fb-value-label');
  if (fbValLbl) fbValLbl.textContent = t('valueLabel');
  document.querySelectorAll('.val-badge[data-value]').forEach((b) => {
    b.textContent = valueDisplay(b.dataset.value);
  });
  const fbAuthor = document.getElementById('fb-author');
  if (fbAuthor) fbAuthor.placeholder = t('authorPlaceholder');
  const fbRef = document.getElementById('fb-ref');
  if (fbRef) fbRef.placeholder = t('refPlaceholder');
  const compDur = document.querySelector('#composer-dur-picker .dur-input');
  if (compDur) compDur.placeholder = t('timePlaceholder');
  const compClear = document.querySelector('#composer-dur-picker .js-wheel-clear');
  if (compClear) compClear.textContent = t('clear');
  const compSecHead = document.querySelector('#composer-dur-picker .wheel-head span:last-child');
  if (compSecHead) compSecHead.textContent = t('secShort');
  const submitBtn = document.querySelector('#feedback-form .btn-primary');
  if (submitBtn) submitBtn.textContent = t('submit');

  const chMap = { Persönlich: 'chPersonal', Telefon: 'chPhone', Chat: 'chChat', 'E-Mail': 'chEmail' };
  document.querySelectorAll('#feedback-form .ch-btn').forEach((b) => {
    const k = chMap[b.dataset.channel];
    if (k) b.textContent = t(k);
  });

  const ampelLabels = {
    alle: `${t('all')} <span id="count-all">${document.getElementById('count-all')?.textContent || '0'}</span>`,
    einfach: `<span class="dot-sm dot-green"></span>${t('easy')} <span id="count-green">${document.getElementById('count-green')?.textContent || '0'}</span>`,
    mittel: `<span class="dot-sm dot-amber"></span>${t('medium')} <span id="count-amber">${document.getElementById('count-amber')?.textContent || '0'}</span>`,
    aufwaendig: `<span class="dot-sm dot-red"></span>${t('complex')} <span id="count-red">${document.getElementById('count-red')?.textContent || '0'}</span>`
  };
  document.querySelectorAll('.ampel-btn[data-ampel]').forEach((b) => {
    if (ampelLabels[b.dataset.ampel]) b.innerHTML = ampelLabels[b.dataset.ampel];
  });

  const modeMap = { all: 'all', active: 'inProgress', done: 'done' };
  document.querySelectorAll('.st-btn[data-mode]').forEach((b) => {
    if (modeMap[b.dataset.mode]) b.textContent = t(modeMap[b.dataset.mode]);
  });

  // Report controls
  const setTxt = (id, key) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  };
  setTxt('rep-range-today', 'today');
  setTxt('rep-range-7d', 'd7');
  setTxt('rep-range-30d', 'd30');
  setTxt('rep-year-curr', 'year');
  setTxt('rep-year-prev', 'prevYear');
  const pdfSpan = document.querySelector('#btn-export-pdf span');
  if (pdfSpan) pdfSpan.textContent = t('exportPdf');

  const granMap = { day: 'perDay', week: 'perWeek', month: 'perMonth', year: 'perYear' };
  document.querySelectorAll('[data-rep-gran]').forEach((b) => {
    if (granMap[b.dataset.repGran]) b.textContent = t(granMap[b.dataset.repGran]);
  });
  const repFeasMap = {
    Alle: t('all'),
    einfach: `<span class="dot-sm dot-green"></span>${t('easy')}`,
    mittel: `<span class="dot-sm dot-amber"></span>${t('medium')}`,
    aufwaendig: `<span class="dot-sm dot-red"></span>${t('complex')}`
  };
  document.querySelectorAll('[data-rep-feas]').forEach((b) => {
    if (repFeasMap[b.dataset.repFeas]) b.innerHTML = repFeasMap[b.dataset.repFeas];
  });
  const repStatusMap = { Alle: 'all', Umgesetzt: 'done', 'In Arbeit': 'inProgress', Offen: 'open', Abgelehnt: 'rejected' };
  document.querySelectorAll('[data-rep-status]').forEach((b) => {
    if (repStatusMap[b.dataset.repStatus]) b.textContent = t(repStatusMap[b.dataset.repStatus]);
  });
  const tmLbl = document.querySelector('#rep-timemode-pills .sep');
  if (tmLbl) tmLbl.textContent = t('timeBasis');
  document.querySelectorAll('[data-rep-timemode]').forEach((b) => {
    b.textContent = b.dataset.repTimemode === 'measured' ? t('measured') : t('projected');
  });
  const minLbl = document.querySelector('#rep-min-pills .sep');
  if (minLbl) minLbl.textContent = t('fallbackEmpty');

  // Modals static labels
  const rmTitle = document.getElementById('roles-modal-title');
  if (rmTitle) rmTitle.textContent = t('rolesModalTitle');
  const rmHint = document.getElementById('roles-modal-hint');
  if (rmHint) rmHint.textContent = t('rolesModalHint');
  document.querySelectorAll('.auth-tab[data-auth-mode]').forEach((b) => {
    b.textContent = b.dataset.authMode === 'register' ? t('register') : t('signIn');
  });
  const authForm = document.getElementById('auth-form');
  if (authForm) {
    const nIn = authForm.querySelector('input[name="displayName"]');
    const uIn = authForm.querySelector('input[name="username"]');
    const pIn = authForm.querySelector('input[name="password"]');
    if (nIn) nIn.placeholder = t('authorPlaceholder');
    if (uIn) uIn.placeholder = t('username');
    if (pIn) pIn.placeholder = t('password');
  }
}

function setView(viewName) {
  state.view = viewName;
  const isReport = viewName === 'report';
  document.getElementById('board-view').classList.toggle('hidden', isReport);
  document.getElementById('report-view').classList.toggle('hidden', !isReport);
  document.getElementById('board-search-wrap').classList.toggle('hidden', isReport);
  const btn = document.getElementById('btn-toggle-report');
  const lbl = document.getElementById('btn-report-label');
  btn.classList.toggle('active', isReport);
  if (lbl) lbl.textContent = isReport ? t('board') : t('report');
  if (isReport) {
    loadReport();
  }
}

async function loadHealth() {
  try {
    const h = await api('/health');
    document.getElementById('ops-dot').className = 'pulse-dot ok';
    document.getElementById('ops-db').textContent = `DB ${h.db} (${h.dbLatencyMs} ms)`;
    document.getElementById('ops-counts').textContent = `${h.counts.stories} ${t('entries')}`;
    document.getElementById('ops-version').textContent = h.version;
    document.getElementById('ops-commit').textContent = String(h.commit || 'local').slice(0, 7);
  } catch {
    document.getElementById('ops-dot').className = 'pulse-dot err';
    document.getElementById('ops-db').textContent = t('dbDisconnected');
  }
}

async function loadIdeas() {
  const params = new URLSearchParams();
  const q = document.getElementById('filter-q').value.trim();
  if (q) params.set('q', q);

  const allIdeas = await api(`/api/stories?${params.toString()}`);
  state.allStoriesCache = allIdeas;

  const totalMentions = allIdeas.reduce((sum, i) => sum + (Number(i.votes) || 1), 0);
  document.getElementById('count-all').textContent = `${allIdeas.length} (${totalMentions}×)`;
  document.getElementById('count-green').textContent = String(allIdeas.filter((i) => i.feasibility === 'einfach').length);
  document.getElementById('count-amber').textContent = String(allIdeas.filter((i) => i.feasibility === 'mittel').length);
  document.getElementById('count-red').textContent = String(allIdeas.filter((i) => i.feasibility === 'aufwaendig').length);

  let ideas = allIdeas;
  if (state.ampel !== 'alle') {
    ideas = ideas.filter((i) => i.feasibility === state.ampel);
  }
  if (state.mode === 'active') {
    ideas = ideas.filter((i) => ['In Prüfung', 'In Arbeit', 'Angenommen', 'Geprüft'].includes(i.status));
  } else if (state.mode === 'done') {
    ideas = ideas.filter((i) => ['Umgesetzt', 'Abgelehnt'].includes(i.status));
  }

  const listEl = document.getElementById('ideas-list');
  if (ideas.length === 0) {
    listEl.innerHTML = `<div class="empty-state">${esc(t('empty'))}</div>`;
    return;
  }

  function renderCasePreviewHtml(m) {
    if (!m) return '';
    const dt = fmtDateCH(m.created_at);
    const tm = m.created_at ? new Date(m.created_at).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) : '';
    const dur = Number(m.duration_seconds) || 0;
    return `
      <div class="case-preview-top">
        <span>${esc(dt)}${tm ? ` · ${esc(tm)}` : ''}</span>
        <div style="display:flex; gap:6px; align-items:center;">
          ${dur > 0 ? `<span class="time-chip">${LUCIDE.clock} ${esc(fmtMMSS(dur))}</span>` : ''}
          ${m.channel ? `<span class="tag-mini">${esc(channelDisplay(m.channel))}</span>` : ''}
          ${m.interaction_ref ? `<span class="tag-mini" style="font-family:ui-monospace,Consolas,monospace;">#${esc(m.interaction_ref)}</span>` : ''}
        </div>
      </div>
      <p class="case-preview-quote ${m.feedback_note ? '' : 'muted'}">
        ${m.feedback_note ? esc(m.feedback_note) : esc(t('noNote'))}
      </p>
      ${
        m.customer_ref || m.recorded_by
          ? `<div class="case-preview-meta">
              ${m.customer_ref ? `<span>${esc(t('customer'))}: <strong>${esc(m.customer_ref)}</strong></span>` : ''}
              ${m.recorded_by ? `<span>${esc(t('loggedBy'))}: <strong>${esc(m.recorded_by)}</strong></span>` : ''}
            </div>`
          : ''
      }
    `;
  }

  listEl.innerHTML = ideas
    .map((item) => {
      const feas = item.feasibility || 'unbewertet';
      const channel = (item.channel || '').trim();
      const author = item.submitted_by ? ` · ${item.submitted_by}` : '';
      const dateStr = fmtDateCH(item.created_at);
      const businessValues = Array.isArray(item.business_values_json) ? item.business_values_json : [];
      const expanded = state.expandedId === item.id;
      const effortOpen = state.effortId === item.id;
      const voted = state.votedIds.has(item.id);
      const pending = state.pendingStatus && state.pendingStatus.id === item.id ? state.pendingStatus : null;
      const pendingFb = state.pendingDecFeedback && state.pendingDecFeedback.id === item.id ? state.pendingDecFeedback : null;
      const wording = item.public_response || item.decision_reason || '';
      const postMentions = Number(item.post_decision_mentions) || 0;
      const decUp = Number(item.decision_up) || 0;
      const decDown = Number(item.decision_down) || 0;
      const decComments = Array.isArray(item.decision_feedback_json) ? item.decision_feedback_json : [];
      const hasDecision = ['Abgelehnt', 'Umgesetzt', 'In Arbeit', 'Angenommen'].includes(item.status);
      const hasPressure = (item.status === 'Abgelehnt' && postMentions > 0) || decDown > decUp;
      const totalSec = Number(item.total_duration_seconds) || 0;
      const timedCnt = Number(item.timed_mentions) || 0;
      const avgSec = timedCnt > 0 ? Math.round(totalSec / timedCnt) : 0;
      const refs = Array.isArray(item.interaction_refs_json) ? item.interaction_refs_json : [];
      const cutoff90d = Date.now() - 90 * 24 * 60 * 60 * 1000;
      const recentRefs = refs.filter((r) => !r.createdAt || new Date(r.createdAt).getTime() >= cutoff90d);

      const pressureBadge = hasPressure
        ? `<span class="tag-mini tag-pressure">${postMentions > 0 ? `+${postMentions}× ${esc(t('afterReject'))}` : esc(t('reReview'))}</span>`
        : '';

      const timeChip =
        totalSec > 0
          ? `<span class="time-chip">${LUCIDE.clock} ${esc(fmtDurationHuman(totalSec))}${avgSec > 0 ? ` · Ø ${esc(fmtMMSS(avgSec))}` : ''}</span>`
          : '';

      const loopFollowupChip =
        item.status === 'Umgesetzt' && recentRefs.length > 0
          ? `<span class="tag-mini tag-green">${esc(t('followupUseful'))} (${recentRefs.length} ${esc(t('refShort'))})</span>`
          : '';

      const valueChips =
        businessValues.length > 0
          ? businessValues.map((v) => `<span class="tag-mini tag-value">${esc(valueDisplay(v))}</span>`).join('')
          : '';

      const refsLine =
        refs.length > 0
          ? `<div class="idea-meta-line" style="margin-top:5px;">
              ${refs
                .slice(-5)
                .map((r) => `<span class="tag-mini" style="font-family:ui-monospace,Consolas,monospace;">#${esc(r.ref)}</span>`)
                .join('')}
              ${refs.length > 5 ? `<span style="color:var(--silver-3);">+${refs.length - 5} ${esc(t('moreSuffix'))}</span>` : ''}
            </div>`
          : '';

      const decisionVoteHtml = hasDecision
        ? `
          <div class="decision-vote-row">
            <span>${esc(t('decisionLbl'))}</span>
            <button type="button" class="dv-btn js-dec-vote" data-id="${item.id}" data-sentiment="up">${LUCIDE.thumbsUp} ${decUp}</button>
            <button type="button" class="dv-btn js-dec-vote ${decDown > decUp ? 'down-hot' : ''}" data-id="${item.id}" data-sentiment="down">${LUCIDE.thumbsDown} ${decDown}</button>
            <button type="button" class="text-link js-dec-comment-open" data-id="${item.id}">+ Feedback</button>
          </div>
          ${
            pendingFb
              ? `
                <form class="decision-form js-dec-comment-form" data-id="${item.id}" style="margin-top:6px;">
                  <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <input type="text" name="comment" required placeholder="${esc(t('decFeedbackPlaceholder'))}" style="flex:1 1 200px;" autofocus />
                    <button type="submit" class="st-btn active">${esc(t('send'))}</button>
                  </div>
                </form>
              `
              : ''
          }
          ${
            decComments.length > 0
              ? `<div class="dv-comments">${decComments
                  .slice(-3)
                  .map(
                    (c) =>
                      `<div class="dv-comment ${c.sentiment === 'down' ? 'is-down' : ''}">${c.sentiment === 'down' ? LUCIDE.thumbsDown : LUCIDE.thumbsUp} <span>${esc(c.comment)}${c.author ? ` <span style="color:var(--silver-3);">— ${esc(c.author)}</span>` : ''}</span></div>`
                  )
                  .join('')}</div>`
              : ''
          }
        `
        : '';

      const notesHtml = `
        ${
          wording
            ? `<div class="note-line">
                <div><span class="note-key">${esc(t('feedbackDecisionKey'))}</span>${esc(wording)}</div>
                <button type="button" class="text-link js-copy" data-text="${esc(wording)}">${LUCIDE.copy} ${esc(t('copy'))}</button>
              </div>`
            : ''
        }
        ${
          item.internal_note
            ? `<div class="note-line internal">
                <div><span class="note-key">${esc(t('internalNoteKey'))}</span>${esc(item.internal_note)}</div>
              </div>`
            : ''
        }
        ${decisionVoteHtml}
      `;

      const effortBarHtml = effortOpen
        ? `
          <form class="quant-box js-quant-form" data-id="${item.id}" style="margin-top:10px;">
            <div class="quant-row">
              ${renderDurationPickerHtml({ initialSec: 0, placeholder: t('timePlaceholder') })}
              <input type="text" name="customerRef" class="author-input" placeholder="${esc(t('customerOpt'))}" aria-label="${esc(t('customerOpt'))}" style="width:132px;" />
              <input type="text" name="recordedBy" class="author-input" placeholder="${esc(t('loggedBy'))}" aria-label="${esc(t('loggedBy'))}" style="width:124px;" />
              <input type="text" name="interactionRef" class="ref-input" placeholder="${esc(t('refPlaceholder'))}" aria-label="${esc(t('refPlaceholder'))}" style="width:102px;" />
            </div>
            <div class="quant-row">
              <input type="text" name="feedbackNote" class="quant-note-input" placeholder="${esc(t('caseFeedback'))}" aria-label="${esc(t('caseFeedback'))}" />
              <div class="channel-group" role="group" aria-label="Kanal">
                ${['Persönlich', 'Telefon', 'Chat', 'E-Mail']
                  .map(
                    (ch) =>
                      `<button type="button" class="ch-btn js-eff-ch ${state.effortChannel === ch ? 'active' : ''}" data-channel="${ch}">${esc(channelDisplay(ch))}</button>`
                  )
                  .join('')}
              </div>
              <button type="submit" class="btn-primary js-quant-submit">${esc(t('addVote'))}</button>
            </div>
          </form>
        `
        : '';

      const mentionsList = expanded ? state.expandedMentions : [];
      const visibleMentions = state.showAllMentions ? mentionsList : mentionsList.slice(0, 12);
      const activeMention =
        mentionsList.find((m) => m.id === state.activeMentionId) || mentionsList[0] || null;

      const showAllText = t('showAllSuffix')
        ? `${t('showAllPrefix')} ${mentionsList.length} ${t('showAllSuffix')}`
        : `${t('showAllPrefix')} ${mentionsList.length}`;

      const tilesHtml = expanded
        ? `
          <div class="tiles-section">
            <div class="tiles-head">
              <div class="drawer-label" style="margin:0;">
                ${state.commentsVisibility === 'own_only' && !canSeeAllCommentsUi() ? `${esc(t('ownCasesTitle'))} (${mentionsList.length})` : `${esc(t('casesTitle'))} (${mentionsList.length})`}
              </div>
              ${
                mentionsList.length > 12
                  ? `<button type="button" class="text-link js-toggle-all-mentions">${state.showAllMentions ? esc(t('showLess')) : esc(showAllText)}</button>`
                  : ''
              }
            </div>
            ${
              mentionsList.length === 0
                ? `<div style="font-size:0.8rem; color:var(--silver-3);">${esc(t('noCases'))}</div>`
                : `
                  <div class="badge-cloud">
                    ${visibleMentions
                      .map((m) => {
                        const shortDate = m.created_at ? fmtDateCH(m.created_at).slice(0, 5) : '';
                        const dur = Number(m.duration_seconds) || 0;
                        const label = m.customer_ref || m.recorded_by || (m.channel ? channelDisplay(m.channel) : '');
                        const isActive = activeMention && activeMention.id === m.id;
                        return `
                          <button type="button" class="case-badge js-case-badge ${isActive ? 'active' : ''}" data-mention-id="${m.id}">
                            <span>${esc(shortDate)}</span>
                            ${dur > 0 ? `<span class="case-badge-dur">${esc(fmtMMSS(dur))}</span>` : ''}
                            ${label ? `<span>${esc(label.slice(0, 16))}</span>` : ''}
                            ${m.interaction_ref ? `<span class="case-badge-ref">#${esc(m.interaction_ref.slice(0, 12))}</span>` : ''}
                          </button>
                        `;
                      })
                      .join('')}
                  </div>
                  <div class="case-preview" id="case-preview-box">${renderCasePreviewHtml(activeMention)}</div>
                `
            }
          </div>
        `
        : '';

      const allowReview = canReviewUi();
      const allowDevelop = canDevelopUi();
      const allowDecide = canDecideUi();
      const mergeTargets =
        expanded && state.mergeSourceId === item.id
          ? state.allStoriesCache.filter((other) => other.id !== item.id).slice(0, 8)
          : [];

      const mergeBoxHtml =
        expanded && state.mergeSourceId === item.id && allowReview
          ? `
            <div class="case-preview">
              <div class="case-preview-top">
                <strong style="color:var(--ink);">${esc(t('mergePrompt'))}</strong>
                <button type="button" class="text-link js-merge-cancel">${esc(t('cancel'))}</button>
              </div>
              <div class="badge-cloud">
                ${
                  mergeTargets.length === 0
                    ? `<span style="font-size:0.78rem; color:var(--silver-3);">${esc(t('noMergeTarget'))}</span>`
                    : mergeTargets
                        .map(
                          (tgt) =>
                            `<button type="button" class="case-badge js-merge-target" data-source="${item.id}" data-target="${tgt.id}"><span>${esc(tgt.title.slice(0, 46))}</span> <span class="case-badge-dur">${tgt.votes}×</span></button>`
                        )
                        .join('')
                }
              </div>
            </div>
          `
          : '';

      const questionsList = expanded ? state.expandedQuestions : [];
      const qaActivity = Number(item.question_activity_count) || 0;
      const qaChip =
        qaActivity > 0
          ? `<span class="tag-mini tag-amber" style="display:inline-flex; align-items:center; gap:4px;">${LUCIDE.messageSquare} ${qaActivity}</span>`
          : '';

      const qaSectionHtml =
        expanded && (questionsList.length > 0 || allowReview)
          ? `
            <div class="qa-section">
              <div class="drawer-label" style="margin:0;">${esc(t('questionsTitle'))} (${questionsList.reduce((acc, q) => acc + (q.reply_body ? 2 : 1), 0)})</div>
              ${questionsList
                .map((q) => {
                  const qDate = fmtDateCH(q.created_at);
                  const rDate = q.replied_at ? fmtDateCH(q.replied_at) : '';
                  const replyHtml = q.reply_body
                    ? `
                      <div class="qa-reply">
                        <div class="qa-head">
                          <span style="display:inline-flex; align-items:center; gap:6px;">${roleBadgeHtml('owner')} <strong>${esc(q.reply_author || t('roleOwner'))}</strong></span>
                          <span>${esc(rDate)}</span>
                        </div>
                        <p class="qa-body">${esc(q.reply_body)}</p>
                      </div>
                    `
                    : state.expandedIsOwner
                      ? `
                        <form class="decision-form js-qa-reply" data-story="${item.id}" data-qid="${q.id}" style="margin-top:2px;">
                          <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <input type="text" name="replyBody" required minlength="2" placeholder="${esc(t('replyPlaceholder'))}" style="flex:1 1 200px;" />
                            <button type="submit" class="st-btn active">${esc(t('replyBtn'))}</button>
                          </div>
                        </form>
                      `
                      : `<div class="qa-lock-hint">${esc(t('onlyAuthorHint'))}</div>`;

                  return `
                    <div class="qa-card">
                      <div class="qa-head">
                        <span style="display:inline-flex; align-items:center; gap:6px;">${roleBadgeHtml(q.author_role)} <strong>${esc(q.author_name || '')}</strong></span>
                        <span>${esc(qDate)}</span>
                      </div>
                      <p class="qa-body">${esc(q.body)}</p>
                      ${replyHtml}
                    </div>
                  `;
                })
                .join('')}
              ${
                allowReview
                  ? `
                    <form class="decision-form js-qa-ask" data-story="${item.id}">
                      <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                        ${roleBadgeHtml(state.user?.role || 'supervisor')}
                        <input type="text" name="body" required minlength="3" placeholder="${esc(t('askQuestionPlaceholder'))}" style="flex:1 1 200px;" />
                        <button type="submit" class="st-btn active">${esc(t('askBtn'))}</button>
                      </div>
                    </form>
                  `
                  : ''
              }
            </div>
          `
          : '';

      const relData = expanded ? state.expandedRelevance : null;
      const relLogHtml =
        expanded && allowReview && relData && relData.votes && relData.votes.length > 0
          ? (() => {
              const upNames = relData.votes.filter((v) => v.vote === 'relevant').map((v) => v.voter_name || 'Team');
              const downNames = relData.votes.filter((v) => v.vote === 'irrelevant').map((v) => v.voter_name || 'Team');
              const minorityHtml = relData.minority
                ? `<div class="minority-banner">${esc(t('minorityHint'))} <strong>${esc(relData.minority.voters.map((v) => v.voter_name || 'Team').join(', '))}</strong> (${esc(relData.minority.side === 'relevant' ? t('relRelevant') : t('relIrrelevant'))})</div>`
                : '';
              return `
                <div class="rel-log-box">
                  <div class="drawer-label" style="margin:0;">${esc(t('relLogTitle'))}</div>
                  ${minorityHtml}
                  ${upNames.length > 0 ? `<div><strong style="color:var(--green);">${esc(t('relRelevant'))} (${upNames.length}):</strong> ${esc(upNames.join(', '))}</div>` : ''}
                  ${downNames.length > 0 ? `<div><strong style="color:var(--red);">${esc(t('relIrrelevant'))} (${downNames.length}):</strong> ${esc(downNames.join(', '))}</div>` : ''}
                </div>
              `;
            })()
          : '';

      const relUp = Number(item.relevance_up) || 0;
      const relDown = Number(item.relevance_down) || 0;
      const myRel = item.my_relevance_vote || '';
      const relVoteBarHtml = `
        <span class="rel-vote-bar">
          <button type="button" class="rel-btn js-rel-vote ${myRel === 'relevant' ? 'is-up' : ''}" data-id="${item.id}" data-vote="relevant" title="${esc(t('relRelevant'))}">${LUCIDE.thumbsUp} ${relUp}</button>
          <button type="button" class="rel-btn js-rel-vote ${myRel === 'irrelevant' ? 'is-down' : ''}" data-id="${item.id}" data-vote="irrelevant" title="${esc(t('relIrrelevant'))}">${LUCIDE.thumbsDown} ${relDown}</button>
        </span>
      `;

      const drawerHtml = expanded
        ? `
          <div class="idea-drawer">
            ${tilesHtml}
            ${relLogHtml}
            ${qaSectionHtml}

            <div class="drawer-row">
              ${
                allowReview
                  ? `<div class="feas-group">
                      <button type="button" class="feas-btn js-feas ${feas === 'einfach' ? 'active-einfach' : ''}" data-id="${item.id}" data-feas="einfach"><span class="dot-sm dot-green"></span>${esc(t('easy'))}</button>
                      <button type="button" class="feas-btn js-feas ${feas === 'mittel' ? 'active-mittel' : ''}" data-id="${item.id}" data-feas="mittel"><span class="dot-sm dot-amber"></span>${esc(t('medium'))}</button>
                      <button type="button" class="feas-btn js-feas ${feas === 'aufwaendig' ? 'active-aufwaendig' : ''}" data-id="${item.id}" data-feas="aufwaendig"><span class="dot-sm dot-red"></span>${esc(t('complex'))}</button>
                    </div>`
                  : '<div></div>'
              }
              <div style="display:flex; gap:12px; flex-wrap:wrap;">
                ${allowReview && state.allStoriesCache.length > 1 ? `<button type="button" class="text-link js-merge-open" data-id="${item.id}">${LUCIDE.gitMerge} ${esc(t('merge'))}</button>` : ''}
                ${allowDecide ? `<button type="button" class="text-link danger js-delete" data-id="${item.id}">${LUCIDE.trash} ${esc(t('delete'))}</button>` : ''}
              </div>
            </div>

            ${mergeBoxHtml}

            ${
              allowReview
                ? `
                  <form class="decision-form js-notes" data-id="${item.id}">
                    <input type="text" name="internalNote" value="${esc(item.internal_note || '')}" placeholder="${esc(t('notePlaceholder'))}" />
                    <div style="display:flex; justify-content:flex-end;">
                      <button type="submit" class="st-btn active">${esc(t('saveNote'))}</button>
                    </div>
                  </form>
                `
                : ''
            }

            ${
              allowReview || allowDevelop || allowDecide
                ? `<div>
                    <div class="drawer-label">${esc(t('statusAndReason'))}</div>
                    <div class="feas-group">
                      ${allowReview ? `<button type="button" class="st-btn js-pick ${pending?.status === 'In Prüfung' ? 'active' : ''}" data-id="${item.id}" data-status="In Prüfung">${esc(t('inReview'))}</button>` : ''}
                      ${allowDevelop ? `<button type="button" class="st-btn js-pick ${pending?.status === 'In Arbeit' ? 'active' : ''}" data-id="${item.id}" data-status="In Arbeit">${esc(t('inProgress'))}</button>` : ''}
                      ${allowDevelop ? `<button type="button" class="st-btn js-pick ${pending?.status === 'Umgesetzt' ? 'active' : ''}" data-id="${item.id}" data-status="Umgesetzt">${esc(t('done'))}</button>` : ''}
                      ${allowDecide ? `<button type="button" class="st-btn js-pick ${pending?.status === 'Abgelehnt' ? 'active' : ''}" data-id="${item.id}" data-status="Abgelehnt">${esc(t('rejectBtn'))}</button>` : ''}
                    </div>
                    ${
                      pending
                        ? `
                          <form class="decision-form js-decide" data-id="${item.id}" data-status="${esc(pending.status)}" style="margin-top:10px;">
                            <textarea name="publicResponse" rows="2" required minlength="5" placeholder="${esc(t('reasonPlaceholder'))}"></textarea>
                            <input type="text" name="internalNote" value="${esc(item.internal_note || '')}" placeholder="${esc(t('internalOpt'))}" />
                            <div><button type="submit" class="btn-primary">${esc(statusDisplay(pending.status))} · ${esc(t('save'))}</button></div>
                          </form>
                        `
                        : ''
                    }
                  </div>`
                : ''
            }
          </div>
        `
        : '';

      return `
        <article class="idea-card ${state.freshId === item.id ? 'fresh' : ''}" data-story-card="${item.id}">
          <div class="idea-row">
            <button type="button" class="vote-box ${voted || effortOpen ? 'voted' : ''} js-vote" data-id="${item.id}" title="${esc(t('voteTitle'))}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>
              <span class="vote-count">${item.votes}×</span>
            </button>
            <div class="idea-body js-toggle" data-id="${item.id}">
              <div class="card-head">
                <h2 class="idea-title">${esc(item.title)}</h2>
                <div class="head-meta">
                  ${qaChip}
                  ${pressureBadge}
                  ${ampelDot(feas)}
                  ${channel ? `<span>${esc(channelDisplay(channel))}</span>` : ''}
                  ${statusBadge(item.status)}
                </div>
              </div>
              <p class="idea-text">${esc(item.raw_feedback)}</p>
              <div class="idea-meta-line">
                <span>${esc(dateStr)}${esc(author)}</span>
                ${valueChips}
                ${timeChip}
                ${loopFollowupChip}
                ${relVoteBarHtml}
              </div>
              ${effortBarHtml}
              ${refsLine}
              ${loopBars(item.status)}
              ${notesHtml}
            </div>
          </div>
          ${drawerHtml}
        </article>
      `;
    })
    .join('');

  // Hover- & Klick-Vorschau für die kompakten Fall-Badges
  const previewBox = listEl.querySelector('#case-preview-box');
  if (previewBox) {
    const updatePreview = (mentionId) => {
      const m = state.expandedMentions.find((x) => x.id === mentionId);
      if (!m) return;
      state.activeMentionId = mentionId;
      listEl.querySelectorAll('.js-case-badge').forEach((b) => {
        b.classList.toggle('active', Number(b.dataset.mentionId) === mentionId);
      });
      previewBox.innerHTML = renderCasePreviewHtml(m);
    };
    listEl.querySelectorAll('.js-case-badge').forEach((badge) => {
      badge.addEventListener('mouseenter', () => updatePreview(Number(badge.dataset.mentionId)));
      badge.addEventListener('click', (ev) => {
        ev.stopPropagation();
        updatePreview(Number(badge.dataset.mentionId));
      });
    });
  }

  // Zeitrad-Picker und Kanal-Toggles im +1 Upvote-Formular aktivieren
  listEl.querySelectorAll('.js-quant-form').forEach((formEl) => {
    const picker = formEl.querySelector('[data-dur-picker]');
    const submitBtn = formEl.querySelector('.js-quant-submit');

    function syncSubmitLabel() {
      const sec = Number(picker?.dataset.sec || 0);
      submitBtn.textContent = sec >= 60 ? `+1 · ${fmtDurationHuman(sec)}` : t('addVote');
    }

    bindDurationPicker(picker, syncSubmitLabel);
    formEl.querySelectorAll('.js-eff-ch').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const next = state.effortChannel === btn.dataset.channel ? '' : btn.dataset.channel;
        state.effortChannel = next;
        formEl.querySelectorAll('.js-eff-ch').forEach((b) => b.classList.toggle('active', b.dataset.channel === next));
      });
    });
    syncSubmitLabel();
  });
}

// --- Management-Report mit SVG-Grafiken (ONESTRAND Dark + A4 Print-Safe) ---
function buildDonutSvg({ einfach = 0, mittel = 0, aufwaendig = 0, unbewertet = 0 }) {
  const total = einfach + mittel + aufwaendig + unbewertet;
  const r = 46;
  const c = 2 * Math.PI * r;
  if (total === 0) {
    return `
      <svg width="124" height="124" viewBox="0 0 124 124" aria-label="Ampel-Verteilung">
        <circle cx="62" cy="62" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="14"/>
        <text x="62" y="66" text-anchor="middle" font-size="14" font-weight="700" fill="#64748b">0</text>
      </svg>
    `;
  }
  const segs = [
    { val: einfach, color: '#22c55e' },
    { val: mittel, color: '#f59e0b' },
    { val: aufwaendig, color: '#ef4444' },
    { val: unbewertet, color: '#94a3b8' }
  ];
  let offset = 0;
  const circles = segs
    .filter((s) => s.val > 0)
    .map((s) => {
      const len = (s.val / total) * c;
      const el = `<circle cx="62" cy="62" r="${r}" fill="none" stroke="${s.color}" stroke-width="14" stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 62 62)"/>`;
      offset += len;
      return el;
    })
    .join('');

  return `
    <svg width="124" height="124" viewBox="0 0 124 124" aria-label="Ampel-Verteilung">
      <circle cx="62" cy="62" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="14"/>
      ${circles}
      <text x="62" y="61" text-anchor="middle" font-size="20" font-weight="700" fill="#0f172a">${total}</text>
      <text x="62" y="76" text-anchor="middle" font-size="10" fill="#64748b">${esc(t('repTopics'))}</text>
    </svg>
  `;
}

function formatBucketLabel(bucket, granularity) {
  const s = String(bucket || '');
  if (granularity === 'day' && s.length === 10) return `${s.slice(8, 10)}.${s.slice(5, 7)}`;
  if (granularity === 'month' && s.length === 7) return `${s.slice(5, 7)}/${s.slice(2, 4)}`;
  return s;
}

function buildTimelineSvg(timeline = [], granularity = 'month') {
  if (!timeline.length) {
    return `<div class="empty-state" style="padding:18px;">${esc(t('repNoTimeline'))}</div>`;
  }
  const maxVal = Math.max(...timeline.map((m) => m.total), 1);
  const w = 640;
  const h = 148;
  const padL = 24;
  const padB = 28;
  const chartH = h - padB - 24;
  const slotW = (w - padL * 2) / Math.max(timeline.length, 1);
  const barW = Math.min(36, Math.max(10, slotW - 8));

  const bars = timeline
    .map((m, i) => {
      const bh = Math.max(5, Math.round((m.total / maxVal) * chartH));
      const x = padL + i * slotW + (slotW - barW) / 2;
      const y = h - padB - bh;
      const lbl = formatBucketLabel(m.bucket || m.month, granularity);
      const durHint = Number(m.duration_seconds) > 0 ? ` · ${fmtDurationHuman(m.duration_seconds)}` : '';
      return `
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh}" rx="5" fill="url(#osBarGrad)"/>
        <text x="${(x + barW / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="600" fill="#0f172a">${m.total}×${esc(durHint)}</text>
        <text x="${(x + barW / 2).toFixed(1)}" y="${h - 8}" text-anchor="middle" font-size="9.5" fill="#64748b">${esc(lbl)}</text>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${w} ${h}" width="100%" style="max-height:160px; display:block;" aria-label="Verlauf Meldungen">
      <defs>
        <linearGradient id="osBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2f84ff"/>
          <stop offset="100%" stop-color="#0a6cff"/>
        </linearGradient>
      </defs>
      <line x1="${padL}" y1="${h - padB}" x2="${w - padL}" y2="${h - padB}" stroke="#e2e8f0" stroke-width="1"/>
      ${bars}
    </svg>
  `;
}

async function loadReport() {
  const { from, to, granularity, storyId, feasibility, status, timeMode, minutesPerRequest, hourlyRate } = state.report;
  const params = new URLSearchParams({
    from,
    to,
    granularity,
    feasibility,
    status,
    timeMode,
    minutesPerRequest: String(minutesPerRequest)
  });
  if (storyId) params.set('storyId', String(storyId));
  if (hourlyRate && Number(hourlyRate) > 0) params.set('hourlyRate', String(hourlyRate));

  const csvParams = new URLSearchParams(params);
  if (state.report.managerPin) csvParams.set('pin', state.report.managerPin);
  document.getElementById('rep-csv-link').href = `/api/stories/export/csv?${csvParams.toString()}`;

  let rep;
  try {
    rep = await api(`/api/report?${params.toString()}`, {
      headers: state.report.managerPin ? { 'x-manager-pin': state.report.managerPin } : {}
    });
    document.querySelector('.report-controls')?.classList.remove('hidden');
  } catch (err) {
    document.querySelector('.report-controls')?.classList.add('hidden');
    document.getElementById('report-sheet').innerHTML = `
      <form id="mgr-pin-form" style="max-width:340px; margin:24px auto; display:flex; flex-direction:column; gap:10px; text-align:center;">
        <div class="drawer-label" style="margin:0;">${esc(t('mgrAccess'))}</div>
        <p style="margin:0; font-size:0.84rem; color:var(--silver-2);">${esc(err.message)}</p>
        <input type="password" name="pin" required autofocus placeholder="Manager-PIN" class="author-input" style="width:100%; text-align:center;" />
        <button type="submit" class="btn-primary">${esc(t('unlock'))}</button>
      </form>
    `;
    document.getElementById('mgr-pin-form')?.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const pin = String(new FormData(ev.target).get('pin') || '').trim();
      state.report.managerPin = pin;
      sessionStorage.setItem('re_mgr_pin', pin);
      loadReport();
    });
    return;
  }

  const granLabels = { day: t('granDay'), week: t('granWeek'), month: t('granMonth'), year: t('granYear') };
  const focusedStory = storyId ? rep.stories.find((s) => s.id === storyId) : null;

  const hasAnyEffectiveTime = rep.topResourceDrivers.some((d) => d.effectiveSeconds > 0);
  const maxDriver = Math.max(
    ...rep.topResourceDrivers.map((d) => (hasAnyEffectiveTime ? d.effectiveSeconds : d.mentions)),
    1
  );

  const driversHtml =
    rep.topResourceDrivers.length === 0
      ? `<div class="empty-state" style="padding:18px;">${esc(t('repNoFilterMatch'))}</div>`
      : `<div class="hbar-list">
          ${rep.topResourceDrivers
            .map((d) => {
              const metricVal = hasAnyEffectiveTime ? d.effectiveSeconds : d.mentions;
              const pct = Math.max(6, Math.round((metricVal / maxDriver) * 100));
              const isSelected = storyId === d.id;
              const durLabel =
                d.effectiveSeconds > 0
                  ? fmtDurationHuman(d.effectiveSeconds, { estimated: d.isEstimated })
                  : t('repNoTime');
              return `
                <div class="hbar-item js-focus-story ${isSelected ? 'is-selected' : ''}" data-id="${d.id}">
                  <div class="hbar-meta">
                    <span style="font-weight:${isSelected ? '700' : '550'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(d.title)}</span>
                    <span style="white-space:nowrap; color:var(--silver-2);"><strong>${d.mentions}×</strong> · ${esc(durLabel)}</span>
                  </div>
                  <div class="hbar-track">
                    <div class="hbar-fill hbar-${esc(d.feasibility)}" style="width:${pct}%"></div>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>`;

  const creditsHtml =
    rep.credits.length > 0
      ? `
        <div class="chart-title" style="margin-top:6px;">${esc(t('repCredits'))}</div>
        <div class="credits-grid">
          ${rep.credits
            .map(
              (c) => `
              <div class="credit-card">
                <div class="credit-name">${esc(c.name)}</div>
                <div style="color:var(--silver-2); margin-top:2px;">${c.ideas} ${esc(c.ideas === 1 ? t('repIdeaOne') : t('repIdeas'))} · ${c.implemented} ${esc(t('implemented').toLowerCase())} · ${c.mentions}×</div>
              </div>
            `
            )
            .join('')}
        </div>
      `
      : '';

  const rowsHtml =
    rep.stories.length === 0
      ? `<tr><td colspan="8" style="color:var(--silver-3); text-align:center; padding:18px;">${esc(t('repEmptyTable'))}</td></tr>`
      : rep.stories
          .map((s) => {
            const effSec = Number(s.report_effective_seconds) || 0;
            const avgSec = Number(s.report_avg_seconds) || 0;
            const durText =
              effSec > 0
                ? fmtDurationHuman(effSec, { estimated: s.report_is_estimated })
                : '–';
            const avgText = avgSec > 0 ? ` <span style="color:var(--silver-3);">(Ø ${esc(fmtMMSS(avgSec))})</span>` : '';
            const vals = Array.isArray(s.business_values_json) && s.business_values_json.length > 0
              ? `<div style="color:var(--silver-3); font-size:0.73rem; margin-top:2px;">${s.business_values_json.map((v) => esc(valueDisplay(v))).join(' · ')}</div>`
              : '';
            return `
              <tr>
                <td style="white-space:nowrap;">${esc(fmtDateCH(s.created_at))}</td>
                <td>
                  <strong>${esc(s.title)}</strong>
                  ${vals}
                  ${s.internal_note ? `<div style="color:var(--amber); font-size:0.75rem;">Dev: ${esc(s.internal_note)}</div>` : ''}
                </td>
                <td>${esc(s.submitted_by || '–')}</td>
                <td>${esc(s.channel ? channelDisplay(s.channel) : '–')}</td>
                <td style="white-space:nowrap;">${ampelDot(s.feasibility)} ${esc(feasDisplay(s.feasibility))}</td>
                <td style="white-space:nowrap;">${esc(statusDisplay(s.status))}</td>
                <td style="white-space:nowrap; font-variant-numeric:tabular-nums;"><strong>${s.report_mentions}×</strong></td>
                <td style="white-space:nowrap; font-variant-numeric:tabular-nums;">${esc(durText)}${avgText}</td>
              </tr>
            `;
          })
          .join('');

  const savingsHtml =
    rep.savings && rep.savings.implementedCount > 0
      ? `
        <div class="savings-box">
          <div class="chart-title" style="color:var(--green); margin-bottom:6px;">
            ${esc(t('repSavings'))} — ${rep.savings.implementedCount} ${esc(t('repImplTopics'))} (${rep.savings.savedMentions}× ${esc(t('repSolvedInq'))}${rep.savings.savedSeconds > 0 ? ` · ${esc(fmtDurationHuman(rep.savings.savedSeconds, { estimated: rep.summary.hasEstimated }))}` : ''}${rep.savings.savedCostChf ? ` · CHF ${rep.savings.savedCostChf.toLocaleString('de-CH')}.–` : ''})
          </div>
          ${rep.savings.topSavedItems
            .map(
              (item) => `
              <div class="savings-item">
                <span><strong>${esc(item.title)}</strong></span>
                <span style="white-space:nowrap; color:var(--green); font-weight:600;">
                  ${item.mentions}×${item.seconds > 0 ? ` · ${esc(fmtDurationHuman(item.seconds, { estimated: item.isEstimated }))}` : ''}${item.costChf ? ` · CHF ${item.costChf.toLocaleString('de-CH')}.–` : ''}
                </span>
              </div>
            `
            )
            .join('')}
        </div>
      `
      : '';

  const pressureHtml =
    rep.pressureItems && rep.pressureItems.length > 0
      ? `
        <div class="pressure-box">
          <div class="chart-title" style="color:var(--red); margin-bottom:6px;">${esc(t('repPressure'))}</div>
          ${rep.pressureItems
            .map(
              (p) => `
              <div class="pressure-item">
                <span><strong>${esc(p.title)}</strong> (${esc(statusDisplay(p.status))})</span>
                <span style="white-space:nowrap; color:var(--red); font-weight:600; display:inline-flex; align-items:center; gap:5px;">
                  ${p.postDecisionMentions > 0 ? `+${p.postDecisionMentions}× ${esc(t('repAfterwards'))}` : `${p.totalMentions}× total`} · ${LUCIDE.thumbsUp} ${p.decisionUp} · ${LUCIDE.thumbsDown} ${p.decisionDown}
                </span>
              </div>
            `
            )
            .join('')}
        </div>
      `
      : '';

  const effortVal =
    rep.summary.effectiveSeconds > 0
      ? fmtDurationHuman(rep.summary.effectiveSeconds, { estimated: rep.summary.hasEstimated })
      : '0m';
  const effortSub =
    timeMode === 'measured'
      ? rep.summary.totalTimedMentions > 0
        ? `${t('measured')} (${rep.summary.totalTimedMentions} ${t('repOf')} ${rep.summary.totalMentions})`
        : t('repNoTimes')
      : `${t('projected')} (≈ ${rep.summary.totalWorkdays} ${t('repWorkdays')})`;

  document.getElementById('report-sheet').innerHTML = `
    <div class="rep-head">
      <div>
        <div class="rep-brand-row">
          <img src="/assets/mark.svg" alt="ONESTRAND" />
          <span class="rep-brand-label">ONESTRAND · REQUIREMENTS ENGINE</span>
        </div>
        <h1>${esc(t('repTitle'))}</h1>
        <div class="rep-sub">
          ${esc(t('repPeriod'))}: <strong>${esc(fmtDateCH(from))} – ${esc(fmtDateCH(to))}</strong>
          · ${esc(t('repFeasLbl'))}: ${esc(feasDisplay(feasibility))} · Status: ${esc(statusDisplay(status))} · ${esc(t('repBasis'))}: ${esc(timeMode === 'measured' ? t('measured') : t('projected'))}
        </div>
      </div>
      <div class="rep-sub">${esc(t('repGenerated'))} ${esc(fmtDateCH(rep.generatedAt))}</div>
    </div>

    ${savingsHtml}
    ${pressureHtml}

    <div class="rep-kpis">
      <div class="rep-kpi">
        <span class="rep-kpi-label">${esc(t('repTopics'))}</span>
        <span class="rep-kpi-val">${rep.summary.totalStories}</span>
        <span class="rep-kpi-sub">${rep.byStatus.erledigt} ${esc(t('implemented').toLowerCase())} · ${rep.byStatus.inArbeit} ${esc(t('inProgress').toLowerCase())}</span>
      </div>
      <div class="rep-kpi">
        <span class="rep-kpi-label">${esc(t('repTotalInq'))}</span>
        <span class="rep-kpi-val">${rep.summary.totalMentions}×</span>
        <span class="rep-kpi-sub">${rep.summary.totalTimedMentions}× ${esc(t('repWithTime'))}</span>
      </div>
      <div class="rep-kpi">
        <span class="rep-kpi-label">${esc(t('repEffort'))}</span>
        <span class="rep-kpi-val">${esc(effortVal)}</span>
        <span class="rep-kpi-sub">${esc(effortSub)}</span>
      </div>
      <div class="rep-kpi">
        <span class="rep-kpi-label">${esc(t('repRate'))}</span>
        <span class="rep-kpi-val">${rep.summary.implementationRate} %</span>
        <span class="rep-kpi-sub">${rep.byFeasibility.einfach} ${esc(t('repQuickWins'))}</span>
      </div>
    </div>

    <div class="rep-charts">
      <div class="chart-card">
        <h3 class="chart-title">${esc(t('repAmpel'))}</h3>
        <div class="donut-wrap">
          ${buildDonutSvg(rep.byFeasibility)}
          <div class="donut-legend">
            <div class="donut-legend-row"><span><span class="dot-sm dot-green"></span> ${esc(t('easy'))}</span><strong>${rep.byFeasibility.einfach}</strong></div>
            <div class="donut-legend-row"><span><span class="dot-sm dot-amber"></span> ${esc(t('medium'))}</span><strong>${rep.byFeasibility.mittel}</strong></div>
            <div class="donut-legend-row"><span><span class="dot-sm dot-red"></span> ${esc(t('complex'))}</span><strong>${rep.byFeasibility.aufwaendig}</strong></div>
            ${rep.byFeasibility.unbewertet > 0 ? `<div class="donut-legend-row"><span><span class="dot-sm dot-open"></span> ${esc(t('unrated'))}</span><strong>${rep.byFeasibility.unbewertet}</strong></div>` : ''}
          </div>
        </div>
      </div>

      <div class="chart-card">
        <h3 class="chart-title">${esc(t('repDrivers'))}</h3>
        ${driversHtml}
      </div>
    </div>

    <div class="chart-card" style="margin-bottom:22px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
        <h3 class="chart-title" style="margin:0;">
          ${esc(t('repTrendPer'))} ${esc(granLabels[granularity])}${focusedStory ? ` — ${esc(focusedStory.title)}` : ` ${esc(t('repAllTopics'))}`}
        </h3>
        <div style="display:flex; gap:10px; align-items:center; font-size:0.77rem; color:var(--silver-2);">
          ${rep.peakBucket ? `<span>${esc(t('repPeak'))}: <strong style="color:var(--ink);">${esc(formatBucketLabel(rep.peakBucket.bucket, granularity))} (${rep.peakBucket.total}×)</strong></span>` : ''}
          ${focusedStory ? `<button type="button" class="text-link no-print" id="btn-reset-focus">${esc(t('repShowAllTopics'))}</button>` : ''}
        </div>
      </div>
      ${buildTimelineSvg(rep.mentionsTimeline || [], granularity)}
    </div>

    ${creditsHtml}

    <div class="chart-title">${esc(t('repOverview'))} (${rep.stories.length})</div>
    <div class="table-scroll">
    <table class="rep-table">
      <thead>
        <tr>
          <th>${esc(t('thDate'))}</th>
          <th>${esc(t('thTopic'))}</th>
          <th>${esc(t('thAuthor'))}</th>
          <th>${esc(t('thChannel'))}</th>
          <th>${esc(t('thAmpel'))}</th>
          <th>${esc(t('thStatus'))}</th>
          <th>${esc(t('thVolume'))}</th>
          <th>${esc(t('thDuration'))}</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    </div>
  `;
}

async function handleSubmit(ev) {
  ev.preventDefault();
  const titleInput = document.getElementById('fb-title');
  const textarea = document.getElementById('fb-text');
  const authorInput = document.getElementById('fb-author');
  const refInput = document.getElementById('fb-ref');
  const dupBanner = document.getElementById('dup-banner');
  const author = authorInput.value.trim();
  const interactionRef = refInput.value.trim();

  try {
    const res = await api('/api/stories', {
      method: 'POST',
      body: JSON.stringify({
        title: titleInput ? titleInput.value.trim() : '',
        rawFeedback: textarea.value.trim(),
        businessValues: [...state.businessValues],
        channel: state.channel,
        submittedBy: author,
        interactionRef,
        durationSeconds: state.composerDurationSec,
        origin: 'kunde'
      })
    });

    if (titleInput) titleInput.value = '';
    textarea.value = '';
    refInput.value = '';
    state.channel = '';
    state.businessValues.clear();
    document.querySelectorAll('.ch-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.val-badge').forEach((b) => b.classList.remove('active'));
    state.composerDurationSec = 0;
    const compPicker = document.getElementById('composer-dur-picker');
    if (compPicker?._setSeconds) compPicker._setSeconds(0, { syncText: true, syncWheel: false });

    state.freshId = res.story.id;
    state.ampel = 'alle';
    document.querySelectorAll('.ampel-btn[data-ampel]').forEach((b) => b.classList.toggle('active', b.dataset.ampel === 'alle'));

    if (res.duplicates && res.duplicates.length > 0) {
      const top = res.duplicates[0];
      dupBanner.textContent = `${t('toastSimilarTo')} «${top.title}» (${top.similarityPercent} %).`;
      dupBanner.classList.remove('hidden');
    } else {
      dupBanner.classList.add('hidden');
    }

    showToast(res.story.total_duration_seconds > 0 ? `${t('toastCaptured')} (${fmtDurationHuman(res.story.total_duration_seconds)})` : t('toastCaptured'));
    await Promise.all([loadIdeas(), loadHealth()]);
  } catch (err) {
    showToast(err.message);
  }
}

function init() {
  if (new URLSearchParams(window.location.search).get('embed') === '1') {
    document.body.classList.add('embed-mode');
  }

  // Omnichannel: PWA Service Worker & optionaler 1-Klick-Installationsknopf (Desktop/Mobile)
  if ('serviceWorker' in navigator && !document.body.classList.contains('embed-mode')) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  let deferredPrompt = null;
  const installBtn = document.getElementById('btn-install-app');
  const iosModal = document.getElementById('ios-install-modal');
  const isIosDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isIosDevice && !isStandalone && !document.body.classList.contains('embed-mode')) {
    installBtn?.classList.remove('hidden');
  }
  window.addEventListener('beforeinstallprompt', (ev) => {
    ev.preventDefault();
    deferredPrompt = ev;
    installBtn?.classList.remove('hidden');
  });
  installBtn?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.classList.add('hidden');
      return;
    }
    if (isIosDevice && iosModal) {
      document.getElementById('ios-install-title').textContent = t('iosInstallTitle');
      document.getElementById('ios-install-hint').textContent = t('iosInstallHint');
      document.getElementById('ios-step-1').textContent = t('iosStep1');
      document.getElementById('ios-step-2').textContent = t('iosStep2');
      document.getElementById('ios-step-3').textContent = t('iosStep3');
      document.getElementById('btn-ok-ios-install').textContent = t('iosInstallOk');
      iosModal.classList.remove('hidden');
    }
  });
  const closeIosModal = () => iosModal?.classList.add('hidden');
  document.getElementById('btn-close-ios-install')?.addEventListener('click', closeIosModal);
  document.getElementById('btn-ok-ios-install')?.addEventListener('click', closeIosModal);
  iosModal?.addEventListener('click', (ev) => {
    if (ev.target === iosModal) closeIosModal();
  });

  // Composer Zeit- & Wheel-Picker einhängen
  const durSlot = document.getElementById('composer-dur-slot');
  durSlot.innerHTML = renderDurationPickerHtml({ idAttr: 'composer-dur-picker', initialSec: 0, placeholder: 'Zeit' });
  bindDurationPicker(document.getElementById('composer-dur-picker'), (sec) => {
    state.composerDurationSec = sec;
  });

  // Keine vorausgefüllten Felder beim Start
  document.getElementById('fb-author').value = '';

  document.getElementById('rep-from').value = state.report.from;
  document.getElementById('rep-to').value = state.report.to;

  document.getElementById('brand-link').addEventListener('click', (ev) => {
    ev.preventDefault();
    setView('board');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Sprach-Umschalter DE / EN (permanent in localStorage gespeichert!)
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.lang = btn.dataset.lang === 'en' ? 'en' : 'de';
      localStorage.setItem('re_lang', state.lang);
      applyLanguageToStaticUi();
      renderAuthState();
      renderNotifications();
      loadIdeas();
      if (state.view === 'report') loadReport();
    });
  });

  // Benachrichtigungen (Glocke oben rechts)
  document.getElementById('btn-notif')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    document.getElementById('profile-popover')?.classList.add('hidden');
    const pop = document.getElementById('notif-popover');
    pop?.classList.toggle('hidden');
    if (pop && !pop.classList.contains('hidden')) {
      loadNotifications();
    }
  });

  document.getElementById('notif-popover')?.addEventListener('click', async (ev) => {
    const subBtn = ev.target.closest('.js-sub-toggle');
    if (subBtn) {
      ev.stopPropagation();
      const key = subBtn.dataset.sub;
      const nextSub = { ...state.subscription, [key]: !state.subscription[key] };
      try {
        state.subscription = await api('/api/notifications/subscription', {
          method: 'PUT',
          body: JSON.stringify(nextSub)
        });
        renderNotifications();
        showToast(t('subSaved'));
      } catch (err) {
        showToast(err.message);
      }
      return;
    }
    if (ev.target.closest('.js-notif-read-all')) {
      await api('/api/notifications/read', { method: 'POST', body: JSON.stringify({}) }).catch(() => {});
      await loadNotifications();
      return;
    }
    const item = ev.target.closest('.js-notif-open');
    if (item) {
      const nid = Number(item.dataset.nid);
      const storyId = Number(item.dataset.story);
      document.getElementById('notif-popover')?.classList.add('hidden');
      await api('/api/notifications/read', { method: 'POST', body: JSON.stringify({ id: nid }) }).catch(() => {});
      setView('board');
      await openStoryDrawer(storyId);
      await Promise.all([loadIdeas(), loadNotifications()]);
      document.querySelector(`[data-story-card="${storyId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  // Profil-Button, Account-Popover & Login-Maske
  document.getElementById('btn-profile').addEventListener('click', (ev) => {
    ev.stopPropagation();
    document.getElementById('notif-popover')?.classList.add('hidden');
    if (state.user) {
      document.getElementById('profile-popover').classList.toggle('hidden');
    } else {
      openAuthModal(state.hasAdmin ? 'login' : 'register');
    }
  });

  document.getElementById('profile-popover').addEventListener('click', async (ev) => {
    if (ev.target.closest('#pop-open-report')) {
      document.getElementById('profile-popover').classList.add('hidden');
      setView('report');
      return;
    }
    if (ev.target.closest('#pop-open-roles')) {
      document.getElementById('profile-popover').classList.add('hidden');
      openRolesModal();
      return;
    }
    if (ev.target.closest('#pop-logout')) {
      await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
      state.user = null;
      state.expandedId = null;
      state.expandedMentions = [];
      state.expandedQuestions = [];
      state.expandedIsOwner = false;
      document.getElementById('profile-popover').classList.add('hidden');
      renderAuthState();
      showToast(t('toastSignedOut'));
      await Promise.all([loadIdeas(), loadNotifications()]);
    }
  });

  document.getElementById('btn-close-roles').addEventListener('click', closeRolesModal);
  document.getElementById('roles-modal').addEventListener('click', async (ev) => {
    if (ev.target.id === 'roles-modal') {
      closeRolesModal();
      return;
    }
    const rTab = ev.target.closest('.js-roles-tab');
    if (rTab) {
      await openRolesModal(rTab.dataset.rtab);
      return;
    }
    const visBtn = ev.target.closest('.js-admin-vis');
    if (visBtn) {
      try {
        const res = await api('/api/settings', {
          method: 'PATCH',
          body: JSON.stringify({ commentsVisibility: visBtn.dataset.vis })
        });
        state.commentsVisibility = res.commentsVisibility;
        showToast(state.commentsVisibility === 'own_only' ? t('toastVisOwn') : t('toastVisAll'));
        await openRolesModal('matrix');
      } catch (err) {
        showToast(err.message);
      }
      return;
    }
    const roleBtn = ev.target.closest('.js-set-role');
    if (roleBtn) {
      try {
        await api(`/api/users/${roleBtn.dataset.uid}/role`, {
          method: 'PATCH',
          body: JSON.stringify({ role: roleBtn.dataset.role })
        });
        showToast(`${roleLabelFor(roleBtn.dataset.role)} ✓`);
        await openRolesModal('matrix');
      } catch (err) {
        showToast(err.message);
      }
    }
  });

  document.addEventListener('click', (ev) => {
    if (!ev.target.closest('.profile-wrap')) {
      document.getElementById('profile-popover')?.classList.add('hidden');
    }
    if (!ev.target.closest('.notif-wrap')) {
      document.getElementById('notif-popover')?.classList.add('hidden');
    }
  });

  document.getElementById('btn-close-auth').addEventListener('click', closeAuthModal);
  document.getElementById('auth-modal').addEventListener('click', (ev) => {
    if (ev.target.id === 'auth-modal') closeAuthModal();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      closeAuthModal();
      closeRolesModal();
    }
  });

  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => openAuthModal(tab.dataset.authMode));
  });

  document.getElementById('auth-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const errBox = document.getElementById('auth-error');
    errBox.classList.add('hidden');
    const fd = new FormData(ev.target);
    const endpoint = state.authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          displayName: String(fd.get('displayName') || '').trim(),
          username: String(fd.get('username') || '').trim(),
          password: String(fd.get('password') || '')
        })
      });
      state.user = res.user;
      if (res.hasAdmin || res.user?.role === 'admin') state.hasAdmin = true;
      closeAuthModal();
      renderAuthState();
      showToast(`Angemeldet als ${res.user.displayName} (${roleLabelFor(res.user.role)}).`);
      state.expandedId = null;
      await Promise.all([loadIdeas(), loadNotifications()]);
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.remove('hidden');
    }
  });

  document.getElementById('btn-toggle-report').addEventListener('click', () => {
    setView(state.view === 'report' ? 'board' : 'report');
  });

  document.getElementById('btn-export-pdf').addEventListener('click', () => window.print());

  document.getElementById('rep-from').addEventListener('change', (ev) => {
    state.report.from = ev.target.value;
    loadReport();
  });
  document.getElementById('rep-to').addEventListener('change', (ev) => {
    state.report.to = ev.target.value;
    loadReport();
  });

  function applyQuickRange(fromIso, toIso, gran) {
    state.report.from = fromIso;
    state.report.to = toIso;
    document.getElementById('rep-from').value = fromIso;
    document.getElementById('rep-to').value = toIso;
    if (gran) {
      state.report.granularity = gran;
      document.querySelectorAll('[data-rep-gran]').forEach((b) => b.classList.toggle('active', b.dataset.repGran === gran));
    }
    loadReport();
  }

  function isoDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }

  document.getElementById('rep-range-today').addEventListener('click', () => {
    const t = isoDaysAgo(0);
    applyQuickRange(t, t, 'day');
  });
  document.getElementById('rep-range-7d').addEventListener('click', () => {
    applyQuickRange(isoDaysAgo(6), isoDaysAgo(0), 'day');
  });
  document.getElementById('rep-range-30d').addEventListener('click', () => {
    applyQuickRange(isoDaysAgo(29), isoDaysAgo(0), 'day');
  });
  document.getElementById('rep-year-curr').addEventListener('click', () => {
    applyQuickRange(`${currentYear}-01-01`, `${currentYear}-12-31`, 'month');
  });
  document.getElementById('rep-year-prev').addEventListener('click', () => {
    applyQuickRange(`${currentYear - 1}-01-01`, `${currentYear - 1}-12-31`, 'month');
  });

  document.querySelectorAll('[data-rep-gran]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.report.granularity = btn.dataset.repGran;
      document.querySelectorAll('[data-rep-gran]').forEach((b) => b.classList.toggle('active', b === btn));
      loadReport();
    });
  });

  document.querySelectorAll('[data-rep-timemode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.report.timeMode = btn.dataset.repTimemode;
      document.querySelectorAll('[data-rep-timemode]').forEach((b) => b.classList.toggle('active', b === btn));
      document.getElementById('rep-min-pills').classList.toggle('hidden', state.report.timeMode !== 'projected');
      loadReport();
    });
  });

  document.getElementById('report-sheet').addEventListener('click', (ev) => {
    if (ev.target.closest('#btn-reset-focus')) {
      state.report.storyId = null;
      loadReport();
      return;
    }
    const item = ev.target.closest('.js-focus-story');
    if (item) {
      const id = Number(item.dataset.id);
      state.report.storyId = state.report.storyId === id ? null : id;
      loadReport();
    }
  });

  document.querySelectorAll('[data-rep-feas]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.report.feasibility = btn.dataset.repFeas;
      document.querySelectorAll('[data-rep-feas]').forEach((b) => b.classList.toggle('active', b === btn));
      loadReport();
    });
  });

  document.querySelectorAll('[data-rep-status]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.report.status = btn.dataset.repStatus;
      document.querySelectorAll('[data-rep-status]').forEach((b) => b.classList.toggle('active', b === btn));
      loadReport();
    });
  });

  document.querySelectorAll('[data-rep-min]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.report.minutesPerRequest = Number(btn.dataset.repMin);
      document.querySelectorAll('[data-rep-min]').forEach((b) => b.classList.toggle('active', b === btn));
      loadReport();
    });
  });

  document.getElementById('rep-rate')?.addEventListener('input', (ev) => {
    state.report.hourlyRate = ev.target.value.trim();
    clearTimeout(init._rateT);
    init._rateT = setTimeout(loadReport, 220);
  });

  document.querySelectorAll('.val-badge[data-value]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.value;
      if (state.businessValues.has(val)) {
        state.businessValues.delete(val);
        btn.classList.remove('active');
      } else {
        state.businessValues.add(val);
        btn.classList.add('active');
      }
    });
  });

  document.querySelectorAll('.ch-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = state.channel === btn.dataset.channel ? '' : btn.dataset.channel;
      state.channel = next;
      document.querySelectorAll('.ch-btn').forEach((b) => b.classList.toggle('active', b.dataset.channel === next));
    });
  });

  const form = document.getElementById('feedback-form');
  form.addEventListener('submit', handleSubmit);
  document.getElementById('fb-text').addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
      ev.preventDefault();
      form.requestSubmit();
    }
  });

  document.querySelectorAll('.ampel-btn[data-ampel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.ampel = btn.dataset.ampel;
      document.querySelectorAll('.ampel-btn[data-ampel]').forEach((b) => b.classList.toggle('active', b === btn));
      loadIdeas();
    });
  });

  document.querySelectorAll('.status-group .st-btn[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;
      document.querySelectorAll('.status-group .st-btn[data-mode]').forEach((b) => b.classList.toggle('active', b === btn));
      loadIdeas();
    });
  });

  document.getElementById('filter-q').addEventListener('input', () => {
    clearTimeout(init._t);
    init._t = setTimeout(loadIdeas, 180);
  });

  document.getElementById('ideas-list').addEventListener('click', async (ev) => {
    const toggleAllBtn = ev.target.closest('.js-toggle-all-mentions');
    if (toggleAllBtn) {
      ev.stopPropagation();
      state.showAllMentions = !state.showAllMentions;
      await loadIdeas();
      return;
    }

    if (
      ev.target.closest('.dur-picker') ||
      ev.target.closest('.js-quant-form') ||
      ev.target.closest('.js-dec-comment-form') ||
      ev.target.closest('.case-preview')
    ) {
      return;
    }

    const copyBtn = ev.target.closest('.js-copy');
    if (copyBtn) {
      ev.stopPropagation();
      try {
        await navigator.clipboard.writeText(copyBtn.dataset.text || '');
        showToast(t('toastCopied'));
      } catch {
        showToast(t('toastCopyFail'));
      }
      return;
    }

    const mergeOpen = ev.target.closest('.js-merge-open');
    if (mergeOpen) {
      ev.stopPropagation();
      const id = Number(mergeOpen.dataset.id);
      state.mergeSourceId = state.mergeSourceId === id ? null : id;
      await loadIdeas();
      return;
    }

    const mergeCancel = ev.target.closest('.js-merge-cancel');
    if (mergeCancel) {
      ev.stopPropagation();
      state.mergeSourceId = null;
      await loadIdeas();
      return;
    }

    const mergeTarget = ev.target.closest('.js-merge-target');
    if (mergeTarget) {
      ev.stopPropagation();
      try {
        await api(`/api/stories/${mergeTarget.dataset.source}/merge`, {
          method: 'POST',
          body: JSON.stringify({ targetId: Number(mergeTarget.dataset.target) })
        });
        state.mergeSourceId = null;
        state.expandedId = Number(mergeTarget.dataset.target);
        state.expandedMentions = await api(`/api/stories/${state.expandedId}/mentions`).catch(() => []);
        state.activeMentionId = state.expandedMentions[0]?.id ?? null;
        showToast(t('toastMerged'));
        await Promise.all([loadIdeas(), loadHealth()]);
      } catch (err) {
        showToast(err.message);
      }
      return;
    }

    const delBtn = ev.target.closest('.js-delete');
    if (delBtn) {
      ev.stopPropagation();
      try {
        await api(`/api/stories/${delBtn.dataset.id}`, { method: 'DELETE' });
        state.expandedId = null;
        showToast(t('toastDeleted'));
        await Promise.all([loadIdeas(), loadHealth()]);
      } catch (err) {
        showToast(err.message);
      }
      return;
    }

    const relBtn = ev.target.closest('.js-rel-vote');
    if (relBtn) {
      ev.stopPropagation();
      const id = Number(relBtn.dataset.id);
      const vote = relBtn.dataset.vote;
      try {
        await api(`/api/stories/${id}/relevance`, {
          method: 'POST',
          body: JSON.stringify({ vote })
        });
        if (state.expandedId === id && canReviewUi()) {
          state.expandedRelevance = await api(`/api/stories/${id}/relevance`).catch(() => null);
        }
        showToast(t('toastRelSaved'));
        await loadIdeas();
      } catch (err) {
        showToast(err.message);
      }
      return;
    }

    const decVoteBtn = ev.target.closest('.js-dec-vote');
    if (decVoteBtn) {
      ev.stopPropagation();
      const id = Number(decVoteBtn.dataset.id);
      const sentiment = decVoteBtn.dataset.sentiment;
      await api(`/api/stories/${id}/decision-feedback`, {
        method: 'POST',
        body: JSON.stringify({
          sentiment,
          author: state.user?.displayName || ''
        })
      });
      showToast(sentiment === 'down' ? t('toastVoteDown') : t('toastVoteUp'));
      await loadIdeas();
      return;
    }

    const decCommentOpen = ev.target.closest('.js-dec-comment-open');
    if (decCommentOpen) {
      ev.stopPropagation();
      const id = Number(decCommentOpen.dataset.id);
      state.pendingDecFeedback = state.pendingDecFeedback?.id === id ? null : { id, sentiment: 'down' };
      await loadIdeas();
      if (state.pendingDecFeedback?.id === id) {
        document.querySelector(`.js-dec-comment-form[data-id="${id}"] input[name="comment"]`)?.focus();
      }
      return;
    }

    const voteBtn = ev.target.closest('.js-vote');
    if (voteBtn) {
      ev.stopPropagation();
      const id = Number(voteBtn.dataset.id);
      state.effortId = state.effortId === id ? null : id;
      state.effortChannel = '';
      await loadIdeas();
      if (state.effortId === id) {
        const durEl = document.querySelector(`.js-quant-form[data-id="${id}"] .dur-input`);
        durEl?.focus();
      }
      return;
    }

    const feasBtn = ev.target.closest('.js-feas');
    if (feasBtn) {
      ev.stopPropagation();
      try {
        const isAlreadyActive = feasBtn.classList.contains(`active-${feasBtn.dataset.feas}`);
        await api(`/api/stories/${feasBtn.dataset.id}/feasibility`, {
          method: 'PATCH',
          body: JSON.stringify({ feasibility: isAlreadyActive ? 'unbewertet' : feasBtn.dataset.feas })
        });
        await loadIdeas();
      } catch (err) {
        showToast(err.message);
      }
      return;
    }

    const pickBtn = ev.target.closest('.js-pick');
    if (pickBtn) {
      ev.stopPropagation();
      const id = Number(pickBtn.dataset.id);
      const nextStatus = pickBtn.dataset.status;
      state.pendingStatus =
        state.pendingStatus && state.pendingStatus.id === id && state.pendingStatus.status === nextStatus
          ? null
          : { id, status: nextStatus };
      await loadIdeas();
      if (state.pendingStatus?.id === id) {
        document.querySelector(`.js-decide[data-id="${id}"] textarea[name="publicResponse"]`)?.focus();
      }
      return;
    }

    const body = ev.target.closest('.js-toggle');
    if (body && !ev.target.closest('form, input, textarea, button, a')) {
      const id = Number(body.dataset.id);
      if (state.expandedId === id) {
        state.expandedId = null;
        state.expandedMentions = [];
        state.expandedQuestions = [];
        state.expandedIsOwner = false;
        state.activeMentionId = null;
        state.showAllMentions = false;
      } else {
        await openStoryDrawer(id);
      }
      state.pendingStatus = null;
      await loadIdeas();
    }
  });

  document.getElementById('ideas-list').addEventListener('submit', async (ev) => {
    const quantForm = ev.target.closest('.js-quant-form');
    if (quantForm) {
      ev.preventDefault();
      const id = Number(quantForm.dataset.id);
      const picker = quantForm.querySelector('[data-dur-picker]');
      const durInput = picker?.querySelector('.dur-input');
      const refVal = (quantForm.querySelector('input[name="interactionRef"]')?.value || '').trim();
      const feedbackNote = (quantForm.querySelector('input[name="feedbackNote"]')?.value || '').trim();
      const customerRef = (quantForm.querySelector('input[name="customerRef"]')?.value || '').trim();
      const recordedBy = (quantForm.querySelector('input[name="recordedBy"]')?.value || '').trim();
      const durationSeconds = durInput && durInput.value.trim() ? parseMMSS(durInput.value) : Number(picker?.dataset.sec || 0);

      if (durationSeconds < 60) {
        showToast(t('toastMinTime'));
        durInput?.focus();
        return;
      }

      try {
        await api(`/api/stories/${id}/vote`, {
          method: 'POST',
          body: JSON.stringify({
            delta: 1,
            durationSeconds,
            interactionRef: refVal,
            feedbackNote,
            customerRef,
            recordedBy,
            channel: state.effortChannel
          })
        });
        state.votedIds.add(id);
        localStorage.setItem('re_voted', JSON.stringify([...state.votedIds]));
        state.effortId = null;
        state.effortChannel = '';
        if (state.expandedId === id) {
          state.expandedMentions = await api(`/api/stories/${id}/mentions`).catch(() => []);
        }
        showToast(`+1 (${fmtDurationHuman(durationSeconds)})`);
        await Promise.all([loadIdeas(), loadHealth()]);
      } catch (err) {
        showToast(err.message);
      }
      return;
    }

    const decCommentForm = ev.target.closest('.js-dec-comment-form');
    if (decCommentForm) {
      ev.preventDefault();
      const comment = new FormData(decCommentForm).get('comment');
      await api(`/api/stories/${decCommentForm.dataset.id}/decision-feedback`, {
        method: 'POST',
        body: JSON.stringify({
          sentiment: 'down',
          comment,
          author: state.user?.displayName || ''
        })
      });
      state.pendingDecFeedback = null;
      showToast(t('toastDecFbSaved'));
      await loadIdeas();
      return;
    }

    const qaAskForm = ev.target.closest('.js-qa-ask');
    if (qaAskForm) {
      ev.preventDefault();
      const storyId = Number(qaAskForm.dataset.story);
      const bodyText = String(new FormData(qaAskForm).get('body') || '').trim();
      try {
        await api(`/api/stories/${storyId}/questions`, {
          method: 'POST',
          body: JSON.stringify({ body: bodyText })
        });
        await openStoryDrawer(storyId);
        showToast(t('toastQuestionSent'));
        await Promise.all([loadIdeas(), loadNotifications()]);
      } catch (err) {
        showToast(err.message);
      }
      return;
    }

    const qaReplyForm = ev.target.closest('.js-qa-reply');
    if (qaReplyForm) {
      ev.preventDefault();
      const storyId = Number(qaReplyForm.dataset.story);
      const qid = Number(qaReplyForm.dataset.qid);
      const replyBody = String(new FormData(qaReplyForm).get('replyBody') || '').trim();
      try {
        await api(`/api/stories/${storyId}/questions/${qid}/reply`, {
          method: 'POST',
          body: JSON.stringify({ replyBody })
        });
        await openStoryDrawer(storyId);
        showToast(t('toastReplySent'));
        await Promise.all([loadIdeas(), loadNotifications()]);
      } catch (err) {
        showToast(err.message);
      }
      return;
    }

    const notesForm = ev.target.closest('.js-notes');
    if (notesForm) {
      ev.preventDefault();
      const fd = new FormData(notesForm);
      try {
        await api(`/api/stories/${notesForm.dataset.id}/notes`, {
          method: 'PATCH',
          body: JSON.stringify({ internalNote: fd.get('internalNote') })
        });
        showToast(t('toastNoteSaved'));
        await loadIdeas();
      } catch (err) {
        showToast(err.message);
      }
      return;
    }

    const formEl = ev.target.closest('.js-decide');
    if (!formEl) return;
    ev.preventDefault();
    const fd = new FormData(formEl);
    try {
      await api(`/api/stories/${formEl.dataset.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          status: formEl.dataset.status,
          publicResponse: fd.get('publicResponse'),
          internalNote: fd.get('internalNote')
        })
      });
      state.pendingStatus = null;
      showToast(t('toastSaved'));
      await Promise.all([loadIdeas(), loadHealth()]);
    } catch (err) {
      showToast(err.message);
    }
  });

  applyLanguageToStaticUi();
  (async () => {
    await loadAuthAndSettings();
    await Promise.all([loadHealth(), loadIdeas(), loadNotifications()]);
  })();
  setInterval(loadHealth, 20000);
  setInterval(loadNotifications, 15000);
}

init();
