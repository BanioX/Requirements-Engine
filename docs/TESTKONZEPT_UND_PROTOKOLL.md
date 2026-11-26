# Testkonzept und Testprotokoll (Teilaufgabe 4 — 10 Punkte)

> **Aufbau angelehnt an Block 4 (Testing, Folien 53–54):**
> Jeder Testfall enthält ID, Titel, zugeordnete Anforderung, Priorität, Vorbedingungen, konkrete Testschritte und erwartetes Ergebnis.
> **Status-Notiz:** Die Arbeit an dieser ATL wurde am **26.11.2026 als gesicherter Zwischenstand vorerst auf Hold gesetzt**.
> **Transparenz-Hinweis:** Im Protokoll (Abschnitt 2) wird strikt getrennt zwischen der technischen **Vorab-Ausführung durch den KI-Agenten** und der **persönlichen Abnahme durch den Autor (Alban Hyseni)**. Die persönliche Abnahme folgt bei Wiederaufnahme vor dem 10.01.2027.

---

## 1. Definierte Testfälle

### TF-01: Öffentliche HTTPS-Erreichbarkeit & Grundfunktion (Ziel)
- **Anforderung:** Ziel — App läuft lokal in getrennten Docker-Containern (`app` + `db`) und ist über Cloudflare Tunnel per HTTPS öffentlich erreichbar.
- **Priorität:** Hoch
- **Vorbedingungen:** Docker Desktop läuft; `.env` vorhanden; Stack via `docker compose up -d` gestartet.
- **Testschritte:**
  1. `docker compose ps` im Terminal ausführen und prüfen, dass `app`, `db`, `tunnel` und `watchtower` getrennt laufen.
  2. Öffentliche `https://*.trycloudflare.com`-URL aus `docker compose logs tunnel` auslesen.
  3. URL über HTTPS abrufen (`/health` und Web-UI im Browser öffnen).
  4. Grundfunktion prüfen: UI lädt vollständig, Footer zeigt `DB verbunden`, Datensatz-Zähler sowie aktuelle Version und Commit-Hash.
- **Erwartetes Ergebnis:** Alle 4 Services laufen getrennt; die App ist über gültiges HTTPS-Zertifikat öffentlich erreichbar und liefert HTTP `200` samt `db: "verbunden"`.

### TF-02: Datenpersistenz über Container-Neustart (Muss-Punkt 1)
- **Anforderung:** Muss-Punkt 1 — Daten bleiben nach einem Neustart der Container erhalten.
- **Priorität:** Hoch
- **Vorbedingungen:** Stack läuft und App ist erreichbar.
- **Testschritte:**
  1. Eine eindeutige Test-Idee erfassen (*«Persistenz-Test M042: Export-Filter dauerhaft speichern»*, `180 s`, Kanal `E-Mail`) und deren ID notieren.
  2. Im Terminal `docker compose down` ausführen (alle Container stoppen und entfernen, **ohne** `-v`).
  3. Mit `docker compose ps` prüfen, dass keine Container mehr laufen, und mit `docker volume ls` prüfen, dass `requirements-engine_pg_data` weiter existiert.
  4. Stack mit `docker compose up -d` wieder starten und warten, bis `app` und `db` `(healthy)` melden.
  5. Über `GET /api/stories` und das Web-UI prüfen, ob die zuvor erstellte Idee inkl. ID, Titel und Zeitaufwand unverändert vorhanden ist.
- **Erwartetes Ergebnis:** Die erfasste Idee (`id`, Titel, Votes, Dauer) bleibt über das vollständige Entfernen und Neuerstellen aller Container hinweg verlustfrei erhalten.

### TF-03: Keine Passwörter und Tokens im Repository oder in der Git-History (Muss-Punkt 2)
- **Anforderung:** Muss-Punkt 2 — Passwörter und Tokens stehen nicht im Repository, auch nicht in der Git-History.
- **Priorität:** Hoch
- **Vorbedingungen:** Repository auf GitHub aktuell; lokale `.env` vorhanden.
- **Testschritte:**
  1. Im lokalen Repository `git ls-files .env` ausführen und `.gitignore` prüfen.
  2. `.env.example` und `docker-compose.yml` auf echte Passwörter oder Tokens prüfen.
  3. Vollständige Git-History per `gitleaks` im GitHub-Actions-Job *«Secret-Scan (Git-History)»* prüfen.
- **Erwartetes Ergebnis:** `.env` ist nicht in Git getrackt (`git ls-files .env` leer); `.env.example` enthält ausschliesslich Platzhalter; Gitleaks meldet über alle Commits **0 Leaks**.

### TF-04: Aktiver Healthcheck im Normal- und Fehlerfall (Muss-Punkt 3)
- **Anforderung:** Muss-Punkt 3 — Die App hat einen aussagekräftigen Healthcheck.
- **Priorität:** Hoch
- **Vorbedingungen:** Stack läuft normal (`app` und `db` `(healthy)`).
- **Testschritte:**
  1. `GET /health` im Normalbetrieb abrufen.
  2. **Negativtest (Fehlerfall):** Datenbank-Container gezielt stoppen (`docker compose stop db`) und erneut `GET /health` abrufen.
  3. Datenbank-Container wieder starten (`docker compose start db`) und `GET /health` erneut prüfen.
- **Erwartetes Ergebnis:** Normalbetrieb: HTTP `200`, `status: "ok"`, `db: "verbunden"`. Bei gestoppter DB: HTTP `503`, `status: "degraded"`, `db: "getrennt"`. Nach Neustart von `db`: automatischer Reconnect ohne App-Neustart, wieder HTTP `200`.

### TF-05: Automatisches Deployment nach Push auf `main` (Muss-Punkt 4)
- **Anforderung:** Muss-Punkt 4 — Ein Push auf `main` bringt die neue Version ohne Handarbeit live.
- **Priorität:** Hoch
- **Vorbedingungen:** Stack läuft mit `ghcr.io/baniox/requirements-engine:latest` + Watchtower (`WATCHTOWER_SCOPE=requirements-engine`, Intervall 30 s); alter Commit-Hash notiert.
- **Testschritte:**
  1. Änderung auf einem Feature-Branch erstellen, alle automatisierten Tests (`npm test`) grün prüfen und per Pull Request in `main` mergen.
  2. In GitHub Actions verfolgen, wie Tests, Gitleaks-Scan und der Multi-Arch-Build (`linux/amd64` + `linux/arm64`) nach `ghcr.io` durchlaufen.
  3. **Keine** manuellen Docker-Befehle ausführen — Watchtower-Logs beobachten (`updated=1`).
  4. `GET /health` abrufen und den neuen Git-Commit-Hash vergleichen.
- **Erwartetes Ergebnis:** Watchtower erkennt das neue Image automatisch innerhalb von 30 Sekunden, startet ausschliesslich den `app`-Container neu (ohne Datenverlust), und `/health` meldet sofort den neuen Git-Commit-Hash.

### TF-06: Reproduzierbarkeit & Startbarkeit bei einer Drittperson (Lieferobjekt 1)
- **Anforderung:** Lieferobjekt 1 — Die abgegebene Version (`v1.0.0`) aus `ghcr.io` lässt sich bei einer Drittperson ohne Anpassungen starten.
- **Priorität:** Hoch
- **Vorbedingungen:** Fest getaggte Version `v1.0.0` ist öffentlich auf `ghcr.io/baniox/requirements-engine:v1.0.0` verfügbar.
- **Testschritte:**
  1. Repository in einen komplett frischen, leeren temporären Ordner klonen (ohne lokale `.env` oder lokale Images).
  2. Gemäss `README.md` `.env.example` nach `.env` kopieren, eigenes lokales Passwort eintragen und `APP_IMAGE_TAG=v1.0.0` setzen.
  3. Ohne Build-Schritt direkt `docker compose up -d` ausführen.
  4. `docker compose ps` und `GET /health` prüfen.
- **Erwartetes Ergebnis:** Das Multi-Arch-Image `v1.0.0` wird direkt von `ghcr.io` gezogen, alle 4 Container starten ohne Code- oder Konfigurationsanpassungen und `/health` meldet HTTP `200` mit `version: "v1.0.0"` und `db: "verbunden"`.

---

## 2. Testprotokoll (durchgeführte Nachweise)

| Lauf | Testfall | Datum / Zeit | Ausgeführt von | Version / Umgebung | Effektives Ergebnis | Status | Persönliche Abnahme (Autor) |
| :-: | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| 1 | Vorab-Test Compose-Syntax (KI-Fehlerfund) | 25.11.2026 22:57 | KI-Agent | Branch `feat/requirements-engine-mvp` (Docker Desktop 29.9.3 ARM64) | KI-Fehler beim ersten Startlauf: unquotierter Doppelpunkt in `docker-compose.yml` löste `go-yaml load error at L8.C94` aus. Durch doppelte Anführungszeichen behoben und erneut gestartet. | **Fehler → Behoben** | Dokumentiert (KI-Terminal-Log) |
| 2 | Automatisierte Test-Suite (`npm test`) | 26.11.2026 19:52 | KI-Agent / CI | `feat/legal-imprint-privacy-and-roadmap` (Node v24.16.0 ARM64) | **27 / 27 Tests bestanden** (inkl. `/health` HTTP 200 & 503, 5-Rollen-RBAC, Rückfragen-Sperre, Report-Zeiten, Minimalismus, iPhone-PWA sowie Impressum & Datenschutz). | **Bestanden** | Offen (CI-Check prüfen) |
| 3 | **TF-01:** Öffentliche HTTPS-Erreichbarkeit | 26.11.2026 18:28 | KI-Agent | `main` (`79379f9`, Laptop + Cloudflare Quick Tunnel) | Alle 4 Container (`app`, `db`, `tunnel`, `watchtower`) getrennt (`healthy`). Quick Tunnel `https://around-purchase-wheel-student.trycloudflare.com/health` lieferte **HTTP 200**, `db: "verbunden"` (`1 ms`). *(Zusätzlich Demo unter `https://re.onestrand.ch` geprüft.)* | **KI-Lauf OK** | **Offen (Autor-Check)** |
| 4 | **TF-02:** Persistenz über Container-Neustart | 26.11.2026 18:27 | KI-Agent | `main` (`79379f9`, Volume `requirements-engine_pg_data`) | Test-Idee `ID=8` (*«Persistenz-Test M042»*, `180 s`) erstellt → `docker compose down` (ohne `-v`, Volume `pg_data` intakt) → `docker compose up -d` → `ID=8` unverändert vorhanden (`stories: 3`). | **KI-Lauf OK** | **Offen (Autor-Check)** |
| 5 | **TF-03:** Keine Secrets im Repo / Git-History | 26.11.2026 18:27 | KI-Agent / CI | `main` (`79379f9`, GitHub Actions Gitleaks) | `git ls-files .env` leer; `.env.example` nur Platzhalter; Gitleaks-Scan über gesamte Git-History meldet **0 Leaks**. | **KI-Lauf OK** | **Offen (Autor-Check)** |
| 6 | **TF-04:** Aktiver Healthcheck (Normal & 503) | 26.11.2026 18:27 | KI-Agent | `main` (`79379f9`, Laptop `localhost:3000/health`) | Normal: **HTTP 200** (`1 ms`). Nach `docker compose stop db`: **HTTP 503** (`degraded`/`getrennt`). Nach `start db`: Auto-Reconnect, wieder **HTTP 200** (`27 ms`). | **KI-Lauf OK** | **Offen (Autor-Check)** |
| 7 | **TF-05:** Auto-Deploy nach Push auf `main` | 26.11.2026 14:49 & 15:21 | KI-Agent / CI | `da3d602 → 79379f9` (Watchtower 30 s) | Nach PR-Merge baute GH Actions das Multi-Arch-Image; Watchtower zog das neue Image ohne Handarbeit (`updated=1, failed=0`); `/health` zeigte neuen Commit ohne Datenverlust. | **KI-Lauf OK** | **Offen (Live-Check beim nächsten Merge)** |
| 8 | **TF-06:** Drittpersonen-Startbarkeit (`v1.0.0`) | 26.11.2026 18:35 | KI-Agent | `ghcr.io/baniox/requirements-engine:v1.0.0` (Multi-Arch `amd64/arm64`) | Frischer `git clone` in leeren Temp-Ordner, `git checkout v1.0.0`, `.env` mit `APP_IMAGE_TAG=v1.0.0`, `docker compose up -d` ohne Build → **HTTP 200**, `version: "v1.0.0"`, `db: "verbunden"`. | **KI-Lauf OK** | **Offen (Autor-Check)** |
