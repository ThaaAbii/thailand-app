import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseBetrag, inEur, inThb, tagesbudgetEur, aktuellerKurs, kursAusAntwort, kursVeraltet,
  summenNach, budgetStatus, ueberblick, ausgabenCsv, kategorien,
} from '../app/js/ausgabenlogik.js';
import { thailandTage } from '../app/js/zeit.js';
import { route, verkehrsmittel } from '../app/js/karte.js';
import { SAETZE, ALLERGIEN, ZAHLEN } from '../app/js/thai.js';

const demo = JSON.parse(readFileSync(new URL('../app/demo-daten.json', import.meta.url)));

test('Beträge in deutscher Schreibweise', () => {
  assert.equal(parseBetrag('120'), 120);
  assert.equal(parseBetrag('1.200'), 1200);
  assert.equal(parseBetrag('1200,50'), 1200.5);
  assert.equal(parseBetrag('1.200,5'), 1200.5);
  assert.equal(parseBetrag('45.5'), 45.5);
  assert.equal(parseBetrag('1 500 ฿'), 1500);
  assert.equal(parseBetrag(''), null);
  assert.equal(parseBetrag('abc'), null);
  assert.equal(parseBetrag('-5'), null);
});

test('Umrechnung mit gespeichertem Kurs', () => {
  assert.equal(inEur({ betrag: 379, waehrung: 'THB', kurs: 37.9 }), 10);
  assert.equal(inThb({ betrag: 10, waehrung: 'EUR', kurs: 37.9 }), 379);
  assert.equal(inThb({ betrag: 100, waehrung: 'THB', kurs: 40 }), 100);
});

test('Tagesbudget aus Reisedaten, eigene Einstellung gewinnt', () => {
  assert.equal(tagesbudgetEur({ budget: { tagesbudgetPlan: 'Option 1: 1.133,49 € (ca. 52 €/Tag), Reserve' } }, {}), 52);
  assert.equal(tagesbudgetEur(demo, {}), 50);
  assert.equal(tagesbudgetEur(demo, { einstellungen: { tagesbudget: 60 } }), 60);
  assert.equal(tagesbudgetEur({}, {}), 52);
});

test('Kurs: manuell > automatisch > Reisedaten', () => {
  assert.deepEqual(aktuellerKurs(demo, {}), { wert: 37.9, quelle: 'standard' });
  assert.equal(aktuellerKurs(demo, { kursCache: { wert: 38.4, stand: '2026-10-05' } }).quelle, 'auto');
  assert.equal(aktuellerKurs(demo, { kursCache: { wert: 38.4 }, einstellungen: { kursModus: 'manuell', kursManuell: 36 } }).wert, 36);
});

test('Kurs-Antworten der beiden Dienste', () => {
  assert.deepEqual(kursAusAntwort({ amount: 1, base: 'EUR', date: '2026-10-05', rates: { THB: 38.123 } }), { wert: 38.123, stand: '2026-10-05' });
  assert.deepEqual(kursAusAntwort({ result: 'success', time_last_update_utc: 'Mon, 05 Oct 2026 00:02:31 +0000', rates: { THB: 38.5, USD: 1.1 } }), { wert: 38.5, stand: '2026-10-05' });
  assert.equal(kursAusAntwort({ rates: { THB: 'x' } }), null);
  assert.equal(kursAusAntwort({ rates: { THB: 0.02 } }), null);
  assert.equal(kursAusAntwort(null), null);
});

test('Kurs veraltet nach 12 Stunden', () => {
  const jetzt = new Date('2026-11-20T12:00:00Z');
  assert.equal(kursVeraltet({}, jetzt), true);
  assert.equal(kursVeraltet({ kursCache: { geholt: '2026-11-20T06:00:00Z' } }, jetzt), false);
  assert.equal(kursVeraltet({ kursCache: { geholt: '2026-11-19T20:00:00Z' } }, jetzt), true);
});

test('Ampel und Überblick', () => {
  assert.equal(budgetStatus(40, 52), 'gruen');
  assert.equal(budgetStatus(50, 52), 'orange');
  assert.equal(budgetStatus(60, 52), 'rot');
  const a = [
    { id: '1', d: '2026-11-18', betrag: 1137, waehrung: 'THB', kurs: 37.9, kat: 'Essen & Trinken', p: 'bkk' },
    { id: '2', d: '2026-11-19', betrag: 40, waehrung: 'EUR', kurs: 37.9, kat: 'Ausflüge', p: 'bkk' },
  ];
  const tage = thailandTage(demo);
  assert.equal(tage.length, 22);
  const u = ueberblick(a, tage, 50, '2026-11-19');
  assert.equal(u.tage, 2);
  assert.equal(Math.round(u.gesamtEur), 70);
  assert.equal(u.durchschnitt, 35);
  assert.equal(u.status, 'gruen');
  assert.equal(u.budgetGesamt, 1100);
  const k = summenNach(a, (x) => x.kat);
  assert.equal(k[0].key, 'Ausflüge');
});

test('CSV für Excel', () => {
  const csv = ausgabenCsv([{ id: '1', d: '2026-11-18', betrag: 120, waehrung: 'THB', kurs: 40, kat: 'Essen & Trinken', notiz: 'Pad "Thai"', p: 'bkk' }], () => 'Bangkok');
  assert.ok(csv.startsWith('﻿Datum;Ort'));
  assert.match(csv, /2026-11-18;"Bangkok";"Essen & Trinken";"Pad ""Thai""";120,00;THB;40,00;120,00;3,00/);
});

test('Kategorien aus Reisedaten', () => {
  assert.equal(kategorien(demo).length, 8);
  assert.equal(kategorien({}).length, 8);
});

test('Route und Verkehrsmittel', () => {
  assert.equal(verkehrsmittel('Bangkok Airways PG191 · BKK 19:15 → USM 20:25'), 'flug');
  assert.equal(verkehrsmittel('Grab Hotel → Bangrak Pier\nLomprayah 10:30 → 12:15'), 'faehre');
  assert.equal(verkehrsmittel('Bus + Fähre-Kombi 09:30 → 15:50'), 'kombi');
  assert.equal(verkehrsmittel('Thai Vietjet VZ2341 · KBV 11:10 → BKK 12:45'), 'flug');
  const r = route(demo);
  assert.deepEqual(r.map((s) => s.p), ['bkk', 'samui', 'tao', 'aonang', 'bkk']);
  assert.deepEqual(r.slice(0, -1).map((s) => s.weiter), ['flug', 'faehre', 'kombi', 'flug']);
  assert.ok(r.every((s) => s.koord));
});

test('Thai-Sätze vollständig', () => {
  const alle = SAETZE.flatMap((g) => g.saetze);
  assert.ok(alle.length >= 35);
  for (const [de, thai, laut] of [...alle, ...ALLERGIEN.map(([d, t, l]) => [d, t, l]), ...ZAHLEN.map(([z, t, l]) => [String(z), t, l])]) {
    assert.ok(de && laut, `Satz unvollständig: ${de}`);
    assert.match(thai, /[฀-๿]/, `Keine Thai-Schrift: ${de}`);
  }
  assert.ok(alle.some(([, t]) => t === 'ไม่ใส่หมู'), 'mai sai moo fehlt');
  assert.ok(alle.some(([d]) => /halal/i.test(d)), 'halal fehlt');
});
