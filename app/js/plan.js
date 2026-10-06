// Fahrplan: alle Reisetage untereinander, heute hervorgehoben.
import { reisePhase, tagLabel, formatTag } from './zeit.js';
import { e, ortInfo } from './ui.js';
import { zeile, ortChip } from './bausteine.js';

export function renderPlan(daten, jetzt) {
  const ph = reisePhase(daten, jetzt);
  if (!ph.tage.length) return '<h1 class="seitentitel">Fahrplan</h1><section class="karte"><p class="leise">Kein Fahrplan vorhanden.</p></section>';

  let letzterOrt = null;
  const tage = ph.tage.map((t) => {
    const ort = ortInfo(daten, t.p);
    const heute = t.d === ph.datum;
    const vorbei = t.d < ph.datum;
    const neuerAbschnitt = t.p !== letzterOrt && t.p !== 'travel';
    if (t.p !== 'travel') letzterOrt = t.p;
    const [wt, datum] = formatTag(t.d).split(', ');
    const hinweise = [t.tr && '🚐', t.ci && '🔑', t.note && '📝'].filter(Boolean).join(' ');
    return `
      ${neuerAbschnitt ? `<h2 class="abschnitt" style="--ort:${ort.farbe}">${e(ort.name)}</h2>` : ''}
      <details class="plantag${heute ? ' plantag--heute' : ''}${vorbei ? ' plantag--vorbei' : ''}" style="--ort:${ort.farbe}" ${heute ? 'open data-heute' : ''}>
        <summary>
          <span class="plantag__datum"><small>${e(wt)}</small><b>${e(datum.replace(/\.$/, ''))}</b></span>
          <span class="plantag__text">
            <span class="plantag__label">${heute ? '<b>Heute</b> · ' : ''}${e(tagLabel(ph, t.d).label)}</span>
            <strong>${e(t.t || ort.name)}</strong>
            ${t.stay ? `<span class="plantag__stay">🛏️ ${e(t.stay)}</span>` : ''}
          </span>
          <span class="plantag__icons" aria-hidden="true">${hinweise}</span>
        </summary>
        <div class="plantag__inhalt">
          ${t.p ? `<p>${ortChip(ort)}</p>` : ''}
          ${zeile('🗓️', 'Programm', t.prog)}
          ${zeile('🚐', 'Transport', t.tr, true)}
          ${zeile('🛏️', 'Unterkunft', t.stay)}
          ${zeile('🔑', 'Check-in / Check-out', t.ci, true)}
          ${zeile('📝', 'Notiz', t.note)}
          ${!t.prog && !t.tr && !t.stay && !t.ci && !t.note ? '<p class="leise">Nichts eingetragen – freier Tag.</p>' : ''}
        </div>
      </details>`;
  }).join('');

  return `
    <h1 class="seitentitel">Fahrplan</h1>
    <p class="leise klein seitenhinweis">${ph.tage.length} Tage · ${e(formatTag(ph.tage[0].d))} – ${e(formatTag(ph.tage[ph.tage.length - 1].d))} · Tippe auf einen Tag für Details.</p>
    <div class="planliste">${tage}</div>`;
}
