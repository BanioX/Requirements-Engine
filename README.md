# ONESTRAND · Requirements Engine

Branchenneutrales, minimalistisches internes Requirements-Engineering-, Mengen- und Zeitaufwand-Portal nach Lehrbuch (**IREB / Pohl & Rupp** sowie Usability-Heuristiken von **Dr. Jakob Nielsen** — komplett ohne Dropdown-Menüs, ohne unnötige Checkboxen und ohne vorausgefüllte Branchenannahmen).

Entwickelt und betrieben im Rahmen der **Anwendungs- und Transferleistung (ATL)** im Modul **M042 Applications Engineering** (HF Wirtschaftsinformatik, HKV Aarau).

## Omnichannel-Architektur

Eine einzige Datenbasis (PostgreSQL) — flexibel nutzbar über alle Kanäle:

- **Im Web (Browser):** Sofort nutzbar über HTTPS (Cloudflare Tunnel) oder im eigenen Intranet.
- **Als Desktop-/Mobile-Programm (PWA):** Über `site.webmanifest` + Service Worker direkt aus Chrome/Edge/Safari als eigenständige Desktop-App (eigenes Fenster, App-Icon im Startmenü/Dock) installierbar — automatisch aktuell ohne manuellen Installer.
- **Als Confluence-Addon:** Sofort einbettbar via `?embed=1` + CSP `EMBED_ALLOWED_ORIGINS` oder verpackbar als Atlassian Forge Makro ([integrations/confluence/manifest.yml](integrations/confluence/manifest.yml)), inkl. 1-Klick-Übersetzung nach **Jira** (*Story* / *Feature*).
- **Self-Hosted via Docker:** Multi-Arch-Image (`linux/amd64` & `linux/arm64`) direkt auf jedem Server oder Laptop startbar.

## Kernfunktionen (100 % intern — kein Kundenzugriff)

- **Schnelle Erfassung ohne Vorauswahlen:** Freitextfeld, optionale Eingangskanäle (*Persönlich / Telefon / Chat* als Live-Feedback, *E-Mail* als zeitverzögertes Feedback), optionaler Ideengeber (Credits), optionale **CRM- / Ref-ID** (Traceability) und individueller **Zeitaufwand** (Direkteingabe, Mausrad oder 2-Spalten-Zeitrad `Min : Sek`).
- **Quantifizierbare Upvotes mit individuellem Zeitaufwand:** Jeder Mitarbeitende zählt wiederkehrende Anfragen (`+1` oder `+ Aufwand erfassen`) mit seinem eigenen realen Zeitaufwand und eigener Ref-ID.
- **Lehrbuch-Requirements-Engine (100 % lokal, kostenlos):** Klassifiziert nach IREB (*FA / NFA / Randbedingung*), generiert branchenneutrale *User Stories*, prüfbare *Akzeptanzkriterien (Gegeben / Wenn / Dann)*, *MoSCoW*-Priorität und warnt bei Duplikaten.
- **Ampel & Closed Feedback Loop:** Bewusste Machbarkeits-Ampel (*unbewertet* → *Einfach / Mittel / Aufwändig*), 4-Stufen-Loop, **Nach-Ablehnungs-Tracking** (Handlungsdruck bei weiter eingehenden Fragen), Entscheid-Zufriedenheitsvoting (`👍/👎`) sowie **90-Tage-Rückmeldehinweis** bei erledigten Themen mit aktuellen Ref-IDs.
- **Management-Report & PDF-Export (`01.01.XXXX – 31.12.XXXX`):** Filterbar nach Tag / Woche / Monat / Jahr (Saisonalität), Einzelthema, Ampel und Status; rechnet standardmässig **ausschliesslich mit real erfassten Zeiten** (keine Fantasiezahlen; optionale Hochrechnung explizit mit `~` gekennzeichnet); druckfertige SVG-Grafiken, Ideengeber-Credits, A4-PDF-Export & CSV.
- **Live-Betrieb & Healthcheck:** Aktiver `/health`-Endpunkt mit echter PostgreSQL-Prüfung (`SELECT 1`), Statuszeile mit DB-Latenz, Datensatz-Zähler und aktueller Git-Version.

## Schnellstart (Betrieb / Drittperson mit fertigem GHCR-Image)

Das fertige Multi-Arch-Image (`linux/amd64` & `linux/arm64`) liegt öffentlich unter `ghcr.io/baniox/requirements-engine`. Es startet ohne Anpassungen auf Windows (x64 & ARM64), macOS und Linux:

1. Beispielkonfiguration kopieren und eigenes lokales Datenbank-Passwort setzen:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Container-Stack starten (PostgreSQL + App + Cloudflare Quick Tunnel + Watchtower):
   ```powershell
   docker compose up -d
   ```
   *(Für eine fest gepinnte Abgabe-Version `APP_IMAGE_TAG=v1.0.0` in `.env` setzen.)*
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
- [Testkonzept & Testprotokoll](docs/TESTKONZEPT_UND_PROTOKOLL.md)
- [Betriebs-Checkliste](docs/BETRIEBS_CHECKLISTE.md)
- [KI-Arbeitsprotokoll](docs/KI_ARBEITSPROTOKOLL.md)
- [Confluence-Addon & Jira-Brücke](integrations/confluence/README.md)
