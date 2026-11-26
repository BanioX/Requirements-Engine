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

## Optionale Jira- & Excel-Schnittstelle (REST API / CSV)
Die Requirements Engine hält die Hauptoberfläche bewusst frei von Tool-Ballast, bietet aber bei Bedarf offene Schnittstellen für die Übergabe ins Issue-Tracking und Reporting:
1. **Excel / BI-Auswertung:** Über den Management-Report (`/api/stories/export/csv`) stehen alle Themen mit getrennten Spalten *Menge* und *Dauer* (`Minuten` sowie `MM:SS`), *Aufwand* und *Mehrwert* als UTF-8 CSV bereit.
2. **Optionaler Jira-API- & CSV-Export:** Werden `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` und `JIRA_PROJECT_KEY` in der lokalen `.env` hinterlegt, lässt sich ein Thema per API (`POST /api/stories/:id/jira`) über die **Jira REST API v3 (Atlassian Document Format)** anlegen oder über `/api/stories/export/jira-csv` als Jira-CSV exportieren.
