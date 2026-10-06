// Fahrplan: ruhige Liste aller Tage, Details auf einer eigenen Seite pro Tag.
import { reisePhase, tagLabel, formatTag, plusTage } from './zeit.js';
import { e, ortInfo, zeilen } from './ui.js';
import { liste, abschnitt, held, zeile, leer } from './bausteine.js';
import { mapsLink } from './karte.js';
import { gueltigeAusgaben, inThb, formatThb } from './ausgabenlogik.js';
import { eintragVon } from './tagebuch.js';

export function seitePlan(daten, eigene, jetzt) {
  const ph = reisePhase(daten, jetzt);
  if (!ph.tage.length) return { titel: 'Fahrplan', html: leer('Kein Fahrplan vorhanden.') };

  // Tage in Abschnitte nach Ort gliedern (Reisetage gehören zum nächsten Ort)
  const abschnitte = [];
  let aktuell = null;
  for (const t of ph.tage) {
    const p = t.p && t.p !== 'travel' ? t.p : null;
    if (!aktuell || (p && aktuell.p && p !== aktuell.p) || (p && !aktuell.p)) {
      if (aktuell && !aktuell.p && p) {
        aktuell.p = p;
      } else {
        aktuell = { p, tage: [] };
        abschnitte.push(aktuell);
      }
    }
    aktuell.tage.push(t);
  }

  const html = abschnitte.map((a) => {
    const ort = ortInfo(daten, a.p ?? 'travel');
    const titel = a.p ? ort.name : 'Reise';
    return `
      <section class="abschnitt">
        <h2 class="label label--ort" style="--ort:${ort.farbe}">${e(titel)}</h2>
        <div class="liste">
          ${a.tage.map((t) => {
            const heute = t.d === ph.datum;
            const [wt, dm] = formatTag(t.d).split(', ');
            const tOrt = ortInfo(daten, t.p);
            return `
              <a class="lz tagzeile${heute ? ' tagzeile--heute' : ''}${t.d < ph.datum ? ' tagzeile--vorbei' : ''}" href="#tag/${t.d}" ${heute ? 'data-heute' : ''} style="--ort:${tOrt.farbe}">
                <span class="tagzeile__datum"><small>${e(wt)}</small><b>${e(dm.replace(/\.$/, '').split('.')[0])}</b></span>
                <span class="lz__text">
                  <span class="lz__titel">${heute ? '<span class="pille">Heute</span> ' : ''}${e(t.t || tOrt.name)}</span>
                  <span class="lz__unter">${e(tagLabel(ph, t.d).label)}${t.tr ? ' · 🚐' : ''}</span>
                </span>
                <span class="lz__pfeil" aria-hidden="true">›</span>
              </a>`;
          }).join('')}
        </div>
      </section>`;
  }).join('');

  return { titel: 'Fahrplan', html };
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
  const tb = eintragVon(eigene, d);
  const vor = ph.tage[i - 1];
  const nach = ph.tage[i + 1];

  return {
    titel: formatTag(d),
    zurueck: '#plan',
    html: `
      ${held({
        label: `${tagLabel(ph, d).label} · ${formatTag(d, true)}`,
        titel: t.t || ort.name,
        unterHtml: t.p && t.p !== 'travel' ? `<span class="punkt" style="--ort:${ort.farbe}"></span>${e(ort.name)}` : '',
        farbe: ort.farbe,
      })}
      ${zeile('', 'Programm', t.prog)}
      ${zeilen(t.tr).length ? abschnitt('Transport', `<ul class="schritte">${zeilen(t.tr).map((x) => `<li>${e(x)}</li>`).join('')}</ul>`) : ''}
      ${zeile('', 'Unterkunft', t.stay)}
      ${zeile('', 'Check-in / Check-out', t.ci, true)}
      ${t.note ? `<p class="notiz">📝 ${zeilen(t.note).map(e).join('<br>')}</p>` : ''}
      ${abschnitt('', liste([
        stay ? { href: mapsLink(`${stay} ${ort.name}`), extern: true, icon: '📍', titel: 'Unterkunft in Google Maps' } : null,
        { href: '#ausgaben/liste', icon: '💸', titel: 'Ausgaben', wert: thb ? formatThb(thb) : '–' },
        { href: `#tagebuch/${d}`, icon: tb?.stimmung || '📔', titel: tb?.text || tb?.fotos?.length ? 'Tagebuch-Eintrag' : 'Tagebuch schreiben' },
      ]))}
      <nav class="blaettern">
        ${vor ? `<a class="knopf" href="#tag/${vor.d}" data-ersetzen>‹ ${e(formatTag(vor.d))}</a>` : '<span></span>'}
        ${nach ? `<a class="knopf" href="#tag/${nach.d}" data-ersetzen>${e(formatTag(nach.d))} ›</a>` : '<span></span>'}
      </nav>`,
  };
}

export { plusTage };
