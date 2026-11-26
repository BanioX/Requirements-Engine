# Agile Sprint-Planung (Entwurf für Teilaufgabe 2)

> **Planungstool:** GitHub Projects (kostenlos, direkt verknüpft mit dem Repository, Lesezugriff für den Dozenten).
> **Zeitraum:** 25.11.2026 (Auftragserteilung) bis 10.01.2027 (Abgabe).
> **Aufbau:** 2 Sprints; das Ziel und alle vier Muss-Punkte sind als User Stories erfasst und in konkrete Tasks mit Titel, Beschreibung, Endtermin und Aufwandschätzung unterteilt.

---

## Sprint 1: Fundament, Applikation & containerisierter Grundbetrieb (25.11.2026 – 13.12.2026)

### US-1 (Ziel – Containerisierte Webapplikation)
**Als** Betriebsverantwortlicher **möchte ich** Requirements Engine in getrennten Docker-Containern (App + PostgreSQL) über `docker compose` starten können, **damit** die Anwendung reproduzierbar auf dem Laptop und bei Drittpersonen läuft.

| Task-ID | Titel | Beschreibung | Endtermin | Aufwand |
| :--- | :--- | :--- | :--- | :---: |
| T1.1 | Zielbild & Architektur entwerfen | Architekturdiagramm (Request- & Deployment-Weg) erstellen und gegen die Vorgaben prüfen. | 27.11.2026 | 2.0 h |
| T1.2 | GitHub-Repo & Grundausstattung anlegen | Repo (`requirements-engine`) inkl. `.gitignore`, `.env.example`, Branch-Schutz, Tests und Projekt-Standard aufsetzen. | 28.11.2026 | 1.5 h |
| T1.3 | Requirements Engine MVP & DB-Schema umsetzen | Web-UI + REST-API für strukturierte Ideen-Erfassung, Zeitaufwand-Tracking, 5-Rollen-RBAC, Entscheid-Log und branchenneutrale Beispieldaten (Kundenservice & Logistik) bauen. | 04.12.2026 | 6.0 h |
| T1.4 | Dockerfile & `docker-compose.yml` erstellen | Schlankes Multi-Stage-/Non-Root-Dockerfile und Compose-Datei mit getrennten `app`- und `db`-Containern erstellen. | 06.12.2026 | 2.5 h |

### US-2 (Muss-Punkt 1 – Datenpersistenz)
**Als** Betriebsverantwortlicher **möchte ich**, dass alle Prozesse, Klick-Schritte, User Stories und Entscheide in einem persistenten Docker-Volume liegen, **damit** nach einem Neustart der Container keine Daten verloren gehen.

| Task-ID | Titel | Beschreibung | Endtermin | Aufwand |
| :--- | :--- | :--- | :--- | :---: |
| T2.1 | Named Volume für PostgreSQL konfigurieren | Benanntes Docker-Volume (`pg_data`) in `docker-compose.yml` einbinden und DB-Migration beim App-Start idempotent ausführen. | 07.12.2026 | 1.5 h |
| T2.2 | Persistenz-Neustart lokal verifizieren | Testdaten anlegen, Container mit `docker compose down` und `up -d` neu starten und Datenbestand prüfen. | 08.12.2026 | 1.0 h |

### US-3 (Muss-Punkt 2 – Secrets-Management)
**Als** Betriebsverantwortlicher **möchte ich** Passwörter und Tokens strikt ausserhalb des Repositories verwalten, **damit** weder im aktuellen Stand noch in der Git-History Zugangsdaten auftauchen.

| Task-ID | Titel | Beschreibung | Endtermin | Aufwand |
| :--- | :--- | :--- | :--- | :---: |
| T3.1 | Umgebungsvariablen & `.env.example` einrichten | Alle DB-Zugangsdaten über `.env` injizieren; `.env` in `.gitignore` sperren und `.env.example` nur mit Platzhaltern pflegen. | 09.12.2026 | 1.0 h |
| T3.2 | Automatischen Secret-Scan einrichten | Git-History und Codebase auf Secrets prüfen (z. B. Gitleaks / GitHub Secret Scanning) und Nachweis sichern. | 11.12.2026 | 1.5 h |

### US-4 (Muss-Punkt 3 – Healthcheck)
**Als** Betriebsverantwortlicher **möchte ich** einen aussagekräftigen Healthcheck für App und Datenbank betreiben, **damit** Ausfälle automatisch erkannt werden.

| Task-ID | Titel | Beschreibung | Endtermin | Aufwand |
| :--- | :--- | :--- | :--- | :---: |
| T4.1 | `/health`-Endpunkt mit DB-Check implementieren | HTTP-Endpunkt `GET /health` bauen, der aktiv `SELECT 1` gegen PostgreSQL prüft und Status + Version als JSON liefert (`200` / `503`). | 11.12.2026 | 1.5 h |
| T4.2 | Docker-Healthchecks & Startreihenfolge einrichten | `HEALTHCHECK` für App und `pg_isready` für PostgreSQL inkl. `depends_on: condition: service_healthy` konfigurieren. | 13.12.2026 | 1.5 h |

---

## Sprint 2: CI/CD, Auto-Deploy, Veröffentlichung, Tests & Abgabe (14.12.2026 – 08.01.2027)

### US-5 (Muss-Punkt 4 – Automatisiertes Deployment ab `main`)
**Als** Betriebsverantwortlicher **möchte ich**, dass ein Push auf `main` automatisch getestet, als Multi-Arch-Image auf `ghcr.io` gebaut und ohne Handarbeit auf meinen Laptop ausgerollt wird, **damit** neue Versionen schnell und reproduzierbar live gehen.

| Task-ID | Titel | Beschreibung | Endtermin | Aufwand |
| :--- | :--- | :--- | :--- | :---: |
| T5.1 | GitHub-Actions-Pipeline (CI & Multi-Arch Build) | Workflow für Tests auf PRs sowie automatischen `linux/amd64,linux/arm64`-Build und Push nach `ghcr.io` (inkl. Git-Commit-Hash als Version) erstellen. | 18.12.2026 | 3.0 h |
| T5.2 | Pull-basiertes Auto-Deploy (Watchtower) einrichten | Watchtower-Container im Compose-Stack einrichten, sodass neue `ghcr.io`-Images automatisch auf dem Laptop übernommen werden. | 21.12.2026 | 2.0 h |
| T5.3 | Release-Version fixieren & Drittpersonen-Start testen | Eindeutigen Versionstag (z. B. `v1.0.0`) veröffentlichen und Startbarkeit in einem sauberen Verzeichnis ohne Anpassungen prüfen. | 27.12.2026 | 2.0 h |

### US-6 (Ziel – Öffentliche HTTPS-Veröffentlichung)
**Als** Betriebsverantwortlicher **möchte ich** die lokal laufende Applikation über einen Cloudflare Tunnel per HTTPS öffentlich zugänglich machen, **damit** externe Zugriffe ohne offene Ports sicher funktionieren.

| Task-ID | Titel | Beschreibung | Endtermin | Aufwand |
| :--- | :--- | :--- | :--- | :---: |
| T6.1 | Cloudflare Tunnel in `docker-compose.yml` integrieren | `cloudflared`-Service einrichten und Weiterleitung an `http://app:3000` inkl. HTTPS-Erreichbarkeit verifizieren. | 22.12.2026 | 2.0 h |

### US-7 (Nachweise, Tests, Checkliste, Bericht & Video)
**Als** Betriebsverantwortlicher **möchte ich** alle Anforderungen systematisch testen, den Betrieb in einer Checkliste bewerten und die Ergebnisse dokumentieren, **damit** die Funktionsfähigkeit belegt statt nur behauptet wird.

| Task-ID | Titel | Beschreibung | Endtermin | Aufwand |
| :--- | :--- | :--- | :--- | :---: |
| T7.1 | Testfälle definieren & Testprotokoll mit Belegen führen | Mind. 5 Testfälle (Ziel + 4 Muss-Punkte) inkl. Negativ-/Fehlerfall durchführen und mit Screenshots/Logs protokollieren. | 30.12.2026 | 3.5 h |
| T7.2 | Betriebs-Checkliste (6 Bereiche) erarbeiten | Mind. 3 fundierte Punkte je Bereich (Daten, Sicherheit, Betrieb, Deployment, Infrastruktur, Organisatorisches) mit Status & Begründung ausarbeiten. | 02.01.2027 | 2.5 h |
| T7.3 | Architektur in `draw.io` reinzeichnen & PDF-Bericht erstellen | HFWI-Vorlage befüllen (Architektur, Planung, Tests, Checkliste, KI-Protokoll & Reflexion) und als PDF exportieren. | 06.01.2027 | 4.5 h |
| T7.4 | Nachweisvideo (max. 3 Min.) aufnehmen & Endkontrolle | Alle 4 Muss-Punkte im laufenden Betrieb kompakt aufnehmen und alle 5 Lieferobjekte vor Abgabe am 10.01.2027 gegenprüfen. | 08.01.2027 | 2.5 h |
