// Rechenlogik für Ausgaben, Wechselkurs und Budget (ohne Anzeige, gut testbar).
import { planWerte, optionen } from './budgetlogik.js';

export const STANDARD_KURS = 37.9;
export const STANDARD_BUDGET_EUR = 52;

export const STANDARD_KATEGORIEN = [
  'Essen & Trinken', 'Transport', 'Ausflüge', 'Unterkunft vor Ort',
  'SIM/Wäsche/Drogerie', 'Geldautomat', 'Geschenke', 'Sonstiges',
];

const ICONS = [
  [/essen|trinken|food/i, '🍜'],
  [/transport|taxi|grab|fähre|bus/i, '🛺'],
  [/ausfl|tour|tauch/i, '🏝️'],
  [/unterkunft|hotel/i, '🛏️'],
  [/sim|wäsche|drogerie/i, '🧴'],
  [/automat|atm|gebühr/i, '🏧'],
  [/geschenk|souvenir/i, '🎁'],
];

export function kategorieIcon(name) {
  return ICONS.find(([re]) => re.test(name ?? ''))?.[1] ?? '💸';
}

export function kategorien(daten) {
  const k = daten?.budget?.kategorien;
  return Array.isArray(k) && k.length ? k.filter((x) => typeof x === 'string' && x) : STANDARD_KATEGORIEN;
}

function gueltigeZahl(x, min, max) {
  const n = Number(x);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/** Tagesbudget in Euro: eigene Einstellung → gewählte Option der Budgetplanung → „52 €/Tag“ aus den Reisedaten → 52. */
export function tagesbudgetEur(daten, eigene) {
  const eigenes = gueltigeZahl(eigene?.einstellungen?.tagesbudget, 1, 10000);
  if (eigenes) return eigenes;
  const plan = planWerte(daten, eigene);
  const opt = plan.gewaehlt ? optionen(plan, 1).find((o) => o.nr === plan.gewaehlt) : null;
  if (opt && opt.proTag > 0) return opt.proTag;
  const m = String(daten?.budget?.tagesbudgetPlan ?? '').match(/(\d+(?:[.,]\d+)?)\s*€\s*\/\s*Tag/);
  return m ? Number(m[1].replace(',', '.')) : STANDARD_BUDGET_EUR;
}

/** Aktueller Kurs (Baht pro Euro) samt Herkunft. */
export function aktuellerKurs(daten, eigene) {
  const e = eigene?.einstellungen ?? {};
  const manuell = gueltigeZahl(e.kursManuell, 1, 1000);
  if (e.kursModus === 'manuell' && manuell) return { wert: manuell, quelle: 'manuell' };
  const cache = eigene?.kursCache;
  const auto = gueltigeZahl(cache?.wert, 1, 1000);
  if (auto) return { wert: auto, quelle: 'auto', stand: cache.stand ?? null, geholt: cache.geholt ?? null };
  const aus = gueltigeZahl(daten?.budget?.wechselkursTHBproEUR, 1, 1000);
  return { wert: aus ?? STANDARD_KURS, quelle: 'standard' };
}

/** Kurs aus der Antwort eines Kurs-Dienstes lesen (Frankfurter oder open.er-api). */
export function kursAusAntwort(json) {
  const thb = gueltigeZahl(json?.rates?.THB, 10, 100);
  if (!thb) return null;
  let stand = typeof json.date === 'string' ? json.date : null;
  if (!stand && typeof json.time_last_update_utc === 'string') {
    const d = new Date(json.time_last_update_utc);
    if (!Number.isNaN(d.getTime())) stand = d.toISOString().slice(0, 10);
  }
  return { wert: Math.round(thb * 1000) / 1000, stand };
}

/** Muss der automatische Kurs neu geholt werden? (älter als 12 Stunden) */
export function kursVeraltet(eigene, jetzt = new Date()) {
  const geholt = Date.parse(eigene?.kursCache?.geholt ?? '');
  return !Number.isFinite(geholt) || jetzt.getTime() - geholt > 12 * 3600 * 1000;
}

/** „1.200“, „1200,50“, „1 200“, „45.5“ → Zahl (oder null). */
export function parseBetrag(text) {
  let s = String(text ?? '').trim().replace(/[\s฿€]/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n < 10_000_000 ? Math.round(n * 100) / 100 : null;
}

export function inEur(a) {
  return a.waehrung === 'EUR' ? a.betrag : a.betrag / (a.kurs || STANDARD_KURS);
}

export function inThb(a) {
  return a.waehrung === 'EUR' ? a.betrag * (a.kurs || STANDARD_KURS) : a.betrag;
}

export function gueltigeAusgaben(eigene) {
  return (Array.isArray(eigene?.ausgaben) ? eigene.ausgaben : [])
    .filter((a) => a && a.id && /^\d{4}-\d{2}-\d{2}$/.test(a.d) && Number(a.betrag) > 0);
}

/** Summen (in Euro) gruppiert nach einem Schlüssel, absteigend sortiert. */
export function summenNach(ausgaben, schluessel) {
  const m = new Map();
  for (const a of ausgaben) {
    const k = schluessel(a);
    const s = m.get(k) ?? { key: k, eur: 0, thb: 0, anzahl: 0 };
    s.eur += inEur(a);
    s.thb += inThb(a);
    s.anzahl += 1;
    m.set(k, s);
  }
  return [...m.values()].sort((x, y) => y.eur - x.eur);
}

/** Ampel für einen Tag: grün ≤ 80 %, orange ≤ 100 %, rot darüber. */
export function budgetStatus(eur, budgetEur) {
  if (!budgetEur) return 'gruen';
  const anteil = eur / budgetEur;
  if (anteil <= 0.8) return 'gruen';
  if (anteil <= 1) return 'orange';
  return 'rot';
}

export const STATUS_TEXT = {
  gruen: { icon: '✅', text: 'im Budget' },
  orange: { icon: '⚠️', text: 'fast ausgeschöpft' },
  rot: { icon: '⛔', text: 'über Budget' },
};

/**
 * Überblick über die ganze Reise bis zum Datum „bis“.
 * reiseTage: Liste der Daten (JJJJ-MM-TT), die fürs Budget zählen.
 */
export function ueberblick(ausgaben, reiseTage, budgetEur, bis) {
  const gesamtEur = ausgaben.reduce((s, a) => s + inEur(a), 0);
  const gesamtThb = ausgaben.reduce((s, a) => s + inThb(a), 0);
  const bisher = reiseTage.filter((d) => d <= bis).length;
  const tageMitAusgaben = new Set(ausgaben.map((a) => a.d)).size;
  const tage = Math.max(bisher, tageMitAusgaben, 1);
  const durchschnitt = gesamtEur / tage;
  return {
    gesamtEur,
    gesamtThb,
    tage,
    durchschnitt,
    status: budgetStatus(durchschnitt, budgetEur),
    budgetGesamt: budgetEur * reiseTage.length,
    restGesamt: budgetEur * reiseTage.length - gesamtEur,
  };
}

/** CSV für Excel/Google Tabellen (Semikolon, deutsches Komma). */
export function ausgabenCsv(ausgaben, ortName = (p) => p) {
  const zahl = (n) => n.toFixed(2).replace('.', ',');
  const feld = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const zeilen = [['Datum', 'Ort', 'Kategorie', 'Notiz', 'Betrag', 'Währung', 'Kurs', 'Baht', 'Euro'].join(';')];
  for (const a of [...ausgaben].sort((x, y) => (x.d + (x.zeit ?? '')).localeCompare(y.d + (y.zeit ?? '')))) {
    zeilen.push([a.d, feld(ortName(a.p)), feld(a.kat), feld(a.notiz), zahl(a.betrag), a.waehrung ?? 'THB', zahl(a.kurs ?? STANDARD_KURS), zahl(inThb(a)), zahl(inEur(a))].join(';'));
  }
  return `﻿${zeilen.join('\r\n')}\r\n`;
}

export const formatThb = (n) => `${Math.round(n).toLocaleString('de-DE')} ฿`;
export const formatEur = (n) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
export const formatKurs = (n) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
