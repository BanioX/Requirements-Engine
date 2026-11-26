# ONESTRAND · Requirements Engine

> **Offizieller ATL-Betrieb (0 CHF):** Lokal per `docker compose up -d` + Cloudflare Quick Tunnel (`*.trycloudflare.com`) · **Container-Image (Multi-Arch):** `ghcr.io/baniox/requirements-engine:v1.0.0` (`linux/amd64` & `linux/arm64`)
> **Zusätzliche Demo-Instanz:** `https://re.onestrand.ch` (auf meiner bereits unabhängig ausserhalb dieses Projekts bestehenden Domain `onestrand.ch` für mögliche spätere Weiternutzung und interne Vorführungen; für die ATL und Drittpersonen nicht erforderlich).

Branchenneutrale, minimalistische interne Plattform für strukturiertes **Requirements Engineering**, **Mengen- und Zeitaufwand-Erfassung** sowie **Management-Reporting** — orientiert an **IREB (Pohl & Rupp)** und den Usability-Heuristiken von **Dr. Jakob Nielsen** (ohne Dropdown-Menüs, ohne unnötige Checkboxen, ohne Branchenballast).

Entwickelt und produktiv betrieben im Rahmen der **Anwendungs- und Transferleistung (ATL)** im Modul **M042 Applications Engineering** (HF Wirtschaftsinformatik, HKV Aarau).

---

## Einblick in die Oberfläche (Praxisbeispiel: Kundenservice & Logistik)

> Alle Beispielbilder zeigen ein vollständig fiktives, branchenneutrales Praxisbeispiel aus einem Schweizer Kundenservice- und Logistik-Betrieb (z. B. *Adressänderung nach Bestellbestätigung*, *mobiles Retourenetikett*, *Statusanzeige bei Lieferverzögerung*).

### 1. Hauptansicht — Strukturierte Erfassung & Prioritäten-Board
Mitarbeitende erfassen wiederkehrende Probleme in Sekunden mit **Titel**, **Beschrieb**, **Mehrwert-Badges** (*Effizienz, Kundenerlebnis, Klarheit, Qualität, Umsatz, Kundenbindung*), **Kanal**, **Referenz** und realem **Zeitaufwand (`Min:Sek`)**. Wiederkehrende Fälle werden mit `+1` samt eigener Gesprächsdauer gezählt und über `👍 / 👎` auf Relevanz bewertet.

![Hauptansicht ONESTRAND Requirements Engine](docs/images/ui-board.png)

### 2. Geöffneter Fall — Einzelfälle, Rückfragen-Thread & Minderheitsstimmen-Governance
Beim Aufklappen zeigt jeder Fall alle einzelnen Kundenmeldungen als kompakte Badges mit Vorschau, die **Aufwand-Einschätzung** (*Einfach / Mittel / Aufwändig*), rollengebundene Status-Aktionen sowie zwei smarte Qualitätsmechanismen:
- **Rückfragen-Thread mit Autoren-Sperre:** `Dev`, `Supervisor`, `Manager` und `Admin` stellen Rückfragen mit Rollen-Badge — ausschliesslich der ursprüngliche Fall-Erfasser kann direkt antworten.
- **Protokolliertes Relevanz-Voting (`👍 / 👎`):** Maximal 1 Stimme pro Person mit Name & Rolle gegen Missbrauch. Bei einer klaren Mehrheit (`≥ 3`) weist das System automatisch auf **Minderheitsstimmen** (1–2 abweichende Personen) hin, damit gezielt nachgefragt statt Spezialwissen überstimmt wird.

![Geöffneter Fall mit Rückfragen-Thread und Relevanz-Protokoll](docs/images/ui-detail-qa.png)

### 3. Smart-Benachrichtigungen & Report-Abos (Glocke)
Niemand muss das Board aktiv überwachen: Rückfragen, Antworten und selbst gewählte **1-Klick-Abos** (*Abo: Umgesetzt*, *Abo: Ab 5×*, *Abo: Entscheide*) informieren zielgerichtet über die Glocke oben rechts — schlank im Nebenlauf statt als zusätzliche Hauptarbeit.

![Smart-Benachrichtigungen und Report-Abos](docs/images/ui-notifications.png)

### 4. Management-Report, Einsparungs-Nachweis & Excel-/PDF-Export
Der Report wertet beliebige Zeiträume nach **Tag, Woche, Monat oder Jahr** aus und rechnet standardmässig **ausschliesslich mit real erfassten Zeiten** (keine geschätzten Fantasiezahlen). Umgesetzte Themen zeigen mit optionalem Stundensatz (`CHF Std.`) die messbare Entlastung. **Menge** und **Dauer** sind in Report und Excel-CSV sauber getrennt filter- und summierbar.

![Management-Report mit Einsparungs-Nachweis und Grafiken](docs/images/ui-report.png)

### 5. 5-Rollen-Rechtematrix, Kommentar-Sichtbarkeit & Audit-Protokoll
Administratoren verwalten beliebig viele **Nutzer, Supervisoren, Devs, Manager und Admins** per 1 Klick (Änderungen greifen live ohne Neu-Login), steuern die **Kommentar-Sichtbarkeit** (*Alle sehen alle* vs. *Nur eigene, Chef alle*) und prüfen das vollständige **Audit-Protokoll**.

![5-Rollen-Rechtematrix und Benutzerverwaltung](docs/images/ui-roles-admin.png)

---

## Kernfunktionen auf einen Blick

| Bereich | Umsetzung |
| :--- | :--- |
| **Erfassung & Quantifizierung** | Titel, Beschrieb, 6 Einwort-Mehrwert-Badges, 4 Eingangskanäle (*Persönlich, Telefon, Chat, E-Mail*), Erfasser, Referenz-ID und individueller Zeitaufwand (`Min:Sek`, Minimum `01:00` bei `+1`-Buchung). |
| **5-Rollen-Workflow (RBAC)** | `Nutzer` (erfassen/voten) · `Supervisor` (`In Prüfung`) · `Dev` (`In Arbeit` & `Erledigt`) · `Manager` (`Ablehnen`, `Löschen`, Report & Excel) · `Admin` (Rechtematrix, Sichtbarkeit, Audit-Log). |
| **Rückfragen & Abos** | Rollen-gekennzeichneter Q&A-Thread mit serverseitiger Autoren-Antwortsperre (`HTTP 403` für Dritte) + In-App-Glocke mit persönlichen Event-Abos (*Umgesetzt*, *Ab 5×*, *Entscheide*). |
| **Relevanz-Governance** | Protokolliertes `👍 / 👎`-Voting (1 Stimme pro Person) mit automatischer **Minderheitsstimmen-Erkennung** zur Wertschätzung von Fachwissen und als Missbrauchsschutz. |
| **Management-Report & Exporte** | Saisonale Auswertung (Tag/Woche/Monat/Jahr), reale Messzeiten, ROI-Einsparungsbox (`CHF Std.`), druckfertiges A4-PDF ohne Browser-Kopfzeile, UTF-8 Excel-CSV mit getrennten Spalten *Menge* & *Dauer*. |
| **Zweisprachigkeit & Auslieferungskanäle** | Vollständig zweisprachig (**DE \| EN**), nutzbar als **Website**, installierbare **Desktop-/iPhone-PWA** (`site.webmanifest`), einbettbar in **Confluence** (`?embed=1` + Forge-Manifest) sowie geplant als eigenständiges **Windows-Programm (`.exe`)** — siehe [Produkt- & Kanalplanung](docs/PRODUKT_ROADMAP_KANAELE.md). |
| **Betrieb, Sicherheit, Recht & Auto-Deploy** | Aktiver `/health`-Check (`SELECT 1`), Non-Root-Container (`Node 24 Alpine`), `scrypt`-Passwort-Hashing + persistentes `session_secret`, integriertes **Impressum & revDSG-Datenschutzerklärung** (100 % Self-Hosting, kein Anbieter-Server), Gitleaks Secret-Scan, **27 automatisierte Tests**, Pull-Deployment via **Watchtower** alle 30 Sekunden ab `main`. |

---

## Architektur & Automatisches Deployment (CI/CD + Watchtower)

Jede Änderung folgt einem vollständig automatisierten, nachvollziehbaren Ablauf:

1. **Entwicklung auf Feature-Branch & Pull Request:** GitHub Actions startet automatisch alle **27 Unit- & API-Tests (`npm test`)** sowie einen vollständigen **Gitleaks Secret-Scan** über die gesamte Git-History.
2. **Merge auf `main`:** Nach erfolgreichem Test- und Security-Gate baut GitHub Actions automatisch ein **Multi-Arch-Container-Image** (`linux/amd64` + `linux/arm64`) inkl. Git-Commit-Hash und veröffentlicht es auf `ghcr.io/baniox/requirements-engine:latest`.
3. **Auto-Deploy via Watchtower (30 s, Pull-Prinzip):** Weil ein Laptop hinter dem Heim-Router von GitHub aus nicht erreichbar ist, fragt `nickfedor/watchtower` von innen nach aussen alle 30 Sekunden per Label-Scope (`WATCHTOWER_SCOPE=requirements-engine`) `ghcr.io` ab und startet ausschliesslich den `app`-Container ohne Handarbeit und ohne Datenverlust neu.

---

## Schnellstart (Betrieb / Drittperson mit fertigem GHCR-Image)

Das fertige Multi-Arch-Image (`linux/amd64` & `linux/arm64`) liegt öffentlich unter `ghcr.io/baniox/requirements-engine` und startet ohne Anpassungen auf Windows (x64 & ARM64), macOS und Linux:

1. Repository klonen (für den unveränderten Abgabe-Stand `v1.0.0` direkt auf das Release-Tag wechseln) und `.env` anlegen:
   ```powershell
   git clone https://github.com/BanioX/Requirements-Engine.git
   cd Requirements-Engine
   git checkout v1.0.0
   Copy-Item .env.example .env
   ```
   In `.env` ein eigenes lokales `POSTGRES_PASSWORD` sowie `APP_IMAGE_TAG=v1.0.0` setzen.
2. Container-Stack starten (**PostgreSQL 17 + App + Cloudflare Tunnel + Watchtower**):
   ```powershell
   docker compose up -d
   ```
3. Healthcheck & öffentliche HTTPS-URL prüfen:
   ```powershell
   curl http://localhost:3000/health
   docker compose logs tunnel
   ```

> **Erster Login:** Das erste registrierte Benutzerkonto erhält automatisch die Rolle **Admin** — es liegen keinerlei hartcodierte Passwörter oder Secrets im Repository.

---

## Lokale Entwicklung & Tests (z. B. auch direkt in VS Code)

Das Projekt ist ein standardkonformes Node.js-/Docker-Repository und lässt sich direkt in **VS Code** oder jedem anderen Editor öffnen:

```powershell
# Lokales Image bauen und starten
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# Alle 27 automatisierten Tests ausführen
npm test
```

## Weiterführende Dokumentation

- [Architektur & Zielbild](docs/ARCHITEKTUR.md)
- [Produkt- & Kanalplanung (Website, PWA, Confluence & Windows `.exe`)](docs/PRODUKT_ROADMAP_KANAELE.md)
- [Agile Sprint-Planung](docs/SPRINT_PLANUNG.md)
- [Testkonzept & Testprotokoll](docs/TESTKONZEPT_UND_PROTOKOLL.md)
- [Betriebs-Checkliste (6 Bereiche, 24 Punkte)](docs/BETRIEBS_CHECKLISTE.md)
- [KI-Arbeitsprotokoll](docs/KI_ARBEITSPROTOKOLL.md)
- [KI-Reflexion](docs/KI_REFLEXION.md)
- [Confluence-Integration (`?embed=1` & Forge)](integrations/confluence/README.md)

---

## Lizenz, Eigenbetrieb & Reaktive Kenntnisnahme

**Proprietär — Alle Rechte vorbehalten.**

Copyright © 2026 Onestrand | Alban Hyseni. Alle Rechte vorbehalten.

Siehe [LICENSE](LICENSE). Jede Nutzung, Vervielfältigung, Veränderung oder Weitergabe erfordert vorgängig die ausdrückliche schriftliche Zustimmung. Nutzende erhalten ausschliesslich reaktiv Kenntnis von der Existenz dieses Produkts. Der Anbieter stellt weder einen produktiven Server noch eine Datenbank zur Verfügung; berechtigte Nutzende betreiben das Produkt ausschliesslich auf eigener Infrastruktur (Self-Hosting).
