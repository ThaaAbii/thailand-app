// Start der App: Daten laden, Seiten anzeigen (mit Unterseiten), Offline-Modus einrichten.
import { VERSION } from './version.js';
import * as db from './db.js';
import { pruefeReiseDaten, zusammenfassung, trenneImport, baueExport, backupDateiname } from './daten.js';
import { renderHeute, aktualisiereTicker } from './heute.js';
import { seiteDaten } from './datenansicht.js';
import { seiteReise, seiteTag } from './reise.js';
import { seiteAufgaben, aufgabenAktionen, aufgabenAenderung } from './aufgaben.js';
import { seitePackliste, listenAktionen, listenAenderung } from './listen.js';
import { seiteMehr, seiteBuchungen, seiteTipps } from './mehr.js';
import { seiteAusgaben, ausgabenAktionen, ausgabenAenderung, ausgabenEingabe, aktualisiereUmrechnung } from './ausgaben.js';
import { kursAusAntwort, kursVeraltet } from './ausgabenlogik.js';
import { seiteKarte } from './karte.js';
import { seiteThai, zeigeVollbild } from './thai.js';
import { seiteNotfall } from './notfall.js';
import { seiteIdeen, ideenAktionen } from './ideen.js';
import {
  seiteTagebuch, tagebuchAktionen, tagebuchAenderung, tagebuchEingabe, ladeFotos,
  fotosFuerBackup, fotosAusBackup,
} from './tagebuch.js';
import { seiteTagBearbeiten, seiteUnterkunft, seiteUnterkuenfte, seiteFluege, seiteFlug, detailAktionen, detailAenderung } from './details.js';
import { mitAnpassungen } from './anpassungen.js';
import { e } from './ui.js';

const inhalt = document.getElementById('inhalt');
const toastEl = document.getElementById('toast');
const kopfTitel = document.getElementById('kopf-titel');
const kopfZurueck = document.getElementById('kopf-zurueck');

const state = {
  reise: null,
  meta: null,
  eigene: {},
  route: 'heute',
  teile: [],
  vorschau: null,
  ausgabenUi: {},
  karteUi: {},
  installPrompt: null,
  fotoAnzahl: 0,
  dbFehler: false,
  offlineBereit: false,
  persistent: false,
};

// ---------- Kleine Speicher-Helfer für Einstellungen ----------

function einstellung(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function setzeEinstellung(key, wert) {
  try {
    if (wert == null) localStorage.removeItem(key);
    else localStorage.setItem(key, wert);
  } catch { /* egal */ }
}

function testdatum() {
  const t = einstellung('testdatum');
  return t && /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

function jetzt() {
  const t = testdatum();
  return t ? new Date(`${t}T12:00:00+07:00`) : new Date();
}

// ---------- Seiten ----------
// Jede Seite liefert { titel, zurueck?, html }. nav = welcher Knopf unten leuchtet.

// Reisedaten inkl. deiner Änderungen (bearbeitete Tage, Check-in-Fristen deiner Flüge)
const r = () => mitAnpassungen(state.reise, state.eigene);
const ROUTEN = {
  heute: { nav: 'heute', seite: () => ({ titel: r()?.reise?.titel || 'Thailand', html: renderHeute(r(), jetzt(), state.eigene) }) },
  reise: { nav: 'reise', seite: () => seiteReise(r(), state.eigene, jetzt()) },
  aufgaben: { nav: 'aufgaben', seite: (t) => seiteAufgaben(r(), state.eigene, jetzt(), t, { ausblenden: einstellung('ausblenden') === '1' }) },
  tag: {
    nav: 'reise',
    seite: (t) => (t[1] === 'bearbeiten'
      ? seiteTagBearbeiten(state.reise, r(), state.eigene, t[0])
      : seiteTag(r(), state.eigene, jetzt(), t[0])),
  },
  unterkuenfte: { nav: 'reise', seite: () => seiteUnterkuenfte(r(), state.eigene) },
  unterkunft: { nav: 'reise', seite: (t) => seiteUnterkunft(r(), state.eigene, t[0], t[1] === 'bearbeiten') },
  fluege: { nav: 'reise', seite: () => seiteFluege(r(), state.eigene, jetzt()) },
  flug: { nav: 'reise', seite: (t) => seiteFlug(r(), state.eigene, jetzt(), t[0], t[1]) },
  geld: { nav: 'geld', seite: (t) => seiteAusgaben(r(), state.eigene, jetzt(), t, state.ausgabenUi) },
  tagebuch: { nav: 'mehr', seite: (t) => seiteTagebuch(r(), state.eigene, jetzt(), t) },
  mehr: { nav: 'mehr', seite: () => seiteMehr(r(), state.eigene) },
  packliste: { nav: 'mehr', seite: (t) => seitePackliste(state.eigene, t), ohneDaten: true },
  buchungen: { nav: 'mehr', seite: () => seiteBuchungen(r()) },
  tipps: { nav: 'mehr', seite: (t) => seiteTipps(r(), t) },
  karte: { nav: 'mehr', seite: () => seiteKarte(r(), jetzt(), state.karteUi) },
  thai: { nav: 'mehr', seite: (t) => seiteThai({ hoeflich: einstellung('hoeflich'), allergie: Number(einstellung('allergie')) || 0 }, t), ohneDaten: true },
  notfall: { nav: 'mehr', seite: () => seiteNotfall(r(), jetzt()) },
  ideen: { nav: 'mehr', seite: (t) => seiteIdeen(r(), state.eigene, t) },
  daten: {
    nav: 'mehr',
    ohneDaten: true,
    seite: () => seiteDaten({
      meta: state.meta,
      zusammenfassung: state.reise ? zusammenfassung(state.reise) : null,
      vorschau: state.vorschau,
      kannTeilen: kannTeilen(),
      thema: einstellung('thema') || 'light',
      testdatum: testdatum(),
      offlineBereit: state.offlineBereit,
      persistent: state.persistent,
      version: VERSION,
      kannInstallieren: !!state.installPrompt,
      installiert: istInstalliert(),
      fotoAnzahl: state.fotoAnzahl,
      letztesBackup: einstellung('backupAm'),
    }),
  },
};

// ---------- Darstellung ----------

function wendeThemaAn() {
  const t = einstellung('thema');
  // Standard ist hell; dunkel nur, wenn du es einstellst
  if (t === 'dark' || t === 'auto') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  requestAnimationFrame(() => {
    const farbe = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', farbe || '#ffffff');
  });
}

function toast(text, aktion) {
  toastEl.innerHTML = `<span>${e(text)}</span>${aktion ? `<button class="toast__knopf">${e(aktion.text)}</button>` : ''}`;
  toastEl.hidden = false;
  if (aktion) toastEl.querySelector('button').onclick = aktion.fn;
  clearTimeout(toast.timer);
  if (!aktion) toast.timer = setTimeout(() => { toastEl.hidden = true; }, 3000);
}

function banner() {
  const teile = [];
  if (state.dbFehler) {
    teile.push('<div class="banner banner--fehler">Der Speicher auf diesem Gerät ist nicht verfügbar. Änderungen gehen beim Schließen verloren.</div>');
  }
  if (testdatum()) {
    teile.push(`<a class="banner banner--test" href="#daten">🧪 Testdatum ${e(testdatum())} aktiv – antippen zum Ändern</a>`);
  }
  if (state.route !== 'heute') return teile.join('');
  if (state.meta?.quelle !== 'import') {
    teile.push('<a class="banner" href="#daten">Du siehst Demo-Daten. <b>Eigene Reisedaten importieren ›</b></a>');
  } else if (backupFaellig()) {
    teile.push('<a class="banner" href="#daten">💾 Letztes Backup ist über eine Woche her. <b>Jetzt sichern ›</b></a>');
  }
  if (state.installPrompt && einstellung('installHinweisWeg') !== '1') {
    teile.push('<div class="banner banner--install"><span>📲 Als App installieren – eigenes Symbol, Vollbild, offline.</span><span class="feldreihe"><button class="knopf knopf--klein knopf--haupt" data-aktion="installieren">Installieren</button><button class="knopf knopf--klein" data-aktion="install-weg">Später</button></span></div>');
  }
  return teile.join('');
}

let letzterSchluessel = '';
function render() {
  const route = ROUTEN[state.route] ?? ROUTEN.heute;
  for (const a of document.querySelectorAll('[data-nav]')) {
    const aktiv = a.dataset.nav === route.nav;
    a.classList.toggle('aktiv', aktiv);
    if (aktiv) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }

  let seite;
  if (!state.reise && !route.ohneDaten) {
    seite = { titel: 'Thailand', html: '<p class="leer">Keine Daten vorhanden. Bitte unter <a href="#daten">Daten & Backup</a> deine reise-daten.json importieren.</p>' };
  } else {
    try {
      seite = route.seite(state.teile);
    } catch (fehler) {
      console.error(fehler);
      seite = { titel: 'Fehler', zurueck: '#heute', html: '<p class="leer">Diese Seite konnte nicht angezeigt werden.</p>' };
    }
  }

  kopfTitel.textContent = seite.titel ?? '';
  kopfZurueck.hidden = !seite.zurueck;
  kopfZurueck.dataset.ziel = seite.zurueck ?? '';
  document.title = seite.titel ? `${seite.titel} · Thailand` : 'Thailand';
  inhalt.innerHTML = banner() + seite.html;

  if (state.route === 'heute') aktualisiereTicker(inhalt, jetzt());
  if (state.route === 'geld') aktualisiereUmrechnung(inhalt, state.reise, state.eigene);
  if (inhalt.querySelector('img[data-foto]')) ladeFotos(inhalt);
  letzterSchluessel = schluessel();
}

/** Ändert sich etwas Sichtbares auf „Heute“ (Minute)? Dann neu zeichnen. */
function schluessel() {
  return `${state.route}|${jetzt().toISOString().slice(0, 16)}`;
}

// ---------- Navigation mit Zurück & Scroll-Position ----------

const verlauf = [];
const scrollPos = new Map();
let aktuellerHash = '';
let naechsterErsetzt = false;

function zeigeAnsicht() {
  const hash = location.hash || '#heute';
  if (aktuellerHash) scrollPos.set(aktuellerHash, window.scrollY);

  const zurueckGegangen = !naechsterErsetzt && verlauf.length >= 2 && verlauf[verlauf.length - 2] === hash;
  if (naechsterErsetzt && verlauf.length) verlauf[verlauf.length - 1] = hash;
  else if (zurueckGegangen) verlauf.pop();
  else verlauf.push(hash);
  naechsterErsetzt = false;
  aktuellerHash = hash;

  let [name, ...teile] = hash.slice(1).split('/').map(decodeURIComponent);
  // alte Adressen weiterleiten
  if (name === 'plan') name = 'reise';
  if (name === 'ausgaben') name = 'geld';
  if (name === 'fristen') { name = 'aufgaben'; teile = []; }
  if (name === 'checkliste') { name = 'aufgaben'; teile = teile.length ? ['gruppe', ...teile] : []; }
  state.route = name in ROUTEN ? name : 'heute';
  state.teile = teile.filter(Boolean);
  if (state.route !== 'daten') state.vorschau = null;

  render();
  window.scrollTo(0, zurueckGegangen ? (scrollPos.get(hash) ?? 0) : 0);
  if (!zurueckGegangen) {
    inhalt.classList.remove('einblenden');
    void inhalt.offsetWidth;
    inhalt.classList.add('einblenden');
  }
  if (state.route === 'reise' && !zurueckGegangen) inhalt.querySelector('[data-heute]')?.scrollIntoView({ block: 'center' });
  if (state.route === 'geld' && state.teile[0] === 'neu') inhalt.querySelector('#ausgabe-betrag')?.focus();
}

/** Eine Ebene zurück – wie die Zurück-Taste, sonst direkt zur übergeordneten Seite. */
function zurueck(ziel) {
  if (verlauf.length >= 2) history.back();
  else ersetzeHash(ziel || '#heute');
}

function ersetzeHash(ziel) {
  naechsterErsetzt = true;
  location.replace(ziel);
}

kopfZurueck.addEventListener('click', () => zurueck(kopfZurueck.dataset.ziel));

// ---------- Eigene Einträge speichern ----------

let speicherWarnungGezeigt = false;
async function speichereEigene() {
  try {
    await db.schreibe('eigene', state.eigene);
  } catch {
    state.dbFehler = true;
    if (!speicherWarnungGezeigt) toast('Speichern hat nicht geklappt – bitte Backup machen.');
    speicherWarnungGezeigt = true;
  }
}

function vibriere() {
  try { navigator.vibrate?.(12); } catch { /* egal */ }
}

// ---------- Wechselkurs automatisch holen ----------

const KURS_DIENSTE = [
  'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=THB',
  'https://open.er-api.com/v6/latest/EUR',
];

let kursLaeuft = null;
async function holeKurs(erzwingen = false) {
  if (state.eigene?.einstellungen?.kursModus === 'manuell' && !erzwingen) return false;
  if (!erzwingen && !kursVeraltet(state.eigene)) return false;
  if (!navigator.onLine) return false;
  if (kursLaeuft) return kursLaeuft;
  kursLaeuft = (async () => {
    for (const url of KURS_DIENSTE) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const antwort = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
        clearTimeout(timer);
        if (!antwort.ok) continue;
        const kurs = kursAusAntwort(await antwort.json());
        if (!kurs) continue;
        state.eigene.kursCache = { ...kurs, geholt: new Date().toISOString(), quelle: new URL(url).host };
        await speichereEigene();
        return true;
      } catch { /* nächster Dienst */ }
    }
    return false;
  })();
  try {
    return await kursLaeuft;
  } finally {
    kursLaeuft = null;
  }
}

function speichereDatei(datei) {
  const url = URL.createObjectURL(datei);
  const a = document.createElement('a');
  a.href = url;
  a.download = datei.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  toast(`Gespeichert als ${datei.name} (Ordner „Downloads“)`);
}

const ctx = {
  state, render, jetzt, holeKurs, vibriere, speichereDatei, speichereEigene, zurueck,
  toast: (t) => toast(t),
  dauerhaftAnfragen: () => dauerhaftAnfragen(),
  daten: () => r(),
};

// ---------- Backup-Erinnerung & Installation ----------

function backupFaellig() {
  const e2 = state.eigene ?? {};
  const hatEintraege = (e2.ausgaben?.length ?? 0) + Object.keys(e2.checkliste ?? {}).length
    + (e2.packliste?.length ?? 0) + Object.keys(e2.tagebuch ?? {}).length > 0;
  if (!hatEintraege || state.meta?.quelle !== 'import') return false;
  const zuletzt = Date.parse(einstellung('backupAm') ?? '');
  if (!Number.isFinite(zuletzt)) {
    const importiert = Date.parse(state.meta?.importiertAm ?? '');
    return Number.isFinite(importiert) && Date.now() - importiert > 7 * 86400000;
  }
  return Date.now() - zuletzt > 7 * 86400000;
}

function istInstalliert() {
  return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
}

window.addEventListener('beforeinstallprompt', (ev) => {
  ev.preventDefault();
  state.installPrompt = ev;
  if (state.route === 'heute' || state.route === 'daten') render();
});

window.addEventListener('appinstalled', () => {
  state.installPrompt = null;
  toast('App installiert ✓ – du findest sie auf dem Startbildschirm.');
  render();
});

async function installieren() {
  const p = state.installPrompt;
  if (!p) return;
  p.prompt();
  try { await p.userChoice; } catch { /* egal */ }
  state.installPrompt = null;
  render();
}

// ---------- Daten laden ----------

async function ladeDemo() {
  const antwort = await fetch('./demo-daten.json');
  if (!antwort.ok) throw new Error('Demo-Daten nicht gefunden');
  return antwort.json();
}

async function zaehleFotos() {
  try { state.fotoAnzahl = (await db.alleFotos()).length; } catch { state.fotoAnzahl = 0; }
}

async function ladeDaten() {
  try {
    state.reise = (await db.lies('reise')) ?? null;
    state.meta = (await db.lies('meta')) ?? null;
    state.eigene = (await db.lies('eigene')) ?? {};
  } catch {
    state.dbFehler = true;
  }
  if (state.reise && !state.meta) state.meta = { quelle: 'import' };
  if (!state.reise) {
    try {
      state.reise = await ladeDemo();
      state.meta = { quelle: 'demo' };
    } catch {
      state.reise = null;
    }
  }
  zaehleFotos();
}

// ---------- Import ----------

async function dateiGewaehlt(datei) {
  if (!datei) return;
  let obj;
  try {
    obj = JSON.parse(await datei.text());
  } catch {
    state.vorschau = { dateiname: datei.name, fehler: ['Die Datei ist keine gültige JSON-Datei.'] };
    render();
    return;
  }
  const istObjekt = obj && typeof obj === 'object' && !Array.isArray(obj);
  const { reise, eigene, fotos } = trenneImport(istObjekt ? obj : {});
  const pruefung = pruefeReiseDaten(istObjekt ? reise : obj);
  state.vorschau = pruefung.ok
    ? { dateiname: datei.name, obj, warnungen: pruefung.warnungen, zusammenfassung: zusammenfassung(reise), mitEigenen: !!eigene, fotoAnzahl: Object.keys(fotos ?? {}).length }
    : { dateiname: datei.name, fehler: pruefung.fehler };
  render();
}

async function importUebernehmen() {
  const v = state.vorschau;
  if (!v?.obj) return;
  const { reise, eigene, fotos } = trenneImport(v.obj);
  const meta = { quelle: 'import', dateiname: v.dateiname, importiertAm: new Date().toISOString() };
  try {
    await db.schreibe('reise', reise);
    await db.schreibe('meta', meta);
    if (eigene) await db.schreibe('eigene', eigene);
  } catch {
    state.dbFehler = true;
    toast('Konnte nicht dauerhaft speichern – Daten gelten nur bis zum Schließen.');
  }
  state.reise = reise;
  state.meta = meta;
  if (eigene) state.eigene = eigene;
  state.vorschau = null;
  if (fotos && Object.keys(fotos).length) {
    toast('Fotos werden wiederhergestellt …');
    const n = await fotosAusBackup(fotos);
    await zaehleFotos();
    toast(`Importiert ✓ – ${n} Fotos wiederhergestellt`);
  } else {
    toast('Reisedaten importiert ✓');
  }
  await dauerhaftAnfragen();
  location.hash = '#heute';
}

async function demoZurueck() {
  const ok = confirm('Wirklich alles löschen? Deine Reisedaten, Einträge und Fotos werden von diesem Handy entfernt.\n\nTipp: Vorher ein Backup speichern!');
  if (!ok) return;
  try {
    await db.loesche('reise');
    await db.loesche('meta');
    await db.loesche('eigene');
    await db.fotosLeeren();
  } catch { /* egal */ }
  state.eigene = {};
  state.fotoAnzahl = 0;
  try {
    state.reise = await ladeDemo();
    state.meta = { quelle: 'demo' };
  } catch {
    state.reise = null;
    state.meta = null;
  }
  toast('Demo-Daten werden angezeigt');
  render();
}

// ---------- Export ----------

async function backupDatei(mitFotos, typ = 'application/json') {
  const fotos = mitFotos ? await fotosFuerBackup() : null;
  const json = JSON.stringify(baueExport(state.reise, state.eigene, new Date(), fotos), null, mitFotos ? 0 : 2);
  return new File([json], backupDateiname(), { type: typ });
}

function teilbar() {
  if (!navigator.canShare) return null;
  for (const typ of ['application/json', 'text/plain']) {
    try {
      if (navigator.canShare({ files: [new File(['{}'], 'test.json', { type: typ })] })) return typ;
    } catch { /* nächster Typ */ }
  }
  return null;
}

function kannTeilen() {
  return !!state.reise && !!teilbar();
}

async function exportDownload(mitFotos) {
  if (!state.reise) return;
  if (mitFotos && state.fotoAnzahl) toast('Backup wird erstellt …');
  speichereDatei(await backupDatei(mitFotos));
  setzeEinstellung('backupAm', new Date().toISOString());
}

async function exportTeilen() {
  const typ = teilbar();
  if (!typ) return exportDownload(true);
  try {
    await navigator.share({ files: [await backupDatei(true, typ)], title: 'Thailand-Backup' });
    setzeEinstellung('backupAm', new Date().toISOString());
  } catch (err) {
    if (err?.name !== 'AbortError') toast('Teilen hat nicht geklappt – nutze „Backup speichern“.');
  }
}

// ---------- Offline & Speicher ----------

async function dauerhaftAnfragen() {
  try {
    if (navigator.storage?.persist) state.persistent = await navigator.storage.persist();
  } catch { /* egal */ }
}

async function offlineEinrichten() {
  if (!('serviceWorker' in navigator)) return;
  const hatteController = !!navigator.serviceWorker.controller;
  state.offlineBereit = hatteController;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    state.offlineBereit = true;
    if (hatteController) toast('Neue Version ist da.', { text: 'Neu laden', fn: () => location.reload() });
  });
  try {
    const reg = await navigator.serviceWorker.register('./sw.js');
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  } catch { /* z. B. im privaten Modus */ }
}

function onlineStatus() {
  document.getElementById('kopf-status').hidden = navigator.onLine;
}

// ---------- Ereignisse ----------

const APP_AKTIONEN = {
  'import-ok': importUebernehmen,
  'import-abbrechen': () => { state.vorschau = null; render(); },
  'export-download': (el) => exportDownload(el.dataset.fotos !== '0'),
  'export-teilen': exportTeilen,
  'demo-zurueck': demoZurueck,
  'testdatum-weg': () => { setzeEinstellung('testdatum', null); render(); },
  installieren,
  'install-weg': () => { setzeEinstellung('installHinweisWeg', '1'); render(); },
  'karte-ort': (el) => {
    state.karteUi.ort = state.karteUi.ort === el.dataset.ort ? null : el.dataset.ort;
    render();
    if (state.karteUi.ort) inhalt.querySelector('.ortdetail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },
  'thai-zeigen': (el) => {
    vibriere();
    zeigeVollbild(el.dataset.de, el.dataset.thai, el.dataset.laut);
  },
};
const MODUL_AKTIONEN = [listenAktionen, ausgabenAktionen, ideenAktionen, tagebuchAktionen, detailAktionen, aufgabenAktionen];

inhalt.addEventListener('click', (ev) => {
  const ersetzen = ev.target.closest('a[data-ersetzen]');
  if (ersetzen) {
    ev.preventDefault();
    ersetzeHash(ersetzen.getAttribute('href'));
    return;
  }
  const el = ev.target.closest('[data-aktion]');
  if (!el) return;
  const aktion = el.dataset.aktion;
  // Löschen-Knöpfe in Zeilen mit Häkchen sollen das Häkchen nicht umschalten
  if (el.closest('label') && el.tagName !== 'LABEL') ev.preventDefault();
  APP_AKTIONEN[aktion]?.(el, ev);
  for (const m of MODUL_AKTIONEN) m[aktion]?.(el, ctx, ev);
});

inhalt.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter') return;
  if (ev.target.matches?.('g[data-aktion]')) ev.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  if (ev.target.id === 'ausgabe-betrag' || ev.target.id === 'ausgabe-notiz') {
    ev.preventDefault();
    ausgabenAktionen['ausgabe-speichern'](null, ctx);
  }
});

inhalt.addEventListener('input', (ev) => {
  if (tagebuchEingabe(ev.target, ctx)) return;
  ausgabenEingabe(ev.target, ctx);
});

inhalt.addEventListener('change', async (ev) => {
  const t = ev.target;
  if (aufgabenAenderung(t, ctx)) return;
  if (listenAenderung(t, ctx)) return;
  if (await detailAenderung(t, ctx)) {
    zaehleFotos();
    return;
  }
  if (state.route === 'geld' && ausgabenAenderung(t, ctx)) return;
  if (state.route === 'tagebuch' && await tagebuchAenderung(t, ctx)) {
    zaehleFotos();
    return;
  }
  if (t.dataset.einstellung === 'ausblenden') {
    setzeEinstellung('ausblenden', t.checked ? '1' : null);
    render();
  } else if (t.name === 'hoeflich') {
    setzeEinstellung('hoeflich', t.value);
    render();
  } else if (t.id === 'allergie') {
    setzeEinstellung('allergie', t.value);
    render();
  } else if (t.id === 'import-datei') {
    dateiGewaehlt(t.files?.[0]);
  } else if (t.name === 'thema') {
    setzeEinstellung('thema', t.value === 'light' ? null : t.value);
    wendeThemaAn();
  } else if (t.id === 'testdatum') {
    setzeEinstellung('testdatum', t.value || null);
    render();
  }
});

window.addEventListener('hashchange', zeigeAnsicht);
window.addEventListener('online', () => {
  onlineStatus();
  holeKurs().then((neu) => { if (neu && state.route === 'geld') render(); });
});
window.addEventListener('offline', onlineStatus);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (state.route === 'heute') render();
  holeKurs();
});

setInterval(() => {
  if (state.route !== 'heute' || document.hidden) return;
  if (schluessel() !== letzterSchluessel) render();
  else aktualisiereTicker(inhalt, jetzt());
}, 1000);

// ---------- Los geht's ----------

(async function start() {
  wendeThemaAn();
  onlineStatus();
  offlineEinrichten();
  await ladeDaten();
  try { state.persistent = (await navigator.storage?.persisted?.()) ?? false; } catch { /* egal */ }
  zeigeAnsicht();
  holeKurs().then((neu) => { if (neu && state.route === 'geld') render(); });
})();
