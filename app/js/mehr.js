// „Mehr“: Menü wie die iOS-Einstellungen + Tipps.
import { e } from './ui.js';
import { liste, abschnitt, held, leer, grosstitel } from './bausteine.js';
import { packSummen, formatKg } from './listenlogik.js';

export function seiteMehr(daten, eigene) {
  const pack = Array.isArray(eigene?.packliste) ? eigene.packliste : null;
  const v = daten?.versicherung ?? {};
  return {
    titel: 'Mehr',
    grosstitel: true,
    html: `
      ${grosstitel('Mehr')}
      ${abschnitt('Unterwegs', liste([
        { href: '#notfall', icon: 'notfall', farbe: 'rot', titel: 'Notfall', unter: 'Notrufe, Botschaft, Unterkunft' },
        { href: '#versicherung', icon: 'schild', farbe: 'blau', titel: 'Versicherung', unter: [v.anbieter, v.tarif].filter(Boolean).join(' ') || 'Notruf, Leistungen, Schadenfall' },
        { href: '#thai', icon: 'sprache', farbe: 'orange', titel: 'Thai-Spickzettel' },
        { href: '#karte', icon: 'karte', farbe: 'gruen', titel: 'Routenkarte' },
        { href: '#ideen', icon: 'idee', farbe: 'gelb', titel: 'Ausflugsideen' },
      ]))}
      ${abschnitt('Vorbereitung', liste([
        { href: '#packliste', icon: 'koffer', farbe: 'braun', titel: 'Packliste', wert: pack ? formatKg(packSummen(pack).aufgabe) : '' },
        { href: '#tipps', icon: 'info', farbe: 'tuerkis', titel: 'Tipps & Infos', wert: Array.isArray(daten?.tipps) ? `${daten.tipps.length}` : '' },
      ]))}
      ${abschnitt('App', liste([
        { href: '#daten', icon: 'einstellung', farbe: 'grau', titel: 'Daten & Backup', unter: 'Import, Export, Darstellung' },
      ]))}`,
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
