// Hotel-Steckbrief aus den Reisedaten (daten.hotels): Bilder, Bewertung, Preis, Ausstattung, Umgebung.
import { e } from './ui.js';
import { abschnitt, liste } from './bausteine.js';
import { ikon } from './ikonen.js';

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim();

/** Infos zu einem Hotel. „Ban's Diving Resort – Dormitory“ findet auch den Eintrag „Ban's Diving Resort“. */
export function hotelInfo(daten, name) {
  const h = daten?.hotels && typeof daten.hotels === 'object' ? daten.hotels : {};
  if (h[name] && typeof h[name] === 'object') return h[name];
  const n = norm(name);
  const key = Object.keys(h).filter((k) => norm(k) && n.startsWith(norm(k))).sort((a, b) => b.length - a.length)[0];
  return key && typeof h[key] === 'object' ? h[key] : {};
}

const istBild = (x) => typeof x === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(x);

export function hotelBilder(info) {
  return Array.isArray(info?.bilder) ? info.bilder.filter(istBild) : [];
}

/** Titelbild: eigenes Foto zuerst, sonst Bild aus den Reisedaten. → { id } | { src } | null */
export function titelBild(daten, eigene, name) {
  const eigeneFotos = eigene?.hotelFotos?.[name];
  if (Array.isArray(eigeneFotos) && typeof eigeneFotos[0] === 'string') return { id: eigeneFotos[0] };
  const b = hotelBilder(hotelInfo(daten, name))[0];
  return b ? { src: b } : null;
}

export function bildTag(b) {
  if (!b) return '';
  return b.id ? `<img data-foto="${e(b.id)}" alt="">` : `<img src="${b.src}" alt="">`;
}

const euro = (n) => (typeof n === 'number' ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : e(n ?? ''));
const arr = (x) => (Array.isArray(x) ? x : []);

/** Sterne + Bewertung als kleine Zeile unter dem Namen. */
export function hotelKopfzeile(info) {
  const teile = [];
  if (info.sterne) teile.push(`<span class="sterne" aria-label="${e(info.sterne)} Sterne">${'★'.repeat(Math.min(5, Number(info.sterne) || 0))}</span>`);
  if (info.bewertung?.note) teile.push(`<span class="note">${e(String(info.bewertung.note).replace('.', ','))}</span>${info.bewertung.text ? ` ${e(info.bewertung.text)}` : ''}${info.bewertung.anzahl ? ` · ${e(info.bewertung.anzahl)} Bewertungen` : ''}`);
  if (info.thai) teile.push(`<span class="leise">${e(info.thai)}</span>`);
  return teile.length ? `<p class="hotelkopf">${teile.join('<span class="trenner"></span>')}</p>` : '';
}

/** Alle Abschnitte des Steckbriefs. */
export function hotelAbschnitte(info) {
  if (!info || !Object.keys(info).length) return '';
  const fakten = [
    ['Check-in', info.checkin], ['Check-out', info.checkout],
    ['Bezahlt', typeof info.bezahlt === 'number' ? euro(info.bezahlt) : info.bezahlt], ['Zimmer', info.zimmer],
  ].filter(([, x]) => x);
  const preis = arr(info.preis).filter((p) => p?.was);
  const ausstattung = arr(info.ausstattung).filter((g) => g?.gruppe && arr(g.punkte).length);
  const umgebung = arr(info.umgebung).filter((u) => u?.was);
  const naehe = arr(info.naehe).filter((u) => u?.name);
  const lage = arr(info.lage).filter((g) => g?.gruppe && arr(g.punkte).length);
  const regeln = arr(info.regeln).filter((r) => r?.titel);
  const z = info.zimmerInfo && typeof info.zimmerInfo === 'object' ? info.zimmerInfo : null;
  const LAGE_ICON = { transport: 'pin', shopping: 'beleg', sehensw: 'stern' };
  const lageIcon = (g) => Object.entries(LAGE_ICON).find(([k]) => g.toLowerCase().includes(k))?.[1] ?? 'pin';
  return `
    ${fakten.length ? `<div class="fakten">${fakten.map(([k, x]) => `<div><small>${e(k)}</small><b>${e(x)}</b></div>`).join('')}</div>` : ''}
    ${info.bewertung?.zitat ? `<blockquote class="zitat">„${e(info.bewertung.zitat)}“</blockquote>` : ''}
    ${arr(info.highlights).length ? `<div class="chips chips--ruhig">${arr(info.highlights).map((h) => `<span class="pille">${e(h)}</span>`).join('')}</div>` : ''}
    ${z ? abschnitt('Dein Zimmer', `<div class="karte karte--text"><div class="info"><h3 class="zimmer__name">${e(z.name ?? '')}</h3>${arr(z.merkmale).length ? `<div class="chips chips--ruhig">${arr(z.merkmale).map((x) => `<span class="pille">${e(x)}</span>`).join('')}</div>` : ''}${arr(z.ausstattung).length ? `<p class="zimmer__text">${e(arr(z.ausstattung).join(' · '))}</p>` : ''}</div></div>`) : ''}
    ${regeln.length ? abschnitt('Gut zu wissen vor Ort', liste(regeln.map((r) => ({ icon: r.icon || 'info', titel: r.titel, unter: r.text })))) : ''}
    ${arr(info.zahlung).length ? `<div class="chips chips--ruhig zahlarten"><span class="zahlarten__label">Zahlung im Hotel</span>${arr(info.zahlung).map((x) => `<span class="pille">${e(x)}</span>`).join('')}</div>` : ''}
    ${preis.length ? abschnitt('Preisdetails', `<div class="karte preisliste">${preis.map((p) => `
      <div class="preiszeile${p.rabatt ? ' preiszeile--rabatt' : ''}${p.unter ? ' preiszeile--unter' : ''}"><span>${e(p.was)}</span><b>${euro(p.betrag)}</b></div>`).join('')}
      ${info.bezahlt != null ? `<div class="preiszeile preiszeile--summe"><span>${e(info.bezahltText || 'Bezahlt')}</span><b>${euro(info.bezahlt)}</b></div>` : ''}
    </div>`) : ''}
    ${lage.map((g) => abschnitt(g.gruppe, liste(arr(g.punkte).filter((p) => p?.was).map((p) => ({ icon: lageIcon(g.gruppe), titel: p.was, unter: p.typ, wert: p.entfernung }))))).join('')}
    ${umgebung.length ? abschnitt('Umgebung', liste(umgebung.map((u) => ({ icon: u.icon || 'pin', titel: u.was, unter: u.typ, wert: u.entfernung })))) : ''}
    ${naehe.length ? abschnitt('In der Nähe', liste(naehe.map((u) => ({ icon: u.icon || 'stern', titel: u.name, unter: [u.info, u.bewertung && `★ ${u.bewertung}`].filter(Boolean).join(' · '), wert: u.entfernung })))) : ''}
    ${ausstattung.length ? abschnitt('Ausstattung', `<div class="karte karte--text ausstattung">${ausstattung.map((g) => `
      <div class="info"><h3 class="info__titel">${e(g.gruppe)}</h3><div class="chips chips--ruhig">${arr(g.punkte).map((x) => `<span class="pille${/kostenlos/i.test(x) ? ' pille--gruen' : ''}${/^kein/i.test(x) ? ' pille--aus' : ''}">${e(x)}</span>`).join('')}</div></div>`).join('')}
    </div>`) : ''}
    ${arr(info.beschreibung).length ? abschnitt('Über das Hotel', `<details class="karte karte--text beschreibung"><summary>${e(arr(info.beschreibung)[0].slice(0, 140))}${arr(info.beschreibung)[0].length > 140 || arr(info.beschreibung).length > 1 ? ' … <span>mehr</span>' : ''}</summary>${arr(info.beschreibung).map((x) => `<p>${e(x)}</p>`).join('')}</details>`) : ''}
    ${arr(info.hinweise).length ? abschnitt('Tipps', `<ul class="infoliste">${arr(info.hinweise).map((h) => `<li>${e(h)}</li>`).join('')}</ul>`) : ''}
    ${info.quelle ? `<p class="leise klein abstand-klein">${ikon('info', 'ikon ikon--klein')} Quelle: ${e(info.quelle)}</p>` : ''}`;
}
