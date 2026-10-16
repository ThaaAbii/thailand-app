// Bausteine des Designs: weiße Karten mit feinen Zeilen, Abschnitte, Kacheln, Fortschritt.
import { TZ_DE, TZ_TH, formatKurz, restText, fristStufe } from './zeit.js';
import { e, zeilen } from './ui.js';
import { ikon } from './ikonen.js';

/** Weiße Karte mit feinem Rand. */
export function karte(inhalt, klasse = '') {
  if (!inhalt) return '';
  return `<div class="karte ${klasse}">${inhalt}</div>`;
}

/**
 * Karte aus Zeilen.
 * Zeile: { href?, aktion?, daten?, icon?, punkt?, titel, unter?, wert?, wertKlasse?, pfeil?, extern?, klasse? }
 */
export function liste(zeilenListe, klasse = '') {
  const z = zeilenListe.filter(Boolean);
  if (!z.length) return '';
  return karte(z.map(listenZeile).join(''), klasse);
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
  else if (z.extern) pfeil = '<span class="zeile__extern" aria-hidden="true">↗</span>';
  else if (z.href) pfeil = '<span class="zeile__pfeil" aria-hidden="true"></span>';
  return `
    <${tag} class="zeile ${z.klasse ?? ''}" ${attrs}>
      ${z.punkt ? `<span class="zeile__punkt" style="--ort:${z.punkt}"></span>` : ''}
      ${z.icon && ikon(z.icon) ? `<span class="zeile__icon">${ikon(z.icon)}</span>` : ''}
      <span class="zeile__text">
        <span class="zeile__titel">${z.titelHtml ?? e(z.titel)}</span>
        ${z.unter || z.unterHtml ? `<span class="zeile__unter">${z.unterHtml ?? e(z.unter)}</span>` : ''}
      </span>
      ${z.wert != null && z.wert !== '' || z.wertHtml ? `<span class="zeile__wert ${z.wertKlasse ?? ''}">${z.wertHtml ?? e(z.wert)}</span>` : ''}
      ${pfeil}
    </${tag}>`;
}

/** Abschnitt mit kleiner Überschrift über einer Karte. */
export function abschnitt(titel, inhalt, extra = '') {
  if (!inhalt) return '';
  return `<section class="abschnitt">${titel ? `<h2 class="label">${e(titel)}${extra}</h2>` : ''}${inhalt}</section>`;
}

/** Text-Block in einer Karte: kleine Überschrift + (mehrzeiliger) Text. */
export function zeile(icon, titel, text, liste = false) {
  const z = zeilen(text);
  if (!z.length) return '';
  const inhalt = liste && z.length > 1
    ? `<ul class="info__liste">${z.map((x) => `<li>${e(x)}</li>`).join('')}</ul>`
    : `<p>${z.map(e).join('<br>')}</p>`;
  return `<div class="info"><h3 class="info__titel">${e(titel)}</h3>${inhalt}</div>`;
}

/** Kacheln mit großer Zahl (2 nebeneinander). k: { href?, zahl, einheit?, label, ton? } */
export function kacheln(liste0) {
  const k = liste0.filter(Boolean);
  if (!k.length) return '';
  return `<div class="kacheln">${k.map((x) => `
    <${x.href ? `a href="${e(x.href)}"` : 'div'} class="kachel${x.ton ? ` kachel--${x.ton}` : ''}">
      <span class="kachel__zahl">${e(x.zahl)}${x.einheit ? `<small>${e(x.einheit)}</small>` : ''}</span>
      <span class="kachel__label">${e(x.label)}</span>
    </${x.href ? 'a' : 'div'}>`).join('')}</div>`;
}

const STUFE_FARBE = { rot: 'var(--rot)', orange: 'var(--orange)', gruen: 'var(--gruen)', vorbei: 'var(--leise)' };

/** Eine Frist als Zeile. f.zeit muss ein Date sein. Farbe: rot ≤ 7 Tage, orange ≤ 21 Tage. */
export function fristZeile(f, jetzt, tz = TZ_DE, href = '', kompakt = false) {
  const stufe = fristStufe(f.zeit, jetzt, tz);
  return {
    href,
    punkt: STUFE_FARBE[stufe],
    titelHtml: `${f.s === 'crit' ? '<span class="wichtig" title="wichtig"></span>' : ''}${e(f.w)}`,
    unterHtml: kompakt
      ? e(formatKurz(f.zeit, tz))
      : `${f.h ? `${e(f.h)}<br>` : ''}DE ${e(formatKurz(f.zeit, TZ_DE))} · TH ${e(formatKurz(f.zeit, TZ_TH))}`,
    wert: restText(f.zeit, jetzt, tz),
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

/** Kopfbereich einer Seite (reine Typografie, ohne Kasten). */
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
