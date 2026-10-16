// Reiseversicherung: das Wichtigste auf einen Blick, Leistungen, Schadenfall, Gepäck.
import { e } from './ui.js';
import { liste, abschnitt, reiter, held, leer } from './bausteine.js';
import { ikon } from './ikonen.js';

const BLAETTER = [
  { href: '#versicherung', label: 'Wichtig' },
  { href: '#versicherung/leistungen', label: 'Leistungen' },
  { href: '#versicherung/schaden', label: 'Schadenfall' },
  { href: '#versicherung/gepaeck', label: 'Gepäck' },
];

const tel = (n) => `tel:${String(n).replace(/[^\d+]/g, '')}`;
const arr = (x) => (Array.isArray(x) ? x.filter((y) => y && typeof y === 'object') : []);

/** Liste aus { titel, text } als ruhige Text-Gruppe. */
function textGruppe(eintraege, feld = 'text') {
  if (!eintraege.length) return '';
  return `<dl class="tipps">${eintraege.map((x) => `<div><dt>${e(x.titel)}</dt><dd>${e(x[feld] ?? '')}</dd>${x.grenze ? `<dd><b>${e(x.grenze)}</b></dd>` : ''}</div>`).join('')}</dl>`;
}

export function seiteVersicherung(daten, teile = []) {
  const v = daten?.versicherung && typeof daten.versicherung === 'object' ? daten.versicherung : {};
  const blatt = teile[0] ?? '';
  const titel = [v.anbieter, v.tarif].filter(Boolean).join(' ') || 'Reiseversicherung';
  const aktiv = blatt ? `#versicherung/${blatt}` : '#versicherung';

  let inhalt = '';
  if (blatt === 'leistungen') {
    inhalt = textGruppe(arr(v.leistungen)) || leer('Keine Leistungen hinterlegt.');
  } else if (blatt === 'schaden') {
    inhalt = arr(v.schadenfall).map((f) => abschnitt(f.titel, `<div class="karte karte--text"><div class="info"><h3 class="info__titel">Das musst du tun</h3><p>${e(f.tun ?? '')}</p></div>${f.brauchst ? `<div class="info"><h3 class="info__titel">Das brauchst du</h3><p>${e(f.brauchst)}</p></div>` : ''}</div>`)).join('')
      || leer('Kein Ablauf für den Schadenfall hinterlegt.');
  } else if (blatt === 'gepaeck') {
    const g = arr(v.gepaeck);
    const grenzen = arr(v.gepaeckGrenzen);
    inhalt = `
      ${grenzen.length ? abschnitt('Grenzen je Schadenfall', liste(grenzen.map((x) => ({ titel: x.titel, unter: x.text, wert: x.grenze })))) : ''}
      ${g.length ? abschnitt('Wo sind meine Sachen versichert?', liste(g.map((x) => ({
        punkt: x.gedeckt ? 'var(--gruen-voll)' : 'var(--rot-voll)',
        titel: x.titel,
        unter: x.text,
        wertHtml: x.gedeckt ? '<span class="status text-gruen">Ja</span>' : '<span class="status text-rot">Nein</span>',
      })))) : ''}`;
    if (!grenzen.length && !g.length) inhalt = leer('Keine Angaben zum Gepäck hinterlegt.');
  } else {
    const fakten = [['Beitrag', v.beitrag], ['Versicherungssumme', v.summe], ['Selbstbehalt', v.selbstbehalt], ['Laufzeit', v.laufzeit]].filter(([, x]) => x);
    inhalt = `
      ${fakten.length ? `<div class="fakten">${fakten.map(([k, x]) => `<div><small>${e(k)}</small><b>${e(x)}</b></div>`).join('')}</div>` : ''}
      ${v.notruf ? abschnitt('24h-Notruf weltweit', `
        <div class="notrufe">
          <a class="notruf notruf--gross" href="${tel(v.notruf)}">
            <span class="notruf__text"><b>Versicherungs-Notruf</b><span class="notruf__nummer">${e(v.notruf)}</span><small>Bei Krankenhaus, großer Behandlung, Tauchunfall, Verlust von Geld/Papieren</small></span>
            <span class="notruf__anruf">${ikon('telefon')}</span>
          </a>
        </div>
        <p class="leise klein">Im akuten Notfall zuerst Hilfe vor Ort rufen (Krankenwagen 1669), dann hier anrufen.</p>`) : ''}
      ${abschnitt('Daten & Kontakte', liste([
        v.schein ? { icon: 'etikett', titel: v.schein, unter: 'Versicherungsschein-Nr.' } : null,
        v.abgeschlossen ? { icon: 'kalender', titel: v.abgeschlossen, unter: 'Abgeschlossen' } : null,
        v.schadenMail ? { href: `mailto:${v.schadenMail}`, icon: 'beleg', titel: v.schadenMail, unter: 'Schaden per Mail melden', pfeil: '' } : null,
        v.schadenOnline ? { href: v.schadenOnline, extern: true, icon: 'teilen', titel: 'Schaden online melden', unter: v.schadenOnline.replace(/^https?:\/\//, '') } : null,
        v.service ? { href: tel(v.service), icon: 'telefon', titel: v.service, unter: 'Kundenservice', pfeil: '' } : null,
        v.makler ? { icon: 'person', titel: v.makler, unter: 'Vermittelt über' } : null,
      ]))}
      ${arr(v.regeln).length ? abschnitt('Die wichtigsten Regeln', textGruppe(arr(v.regeln))) : ''}
      ${arr(v.ausschluesse).length ? abschnitt('Hier zahlt sie nicht', textGruppe(arr(v.ausschluesse))) : ''}
      ${v.stand ? `<p class="leise klein abstand-klein">${e(v.stand)}</p>` : ''}`;
  }

  return {
    titel: 'Versicherung',
    zurueck: '#mehr',
    html: `
      ${held({ label: 'Reiseversicherung', titel })}
      ${reiter(BLAETTER, aktiv)}
      ${inhalt}`,
  };
}
