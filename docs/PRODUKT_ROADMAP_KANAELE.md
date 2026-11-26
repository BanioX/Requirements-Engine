# Produkt- & Kanalplanung: Website, PWA, Confluence-Anbindung & Windows-Programm (.exe)

> **Grundprinzip über alle Kanäle:**
> - **Proprietär & reaktive Kenntnisnahme:** *ONESTRAND · Requirements Engine* ist geistiges Eigentum von **Onestrand | Alban Hyseni** (Alle Rechte vorbehalten). Jede betriebliche Nutzung erfordert vorgängig die ausdrückliche schriftliche Zustimmung; Interessierte erhalten ausschliesslich reaktiv Kenntnis vom Produkt.
> - **Kein Anbieter-Server (100 % Self-Hosting):** Onestrand stellt weder einen produktiven Server noch eine zentrale Datenbank bereit. Jeder berechtigte Betrieb hostet das Backend (`Node.js` + `PostgreSQL`) vollständig auf eigener Infrastruktur — alle vier Auslieferungskanäle greifen auf genau diese eigene Datenbasis zu.

---

## Übersicht der vier Distributionskanäle

| Kanal | Status | Technische Architektur | Typischer Einsatz im Betrieb |
| :--- | :---: | :--- | :--- |
| **1. Website (Browser)** | **Umgesetzt** (`v1.0.0`) | Self-Hosted Docker-Stack (`app` Node 24 + `db` PostgreSQL 17 + Reverse Proxy / Cloudflare Tunnel), zweisprachig (`DE \| EN`), 5-Rollen-RBAC, Report (PDF/CSV), Impressum & revDSG-Datenschutz. | Direkter Zugriff ohne lokale Installation im Firmen-Intranet oder per HTTPS-Tunnel (z. B. Demo `re.onestrand.ch`). |
| **2. PWA (Desktop & Mobile App)** | **Umgesetzt** (`v1.0.0`) | `site.webmanifest`, Service Worker (`sw.js`, Network-first für Live-Daten), Desktop-Installationsdialog (Edge/Chrome) sowie iPhone/iOS Safari Optimierung (Safe-Area, 0 px Überlauf, geführte «Zum Home-Bildschirm»-Hilfe). | Eigenes App-Fenster im Windows-/macOS-Startmenü und auf dem iPhone-Home-Bildschirm ohne App-Store-Pflicht. |
| **3. Confluence-Anbindung** | **Grundlage umgesetzt / Ausbau geplant** | **Umgesetzt:** Einbettungsmodus `?embed=1` (blendet Topbar/Footer aus) + `EMBED_ALLOWED_ORIGINS` (CSP `frame-ancestors`) + vorbereitetes Atlassian-Forge-Manifest (`integrations/confluence/manifest.yml`). **Geplant:** Produktive Forge-Registrierung (`forge deploy` / `forge install`) mit Konfigurationsdialog für die firmeneigene Server-URL. | Nahtlose Einbindung direkt auf bestehenden Confluence-Seiten im Team-Wiki (eine Datenbasis, kein Medienbruch). |
| **4. Eigenständiges Windows-Programm (`.exe`)** | **Geplant** (Roadmap ab `v1.1+`) | **Stufe A (Thin-Client `.exe` via Tauri / WebView2, ~5–10 MB):** Native Windows-Anwendung ohne Browser-Rahmen, verbindet sich per HTTPS direkt mit dem firmeneigenen Self-Hosting-Server (Server-URL beim Erststart konfigurierbar).<br>**Stufe B (Portable Einzelplatz-`.exe`):** Node.js Single Executable Application (`SEA`) oder Tauri-Sidecar mit eingebetteter lokaler Datenbank (PGlite/SQLite) für lokale Einzelplatz-Vorführungen ohne Docker. | Unternehmen mit gesperrter Browser-PWA-Installation, Softwareverteilung per Intune/GPO (`.msi`/`.exe`) oder lokale Offline-Demos. |

---

## Geplanter Ausbaupfad für die Windows-`.exe` (Stufe A & B)

1. **Stufe A — Desktop-Client `.exe` (empfohlen für Firmenbetrieb):**
   - Schlanker **Tauri-Wrapper** (Rust + Windows WebView2) um die bestehende Web-Oberfläche.
   - Beim Erststart hinterlegt die Organisation einmalig ihre interne HTTPS-Server-URL (z. B. `https://re.firma.intern`); alle Daten verbleiben in der eigenen Firmen-PostgreSQL-Datenbank.
   - Code-Signing für Windows SmartScreen und optionale Auslieferung als `.exe` oder `.msi` für interne IT-Softwareverteilung.
2. **Stufe B — Portable Standalone-`.exe` (Einzelplatz ohne Docker):**
   - Verpackung des bestehenden Node.js-Servers per Node Single Executable Application (`SEA`) inkl. lokal eingebetteter Datenbank-Engine als portable Einzeldatei.
   - Gedacht für schnelle lokale Vorführungen auf Windows-Rechnern ohne Admin-Rechte oder Docker Desktop.
3. **Gemeinsame Codebasis:**
   - Alle vier Kanäle (**Website, PWA, Confluence, Windows-`.exe`**) teilen sich dieselbe Benutzeroberfläche (`src/public/`), dieselbe REST-API und dasselbe 5-Rollen-Rechtemodell — Änderungen müssen nur einmal entwickelt und getestet werden.
