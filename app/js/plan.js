// Plan (Startseite): oben „Heute“ kompakt, darunter die ganze Reise auf einen Blick –
// als Übersicht (Spalten Unterwegs | Schlafen) oder als echte Tabelle wie in Excel.
import {
  TZ_DE, TZ_TH, uhrzeitIn, versatzStunden, plusTage, tageDiff, datumIn, formatTag,
  formatLang, countdown, reisePhase, tagLabel,
} from './zeit.js';
import { e, zeilen, ortInfo } from './ui.js';
import { liste, abschnitt, reiter, grosstitel, leer } from './bausteine.js';
import { ikon } from './ikonen.js';
import { alleAufgaben, anstehend, aufgabeZeile } from './aufgaben.js';
import { fluegeAm, unterkunftDetails } from './anpassungen.js';
import { flugZeile, hotelFotos } from './details.js';
import { stationen } from './reise.js';
import { gueltigeAusgaben, inEur, inThb, tagesbudgetEur, budgetStatus, STATUS_TEXT, formatThb, formatEur } from './ausgabenlogik.js';

const ANSICHTEN = [
  { href: '#plan', label: 'Übersicht' },
  { href: '#plan/tabelle', label: 'Tabelle' },
];

export function seitePlan(daten, eigene, jetzt, teile = []) {
  const ph = reisePhase(daten, jetzt);
  const tabelle = teile[0] === 'tabelle';
  const titel = daten?.reise?.titel || 'Thailand';
  if (!ph.tage.length) return { titel, html: grosstitel(titel) + leer('Kein Fahrplan vorhanden.') };
  const erster = ph.tage[0].d;
  const letzter = ph.tage[ph.tage.length - 1].d;
  return {
    titel,
    grosstitel: true,
    html: `
      ${grosstitel(titel, `${formatTag(erster).split(', ')[1]} – ${formatTag(letzter).split(', ')[1]} · ${tagLabel(ph, erster).gesamt} Tage vor Ort`)}
      ${heuteKarte(daten, ph, jetzt, eigene)}
      <section class="abschnitt">
        ${reiter(ANSICHTEN, tabelle ? '#plan/tabelle' : '#plan')}
        ${tabelle ? planTabelle(daten, ph, eigene) : planUebersicht(daten, ph, eigene)}
      </section>
      ${uhren(jetzt)}`,
  };
}

// ---------- Heute ----------

function infoZeile({ href, icon, label, titel, titelHtml, unter }) {
  return `
    <${href ? `a href="${e(href)}"` : 'div'} class="zeile infozeile">
      <span class="zeile__icon">${ikon(icon)}</span>
      <span class="zeile__text">
        ${label ? `<span class="infozeile__label">${e(label)}</span>` : ''}
        <span class="zeile__titel">${titelHtml ?? e(titel)}</span>
        ${unter ? `<span class="zeile__unter">${e(unter)}</span>` : ''}
      </span>
      ${href ? '<span class="zeile__pfeil" aria-hidden="true"></span>' : ''}
    </${href ? 'a' : 'div'}>`;
}

function heuteKarte(daten, ph, jetzt, eigene) {
  if (ph.phase === 'vorher') return vorher(daten, ph, jetzt, eigene);
  if (ph.phase === 'nachher') return nachher(ph, eigene);
  return unterwegs(daten, ph, jetzt, eigene);
}

function vorher(daten, ph, jetzt, eigene) {
  const naechste = anstehend(alleAufgaben(daten, eigene), jetzt).slice(0, 3);
  const c = ph.abflug ? countdown(ph.abflug, jetzt) : null;
  return `
    <section class="heutekarte" ${ph.abflug ? `data-cd="${e(ph.abflug.toISOString())}"` : ''}>
      <div class="heutekarte__kopf">
        <span class="marke">Vor der Reise</span>
        <span class="heutekarte__datum">${e(formatTag(datumIn(jetzt, TZ_DE)))}</span>
      </div>
      ${c ? `
      <p class="heutekarte__zahl"><span data-cd-teil="tage">${c.tage}</span><small data-cd-teil="tage-label">${c.tage === 1 ? 'Tag' : 'Tage'} bis Abflug</small></p>
      <p class="heutekarte__unter"><span data-cd-teil="uhr" class="tabellenzahl">––:––:––</span> · ${e(formatLang(ph.abflug, TZ_DE))} Uhr</p>` : ''}
      <div class="heutekarte__zeilen">
        ${naechste.map((a) => aufgabeZeile(a, jetzt)).join('')}
        <a class="zeile zeile--fuss" href="#aufgaben"><span class="zeile__text"><span class="zeile__titel">${naechste.length ? 'Alle Aufgaben' : 'Keine offenen Termine · Aufgaben'}</span></span><span class="zeile__pfeil" aria-hidden="true"></span></a>
      </div>
    </section>`;
}

function unterwegs(daten, ph, jetzt, eigene) {
  const t = ph.tag;
  const ort = ortVonTag(daten, ph.tage, t);
  const imLand = ph.label !== 'Abreisetag' && ph.label !== 'Heimreisetag';
  const schritte = zeilen(t?.tr);
  const stay = t?.stay && !/flieger/i.test(t.stay) ? t.stay : null;
  const det = stay ? unterkunftDetails(eigene, stay) : {};
  const fluege = fluegeAm(eigene, ph.datum);
  const morgenDatum = plusTage(ph.datum, 1);
  const morgen = ph.tage.find((x) => x.d === morgenDatum);

  const ausgaben = gueltigeAusgaben(eigene).filter((a) => a.d === ph.datum);
  const eur = ausgaben.reduce((s, a) => s + inEur(a), 0);
  const thb = ausgaben.reduce((s, a) => s + inThb(a), 0);
  const status = budgetStatus(eur, tagesbudgetEur(daten, eigene));

  const heuteDe = datumIn(jetzt, TZ_DE);
  const offen = anstehend(alleAufgaben(daten, eigene), jetzt);
  const bald = offen.filter((a) => a.faellig > jetzt && tageDiff(heuteDe, datumIn(a.faellig, TZ_DE)) <= 2).slice(0, 3);

  return `
    <section class="heutekarte" style="--ort:${ort.farbe}" ${ph.abflug && ph.abflug > jetzt ? `data-cd="${e(ph.abflug.toISOString())}"` : ''}>
      ${stay && hotelFotos(eigene, stay)[0] ? `<a class="heutekarte__bild" href="#unterkunft/${encodeURIComponent(stay)}"><img data-foto="${e(hotelFotos(eigene, stay)[0])}" alt=""></a>` : ''}
      <div class="heutekarte__kopf">
        <span class="marke">${e(ph.label)}</span>
        <span class="heutekarte__datum">${e(formatTag(ph.datum))}</span>
      </div>
      <h2 class="heutekarte__titel">${e(t?.t || 'Kein Eintrag für heute')}</h2>
      ${t?.prog && t.prog !== 'Reisetag' ? `<p class="heutekarte__unter">${e(zeilen(t.prog).join(' · '))}</p>` : ''}
      ${ph.abflug && ph.abflug > jetzt ? `<p class="heutekarte__unter">Abflug in <b data-cd-teil="uhr" class="tabellenzahl">––:––:––</b></p>` : ''}
      <div class="heutekarte__zeilen">
        ${schritte.length ? infoZeile({ href: `#tag/${ph.datum}`, icon: 'pin', label: 'Unterwegs', titelHtml: schritte.map(e).join('<br>') }) : ''}
        ${fluege.map((f) => {
          const z = flugZeile(f, jetzt);
          return infoZeile({ href: z.href, icon: 'flug', label: 'Flug', titel: z.titel, unter: [z.unter, z.wert].filter(Boolean).join(' · ') });
        }).join('')}
        ${stay ? infoZeile({ href: `#unterkunft/${encodeURIComponent(stay)}`, icon: 'bett', label: 'Schlafen', titel: stay, unter: [det.zimmer && `Zimmer ${det.zimmer}`, ...zeilen(t?.ci)].filter(Boolean).join(' · ') }) : ''}
        ${t?.note ? infoZeile({ icon: 'notiz', label: 'Notiz', titelHtml: zeilen(t.note).map(e).join('<br>') }) : ''}
        ${imLand ? infoZeile({ href: '#geld', icon: 'geld', label: 'Heute ausgegeben', titel: thb ? `${formatThb(thb)} · ${formatEur(eur)}` : 'Noch nichts', unter: thb ? STATUS_TEXT[status].text : 'Antippen zum Eintragen' }) : ''}
        ${morgen ? infoZeile({ href: `#tag/${morgenDatum}`, icon: 'kalender', label: 'Morgen', titel: morgen.t || ortInfo(daten, morgen.p).name, unter: zeilen(morgen.tr)[0] || (morgen.stay && morgen.stay !== t?.stay ? morgen.stay : '') }) : ''}
        ${bald.map((a) => aufgabeZeile(a, jetzt, ph.tz)).join('')}
      </div>
    </section>`;
}

function nachher(ph, eigene) {
  const eur = gueltigeAusgaben(eigene).reduce((s, a) => s + inEur(a), 0);
  return `
    <section class="heutekarte">
      <div class="heutekarte__kopf"><span class="marke">Reise beendet</span></div>
      <h2 class="heutekarte__titel">Willkommen zurück</h2>
      <div class="heutekarte__zeilen">
        ${infoZeile({ href: '#geld/statistik', icon: 'geld', label: 'Ausgaben vor Ort', titel: formatEur(eur) })}
        ${infoZeile({ href: '#daten', icon: 'speicher', label: 'Backup', titel: 'Backup mit Fotos speichern' })}
      </div>
    </section>`;
}

/** Countdown und Uhren jede Sekunde aktualisieren, ohne die Seite neu aufzubauen. */
export function aktualisiereTicker(root, jetzt) {
  for (const el of root.querySelectorAll('[data-cd]')) {
    const c = countdown(new Date(el.dataset.cd), jetzt);
    const setze = (teil, wert) => {
      const t = el.querySelector(`[data-cd-teil="${teil}"]`);
      if (t) t.textContent = wert;
    };
    const zwei = (n) => String(n).padStart(2, '0');
    setze('tage', c.tage);
    setze('tage-label', `${c.tage === 1 ? 'Tag' : 'Tage'} bis Abflug`);
    setze('uhr', `${zwei(c.stunden)}:${zwei(c.minuten)}:${zwei(c.sekunden)}`);
  }
  for (const el of root.querySelectorAll('[data-uhr]')) el.textContent = uhrzeitIn(jetzt, el.dataset.uhr);
}

function uhren(jetzt) {
  const diff = versatzStunden(jetzt, TZ_TH) - versatzStunden(jetzt, TZ_DE);
  return `
    <p class="uhrzeile">
      <span>Deutschland <b data-uhr="${TZ_DE}">${uhrzeitIn(jetzt, TZ_DE)}</b></span>
      <span>Thailand <b data-uhr="${TZ_TH}">${uhrzeitIn(jetzt, TZ_TH)}</b></span>
      <span>+${diff} Std.</span>
    </p>`;
}

// ---------- Alle Tage: Übersicht ----------

const istSchlafen = (stay) => stay && !/flieger/i.test(stay);

/** „Chaweng: Check-in 14:00“ → „Check-in 14:00“ (der Hotelname steht schon daneben). */
const ohneHotelname = (z) => z.replace(/^[^:]{1,24}:\s*(?=Check)/i, '');

/** Ortsfarbe eines Tages; Reisetage bekommen die Farbe des Ziels. */
function ortVonTag(daten, tage, t) {
  if (t?.p && t.p !== 'travel') return ortInfo(daten, t.p);
  const i = tage.indexOf(t);
  const ziel = tage.slice(i + 1).find((x) => x.p && x.p !== 'travel');
  return ziel && i >= 0 ? { ...ortInfo(daten, t?.p), farbe: ortInfo(daten, ziel.p).farbe } : ortInfo(daten, t?.p);
}

function datumTeile(d) {
  const [wt, dm] = formatTag(d).split(', ');
  return { wt: wt.replace('.', ''), tag: dm.split('.')[0], monat: Number(dm.split('.')[1]) };
}

function tagNummer(ph, d) {
  const m = /^Tag (\d+)/.exec(tagLabel(ph, d).label);
  return m ? m[1] : '';
}

function tagZeile(t, vorher, ph, daten, eigene) {
  const heute = t.d === ph.datum;
  const ort = ortVonTag(daten, ph.tage, t);
  const { wt, tag } = datumTeile(t.d);
  const schritte = zeilen(t.tr);
  const ablauf = schritte.length ? schritte : zeilen(t.prog).filter((x) => x !== 'Reisetag');
  const det = istSchlafen(t.stay) ? unterkunftDetails(eigene, t.stay) : {};
  const gleichesHotel = t.stay && vorher?.stay === t.stay;
  const schlafen = t.stay
    ? (gleichesHotel ? `<span class="gleich">″ ${e(t.stay)}</span>` : `<span>${e(t.stay)}${zeilen(t.ci).length ? ` · ${e(ohneHotelname(zeilen(t.ci).at(-1)))}` : ''}</span>`)
    : '';
  const flug = fluegeAm(eigene, t.d)[0];
  const nr = tagNummer(ph, t.d);
  const spalten = [
    ablauf.length || flug ? `<span class="tagz__spalte${t.stay ? '' : ' tagz__spalte--breit'}"><i>${schritte.length || flug ? 'Unterwegs' : 'Programm'}</i><span>${[flug ? `✈ ${flug.nummer || flug.airline || 'Flug'}${flug.abflug ? ` ${flug.abflug}` : ''}` : '', ...ablauf].filter(Boolean).map(e).join('<br>')}</span></span>` : '',
    t.stay ? `<span class="tagz__spalte${ablauf.length || flug ? '' : ' tagz__spalte--breit'}"><i>Schlafen${det.zimmer ? ` · Zi. ${e(det.zimmer)}` : ''}</i>${schlafen}</span>` : '',
  ].join('');

  return `
    <a class="tagz${heute ? ' tagz--heute' : ''}${t.d < ph.datum && ph.phase !== 'vorher' ? ' tagz--vorbei' : ''}" href="#tag/${t.d}" style="--ort:${ort.farbe}" ${heute ? 'data-heute' : ''}>
      <span class="tagz__datum"><small>${e(wt)}</small><b>${e(tag)}</b></span>
      <span class="tagz__inhalt">
        <span class="tagz__titel"><span>${e(t.t || ort.name)}</span>${heute ? '<em class="heute-marke">Heute</em>' : ''}${nr ? `<span class="tagz__nr">Tag ${e(nr)}</span>` : ''}</span>
        ${spalten ? `<span class="tagz__spalten">${spalten}</span>` : ''}
        ${t.note ? `<span class="tagz__notiz">${e(zeilen(t.note).join(' · '))}</span>` : ''}
      </span>
    </a>`;
}

function planUebersicht(daten, ph, eigene) {
  let vorher = null;
  return stationen(ph.tage).map((s) => {
    const ort = ortInfo(daten, s.p ?? 'travel');
    const eigeneTage = s.tage.filter((t) => t.p === s.p);
    const hotels = [...new Set(eigeneTage.map((t) => t.stay).filter(istSchlafen))];
    const von = s.tage[0].d;
    const bis = s.tage[s.tage.length - 1].d;
    const naechte = eigeneTage.filter((t) => istSchlafen(t.stay)).length;
    const zeilenHtml = s.tage.map((t) => {
      const z = tagZeile(t, vorher, ph, daten, eigene);
      vorher = t;
      return z;
    }).join('');
    return `
      <section class="etappe" style="--ort:${ort.farbe}">
        <header class="etappe__kopf">
          <span class="etappe__name"><span class="punkt"></span>${e(s.p ? ort.name : 'Unterwegs')}</span>
          <span class="etappe__zeit">${e(datumTeile(von).tag)}.${bis !== von ? `–${e(datumTeile(bis).tag)}.` : ''}${String(datumTeile(bis).monat).padStart(2, '0')}.${naechte ? ` · ${naechte} ${naechte === 1 ? 'Nacht' : 'Nächte'}` : ''}</span>
        </header>
        ${hotels.length ? `<p class="etappe__hotel">${ikon('bett')}${e(hotels.join(' · '))}</p>` : ''}
        <div class="karte">${zeilenHtml}</div>
      </section>`;
  }).join('') + abschnitt('', liste([
    { href: '#karte', icon: 'karte', farbe: 'gruen', titel: 'Route auf der Karte' },
    { href: '#fluege', icon: 'flug', farbe: 'indigo', titel: 'Flüge & Unterkünfte' },
  ]));
}

// ---------- Alle Tage: Tabelle ----------

function planTabelle(daten, ph, eigene) {
  let vorher = null;
  const zeilenHtml = ph.tage.map((t) => {
    const ort = ortInfo(daten, t.p);
    const { wt, tag, monat } = datumTeile(t.d);
    const gleich = t.stay && vorher?.stay === t.stay;
    const flug = fluegeAm(eigene, t.d).map((f) => `✈ ${[f.nummer || f.airline, f.von && f.nach ? `${f.von} → ${f.nach}` : '', f.abflug].filter(Boolean).join(' · ')}`);
    const z = `
      <tr data-href="#tag/${t.d}" class="${t.d === ph.datum ? 'ist-heute' : ''}${t.d < ph.datum && ph.phase !== 'vorher' ? ' ist-vorbei' : ''}" style="--ort:${ort.farbe}">
        <td class="tabelle__datum">${e(tag)}.${String(monat).padStart(2, '0')}.<small>${e(wt)}${tagNummer(ph, t.d) ? ` · T${e(tagNummer(ph, t.d))}` : ''}</small></td>
        <td class="tabelle__ort"><span class="punkt" style="--ort:${ort.farbe}"></span>${e(t.p && t.p !== 'travel' ? ort.name : 'Reisetag')}</td>
        <td class="tabelle__breit"><b>${e(t.t || '')}</b>${t.prog && t.prog !== 'Reisetag' ? `\n${e(t.prog)}` : ''}</td>
        <td class="tabelle__breit">${[...flug, ...zeilen(t.tr)].map(e).join('\n')}</td>
        <td>${gleich ? `<span class="gleich">″ ${e(t.stay)}</span>` : e(t.stay ?? '')}</td>
        <td>${zeilen(t.ci).map(e).join('\n')}</td>
        <td class="tabelle__breit">${e(t.note ?? '')}</td>
      </tr>`;
    vorher = t;
    return z;
  }).join('');
  return `
    <div class="tabelle-rahmen">
      <table class="tabelle">
        <thead><tr><th class="tabelle__datum">Datum</th><th>Ort</th><th>Programm</th><th>Transport</th><th>Unterkunft</th><th>Check-in/out</th><th>Notizen</th></tr></thead>
        <tbody>${zeilenHtml}</tbody>
      </table>
    </div>
    <p class="tabelle-hinweis">Zur Seite wischen für alle Spalten · Zeile antippen für Details · Handy quer = mehr Platz</p>`;
}
