// Visuelle Bausteine: Bordkarten für Flüge, Fotokarten für Hotels, Fortschrittsring, Mini-Diagramm.
import { TZ_DE, formatTag, formatKurz } from './zeit.js';
import { e } from './ui.js';
import { ikon } from './ikonen.js';
import { abflugZeit, checkinOeffnet, flughafenZone, zeitInZone } from './anpassungen.js';
import { bildTag } from './hotel.js';

const FLUGHAFEN = {
  HAJ: 'Hannover', MUC: 'München', FRA: 'Frankfurt', BER: 'Berlin', HAM: 'Hamburg', DUS: 'Düsseldorf', CGN: 'Köln',
  STR: 'Stuttgart', BKK: 'Bangkok', DMK: 'Bangkok DMK', USM: 'Koh Samui', KBV: 'Krabi', HKT: 'Phuket', CNX: 'Chiang Mai',
};

const FLUGZEUG = ikon('flug', 'bordkarte__flieger');

/** Ankunftszeit als Date (über Mitternacht → nächster Tag). */
export function ankunftZeit(f) {
  const ab = abflugZeit(f);
  if (!ab || !/^\d{1,2}:\d{2}$/.test(f?.ankunft ?? '')) return null;
  let an = zeitInZone(`${f.d}T${f.ankunft.padStart(5, '0')}`, flughafenZone(f.nach));
  if (!an) return null;
  while (an <= ab) an = new Date(an.getTime() + 86400000);
  return an;
}

/** Flugdauer als Text, z. B. „13 Std. 5 Min.“ */
export function flugDauer(f) {
  const ab = abflugZeit(f);
  const an = ankunftZeit(f);
  if (!ab || !an) return '';
  const min = Math.round((an - ab) / 60000);
  if (min <= 0 || min > 40 * 60) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} Std.${m ? ` ${m} Min.` : ''}` : `${m} Min.`;
}

function tagVersatz(f) {
  const ab = abflugZeit(f);
  const an = ankunftZeit(f);
  if (!ab || !an) return 0;
  const tag = (d, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const a = Date.parse(tag(ab, flughafenZone(f.von)));
  const b = Date.parse(tag(an, flughafenZone(f.nach)));
  return Math.round((b - a) / 86400000);
}

export function checkinStatus(f, jetzt) {
  if (f.checkin === 'erledigt') return { text: 'Eingecheckt', klasse: 'gruen' };
  if (f.checkin === 'unnoetig') return { text: 'Nicht nötig', klasse: 'leise' };
  const ab = checkinOeffnet(f);
  if (ab && ab > jetzt) return { text: `ab ${formatKurz(ab, TZ_DE)}`, klasse: 'leise' };
  return { text: 'Offen', klasse: 'orange' };
}

/** Bordkarte. Mit opts.vorschlag wird sie zum Knopf „übernehmen“. */
export function bordkarte(f, jetzt, opts = {}) {
  const st = checkinStatus(f, jetzt);
  const plus = tagVersatz(f);
  const dauer = flugDauer(f);
  const ort = (code, ziel) => `
    <div class="bordkarte__ort${ziel ? ' bordkarte__ort--ziel' : ''}">
      <b${code ? '' : ' class="bordkarte__offen"'}>${e(code || '?')}</b>
      <span>${e(FLUGHAFEN[code] ?? '')}</span>
      <time>${e((ziel ? f.ankunft : f.abflug) || '–')}${ziel && plus > 0 ? `<sup>+${plus}</sup>` : ''}</time>
    </div>`;
  const tag = opts.vorschlag ? 'button' : 'a';
  const attrs = opts.vorschlag
    ? `type="button" data-aktion="flug-uebernehmen" data-index="${e(opts.index)}"`
    : `href="#flug/${e(f.id)}"`;
  return `
    <${tag} class="bordkarte${opts.vorschlag ? ' bordkarte--vorschlag' : ''}" ${attrs}>
      <div class="bordkarte__oben">
        <span class="bordkarte__airline">${e(f.airline || 'Flug')}</span>
        <span class="bordkarte__nr">${e(f.nummer || '')}</span>
      </div>
      <div class="bordkarte__route">
        ${ort(f.von, false)}
        <div class="bordkarte__mitte"><span class="bordkarte__linie">${FLUGZEUG}</span>${dauer ? `<small>${e(dauer)}</small>` : ''}</div>
        ${ort(f.nach, true)}
      </div>
      <div class="bordkarte__unten">
        <div><small>Datum</small><b>${e(formatTag(f.d))}</b></div>
        ${opts.vorschlag
          ? '<div class="bordkarte__uebernehmen"><b>Antippen zum Übernehmen</b></div>'
          : `<div><small>Sitz</small><b>${e(f.sitz || '–')}</b></div>
             <div><small>Gepäck</small><b>${e(f.gepaeck || '–')}</b></div>
             <div><small>Check-in</small><b class="text-${st.klasse}">${e(st.text)}</b></div>`}
      </div>
    </${tag}>`;
}

/** Fotokarte für ein Hotel. u: { name, von, bis, naechte }, bild: { id } | { src } | null. */
export function hotelKarte(u, ort, bild, unter = '') {
  const fotoId = bild;
  return `
    <a class="hotelkarte${fotoId ? '' : ' hotelkarte--ohne'}" href="#unterkunft/${encodeURIComponent(u.name)}" style="--ort:${ort.farbe}">
      <span class="hotelkarte__bild">
        ${bild ? bildTag(bild) : `<span class="hotelkarte__leer">${ikon('bett')}</span>`}
        <span class="hotelkarte__marke">${u.naechte} ${u.naechte === 1 ? 'Nacht' : 'Nächte'}</span>
      </span>
      <span class="hotelkarte__text">
        <b>${e(u.name)}</b>
        <span>${e(ort.name)} · ${e(formatTag(u.von).split(', ')[1])} – ${e(formatTag(u.bis).split(', ')[1])}${fotoId ? '' : ` · ${u.naechte} ${u.naechte === 1 ? 'Nacht' : 'Nächte'}`}</span>
        ${unter ? `<span class="leise">${e(unter)}</span>` : ''}
      </span>
    </a>`;
}

/** Fortschrittsring (0–1+), Apple-Watch-Stil. */
export function ring(anteil, stufe = '', inhalt = '') {
  const r = 52;
  const u = 2 * Math.PI * r;
  const a = Math.max(0, Math.min(1, anteil));
  return `
    <span class="ring ring--${e(stufe)}">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle class="ring__spur" cx="60" cy="60" r="${r}"/>
        ${a > 0 ? `<circle class="ring__wert" cx="60" cy="60" r="${r}" stroke-dasharray="${(a * u).toFixed(1)} ${u.toFixed(1)}"/>` : ''}
      </svg>
      <span class="ring__inhalt">${inhalt}</span>
    </span>`;
}

/** Kleines Säulen-Diagramm. werte: [{ label, wert, stufe, aktiv }], grenze = Linie (z. B. Budget). */
export function saeulen(werte, grenze) {
  const max = Math.max(grenze * 1.2, ...werte.map((w) => w.wert), 1);
  return `
    <div class="saeulen" style="--grenze:${(grenze / max).toFixed(3)}">
      <span class="saeulen__grenze" aria-hidden="true"></span>
      ${werte.map((w) => `
        <span class="saeule${w.aktiv ? ' saeule--aktiv' : ''}">
          <span class="saeule__spur"><span class="saeule__wert saeule__wert--${e(w.stufe || '')}" style="height:${Math.max(w.wert ? 4 : 0, (w.wert / max) * 100).toFixed(1)}%"></span></span>
          <small>${e(w.label)}</small>
        </span>`).join('')}
    </div>`;
}
