# Projektregeln für KI-Assistenten (`requirements-engine`)

Verbindlicher übergeordneter Standard: `C:\Users\hysen\Projekte\PROJEKT-STANDARD.md`.

## Projektkontext

- **Projekt:** `requirements-engine` (**Requirements Engine**, ATL Modul 042 Applications Engineering, HFWI HKV Aarau, Abgabe 10.01.2027).
- **Rollenverteilung (ATL-Vorgabe):** Der Betreiber (Alban Hyseni) gibt Ziele vor, prüft Vorschläge kritisch, gibt frei oder lehnt ab und testet Ergebnisse. Die KI erstellt Code und Konfigurationen nur auf Auftrag und erklärt Änderungen einsteigerfreundlich.
- **Sprache:** Deutsch (Schweiz, **kein ß**).

## Technische Leitplanken

- **Keine laufenden Kosten:** Keine kostenpflichtigen APIs, keine externen KI-API-Keys in der Anwendung.
- **Container-Trennung:** App (`node:24-alpine`) und Datenbank (`postgres:17-alpine`) laufen in getrennten Containern per `docker compose`.
- **Persistenz:** Alle Daten liegen in einem benannten Docker-Volume für PostgreSQL und müssen Container-Neustarts überstehen.
- **Multi-Arch:** GitHub Actions baut Multi-Arch-Images (`linux/amd64,linux/arm64`) für `ghcr.io`, weil der Entwickler-Laptop ARM64 nutzt und Drittpersonen ggf. auf `amd64` testen.
- **Reproduzierbarkeit:** Die abgegebene Version (fixer Tag, nicht nur `latest`) muss bei einer Drittperson ohne Code-Anpassungen starten.
- **Sicherheit & Datenschutz:**
  - Keine Passwörter, Tokens oder Secrets im Repo oder in der Git-History (`.env` ist in `.gitignore` und `.cursorignore`).
  - Keine echten Personen- oder Kundendaten im Repo; Beispieldaten (z. B. eBanking/KMU) sind strikt fiktiv und anonymisiert.

## Arbeitsweise

- Nie direkt auf `main` entwickeln: immer Feature-Branch (`feat/...`, `fix/...`, `docs/...`) → Tests grün (`npm test`) → Pull Request → erst nach Freigabe mergen.
- Wichtige Architekturentscheide, abgelehnte/korrigierte KI-Vorschläge und gefundene Fehler sofort in `docs/KI_ARBEITSPROTOKOLL.md` dokumentieren.
