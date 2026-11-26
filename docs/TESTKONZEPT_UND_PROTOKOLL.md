# Testkonzept und Testprotokoll (Teilaufgabe 4 — 10 Punkte)

> **Aufbau angelehnt an Block 4 (Testing, Folien 53–54):**
> Jeder Testfall enthält ID, Titel, zugeordnete Anforderung, Priorität, Vorbedingungen, konkrete Testschritte und erwartetes Ergebnis.
> Die Durchführung wird danach im Abschnitt **2. Testprotokoll** mit Datum, Version, effektivem Ergebnis, Status und Beleg (Screenshot / Log-Auszug) festgehalten.

---

## 1. Definierte Testfälle

### TF-01: Öffentliche HTTPS-Erreichbarkeit & Grundfunktion (Ziel)
- **Anforderung:** Ziel — App läuft lokal in getrennten Docker-Containern (`app` + `db`) und ist über Cloudflare Tunnel per HTTPS öffentlich erreichbar.
- **Priorität:** Hoch
- **Vorbedingungen:** Docker Desktop läuft; `.env` vorhanden; Stack via `docker compose up -d` gestartet.
- **Testschritte:**
  1. `docker compose ps` im Terminal ausführen und prüfen, dass `app`, `db`, `tunnel` und `watchtower` getrennt laufen.
  2. Öffentliche `https://*.trycloudflare.com`-URL aus `docker compose logs tunnel` auslesen.
  3. URL im Browser (oder auf einem zweiten Gerät/Smartphone über Mobilfunk) öffnen.
  4. Im Eingabefeld ein neues Feedback eingeben, auf *«Idee einreichen»* klicken, einmal auf den Upvote-Knopf (`▲`) klicken und das Live-Betriebs-Panel am unteren Rand prüfen.
- **Erwartetes Ergebnis:** Seite lädt fehlerfrei über gültiges HTTPS-Zertifikat; Feedback erscheint sofort in der Rangliste mit 4-Stufen-Loop und Ampel; Footer zeigt `DB verbunden`, aktualisierte Datensatz-Anzahl sowie Version & Commit-Hash.

### TF-02: Datenpersistenz über Container-Neustart (Muss-Punkt 1)
- **Anforderung:** Muss-Punkt 1 — Daten bleiben nach einem Neustart der Container erhalten.
- **Priorität:** Hoch
- **Vorbedingungen:** Stack läuft und App ist erreichbar.
- **Testschritte:**
  1. Über das Web-UI eine eindeutige Test-Idee einreichen (z. B. *«Persistenz-Test 2026: Eigenen Beleg-Export sofort als PDF herunterladen»*) und einmal hochvoten (`▲`).
  2. Im Terminal `docker compose down` ausführen (alle Container stoppen und entfernen, **ohne** `-v`).
  3. Mit `docker compose ps` prüfen, dass keine Container mehr laufen, und mit `docker volume ls` prüfen, dass `pg_data` weiter existiert.
  4. Stack mit `docker compose up -d` wieder starten und warten, bis `app` und `db` `(healthy)` sind.
  5. Web-UI neu laden (`Ctrl+F5`) und prüfen, ob die zuvor erstellte Idee inkl. Stimmenzahl und Status vorhanden ist.
- **Erwartetes Ergebnis:** Die zuvor erfasste Idee inkl. Upvotes, generierter User Story und Tasks ist nach dem kompletten Neustart unverändert vorhanden.

### TF-03: Keine Passwörter und Tokens im Repository oder in der Git-History (Muss-Punkt 2)
- **Anforderung:** Muss-Punkt 2 — Passwörter und Tokens stehen nicht im Repository, auch nicht in der Git-History.
- **Priorität:** Hoch
- **Vorbedingungen:** Repository auf GitHub aktuell; lokale `.env` vorhanden.
- **Testschritte:**
  1. Im lokalen Repository `git status` und `git ls-files` prüfen, ob `.env` ignoriert und nicht versioniert ist.
  2. Inhalt von `.env.example` und `docker-compose.yml` auf echte Passwörter/Tokens prüfen.
  3. Vollständige Git-History per `gitleaks` (lokal und im GitHub-Actions-Job *«Secret-Scan (Git-History)»*) prüfen.
- **Erwartetes Ergebnis:** `.env` taucht weder in `git ls-files` noch auf GitHub auf; `.env.example` enthält nur Platzhalter; Gitleaks meldet über alle Commits **0 Leaks**.

### TF-04: Aktiver Healthcheck im Normal- und Fehlerfall (Muss-Punkt 3)
- **Anforderung:** Muss-Punkt 3 — Die App hat einen aussagekräftigen Healthcheck.
- **Priorität:** Hoch
- **Vorbedingungen:** Stack läuft normal (`app` und `db` gestartet).
- **Testschritte:**
  1. `docker compose ps` prüfen (`app` und `db` müssen Status `(healthy)` zeigen).
  2. `GET /health` lokal (`http://localhost:3000/health`) und über die öffentliche HTTPS-URL abrufen.
  3. **Negativtest (Fehlerfall):** Datenbank-Container gezielt stoppen (`docker compose stop db`) und erneut `GET /health` aufrufen.
  4. Datenbank-Container wieder starten (`docker compose start db`) und `GET /health` erneut prüfen.
- **Erwartetes Ergebnis:** Im Normalbetrieb antwortet `/health` mit HTTP `200`, `status: "ok"`, `db: "verbunden"` und aktueller Commit-Version. Bei gestoppter Datenbank antwortet `/health` mit HTTP `503`, `status: "degraded"`, `db: "getrennt"`. Nach Neustart von `db` kehrt der Status selbstständig auf HTTP `200` zurück.

### TF-05: Automatisches Deployment nach Push auf `main` (Muss-Punkt 4)
- **Anforderung:** Muss-Punkt 4 — Ein Push auf `main` bringt die neue Version ohne Handarbeit live.
- **Priorität:** Hoch
- **Vorbedingungen:** Stack läuft auf dem Laptop mit `ghcr.io/baniox/requirements-engine:latest` + Watchtower; aktueller Commit-Hash im Footer notiert.
- **Testschritte:**
  1. Eine kleine, sichtbare Änderung auf einem Branch erstellen (z. B. UI-Badge oder Hinweis aktualisieren), Tests ausführen und per Pull Request in `main` mergen.
  2. In GitHub Actions verfolgen, wie die Pipeline Tests, Gitleaks-Scan und den Multi-Arch-Build (`amd64` + `arm64`) ausführt und das neue Image auf `ghcr.io` veröffentlicht.
  3. Am Laptop **keinen** manuellen Docker-Befehl ausführen — max. 60 Sekunden warten und `docker compose logs watchtower` beobachten.
  4. Die öffentliche HTTPS-URL im Browser aktualisieren und den Commit-Hash im Footer sowie unter `/health` vergleichen.
- **Erwartetes Ergebnis:** Watchtower erkennt das neue Image automatisch, startet nur den `app`-Container neu (ohne Datenverlust), und im Browser erscheint ohne Handarbeit der neue Git-Commit-Hash plus die sichtbare Änderung.

### TF-06: Reproduzierbarkeit & Startbarkeit bei einer Drittperson (Lieferobjekt 1)
- **Anforderung:** Lieferobjekt 1 — Die abgegebene Version aus `ghcr.io` lässt sich bei einer Drittperson ohne Anpassungen starten.
- **Priorität:** Hoch
- **Vorbedingungen:** Fest getaggte Version (z. B. `v1.0.0`) ist öffentlich auf `ghcr.io/baniox/requirements-engine:v1.0.0` verfügbar.
- **Testschritte:**
  1. Repository in einen komplett frischen, temporären Ordner klonen (ohne bestehendes `.env` oder lokale Build-Dateien).
  2. Gemäss `README.md` `.env.example` nach `.env` kopieren, eigenes Passwort eintragen und `APP_IMAGE_TAG=v1.0.0` setzen.
  3. Ohne Build-Schritt direkt `docker compose up -d` ausführen.
  4. `docker compose ps` und `http://localhost:3000/health` prüfen.
- **Erwartetes Ergebnis:** Das fertige Multi-Arch-Image wird direkt von `ghcr.io` geladen, alle Container starten fehlerfrei ohne Anpassungen, und `/health` meldet HTTP `200` mit `version: "v1.0.0"`.

---

## 2. Testprotokoll (wird bei der Durchführung fortlaufend ausgefüllt)

| Lauf | Testfall | Datum / Zeit | Version / Umgebung | Effektives Ergebnis | Status | Beleg (Screenshot / Log) |
| :-: | :--- | :--- | :--- | :--- | :---: | :--- |
| 1 | Vorab-Test Compose-Syntax | 25.11.2026 22:57 | Branch `feat/requirements-engine-mvp` (Docker Desktop 29.9.3 ARM64) | Fehler gefunden: unquotierter Doppelpunkt in `docker-compose.yml` (`(Vorlage: .env.example)`) löste YAML-Parser-Fehler aus. Durch Anführungszeichen behoben. | **Nicht bestanden → Behoben** | Terminal-Log `go-yaml load error at L8.C94` |
| 2 | Automatisierte Unit- & API-Tests (`npm test`) | 25.11.2026 22:57 | Node v24.16.0 (Windows ARM64) | 14/14 Tests bestanden in 355 ms (inkl. `/health` HTTP 200 & HTTP 503 Negativtest, Requirements-Engine, Duplikat-Radar, ICS/CSV-Export). | **Bestanden** | `npm test` Log-Auszug |
| – | TF-01 bis TF-06 | *folgt nach Merge auf `main` & Release `v1.0.0`* | Produktion (`ghcr.io` + Cloudflare Tunnel) | *Wird Schritt für Schritt durchgeführt und mit Screenshots/Logs ergänzt.* | **Offen** | – |
