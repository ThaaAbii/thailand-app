import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planWerte, reisegeld, optionen, parseZahl, gewaehlteOption, hatPlanung } from '../app/js/budgetlogik.js';
import { seiteBudgetplan } from '../app/js/budget.js';
import { seiteAusgaben } from '../app/js/ausgaben.js';
import { flugDauer, ankunftZeit, bordkarte } from '../app/js/visuell.js';
import { seiteUnterkunft, seiteUnterkuenfte, seiteFluege } from '../app/js/details.js';

const demo = JSON.parse(readFileSync(new URL('../app/demo-daten.json', import.meta.url)));

test('Zahlen mit Vorzeichen lesen', () => {
  assert.equal(parseZahl('-100'), -100);
  assert.equal(parseZahl('−100'), -100);
  assert.equal(parseZahl('1.026,50 €'), 1026.5);
  assert.equal(parseZahl('0'), 0);
  assert.equal(parseZahl(''), null);
  assert.equal(parseZahl('abc'), null);
});

test('Budgetplanung wie im Excel-Blatt', () => {
  const daten = { budget: { planung: {
    posten: [{ was: 'Minijob', betrag: 500 }, { was: 'Maske', betrag: -100 }, { was: 'Gehalt', betrag: 400 }, { was: 'Minijob Okt', betrag: 186 }, { was: 'Tauchkurs', betrag: -360 }],
    kreditkarte: 400, kreditkarteMax: 800, umschlag: 500, reisetage: 22, sparsam: 37.36, normal: 54.95, gewaehlt: 2,
  } } };
  const plan = planWerte(daten, {});
  assert.equal(reisegeld(plan), 626);
  const o = optionen(plan, 37.8);
  assert.deepEqual(o.map((x) => x.gesamt), [626, 1026, 1526, 1426, 1926, 1126]);
  assert.equal(o[1].proTag, 46.64);
  assert.equal(o[1].stufe, 'orange');
  assert.equal(o[0].stufe, 'rot');
  assert.equal(o[2].stufe, 'gruen');
  assert.equal(o[1].proTagThb, Math.round(46.64 * 37.8));
  assert.equal(gewaehlteOption(daten, {}, 37.8).nr, 2);
  // eigene Änderungen überschreiben die Vorlage
  assert.equal(gewaehlteOption(daten, { budgetPlan: { gewaehlt: 3 } }, 37.8).gesamt, 1526);
  assert.equal(reisegeld(planWerte(daten, { budgetPlan: { posten: [{ was: 'x', betrag: 10 }] } })), 10);
  assert.equal(hatPlanung({}, {}), false);
  assert.equal(planWerte({}, {}).reisetage, 22);
});

test('Budget- und Geldseiten rendern', () => {
  for (const html of [seiteBudgetplan(demo, {}).html, seiteBudgetplan({}, {}).html, seiteAusgaben(demo, {}, new Date('2026-11-22T05:00:00Z'), ['plan'], {}).html,
    seiteAusgaben(demo, { ausgaben: [{ id: 'a', d: '2026-11-22', betrag: 300, waehrung: 'THB', kurs: 38, kat: 'Essen & Trinken' }] }, new Date('2026-11-22T05:00:00Z'), [], {}).html]) {
    assert.ok(!/undefined|NaN/.test(html));
  }
  assert.match(seiteAusgaben(demo, {}, new Date('2026-11-22T05:00:00Z'), [], {}).html, /Option 2/);
});

test('Flugdauer über Zeitzonen und Mitternacht', () => {
  const f = { d: '2026-11-17', von: 'HAJ', nach: 'BKK', abflug: '19:45', ankunft: '14:50' };
  assert.equal(flugDauer(f), '13 Std. 5 Min.');
  assert.equal(ankunftZeit(f).toISOString(), '2026-11-18T07:50:00.000Z');
  assert.equal(flugDauer({ d: '2026-11-20', von: 'BKK', nach: 'USM', abflug: '19:15', ankunft: '20:25' }), '1 Std. 10 Min.');
  assert.equal(flugDauer({ d: '2026-11-20', von: 'BKK' }), '');
  assert.match(bordkarte({ id: 'x', ...f, nummer: 'LH773', airline: 'Lufthansa' }, new Date('2026-11-01')), /HAJ[\s\S]*BKK[\s\S]*<sup>\+1<\/sup>/);
});

test('Hotels mit Fotos und Bordkarten-Seiten', () => {
  const eigene = { hotelFotos: { 'Musterhotel Sukhumvit (Demo)': ['f1'] } };
  const name = 'Musterhotel Sukhumvit (Demo)';
  assert.match(seiteUnterkuenfte(demo, eigene).html, /data-foto="f1"/);
  assert.match(seiteUnterkunft(demo, eigene, name, false).html, /galerie__bild/);
  assert.match(seiteUnterkunft(demo, {}, name, false).html, /Fotos hinzufügen/);
  assert.match(seiteUnterkunft(demo, {}, name, true).html, /data-unterkunft-form/);
  assert.ok(!/undefined|NaN/.test(seiteFluege(demo, { fluege: [{ id: 'a', d: '2026-11-20', nummer: 'PG191', von: 'BKK', nach: 'USM', abflug: '19:15', ankunft: '20:25' }] }, new Date()).html));
});

test('Hotel-Steckbrief aus den Reisedaten', async () => {
  const { hotelInfo, titelBild, hotelAbschnitte } = await import('../app/js/hotel.js');
  const bild = 'data:image/jpeg;base64,AAAA';
  const daten = { ...demo, hotels: { "Ban's Diving Resort": { bewertung: { note: 9 }, bilder: [bild, 'javascript:alert(1)'], preis: [{ was: 'Zimmer', betrag: 10 }], bezahlt: 10, ausstattung: [{ gruppe: 'Haus', punkte: ['Pool'] }] } } };
  assert.equal(hotelInfo(daten, "Ban's Diving Resort – Dormitory").bewertung.note, 9);
  assert.deepEqual(hotelInfo(daten, 'Unbekannt'), {});
  assert.deepEqual(titelBild(daten, {}, "Ban's Diving Resort – Dormitory"), { src: bild });
  assert.deepEqual(titelBild(daten, { hotelFotos: { "Ban's Diving Resort – Dormitory": ['f9'] } }, "Ban's Diving Resort – Dormitory"), { id: 'f9' });
  const html = hotelAbschnitte(hotelInfo(daten, "Ban's Diving Resort"));
  assert.match(html, /Preisdetails/);
  assert.match(html, /Pool/);
  assert.ok(!/javascript:/.test(html));
});

test('Bilder aus den Reisedaten lassen sich ausblenden', async () => {
  const { sichtbareHotelBilder, bildKennung, titelBild } = await import('../app/js/hotel.js');
  const a = 'data:image/jpeg;base64,AAAA', b = 'data:image/jpeg;base64,BBBB';
  const daten = { hotels: { H: { bilder: [a, b] } } };
  const eigene = { hotelBilderWeg: { H: [bildKennung(a)] } };
  assert.deepEqual(sichtbareHotelBilder(daten, eigene, 'H'), [b]);
  assert.deepEqual(titelBild(daten, eigene, 'H'), { src: b });
  assert.notEqual(bildKennung(a), bildKennung(b));
});
