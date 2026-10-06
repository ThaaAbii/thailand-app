// Vereinfachte Offline-Karte von Südthailand mit der Reiseroute (reines SVG, kein Internet nötig).
import { reisePhase, formatTag } from './zeit.js';
import { e, ortInfo } from './ui.js';

// Bekannte Orte: [Breite, Länge]
const ORTE = {
  bkk: [13.75, 100.5],
  bangkok: [13.75, 100.5],
  samui: [9.53, 100.03],
  'koh samui': [9.53, 100.03],
  tao: [10.09, 99.83],
  'koh tao': [10.09, 99.83],
  aonang: [8.03, 98.82],
  'ao nang': [8.03, 98.82],
  krabi: [8.08, 98.91],
  phuket: [7.88, 98.39],
  phangan: [9.73, 100.02],
  'koh phangan': [9.73, 100.02],
  chumphon: [10.49, 99.18],
  surat: [9.14, 99.33],
  'surat thani': [9.14, 99.33],
  lanta: [7.62, 99.04],
  'koh lanta': [7.62, 99.04],
  phiphi: [7.74, 98.77],
  'phi phi': [7.74, 98.77],
  hua: [12.57, 99.96],
  'hua hin': [12.57, 99.96],
};

// Land (Thailand, Myanmar, Malaysia, Kambodscha) als grober Umriss: [Länge, Breite]
const LAND = [
  [97.4, 14.6], [102.6, 14.6], [102.6, 12.05], [102.3, 12.2], [102.1, 12.45], [101.7, 12.6], [101.25, 12.67],
  [100.95, 12.62], [100.88, 12.93], [100.98, 13.36], [100.85, 13.48], [100.6, 13.5], [100.35, 13.45],
  [100.0, 13.38], [100.05, 13.1], [99.97, 12.8], [99.96, 12.57], [99.98, 12.35], [99.8, 11.8],
  [99.55, 11.25], [99.45, 10.9], [99.27, 10.5], [99.2, 10.15], [99.15, 9.9], [99.25, 9.42], [99.45, 9.3],
  [99.65, 9.28], [99.86, 9.2], [99.93, 8.95], [100.0, 8.6], [100.05, 8.42], [100.25, 8.52], [100.32, 8.2],
  [100.35, 7.8], [100.45, 7.5], [100.6, 7.2], [100.95, 6.95], [101.3, 6.88], [101.6, 6.6], [101.85, 6.35],
  [102.1, 6.2], [102.6, 5.95], [102.6, 5.6], [100.35, 5.6], [100.2, 6.15], [100.1, 6.45], [99.85, 6.62],
  [99.65, 6.95], [99.45, 7.3], [99.3, 7.6], [99.08, 7.88], [98.95, 8.05], [98.83, 8.02], [98.72, 8.12],
  [98.6, 8.3], [98.48, 8.25], [98.3, 8.4], [98.25, 8.7], [98.3, 9.0], [98.4, 9.3], [98.5, 9.7],
  [98.55, 10.0], [98.6, 10.5], [98.75, 11.0], [98.65, 11.8], [98.6, 12.4], [98.45, 13.2], [98.2, 14.05],
  [98.05, 14.6],
];

const INSELN = [
  // Koh Samui
  [[99.92, 9.55], [99.98, 9.6], [100.07, 9.58], [100.1, 9.5], [100.06, 9.43], [99.97, 9.43], [99.92, 9.48]],
  // Koh Phangan
  [[99.96, 9.7], [100.0, 9.79], [100.07, 9.77], [100.08, 9.69], [100.02, 9.67]],
  // Koh Tao
  [[99.8, 10.07], [99.82, 10.12], [99.86, 10.11], [99.85, 10.06]],
  // Phuket
  [[98.27, 8.18], [98.33, 8.2], [98.42, 8.05], [98.43, 7.88], [98.38, 7.76], [98.3, 7.8], [98.28, 8.0]],
  // Koh Lanta
  [[99.03, 7.7], [99.08, 7.68], [99.1, 7.5], [99.05, 7.48]],
  // Koh Phi Phi
  [[98.74, 7.76], [98.79, 7.75], [98.78, 7.68], [98.75, 7.69]],
  // Koh Yao
  [[98.55, 8.15], [98.62, 8.12], [98.6, 7.98], [98.55, 8.0]],
];

const BEREICH = { west: 97.4, ost: 102.6, nord: 14.6, sued: 5.6 };
const BREITE = 600;
const KOS = Math.cos((10 * Math.PI) / 180);
const MASSSTAB = BREITE / ((BEREICH.ost - BEREICH.west) * KOS);
const HOEHE = Math.round((BEREICH.nord - BEREICH.sued) * MASSSTAB);

function xy(lon, lat) {
  return [((lon - BEREICH.west) * KOS * MASSSTAB).toFixed(1), ((BEREICH.nord - lat) * MASSSTAB).toFixed(1)];
}

function pfad(punkte) {
  return `M${punkte.map(([lon, lat]) => xy(lon, lat).join(',')).join('L')}Z`;
}

function koordinaten(daten, key) {
  if (ORTE[key]) return ORTE[key];
  const name = (daten?.orte?.[key]?.name ?? '').toLowerCase();
  const treffer = Object.keys(ORTE).find((k) => k.length > 3 && name.includes(k));
  return treffer ? ORTE[treffer] : null;
}

/** Verkehrsmittel aus dem Transport-Text erraten. */
export function verkehrsmittel(text) {
  const t = String(text ?? '').toLowerCase();
  if (/flug|airways|airline|air asia|airasia|vietjet|thai air|lion|nok|\b[a-z]{2}\d{2,4}\b|→\s*(bkk|usm|kbv|hkt|dmk)/.test(t)) return 'flug';
  if (/fähre|faehre|ferry|lomprayah|pier|boot|speedboat|katamaran/.test(t)) {
    return /bus|minivan|van/.test(t) ? 'kombi' : 'faehre';
  }
  if (/bus|minivan|van|zug|train/.test(t)) return 'bus';
  return 'sonst';
}

/** Route: Abschnitte zwischen aufeinanderfolgenden Orten (ohne Reisetage). */
export function route(daten) {
  const tage = [...(daten?.tage ?? [])].filter((t) => t?.d).sort((a, b) => a.d.localeCompare(b.d));
  const stopps = [];
  let transport = '';
  for (const t of tage) {
    if (!t.p || t.p === 'travel') {
      transport += ` ${t.tr ?? ''} ${t.prog ?? ''}`;
      continue;
    }
    const letzter = stopps[stopps.length - 1];
    if (letzter?.p === t.p) {
      letzter.bis = t.d;
      if (t.tr) transport += ` ${t.tr}`;
      continue;
    }
    if (letzter) letzter.weiter = verkehrsmittel(transport + ` ${t.tr ?? ''}`);
    stopps.push({ p: t.p, von: t.d, bis: t.d, koord: koordinaten(daten, t.p) });
    transport = '';
  }
  return stopps;
}

const ART = {
  flug: { name: 'Flug', klasse: 'flug' },
  faehre: { name: 'Fähre', klasse: 'faehre' },
  kombi: { name: 'Bus + Fähre', klasse: 'kombi' },
  bus: { name: 'Bus / Auto', klasse: 'bus' },
  sonst: { name: 'Weiterreise', klasse: 'sonst' },
};

function linie(a, b, art, i) {
  const [x1, y1] = xy(a[1], a[0]).map(Number);
  const [x2, y2] = xy(b[1], b[0]).map(Number);
  if (art === 'flug') {
    // Flüge als Bogen
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const bogen = Math.min(70, len * 0.25) * (i % 2 ? -1 : 1);
    const cx = mx - (dy / len) * bogen;
    const cy = my + (dx / len) * bogen;
    return `<path class="route route--flug" d="M${x1},${y1} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x2},${y2}"/>`;
  }
  return `<path class="route route--${ART[art]?.klasse ?? 'sonst'}" d="M${x1},${y1} L${x2},${y2}"/>`;
}

export function renderKarte(daten, jetzt, ui = {}) {
  const ph = reisePhase(daten, jetzt);
  const stopps = route(daten);
  const mitKoord = stopps.filter((s) => s.koord);
  const heuteOrt = ph.phase === 'unterwegs' && ph.tag?.p !== 'travel' ? ph.tag?.p : null;
  const arten = new Set();

  let linien = '';
  for (let i = 0; i < stopps.length - 1; i += 1) {
    const a = stopps[i];
    const b = stopps[i + 1];
    if (!a.koord || !b.koord) continue;
    arten.add(a.weiter ?? 'sonst');
    linien += linie(a.koord, b.koord, a.weiter ?? 'sonst', i);
  }

  const gezeichnet = new Map();
  for (const s of mitKoord) if (!gezeichnet.has(s.p)) gezeichnet.set(s.p, s);
  const punkte = [...gezeichnet.values()].map((s) => {
    const [x, y] = xy(s.koord[1], s.koord[0]);
    const ort = ortInfo(daten, s.p);
    const aktiv = s.p === heuteOrt;
    const gewaehlt = s.p === ui.ort;
    const links = Number(x) > BREITE * 0.62;
    return `
      <g class="kartenort${aktiv ? ' kartenort--heute' : ''}${gewaehlt ? ' kartenort--gewaehlt' : ''}" data-aktion="karte-ort" data-ort="${e(s.p)}" style="--ort:${ort.farbe}" tabindex="0" role="button" aria-label="${e(ort.name)}">
        <circle class="kartenort__ziel" cx="${x}" cy="${y}" r="22"/>
        ${aktiv ? `<circle class="kartenort__puls" cx="${x}" cy="${y}" r="10"/>` : ''}
        <circle class="kartenort__punkt" cx="${x}" cy="${y}" r="7"/>
        <text x="${Number(x) + (links ? -12 : 12)}" y="${Number(y) + 5}" text-anchor="${links ? 'end' : 'start'}">${e(ort.name)}</text>
      </g>`;
  }).join('');

  const gewaehlt = ui.ort ? stopps.filter((s) => s.p === ui.ort) : [];
  const ohneKoord = stopps.filter((s) => !s.koord);

  return `
    <a class="zurueck" href="#mehr">‹ Zurück</a>
    <h1 class="seitentitel">Routenkarte</h1>
    <section class="karte karte--karte">
      <svg class="landkarte" viewBox="0 0 ${BREITE} ${HOEHE}" role="img" aria-label="Karte von Südthailand mit deiner Route">
        <rect class="meer" x="0" y="0" width="${BREITE}" height="${HOEHE}"/>
        <path class="land" d="${pfad(LAND)}"/>
        ${INSELN.map((i) => `<path class="land" d="${pfad(i)}"/>`).join('')}
        <text class="meername" x="${xy(101.0, 10.6)[0]}" y="${xy(101.0, 10.6)[1]}">Golf von Thailand</text>
        <text class="meername" x="${xy(97.55, 8.4)[0]}" y="${xy(97.55, 8.4)[1]}">Andamanensee</text>
        ${linien}
        ${punkte}
      </svg>
      <div class="kartenlegende klein">
        ${[...arten].map((a) => `<span><i class="route-muster route-muster--${ART[a].klasse}"></i>${ART[a].name}</span>`).join('')}
        ${heuteOrt ? '<span><i class="punkt-heute"></i>Du bist hier</span>' : ''}
      </div>
      <p class="leise klein">Tippe auf einen Ort für Details. Die Karte ist vereinfacht und funktioniert komplett offline.</p>
    </section>

    ${gewaehlt.length ? ortDetails(daten, ui.ort, gewaehlt) : ''}

    <section class="karte">
      <h2>Stationen</h2>
      <ol class="stationen">
        ${stopps.map((s, i) => {
          const ort = ortInfo(daten, s.p);
          const naechte = (new Date(`${s.bis}T00:00:00Z`) - new Date(`${s.von}T00:00:00Z`)) / 86400000 + 1;
          return `
          <li style="--ort:${ort.farbe}">
            <button class="station${s.p === heuteOrt ? ' station--heute' : ''}" data-aktion="karte-ort" data-ort="${e(s.p)}">
              <b>${e(ort.name)}</b>
              <span class="leise klein">${e(formatTag(s.von))}${s.bis !== s.von ? ` – ${e(formatTag(s.bis))}` : ''} · ${naechte} ${naechte === 1 ? 'Tag' : 'Tage'}</span>
            </button>
            ${i < stopps.length - 1 ? `<span class="station__weiter klein"><i class="route-muster route-muster--${ART[s.weiter ?? 'sonst'].klasse}"></i>${ART[s.weiter ?? 'sonst'].name}</span>` : ''}
          </li>`;
        }).join('')}
      </ol>
      ${ohneKoord.length ? `<p class="leise klein">Ohne Kartenposition: ${ohneKoord.map((s) => e(ortInfo(daten, s.p).name)).join(', ')}</p>` : ''}
    </section>`;
}

function ortDetails(daten, key, abschnitte) {
  const ort = ortInfo(daten, key);
  const tage = (daten.tage ?? []).filter((t) => abschnitte.some((a) => t.d >= a.von && t.d <= a.bis) && t.p === key);
  const unterkuenfte = [...new Set(tage.map((t) => t.stay).filter((s) => s && !/flieger/i.test(s)))];
  return `
    <section class="karte karte--morgen" style="--ort:${ort.farbe}">
      <h2>${e(ort.name)}</h2>
      <p class="leise klein">${tage.length} ${tage.length === 1 ? 'Tag' : 'Tage'}: ${e(formatTag(tage[0]?.d ?? abschnitte[0].von))} – ${e(formatTag(tage[tage.length - 1]?.d ?? abschnitte[0].bis))}</p>
      ${unterkuenfte.map((u) => `
        <p>🛏️ ${e(u)}<br><a class="mehrlink" href="${mapsLink(`${u} ${ort.name}`)}" target="_blank" rel="noopener">In Google Maps öffnen ›</a></p>`).join('')}
      <a class="mehrlink" href="${mapsLink(`${ort.name} Thailand`)}" target="_blank" rel="noopener">${e(ort.name)} in Google Maps ›</a>
    </section>`;
}

export function mapsLink(suche) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(suche)}`;
}
