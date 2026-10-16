import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  mitAnpassungen, tagAenderung, zeitInZone, abflugZeit, checkinOeffnet, flugFristen,
  flugVorschlaege, alleUnterkuenfte, flughafenZone,
} from '../app/js/anpassungen.js';
import { TZ_DE, TZ_TH } from '../app/js/zeit.js';
import { seiteTagBearbeiten, seiteUnterkunft, seiteUnterkuenfte, seiteFluege, seiteFlug } from '../app/js/details.js';
import { seiteTag } from '../app/js/reise.js';
import { seitePlan } from '../app/js/plan.js';

const demo = JSON.parse(readFileSync(new URL('../app/demo-daten.json', import.meta.url)));
// Fahrplan-Zeilen im Format der echten Daten
const reise = {
  ...demo,
  tage: [
    { d: '2026-11-17', p: 'travel', t: 'Hannover → Bangkok', prog: 'Abflug HAJ 19:45 (via München)', tr: 'Lufthansa\nFahrt zum Flughafen Hannover organisieren' },
    { d: '2026-11-20', p: 'travel', t: 'Bangkok → Koh Samui', tr: 'Hotel → Flughafen BKK\nBangkok Airways PG191 · BKK 19:15 → USM 20:25\nFlughafen Samui → Chaweng: Hotel-Transfer fragen oder Grab', stay: 'Chaweng Villawee Hotel' },
    { d: '2026-11-21', p: 'samui', t: 'Koh Samui', stay: 'Chaweng Villawee Hotel' },
    { d: '2026-12-08', p: 'travel', t: 'Krabi → Bangkok', tr: 'Thai Vietjet VZ2341 · KBV 11:10 → BKK 12:45' },
    { d: '2026-12-09', p: 'bkk', t: 'Bangkok → Abflug', tr: '20:00 Grab zum Flughafen BKK\nLufthansa · BKK 23:30 (via München)', stay: 'Im Flieger' },
  ],
};

test('Tag-Änderungen überschreiben nur geänderte Felder', () => {
  const orig = reise.tage[2];
  const a = tagAenderung(orig, { t: 'Koh Samui', prog: '', tr: 'Roller mieten', stay: 'Chaweng Villawee Hotel', ci: '', note: ' Sonnencreme! ' });
  assert.deepEqual(a, { tr: 'Roller mieten', note: 'Sonnencreme!' });
  assert.equal(tagAenderung(orig, { t: 'Koh Samui', stay: 'Chaweng Villawee Hotel' }), null);
  const m = mitAnpassungen(reise, { tagAenderungen: { '2026-11-21': a } });
  assert.equal(m.tage[2].tr, 'Roller mieten');
  assert.equal(m.tage[2].note, 'Sonnencreme!');
  assert.equal(m.tage[1].tr, reise.tage[1].tr);
  assert.equal(reise.tage[2].tr, undefined, 'Original bleibt unverändert');
  assert.equal(mitAnpassungen(reise, {}), reise);
});

test('Zeitzonen für Abflug und Check-in', () => {
  assert.equal(zeitInZone('2026-11-20T19:15', TZ_TH).toISOString(), '2026-11-20T12:15:00.000Z');
  assert.equal(zeitInZone('2026-11-17T19:45', TZ_DE).toISOString(), '2026-11-17T18:45:00.000Z');
  assert.equal(flughafenZone('HAJ'), TZ_DE);
  assert.equal(flughafenZone('bkk'), TZ_TH);
  const f = { id: 'f', d: '2026-11-20', von: 'BKK', abflug: '19:15', checkinStunden: 24 };
  assert.equal(abflugZeit(f).toISOString(), '2026-11-20T12:15:00.000Z');
  assert.equal(checkinOeffnet(f).toISOString(), '2026-11-19T12:15:00.000Z');
  assert.equal(checkinOeffnet({ ...f, checkinStunden: '' }), null);
});

test('Offener Online-Check-in wird zur Frist, erledigter nicht', () => {
  const f = { id: 'f', d: '2026-11-20', nummer: 'PG191', von: 'BKK', nach: 'USM', abflug: '19:15', checkinStunden: 24, checkin: 'offen' };
  const fr = flugFristen({ fluege: [f] });
  assert.equal(fr.length, 1);
  assert.match(fr[0].w, /PG191/);
  assert.equal(flugFristen({ fluege: [{ ...f, checkin: 'erledigt' }] }).length, 0);
  const m = mitAnpassungen(reise, { fluege: [f] });
  assert.equal(m.fristen.length, reise.fristen.length + 1);
});

test('Flüge im Fahrplan erkennen', () => {
  const v = flugVorschlaege(reise, {});
  const pg = v.find((x) => x.nummer === 'PG191');
  assert.deepEqual(pg, { d: '2026-11-20', nummer: 'PG191', airline: 'Bangkok Airways', von: 'BKK', abflug: '19:15', nach: 'USM', ankunft: '20:25' });
  const vz = v.find((x) => x.nummer === 'VZ2341');
  assert.equal(vz.von, 'KBV');
  assert.equal(vz.airline, 'Thai Vietjet');
  const lhHin = v.find((x) => x.d === '2026-11-17');
  assert.equal(lhHin.airline, 'Lufthansa');
  assert.equal(lhHin.von, 'HAJ');
  assert.equal(lhHin.abflug, '19:45');
  const lhRueck = v.find((x) => x.d === '2026-12-09');
  assert.equal(lhRueck.von, 'BKK');
  assert.equal(lhRueck.abflug, '23:30');
  assert.equal(v.length, 4, JSON.stringify(v));
  // schon übernommene Flüge nicht noch mal vorschlagen
  assert.equal(flugVorschlaege(reise, { fluege: [{ id: 'x', d: '2026-11-20', nummer: 'PG191' }] }).length, 3);
});

test('Unterkünfte mit Zeitraum', () => {
  const u = alleUnterkuenfte(demo);
  const samui = u.find((x) => /Palmenbungalow/.test(x.name));
  assert.equal(samui.naechte, 6);
  assert.equal(samui.p, 'samui');
  assert.ok(!u.some((x) => /Flieger/.test(x.name)));
});

test('Bearbeiten-Seiten rendern', () => {
  const jetzt = new Date('2026-11-22T05:00:00Z');
  const eigene = {
    fluege: [{ id: 'f1', d: '2026-11-20', nummer: 'DA123', von: 'BKK', nach: 'USM', abflug: '15:00', checkinStunden: 24, checkin: 'offen', fotos: [] }],
    unterkuenfte: { 'Palmenbungalow Beispiel': { zimmer: '12', telefon: '+66 77 000', checkin: 'ab 14:00' } },
    tagAenderungen: { '2026-11-21': { note: 'Roller mieten' } },
  };
  const m = mitAnpassungen(demo, eigene);
  for (const s of [
    seiteTagBearbeiten(demo, m, eigene, '2026-11-21'),
    seiteUnterkuenfte(m, eigene),
    seiteUnterkunft(m, eigene, 'Palmenbungalow Beispiel', false),
    seiteUnterkunft(m, eigene, 'Palmenbungalow Beispiel', true),
    seiteUnterkunft(m, {}, 'Palmenbungalow Beispiel', false),
    seiteFluege(m, eigene, jetzt),
    seiteFlug(m, eigene, jetzt, 'f1'),
    seiteFlug(m, eigene, jetzt, 'neu', '2026-11-20'),
    seiteTag(m, eigene, jetzt, '2026-11-20'),
    seiteTag(m, eigene, jetzt, '2026-11-21'),
    seitePlan(m, eigene, new Date('2026-11-20T05:00:00Z')),
  ]) {
    assert.ok(!/undefined|NaN/.test(s.html), s.titel);
  }
  assert.match(seiteTag(m, eigene, jetzt, '2026-11-21').html, /Roller mieten/);
  assert.match(seiteTag(m, eigene, jetzt, '2026-11-21').html, /Zimmer 12/);
  assert.match(seiteTag(m, eigene, jetzt, '2026-11-20').html, /DA123/);
  assert.match(seitePlan(m, eigene, new Date('2026-11-20T05:00:00Z')).html, /DA123/);
});
