import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

test('Grundausstattung gemäss Projekt-Standard ist vorhanden', () => {
  const requiredFiles = [
    'README.md',
    'AGENTS.md',
    '.gitignore',
    '.gitattributes',
    '.editorconfig',
    '.cursorignore',
    '.env.example'
  ];

  for (const file of requiredFiles) {
    assert.equal(
      fs.existsSync(path.join(root, file)),
      true,
      `Pflichtdatei fehlt: ${file}`
    );
  }
});

test('.gitignore sperrt .env zuverlässig', () => {
  const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  assert.match(gitignore, /^\.env$/m);
});

test('Minimalistisches UI (Jakob Nielsen & RE-Lehrbuch): keine Dropdowns, keine unnötigen Checkboxen, keine vorausgewählten Kanäle', () => {
  const html = fs.readFileSync(path.join(root, 'src', 'public', 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'src', 'public', 'app.js'), 'utf8');
  assert.doesNotMatch(html, /<select\b/i);
  assert.doesNotMatch(js, /<select\b/i);
  assert.doesNotMatch(html, /type="checkbox"/i);
  assert.doesNotMatch(js, /type="checkbox"/i);
  assert.doesNotMatch(html, /class="ch-btn active"/);
  assert.doesNotMatch(js, /js-jira/);
});

test('iPhone / Mobile PWA Optimierung (Safe-Area, Standalone, kein Auto-Zoom)', () => {
  const html = fs.readFileSync(path.join(root, 'src', 'public', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'src', 'public', 'styles.css'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src', 'public', 'site.webmanifest'), 'utf8'));
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /apple-touch-icon/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.equal(manifest.display, 'standalone');
  assert.equal(fs.existsSync(path.join(root, 'src', 'public', 'assets', 'apple-touch-icon.png')), true);
});

test('Impressum & Datenschutzerklärung (Self-Hosting, Proprietär, reaktive Kenntnisnahme) sind integriert', () => {
  const html = fs.readFileSync(path.join(root, 'src', 'public', 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'src', 'public', 'app.js'), 'utf8');
  assert.match(html, /id="legal-modal"/);
  assert.match(html, /id="btn-open-imprint"/);
  assert.match(html, /id="btn-open-privacy"/);
  assert.match(js, /weder einen produktiven Server noch eine Datenbank/);
  assert.match(js, /ausdrücklichen schriftlichen Zustimmung/);
  assert.match(js, /reaktiv/);
  assert.match(js, /revDSG/);
});
