// Eigene Änderungen an den Reisedaten: Tage bearbeiten, Flüge, Unterkunfts-Details.
// Alles liegt in „eigene“ (also im Backup) – die importierten Reisedaten bleiben unverändert.
import { TZ_DE, TZ_TH, versatzStunden, parseZeit } from './zeit.js';

export const TAG_FELDER = [
  ['t', 'Titel', false],
  ['prog', 'Programm', true],
  ['tr', 'Transport', true],
  ['stay', 'Unterkunft', false],
  ['ci', 'Check-in / Check-out', true],
  ['note', 'Notiz', true],
];

export const UNTERKUNFT_FELDER = [
  ['adresse', 'Adresse', 'z. B. 123 Moo 2, Chaweng'],
  ['telefon', 'Telefon', 'z. B. +66 77 123 456'],
  ['zimmer', 'Zimmer', 'z. B. 204, Doppelzimmer'],
  ['buchung', 'Buchungsnummer', ''],
  ['checkin', 'Check-in', 'z. B. ab 14:00'],
  ['checkout', 'Check-out', 'z. B. bis 12:00'],
  ['wlan', 'WLAN', 'Name / Passwort'],
  ['notiz', 'Notiz', ''],
];

const DE_FLUGHAEFEN = ['HAJ', 'MUC', 'FRA', 'BER', 'DUS', 'HAM', 'STR', 'CGN', 'NUE', 'LEJ', 'DRS', 'BRE', 'FMO', 'PAD', 'DTM', 'FKB', 'SCN'];

/** Reisedaten mit deinen Änderungen (Tage) und automatischen Fristen (Online-Check-ins). */
export function mitAnpassungen(reise, eigene) {
  if (!reise) return reise;
  const ae = eigene?.tagAenderungen ?? {};
  const fristen = flugFristen(eigene);
  if (!Object.keys(ae).length && !fristen.length) return reise;
  return {
    ...reise,
    tage: (reise.tage ?? []).map((t) => (t && ae[t.d] ? { ...t, ...sauber(ae[t.d]) } : t)),
    fristen: [...(Array.isArray(reise.fristen) ? reise.fristen : []), ...fristen],
  };
}

function sauber(x) {
  const aus = {};
  for (const [k] of TAG_FELDER) if (typeof x?.[k] === 'string') aus[k] = x[k];
  return aus;
}

/** Nur die Felder speichern, die sich vom Original unterscheiden. */
export function tagAenderung(original, neu) {
  const aus = {};
  for (const [k] of TAG_FELDER) {
    const n = (neu[k] ?? '').replace(/\r/g, '').trim();
    if (n !== (original?.[k] ?? '').trim()) aus[k] = n;
  }
  return Object.keys(aus).length ? aus : null;
}

/** Datum + Uhrzeit in einer Zeitzone → Date. lokal: 'JJJJ-MM-TTTHH:MM' */
export function zeitInZone(lokal, tz) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{1,2}):(\d{2})$/.exec(lokal ?? '');
  if (!m) return null;
  const alsUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const versatz = versatzStunden(new Date(alsUtc), tz);
  return new Date(alsUtc - versatz * 3600000);
}

export function flughafenZone(code) {
  return DE_FLUGHAEFEN.includes(String(code ?? '').toUpperCase()) ? TZ_DE : TZ_TH;
}

export function flugName(f) {
  return [f?.nummer, f?.nummer ? '' : f?.airline].filter(Boolean).join(' ') || 'Flug';
}

/** Abflugzeitpunkt (Ortszeit am Abflughafen) als Date. */
export function abflugZeit(f) {
  if (!f?.d || !/^\d{1,2}:\d{2}$/.test(f.abflug ?? '')) return null;
  return zeitInZone(`${f.d}T${f.abflug.padStart(5, '0')}`, flughafenZone(f.von));
}

/** Wann öffnet der Online-Check-in? */
export function checkinOeffnet(f) {
  const ab = abflugZeit(f);
  const h = Number(f?.checkinStunden);
  if (!ab || !Number.isFinite(h) || h <= 0) return null;
  return new Date(ab.getTime() - h * 3600000);
}

export function gueltigeFluege(eigene) {
  return (Array.isArray(eigene?.fluege) ? eigene.fluege : [])
    .filter((f) => f?.id && /^\d{4}-\d{2}-\d{2}$/.test(f.d ?? ''))
    .sort((a, b) => (a.d + (a.abflug ?? '')).localeCompare(b.d + (b.abflug ?? '')));
}

/** Online-Check-ins, die noch offen sind, als Fristen. */
export function flugFristen(eigene) {
  return gueltigeFluege(eigene)
    .filter((f) => f.checkin !== 'erledigt' && f.checkin !== 'unnoetig')
    .map((f) => ({ f, zeit: checkinOeffnet(f) }))
    .filter((x) => x.zeit)
    .map(({ f, zeit }) => ({
      t: zeit.toISOString(),
      w: `Online-Check-in ${f.airline && f.nummer ? `${f.airline} ` : ''}${flugName(f)}${f.von && f.nach ? ` (${f.von} → ${f.nach})` : ''}`,
      h: `öffnet ${f.checkinStunden} Std. vor Abflug – danach in der App als „erledigt“ markieren`,
      s: 'warn',
      flug: f.id,
    }));
}

const AIRLINE = /(lufthansa|airways|airline|air asia|airasia|vietjet|thai air|thai smile|nok ?air|lion ?air|emirates|qatar|condor|eurowings|turkish)/i;

/** Flüge im Fahrplan-Text erkennen (Vorschläge zum Übernehmen). */
export function flugVorschlaege(reise, eigene) {
  const vorhanden = gueltigeFluege(eigene);
  const vorschlaege = [];
  for (const t of reise?.tage ?? []) {
    const zeilen = `${t?.tr ?? ''}\n${t?.prog ?? ''}`.split('\n');
    for (const z of zeilen) {
      const nr = /\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{2,4})\b/.exec(z);
      const airline = AIRLINE.exec(z);
      if (!nr && !airline) continue;
      const strecke = /\b([A-Z]{3})\s+(\d{1,2}:\d{2})\s*→\s*([A-Z]{3})\s+(\d{1,2}:\d{2})/.exec(z);
      const nurAb = !strecke && /\b([A-Z]{3})\s+(\d{1,2}:\d{2})/.exec(`${z} ${t.prog ?? ''}`);
      const v = {
        d: t.d,
        nummer: nr ? `${nr[1]}${nr[2]}` : '',
        airline: airline ? z.slice(0, nr ? nr.index : z.length).replace(/[·•\-–|]+\s*$/, '').trim().split('·')[0].trim() : '',
        von: strecke?.[1] ?? nurAb?.[1] ?? '',
        abflug: strecke?.[2] ?? nurAb?.[2] ?? '',
        nach: strecke?.[3] ?? '',
        ankunft: strecke?.[4] ?? '',
      };
      if (!v.airline && airline) v.airline = airline[1];
      const doppelt = vorhanden.some((f) => f.d === v.d && ((v.nummer && f.nummer === v.nummer) || (!v.nummer && f.airline && v.airline && f.airline.toLowerCase().includes(v.airline.toLowerCase()))))
        || vorschlaege.some((x) => x.d === v.d && x.nummer === v.nummer && x.airline === v.airline);
      if (!doppelt) vorschlaege.push(v);
    }
  }
  return vorschlaege;
}

export function fluegeAm(eigene, d) {
  return gueltigeFluege(eigene).filter((f) => f.d === d);
}

export function unterkunftDetails(eigene, name) {
  const x = eigene?.unterkuenfte?.[name];
  return x && typeof x === 'object' ? x : {};
}

/** Alle Unterkünfte der Reise mit Zeitraum (ohne „Im Flieger“). */
export function alleUnterkuenfte(reise) {
  const map = new Map();
  for (const t of [...(reise?.tage ?? [])].sort((a, b) => a.d.localeCompare(b.d))) {
    const s = t?.stay?.trim();
    if (!s || /flieger|flugzeug/i.test(s)) continue;
    const u = map.get(s) ?? { name: s, von: t.d, bis: t.d, naechte: 0, p: t.p };
    u.bis = t.d;
    u.naechte += 1;
    if (u.p === 'travel' && t.p !== 'travel') u.p = t.p;
    map.set(s, u);
  }
  return [...map.values()];
}

export { parseZeit };

const FLUG_FELDER = ['d', 'nummer', 'airline', 'von', 'nach', 'abflug', 'ankunft', 'terminal', 'sitz', 'gepaeck', 'code', 'notiz', 'checkinStunden'];
const flugSchluessel = (f) => `${String(f?.nummer ?? '').replace(/\s+/g, '').toUpperCase()}|${f?.d ?? ''}`;

/**
 * Flüge aus den Reisedaten (reise.fluege) in deine Flüge übernehmen.
 * Neue Flüge werden angelegt; bei vorhandenen (gleiche Nummer + Datum) werden nur leere Felder ergänzt –
 * deine eigenen Änderungen bleiben. Gibt true zurück, wenn sich etwas geändert hat.
 */
export function fluegeAusReisedaten(reise, eigene) {
  const quelle = Array.isArray(reise?.fluege) ? reise.fluege.filter((f) => f && /^\d{4}-\d{2}-\d{2}$/.test(f.d ?? '')) : [];
  if (!quelle.length) return false;
  if (!Array.isArray(eigene.fluege)) eigene.fluege = [];
  let geaendert = false;
  for (const q of quelle) {
    const vorhanden = eigene.fluege.find((f) => flugSchluessel(f) === flugSchluessel(q))
      ?? eigene.fluege.find((f) => !f.nummer && f.d === q.d && f.von === q.von);
    if (vorhanden) {
      for (const k of FLUG_FELDER) {
        if ((vorhanden[k] == null || vorhanden[k] === '') && q[k] != null && q[k] !== '') {
          vorhanden[k] = q[k];
          geaendert = true;
        }
      }
    } else {
      const neu = { id: `daten-${flugSchluessel(q).replace(/[^\w-]/g, '')}`, checkin: ['erledigt', 'unnoetig'].includes(q.checkin) ? q.checkin : 'offen', fotos: [] };
      for (const k of FLUG_FELDER) if (q[k] != null && q[k] !== '') neu[k] = typeof q[k] === 'string' ? q[k].trim() : q[k];
      eigene.fluege.push(neu);
      geaendert = true;
    }
  }
  return geaendert;
}
