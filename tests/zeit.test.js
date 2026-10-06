import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TZ_DE, TZ_TH, datumIn, uhrzeitIn, versatzStunden, tageDiff, plusTage, parseZeit,
  restText, naechsteFristen, reisePhase, countdown,
} from '../app/js/zeit.js';
import { readFileSync } from 'node:fs';

const demo = JSON.parse(readFileSync(new URL('../app/demo-daten.json', import.meta.url)));

// Daten im Format der echten reise-daten.json (Abflug 17.11. 19:45 dt. Zeit, Heimkehr 10.12. 08:35).
const reise = {
  reise: { abflug: '2026-11-17T18:45:00.000Z', heimkehr: '2026-12-10T07:35:00.000Z' },
  tage: Array.from({ length: 24 }, (_, i) => ({ d: plusTage('2026-11-17', i), p: 'bkk', t: `T${i}` })),
};

test('Zeitzonen: Sommer-/Winterzeit und Thailand', () => {
  const okt = new Date('2026-10-06T10:00:00Z');
  const nov = new Date('2026-11-20T10:00:00Z');
  assert.equal(versatzStunden(okt, TZ_DE), 2);
  assert.equal(versatzStunden(nov, TZ_DE), 1);
  assert.equal(versatzStunden(nov, TZ_TH), 7);
  assert.equal(uhrzeitIn(nov, TZ_TH), '17:00');
  assert.equal(datumIn(new Date('2026-11-20T18:30:00Z'), TZ_TH), '2026-11-21');
});

test('Datumsrechnung', () => {
  assert.equal(tageDiff('2026-11-17', '2026-12-10'), 23);
  assert.equal(plusTage('2026-11-30', 1), '2026-12-01');
  assert.equal(parseZeit('2026-10-16T23:59+02:00').toISOString(), '2026-10-16T21:59:00.000Z');
  assert.equal(parseZeit('quatsch'), null);
});

test('Countdown', () => {
  const c = countdown(new Date('2026-11-17T18:45:00Z'), new Date('2026-11-16T17:44:30Z'));
  assert.deepEqual(c, { vorbei: false, tage: 1, stunden: 1, minuten: 0, sekunden: 30 });
});

test('restText zählt Kalendertage', () => {
  const jetzt = new Date('2026-10-06T08:00:00Z');
  assert.equal(restText(new Date('2026-10-16T21:59:00Z'), jetzt), 'noch 10 Tage');
  assert.equal(restText(new Date('2026-10-07T05:00:00Z'), jetzt), 'morgen');
  assert.equal(restText(new Date('2026-10-06T13:00:00Z'), jetzt), 'heute, noch 5 Std.');
  assert.equal(restText(new Date('2026-10-05T13:00:00Z'), jetzt), 'vorbei');
});

test('naechsteFristen sortiert und überspringt Ungültiges', () => {
  const f = naechsteFristen([{ t: '2026-12-01T10:00+01:00', w: 'B' }, { t: 'x', w: 'kaputt' }, { t: '2026-11-01T10:00+01:00', w: 'A' }, { t: '2026-01-01T10:00+01:00', w: 'alt' }], new Date('2026-10-06T00:00:00Z'));
  assert.deepEqual(f.map((x) => x.w), ['A', 'B']);
});

test('Phase vor der Reise', () => {
  const ph = reisePhase(reise, new Date('2026-10-06T10:00:00Z'));
  assert.equal(ph.phase, 'vorher');
  assert.equal(ph.datum, '2026-10-06');
});

test('Abreisetag (deutsche Zeit, vor Abflug)', () => {
  const ph = reisePhase(reise, new Date('2026-11-17T08:00:00Z'));
  assert.equal(ph.phase, 'unterwegs');
  assert.equal(ph.label, 'Abreisetag');
  assert.equal(ph.tag.d, '2026-11-17');
});

test('Nach dem Abflug zählt Thailand-Zeit: Tag 1 von 22', () => {
  const ph = reisePhase(reise, new Date('2026-11-17T20:00:00Z')); // 18.11. 03:00 in Thailand
  assert.equal(ph.tag.d, '2026-11-18');
  assert.equal(ph.label, 'Tag 1 von 22');
});

test('Mitten in der Reise und letzter Thailand-Tag', () => {
  assert.equal(reisePhase(reise, new Date('2026-11-21T05:00:00Z')).label, 'Tag 4 von 22');
  assert.equal(reisePhase(reise, new Date('2026-12-09T10:00:00Z')).label, 'Tag 22 von 22');
});

test('Heimreisetag und danach', () => {
  assert.equal(reisePhase(reise, new Date('2026-12-09T18:00:00Z')).label, 'Heimreisetag'); // 10.12. 01:00 TH
  assert.equal(reisePhase(reise, new Date('2026-12-10T12:00:00Z')).label, 'Heimreisetag');
  assert.equal(reisePhase(reise, new Date('2026-12-11T12:00:00Z')).phase, 'nachher');
});

test('Demo-Daten: 22 Tage in Thailand', () => {
  assert.equal(reisePhase(demo, new Date('2026-11-25T05:00:00Z')).label, 'Tag 8 von 22');
});
