import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderHeute } from '../app/js/heute.js';
import { seiteReise, seiteTag } from '../app/js/reise.js';
import { seiteAufgaben } from '../app/js/aufgaben.js';
import { seiteAusgaben } from '../app/js/ausgaben.js';
import { seitePackliste } from '../app/js/listen.js';
import { seiteMehr, seiteBuchungen, seiteTipps } from '../app/js/mehr.js';
import { seiteIdeen, ideenFuerOrt } from '../app/js/ideen.js';
import { seiteTagebuch } from '../app/js/tagebuch.js';
import { seiteThai } from '../app/js/thai.js';
import { seiteNotfall } from '../app/js/notfall.js';
import { seiteKarte } from '../app/js/karte.js';
import { seiteDaten } from '../app/js/datenansicht.js';
import { PACK_VORLAGE } from '../app/js/listenlogik.js';

const demo = JSON.parse(readFileSync(new URL('../app/demo-daten.json', import.meta.url)));
const eigene = {
  ausgaben: [
    { id: 'a1', d: '2026-11-22', betrag: 180, waehrung: 'THB', kurs: 38, kat: 'Essen & Trinken', notiz: 'Pad Thai', p: 'samui', zeit: '2026-11-22T05:00:00Z' },
    { id: 'a2', d: '2026-11-21', betrag: 12, waehrung: 'EUR', kurs: 38, kat: 'Transport', notiz: '', p: 'samui', zeit: '2026-11-21T05:00:00Z' },
  ],
  tagebuch: { '2026-11-21': { stimmung: '😍', text: 'Erster Tag am Strand <b>', fotos: ['f1', 'f2'] } },
  ideen: { status: { 'samui|Ang Thong Marine Park': 'will' }, eigene: [{ id: 'i1', ort: 'samui', titel: 'Kochkurs' }] },
  packliste: PACK_VORLAGE.map((x, i) => ({ ...x, id: `p${i}`, gepackt: i < 3 })),
  checkliste: { 'Gepäck|Dry Bag': true },
  checklisteEigene: [{ id: 'c1', gruppe: 'Gepäck', text: 'Ohrstöpsel' }],
};

const ZEITEN = {
  vorher: new Date('2026-10-06T10:00:00Z'),
  abreise: new Date('2026-11-17T08:00:00Z'),
  unterwegs: new Date('2026-11-22T05:00:00Z'),
  nachher: new Date('2026-12-20T10:00:00Z'),
};

function pruefe(seite, name) {
  const html = typeof seite === 'string' ? seite : seite.html;
  assert.equal(typeof html, 'string', `${name}: kein HTML`);
  assert.ok(html.length > 50, `${name}: zu wenig Inhalt`);
  assert.ok(!/undefined|NaN|\[object Object\]/.test(html), `${name}: enthält undefined/NaN`);
  assert.ok(!html.includes('<b>'.replace('b', 'b>Erster')), `${name}: HTML nicht escaped`);
}

for (const [phase, jetzt] of Object.entries(ZEITEN)) {
  test(`Alle Seiten rendern (${phase})`, () => {
    pruefe(renderHeute(demo, jetzt, eigene), 'heute');
    pruefe(renderHeute(demo, jetzt, {}), 'heute leer');
    pruefe(seiteReise(demo, eigene, jetzt), 'reise');
    for (const t of [[], ['gruppe', '0'], ['erledigt'], ['neu']]) pruefe(seiteAufgaben(demo, eigene, jetzt, t, { ausblenden: false }), `aufgaben/${t}`);
    pruefe(seiteTag(demo, eigene, jetzt, '2026-11-21'), 'tag');
    for (const t of [[], ['neu'], ['bearbeiten', 'a1'], ['statistik'], ['liste'], ['einstellungen']]) {
      pruefe(seiteAusgaben(demo, eigene, jetzt, t, {}), `ausgaben/${t.join('/')}`);
    }
    pruefe(seiteTagebuch(demo, eigene, jetzt, []), 'tagebuch');
    pruefe(seiteTagebuch(demo, eigene, jetzt, ['2026-11-21']), 'tagebuch/tag');
    pruefe(seiteNotfall(demo, jetzt), 'notfall');
    pruefe(seiteKarte(demo, jetzt, { ort: 'tao' }), 'karte');
  });
}

test('Menü- und Unterseiten', () => {
  pruefe(seiteMehr(demo, eigene), 'mehr');
  pruefe(seitePackliste(eigene, []), 'packliste');
  pruefe(seitePackliste({}, []), 'packliste leer');
  pruefe(seitePackliste(eigene, ['aufgabe']), 'packliste/aufgabe');
  pruefe(seitePackliste(eigene, ['teil', 'p1']), 'packliste/teil');
  pruefe(seitePackliste(eigene, ['neu', 'hand']), 'packliste/neu');
  pruefe(seiteBuchungen(demo), 'buchungen');
  pruefe(seiteTipps(demo, []), 'tipps');
  pruefe(seiteTipps(demo, ['0']), 'tipps/0');
  pruefe(seiteIdeen(demo, eigene, []), 'ideen');
  pruefe(seiteIdeen(demo, eigene, ['samui']), 'ideen/samui');
  for (const t of [[], ['0'], ['allergie'], ['zahlen']]) pruefe(seiteThai({ hoeflich: 'khrap', allergie: 2 }, t), `thai/${t}`);
  pruefe(seiteDaten({ meta: { quelle: 'demo' }, zusammenfassung: null, thema: 'system', version: 'x', fotoAnzahl: 3 }), 'daten');
});

test('Unterseiten haben einen Zurück-Weg', () => {
  const j = ZEITEN.unterwegs;
  assert.equal(seiteTag(demo, eigene, j, '2026-11-21').zurueck, '#reise');
  assert.equal(seiteAusgaben(demo, eigene, j, ['neu'], {}).zurueck, '#geld');
  assert.equal(seiteTagebuch(demo, eigene, j, ['2026-11-21']).zurueck, '#tagebuch');
  assert.equal(seiteIdeen(demo, eigene, ['samui']).zurueck, '#ideen');
  assert.equal(seiteAusgaben(demo, eigene, j, [], {}).zurueck, undefined);
});

test('Ausflugsideen: Status und eigene Ideen', () => {
  const ideen = ideenFuerOrt(demo, eigene, 'samui');
  assert.equal(ideen[0].titel, 'Kochkurs');
  assert.equal(ideen.find((i) => i.titel === 'Ang Thong Marine Park').status, 'will');
  assert.ok(ideenFuerOrt(demo, {}, 'aonang').some((i) => /Railay/.test(i.titel)));
  assert.ok(ideenFuerOrt(demo, {}, 'tao').some((i) => /Fun Dives/.test(i.titel)));
  assert.ok(ideenFuerOrt(demo, {}, 'aonang').some((i) => /Phi Phi/.test(i.titel)));
  assert.ok(ideenFuerOrt(demo, {}, 'aonang').some((i) => /4-Islands/.test(i.titel)));
});
