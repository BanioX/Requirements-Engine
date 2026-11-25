# Confluence-Addon Integration (Atlassian Forge / Iframe-Makro)

Die **Requirements Engine** ist von Grund auf so aufgebaut, dass sie sich ohne Code-Änderungen in **Atlassian Confluence** (Cloud & Data Center) integrieren lässt:

## Weg 1: Sofort nutzbar per Confluence Iframe-Makro (0 Aufwand)
1. In der `.env` die eigene Confluence-Domain freischalten (CSP `frame-ancestors`):
   ```env
   EMBED_ALLOWED_ORIGINS=https://deine-firma.atlassian.net
   ```
2. Container neu starten (`docker compose up -d app`).
3. Auf einer beliebigen Confluence-Seite das Standard-Makro **`/iframe`** einfügen mit URL:
   ```text
   https://<deine-requirements-engine-url>/?embed=1
   ```
   Der Parameter `?embed=1` blendet automatisch Topbar und Fusszeile aus, sodass sich das Board nahtlos in die Confluence-Seite einfügt.

## Weg 2: Verpackung als echtes Atlassian Forge Confluence-Addon
Die beiliegende `manifest.yml` zeigt die minimale Atlassian-Forge-Konfiguration, um Requirements Engine als eigenes Makro (`/requirements-engine`) im Confluence-Menü bereitzustellen (über Atlassian Forge CLI `forge register && forge deploy && forge install`):
- **Frontend:** Ruft das bestehende REST-API (`/api/stories`, `/api/stories/:id/vote`, `/api/stories/:id/feasibility`, `/api/stories/:id/decision`, `/api/stories/:id/jira`) über eine konfigurierbare Backend-URL auf.
- **Vorteil:** Eine einzige Datenbasis (PostgreSQL) — sowohl eigenständig als auch direkt innerhalb von Confluence nutzbar.

## Direkte Übersetzung in Jira (Story oder Feature)
Aus jeder Karte (auch innerhalb von Confluence!) lässt sich per 1 Klick **`→ Jira Story`** oder **`→ Jira Feature`** auslösen:
1. **Mit Jira-API (`.env`):** Setzt man `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` und `JIRA_PROJECT_KEY` in der lokalen `.env`, legt Requirements Engine das Ticket per **Jira REST API v3 (Atlassian Document Format)** direkt in Jira an und verknüpft den erzeugten Ticket-Key (z. B. `PROJ-42`) auf der Karte.
2. **Ohne API-Zugang (sofort & kostenlos):** Kopiert derselbe Klick fertiges Jira-Markup (inkl. User Story, Mengen-Nachweis, Ampel, Tasks & Akzeptanzkriterien) in die Zwischenablage — zusätzlich steht unter `/api/stories/export/jira-csv` ein direkter Jira-CSV-Import bereit.
