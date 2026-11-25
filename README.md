# Requirements Engine

Branchenneutrales, minimalistisches Feedback- und Optimierungs-Portal (gestaltet nach **Dr. Jakob Nielsen** — Heuristik #8 Minimalismus, Progressive Disclosure, komplett ohne Dropdown-Menüs) für Betriebe ohne Jira oder Confluence.

Entwickelt und betrieben im Rahmen der **Anwendungs- und Transferleistung (ATL)** im Modul **M042 Applications Engineering** (HF Wirtschaftsinformatik, HKV Aarau).

## Zweck & Kernfunktionen

- **Entlastung durch Optimierungen:** Kundschaft und Betrieb sammeln wiederkehrende Fragen, Support-Treiber und Ideen in einem einzigen, klaren Eingabefeld.
- **Voting nach Nutzen & Machbarkeit:** Team und Nutzende voten den **Nutzen (`▲`)**, der Betrieb bewertet per 1 Klick die **Machbarkeit** (*Einfach / Mittel / Aufwändig*) — **Quick Wins** wandern automatisch ganz nach oben.
- **Automatische Requirements-Engine (100 % lokal, kostenlos):** Übersetzt formlose Ideen ohne bezahlte KI-APIs in strukturierte User Stories, Umsetzungsschritte (Tasks), Akzeptanzkriterien und warnt bei Duplikaten (erst bei Klick sichtbar — *Progressive Disclosure*).
- **Entscheid-Log & CSV-/Markdown-Export:** Nachvollziehbare Rückmeldung ans Team (*Geplant / Umgesetzt / Nicht geplant* mit Begründung).
- **Live-Betriebs-Panel & Healthcheck:** Aktiver `/health`-Endpunkt inkl. PostgreSQL-Prüfung (`SELECT 1`) sowie dezente Statuszeile mit DB-Status, Datensatz-Zähler und laufender Git-Version.

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
