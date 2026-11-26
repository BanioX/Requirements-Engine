# Agile Sprint-Planung (Teilaufgabe 2 — Zwischenstand, Auf Hold seit 26.11.2026)

> **Status-Notiz:** Die Arbeit an dieser ATL wurde am **26.11.2026 als gesicherter Zwischenstand vorerst auf Hold gesetzt**. Alle technischen Grundbausteine und das feste Release `v1.0.0` sind umgesetzt; die persönlichen Abnahmetests (`TF-01`–`TF-06`), das Nachweisvideo (< 3 Min.) sowie die finale Berichtsabgabe folgen rechtzeitig vor dem **10.01.2027**.
> **Planungstool:** GitHub Issues & Milestones (kostenlos, öffentlich einsehbar ohne Login).
> **Zeitraum:** 25.11.2026 (Auftragserteilung) bis 10.01.2027 (Abgabetermin).
> **Schätzmethode:** Relative **Story Points (`1 SP` = sehr klein bis `5 SP` = gross)** statt scheinbar genauer Stundenzahlen. Alle Angaben stimmen 1:1 mit den GitHub-Issues `#1`–`#25` und dem PDF-Zwischenstand überein.

---

## Sprint 1: Fundament, Applikation & containerisierter Grundbetrieb (25.11.2026 – 13.12.2026)

### US-1 (Ziel – Containerisierte Webapplikation) — `Umgesetzt (26.11.2026)`
**Als** Betriebsverantwortlicher **möchte ich** Requirements Engine in getrennten Docker-Containern (App + PostgreSQL) über `docker compose` starten können, **damit** die Anwendung reproduzierbar auf dem Laptop und bei Drittpersonen läuft.

| Task-ID | Issue | Titel | Beschreibung | Zieltermin (Plan) | Schätzung | Stand (26.11.2026) |
| :--- | :-: | :--- | :--- | :---: | :---: | :--- |
| T1.1 | `#8` | Zielbild & Architektur entwerfen | Architekturdiagramm (Request- & Pull-Deployment-Weg) erstellen und gegen laufenden Betrieb prüfen. | 27.11.2026 | `2 SP` | Umgesetzt (26.11.) |
| T1.2 | `#9` | GitHub-Repo & Grundausstattung anlegen | Repo (`BanioX/Requirements-Engine`) inkl. `.gitignore`, `.env.example`, Branch-Schutz, Tests und Projekt-Standard aufsetzen. | 28.11.2026 | `1 SP` | Umgesetzt (26.11.) |
| T1.3 | `#10` | Requirements Engine MVP, DB & Rechtliches | Web-UI + REST-API für Ideen-Erfassung, reale `Min:Sek`-Zeiten, 5-Rollen-RBAC, Report, PWA, Impressum/revDSG und neutrale Beispiele. | 04.12.2026 | `5 SP` | Umgesetzt (26.11.) |
| T1.4 | `#11` | Dockerfile & `docker-compose.yml` erstellen | Non-Root-Dockerfile (Node 24 Alpine) und Compose-Stack mit getrennten `app`- und `db`-Containern erstellen. | 06.12.2026 | `2 SP` | Umgesetzt (26.11.) |

### US-2 (Muss-Punkt 1 – Datenpersistenz) — `Technisch umgesetzt · Abnahme auf Hold`
**Als** Betriebsverantwortlicher **möchte ich**, dass alle Einträge und Protokolle in einem persistenten Docker-Volume liegen, **damit** nach einem Neustart der Container keine Daten verloren gehen.

| Task-ID | Issue | Titel | Beschreibung | Zieltermin (Plan) | Schätzung | Stand (26.11.2026) |
| :--- | :-: | :--- | :--- | :---: | :---: | :--- |
| T2.1 | `#12` | Named Volume `pg_data` & Migration | Benanntes Docker-Volume (`pg_data`) einbinden und DB-Migration beim App-Start idempotent ausführen. | 07.12.2026 | `1 SP` | Umgesetzt (26.11.) |
| T2.2 | `#13` | Persistenz-Neustart lokal prüfen | Testdaten anlegen, `docker compose down` und `up -d` ausführen und Datenbestand persönlich prüfen. | 08.12.2026 | `1 SP` | KI-Vorlauf OK · Abnahme auf Hold |

### US-3 (Muss-Punkt 2 – Secrets-Management) — `Umgesetzt (26.11.2026)`
**Als** Betriebsverantwortlicher **möchte ich** Passwörter und Tokens strikt ausserhalb des Repositories verwalten, **damit** weder im aktuellen Stand noch in der Git-History Zugangsdaten auftauchen.

| Task-ID | Issue | Titel | Beschreibung | Zieltermin (Plan) | Schätzung | Stand (26.11.2026) |
| :--- | :-: | :--- | :--- | :---: | :---: | :--- |
| T3.1 | `#14` | Umgebungsvariablen & `.env.example` | Zugangsdaten über `.env` injizieren; `.env` in `.gitignore` sperren und `.env.example` nur mit Platzhaltern pflegen. | 09.12.2026 | `1 SP` | Umgesetzt (26.11.) |
| T3.2 | `#15` | Automatischer Secret-Scan (Gitleaks) | Git-History und Codebase automatisch per Gitleaks in GitHub Actions prüfen (0 Leaks). | 11.12.2026 | `1 SP` | Umgesetzt (26.11.) |

### US-4 (Muss-Punkt 3 – Healthcheck) — `Umgesetzt (26.11.2026)`
**Als** Betriebsverantwortlicher **möchte ich** einen aussagekräftigen Healthcheck für App und Datenbank betreiben, **damit** Ausfälle automatisch erkannt werden.

| Task-ID | Issue | Titel | Beschreibung | Zieltermin (Plan) | Schätzung | Stand (26.11.2026) |
| :--- | :-: | :--- | :--- | :---: | :---: | :--- |
| T4.1 | `#16` | `GET /health` mit aktivem `SELECT 1` | HTTP-Endpunkt bauen, der aktiv `SELECT 1` gegen PostgreSQL prüft (`HTTP 200` / `503`). | 11.12.2026 | `1 SP` | Umgesetzt (26.11.) |
| T4.2 | `#17` | Docker-Healthchecks & Startfolge | `HEALTHCHECK` für App und `pg_isready` für PostgreSQL inkl. `depends_on: service_healthy`. | 13.12.2026 | `1 SP` | Umgesetzt (26.11.) |

*Summe Sprint 1: **16 SP** (13 von 14 Issues geschlossen, `#13` auf Hold für persönliche Abnahme).*

---

## Sprint 2: CI/CD, Pull-Auto-Deploy, Tunnel, Tests & Abgabe (14.12.2026 – 08.01.2027)

### US-5 (Muss-Punkt 4 – Automatisiertes Pull-Deployment ab `main`) — `Technisch umgesetzt · Abnahme auf Hold`
**Als** Betriebsverantwortlicher **möchte ich**, dass ein Push auf `main` automatisch getestet, als Multi-Arch-Image auf `ghcr.io` gebaut und per Pull-Verfahren ohne Handarbeit auf den Laptop ausgerollt wird, **damit** neue Versionen reproduzierbar live gehen.

| Task-ID | Issue | Titel | Beschreibung | Zieltermin (Plan) | Schätzung | Stand (26.11.2026) |
| :--- | :-: | :--- | :--- | :---: | :---: | :--- |
| T5.1 | `#18` | GitHub Actions CI & Multi-Arch Build | Workflow für Tests, Gitleaks sowie `linux/amd64,linux/arm64`-Build nach `ghcr.io`. | 18.12.2026 | `3 SP` | Umgesetzt (26.11.) |
| T5.2 | `#19` | Pull-Auto-Deploy (Watchtower) | `nickfedor/watchtower` (Scope `requirements-engine`, 30 s) einrichten und live abnehmen. | 21.12.2026 | `2 SP` | KI-Vorlauf OK · Abnahme auf Hold |
| T5.3 | `#20` | Release `v1.0.0` & Drittpersonen-Start | Tag `v1.0.0` veröffentlichen und Startbarkeit im frischen Ordner persönlich prüfen. | 27.12.2026 | `2 SP` | Tag `v1.0.0` live · Abnahme auf Hold |

### US-6 (Ziel – Öffentliche HTTPS-Veröffentlichung) — `Umgesetzt (26.11.2026)`
**Als** Betriebsverantwortlicher **möchte ich** die lokal laufende Applikation über einen Cloudflare Tunnel per HTTPS öffentlich zugänglich machen, **damit** externe Zugriffe ohne offene Ports sicher funktionieren.

| Task-ID | Issue | Titel | Beschreibung | Zieltermin (Plan) | Schätzung | Stand (26.11.2026) |
| :--- | :-: | :--- | :--- | :---: | :---: | :--- |
| T6.1 | `#21` | Cloudflare Tunnel integrieren | `cloudflared` in `docker-compose.yml` einbinden (Quick Tunnel 0 CHF + Demo `re.onestrand.ch`). | 22.12.2026 | `2 SP` | Umgesetzt (26.11.) |

### US-7 (Qualitätssicherung, Checkliste, Bericht & Video) — `Auf Hold seit 26.11.2026`
**Als** Betriebsverantwortlicher **möchte ich** alle Anforderungen persönlich testen, den Betrieb in einer Checkliste bewerten und die Ergebnisse sauber dokumentieren, **damit** die Funktionsfähigkeit belegt statt nur behauptet wird.

| Task-ID | Issue | Titel | Beschreibung | Zieltermin (Plan) | Schätzung | Stand (26.11.2026) |
| :--- | :-: | :--- | :--- | :---: | :---: | :--- |
| T7.1 | `#22` | Testfälle & persönliche Abnahme (`TF-01`–`TF-06`) | 6 Testfälle inkl. Negativtest definieren und persönlich live abnehmen. | 30.12.2026 | `3 SP` | Auf Hold (Abnahme offen) |
| T7.2 | `#23` | Betriebs-Checkliste (6 Bereiche, 24 Punkte) | Alle 6 Pflichtbereiche mit Status, Begründung, Impressum/revDSG & Kanal-Roadmap ausarbeiten. | 02.01.2027 | `2 SP` | Umgesetzt (26.11.) |
| T7.3 | `#24` | Architektur reinzeichnen & PDF-Bericht | `draw.io`-Diagramm, KI-Protokoll/Reflexion und HFWI-PDF erstellen (aktuell Zwischenstand). | 06.01.2027 | `3 SP` | Auf Hold (Zwischenstand gesichert) |
| T7.4 | `#25` | Nachweisvideo (max. 3 Min.) & Endkontrolle | Alle 4 Muss-Punkte im laufenden Betrieb persönlich aufnehmen und vor 10.01.2027 prüfen. | 08.01.2027 | `2 SP` | Auf Hold (Offen) |

*Summe Sprint 2: **19 SP** · **Gesamtplan: 35 SP** (18 von 25 Issues umgesetzt, 7 Issues bewusst auf Hold bis zur persönlichen Abnahme und Videoaufnahme vor dem 10.01.2027).*
