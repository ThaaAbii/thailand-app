import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pruefeReiseDaten, zusammenfassung, trenneImport, baueExport, BACKUP_FORMAT } from '../app/js/daten.js';

const demo = JSON.parse(readFileSync(new URL('../app/demo-daten.json', import.meta.url)));

test('Demo-Daten sind gültig und vollständig', () => {
  const p = pruefeReiseDaten(demo);
  assert.deepEqual(p.fehler, []);
  assert.deepEqual(p.warnungen, []);
  for (const k of ['reise', 'orte', 'tage', 'buchungen', 'fristen', 'checkliste', 'tipps', 'budget', 'versicherung', 'notfall']) {
    assert.ok(k in demo, `Abschnitt ${k} fehlt`);
  }
});

test('Kaputte Daten werden erkannt', () => {
  assert.equal(pruefeReiseDaten(null).ok, false);
  assert.equal(pruefeReiseDaten([]).ok, false);
  const p = pruefeReiseDaten({ reise: { abflug: 'x' }, tage: [{ d: '17.11.2026' }] });
  assert.equal(p.ok, false);
  assert.equal(p.fehler.length, 3);
});

test('Backup lässt sich wieder importieren', () => {
  const eigene = { ausgaben: [{ thb: 120 }] };
  const backup = JSON.parse(JSON.stringify(baueExport(demo, eigene, new Date('2026-11-20T00:00:00Z'))));
  assert.equal(backup._app.format, BACKUP_FORMAT);
  const { reise, eigene: zurueck } = trenneImport(backup);
  assert.deepEqual(reise, demo);
  assert.deepEqual(zurueck, eigene);
  assert.equal(pruefeReiseDaten(reise).ok, true);
});

test('Normale reise-daten.json hat keine eigenen Einträge', () => {
  assert.equal(trenneImport(demo).eigene, null);
  assert.equal(zusammenfassung(demo).tage, 24);
});

test('Backup mit Fotos: Fotos kommen beim Import wieder heraus', () => {
  const fotos = { f1: { d: '2026-11-21', data: 'data:image/jpeg;base64,AAAA' } };
  const backup = JSON.parse(JSON.stringify(baueExport(demo, { tagebuch: { '2026-11-21': { fotos: ['f1'] } } }, new Date(), fotos)));
  const { reise, eigene, fotos: zurueck } = trenneImport(backup);
  assert.deepEqual(zurueck, fotos);
  assert.deepEqual(eigene.tagebuch['2026-11-21'].fotos, ['f1']);
  assert.equal(pruefeReiseDaten(reise).ok, true);
  assert.equal(trenneImport(baueExport(demo, {})).fotos, null);
});
