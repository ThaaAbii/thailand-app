// Start der App: Daten laden, Seiten anzeigen, Offline-Modus einrichten.
import { VERSION } from './version.js';
import * as db from './db.js';
import { pruefeReiseDaten, zusammenfassung, trenneImport, baueExport, backupDateiname } from './daten.js';
import { renderHeute, aktualisiereTicker } from './heute.js';
import { renderDaten } from './datenansicht.js';
import { renderPlan } from './plan.js';
import { renderFristen } from './fristen.js';
import { renderCheckliste, renderPackliste, listenAktionen, listenAenderung } from './listen.js';
import { renderMehr, renderBuchungen, renderTipps } from './mehr.js';
import { e } from './ui.js';

// Seite → welcher Knopf unten leuchtet
const ANSICHTEN = {
  heute: 'heute',
  plan: 'plan',
  fristen: 'fristen',
  checkliste: 'listen',
  packliste: 'listen',
  mehr: 'mehr',
  buchungen: 'mehr',
  tipps: 'mehr',
  daten: 'mehr',
};
const inhalt = document.getElementById('inhalt');
const toastEl = document.getElementById('toast');

const state = {
  reise: null,
  meta: null,
  eigene: {},
  ansicht: 'heute',
  vorschau: null,
  packBearbeiten: null,
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

// ---------- Darstellung ----------

function wendeThemaAn() {
  const t = einstellung('thema');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  requestAnimationFrame(() => {
    const farbe = getComputedStyle(document.documentElement).getPropertyValue('--kopf').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', farbe || '#0b6e78');
  });
}

function toast(text, aktion) {
  toastEl.innerHTML = `<span>${e(text)}</span>${aktion ? `<button class="toast__knopf">${e(aktion.text)}</button>` : ''}`;
  toastEl.hidden = false;
  if (aktion) toastEl.querySelector('button').onclick = aktion.fn;
  clearTimeout(toast.timer);
  if (!aktion) toast.timer = setTimeout(() => { toastEl.hidden = true; }, 3500);
}

function banner() {
  const teile = [];
  if (state.dbFehler) {
    teile.push('<div class="banner banner--fehler">⚠️ Der Speicher auf diesem Gerät ist nicht verfügbar. Änderungen gehen beim Schließen verloren.</div>');
  }
  if (testdatum()) {
    teile.push(`<div class="banner banner--test">🧪 Testdatum aktiv: ${e(testdatum())} · <a href="#daten">ändern</a></div>`);
  }
  if (state.meta?.quelle !== 'import' && state.ansicht === 'heute') {
    teile.push('<div class="banner">Du siehst Demo-Daten. <a href="#daten">Eigene Reisedaten importieren →</a></div>');
  }
  return teile.join('');
}

let letzterSchluessel = '';
function render() {
  for (const a of document.querySelectorAll('[data-nav]')) {
    const aktiv = a.dataset.nav === ANSICHTEN[state.ansicht];
    a.classList.toggle('aktiv', aktiv);
    if (aktiv) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  document.getElementById('kopf-titel').textContent = state.reise?.reise?.titel || 'Thailand 2026';

  if (!state.reise) {
    inhalt.innerHTML = `${banner()}<section class="karte"><p>Keine Daten vorhanden. Bitte unter <a href="#daten">Daten</a> deine reise-daten.json importieren.</p></section>`;
    if (state.ansicht !== 'daten') return;
  }

  const r = state.reise;
  if (state.ansicht === 'heute' && r) {
    inhalt.innerHTML = banner() + renderHeute(r, jetzt(), state.eigene);
    aktualisiereTicker(inhalt, jetzt());
  } else if (state.ansicht === 'plan' && r) {
    inhalt.innerHTML = banner() + renderPlan(r, jetzt());
  } else if (state.ansicht === 'fristen' && r) {
    inhalt.innerHTML = banner() + renderFristen(r, jetzt());
  } else if (state.ansicht === 'checkliste' && r) {
    inhalt.innerHTML = banner() + renderCheckliste(r, state.eigene, { ausblenden: einstellung('ausblenden') === '1' });
  } else if (state.ansicht === 'packliste') {
    inhalt.innerHTML = banner() + renderPackliste(state.eigene, { bearbeiten: state.packBearbeiten });
  } else if (state.ansicht === 'mehr') {
    inhalt.innerHTML = banner() + renderMehr(r);
  } else if (state.ansicht === 'buchungen' && r) {
    inhalt.innerHTML = banner() + renderBuchungen(r);
  } else if (state.ansicht === 'tipps' && r) {
    inhalt.innerHTML = banner() + renderTipps(r);
  } else if (state.ansicht === 'daten') {
    inhalt.innerHTML = banner() + renderDaten({
      meta: state.meta,
      zusammenfassung: state.reise ? zusammenfassung(state.reise) : null,
      vorschau: state.vorschau,
      kannTeilen: kannTeilen(),
      thema: einstellung('thema') || 'system',
      testdatum: testdatum(),
      offlineBereit: state.offlineBereit,
      persistent: state.persistent,
      version: VERSION,
    });
  }
  letzterSchluessel = schluessel();
}

/** Ändert sich etwas Sichtbares auf „Heute“ (Datum, Minute)? Dann neu zeichnen. */
function schluessel() {
  const j = jetzt();
  return `${state.ansicht}|${j.toISOString().slice(0, 16)}`;
}

function zeigeAnsicht() {
  let ziel = location.hash.replace('#', '');
  if (ziel === 'listen') ziel = einstellung('listenTab') === 'packliste' ? 'packliste' : 'checkliste';
  if (ziel === 'checkliste' || ziel === 'packliste') setzeEinstellung('listenTab', ziel);
  state.ansicht = ziel in ANSICHTEN ? ziel : 'heute';
  state.packBearbeiten = null;
  render();
  window.scrollTo(0, 0);
  if (state.ansicht === 'plan') {
    inhalt.querySelector('[data-heute]')?.scrollIntoView({ block: 'center' });
  }
}

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

const ctx = { state, render, toast: (t) => toast(t), speichereEigene };

// ---------- Daten laden ----------

async function ladeDemo() {
  const antwort = await fetch('./demo-daten.json');
  if (!antwort.ok) throw new Error('Demo-Daten nicht gefunden');
  return antwort.json();
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
  const { reise, eigene } = trenneImport(obj ?? {});
  const pruefung = pruefeReiseDaten(obj && typeof obj === 'object' && !Array.isArray(obj) ? reise : obj);
  state.vorschau = pruefung.ok
    ? { dateiname: datei.name, obj, warnungen: pruefung.warnungen, zusammenfassung: zusammenfassung(reise), mitEigenen: !!eigene }
    : { dateiname: datei.name, fehler: pruefung.fehler };
  render();
}

async function importUebernehmen() {
  const v = state.vorschau;
  if (!v?.obj) return;
  const { reise, eigene } = trenneImport(v.obj);
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
  await dauerhaftAnfragen();
  toast('Reisedaten importiert ✓');
  location.hash = '#heute';
  zeigeAnsicht();
}

async function demoZurueck() {
  const ok = confirm('Wirklich alles löschen? Deine importierten Reisedaten und Einträge werden von diesem Handy entfernt.\n\nTipp: Vorher ein Backup speichern!');
  if (!ok) return;
  try {
    await db.loesche('reise');
    await db.loesche('meta');
    await db.loesche('eigene');
  } catch { /* egal */ }
  state.eigene = {};
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

function backupDatei(typ = 'application/json') {
  const json = JSON.stringify(baueExport(state.reise, state.eigene), null, 2);
  return new File([json], backupDateiname(), { type: typ });
}

function teilbareDatei() {
  if (!navigator.canShare) return null;
  for (const typ of ['application/json', 'text/plain']) {
    const f = backupDatei(typ);
    try { if (navigator.canShare({ files: [f] })) return f; } catch { /* nächster Typ */ }
  }
  return null;
}

function kannTeilen() {
  return !!state.reise && !!teilbareDatei();
}

function exportDownload() {
  if (!state.reise) return;
  const datei = backupDatei();
  const url = URL.createObjectURL(datei);
  const a = document.createElement('a');
  a.href = url;
  a.download = datei.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  toast(`Gespeichert als ${datei.name}`);
}

async function exportTeilen() {
  const datei = teilbareDatei();
  if (!datei) return exportDownload();
  try {
    await navigator.share({ files: [datei], title: 'Thailand-Backup' });
  } catch (err) {
    if (err?.name !== 'AbortError') toast('Teilen hat nicht geklappt – nutze „Herunterladen“.');
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
    if (hatteController) {
      toast('Neue Version ist da.', { text: 'Neu laden', fn: () => location.reload() });
    } else if (state.ansicht === 'daten') {
      render();
    }
  });
  try {
    const reg = await navigator.serviceWorker.register('./sw.js');
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  } catch { /* z. B. im privaten Modus */ }
}

function onlineStatus() {
  const el = document.getElementById('kopf-status');
  el.textContent = navigator.onLine ? '' : 'Offline';
  el.hidden = navigator.onLine;
}

// ---------- Ereignisse ----------

inhalt.addEventListener('click', (ev) => {
  const aktion = ev.target.closest('[data-aktion]')?.dataset.aktion;
  if (!aktion) return;
  ({
    'import-ok': importUebernehmen,
    'import-abbrechen': () => { state.vorschau = null; render(); },
    'export-download': exportDownload,
    'export-teilen': exportTeilen,
    'demo-zurueck': demoZurueck,
    'testdatum-weg': () => { setzeEinstellung('testdatum', null); render(); },
  })[aktion]?.();
  listenAktionen[aktion]?.(ev.target.closest('[data-aktion]'), ctx);
});

inhalt.addEventListener('change', (ev) => {
  const t = ev.target;
  if (listenAenderung(t, ctx)) return;
  if (t.dataset.einstellung === 'ausblenden') {
    setzeEinstellung('ausblenden', t.checked ? '1' : null);
    render();
  } else if (t.id === 'import-datei') dateiGewaehlt(t.files?.[0]);
  else if (t.name === 'thema') {
    setzeEinstellung('thema', t.value === 'system' ? null : t.value);
    wendeThemaAn();
  } else if (t.id === 'testdatum') {
    setzeEinstellung('testdatum', t.value || null);
    render();
  }
});

window.addEventListener('hashchange', zeigeAnsicht);
window.addEventListener('online', onlineStatus);
window.addEventListener('offline', onlineStatus);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.ansicht === 'heute') render();
});

setInterval(() => {
  if (state.ansicht !== 'heute' || document.hidden) return;
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
})();
