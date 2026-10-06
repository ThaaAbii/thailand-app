// Bausteine für das ruhige Listen-Design: Abschnitte mit Überschrift, Listenzeilen, Fortschritt.
import { TZ_DE, TZ_TH, formatKurz, restText, fristStufe } from './zeit.js';
import { e, zeilen } from './ui.js';

/**
 * Eine Liste aus Zeilen (wie in den Handy-Einstellungen).
 * Zeile: { href?, aktion?, daten?, icon?, punkt?, titel, unter?, wert?, wertKlasse?, pfeil?, extern?, klasse? }
 */
export function liste(zeilenListe, klasse = '') {
  const z = zeilenListe.filter(Boolean);
  if (!z.length) return '';
  return `<div class="liste ${klasse}">${z.map(listenZeile).join('')}</div>`;
}

export function listenZeile(z) {
  const tag = z.href ? 'a' : z.aktion ? 'button' : 'div';
  const attrs = [
    z.href ? `href="${e(z.href)}"` : '',
    z.extern ? 'target="_blank" rel="noopener"' : '',
    z.aktion ? `type="button" data-aktion="${e(z.aktion)}"` : '',
    ...Object.entries(z.daten ?? {}).map(([k, v]) => `data-${k}="${e(v)}"`),
  ].join(' ');
  let pfeil = '';
  if (z.pfeil != null) pfeil = z.pfeil;
  else if (z.extern) pfeil = '<span class="lz__pfeil" aria-hidden="true">↗</span>';
  else if (z.href) pfeil = '<span class="lz__pfeil" aria-hidden="true">›</span>';
  return `
    <${tag} class="lz ${z.klasse ?? ''}" ${attrs}>
      ${z.punkt ? `<span class="lz__punkt" style="--ort:${z.punkt}"></span>` : ''}
      ${z.icon ? `<span class="lz__icon" aria-hidden="true">${z.icon}</span>` : ''}
      <span class="lz__text">
        <span class="lz__titel">${z.titelHtml ?? e(z.titel)}</span>
        ${z.unter || z.unterHtml ? `<span class="lz__unter">${z.unterHtml ?? e(z.unter)}</span>` : ''}
      </span>
      ${z.wert != null || z.wertHtml ? `<span class="lz__wert ${z.wertKlasse ?? ''}">${z.wertHtml ?? e(z.wert)}</span>` : ''}
      ${pfeil}
    </${tag}>`;
}

/** Abschnitt mit kleiner Überschrift. */
export function abschnitt(titel, inhalt, extra = '') {
  if (!inhalt) return '';
  return `<section class="abschnitt">${titel ? `<h2 class="label">${e(titel)}${extra}</h2>` : ''}${inhalt}</section>`;
}

/** Info-Block auf Detailseiten: Überschrift + (mehrzeiliger) Text. */
export function zeile(icon, titel, text, liste = false) {
  const z = zeilen(text);
  if (!z.length) return '';
  const inhalt = liste && z.length > 1
    ? `<ul class="info__liste">${z.map((x) => `<li>${e(x)}</li>`).join('')}</ul>`
    : `<p>${z.map(e).join('<br>')}</p>`;
  return `
    <div class="info">
      <h3 class="label">${icon ? `<span aria-hidden="true">${icon}</span> ` : ''}${e(titel)}</h3>
      ${inhalt}
    </div>`;
}

const STUFE_FARBE = { rot: 'var(--rot)', orange: 'var(--orange)', gruen: 'var(--gruen)', vorbei: 'var(--leise)' };

/** Eine Frist als Listenzeile. f.zeit muss ein Date sein. Farbe: rot ≤ 7 Tage, orange ≤ 21 Tage. */
export function fristZeile(f, jetzt, tz = TZ_DE, href = '', kompakt = false) {
  const stufe = fristStufe(f.zeit, jetzt, tz);
  return {
    href,
    punkt: STUFE_FARBE[stufe],
    titelHtml: `${f.s === 'crit' ? '<span title="wichtig">❗</span> ' : ''}${e(f.w)}`,
    unterHtml: kompakt
      ? e(formatKurz(f.zeit, tz))
      : `${f.h ? `${e(f.h)}<br>` : ''}🇩🇪 ${e(formatKurz(f.zeit, TZ_DE))} · 🇹🇭 ${e(formatKurz(f.zeit, TZ_TH))}`,
    wert: restText(f.zeit, jetzt, tz),
    wertKlasse: `text-${stufe}`,
    pfeil: '',
  };
}

export function ortChip(ort) {
  return `<span class="ort-chip" style="--ort:${ort.farbe}">${e(ort.name)}</span>`;
}

export function balken(prozent, stufe = '') {
  const p = Math.max(0, Math.min(100, prozent));
  return `<div class="balken ${stufe ? `balken--${stufe}` : ''}" role="progressbar" aria-valuenow="${Math.round(p)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${p}%"></span></div>`;
}

/** Großer Kopfbereich einer Seite (ohne Kasten). */
export function held({ label = '', titel = '', titelHtml = '', unter = '', unterHtml = '', farbe = '' }) {
  return `
    <section class="held" ${farbe ? `style="--ort:${farbe}"` : ''}>
      ${label ? `<p class="held__label">${e(label)}</p>` : ''}
      <h1 class="held__titel">${titelHtml || e(titel)}</h1>
      ${unter || unterHtml ? `<p class="held__unter">${unterHtml || e(unter)}</p>` : ''}
    </section>`;
}

export function leer(text) {
  return `<p class="leer">${e(text)}</p>`;
}
