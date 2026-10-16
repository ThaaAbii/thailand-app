// Reise: Stationen mit ihren Tagen, und eine Seite pro Tag (Ablauf, Flug, Unterkunft, Tagebuch).
import { reisePhase, tagLabel, formatTag } from './zeit.js';
import { e, ortInfo, zeilen } from './ui.js';
import { liste, karte, abschnitt, held, leer, kacheln } from './bausteine.js';
import { gueltigeAusgaben, inThb, formatThb } from './ausgabenlogik.js';
import { eintragVon } from './tagebuch.js';
import { fluegeAm, unterkunftDetails, gueltigeFluege, alleUnterkuenfte } from './anpassungen.js';
import { flugZeile, unterkunftZeilen } from './details.js';

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

function tagZeile(t, ph, daten) {
  const heute = t.d === ph.datum;
  const [wt, dm] = formatTag(t.d).split(', ');
  const ort = ortInfo(daten, t.p);
  const reisetag = !t.p || t.p === 'travel';
  return `
    <a class="zeile tagzeile${heute ? ' tagzeile--heute' : ''}${t.d < ph.datum ? ' tagzeile--vorbei' : ''}" href="#tag/${t.d}" ${heute ? 'data-heute' : ''}>
      <span class="tagzeile__datum"><small>${e(wt.replace('.', ''))}</small><b>${e(dm.split('.')[0])}</b></span>
      <span class="zeile__text">
        <span class="zeile__titel">${e(t.t || ort.name)}</span>
        <span class="zeile__unter">${heute ? '<b class="text-akzent">Heute</b> · ' : ''}${e(tagLabel(ph, t.d).label)}${reisetag && !/Abreise|Heimreise/.test(tagLabel(ph, t.d).label) ? ' · Reisetag' : ''}</span>
      </span>
      <span class="zeile__pfeil" aria-hidden="true"></span>
    </a>`;
}

export function seiteReise(daten, eigene, jetzt) {
  const ph = reisePhase(daten, jetzt);
  if (!ph.tage.length) return { titel: 'Reise', html: leer('Kein Fahrplan vorhanden.') };
  const erster = ph.tage[0].d;
  const letzter = ph.tage[ph.tage.length - 1].d;
  const fluege = gueltigeFluege(eigene).length;
  const hotels = alleUnterkuenfte(daten).length;

  const html = stationen(ph.tage).map((s) => {
    const ort = ortInfo(daten, s.p ?? 'travel');
    const hotel = s.tage.map((t) => t.stay).find((x) => x && !/flieger/i.test(x));
    const von = s.tage[0].d;
    const bis = s.tage[s.tage.length - 1].d;
    return `
      <section class="etappe" style="--ort:${ort.farbe}">
        <header class="etappe__kopf">
          <span class="etappe__name"><span class="punkt"></span>${e(s.p ? ort.name : 'Unterwegs')}</span>
          <span class="etappe__zeit">${e(formatTag(von).split(', ')[1])}${bis !== von ? ` – ${e(formatTag(bis).split(', ')[1])}` : ''}</span>
        </header>
        ${hotel ? `<p class="etappe__hotel">${e(hotel)}</p>` : ''}
        ${karte(s.tage.map((t) => tagZeile(t, ph, daten)).join(''))}
      </section>`;
  }).join('');

  return {
    titel: 'Reise',
    html: `
      ${held({ label: `${ph.tage.length} Tage · ${formatTag(erster).split(', ')[1]} – ${formatTag(letzter).split(', ')[1]}`, titel: daten?.reise?.titel || 'Reise' })}
      ${kacheln([
        { href: '#fluege', zahl: fluege || '–', label: fluege === 1 ? 'Flug' : 'Flüge' },
        { href: '#unterkuenfte', zahl: hotels, label: hotels === 1 ? 'Unterkunft' : 'Unterkünfte' },
      ])}
      ${html}
      ${abschnitt('', liste([{ href: '#karte', icon: '', titel: 'Route auf der Karte' }]))}`,
  };
}

export function seiteTag(daten, eigene, jetzt, d) {
  const ph = reisePhase(daten, jetzt);
  const i = ph.tage.findIndex((t) => t.d === d);
  const t = ph.tage[i];
  if (!t) return { titel: 'Tag', zurueck: '#reise', html: leer('Diesen Tag gibt es im Fahrplan nicht.') };
  const ort = ortInfo(daten, t.p);
  const stay = t.stay && !/flieger/i.test(t.stay) ? t.stay : null;
  const ausgaben = gueltigeAusgaben(eigene).filter((a) => a.d === d);
  const thb = ausgaben.reduce((s, a) => s + inThb(a), 0);
  const tb = eintragVon(eigene, d);
  const vor = ph.tage[i - 1];
  const nach = ph.tage[i + 1];
  const fluege = fluegeAm(eigene, d);
  const det = stay ? unterkunftDetails(eigene, stay) : {};
  const geaendert = !!eigene?.tagAenderungen?.[d];
  const schritte = zeilen(t.tr);
  const ci = zeilen(t.ci);

  const ablauf = [
    t.prog ? `<div class="info"><h3 class="info__titel">Programm</h3><p>${zeilen(t.prog).map(e).join('<br>')}</p></div>` : '',
    schritte.length ? `<div class="info"><h3 class="info__titel">Transport</h3><ul class="schritte">${schritte.map((x) => `<li>${e(x)}</li>`).join('')}</ul></div>` : '',
    ci.length ? `<div class="info"><h3 class="info__titel">Check-in / Check-out</h3><ul class="schritte schritte--leise">${ci.map((x) => `<li>${e(x)}</li>`).join('')}</ul></div>` : '',
  ].join('');

  const tagebuchVorschau = tb && (tb.text?.trim() || tb.fotos?.length || tb.stimmung)
    ? `<a class="tagebuch-vorschau" href="#tagebuch/${d}">
        <span class="tagebuch-vorschau__kopf"><span>Tagebuch</span>${tb.stimmung ? `<span aria-hidden="true">${e(tb.stimmung)}</span>` : ''}</span>
        ${tb.fotos?.length ? `<span class="tl__fotos">${tb.fotos.slice(0, 4).map((id) => `<img data-foto="${e(id)}" alt="">`).join('')}</span>` : ''}
        ${tb.text?.trim() ? `<span class="tl__text">${e(tb.text.trim())}</span>` : ''}
      </a>`
    : '';

  return {
    titel: formatTag(d),
    zurueck: '#reise',
    html: `
      ${held({
        label: `${tagLabel(ph, d).label} · ${formatTag(d, true)}`,
        titel: t.t || ort.name,
        unterHtml: t.p && t.p !== 'travel' ? `<span class="punkt" style="--ort:${ort.farbe}"></span>${e(ort.name)}${geaendert ? ' · <span class="leise">von dir bearbeitet</span>' : ''}` : (geaendert ? '<span class="leise">von dir bearbeitet</span>' : ''),
        farbe: ort.farbe,
      })}
      ${ablauf ? karte(ablauf, 'karte--text') : ''}
      ${fluege.length ? abschnitt('Flug', liste(fluege.map((f) => flugZeile(f, jetzt)))) : ''}
      ${stay ? abschnitt('Unterkunft', liste([
        { titelHtml: `<b>${e(stay)}</b>`, unter: [det.zimmer && `Zimmer ${det.zimmer}`, det.checkin && `Check-in ${det.checkin}`, det.checkout && `Check-out ${det.checkout}`].filter(Boolean).join(' · ') },
        ...unterkunftZeilen(stay, det, ort.name).filter((z) => z && !/^🚪|^🔑/.test(z.icon ?? '')),
        { href: `#unterkunft/${encodeURIComponent(stay)}/bearbeiten`, titel: Object.values(det).some(Boolean) ? 'Hotel-Details bearbeiten' : 'Zimmer, Adresse, Telefon ergänzen', klasse: 'zeile--aktion' },
      ])) : ''}
      ${t.note ? `<p class="notiz">${zeilen(t.note).map(e).join('<br>')}</p>` : ''}
      ${tagebuchVorschau ? abschnitt('', karte(tagebuchVorschau)) : ''}
      ${abschnitt('', liste([
        tagebuchVorschau ? null : { href: `#tagebuch/${d}`, titel: 'Tagebuch schreiben' },
        { href: '#geld/liste', titel: 'Ausgaben an diesem Tag', wert: thb ? formatThb(thb) : '–' },
        { href: `#flug/neu/${d}`, titel: 'Flug hinzufügen' },
        { href: `#tag/${d}/bearbeiten`, titel: 'Tag bearbeiten', unter: 'Transport, Programm, Notiz … ändern' },
      ]))}
      <nav class="blaettern">
        ${vor ? `<a class="knopf knopf--leise" href="#tag/${vor.d}" data-ersetzen>‹ ${e(formatTag(vor.d))}</a>` : '<span></span>'}
        ${nach ? `<a class="knopf knopf--leise" href="#tag/${nach.d}" data-ersetzen>${e(formatTag(nach.d))} ›</a>` : '<span></span>'}
      </nav>`,
  };
}
