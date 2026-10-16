// Aufgaben: Fristen, Checkliste und Online-Check-ins in einer Liste – alles abhakbar.
import { TZ_DE, parseZeit, restText, fristStufe, formatKurz, tageDiff, datumIn, zeitInZoneTag } from './zeit.js';
import { e } from './ui.js';
import { karte, abschnitt, held, leer, balken } from './bausteine.js';
import { checklistenGruppen, neueId } from './listenlogik.js';

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim();

/** Gleiche Aufgabe? Alle Wörter der kürzeren (mind. 2) kommen in der längeren vor. */
function gleicheAufgabe(a, b) {
  const x = norm(a).split(' ').filter(Boolean);
  const y = norm(b).split(' ').filter(Boolean);
  const [kurz, lang] = x.length <= y.length ? [x, y] : [y, x];
  return kurz.length >= 2 && kurz.every((w) => lang.includes(w));
}

/**
 * Alle Aufgaben. Jede: { key, art, titel, notiz, gruppe, faellig (Date|null), wichtig, erledigt, eigen, id }
 * - Fristen (aus den Reisedaten + offene Online-Check-ins deiner Flüge)
 * - Checklisten-Punkte (aus den Reisedaten + eigene, optional mit Datum)
 * Doppelte (gleiche Frist und gleicher Checklisten-Punkt) werden zusammengelegt.
 */
export function alleAufgaben(daten, eigene) {
  const fertig = eigene?.fristErledigt ?? {};
  const punkte = checklistenGruppen(daten, eigene).flatMap((g) => g.punkte.map((p) => ({ ...p, gruppe: g.gruppe })));
  const aufgaben = punkte.map((p) => ({
    key: p.key,
    art: 'check',
    titel: p.text,
    notiz: p.notiz,
    gruppe: p.gruppe,
    faellig: p.faellig ? zeitInZoneTag(p.faellig) : null,
    wichtig: false,
    erledigt: p.erledigt,
    eigen: p.eigen,
    id: p.id,
  }));

  for (const f of Array.isArray(daten?.fristen) ? daten.fristen : []) {
    const zeit = parseZeit(f?.t);
    if (!zeit || !f.w) continue;
    const zwilling = aufgaben.find((a) => a.art === 'check' && !a.faellig && gleicheAufgabe(a.titel, f.w));
    if (zwilling) {
      zwilling.faellig = zeit;
      zwilling.notiz = [zwilling.notiz, f.h].filter(Boolean).join(' · ');
      zwilling.wichtig = f.s === 'crit';
      continue;
    }
    const key = f.flug ? `flug:${f.flug}` : `frist:${f.t}|${f.w}`;
    aufgaben.push({
      key,
      art: f.flug ? 'checkin' : 'frist',
      titel: f.w,
      notiz: f.h ?? '',
      gruppe: 'Termine',
      faellig: zeit,
      wichtig: f.s === 'crit',
      erledigt: !!fertig[key],
      eigen: false,
    });
  }
  return aufgaben;
}

/**
 * Offene Aufgaben mit Termin, sortiert.
 * Reine Termine (Fristen, Check-ins) verschwinden, sobald sie vorbei sind;
 * echte To-dos mit Datum bleiben als „überfällig“ stehen, bis sie abgehakt sind.
 */
export function anstehend(aufgaben, jetzt) {
  return aufgaben
    .filter((a) => !a.erledigt && a.faellig && (a.faellig > jetzt || a.art === 'check'))
    .sort((a, b) => a.faellig - b.faellig);
}

export function zaehle(aufgaben) {
  const erledigt = aufgaben.filter((a) => a.erledigt).length;
  return { gesamt: aufgaben.length, erledigt, offen: aufgaben.length - erledigt, prozent: aufgaben.length ? Math.round((erledigt / aufgaben.length) * 100) : 0 };
}

const PUNKTFARBE = { rot: 'var(--rot)', orange: 'var(--orange)', gruen: 'var(--gruen)', vorbei: 'var(--rot)' };

/** Eine abhakbare Aufgaben-Zeile. */
export function aufgabeZeile(a, jetzt, tz = TZ_DE, mitNotiz = false) {
  const stufe = a.faellig ? fristStufe(a.faellig, jetzt, tz) : null;
  const termin = a.faellig
    ? (a.faellig <= jetzt ? 'überfällig' : restText(a.faellig, jetzt, tz))
    : '';
  const unter = [a.faellig ? formatKurz(a.faellig, tz) : '', mitNotiz || !a.faellig ? a.notiz : ''].filter(Boolean).join(' · ');
  return `
    <label class="zeile zeile--check${a.erledigt ? ' ist-erledigt' : ''}">
      <input type="checkbox" data-aufgabe="${e(a.key)}" ${a.erledigt ? 'checked' : ''} aria-label="${e(a.titel)} erledigt">
      <span class="zeile__text">
        <span class="zeile__titel">${a.wichtig ? '<span class="wichtig" title="wichtig"></span>' : ''}${e(a.titel)}</span>
        ${unter ? `<span class="zeile__unter">${e(unter)}</span>` : ''}
      </span>
      ${termin && !a.erledigt ? `<span class="zeile__wert"><span class="punkt" style="--ort:${PUNKTFARBE[stufe]}"></span>${e(termin)}</span>` : ''}
      ${a.eigen ? `<button class="zeile__klein" type="button" data-aktion="aufgabe-loeschen" data-id="${e(a.id)}" aria-label="Löschen">×</button>` : ''}
    </label>`;
}

// ---------- Seiten ----------

export function seiteAufgaben(daten, eigene, jetzt, teile, { ausblenden }) {
  const aufgaben = alleAufgaben(daten, eigene);
  const [unter, param] = teile;
  if (unter === 'gruppe') return gruppenSeite(aufgaben, param, jetzt, ausblenden);
  if (unter === 'erledigt') return erledigtSeite(aufgaben, jetzt);
  if (unter === 'neu') return neuSeite(aufgaben, param);

  const z = zaehle(aufgaben);
  const termine = anstehend(aufgaben, jetzt);
  const heute = datumIn(jetzt, TZ_DE);
  const ueberfaellig = termine.filter((a) => a.faellig <= jetzt);
  const bald = termine.filter((a) => a.faellig > jetzt && tageDiff(heute, datumIn(a.faellig, TZ_DE)) <= 7);
  const spaeter = termine.filter((a) => a.faellig > jetzt && tageDiff(heute, datumIn(a.faellig, TZ_DE)) > 7);

  const gruppen = [];
  for (const a of aufgaben.filter((x) => x.art === 'check')) {
    let g = gruppen.find((x) => x.name === a.gruppe);
    if (!g) gruppen.push(g = { name: a.gruppe, liste: [] });
    g.liste.push(a);
  }

  return {
    titel: 'Aufgaben',
    html: `
      ${held({ label: 'Aufgaben', titel: `${z.offen} offen`, unter: `${z.erledigt} von ${z.gesamt} erledigt` })}
      ${balken(z.prozent)}
      ${ueberfaellig.length ? abschnitt('Überfällig', karte(ueberfaellig.map((a) => aufgabeZeile(a, jetzt)).join(''))) : ''}
      ${bald.length ? abschnitt('Nächste 7 Tage', karte(bald.map((a) => aufgabeZeile(a, jetzt)).join(''))) : ''}
      ${spaeter.length ? abschnitt('Später', karte(spaeter.map((a) => aufgabeZeile(a, jetzt)).join(''))) : ''}
      ${!termine.length ? abschnitt('Termine', karte(leer('Keine offenen Termine.'))) : ''}
      ${abschnitt('Checkliste', karte(gruppen.map((g, i) => {
        const fertig = g.liste.filter((a) => a.erledigt).length;
        return `
          <a class="zeile" href="#aufgaben/gruppe/${i}">
            <span class="zeile__text"><span class="zeile__titel">${e(g.name)}</span></span>
            <span class="zeile__wert${fertig === g.liste.length ? ' text-gruen' : ''}">${fertig === g.liste.length ? 'fertig' : `${fertig} / ${g.liste.length}`}</span>
            <span class="zeile__pfeil" aria-hidden="true"></span>
          </a>`;
      }).join('') || leer('Keine Checkliste.')))}
      <div class="knopfreihe">
        <a class="knopf" href="#aufgaben/neu">Neue Aufgabe</a>
        <a class="knopf knopf--leise" href="#aufgaben/erledigt">Erledigt (${z.erledigt})</a>
      </div>`,
  };
}

function gruppenListe(aufgaben) {
  const namen = [];
  for (const a of aufgaben) if (a.art === 'check' && !namen.includes(a.gruppe)) namen.push(a.gruppe);
  return namen;
}

function gruppenSeite(aufgaben, param, jetzt, ausblenden) {
  const name = gruppenListe(aufgaben)[Number(param)];
  if (!name) return { titel: 'Checkliste', zurueck: '#aufgaben', html: leer('Diese Gruppe gibt es nicht.') };
  const liste = aufgaben.filter((a) => a.art === 'check' && a.gruppe === name);
  const sichtbar = ausblenden ? liste.filter((a) => !a.erledigt) : liste;
  const fertig = liste.filter((a) => a.erledigt).length;
  return {
    titel: name,
    zurueck: '#aufgaben',
    html: `
      ${held({ label: `${fertig} von ${liste.length} erledigt`, titel: name })}
      ${balken(liste.length ? (fertig / liste.length) * 100 : 0)}
      ${karte(sichtbar.map((a) => aufgabeZeile(a, jetzt, TZ_DE, true)).join('') || leer('Alles erledigt.'))}
      <label class="schalter">
        <span>Erledigte ausblenden</span>
        <input type="checkbox" data-einstellung="ausblenden" ${ausblenden ? 'checked' : ''}>
      </label>
      <a class="knopf knopf--leise knopf--breit" href="#aufgaben/neu/${encodeURIComponent(name)}">Punkt hinzufügen</a>`,
  };
}

function erledigtSeite(aufgaben, jetzt) {
  const liste = aufgaben.filter((a) => a.erledigt);
  return {
    titel: 'Erledigt',
    zurueck: '#aufgaben',
    html: `
      ${held({ label: 'Erledigt', titel: `${liste.length} ${liste.length === 1 ? 'Aufgabe' : 'Aufgaben'}` })}
      ${karte(liste.map((a) => aufgabeZeile(a, jetzt)).join('') || leer('Noch nichts erledigt.'))}`,
  };
}

function neuSeite(aufgaben, gruppe) {
  const gruppen = gruppenListe(aufgaben);
  const vorgabe = gruppe && gruppen.includes(gruppe) ? gruppe : 'Eigene Aufgaben';
  return {
    titel: 'Neue Aufgabe',
    zurueck: '#aufgaben',
    html: `
      <div class="formular" data-aufgabe-form>
        <label class="feld"><span>Was?</span><input class="eingabe" name="text" maxlength="200" placeholder="z. B. Reisepass kopieren"></label>
        <label class="feld"><span>Bis wann? (optional)</span><input class="eingabe" name="faellig" type="date"></label>
        <label class="feld"><span>Gruppe</span>
          <select class="eingabe" name="gruppe">
            ${[...new Set(['Eigene Aufgaben', ...gruppen])].map((g) => `<option ${g === vorgabe ? 'selected' : ''}>${e(g)}</option>`).join('')}
          </select>
        </label>
        <label class="feld"><span>Notiz (optional)</span><input class="eingabe" name="notiz" maxlength="200"></label>
        <button class="knopf knopf--haupt knopf--breit" data-aktion="aufgabe-speichern">Speichern</button>
      </div>`,
  };
}

// ---------- Bedienung ----------

/** Häkchen setzen – egal ob Frist, Checklisten-Punkt oder Online-Check-in. */
export function setzeErledigt(eigene, key, wert) {
  if (key.startsWith('flug:')) {
    const f = (eigene.fluege ?? []).find((x) => x.id === key.slice(5));
    if (f) f.checkin = wert ? 'erledigt' : 'offen';
  } else if (key.startsWith('frist:')) {
    eigene.fristErledigt = { ...(eigene.fristErledigt ?? {}), [key]: wert };
    if (!wert) delete eigene.fristErledigt[key];
  } else {
    eigene.checkliste = { ...(eigene.checkliste ?? {}), [key]: wert };
  }
}

export function aufgabenAenderung(t, ctx) {
  if (!t.dataset?.aufgabe) return false;
  setzeErledigt(ctx.state.eigene, t.dataset.aufgabe, t.checked);
  ctx.vibriere();
  ctx.speichereEigene();
  // kurz warten, damit man das Häkchen sieht, dann neu sortieren
  setTimeout(() => ctx.render(), 250);
  return true;
}

export const aufgabenAktionen = {
  'aufgabe-speichern': (el, ctx) => {
    const form = document.querySelector('[data-aufgabe-form]');
    const wert = (n) => form.querySelector(`[name="${n}"]`).value.trim();
    const text = wert('text');
    if (!text) {
      ctx.toast('Bitte eintragen, was zu tun ist');
      return;
    }
    const eigene = ctx.state.eigene;
    eigene.checklisteEigene = [...(eigene.checklisteEigene ?? []), {
      id: neueId(),
      gruppe: wert('gruppe') || 'Eigene Aufgaben',
      text: text.slice(0, 200),
      notiz: wert('notiz').slice(0, 200),
      faellig: /^\d{4}-\d{2}-\d{2}$/.test(wert('faellig')) ? wert('faellig') : '',
    }];
    ctx.speichereEigene();
    ctx.vibriere();
    ctx.toast('Aufgabe gespeichert');
    ctx.zurueck('#aufgaben');
  },
  'aufgabe-loeschen': (el, ctx, ev) => {
    ev?.preventDefault();
    if (!confirm('Diese eigene Aufgabe löschen?')) return;
    const eigene = ctx.state.eigene;
    eigene.checklisteEigene = (eigene.checklisteEigene ?? []).filter((p) => p.id !== el.dataset.id);
    if (eigene.checkliste) delete eigene.checkliste[`eigen:${el.dataset.id}`];
    ctx.speichereEigene();
    ctx.render();
  },
};
