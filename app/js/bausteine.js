// Bausteine, die auf mehreren Seiten vorkommen.
import { TZ_DE, TZ_TH, formatKurz, restText, fristStufe } from './zeit.js';
import { e, zeilen } from './ui.js';

/** Eine Info-Zeile mit Symbol, Überschrift und (mehrzeiligem) Text. */
export function zeile(icon, titel, text, liste = false) {
  const z = zeilen(text);
  if (!z.length) return '';
  const inhalt = liste && z.length > 1
    ? `<ul>${z.map((x) => `<li>${e(x)}</li>`).join('')}</ul>`
    : `<p>${z.map(e).join('<br>')}</p>`;
  return `
    <div class="zeile">
      <span class="zeile__icon" aria-hidden="true">${icon}</span>
      <div class="zeile__text"><h3>${e(titel)}</h3>${inhalt}</div>
    </div>`;
}

/** Eine Frist. f.zeit muss ein Date sein. Farbe: rot ≤ 7 Tage, orange ≤ 21 Tage. */
export function fristHtml(f, jetzt, tz = TZ_DE) {
  const stufe = fristStufe(f.zeit, jetzt, tz);
  return `
    <li class="frist frist--${stufe}">
      <div class="frist__kopf">
        <strong>${f.s === 'crit' ? '<span class="wichtig" title="wichtig">❗</span> ' : ''}${e(f.w)}</strong>
        <span class="frist__rest">${e(restText(f.zeit, jetzt, tz))}</span>
      </div>
      ${f.h ? `<p class="frist__hinweis">${e(f.h)}</p>` : ''}
      <p class="frist__zeit">🇩🇪 ${e(formatKurz(f.zeit, TZ_DE))} · 🇹🇭 ${e(formatKurz(f.zeit, TZ_TH))}</p>
    </li>`;
}

export function ortChip(ort) {
  return `<span class="ort-chip" style="--ort:${ort.farbe}">${e(ort.name)}</span>`;
}

export function balken(prozent, stufe = '') {
  const p = Math.max(0, Math.min(100, prozent));
  return `<div class="balken ${stufe ? `balken--${stufe}` : ''}" role="progressbar" aria-valuenow="${Math.round(p)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${p}%"></span></div>`;
}

export function unterseitenKopf(titel, zurueck = '#mehr') {
  return `<a class="zurueck" href="${zurueck}">‹ Zurück</a><h1 class="seitentitel">${e(titel)}</h1>`;
}
