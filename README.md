# Requirements Engine

Leichtgewichtiges KMU-Portal für **Klick-Anleitungen (Prozessdokumentation)**, **automatische Aktualitäts-Überwachung** und **Feedback-zu-User-Stories inkl. Entscheid-Log** — für Teams und Betriebe ohne Confluence oder Jira.

Entwickelt und betrieben im Rahmen der **Anwendungs- und Transferleistung (ATL)** im Modul **M042 Applications Engineering** (HF Wirtschaftsinformatik, HKV Aarau).

## Zweck & Kernfunktionen

- **Klick-Anleitungen (SOPs):** Schritt-für-Schritt-Prozesse mit Screenshot-Unterstützung (`Ctrl+V`) und nummerierten Klick-Markern, Abhak-Modus und Markdown-/Druck-Export.
- **Aktualitäts- & Fristen-Wächter:** Jede Anleitung besitzt ein Prüfintervall (z. B. 90 Tage) mit automatischer Risiko-Ampel (*Aktuell / Bald prüfen / Veraltet*) und `.ics`-Kalenderexport.
- **Feedback → automatische User Stories:** Formloses Feedback aus dem Alltag (z. B. eBanking-/Mobile-Banking-Kundenärger oder interne Prozess-Engpässe) wird lokal und regelbasiert in strukturierte User Stories, geschnittene Tasks, Akzeptanzkriterien und eine MoSCoW-Priorität übersetzt — komplett ohne bezahlte KI-APIs.
- **Entscheid-Log:** Nachvollziehbare Status-Historie (*Eingang → Bereit → Angenommen / Zurückgestellt / Abgelehnt*) mit Begründung.
- **Live-Betriebs-Panel & Healthcheck:** Aktiver `/health`-Endpunkt inkl. PostgreSQL-Verbindungsprüfung sowie Anzeige von DB-Status, Datensatz-Zähler und laufender App-Version (Git-Commit-Hash).

## Schnellstart (Betrieb / Drittperson mit fertigem GHCR-Image)

Das fertige Multi-Arch-Image (`linux/amd64` & `linux/arm64`) liegt öffentlich unter `ghcr.io/baniox/requirements-engine`. Es startet ohne Code-Anpassungen auf Windows (x64 & ARM64), macOS und Linux:

1. Beispielkonfiguration kopieren und eigenes lokales Datenbank-Passwort setzen:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Container-Stack starten (PostgreSQL + App + Cloudflare Quick Tunnel + Watchtower):
   ```powershell
   docker compose up -d
   ```
   *(Für eine fest gepinnte Abgabe-Version z. B. `APP_IMAGE_TAG=v1.0.0` in `.env` setzen.)*
3. Healthcheck & öffentliche HTTPS-URL prüfen:
   ```powershell
   curl http://localhost:3000/health
   docker compose logs tunnel
   ```

## Lokale Entwicklung (Image lokal bauen)

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

## Tests ausführen

```powershell
npm test
```

## Betrieb & Dokumentation

- [Architektur & Zielbild](docs/ARCHITEKTUR.md)
- [Agile Sprint-Planung](docs/SPRINT_PLANUNG.md)
- [KI-Arbeitsprotokoll](docs/KI_ARBEITSPROTOKOLL.md)
