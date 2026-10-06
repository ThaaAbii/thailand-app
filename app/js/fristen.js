// Alle Fristen, farbig nach Restzeit.
import { parseZeit, reisePhase } from './zeit.js';
import { fristHtml } from './bausteine.js';

export function renderFristen(daten, jetzt) {
  const { tz } = reisePhase(daten, jetzt);
  const alle = (Array.isArray(daten?.fristen) ? daten.fristen : [])
    .map((f) => ({ ...f, zeit: parseZeit(f?.t) }))
    .filter((f) => f.zeit)
    .sort((a, b) => a.zeit - b.zeit);
  const kommend = alle.filter((f) => f.zeit > jetzt);
  const vorbei = alle.filter((f) => f.zeit <= jetzt).reverse();

  return `
    <h1 class="seitentitel">Fristen</h1>
    <div class="legende klein">
      <span class="legende__punkt legende--rot">≤ 7 Tage</span>
      <span class="legende__punkt legende--orange">≤ 21 Tage</span>
      <span class="legende__punkt legende--gruen">später</span>
      <span>❗ wichtig</span>
    </div>
    <section class="karte">
      ${kommend.length
        ? `<ul class="fristen">${kommend.map((f) => fristHtml(f, jetzt, tz)).join('')}</ul>`
        : '<p class="leise">Keine offenen Fristen. 🎉</p>'}
    </section>
    ${vorbei.length ? `
    <details class="karte aufklapp">
      <summary>Vorbei (${vorbei.length})</summary>
      <ul class="fristen">${vorbei.map((f) => fristHtml(f, jetzt, tz)).join('')}</ul>
    </details>` : ''}`;
}
