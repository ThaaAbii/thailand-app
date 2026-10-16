// „Mehr“: aufgeräumtes Menü + Buchungen und Tipps.
import { e } from './ui.js';
import { liste, abschnitt, held, leer } from './bausteine.js';
import { packSummen, formatKg } from './listenlogik.js';

export function seiteMehr(daten, eigene) {
  const pack = Array.isArray(eigene?.packliste) ? eigene.packliste : null;
  const tb = Object.values(eigene?.tagebuch ?? {}).filter((x) => x?.text || x?.fotos?.length).length;
  return {
    titel: 'Mehr',
    html: `
      ${abschnitt('Unterwegs', liste([
        { href: '#notfall', icon: 'notfall', titel: 'Notfall', unter: 'Notrufe, Versicherung, Botschaft' },
        { href: '#thai', icon: 'sprache', titel: 'Thai-Spickzettel' },
        { href: '#tagebuch', icon: 'buch', titel: 'Reisetagebuch', wert: tb ? `${tb}` : '' },
        { href: '#ideen', icon: 'idee', titel: 'Ausflugsideen' },
        { href: '#karte', icon: 'karte', titel: 'Routenkarte' },
      ]))}
      ${abschnitt('Planung', liste([
        { href: '#packliste', icon: 'koffer', titel: 'Packliste', wert: pack ? formatKg(packSummen(pack).aufgabe) : '' },
        { href: '#fluege', icon: 'flug', titel: 'Flüge', wert: eigene?.fluege?.length ? `${eigene.fluege.length}` : '' },
        { href: '#unterkuenfte', icon: 'bett', titel: 'Unterkünfte' },
        { href: '#buchungen', icon: 'beleg', titel: 'Buchungen' },
        { href: '#tipps', icon: 'info', titel: 'Tipps' },
      ]))}
      ${abschnitt('App', liste([
        { href: '#daten', icon: 'speicher', titel: 'Daten & Backup', unter: 'Import, Export, Darstellung' },
      ]))}`,
  };
}

const STORNO = {
  ok: { klasse: 'gruen', text: 'kostenlos stornierbar' },
  warn: { klasse: 'orange', text: 'offen' },
  crit: { klasse: 'rot', text: 'nicht erstattbar' },
  mut: { klasse: 'leise', text: 'Sonderfall' },
};
const FARBE = { gruen: 'var(--gruen)', orange: 'var(--orange)', rot: 'var(--rot)', leise: 'var(--leise)' };

const euro = (n) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

export function seiteBuchungen(daten) {
  const buchungen = Array.isArray(daten?.buchungen) ? daten.buchungen : [];
  const summe = buchungen.reduce((s, b) => s + (typeof b?.eur === 'number' ? b.eur : 0), 0);
  const offen = buchungen.filter((b) => typeof b?.eur !== 'number').length;
  return {
    titel: 'Buchungen',
    zurueck: '#mehr',
    html: `
      ${held({ label: 'Summe gebucht', titel: euro(summe), unter: offen ? `+ ${offen} noch ohne Preis` : '' })}
      ${liste(buchungen.map((b) => {
        const st = STORNO[b?.stornoStatus] ?? STORNO.mut;
        return {
          punkt: FARBE[st.klasse],
          titel: b?.leistung ?? '',
          unterHtml: `<span class="text-${st.klasse}">${e(b?.storno || st.text)}</span>${b?.ueber ? ` · ${e(b.ueber)}` : ''}`,
          wert: typeof b?.eur === 'number' ? euro(b.eur) : '–',
        };
      })) || leer('Keine Buchungen in den Reisedaten.')}`,
  };
}

export function seiteTipps(daten, teile) {
  const gruppen = Array.isArray(daten?.tipps) ? daten.tipps : [];
  const nr = teile[0] != null ? Number(teile[0]) : null;
  if (nr != null && gruppen[nr]) {
    const g = gruppen[nr];
    return {
      titel: g.gruppe,
      zurueck: '#tipps',
      html: `
        ${held({ titel: g.gruppe })}
        <dl class="tipps">${(g.tipps ?? []).map((t) => `<div><dt>${e(t?.titel)}</dt><dd>${e(t?.text)}</dd></div>`).join('')}</dl>`,
    };
  }
  return {
    titel: 'Tipps',
    zurueck: '#mehr',
    html: liste(gruppen.map((g, i) => ({ href: `#tipps/${i}`, titel: g?.gruppe ?? '', wert: `${g?.tipps?.length ?? 0}` }))) || leer('Keine Tipps in den Reisedaten.'),
  };
}
