import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  checklistenGruppen, fortschritt, packSummen, packWarnungen, formatKg, PACK_VORLAGE, gewichtVon,
} from '../app/js/listenlogik.js';

const demo = JSON.parse(readFileSync(new URL('../app/demo-daten.json', import.meta.url)));

test('Checkliste: Häkchen aus Daten, eigene Häkchen gewinnen', () => {
  const g = checklistenGruppen(demo, { checkliste: { 'Flug & Einreise|Flug buchen': false, 'Gepäck|Dry Bag': true } });
  const p = g.flatMap((x) => x.punkte);
  assert.equal(p.find((x) => x.text === 'Flug buchen').erledigt, false);
  assert.equal(p.find((x) => x.text === 'Dry Bag').erledigt, true);
  assert.deepEqual(fortschritt(p), { gesamt: 6, erledigt: 1, prozent: 17 });
});

test('Checkliste: eigene Punkte in bestehender und neuer Gruppe', () => {
  const g = checklistenGruppen(demo, {
    checklisteEigene: [{ id: 'a', gruppe: 'Gepäck', text: 'Sonnenbrille' }, { id: 'b', gruppe: 'Neu', text: 'X' }],
    checkliste: { 'eigen:a': true },
  });
  assert.equal(g.find((x) => x.gruppe === 'Gepäck').punkte.at(-1).erledigt, true);
  assert.equal(g.at(-1).gruppe, 'Neu');
});

test('Checkliste ohne Daten', () => {
  assert.deepEqual(checklistenGruppen({}, undefined), []);
  assert.deepEqual(fortschritt([]), { gesamt: 0, erledigt: 0, prozent: 0 });
});

test('Packliste: Summen pro Bereich mit Anzahl', () => {
  const s = packSummen([
    { g: 150, anzahl: 6, wo: 'aufgabe', gepackt: true },
    { g: 1500, anzahl: 1, wo: 'hand' },
    { g: 230, wo: 'koerper' },
    { g: 100, anzahl: 2, wo: 'quatsch' },
  ]);
  assert.deepEqual(s, { aufgabe: 1100, hand: 1500, koerper: 230, gesamt: 2830, anzahl: 4, gepackt: 1 });
  assert.equal(gewichtVon({ g: 'x', anzahl: 2 }), 0);
});

test('Packliste: Warnungen bei 20 kg, 23 kg und 8 kg Handgepäck', () => {
  assert.equal(packWarnungen({ aufgabe: 19000, hand: 7000 })[0].stufe, 'ok');
  assert.equal(packWarnungen({ aufgabe: 20000, hand: 0 })[0].stufe, 'ok');
  assert.equal(packWarnungen({ aufgabe: 20100, hand: 0 })[0].stufe, 'orange');
  assert.equal(packWarnungen({ aufgabe: 23500, hand: 0 })[0].stufe, 'rot');
  const w = packWarnungen({ aufgabe: 0, hand: 8200 });
  assert.equal(w.length, 1);
  assert.match(w[0].text, /8 kg/);
});

test('Formatierung und Vorlage', () => {
  assert.equal(formatKg(18450), '18,5 kg');
  const s = packSummen(PACK_VORLAGE);
  assert.ok(s.aufgabe > 5000 && s.aufgabe < 20000, `Vorlage Aufgabegepäck ${s.aufgabe}`);
  assert.ok(s.hand < 8000, `Vorlage Handgepäck ${s.hand}`);
});
