// Ausgaben-Tracker: schnell eintragen, Budget-Ampel, Auswertungen.
import { reisePhase, thailandTage, formatTag, formatLang, TZ_DE } from './zeit.js';
import { e, ortInfo } from './ui.js';
import { balken } from './bausteine.js';
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

function geld(eur, thb) {
  return `<b>${formatThb(thb)}</b> <span class="leise">${formatEur(eur)}</span>`;
}

/** Karte „Ausgaben heute“ – auch für die Heute-Seite. */
export function heuteKarte(daten, eigene, datum, { mitLink = false } = {}) {
  const budget = tagesbudgetEur(daten, eigene);
  const kurs = aktuellerKurs(daten, eigene).wert;
  const heute = gueltigeAusgaben(eigene).filter((a) => a.d === datum);
  const eur = heute.reduce((s, a) => s + inEur(a), 0);
  const thb = heute.reduce((s, a) => s + inThb(a), 0);
  const status = budgetStatus(eur, budget);
  const st = STATUS_TEXT[status];
  const rest = budget - eur;
  return `
    <section class="karte budgetkarte">
      <div class="gruppenkopf"><h2>Ausgaben ${e(formatTag(datum))}</h2><span class="status status--${status}">${st.icon} ${st.text}</span></div>
      <p class="budget__zahl">${geld(eur, thb)}</p>
      ${balken((eur / budget) * 100, status)}
      <p class="leise klein">${rest >= 0
        ? `Noch ${formatThb(rest * kurs)} (${formatEur(rest)}) von ${formatEur(budget)} Tagesbudget`
        : `${formatThb(-rest * kurs)} (${formatEur(-rest)}) über dem Tagesbudget von ${formatEur(budget)}`}</p>
      ${mitLink ? '<a class="knopf knopf--haupt" href="#ausgaben">＋ Ausgabe eintragen</a>' : ''}
    </section>`;
}

export function renderAusgaben(daten, eigene, jetzt, ui) {
  const kats = kategorien(daten);
  const kurs = aktuellerKurs(daten, eigene);
  const budget = tagesbudgetEur(daten, eigene);
  const alle = gueltigeAusgaben(eigene);
  const datum = ui.datum || standardDatum(daten, jetzt);
  const reiseTage = thailandTage(daten);
  const ue = ueberblick(alle, reiseTage, budget, standardDatum(daten, jetzt));
  const waehrung = ui.waehrung === 'EUR' ? 'EUR' : 'THB';
  const katAktiv = kats.includes(ui.kategorie) ? ui.kategorie : kats[0];

  const kursText = {
    auto: `automatisch (EZB${kurs.stand ? `, Stand ${e(formatTag(kurs.stand))}` : ''})`,
    manuell: 'von dir festgelegt',
    standard: 'Standardwert – wird automatisch aktualisiert, sobald du online bist',
  }[kurs.quelle];

  return `
    <h1 class="seitentitel">Ausgaben</h1>
    ${heuteKarte(daten, eigene, datum)}

    <section class="karte eingabe-karte">
      <h2>Neue Ausgabe</h2>
      <div class="betrag">
        <input id="ausgabe-betrag" class="betrag__feld" type="text" inputmode="decimal" autocomplete="off" placeholder="0" aria-label="Betrag" value="${e(ui.betrag ?? '')}">
        <div class="waehrung" role="radiogroup" aria-label="Währung">
          <label><input type="radio" name="waehrung" value="THB" ${waehrung === 'THB' ? 'checked' : ''}><span>฿</span></label>
          <label><input type="radio" name="waehrung" value="EUR" ${waehrung === 'EUR' ? 'checked' : ''}><span>€</span></label>
        </div>
      </div>
      <p class="leise klein" id="umrechnung">&nbsp;</p>
      <div class="chips" role="radiogroup" aria-label="Kategorie">
        ${kats.map((k) => `
          <label class="chip"><input type="radio" name="kategorie" value="${e(k)}" ${k === katAktiv ? 'checked' : ''}><span>${kategorieIcon(k)} ${e(k)}</span></label>`).join('')}
      </div>
      <input id="ausgabe-notiz" class="eingabe eingabe--voll" type="text" maxlength="120" placeholder="Notiz (optional), z. B. Pad Thai" value="${e(ui.notiz ?? '')}">
      <div class="knopfreihe">
        <label class="feld"><span>Datum</span><input id="ausgabe-datum" class="eingabe" type="date" value="${e(datum)}"></label>
        <button class="knopf knopf--haupt knopf--speichern" data-aktion="ausgabe-speichern">Speichern</button>
      </div>
      <p class="leise klein">Kurs: 1 € = ${formatKurs(kurs.wert)} ฿ · ${kursText}</p>
    </section>

    ${alle.length ? auswertung(daten, alle, ue, budget, reiseTage) : `
    <section class="karte"><p class="leise">Noch keine Ausgaben eingetragen. Tipp: gleich nach dem Bezahlen eintippen – dauert 5 Sekunden.</p></section>`}

    ${alle.length ? liste(daten, alle, kats, ui) : ''}

    <section class="karte" id="ausgaben-einstellungen">
      <h2>Einstellungen</h2>
      <div class="segment" role="radiogroup" aria-label="Wechselkurs">
        <label class="segment__teil"><input type="radio" name="kursModus" value="auto" ${kurs.quelle !== 'manuell' ? 'checked' : ''}><span>Kurs automatisch</span></label>
        <label class="segment__teil"><input type="radio" name="kursModus" value="manuell" ${kurs.quelle === 'manuell' ? 'checked' : ''}><span>Selbst festlegen</span></label>
      </div>
      ${kurs.quelle === 'manuell' ? `
      <label class="feld feld--abstand"><span>Baht pro Euro</span>
        <input id="kurs-manuell" class="eingabe" type="text" inputmode="decimal" value="${e(formatKurs(kurs.wert))}">
      </label>` : `
      <p class="klein">Aktuell: <b>1 € = ${formatKurs(kurs.wert)} ฿</b>${eigene?.kursCache?.geholt ? ` · zuletzt geholt ${e(formatLang(new Date(eigene.kursCache.geholt), TZ_DE))} Uhr` : ''}</p>
      <button class="knopf knopf--klein" data-aktion="kurs-holen">🔄 Jetzt aktualisieren</button>
      <p class="leise klein">Die App holt den Kurs der Europäischen Zentralbank automatisch, wenn du online bist (höchstens alle 12 Stunden). Offline wird der zuletzt geholte Kurs benutzt. Jede Ausgabe merkt sich den Kurs von ihrem Tag.</p>`}
      <label class="feld feld--abstand"><span>Tagesbudget in Euro</span>
        <input id="tagesbudget" class="eingabe" type="text" inputmode="decimal" value="${e(formatKurs(budget))}">
      </label>
      ${alle.length ? '<button class="knopf knopf--breit" data-aktion="ausgaben-csv">📊 Als Tabelle exportieren (CSV)</button>' : ''}
    </section>`;
}

function balkenListe(eintraege, gesamtMax, beschriftung, extra = () => '') {
  return `
    <ul class="balkenliste">
      ${eintraege.map((x) => `
        <li>
          <div class="balkenliste__kopf"><span>${beschriftung(x)}</span><span>${geld(x.eur, x.thb)}</span></div>
          <div class="balkenliste__spur">
            <span class="balkenliste__wert" style="width:${Math.max(1, (x.eur / gesamtMax) * 100)}%"></span>
            ${extra(x)}
          </div>
        </li>`).join('')}
    </ul>`;
}

function auswertung(daten, alle, ue, budget, reiseTage) {
  const proTag = summenNach(alle, (a) => a.d).sort((a, b) => b.key.localeCompare(a.key));
  const maxTag = Math.max(budget * 1.25, ...proTag.map((t) => t.eur));
  const proKat = summenNach(alle, (a) => a.kat || 'Sonstiges');
  const proOrt = summenNach(alle, (a) => a.p || '');
  const st = STATUS_TEXT[ue.status];
  return `
    <section class="karte">
      <h2>Überblick</h2>
      <div class="kennzahlen">
        <div><small>Gesamt</small><b>${formatEur(ue.gesamtEur)}</b><span class="leise klein">${formatThb(ue.gesamtThb)}</span></div>
        <div><small>Ø pro Tag</small><b>${formatEur(ue.durchschnitt)}</b><span class="status status--${ue.status} klein">${st.icon} ${st.text}</span></div>
        <div><small>Budget Reise</small><b>${formatEur(ue.budgetGesamt)}</b><span class="leise klein">${reiseTage.length} Tage × ${formatEur(budget)}</span></div>
        <div><small>Noch übrig</small><b class="${ue.restGesamt < 0 ? 'text-rot' : ''}">${formatEur(ue.restGesamt)}</b><span class="leise klein">für die ganze Reise</span></div>
      </div>
    </section>

    <details class="karte aufklapp" open>
      <summary>Pro Tag</summary>
      <p class="leise klein">Strich = Tagesbudget ${formatEur(budget)}</p>
      ${balkenListe(proTag, maxTag, (x) => {
        const s = budgetStatus(x.eur, budget);
        return `${STATUS_TEXT[s].icon} ${e(formatTag(x.key))}`;
      }, () => `<i class="balkenliste__marke" style="left:${(budget / maxTag) * 100}%"></i>`)}
    </details>

    <details class="karte aufklapp">
      <summary>Pro Kategorie</summary>
      ${balkenListe(proKat, proKat[0].eur, (x) => `${kategorieIcon(x.key)} ${e(x.key)}`)}
    </details>

    <details class="karte aufklapp">
      <summary>Pro Ort</summary>
      ${balkenListe(proOrt, proOrt[0].eur, (x) => e(x.key ? ortInfo(daten, x.key).name : 'Ohne Ort'))}
    </details>`;
}

function liste(daten, alle, kats, ui) {
  const nachTag = new Map();
  for (const a of [...alle].sort((x, y) => (y.d + (y.zeit ?? '')).localeCompare(x.d + (x.zeit ?? '')))) {
    if (!nachTag.has(a.d)) nachTag.set(a.d, []);
    nachTag.get(a.d).push(a);
  }
  const zeigeAlle = ui.alleZeigen;
  const tage = [...nachTag.entries()];
  const sichtbar = zeigeAlle ? tage : tage.slice(0, 3);
  return `
    <section class="karte">
      <h2>Einträge</h2>
      ${sichtbar.map(([d, eintraege]) => `
        <h3 class="tagkopf">${e(formatTag(d))} · ${e(ortInfo(daten, eintraege[0].p).name || '')}</h3>
        <ul class="ausgabenliste">
          ${eintraege.map((a) => (ui.bearbeiten === a.id ? `<li>${formular(a, kats)}</li>` : `
            <li class="ausgabe">
              <span class="ausgabe__icon" aria-hidden="true">${kategorieIcon(a.kat)}</span>
              <span class="ausgabe__text"><b>${e(a.notiz || a.kat)}</b>${a.notiz ? `<small>${e(a.kat)}</small>` : ''}</span>
              <span class="ausgabe__betrag">${a.waehrung === 'EUR' ? formatEur(a.betrag) : formatThb(a.betrag)}<small>${a.waehrung === 'EUR' ? formatThb(inThb(a)) : formatEur(inEur(a))}</small></span>
              <button class="icon-knopf" data-aktion="ausgabe-bearbeiten" data-id="${e(a.id)}" aria-label="Bearbeiten">✏️</button>
            </li>`)).join('')}
        </ul>`).join('')}
      ${tage.length > 3 && !zeigeAlle ? `<button class="knopf knopf--breit" data-aktion="ausgaben-alle">Alle ${tage.length} Tage anzeigen</button>` : ''}
    </section>`;
}

function formular(a, kats) {
  return `
    <div class="packform" data-ausgabe-form="${e(a.id)}">
      <label class="feld"><span>Betrag</span>
        <input class="eingabe" name="betrag" type="text" inputmode="decimal" value="${e(String(a.betrag).replace('.', ','))}">
      </label>
      <label class="feld"><span>Währung</span>
        <select class="eingabe" name="waehrung">
          <option value="THB" ${a.waehrung !== 'EUR' ? 'selected' : ''}>฿ Baht</option>
          <option value="EUR" ${a.waehrung === 'EUR' ? 'selected' : ''}>€ Euro</option>
        </select>
      </label>
      <label class="feld feld--breit"><span>Kategorie</span>
        <select class="eingabe" name="kat">
          ${[...new Set([...kats, a.kat])].filter(Boolean).map((k) => `<option ${k === a.kat ? 'selected' : ''}>${e(k)}</option>`).join('')}
        </select>
      </label>
      <label class="feld feld--breit"><span>Notiz</span>
        <input class="eingabe" name="notiz" maxlength="120" value="${e(a.notiz ?? '')}">
      </label>
      <label class="feld feld--breit"><span>Datum</span>
        <input class="eingabe" name="d" type="date" value="${e(a.d)}">
      </label>
      <div class="knopfreihe feld--breit">
        <button class="knopf knopf--haupt" data-aktion="ausgabe-aendern">Speichern</button>
        <button class="knopf" data-aktion="ausgabe-abbrechen">Abbrechen</button>
        <button class="knopf knopf--gefahr" data-aktion="ausgabe-loeschen">🗑️ Löschen</button>
      </div>
    </div>`;
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

// ---------- Bedienung ----------
// ctx: { state, speichereEigene(), render(), toast(), jetzt(), holeKurs(), vibriere() }

function ausgabenListe(ctx) {
  if (!Array.isArray(ctx.state.eigene.ausgaben)) ctx.state.eigene.ausgaben = [];
  return ctx.state.eigene.ausgaben;
}

function einstellungen(ctx) {
  if (!ctx.state.eigene.einstellungen || typeof ctx.state.eigene.einstellungen !== 'object') ctx.state.eigene.einstellungen = {};
  return ctx.state.eigene.einstellungen;
}

/** Formularwerte merken, damit ein Neuzeichnen nichts löscht. */
function merkeEingabe(ctx) {
  const root = document.getElementById('inhalt');
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
    merkeEingabe(ctx);
    const ui = ctx.state.ausgabenUi;
    const betrag = parseBetrag(ui.betrag);
    if (!betrag) {
      ctx.toast('Bitte einen Betrag eingeben');
      document.getElementById('ausgabe-betrag')?.focus();
      return;
    }
    const daten = ctx.state.reise;
    const d = /^\d{4}-\d{2}-\d{2}$/.test(ui.datum ?? '') ? ui.datum : standardDatum(daten, ctx.jetzt());
    const kats = kategorien(daten);
    ausgabenListe(ctx).push({
      id: neueId(),
      d,
      betrag,
      waehrung: ui.waehrung === 'EUR' ? 'EUR' : 'THB',
      kat: kats.includes(ui.kategorie) ? ui.kategorie : kats[0],
      notiz: (ui.notiz ?? '').trim().slice(0, 120),
      kurs: aktuellerKurs(daten, ctx.state.eigene).wert,
      p: ortFuer(daten, d),
      zeit: new Date().toISOString(),
    });
    ui.betrag = '';
    ui.notiz = '';
    ctx.speichereEigene();
    ctx.vibriere();
    ctx.toast(`Gespeichert: ${ui.waehrung === 'EUR' ? formatEur(betrag) : formatThb(betrag)}`);
    ctx.render();
  },
  'ausgabe-bearbeiten': (el, ctx) => {
    merkeEingabe(ctx);
    ctx.state.ausgabenUi.bearbeiten = el.dataset.id;
    ctx.render();
  },
  'ausgabe-abbrechen': (el, ctx) => {
    merkeEingabe(ctx);
    ctx.state.ausgabenUi.bearbeiten = null;
    ctx.render();
  },
  'ausgabe-loeschen': (el, ctx) => {
    if (!confirm('Diese Ausgabe löschen?')) return;
    merkeEingabe(ctx);
    const id = el.closest('[data-ausgabe-form]').dataset.ausgabeForm;
    ctx.state.eigene.ausgaben = ausgabenListe(ctx).filter((a) => a.id !== id);
    ctx.state.ausgabenUi.bearbeiten = null;
    ctx.speichereEigene();
    ctx.render();
  },
  'ausgabe-aendern': (el, ctx) => {
    const form = el.closest('[data-ausgabe-form]');
    const wert = (n) => form.querySelector(`[name="${n}"]`).value;
    const betrag = parseBetrag(wert('betrag'));
    if (!betrag) {
      ctx.toast('Bitte einen gültigen Betrag eingeben');
      return;
    }
    merkeEingabe(ctx);
    const a = ausgabenListe(ctx).find((x) => x.id === form.dataset.ausgabeForm);
    if (a) {
      const d = /^\d{4}-\d{2}-\d{2}$/.test(wert('d')) ? wert('d') : a.d;
      Object.assign(a, {
        betrag,
        waehrung: wert('waehrung') === 'EUR' ? 'EUR' : 'THB',
        kat: wert('kat'),
        notiz: wert('notiz').trim().slice(0, 120),
        d,
        p: d !== a.d ? ortFuer(ctx.state.reise, d) : a.p,
      });
    }
    ctx.state.ausgabenUi.bearbeiten = null;
    ctx.speichereEigene();
    ctx.render();
  },
  'ausgaben-alle': (el, ctx) => {
    merkeEingabe(ctx);
    ctx.state.ausgabenUi.alleZeigen = true;
    ctx.render();
  },
  'kurs-holen': async (el, ctx) => {
    merkeEingabe(ctx);
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

/** Änderungen in Feldern der Ausgaben-Seite. Gibt true zurück, wenn behandelt. */
export function ausgabenAenderung(t, ctx) {
  const einst = einstellungen(ctx);
  if (t.name === 'kursModus') {
    merkeEingabe(ctx);
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
    merkeEingabe(ctx);
    if (t.id === 'kurs-manuell') einst.kursManuell = n;
    else einst.tagesbudget = n;
    ctx.speichereEigene();
    ctx.render();
    return true;
  }
  if (t.id === 'ausgabe-datum') {
    merkeEingabe(ctx);
    ctx.render();
    return true;
  }
  if (t.name === 'waehrung' || t.name === 'kategorie') {
    merkeEingabe(ctx);
    if (t.name === 'kategorie') ctx.vibriere();
    aktualisiereUmrechnung(document.getElementById('inhalt'), ctx.state.reise, ctx.state.eigene);
    return true;
  }
  return false;
}
