// Ausgaben: Startseite mit Tagesbudget, eigene Seiten für Eintragen, Übersicht, Liste, Einstellungen.
import { reisePhase, thailandTage, formatTag, formatLang, TZ_DE } from './zeit.js';
import { e, ortInfo } from './ui.js';
import { liste, abschnitt, balken, leer } from './bausteine.js';
import { neueId } from './listenlogik.js';
import {
  kategorien, kategorieIcon, tagesbudgetEur, aktuellerKurs, parseBetrag, inEur, inThb,
  gueltigeAusgaben, summenNach, budgetStatus, STATUS_TEXT, ueberblick, ausgabenCsv,
  formatThb, formatEur, formatKurs,
} from './ausgabenlogik.js';

/** Für welches Datum wird standardmäßig eingetragen? Reisetag (Thailand-Zeit) bzw. heute. */
export function standardDatum(daten, jetzt) {
  return reisePhase(daten, jetzt).datum;
}

function ortFuer(daten, d) {
  return (daten?.tage ?? []).find((t) => t.d === d)?.p ?? '';
}

function ausgabeZeile(a) {
  return {
    href: `#geld/bearbeiten/${a.id}`,
    icon: kategorieIcon(a.kat),
    titel: a.notiz || a.kat,
    unter: a.notiz ? a.kat : '',
    wertHtml: `${a.waehrung === 'EUR' ? formatEur(a.betrag) : formatThb(a.betrag)}<small>${a.waehrung === 'EUR' ? formatThb(inThb(a)) : formatEur(inEur(a))}</small>`,
    wertKlasse: 'zeile__wert--geld',
    pfeil: '',
  };
}

export function seiteAusgaben(daten, eigene, jetzt, teile, ui) {
  const [unter, param] = teile;
  if (unter === 'neu') return formularSeite(daten, eigene, jetzt, null, ui);
  if (unter === 'bearbeiten') {
    const a = gueltigeAusgaben(eigene).find((x) => x.id === param);
    return a ? formularSeite(daten, eigene, jetzt, a, ui) : { titel: 'Ausgabe', zurueck: '#geld', html: leer('Diese Ausgabe gibt es nicht mehr.') };
  }
  if (unter === 'statistik') return statistikSeite(daten, eigene, jetzt);
  if (unter === 'liste') return listenSeite(daten, eigene);
  if (unter === 'einstellungen') return einstellungsSeite(daten, eigene);
  return startSeite(daten, eigene, jetzt);
}

// ---------- Start ----------

function startSeite(daten, eigene, jetzt) {
  const datum = standardDatum(daten, jetzt);
  const budget = tagesbudgetEur(daten, eigene);
  const kurs = aktuellerKurs(daten, eigene);
  const alle = gueltigeAusgaben(eigene);
  const heute = alle.filter((a) => a.d === datum);
  const eur = heute.reduce((s, a) => s + inEur(a), 0);
  const thb = heute.reduce((s, a) => s + inThb(a), 0);
  const status = budgetStatus(eur, budget);
  const rest = budget - eur;
  const ue = ueberblick(alle, thailandTage(daten), budget, datum);
  const zuletzt = [...alle].sort((x, y) => (y.d + (y.zeit ?? '')).localeCompare(x.d + (x.zeit ?? ''))).slice(0, 4);

  return {
    titel: 'Geld',
    html: `
      <section class="held">
        <p class="held__label">Heute · ${e(formatTag(datum))}</p>
        <h1 class="held__zahl">${formatThb(thb)}</h1>
        <p class="held__unter">${formatEur(eur)} von ${formatEur(budget)} · <span class="text-${status}">${STATUS_TEXT[status].text}</span></p>
        ${balken((eur / budget) * 100, status)}
        <p class="leise klein">${rest >= 0 ? `Noch ${formatThb(rest * kurs.wert)} frei` : `${formatThb(-rest * kurs.wert)} drüber`}</p>
      </section>
      <a class="knopf knopf--haupt knopf--breit knopf--gross" href="#geld/neu">Ausgabe eintragen</a>
      ${zuletzt.length ? abschnitt('Zuletzt', liste(zuletzt.map(ausgabeZeile))) : ''}
      ${abschnitt('', liste([
        { href: '#geld/statistik', icon: '📊', titel: 'Übersicht & Diagramme', wert: alle.length ? `Ø ${formatEur(ue.durchschnitt)}` : '' },
        { href: '#geld/liste', icon: '🧾', titel: 'Alle Einträge', wert: alle.length ? `${alle.length}` : '' },
        { href: '#geld/einstellungen', icon: '⚙️', titel: 'Kurs & Budget', wert: `1 € = ${formatKurs(kurs.wert)} ฿` },
      ]))}`,
  };
}

// ---------- Eintragen / Bearbeiten ----------

function formularSeite(daten, eigene, jetzt, a, ui) {
  const kats = kategorien(daten);
  const kurs = aktuellerKurs(daten, eigene);
  const neu = !a;
  const werte = neu
    ? { betrag: ui.betrag ?? '', waehrung: ui.waehrung === 'EUR' ? 'EUR' : 'THB', kat: kats.includes(ui.kategorie) ? ui.kategorie : kats[0], notiz: ui.notiz ?? '', d: ui.datum || standardDatum(daten, jetzt) }
    : { betrag: String(a.betrag).replace('.', ','), waehrung: a.waehrung === 'EUR' ? 'EUR' : 'THB', kat: a.kat, notiz: a.notiz ?? '', d: a.d };
  const katListe = [...new Set([...kats, werte.kat])].filter(Boolean);

  return {
    titel: neu ? 'Neue Ausgabe' : 'Ausgabe bearbeiten',
    zurueck: '#geld',
    html: `
      <div class="formular" data-ausgabe="${e(a?.id ?? '')}">
        <div class="betrag">
          <input id="ausgabe-betrag" class="betrag__feld" type="text" inputmode="decimal" autocomplete="off" placeholder="0" aria-label="Betrag" value="${e(werte.betrag)}" ${neu ? 'autofocus' : ''}>
          <div class="waehrung" role="radiogroup" aria-label="Währung">
            <label><input type="radio" name="waehrung" value="THB" ${werte.waehrung === 'THB' ? 'checked' : ''}><span>฿</span></label>
            <label><input type="radio" name="waehrung" value="EUR" ${werte.waehrung === 'EUR' ? 'checked' : ''}><span>€</span></label>
          </div>
        </div>
        <p class="leise klein" id="umrechnung">&nbsp;</p>

        <h2 class="label">Kategorie</h2>
        <div class="chips" role="radiogroup" aria-label="Kategorie">
          ${katListe.map((k) => `
            <label class="chip"><input type="radio" name="kategorie" value="${e(k)}" ${k === werte.kat ? 'checked' : ''}><span>${e(k)}</span></label>`).join('')}
        </div>

        <h2 class="label">Notiz</h2>
        <input id="ausgabe-notiz" class="eingabe eingabe--voll" type="text" maxlength="120" placeholder="optional, z. B. Pad Thai" value="${e(werte.notiz)}">

        <h2 class="label">Datum</h2>
        <input id="ausgabe-datum" class="eingabe eingabe--voll" type="date" value="${e(werte.d)}">

        <button class="knopf knopf--haupt knopf--breit knopf--gross" data-aktion="ausgabe-speichern">${neu ? 'Speichern' : 'Änderung speichern'}</button>
        ${neu ? '' : '<button class="knopf knopf--leise knopf--breit knopf--gefahr" data-aktion="ausgabe-loeschen">Ausgabe löschen</button>'}
        <p class="leise klein zentriert">Kurs: 1 € = ${formatKurs(kurs.wert)} ฿</p>
      </div>`,
  };
}

/** Live-Umrechnung unter dem Betragsfeld. */
export function aktualisiereUmrechnung(root, daten, eigene) {
  const feld = root.querySelector('#ausgabe-betrag');
  const ziel = root.querySelector('#umrechnung');
  if (!feld || !ziel) return;
  const betrag = parseBetrag(feld.value);
  const waehrung = root.querySelector('[name="waehrung"]:checked')?.value ?? 'THB';
  const kurs = aktuellerKurs(daten, eigene).wert;
  ziel.textContent = betrag
    ? (waehrung === 'EUR' ? `= ${formatThb(betrag * kurs)}` : `= ${formatEur(betrag / kurs)}`)
    : ' ';
}

// ---------- Übersicht ----------

function balkenListe(eintraege, gesamtMax, beschriftung, extra = () => '') {
  return `
    <ul class="balkenliste">
      ${eintraege.map((x) => `
        <li>
          <div class="balkenliste__kopf"><span>${beschriftung(x)}</span><span><b>${formatThb(x.thb)}</b> <span class="leise">${formatEur(x.eur)}</span></span></div>
          <div class="balkenliste__spur">
            <span class="balkenliste__wert" style="width:${Math.max(1, (x.eur / gesamtMax) * 100)}%"></span>
            ${extra(x)}
          </div>
        </li>`).join('')}
    </ul>`;
}

function statistikSeite(daten, eigene, jetzt) {
  const alle = gueltigeAusgaben(eigene);
  const budget = tagesbudgetEur(daten, eigene);
  const reiseTage = thailandTage(daten);
  if (!alle.length) return { titel: 'Übersicht', zurueck: '#geld', html: leer('Noch keine Ausgaben eingetragen.') };
  const ue = ueberblick(alle, reiseTage, budget, standardDatum(daten, jetzt));
  const proTag = summenNach(alle, (a) => a.d).sort((a, b) => b.key.localeCompare(a.key));
  const maxTag = Math.max(budget * 1.25, ...proTag.map((t) => t.eur));
  const proKat = summenNach(alle, (a) => a.kat || 'Sonstiges');
  const proOrt = summenNach(alle, (a) => a.p || '');
  const st = STATUS_TEXT[ue.status];
  return {
    titel: 'Übersicht',
    zurueck: '#geld',
    html: `
      <section class="held">
        <p class="held__label">Bisher ausgegeben</p>
        <h1 class="held__zahl">${formatEur(ue.gesamtEur)}</h1>
        <p class="held__unter">${formatThb(ue.gesamtThb)} · Ø ${formatEur(ue.durchschnitt)} pro Tag <span class="text-${ue.status}">· ${st.text}</span></p>
      </section>
      <div class="kennzahlen">
        <div><small>Budget Reise</small><b>${formatEur(ue.budgetGesamt)}</b><span class="leise klein">${reiseTage.length} × ${formatEur(budget)}</span></div>
        <div><small>Noch übrig</small><b class="${ue.restGesamt < 0 ? 'text-rot' : ''}">${formatEur(ue.restGesamt)}</b><span class="leise klein">für die Reise</span></div>
      </div>
      ${abschnitt('Pro Tag', `<p class="leise klein">Strich = Tagesbudget ${formatEur(budget)}</p>${balkenListe(proTag, maxTag,
        (x) => `<span class="punkt" style="--ort:var(--${budgetStatus(x.eur, budget)})"></span>${e(formatTag(x.key))}`,
        () => `<i class="balkenliste__marke" style="left:${(budget / maxTag) * 100}%"></i>`)}`)}
      ${abschnitt('Pro Kategorie', balkenListe(proKat, proKat[0].eur, (x) => e(x.key)))}
      ${abschnitt('Pro Ort', balkenListe(proOrt, proOrt[0].eur, (x) => e(x.key ? ortInfo(daten, x.key).name : 'Ohne Ort')))}`,
  };
}

// ---------- Alle Einträge ----------

function listenSeite(daten, eigene) {
  const alle = gueltigeAusgaben(eigene);
  if (!alle.length) return { titel: 'Alle Einträge', zurueck: '#geld', html: leer('Noch keine Ausgaben eingetragen.') };
  const nachTag = new Map();
  for (const a of [...alle].sort((x, y) => (y.d + (y.zeit ?? '')).localeCompare(x.d + (x.zeit ?? '')))) {
    if (!nachTag.has(a.d)) nachTag.set(a.d, []);
    nachTag.get(a.d).push(a);
  }
  return {
    titel: 'Alle Einträge',
    zurueck: '#geld',
    html: [...nachTag.entries()].map(([d, eintraege]) => {
      const summe = eintraege.reduce((s, a) => s + inThb(a), 0);
      const ort = ortInfo(daten, eintraege[0].p).name;
      return abschnitt(`${formatTag(d)}${ort ? ` · ${ort}` : ''}`, liste(eintraege.map(ausgabeZeile)), ` <span class="label__wert">${formatThb(summe)}</span>`);
    }).join(''),
  };
}

// ---------- Einstellungen ----------

function einstellungsSeite(daten, eigene) {
  const kurs = aktuellerKurs(daten, eigene);
  const budget = tagesbudgetEur(daten, eigene);
  const alle = gueltigeAusgaben(eigene);
  return {
    titel: 'Kurs & Budget',
    zurueck: '#geld',
    html: `
      ${abschnitt('Wechselkurs', `
        <div class="segment" role="radiogroup" aria-label="Wechselkurs">
          <label class="segment__teil"><input type="radio" name="kursModus" value="auto" ${kurs.quelle !== 'manuell' ? 'checked' : ''}><span>Automatisch</span></label>
          <label class="segment__teil"><input type="radio" name="kursModus" value="manuell" ${kurs.quelle === 'manuell' ? 'checked' : ''}><span>Selbst festlegen</span></label>
        </div>
        ${kurs.quelle === 'manuell' ? `
        <label class="feld feld--abstand"><span>Baht pro Euro</span>
          <input id="kurs-manuell" class="eingabe" type="text" inputmode="decimal" value="${e(formatKurs(kurs.wert))}">
        </label>` : `
        <p class="gross-text">1 € = ${formatKurs(kurs.wert)} ฿</p>
        <p class="leise klein">${kurs.quelle === 'auto'
          ? `Kurs der Europäischen Zentralbank${kurs.stand ? ` vom ${e(formatTag(kurs.stand))}` : ''}${eigene?.kursCache?.geholt ? `, geholt ${e(formatLang(new Date(eigene.kursCache.geholt), TZ_DE))} Uhr` : ''}.`
          : 'Standardwert – wird automatisch aktualisiert, sobald du online bist.'}
          Die App aktualisiert den Kurs von selbst (höchstens alle 12 Stunden). Jede Ausgabe merkt sich den Kurs von ihrem Tag.</p>
        <button class="knopf knopf--breit" data-aktion="kurs-holen">Jetzt aktualisieren</button>`}`)}
      ${abschnitt('Tagesbudget', `
        <label class="feld"><span>Euro pro Tag</span>
          <input id="tagesbudget" class="eingabe" type="text" inputmode="decimal" value="${e(formatKurs(budget))}">
        </label>`)}
      ${alle.length ? abschnitt('Export', '<button class="knopf knopf--breit" data-aktion="ausgaben-csv">Als Tabelle speichern (CSV)</button>') : ''}`,
  };
}

// ---------- Bedienung ----------
// ctx: { state, speichereEigene(), render(), toast(), jetzt(), holeKurs(), vibriere(), zurueck(), speichereDatei() }

function ausgabenListe(ctx) {
  if (!Array.isArray(ctx.state.eigene.ausgaben)) ctx.state.eigene.ausgaben = [];
  return ctx.state.eigene.ausgaben;
}

function einstellungen(ctx) {
  if (!ctx.state.eigene.einstellungen || typeof ctx.state.eigene.einstellungen !== 'object') ctx.state.eigene.einstellungen = {};
  return ctx.state.eigene.einstellungen;
}

/** Formularwerte merken, damit ein Neuzeichnen nichts löscht (nur für „Neue Ausgabe“). */
function merkeEingabe(ctx) {
  const root = document.getElementById('inhalt');
  if (root.querySelector('[data-ausgabe]')?.dataset.ausgabe) return;
  const ui = ctx.state.ausgabenUi;
  const wert = (sel) => root.querySelector(sel)?.value;
  ui.betrag = wert('#ausgabe-betrag') ?? ui.betrag;
  ui.notiz = wert('#ausgabe-notiz') ?? ui.notiz;
  ui.datum = wert('#ausgabe-datum') || ui.datum;
  ui.waehrung = wert('[name="waehrung"]:checked') ?? ui.waehrung;
  ui.kategorie = wert('[name="kategorie"]:checked') ?? ui.kategorie;
}

export const ausgabenAktionen = {
  'ausgabe-speichern': (el, ctx) => {
    const root = document.getElementById('inhalt');
    const form = root.querySelector('[data-ausgabe]');
    if (!form) return;
    const wert = (sel) => root.querySelector(sel)?.value ?? '';
    const betrag = parseBetrag(wert('#ausgabe-betrag'));
    if (!betrag) {
      ctx.toast('Bitte einen Betrag eingeben');
      root.querySelector('#ausgabe-betrag')?.focus();
      return;
    }
    const daten = ctx.state.reise;
    const kats = kategorien(daten);
    const d = /^\d{4}-\d{2}-\d{2}$/.test(wert('#ausgabe-datum')) ? wert('#ausgabe-datum') : standardDatum(daten, ctx.jetzt());
    const waehrung = wert('[name="waehrung"]:checked') === 'EUR' ? 'EUR' : 'THB';
    const kat = wert('[name="kategorie"]:checked') || kats[0];
    const notiz = wert('#ausgabe-notiz').trim().slice(0, 120);
    const id = form.dataset.ausgabe;
    if (id) {
      const a = ausgabenListe(ctx).find((x) => x.id === id);
      if (a) Object.assign(a, { betrag, waehrung, kat, notiz, p: d !== a.d ? ortFuer(daten, d) : a.p, d });
      ctx.toast('Geändert ✓');
    } else {
      ausgabenListe(ctx).push({
        id: neueId(), d, betrag, waehrung, kat, notiz,
        kurs: aktuellerKurs(daten, ctx.state.eigene).wert,
        p: ortFuer(daten, d),
        zeit: new Date().toISOString(),
      });
      // Kategorie und Währung für die nächste Eingabe merken, Betrag und Notiz leeren
      Object.assign(ctx.state.ausgabenUi, { betrag: '', notiz: '', datum: '', waehrung, kategorie: kat });
      ctx.toast(`Gespeichert: ${waehrung === 'EUR' ? formatEur(betrag) : formatThb(betrag)}`);
    }
    ctx.vibriere();
    ctx.speichereEigene();
    ctx.zurueck('#geld');
  },
  'ausgabe-loeschen': (el, ctx) => {
    if (!confirm('Diese Ausgabe löschen?')) return;
    const id = document.querySelector('[data-ausgabe]')?.dataset.ausgabe;
    ctx.state.eigene.ausgaben = ausgabenListe(ctx).filter((a) => a.id !== id);
    ctx.speichereEigene();
    ctx.toast('Gelöscht');
    ctx.zurueck('#geld');
  },
  'kurs-holen': async (el, ctx) => {
    const ok = await ctx.holeKurs(true);
    ctx.toast(ok ? 'Kurs aktualisiert ✓' : 'Kein Internet – Kurs bleibt wie er ist');
    ctx.render();
  },
  'ausgaben-csv': (el, ctx) => {
    const daten = ctx.state.reise;
    const csv = ausgabenCsv(gueltigeAusgaben(ctx.state.eigene), (p) => ortInfo(daten, p).name);
    ctx.speichereDatei(new File([csv], 'thailand-ausgaben.csv', { type: 'text/csv' }));
  },
};

/** Änderungen in Feldern der Ausgaben-Seiten. Gibt true zurück, wenn behandelt. */
export function ausgabenAenderung(t, ctx) {
  const einst = einstellungen(ctx);
  if (t.name === 'kursModus') {
    einst.kursModus = t.value;
    if (t.value === 'manuell' && !einst.kursManuell) einst.kursManuell = aktuellerKurs(ctx.state.reise, ctx.state.eigene).wert;
    ctx.speichereEigene();
    if (t.value === 'auto') ctx.holeKurs(false).then(() => ctx.render());
    ctx.render();
    return true;
  }
  if (t.id === 'kurs-manuell' || t.id === 'tagesbudget') {
    const n = parseBetrag(t.value);
    if (!n) {
      ctx.toast('Bitte eine gültige Zahl eingeben');
      return true;
    }
    if (t.id === 'kurs-manuell') einst.kursManuell = n;
    else einst.tagesbudget = n;
    ctx.speichereEigene();
    ctx.toast('Gespeichert ✓');
    ctx.render();
    return true;
  }
  if (t.name === 'waehrung' || t.name === 'kategorie' || t.id === 'ausgabe-datum') {
    merkeEingabe(ctx);
    if (t.name === 'kategorie') ctx.vibriere();
    aktualisiereUmrechnung(document.getElementById('inhalt'), ctx.state.reise, ctx.state.eigene);
    return true;
  }
  return false;
}

/** Tippen im Betrags-/Notizfeld merken. */
export function ausgabenEingabe(t, ctx) {
  if (t.id === 'ausgabe-betrag' || t.id === 'ausgabe-notiz') {
    merkeEingabe(ctx);
    if (t.id === 'ausgabe-betrag') aktualisiereUmrechnung(document.getElementById('inhalt'), ctx.state.reise, ctx.state.eigene);
    return true;
  }
  return false;
}
