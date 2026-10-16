import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { alleAufgaben, anstehend, zaehle, setzeErledigt } from '../app/js/aufgaben.js';
import { mitAnpassungen } from '../app/js/anpassungen.js';
import { stationen } from '../app/js/reise.js';

const demo = JSON.parse(readFileSync(new URL('../app/demo-daten.json', import.meta.url)));
const jetzt = new Date('2026-10-16T08:00:00Z');

test('Fristen und Checkliste werden zu einer Aufgabenliste', () => {
  const a = alleAufgaben(demo, {});
  const fristen = a.filter((x) => x.art === 'frist');
  const checks = a.filter((x) => x.art === 'check');
  assert.equal(checks.length, 6);
  // „Einreisekarte ausfüllen“ steht als Frist UND als Checklisten-Punkt → nur einmal, mit Datum
  const einreise = a.filter((x) => /einreisekarte/i.test(x.titel));
  assert.equal(einreise.length, 1);
  assert.equal(einreise[0].art, 'check');
  assert.ok(einreise[0].faellig instanceof Date);
  assert.equal(fristen.length, demo.fristen.length - 1);
});

test('Anstehend: sortiert, Erledigtes und sehr Altes fällt raus', () => {
  const a = alleAufgaben(demo, {});
  const liste = anstehend(a, jetzt);
  assert.ok(liste.length > 3);
  for (let i = 1; i < liste.length; i += 1) assert.ok(liste[i - 1].faellig <= liste[i].faellig);
  // nach der Reise: vorbeie Termine sind weg, nur nicht abgehakte To-dos bleiben (überfällig)
  const spaeter = anstehend(a, new Date('2026-12-20T00:00:00Z'));
  assert.ok(spaeter.every((x) => x.art === 'check'));
  assert.ok(spaeter.some((x) => /einreisekarte/i.test(x.titel)));
});

test('Abhaken: Frist, Checklisten-Punkt und Online-Check-in', () => {
  const eigene = { fluege: [{ id: 'f1', d: '2026-11-20', nummer: 'DA123', von: 'BKK', abflug: '15:00', checkinStunden: 24, checkin: 'offen' }] };
  const daten = mitAnpassungen(demo, eigene);
  let a = alleAufgaben(daten, eigene);
  const frist = a.find((x) => x.art === 'frist');
  const check = a.find((x) => x.art === 'check' && !x.erledigt);
  const checkin = a.find((x) => x.art === 'checkin');
  assert.ok(checkin, 'Online-Check-in als Aufgabe');
  setzeErledigt(eigene, frist.key, true);
  setzeErledigt(eigene, check.key, true);
  setzeErledigt(eigene, checkin.key, true);
  assert.equal(eigene.fluege[0].checkin, 'erledigt');
  a = alleAufgaben(mitAnpassungen(demo, eigene), eigene);
  assert.equal(a.find((x) => x.key === frist.key).erledigt, true);
  assert.equal(a.find((x) => x.key === check.key).erledigt, true);
  assert.equal(a.some((x) => x.art === 'checkin'), false, 'erledigter Check-in verschwindet');
  const z = zaehle(a);
  assert.equal(z.gesamt, z.offen + z.erledigt);
});

test('Eigene Aufgabe mit Datum erscheint als Termin', () => {
  const eigene = { checklisteEigene: [{ id: 'x', gruppe: 'Eigene Aufgaben', text: 'Reisepass kopieren', faellig: '2026-11-01' }] };
  const a = alleAufgaben(demo, eigene);
  const pass = a.find((x) => x.titel === 'Reisepass kopieren');
  assert.equal(pass.eigen, true);
  assert.equal(pass.faellig.toISOString(), '2026-11-01T22:59:00.000Z');
  assert.ok(anstehend(a, jetzt).some((x) => x.key === pass.key));
});

test('Reise: Tage nach Etappen gegliedert', () => {
  const s = stationen(demo.tage);
  assert.deepEqual(s.map((x) => x.p), ['bkk', 'samui', 'tao', 'aonang', 'bkk']);
  assert.equal(s.reduce((n, x) => n + x.tage.length, 0), demo.tage.length);
});
