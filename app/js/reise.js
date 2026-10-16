// Reise: Stationen gliedern und eine Seite pro Tag (Ablauf, Flug, Unterkunft, Tagebuch).
import { reisePhase, tagLabel, formatTag } from './zeit.js';
import { e, ortInfo, zeilen } from './ui.js';
import { liste, karte, abschnitt, held, leer } from './bausteine.js';
import { gueltigeAusgaben, inThb, formatThb } from './ausgabenlogik.js';
import { fluegeAm, unterkunftDetails } from './anpassungen.js';
import { unterkunftZeilen, hotelBasis } from './details.js';
import { titelBild, bildTag } from './hotel.js';
import { bordkarte } from './visuell.js';

/** Tage nach Station gliedern; Reisetage hängen an der vorherigen Station. */
export function stationen(tage) {
  const liste0 = [];
  for (const t of tage) {
    const p = t.p && t.p !== 'travel' ? t.p : null;
    const letzte = liste0[liste0.length - 1];
    if (!letzte || (p && letzte.p && p !== letzte.p)) liste0.push({ p, tage: [t] });
    else {
      if (!letzte.p && p) letzte.p = p;
      letzte.tage.push(t);
    }
  }
  return liste0;
}

export function seiteTag(daten, eigene, jetzt, d) {
  const ph = reisePhase(daten, jetzt);
  const i = ph.tage.findIndex((t) => t.d === d);
  const t = ph.tage[i];
  if (!t) return { titel: 'Tag', zurueck: '#plan', html: leer('Diesen Tag gibt es im Fahrplan nicht.') };
  const ort = ortInfo(daten, t.p);
  const stay = t.stay && !/flieger/i.test(t.stay) ? t.stay : null;
  const ausgaben = gueltigeAusgaben(eigene).filter((a) => a.d === d);
  const thb = ausgaben.reduce((s, a) => s + inThb(a), 0);
  const vor = ph.tage[i - 1];
  const nach = ph.tage[i + 1];
  const fluege = fluegeAm(eigene, d);
  const det = stay ? { ...hotelBasis(daten, stay), ...unterkunftDetails(eigene, stay) } : {};
  const geaendert = !!eigene?.tagAenderungen?.[d];
  const schritte = zeilen(t.tr);
  const ci = zeilen(t.ci);

  const ablauf = [
    t.prog ? `<div class="info"><h3 class="info__titel">Programm</h3><p>${zeilen(t.prog).map(e).join('<br>')}</p></div>` : '',
    schritte.length ? `<div class="info"><h3 class="info__titel">Transport</h3><ul class="schritte">${schritte.map((x) => `<li>${e(x)}</li>`).join('')}</ul></div>` : '',
    ci.length ? `<div class="info"><h3 class="info__titel">Check-in / Check-out</h3><ul class="schritte schritte--leise">${ci.map((x) => `<li>${e(x)}</li>`).join('')}</ul></div>` : '',
    t.via ? `<div class="info"><h3 class="info__titel">Gebucht über</h3><p>${e(t.via)}</p></div>` : '',
  ].join('');


  return {
    titel: formatTag(d),
    zurueck: '#plan',
    html: `
      ${held({
        label: `${tagLabel(ph, d).label} · ${formatTag(d, true)}`,
        titel: t.t || ort.name,
        unterHtml: t.p && t.p !== 'travel' ? `<span class="punkt" style="--ort:${ort.farbe}"></span>${e(ort.name)}${geaendert ? ' · <span class="leise">von dir bearbeitet</span>' : ''}` : (geaendert ? '<span class="leise">von dir bearbeitet</span>' : ''),
        farbe: ort.farbe,
      })}
      ${ablauf ? karte(ablauf, 'karte--text') : ''}
      ${fluege.length ? abschnitt('Flug', `<div class="bordkarten">${fluege.map((f) => bordkarte(f, jetzt)).join('')}</div>`) : ''}
      ${stay && titelBild(daten, eigene, stay) ? abschnitt('Unterkunft', `<a class="bildkarte" href="#unterkunft/${encodeURIComponent(stay)}">${bildTag(titelBild(daten, eigene, stay))}</a>`) : ''}
      ${stay ? abschnitt(titelBild(daten, eigene, stay) ? '' : 'Unterkunft', liste([
        { href: `#unterkunft/${encodeURIComponent(stay)}`, titelHtml: `<b>${e(stay)}</b>`, unter: [det.zimmer && `Zimmer ${det.zimmer}`, det.checkin && `Check-in ${det.checkin}`, det.checkout && `Check-out ${det.checkout}`].filter(Boolean).join(' · ') },
        ...unterkunftZeilen(stay, det, ort.name).filter((z) => z && !/^🚪|^🔑/.test(z.icon ?? '')),
        { href: `#unterkunft/${encodeURIComponent(stay)}/bearbeiten`, titel: Object.values(det).some(Boolean) ? 'Hotel-Details bearbeiten' : 'Zimmer, Adresse, Telefon ergänzen', klasse: 'zeile--aktion' },
      ])) : ''}
      ${t.note ? `<p class="notiz">${zeilen(t.note).map(e).join('<br>')}</p>` : ''}
      ${abschnitt('', liste([
        { href: '#geld/liste', icon: 'geld', farbe: 'gruen', titel: 'Ausgaben an diesem Tag', wert: thb ? formatThb(thb) : '–' },
        { href: `#flug/neu/${d}`, icon: 'flug', farbe: 'indigo', titel: 'Flug hinzufügen' },
        { href: `#tag/${d}/bearbeiten`, icon: 'notiz', farbe: 'grau', titel: 'Tag bearbeiten', unter: 'Transport, Programm, Notiz … ändern' },
      ]))}
      <nav class="blaettern">
        ${vor ? `<a class="knopf knopf--leise" href="#tag/${vor.d}" data-ersetzen>‹ ${e(formatTag(vor.d))}</a>` : '<span></span>'}
        ${nach ? `<a class="knopf knopf--leise" href="#tag/${nach.d}" data-ersetzen>${e(formatTag(nach.d))} ›</a>` : '<span></span>'}
      </nav>`,
  };
}
