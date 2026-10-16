// Checkliste und Packliste: Übersicht → Gruppe/Bereich → einzelne Punkte.
import { e } from './ui.js';
import { liste, abschnitt, balken, held, leer } from './bausteine.js';
import {
  BEREICHE, LIMITS, PACK_VORLAGE, checklistenGruppen, fortschritt, packSummen, packWarnungen,
  gewichtVon, formatKg, formatGramm, neueId,
} from './listenlogik.js';

// ---------- Checkliste ----------

export function seiteCheckliste(daten, eigene, teile, { ausblenden }) {
  const gruppen = checklistenGruppen(daten, eigene);
  const nr = teile[0] != null ? Number(teile[0]) : null;
  if (nr != null && gruppen[nr]) return gruppenSeite(gruppen[nr], nr, ausblenden);
  const alle = fortschritt(gruppen.flatMap((g) => g.punkte));
  return {
    titel: 'Checkliste',
    zurueck: '#mehr',
    html: `
      <section class="held">
        <p class="held__label">Checkliste</p>
        <h1 class="held__zahl">${alle.prozent} <small>%</small></h1>
        <p class="held__unter">${alle.erledigt} von ${alle.gesamt} erledigt</p>
        ${balken(alle.prozent, alle.prozent === 100 ? 'gruen' : '')}
      </section>
      ${liste(gruppen.map((g, i) => {
        const f = fortschritt(g.punkte);
        return { href: `#checkliste/${i}`, titel: g.gruppe, wert: f.gesamt && f.erledigt === f.gesamt ? '✓' : `${f.erledigt}/${f.gesamt}`, wertKlasse: f.erledigt === f.gesamt ? 'text-gruen' : '' };
      })) || leer('Keine Checkliste in den Reisedaten.')}
      <button class="knopf knopf--leise knopf--breit" data-aktion="punkt-neu" data-gruppe="Eigene Punkte">＋ Eigener Punkt</button>`,
  };
}

function gruppenSeite(g, nr, ausblenden) {
  const f = fortschritt(g.punkte);
  const sichtbar = ausblenden ? g.punkte.filter((p) => !p.erledigt) : g.punkte;
  return {
    titel: g.gruppe,
    zurueck: '#checkliste',
    html: `
      ${held({ label: `${f.erledigt} von ${f.gesamt} erledigt`, titel: g.gruppe })}
      <div class="karte">
        ${sichtbar.map((p) => `
          <label class="zeile zeile--check${p.erledigt ? ' ist-erledigt' : ''}">
            <input type="checkbox" data-check="${e(p.key)}" ${p.erledigt ? 'checked' : ''}>
            <span class="zeile__text">
              <span class="zeile__titel">${e(p.text)}</span>
              ${p.notiz ? `<span class="zeile__unter">${e(p.notiz)}</span>` : ''}
            </span>
            ${p.eigen ? `<button class="zeile__klein" data-aktion="punkt-loeschen" data-id="${e(p.id)}" aria-label="Punkt löschen">🗑️</button>` : ''}
          </label>`).join('')}
      </div>
      ${ausblenden && !sichtbar.length && g.punkte.length ? leer('Alles erledigt ✓') : ''}
      <button class="knopf knopf--leise knopf--breit" data-aktion="punkt-neu" data-gruppe="${e(g.gruppe)}">＋ Punkt hinzufügen</button>
      <label class="schalter">
        <input type="checkbox" data-einstellung="ausblenden" ${ausblenden ? 'checked' : ''}>
        <span>Erledigte ausblenden</span>
      </label>`,
  };
}

// ---------- Packliste ----------

function bereichVon(x) {
  return BEREICHE.some((b) => b.key === x?.wo) ? x.wo : 'aufgabe';
}

export function seitePackliste(eigene, teile) {
  const liste0 = Array.isArray(eigene?.packliste) ? eigene.packliste : null;
  const [unter, param] = teile;
  if (unter === 'teil') {
    const x = (liste0 ?? []).find((y) => y.id === param);
    return x ? formularSeite(x, false) : { titel: 'Packliste', zurueck: '#packliste', html: leer('Diesen Gegenstand gibt es nicht mehr.') };
  }
  if (unter === 'neu') return formularSeite({ id: neueId(), name: '', g: '', anzahl: 1, wo: BEREICHE.some((b) => b.key === param) ? param : 'aufgabe' }, true);
  if (unter && BEREICHE.some((b) => b.key === unter)) return bereichSeite(liste0 ?? [], unter);

  if (!liste0) {
    return {
      titel: 'Packliste',
      zurueck: '#mehr',
      html: `
        ${held({ titel: 'Packliste mit Gewicht', unter: 'Trag ein, was du mitnimmst – die App rechnet mit, ob dein Gepäck unter den Grenzen bleibt.' })}
        ${liste([
          { icon: '✈️', titel: 'Bangkok Airways', wert: '20 kg' },
          { icon: '✈️', titel: 'Lufthansa', unter: '+ 8 kg Handgepäck', wert: '23 kg' },
        ])}
        <button class="knopf knopf--haupt knopf--breit knopf--gross" data-aktion="pack-vorlage">Mit Vorschlagsliste starten</button>
        <button class="knopf knopf--leise knopf--breit" data-aktion="pack-leer">Leer starten</button>
        <p class="leise klein zentriert">Die Vorschläge haben geschätzte Gewichte – am besten mit einer Küchenwaage nachwiegen.</p>`,
    };
  }

  const s = packSummen(liste0);
  const warnungen = packWarnungen(s);
  const stufe = s.aufgabe > LIMITS.lufthansa ? 'rot' : s.aufgabe > LIMITS.bangkokAirways ? 'orange' : 'gruen';
  return {
    titel: 'Packliste',
    zurueck: '#mehr',
    html: `
      <section class="held">
        <p class="held__label">Aufgabegepäck</p>
        <h1 class="held__zahl">${formatKg(s.aufgabe).replace(' kg', '')} <small>kg</small></h1>
        <div class="skala">
          ${balken((s.aufgabe / LIMITS.lufthansa) * 100, stufe)}
          <span class="skala__marke" style="left:${(LIMITS.bangkokAirways / LIMITS.lufthansa) * 100}%"></span>
        </div>
        <p class="leise klein">Strich = 20 kg Bangkok Airways · Ende = 23 kg Lufthansa</p>
        ${warnungen.map((w) => `<p class="warnung warnung--${w.stufe}">${e(w.text)}</p>`).join('')}
      </section>
      ${liste(BEREICHE.map((b) => {
        const teile2 = liste0.filter((x) => bereichVon(x) === b.key);
        const gepackt = teile2.filter((x) => x.gepackt).length;
        return {
          href: `#packliste/${b.key}`, icon: b.icon, titel: b.name,
          unter: teile2.length ? `${gepackt} von ${teile2.length} gepackt` : 'leer',
          wert: formatKg(s[b.key]) + (b.key === 'hand' ? ' / 8' : ''),
          wertKlasse: b.key === 'hand' && s.hand > LIMITS.handgepaeck ? 'text-rot' : '',
        };
      }))}
      ${abschnitt('Verwalten', liste([
        { aktion: 'pack-haken-weg', icon: '↩️', titel: 'Alle „gepackt“-Haken entfernen', unter: 'Praktisch, wenn du für die nächste Etappe neu packst' },
        { aktion: 'pack-vorlage-ergaenzen', icon: '📋', titel: 'Fehlende Vorschläge ergänzen' },
      ]))}`,
  };
}

function bereichSeite(liste0, wo) {
  const b = BEREICHE.find((x) => x.key === wo);
  const teile = liste0.filter((x) => bereichVon(x) === wo);
  const summe = teile.reduce((n, x) => n + gewichtVon(x), 0);
  return {
    titel: b.name,
    zurueck: '#packliste',
    html: `
      ${held({ label: `${teile.filter((x) => x.gepackt).length} von ${teile.length} gepackt`, titel: formatKg(summe) })}
      <div class="karte">
        ${teile.map((x) => `
          <div class="zeile zeile--check${x.gepackt ? ' ist-erledigt' : ''}">
            <input type="checkbox" data-gepackt="${e(x.id)}" ${x.gepackt ? 'checked' : ''} aria-label="${e(x.name)} gepackt">
            <a class="zeile__text zeile__link" href="#packliste/teil/${e(x.id)}">
              <span class="zeile__titel">${e(x.name)}</span>
              <span class="zeile__unter">${(Number(x.anzahl) || 1) > 1 ? `${e(x.anzahl)} × ${formatGramm(Number(x.g) || 0)}` : 'antippen zum Bearbeiten'}</span>
            </a>
            <span class="zeile__wert">${formatGramm(gewichtVon(x))}</span>
          </div>`).join('')}
      </div>
      ${!teile.length ? leer('Noch nichts eingetragen.') : ''}
      <a class="knopf knopf--leise knopf--breit" href="#packliste/neu/${wo}">Gegenstand hinzufügen</a>`,
  };
}

function formularSeite(x, neu) {
  return {
    titel: neu ? 'Neuer Gegenstand' : 'Bearbeiten',
    zurueck: `#packliste/${bereichVon(x)}`,
    html: `
      <div class="formular" data-form="${e(x.id)}">
        <label class="feld"><span>Was?</span>
          <input class="eingabe" name="name" value="${e(x.name)}" placeholder="z. B. Sonnenbrille" maxlength="80" ${neu ? 'autofocus' : ''}>
        </label>
        <div class="feldreihe">
          <label class="feld"><span>Anzahl</span>
            <input class="eingabe" name="anzahl" type="number" inputmode="numeric" min="1" max="99" value="${e(x.anzahl ?? 1)}">
          </label>
          <label class="feld"><span>Gramm je Stück</span>
            <input class="eingabe" name="g" type="number" inputmode="numeric" min="0" max="50000" value="${e(x.g)}" placeholder="z. B. 150">
          </label>
        </div>
        <label class="feld"><span>Wo?</span>
          <select class="eingabe" name="wo">
            ${BEREICHE.map((b) => `<option value="${b.key}" ${bereichVon(x) === b.key ? 'selected' : ''}>${b.icon} ${b.name}</option>`).join('')}
          </select>
        </label>
        <button class="knopf knopf--haupt knopf--breit knopf--gross" data-aktion="pack-speichern">Speichern</button>
        ${neu ? '' : '<button class="knopf knopf--leise knopf--breit knopf--gefahr" data-aktion="pack-loeschen">Gegenstand löschen</button>'}
      </div>`,
  };
}

// ---------- Bedienung ----------
// ctx: { state, speichereEigene(), render(), toast(text), zurueck(ziel), vibriere() }

function packliste(ctx) {
  if (!Array.isArray(ctx.state.eigene.packliste)) ctx.state.eigene.packliste = [];
  return ctx.state.eigene.packliste;
}

function ausVorlage() {
  return PACK_VORLAGE.map((x) => ({ ...x, id: neueId(), gepackt: false }));
}

export const listenAktionen = {
  'punkt-neu': (el, ctx) => {
    const text = prompt(`Neuer Punkt in „${el.dataset.gruppe}“:`)?.trim();
    if (!text) return;
    const eigene = ctx.state.eigene;
    eigene.checklisteEigene = [...(eigene.checklisteEigene ?? []), { id: neueId(), gruppe: el.dataset.gruppe, text: text.slice(0, 200) }];
    ctx.speichereEigene();
    ctx.render();
  },
  'punkt-loeschen': (el, ctx, ev) => {
    ev?.preventDefault();
    if (!confirm('Diesen eigenen Punkt löschen?')) return;
    const eigene = ctx.state.eigene;
    eigene.checklisteEigene = (eigene.checklisteEigene ?? []).filter((p) => p.id !== el.dataset.id);
    if (eigene.checkliste) delete eigene.checkliste[`eigen:${el.dataset.id}`];
    ctx.speichereEigene();
    ctx.render();
  },
  'pack-vorlage': (el, ctx) => {
    ctx.state.eigene.packliste = ausVorlage();
    ctx.speichereEigene();
    ctx.render();
  },
  'pack-leer': (el, ctx) => {
    ctx.state.eigene.packliste = [];
    ctx.speichereEigene();
    ctx.render();
  },
  'pack-vorlage-ergaenzen': (el, ctx) => {
    const liste0 = packliste(ctx);
    const namen = new Set(liste0.map((x) => x.name));
    const neu = ausVorlage().filter((x) => !namen.has(x.name));
    liste0.push(...neu);
    ctx.speichereEigene();
    ctx.toast(neu.length ? `${neu.length} Vorschläge ergänzt` : 'Alle Vorschläge sind schon drin');
    ctx.render();
  },
  'pack-haken-weg': (el, ctx) => {
    if (!confirm('Bei allen Sachen den „gepackt“-Haken entfernen?')) return;
    for (const x of packliste(ctx)) x.gepackt = false;
    ctx.speichereEigene();
    ctx.render();
  },
  'pack-loeschen': (el, ctx) => {
    if (!confirm('Diesen Gegenstand löschen?')) return;
    const form = document.querySelector('[data-form]');
    const x = packliste(ctx).find((y) => y.id === form.dataset.form);
    ctx.state.eigene.packliste = packliste(ctx).filter((y) => y.id !== form.dataset.form);
    ctx.speichereEigene();
    ctx.zurueck(`#packliste/${bereichVon(x)}`);
  },
  'pack-speichern': (el, ctx) => {
    const form = document.querySelector('[data-form]');
    const wert = (n) => form.querySelector(`[name="${n}"]`).value;
    const name = wert('name').trim();
    if (!name) {
      ctx.toast('Bitte einen Namen eintragen');
      return;
    }
    const daten = {
      name: name.slice(0, 80),
      anzahl: Math.max(1, Math.min(99, Math.round(Number(wert('anzahl')) || 1))),
      g: Math.max(0, Math.min(50000, Math.round(Number(wert('g')) || 0))),
      wo: BEREICHE.some((b) => b.key === wert('wo')) ? wert('wo') : 'aufgabe',
    };
    const liste0 = packliste(ctx);
    const vorhanden = liste0.find((x) => x.id === form.dataset.form);
    if (vorhanden) Object.assign(vorhanden, daten);
    else liste0.push({ id: form.dataset.form, gepackt: false, ...daten });
    ctx.speichereEigene();
    ctx.vibriere();
    ctx.zurueck(`#packliste/${daten.wo}`);
  },
};

/** Änderungen an Häkchen. Gibt true zurück, wenn behandelt. */
export function listenAenderung(t, ctx) {
  const eigene = ctx.state.eigene;
  if (t.dataset.check) {
    eigene.checkliste = { ...(eigene.checkliste ?? {}), [t.dataset.check]: t.checked };
  } else if (t.dataset.gepackt) {
    const x = packliste(ctx).find((y) => y.id === t.dataset.gepackt);
    if (x) x.gepackt = t.checked;
  } else {
    return false;
  }
  ctx.vibriere();
  ctx.speichereEigene();
  ctx.render();
  return true;
}
