// Alles rund um Datum, Uhrzeit und Zeitzonen.
// Deutschland: Europe/Berlin (Sommer-/Winterzeit automatisch), Thailand: Asia/Bangkok (immer UTC+7).

export const TZ_DE = 'Europe/Berlin';
export const TZ_TH = 'Asia/Bangkok';

const formate = new Map();
function format(tz, opts) {
  const key = tz + JSON.stringify(opts);
  if (!formate.has(key)) formate.set(key, new Intl.DateTimeFormat('de-DE', { timeZone: tz, ...opts }));
  return formate.get(key);
}

/** Zerlegt einen Zeitpunkt in Jahr/Monat/Tag/Stunde/Minute einer Zeitzone. */
export function teile(date, tz) {
  const p = {};
  const f = format(tz, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  for (const { type, value } of f.formatToParts(date)) p[type] = value;
  return p;
}

/** Kalenderdatum 'JJJJ-MM-TT' in der Zeitzone. */
export function datumIn(date, tz) {
  const p = teile(date, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Uhrzeit 'HH:MM' in der Zeitzone. */
export function uhrzeitIn(date, tz) {
  const p = teile(date, tz);
  return `${p.hour}:${p.minute}`;
}

/** Abstand der Zeitzone zu UTC in Stunden (z. B. 1, 2 oder 7). */
export function versatzStunden(date, tz) {
  const p = teile(date, tz);
  const alsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((alsUtc - Math.floor(date.getTime() / 1000) * 1000) / 3600000);
}

function isoZuUtc(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Anzahl Kalendertage von 'von' bis 'bis' (beides 'JJJJ-MM-TT'). */
export function tageDiff(von, bis) {
  return Math.round((isoZuUtc(bis) - isoZuUtc(von)) / 86400000);
}

export function plusTage(iso, n) {
  return new Date(isoZuUtc(iso) + n * 86400000).toISOString().slice(0, 10);
}

/** Liest einen Zeitpunkt wie '2026-11-17T18:45:00.000Z' oder '2026-10-16T23:59+02:00'. */
export function parseZeit(s) {
  if (typeof s !== 'string' || !s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 'JJJJ-MM-TT' → „Sa., 21.11.“ bzw. lang „Samstag, 21. November 2026“. */
export function formatTag(iso, lang = false) {
  const opts = lang
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    : { weekday: 'short', day: '2-digit', month: '2-digit' };
  return format('UTC', opts).format(new Date(isoZuUtc(iso)));
}

/** „Fr., 16.10., 23:59“ in der Zeitzone. */
export function formatKurz(date, tz) {
  return format(tz, { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
}

/** „Dienstag, 17.11.2026, 19:45“ in der Zeitzone. */
export function formatLang(date, tz) {
  return format(tz, { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
}

export function countdown(ziel, jetzt) {
  const ms = ziel.getTime() - jetzt.getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    vorbei: ms <= 0,
    tage: Math.floor(s / 86400),
    stunden: Math.floor((s % 86400) / 3600),
    minuten: Math.floor((s % 3600) / 60),
    sekunden: s % 60,
  };
}

/** „noch 12 Tage“, „morgen“, „heute, noch 5 Std.“ – Kalendertage in der Zeitzone tz. */
export function restText(ziel, jetzt, tz = TZ_DE) {
  const ms = ziel.getTime() - jetzt.getTime();
  if (ms <= 0) return 'vorbei';
  const tage = tageDiff(datumIn(jetzt, tz), datumIn(ziel, tz));
  if (tage <= 0) {
    const min = Math.ceil(ms / 60000);
    return min < 60 ? `heute, noch ${min} Min.` : `heute, noch ${Math.floor(min / 60)} Std.`;
  }
  if (tage === 1) return 'morgen';
  return `noch ${tage} Tage`;
}

/** Kommende Fristen (Zeitpunkt in der Zukunft), sortiert. Ungültige werden übersprungen. */
export function naechsteFristen(fristen, jetzt) {
  return (Array.isArray(fristen) ? fristen : [])
    .map((f) => ({ ...f, zeit: parseZeit(f?.t) }))
    .filter((f) => f.zeit && f.zeit > jetzt)
    .sort((a, b) => a.zeit - b.zeit);
}

/**
 * Wo stehe ich in der Reise?
 * - Vor dem Abflug zählt das deutsche Datum, zwischen Abflug und Heimkehr das thailändische,
 *   danach wieder das deutsche.
 * - „Tag X von N“ zählt die Tage in Thailand (zwischen Abflug- und Heimkehrtag),
 *   der Abflugtag heißt „Abreisetag“, der Heimkehrtag „Heimreisetag“.
 */
export function reisePhase(daten, jetzt) {
  const tage = [...(daten?.tage ?? [])].filter((t) => t && t.d).sort((a, b) => (a.d < b.d ? -1 : 1));
  const abflug = parseZeit(daten?.reise?.abflug);
  const heimkehr = parseZeit(daten?.reise?.heimkehr);

  let tz = TZ_DE;
  if (abflug && jetzt >= abflug && (!heimkehr || jetzt < heimkehr)) tz = TZ_TH;
  const datum = datumIn(jetzt, tz);

  const basis = { datum, tz, abflug, heimkehr, tage };
  if (!tage.length) return { ...basis, phase: 'vorher' };
  const erster = tage[0].d;
  const letzter = tage[tage.length - 1].d;
  if (datum < erster) return { ...basis, phase: 'vorher', tageBisStart: tageDiff(datum, erster) };
  if (datum > letzter) return { ...basis, phase: 'nachher' };

  const tag = tage.find((t) => t.d === datum) ?? null;
  const { label, gesamt } = tagLabel(basis, datum);
  return { ...basis, phase: 'unterwegs', tag, label, gesamt };
}

/** „Abreisetag“, „Tag 4 von 22“ oder „Heimreisetag“ für ein Datum der Reise. */
export function tagLabel({ tage, abflug, heimkehr }, datum) {
  const abflugTag = abflug ? datumIn(abflug, TZ_DE) : tage[0].d;
  const heimTag = heimkehr ? datumIn(heimkehr, TZ_DE) : tage[tage.length - 1].d;
  let innere = tage.filter((t) => t.d > abflugTag && t.d < heimTag);
  if (!innere.length) innere = tage;

  if (datum <= abflugTag && innere !== tage) return { label: 'Abreisetag', gesamt: innere.length };
  if (datum >= heimTag && innere !== tage) return { label: 'Heimreisetag', gesamt: innere.length };
  const nr = innere.findIndex((t) => t.d === datum) + 1 || tageDiff(innere[0].d, datum) + 1;
  return { label: `Tag ${nr} von ${innere.length}`, gesamt: innere.length };
}

/** Die Tage in Thailand (ohne Abreise- und Heimreisetag) als 'JJJJ-MM-TT'. */
export function thailandTage(daten) {
  const tage = [...(daten?.tage ?? [])].filter((t) => t && t.d).map((t) => t.d).sort();
  if (!tage.length) return [];
  const abflug = parseZeit(daten?.reise?.abflug);
  const heimkehr = parseZeit(daten?.reise?.heimkehr);
  const von = abflug ? datumIn(abflug, TZ_DE) : tage[0];
  const bis = heimkehr ? datumIn(heimkehr, TZ_DE) : tage[tage.length - 1];
  const innere = tage.filter((d) => d > von && d < bis);
  return innere.length ? innere : tage;
}

/** Farbe einer Frist nach Restzeit: rot ≤ 7 Tage, orange ≤ 21 Tage, sonst grün. */
export function fristStufe(zeit, jetzt, tz = TZ_DE) {
  if (zeit <= jetzt) return 'vorbei';
  const tage = tageDiff(datumIn(jetzt, tz), datumIn(zeit, tz));
  if (tage <= 7) return 'rot';
  if (tage <= 21) return 'orange';
  return 'gruen';
}

/** Ende eines Tages (23:59) in der Zeitzone – für Aufgaben „bis zum …“. */
export function zeitInZoneTag(iso, tz = TZ_DE) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const alsUtc = Date.UTC(y, m - 1, d, 23, 59);
  return new Date(alsUtc - versatzStunden(new Date(alsUtc), tz) * 3600000);
}
