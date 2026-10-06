// Alle Fristen, farbig nach Restzeit.
import { parseZeit, reisePhase } from './zeit.js';
import { liste, abschnitt, fristZeile, leer } from './bausteine.js';

export function seiteFristen(daten, jetzt) {
  const { tz } = reisePhase(daten, jetzt);
  const alle = (Array.isArray(daten?.fristen) ? daten.fristen : [])
    .map((f) => ({ ...f, zeit: parseZeit(f?.t) }))
    .filter((f) => f.zeit)
    .sort((a, b) => a.zeit - b.zeit);
  const kommend = alle.filter((f) => f.zeit > jetzt);
  const vorbei = alle.filter((f) => f.zeit <= jetzt).reverse();
  return {
    titel: 'Fristen',
    zurueck: '#mehr',
    html: `
      <p class="legende">
        <span class="legende__punkt legende--rot">≤ 7 Tage</span>
        <span class="legende__punkt legende--orange">≤ 21 Tage</span>
        <span class="legende__punkt legende--gruen">später</span>
        <span>❗ wichtig</span>
      </p>
      ${kommend.length ? liste(kommend.map((f) => fristZeile(f, jetzt, tz))) : leer('Keine offenen Fristen. 🎉')}
      ${vorbei.length ? abschnitt('Vorbei', liste(vorbei.map((f) => ({ ...fristZeile(f, jetzt, tz), klasse: 'lz--erledigt' })))) : ''}`,
  };
}
