# Natives Confluence-Addon (**«Runs on Atlassian»** — Echte Confluence-Unterseiten, 0 externe Server!)

Dieses Verzeichnis enthält das **vollständig native Atlassian-Forge-Confluence-Addon** für **ONESTRAND · Requirements Engine**.

## Funktionsprinzip: Jede Idee = eine echte Confluence-Unterseite
- **100 % in Confluence gespeichert (kein externer Server, nie an `re.onestrand.ch`!):**
  - Jede im Makro erfasste Idee wird direkt über die interne Confluence REST API v2 als **echte, sichtbare Confluence-Unterseite** (`[REQ-01] …`) unterhalb der Board-Seite angelegt.
  - Der lesbare Seiteninhalt (Übersichtstabelle, Beschrieb, Einzelfälle `+1` mit `MM:SS`, Rückfragen & Relevanz-Protokoll) bleibt **selbst dann vollständig erhalten und lesbar, wenn das Addon irgendwann deinstalliert wird** (kein Vendor Lock-in!).
  - Die strukturierten JSON-Daten hängen als Confluence Page Property (`onestrand_req_v1`) direkt an derselben Unterseite.
  - Jedes `+1`, jeder Statuswechsel und jede Rückfrage aktualisiert die Confluence-Unterseite inklusive normaler **Confluence-Versionshistorie**.
- **Plattform-erzwungene Abschottung:** In [manifest.yml](manifest.yml) sind **keinerlei `permissions.external`-Freigaben** eingetragen. Atlassian blockiert damit technisch jede ausgehende Verbindung an externe Server.
- **Kein zweites Login:** Das Addon erkennt automatisch den angemeldeten Confluence-Benutzer (`read:confluence-user`).

---

## 1-Klick-Deployment auf deine Confluence-Site (z. B. `onestrand.atlassian.net`)

1. Einmalig einen Atlassian API-Token erstellen unter: https://id.atlassian.com/manage-profile/security/api-tokens
2. In PowerShell im Ordner `integrations\confluence` das 1-Klick-Skript ausführen (Token bleibt strikt lokal im Windows-Tresor):
   ```powershell
   cd C:\Users\hysen\Projekte\requirements-engine\integrations\confluence
   .\deploy-to-confluence.ps1 -Site onestrand.atlassian.net
   ```
3. In Confluence eine beliebige Seite öffnen (z. B. *«Requirements-Eingang»*), **`/ONESTRAND`** tippen und das Makro **«ONESTRAND Requirements Engine»** einfügen — jede neue Idee erscheint ab sofort als echte Unterseite in der linken Confluence-Seitenleiste!
