import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const appDir = new URL('../app/', import.meta.url).pathname;

function alleDateien(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? alleDateien(p) : [p];
  });
}

test('Jede App-Datei ist im Offline-Speicher (sw.js) eingetragen', () => {
  const sw = readFileSync(join(appDir, 'sw.js'), 'utf8');
  for (const datei of alleDateien(appDir)) {
    const rel = relative(appDir, datei);
    if (rel === 'sw.js') continue;
    assert.ok(sw.includes(`'./${rel}'`), `${rel} fehlt in DATEIEN in sw.js`);
  }
});

test('Keine echten Reisedaten im App-Ordner', () => {
  for (const datei of alleDateien(appDir)) {
    assert.ok(!/reise-daten|thailand-backup/.test(datei), `${datei} darf nicht veröffentlicht werden`);
  }
});
