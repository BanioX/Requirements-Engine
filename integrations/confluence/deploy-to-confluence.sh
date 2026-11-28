#!/usr/bin/env bash
# 1-Klick Self-Deployment für beliebige Firmen-Confluence-Instanzen (macOS / Linux)
# 100 % eigenständig im eigenen Atlassian-Konto der Firma — NULL Abhängigkeit zu Onestrand-Servern!
set -euo pipefail
cd "$(dirname "$0")"

SITE="${1:-}"
if [ -z "$SITE" ]; then
  read -rp "Eigene Confluence-Cloud-Domain eingeben (z. B. meine-firma.atlassian.net): " SITE
fi
SITE="$(echo "$SITE" | sed -E 's|^https?://||; s|/.*$||')"

[ -d node_modules ] || npm install
npm run build:ui
npm test

if ! forge whoami >/dev/null 2>&1; then
  echo "Bitte einmalig mit eigenem Atlassian-Konto & API-Token anmelden (https://id.atlassian.com/manage-profile/security/api-tokens):"
  forge login
fi

if grep -q "REPLACE_WITH_FORGE_APP_ID" manifest.yml; then
  forge register "Requirements Engine"
fi

forge deploy --non-interactive
forge install --product confluence --site "$SITE" --non-interactive

echo "FERTIG! Auf https://${SITE} eine Seite öffnen und '/ONESTRAND' eintippen."
