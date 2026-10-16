// Seiten zum Bearbeiten: Tag, Unterkunft, Flüge.
import { formatTag, formatKurz, formatLang, TZ_DE, TZ_TH } from './zeit.js';
import { e, ortInfo } from './ui.js';
import { liste, abschnitt, held, leer } from './bausteine.js';
import { neueId } from './listenlogik.js';
import { mapsLink } from './karte.js';
import {
  TAG_FELDER, UNTERKUNFT_FELDER, tagAenderung, gueltigeFluege, flugVorschlaege, flugName,
  checkinOeffnet, abflugZeit, flughafenZone, unterkunftDetails, alleUnterkuenfte,
} from './anpassungen.js';
import { fotoAufnehmen } from './tagebuch.js';
import { bordkarte, hotelKarte } from './visuell.js';
import { hotelInfo, hotelBilder, titelBild, hotelKopfzeile, hotelAbschnitte } from './hotel.js';
import { ikon } from './ikonen.js';

function feld(name, label, wert, { mehrzeilig = false, typ = 'text', platzhalter = '', extra = '' } = {}) {
  return `
    <label class="feld">
      <span>${e(label)}</span>
      ${mehrzeilig
        ? `<textarea class="eingabe textfeld textfeld--klein" name="${name}" rows="3" placeholder="${e(platzhalter)}" ${extra}>${e(wert ?? '')}</textarea>`
        : `<input class="eingabe" name="${name}" type="${typ}" value="${e(wert ?? '')}" placeholder="${e(platzhalter)}" ${extra}>`}
    </label>`;
}

// ---------- Tag bearbeiten ----------

export function seiteTagBearbeiten(original, aktuell, eigene, d) {
  const t = aktuell.tage.find((x) => x.d === d);
  const o = (original?.tage ?? []).find((x) => x.d === d);
  if (!t) return { titel: 'Bearbeiten', zurueck: '#plan', html: leer('Diesen Tag gibt es nicht.') };
  const geaendert = !!eigene?.tagAenderungen?.[d];
  return {
    titel: `${formatTag(d)} bearbeiten`,
    zurueck: `#tag/${d}`,
    html: `
      <div class="formular" data-tag-form="${e(d)}">
        <p class="leise klein">Ändere oder ergänze, was du willst. Mehrere Punkte bei Transport und Check-in einfach in neue Zeilen schreiben.</p>
        ${TAG_FELDER.map(([k, label, mehr]) => feld(k, label, t[k], { mehrzeilig: mehr, platzhalter: o?.[k] ? '' : 'leer' })).join('')}
        <button class="knopf knopf--haupt knopf--breit knopf--gross" data-aktion="tag-speichern">Speichern</button>
        ${geaendert ? '<button class="knopf knopf--leise knopf--breit knopf--gefahr" data-aktion="tag-zuruecksetzen">Auf Original aus reise-daten.json zurücksetzen</button>' : ''}
      </div>`,
  };
}

// ---------- Unterkunft ----------

/** Fotos eines Hotels (IDs im Foto-Speicher). */
export function hotelFotos(eigene, name) {
  const f = eigene?.hotelFotos?.[name];
  return Array.isArray(f) ? f.filter((x) => typeof x === 'string') : [];
}

export function seiteUnterkuenfte(daten, eigene) {
  const liste0 = alleUnterkuenfte(daten);
  return {
    titel: 'Unterkünfte',
    zurueck: '#mehr',
    html: liste0.length ? `<div class="hotelkarten">${liste0.map((u) => {
      const det = { ...hotelBasis(daten, u.name), ...unterkunftDetails(eigene, u.name) };
      const info = hotelInfo(daten, u.name);
      const unter = [info.bewertung?.note && `★ ${String(info.bewertung.note).replace('.', ',')}`, det.checkin && `Check-in ${det.checkin}`, det.zimmer && `Zimmer ${det.zimmer}`].filter(Boolean).join(' · ');
      return hotelKarte(u, ortInfo(daten, u.p), titelBild(daten, eigene, u.name), unter);
    }).join('')}</div>
      <p class="leise klein abstand-klein">Tippe auf ein Hotel, um Fotos, Adresse, Zimmer und Check-in-Zeiten zu ergänzen.</p>`
      : leer('Keine Unterkünfte im Fahrplan.'),
  };
}

/** Grunddaten aus dem Steckbrief (Reisedaten) – deine eigenen Angaben haben Vorrang. */
export function hotelBasis(daten, name) {
  const i = hotelInfo(daten, name);
  return Object.fromEntries(Object.entries({ adresse: i.adresse, telefon: i.telefon, checkin: i.checkin, checkout: i.checkout, zimmer: i.zimmer, mail: i.mail })
    .filter(([, v]) => typeof v === 'string' && v));
}

/** Kompakte Anzeige der Hotel-Details (für Tagesseite & Unterkunftsseite). */
export function unterkunftZeilen(name, det, ortName = '') {
  return [
    det.adresse ? { href: mapsLink(`${det.adresse}`), extern: true, icon: '📍', titel: det.adresse, unter: 'In Google Maps öffnen' }
      : { href: mapsLink(`${name} ${ortName}`), extern: true, icon: '📍', titel: 'In Google Maps öffnen' },
    det.telefon ? { href: `tel:${det.telefon.replace(/[^\d+]/g, '')}`, icon: '📞', titel: det.telefon, unter: 'Anrufen', pfeil: '' } : null,
    det.mail ? { href: `mailto:${det.mail}`, icon: 'beleg', titel: det.mail, unter: 'E-Mail ans Hotel', pfeil: '' } : null,
    det.zimmer ? { icon: '🚪', titel: `Zimmer ${det.zimmer}` } : null,
    det.checkin || det.checkout ? { icon: '🔑', titel: [det.checkin && `Check-in ${det.checkin}`, det.checkout && `Check-out ${det.checkout}`].filter(Boolean).join(' · ') } : null,
    det.buchung ? { icon: '🔖', titel: det.buchung, unter: 'Buchungsnummer' } : null,
    det.wlan ? { icon: '📶', titel: det.wlan, unter: 'WLAN' } : null,
    det.notiz ? { icon: '📝', titel: det.notiz } : null,
  ];
}

export function bilderSuche(name, ortName) {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${name} ${ortName} Hotel`)}`;
}

function galerie(daten, eigene, name) {
  const fotos = hotelFotos(eigene, name);
  const bilder = hotelBilder(hotelInfo(daten, name));
  const neu = `
    <label class="galerie__neu" aria-label="Fotos hinzufügen">
      <input type="file" id="hotel-foto" accept="image/*" multiple hidden data-hotel="${e(name)}">
      ${ikon('plus')}<span>${fotos.length ? 'Mehr Fotos' : 'Fotos hinzufügen'}</span>
      ${fotos.length || bilder.length ? '' : '<small>z. B. Screenshots von Booking oder eigene Bilder</small>'}
    </label>`;
  return `
    <div class="galerie${fotos.length || bilder.length ? '' : ' galerie--leer'}">
      ${bilder.map((src, i) => `<button class="galerie__bild" data-aktion="bild-zeigen" data-hotel="${e(name)}" data-nr="${i}" aria-label="Bild ansehen"><img src="${src}" alt=""></button>`).join('')}
      ${fotos.map((id) => `<button class="galerie__bild" data-aktion="foto-zeigen" data-id="${e(id)}" data-hotel="${e(name)}" aria-label="Foto ansehen"><img data-foto="${e(id)}" alt=""></button>`).join('')}
      ${neu}
    </div>
    ${fotos.length + bilder.length > 1 ? `<p class="galerie__hinweis">${fotos.length + bilder.length} Fotos · zur Seite wischen</p>` : ''}`;
}

export function seiteUnterkunft(daten, eigene, name, bearbeiten) {
  const u = alleUnterkuenfte(daten).find((x) => x.name === name);
  const det = unterkunftDetails(eigene, name);
  const ort = ortInfo(daten, u?.p);
  if (bearbeiten) {
    return {
      titel: 'Hotel-Details',
      zurueck: `#unterkunft/${encodeURIComponent(name)}`,
      html: `
        ${held({ label: u ? `${formatTag(u.von)} – ${formatTag(u.bis)}` : '', titel: name })}
        <div class="formular" data-unterkunft-form="${e(name)}">
          ${UNTERKUNFT_FELDER.map(([k, label, ph]) => feld(k, label, det[k], { platzhalter: ph, mehrzeilig: k === 'notiz' || k === 'adresse', typ: k === 'telefon' ? 'tel' : 'text' })).join('')}
          <button class="knopf knopf--haupt knopf--breit knopf--gross" data-aktion="unterkunft-speichern">Speichern</button>
        </div>`,
    };
  }
  const hatDetails = Object.values(det).some(Boolean);
  const info = hotelInfo(daten, name);
  const alles = { ...hotelBasis(daten, name), ...det };
  return {
    titel: 'Unterkunft',
    zurueck: '#unterkuenfte',
    html: `
      ${galerie(daten, eigene, name)}
      ${held({ label: u ? `${formatTag(u.von)} – ${formatTag(u.bis)} · ${u.naechte} ${u.naechte === 1 ? 'Nacht' : 'Nächte'}` : '', titel: name, unterHtml: u ? `<span class="punkt" style="--ort:${ort.farbe}"></span>${e(ort.name)}` : '' })}
      ${hotelKopfzeile(info)}
      ${abschnitt('', liste(unterkunftZeilen(name, { ...alles, checkin: info.checkin ? '' : alles.checkin, checkout: info.checkout ? '' : alles.checkout, zimmer: info.zimmer ? '' : alles.zimmer }, ort.name)))}
      ${hotelAbschnitte({ ...info, checkin: alles.checkin, checkout: alles.checkout, zimmer: alles.zimmer })}
      ${abschnitt('', liste([
        { href: `#unterkunft/${encodeURIComponent(name)}/bearbeiten`, icon: 'notiz', farbe: 'blau', titel: hatDetails ? 'Details bearbeiten' : 'Zimmer, Adresse, Telefon ergänzen' },
        { href: bilderSuche(name, ort.name), extern: true, icon: 'teilen', farbe: 'grau', titel: 'Fotos im Netz ansehen', unter: 'Öffnet die Google-Bildersuche' },
      ]))}`,
  };
}

// ---------- Flüge ----------

export function flugZeile(f, jetzt) {
  const status = { erledigt: 'eingecheckt', unnoetig: '–' }[f.checkin] ?? (() => {
    const ab = checkinOeffnet(f);
    if (!ab) return 'Check-in offen';
    return ab > jetzt ? `Check-in ab ${formatKurz(ab, TZ_DE)}` : 'Check-in offen';
  })();
  return {
    href: `#flug/${f.id}`,
    icon: '✈️',
    titel: `${flugName(f)}${f.von || f.nach ? ` · ${f.von || '?'} → ${f.nach || '?'}` : ''}`,
    unter: [formatTag(f.d), [f.abflug, f.ankunft].filter(Boolean).join(' – '), f.sitz && `Sitz ${f.sitz}`].filter(Boolean).join(' · '),
    wert: status,
    wertKlasse: status === 'Check-in offen' ? 'text-orange' : status === 'eingecheckt' ? 'text-gruen' : '',
  };
}

export function seiteFluege(daten, eigene, jetzt) {
  const fluege = gueltigeFluege(eigene);
  const vorschlaege = flugVorschlaege(daten, eigene);
  return {
    titel: 'Flüge',
    zurueck: '#mehr',
    html: `
      ${fluege.length ? `<div class="bordkarten">${fluege.map((f) => bordkarte(f, jetzt)).join('')}</div>` : leer('Noch keine Flüge eingetragen.')}
      ${vorschlaege.length ? abschnitt('Im Fahrplan gefunden', `<div class="bordkarten">${vorschlaege.map((v, i) => bordkarte(v, jetzt, { vorschlag: true, index: i })).join('')}</div>`) : ''}
      <a class="knopf knopf--breit" href="#flug/neu">Flug hinzufügen</a>`,
  };
}

export function seiteFlug(daten, eigene, jetzt, id, datum) {
  const neu = id === 'neu';
  const f = neu
    ? { id: neueId(), d: /^\d{4}-\d{2}-\d{2}$/.test(datum ?? '') ? datum : (daten?.tage?.[0]?.d ?? ''), checkin: 'offen', fotos: [] }
    : gueltigeFluege(eigene).find((x) => x.id === id);
  if (!f) return { titel: 'Flug', zurueck: '#fluege', html: leer('Diesen Flug gibt es nicht mehr.') };
  const ab = abflugZeit(f);
  const ci = checkinOeffnet(f);
  const zone = flughafenZone(f.von) === TZ_DE ? 'deutsche Zeit' : 'Thailand-Zeit';
  return {
    titel: neu ? 'Neuer Flug' : flugName(f),
    zurueck: '#fluege',
    html: `
      ${neu ? '' : held({ label: formatTag(f.d, true), titel: `${flugName(f)}${f.von && f.nach ? ` · ${f.von} → ${f.nach}` : ''}`, unter: ab ? `Abflug ${formatLang(ab, flughafenZone(f.von))} Uhr (${zone})` : '' })}
      <div class="formular" data-flug-form="${e(f.id)}" data-neu="${neu ? '1' : ''}">
        <h2 class="label">Online-Check-in</h2>
        <div class="segment" role="radiogroup" aria-label="Online-Check-in">
          ${[['offen', 'Noch offen'], ['erledigt', 'Erledigt'], ['unnoetig', 'Nicht nötig']].map(([w, t]) => `
            <label class="segment__teil"><input type="radio" name="checkin" value="${w}" ${(f.checkin ?? 'offen') === w ? 'checked' : ''}><span>${t}</span></label>`).join('')}
        </div>
        ${ci ? `<p class="leise klein abstand-klein">Öffnet ${e(formatLang(ci, TZ_DE))} Uhr (deutsche Zeit) · ${e(formatKurz(ci, TZ_TH))} in Thailand</p>` : ''}
        <div class="feldreihe">
          ${feld('checkinStunden', 'Öffnet … Std. vorher', f.checkinStunden, { typ: 'number', platzhalter: 'z. B. 24', extra: 'inputmode="numeric" min="1" max="72"' })}
          ${feld('sitz', 'Sitzplatz', f.sitz, { platzhalter: 'z. B. 23A' })}
        </div>

        <h2 class="label">Flug</h2>
        <div class="feldreihe">
          ${feld('nummer', 'Flugnummer', f.nummer, { platzhalter: 'z. B. PG191', extra: 'autocapitalize="characters"' })}
          ${feld('airline', 'Airline', f.airline, { platzhalter: 'z. B. Bangkok Airways' })}
        </div>
        ${feld('d', 'Datum', f.d, { typ: 'date' })}
        <div class="feldreihe">
          ${feld('von', 'Von', f.von, { platzhalter: 'BKK', extra: 'autocapitalize="characters" maxlength="4"' })}
          ${feld('nach', 'Nach', f.nach, { platzhalter: 'USM', extra: 'autocapitalize="characters" maxlength="4"' })}
        </div>
        <div class="feldreihe">
          ${feld('abflug', 'Abflug (Ortszeit)', f.abflug, { typ: 'time' })}
          ${feld('ankunft', 'Ankunft (Ortszeit)', f.ankunft, { typ: 'time' })}
        </div>
        <div class="feldreihe">
          ${feld('terminal', 'Terminal / Gate', f.terminal)}
          ${feld('gepaeck', 'Gepäck', f.gepaeck, { platzhalter: 'z. B. 20 kg' })}
        </div>
        ${feld('code', 'Buchungscode', f.code, { platzhalter: 'z. B. ABC123', extra: 'autocapitalize="characters"' })}
        ${feld('notiz', 'Notiz', f.notiz, { mehrzeilig: true })}

        ${neu ? '' : `
        <h2 class="label">Bordkarte / Dokumente</h2>
        <div class="fotoraster">
          ${(f.fotos ?? []).map((fid) => `<button class="foto" data-aktion="foto-zeigen" data-id="${e(fid)}" data-flug="${e(f.id)}" aria-label="Bild ansehen"><img data-foto="${e(fid)}" alt=""></button>`).join('')}
          <label class="foto foto--neu" aria-label="Bordkarte hinzufügen">
            <input type="file" id="flug-foto" accept="image/*" multiple hidden data-flug="${e(f.id)}">
            <span>+<small>Bild</small></span>
          </label>
        </div>
        <p class="leise klein abstand-klein">z. B. Screenshot der Bordkarte – funktioniert auch offline.</p>`}

        <button class="knopf knopf--haupt knopf--breit knopf--gross" data-aktion="flug-speichern">Speichern</button>
        ${neu ? '' : '<button class="knopf knopf--leise knopf--breit knopf--gefahr" data-aktion="flug-loeschen">Flug löschen</button>'}
      </div>`,
  };
}

// ---------- Bedienung ----------

function werte(form) {
  const aus = {};
  for (const el of form.querySelectorAll('[name]')) {
    if (el.type === 'radio') {
      if (el.checked) aus[el.name] = el.value;
    } else {
      aus[el.name] = el.value;
    }
  }
  return aus;
}

function fluege(ctx) {
  if (!Array.isArray(ctx.state.eigene.fluege)) ctx.state.eigene.fluege = [];
  return ctx.state.eigene.fluege;
}

export const detailAktionen = {
  'bild-zeigen': (el, ctx) => {
    const src = hotelBilder(hotelInfo(ctx.daten(), el.dataset.hotel))[Number(el.dataset.nr)];
    if (!src) return;
    const ov = document.createElement('div');
    ov.className = 'fotoansicht';
    ov.innerHTML = `<img src="${src}" alt=""><div class="fotoansicht__leiste"><button class="knopf" data-fa="zu">Schließen</button></div>`;
    history.pushState({ foto: true }, '');
    window.addEventListener('popstate', () => ov.remove(), { once: true });
    ov.addEventListener('click', () => history.back());
    document.body.append(ov);
  },
  'tag-speichern': (el, ctx) => {
    const form = document.querySelector('[data-tag-form]');
    const d = form.dataset.tagForm;
    const original = (ctx.state.reise?.tage ?? []).find((t) => t.d === d);
    const aenderung = tagAenderung(original, werte(form));
    const e2 = ctx.state.eigene;
    e2.tagAenderungen ??= {};
    if (aenderung) e2.tagAenderungen[d] = aenderung;
    else delete e2.tagAenderungen[d];
    ctx.speichereEigene();
    ctx.vibriere();
    ctx.toast('Gespeichert ✓');
    ctx.zurueck(`#tag/${d}`);
  },
  'tag-zuruecksetzen': (el, ctx) => {
    if (!confirm('Deine Änderungen an diesem Tag verwerfen?')) return;
    const d = document.querySelector('[data-tag-form]').dataset.tagForm;
    delete ctx.state.eigene.tagAenderungen?.[d];
    ctx.speichereEigene();
    ctx.zurueck(`#tag/${d}`);
  },
  'unterkunft-speichern': (el, ctx) => {
    const form = document.querySelector('[data-unterkunft-form]');
    const name = form.dataset.unterkunftForm;
    const w = werte(form);
    const det = {};
    for (const [k] of UNTERKUNFT_FELDER) if (w[k]?.trim()) det[k] = w[k].trim().slice(0, 500);
    const e2 = ctx.state.eigene;
    e2.unterkuenfte ??= {};
    if (Object.keys(det).length) e2.unterkuenfte[name] = det;
    else delete e2.unterkuenfte[name];
    ctx.speichereEigene();
    ctx.vibriere();
    ctx.toast('Gespeichert ✓');
    ctx.zurueck(`#unterkunft/${encodeURIComponent(name)}`);
  },
  'flug-uebernehmen': (el, ctx) => {
    const v = flugVorschlaege(ctx.daten(), ctx.state.eigene)[Number(el.dataset.index)];
    if (!v) return;
    const f = { id: neueId(), ...v, checkin: 'offen', fotos: [] };
    fluege(ctx).push(f);
    ctx.speichereEigene();
    ctx.toast('Übernommen – ergänze Sitz, Buchungscode & Check-in');
    location.hash = `#flug/${f.id}`;
  },
  'flug-speichern': (el, ctx) => {
    const form = document.querySelector('[data-flug-form]');
    const w = werte(form);
    const id = form.dataset.flugForm;
    const daten = {
      d: /^\d{4}-\d{2}-\d{2}$/.test(w.d) ? w.d : '',
      nummer: (w.nummer ?? '').replace(/\s+/g, '').toUpperCase().slice(0, 10),
      airline: (w.airline ?? '').trim().slice(0, 60),
      von: (w.von ?? '').trim().toUpperCase().slice(0, 4),
      nach: (w.nach ?? '').trim().toUpperCase().slice(0, 4),
      abflug: w.abflug ?? '',
      ankunft: w.ankunft ?? '',
      terminal: (w.terminal ?? '').trim().slice(0, 40),
      sitz: (w.sitz ?? '').trim().toUpperCase().slice(0, 8),
      gepaeck: (w.gepaeck ?? '').trim().slice(0, 40),
      code: (w.code ?? '').trim().toUpperCase().slice(0, 20),
      notiz: (w.notiz ?? '').trim().slice(0, 1000),
      checkin: ['offen', 'erledigt', 'unnoetig'].includes(w.checkin) ? w.checkin : 'offen',
      checkinStunden: Number(w.checkinStunden) > 0 ? Math.min(72, Math.round(Number(w.checkinStunden))) : '',
    };
    if (!daten.d) {
      ctx.toast('Bitte ein Datum eintragen');
      return;
    }
    const liste0 = fluege(ctx);
    const f = liste0.find((x) => x.id === id);
    if (f) Object.assign(f, daten);
    else liste0.push({ id, fotos: [], ...daten });
    ctx.speichereEigene();
    ctx.vibriere();
    ctx.toast('Gespeichert ✓');
    ctx.zurueck('#fluege');
  },
  'flug-loeschen': (el, ctx) => {
    if (!confirm('Diesen Flug löschen?')) return;
    const id = document.querySelector('[data-flug-form]').dataset.flugForm;
    ctx.state.eigene.fluege = fluege(ctx).filter((f) => f.id !== id);
    ctx.speichereEigene();
    ctx.zurueck('#fluege');
  },
};

/** Check-in-Status direkt beim Antippen speichern; Bordkarten-Bilder hinzufügen. */
export async function detailAenderung(t, ctx) {
  const form = t.closest?.('[data-flug-form]');
  if (form && t.name === 'checkin' && !form.dataset.neu) {
    const f = fluege(ctx).find((x) => x.id === form.dataset.flugForm);
    if (f) {
      f.checkin = t.value;
      ctx.speichereEigene();
      ctx.vibriere();
      ctx.toast(t.value === 'erledigt' ? 'Check-in erledigt ✓' : 'Gespeichert');
    }
    return true;
  }
  if (t.id === 'hotel-foto' && t.files?.length) {
    const name = t.dataset.hotel;
    const e2 = ctx.state.eigene;
    e2.hotelFotos ??= {};
    const liste0 = hotelFotos(e2, name);
    ctx.toast('Fotos werden gespeichert …');
    for (const datei of t.files) {
      try { liste0.push(await fotoAufnehmen(datei, '')); } catch { /* übersprungen */ }
    }
    e2.hotelFotos[name] = liste0;
    await ctx.speichereEigene();
    ctx.dauerhaftAnfragen?.();
    ctx.toast('Gespeichert ✓');
    ctx.render();
    return true;
  }
  if (t.id === 'flug-foto' && t.files?.length) {
    const f = fluege(ctx).find((x) => x.id === t.dataset.flug);
    if (!f) return true;
    f.fotos ??= [];
    for (const datei of t.files) {
      try { f.fotos.push(await fotoAufnehmen(datei, f.d)); } catch { /* übersprungen */ }
    }
    await ctx.speichereEigene();
    ctx.toast('Gespeichert ✓');
    ctx.render();
    return true;
  }
  return false;
}
