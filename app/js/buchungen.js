// Buchungen: drei Blätter – Flüge, Hotels, Kosten (mit Storno-Fristen und Risiko).
import { e } from './ui.js';
import { liste, abschnitt, reiter, grosstitel, leer } from './bausteine.js';
import { seiteFluege, seiteUnterkuenfte } from './details.js';

const BLAETTER = [
  { href: '#fluege', label: 'Flüge' },
  { href: '#unterkuenfte', label: 'Hotels' },
  { href: '#buchungen', label: 'Kosten' },
];

/** Ein Blatt mit Reitern oben. art: 'fluege' | 'unterkuenfte' | 'buchungen' */
export function seiteBuchungsBlatt(daten, eigene, jetzt, art) {
  const seite = art === 'fluege' ? seiteFluege(daten, eigene, jetzt)
    : art === 'unterkuenfte' ? seiteUnterkuenfte(daten, eigene)
      : seiteKosten(daten);
  return {
    titel: 'Buchungen',
    grosstitel: true,
    html: `${grosstitel('Buchungen')}${reiter(BLAETTER, `#${art}`)}${seite.html}`,
  };
}

const STORNO = {
  ok: { klasse: 'gruen', text: 'kostenlos stornierbar' },
  warn: { klasse: 'orange', text: 'offen' },
  crit: { klasse: 'rot', text: 'nicht erstattbar' },
  mut: { klasse: 'leise', text: 'Sonderfall' },
};
const FARBE = { gruen: 'var(--gruen-voll)', orange: 'var(--orange-voll)', rot: 'var(--rot-voll)', leise: 'var(--blass)' };

export const euro = (n) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

export function kostenSummen(buchungen) {
  const preis = (b) => (typeof b?.eur === 'number' ? b.eur : 0);
  const gesamt = buchungen.reduce((s, b) => s + preis(b), 0);
  const vorOrt = buchungen.filter((b) => /vor ort/i.test(b?.zahlung ?? '')).reduce((s, b) => s + preis(b), 0);
  const risiko = buchungen.filter((b) => b?.stornoStatus === 'crit').reduce((s, b) => s + preis(b), 0);
  const offen = buchungen.filter((b) => typeof b?.eur !== 'number').length;
  return { gesamt, bezahlt: gesamt - vorOrt, vorOrt, risiko, offen };
}

export function seiteKosten(daten) {
  const buchungen = Array.isArray(daten?.buchungen) ? daten.buchungen : [];
  const s = kostenSummen(buchungen);
  const gruppen = [];
  for (const b of buchungen) {
    const k = b?.kategorie || 'Buchungen';
    let g = gruppen.find((x) => x.name === k);
    if (!g) gruppen.push(g = { name: k, liste: [] });
    g.liste.push(b);
  }
  return {
    titel: 'Kosten',
    html: buchungen.length ? `
      <div class="fakten">
        <div><small>Gesamt</small><b>${euro(s.gesamt)}</b></div>
        <div><small>Schon bezahlt</small><b>${euro(s.bezahlt)}</b></div>
        <div><small>Vor Ort zahlen</small><b>${euro(s.vorOrt)}</b></div>
        <div><small>Hohes Storno-Risiko</small><b class="${s.risiko ? 'text-rot' : ''}">${euro(s.risiko)}</b></div>
      </div>
      ${s.offen ? `<p class="hinweiszeile klein">+ ${s.offen} ${s.offen === 1 ? 'Buchung' : 'Buchungen'} noch ohne Preis</p>` : ''}
      ${gruppen.map((g) => abschnitt(g.name, liste(g.liste.map((b) => {
        const st = STORNO[b?.stornoStatus] ?? STORNO.mut;
        const teile = [
          b?.ueber,
          b?.bis && b.bis !== '–' ? `frei bis ${b.bis}` : '',
          b?.zahlung && !/gebucht/i.test(b.zahlung) ? b.zahlung : '',
        ].filter(Boolean);
        return {
          punkt: FARBE[st.klasse],
          titel: b?.leistung ?? '',
          unterHtml: `<span class="text-${st.klasse}">${e(b?.storno || st.text)}</span>${teile.length ? `<br>${e(teile.join(' · '))}` : ''}`,
          wert: typeof b?.eur === 'number' ? euro(b.eur) : 'offen',
        };
      })))).join('')}
      <p class="legende"><span class="legende__punkt legende--gruen">kostenlos stornierbar</span><span class="legende__punkt legende--orange">offen</span><span class="legende__punkt legende--rot">nicht erstattbar</span></p>`
      : leer('Keine Buchungen in den Reisedaten.'),
  };
}
