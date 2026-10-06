// Notfall-Seite: Nummern zum Antippen, Versicherung, Botschaft, heutige Unterkunft.
import { reisePhase } from './zeit.js';
import { e, ortInfo } from './ui.js';
import { mapsLink } from './karte.js';

const BEKANNT = {
  touristenpolizei: { name: 'Touristenpolizei', info: 'Englischsprachig, rund um die Uhr', icon: '👮' },
  krankenwagen: { name: 'Krankenwagen / Rettung', info: 'Medizinischer Notfall', icon: '🚑' },
  polizei: { name: 'Polizei', info: 'Allgemeiner Polizei-Notruf', icon: '🚓' },
  feuerwehr: { name: 'Feuerwehr', info: '', icon: '🚒' },
  karteSperren: { name: 'Karte sperren', info: 'Sperr-Notruf für Bank- und Kreditkarten', icon: '💳' },
};

// Deutsche Botschaft Bangkok (Stand Oktober 2026 – vor der Reise auf auswaertiges-amt.de prüfen)
const BOTSCHAFT = {
  name: 'Deutsche Botschaft Bangkok',
  adresse: '9 South Sathorn Road, Bangkok 10120',
  telefon: '+66 2 287 9000',
  notfall: '+66 81 845 6224',
};

function telHref(nummer) {
  return `tel:${String(nummer).replace(/[^\d+]/g, '')}`;
}

function nummer(icon, name, info, num, gross = false) {
  return `
    <a class="notruf${gross ? ' notruf--gross' : ''}" href="${telHref(num)}">
      <span class="notruf__icon" aria-hidden="true">${icon}</span>
      <span class="notruf__text">
        <b>${e(name)}</b>
        <span class="notruf__nummer">${e(num)}</span>
        ${info ? `<small>${e(info)}</small>` : ''}
      </span>
      <span class="notruf__anruf" aria-hidden="true">📞</span>
    </a>`;
}

function name(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

export function seiteNotfall(daten, jetzt) {
  const n = daten?.notfall && typeof daten.notfall === 'object' ? daten.notfall : {};
  const eintraege = Object.entries(n).filter(([, v]) => typeof v === 'string' && /\d/.test(v));
  const v = daten?.versicherung ?? {};
  const versNummern = Object.entries(v).filter(([k, val]) => /notruf|telefon|hotline/i.test(k) && typeof val === 'string' && /\d{3}/.test(val));

  const ph = reisePhase(daten, jetzt);
  const tag = ph.phase === 'unterwegs' ? ph.tag : null;
  const stay = tag?.stay && !/flieger/i.test(tag.stay) ? tag.stay : null;
  const ort = tag ? ortInfo(daten, tag.p) : null;

  return { titel: 'Notfall', zurueck: '#mehr', html: `
    <p class="leise klein">Tippe auf eine Nummer, um direkt anzurufen.</p>

    <section class="abschnitt">
      <h2 class="label">Notrufe in Thailand</h2>
      <div class="notrufe">
        ${eintraege.map(([k, val], i) => {
          const b = BEKANNT[k] ?? { name: name(k), info: '', icon: '📞' };
          return nummer(b.icon, b.name, b.info, val, i === 0);
        }).join('') || '<p class="leise">Keine Nummern in den Reisedaten.</p>'}
      </div>
    </section>

    ${versNummern.length || v.stand ? `
    <section class="abschnitt">
      <h2 class="label">Reiseversicherung</h2>
      <div class="notrufe">
        ${versNummern.map(([k, val]) => nummer('🩺', /mdt/i.test(k) ? 'Versicherungs-Notruf (MDT)' : 'Versicherungs-Notruf', 'Bei Krankenhaus-Aufenthalt sofort anrufen', val)).join('')}
      </div>
      ${v.stand ? `<p class="leise klein">${e(v.stand)}</p>` : ''}
    </section>` : ''}

    <section class="abschnitt">
      <h2 class="label">${BOTSCHAFT.name}</h2>
      <div class="notrufe">
        ${nummer('🇩🇪', 'Botschaft (Öffnungszeiten)', 'Pass verloren, Festnahme, schwere Notlage', BOTSCHAFT.telefon)}
        ${nummer('🌙', 'Notfall außerhalb der Öffnungszeiten', 'Bereitschaftsdienst, keine Visafragen', BOTSCHAFT.notfall)}
      </div>
      <p class="klein">📍 ${e(BOTSCHAFT.adresse)}<br><a class="mehrlink" href="${mapsLink(`Deutsche Botschaft ${BOTSCHAFT.adresse}`)}" target="_blank" rel="noopener">In Google Maps öffnen ›</a></p>
      <p class="leise klein">Stand Oktober 2026 – vor der Abreise einmal auf auswaertiges-amt.de prüfen.</p>
    </section>

    ${stay ? `
    <section class="abschnitt" style="--ort:${ort.farbe}">
      <h2 class="label">Meine Unterkunft heute</h2>
      <p class="unterkunft-gross">${e(stay)}</p>
      <p class="leise">${e(ort.name)}</p>
      <a class="mehrlink" href="${mapsLink(`${stay} ${ort.name}`)}" target="_blank" rel="noopener">In Google Maps öffnen ›</a>
    </section>` : ''}

    <section class="abschnitt">
      <h2 class="label">Wenn etwas passiert</h2>
      <ul class="infoliste">
        <li><b>Unfall/Krankheit:</b> 1669 rufen, dann sofort die Versicherung informieren.</li>
        <li><b>Pass weg:</b> Anzeige bei der Touristenpolizei (1155), dann Botschaft.</li>
        <li><b>Karte weg:</b> sofort sperren (116 116) – Bargeld-Reserve getrennt aufbewahren.</li>
        <li><b>Im Thai-Spickzettel</b> unter „Gesundheit & Notfall“ stehen Sätze zum Zeigen.</li>
      </ul>
    </section>` };
}
