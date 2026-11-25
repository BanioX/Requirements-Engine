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

test('Minimalistisches UI (Jakob Nielsen) verzichtet komplett auf Dropdown-Menüs (<select>)', () => {
  const html = fs.readFileSync(path.join(root, 'src', 'public', 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'src', 'public', 'app.js'), 'utf8');
  assert.doesNotMatch(html, /<select\b/i);
  assert.doesNotMatch(js, /<select\b/i);
});
