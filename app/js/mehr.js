// „Mehr“: Buchungen, Tipps, Daten & Backup.
import { e } from './ui.js';
import { unterseitenKopf } from './bausteine.js';

export function renderMehr(daten) {
  const kachel = (href, icon, titel, text) => `
    <a class="kachel" href="${href}">
      <span class="kachel__icon" aria-hidden="true">${icon}</span>
      <span><b>${titel}</b><small>${text}</small></span>
      <span class="kachel__pfeil" aria-hidden="true">›</span>
    </a>`;
  const nb = Array.isArray(daten?.buchungen) ? daten.buchungen.length : 0;
  const nt = (Array.isArray(daten?.tipps) ? daten.tipps : []).reduce((n, g) => n + (g?.tipps?.length ?? 0), 0);
  return `
    <h1 class="seitentitel">Mehr</h1>
    <div class="kacheln">
      ${kachel('#buchungen', '🧾', 'Buchungen', `${nb} Buchungen mit Storno-Status`)}
      ${kachel('#tipps', '💡', 'Tipps', `${nt} Tipps für unterwegs`)}
      ${kachel('#daten', '💾', 'Daten & Backup', 'Import, Export, Darstellung, Testdatum')}
    </div>`;
}

const STORNO = {
  ok: { klasse: 'gruen', text: 'kostenlos stornierbar' },
  warn: { klasse: 'orange', text: 'offen' },
  crit: { klasse: 'rot', text: 'nicht erstattbar' },
  mut: { klasse: 'grau', text: 'Sonderfall' },
};

const euro = (n) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

export function renderBuchungen(daten) {
  const liste = Array.isArray(daten?.buchungen) ? daten.buchungen : [];
  const summe = liste.reduce((s, b) => s + (typeof b?.eur === 'number' ? b.eur : 0), 0);
  const offen = liste.filter((b) => typeof b?.eur !== 'number').length;
  return `
    ${unterseitenKopf('Buchungen')}
    <section class="karte summe">
      <span>Summe gebucht</span>
      <b>${euro(summe)}</b>
      ${offen ? `<small class="leise">+ ${offen} noch ohne Preis</small>` : ''}
    </section>
    <ul class="buchungen">
      ${liste.map((b) => {
        const st = STORNO[b?.stornoStatus] ?? STORNO.mut;
        return `
        <li class="karte buchung buchung--${st.klasse}">
          <div class="gruppenkopf"><b>${e(b?.leistung)}</b><b class="buchung__preis">${typeof b?.eur === 'number' ? euro(b.eur) : '–'}</b></div>
          ${b?.ueber ? `<p class="leise klein">über ${e(b.ueber)}</p>` : ''}
          <p class="buchung__storno"><span class="punkt" aria-hidden="true"></span>${e(b?.storno || st.text)}</p>
        </li>`;
      }).join('') || '<li class="karte leise">Keine Buchungen in den Reisedaten.</li>'}
    </ul>`;
}

export function renderTipps(daten) {
  const gruppen = Array.isArray(daten?.tipps) ? daten.tipps : [];
  return `
    ${unterseitenKopf('Tipps')}
    ${gruppen.map((g, i) => `
      <details class="karte aufklapp" ${i === 0 ? 'open' : ''}>
        <summary>${e(g?.gruppe)} <span class="leise klein">(${g?.tipps?.length ?? 0})</span></summary>
        <dl class="tipps">
          ${(g?.tipps ?? []).map((t) => `<div><dt>${e(t?.titel)}</dt><dd>${e(t?.text)}</dd></div>`).join('')}
        </dl>
      </details>`).join('') || '<section class="karte"><p class="leise">Keine Tipps in den Reisedaten.</p></section>'}`;
}
