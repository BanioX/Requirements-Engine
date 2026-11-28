# 1-Klick Self-Deployment für beliebige Firmen-Confluence-Instanzen
# 100 % eigenständig im eigenen Atlassian-Konto der Firma — NULL Abhängigkeit zu Onestrand-Servern!
# Alle Einträge werden als echte Confluence-Unterseiten gespeichert (0 externe Server).
param(
  [string]$Site = ""
)

Set-Location $PSScriptRoot
if (-not $Site) {
  $Site = Read-Host "Eigene Confluence-Cloud-Domain eingeben (z. B. meine-firma.atlassian.net)"
}
$Site = $Site.Trim() -replace '^https?://', '' -replace '/.*$', ''
if (-not $Site) {
  Write-Error "Bitte eine gültige Confluence-Domain angeben (z. B. meine-firma.atlassian.net)."
  exit 1
}

Write-Host "=== 1. Abhängigkeiten, UI-Bundle & Tests prüfen ===" -ForegroundColor Cyan
if (-not (Test-Path ".\node_modules")) { npm install }
npm run build:ui
if ($LASTEXITCODE -ne 0) { exit 1 }
npm test
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n=== 2. Eigenes Atlassian-Konto (Forge CLI) prüfen ===" -ForegroundColor Cyan
forge whoami 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Einmalig mit dem eigenen Atlassian-Konto + API-Token anmelden (https://id.atlassian.com/manage-profile/security/api-tokens):" -ForegroundColor Yellow
  forge login
  if ($LASTEXITCODE -ne 0) { exit 1 }
}

$manifest = Get-Content ".\manifest.yml" -Raw
if ($manifest -match "REPLACE_WITH_FORGE_APP_ID") {
  Write-Host "`n=== 3. App im eigenen Atlassian-Konto registrieren ===" -ForegroundColor Cyan
  forge register "Requirements Engine"
  if ($LASTEXITCODE -ne 0) { exit 1 }
}

Write-Host "`n=== 4. In eigene Atlassian-Cloud deployen (Runs on Atlassian, 0 externe Server) ===" -ForegroundColor Cyan
forge deploy --non-interactive
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n=== 5. Auf eigener Confluence-Site ($Site) installieren ===" -ForegroundColor Cyan
forge install --product confluence --site $Site --non-interactive
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`nFERTIG! Öffne eine Seite auf https://$Site, tippe '/ONESTRAND' und füge 'ONESTRAND Requirements Engine' ein." -ForegroundColor Green
Write-Host "Alle Daten bleiben zu 100 % als echte Unterseiten in deiner Confluence-Instanz." -ForegroundColor Green
