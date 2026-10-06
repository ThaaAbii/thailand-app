// Checkliste und Packliste (Anzeige + Bedienung).
import { e } from './ui.js';
import { balken } from './bausteine.js';
import {
  BEREICHE, LIMITS, PACK_VORLAGE, checklistenGruppen, fortschritt, packSummen, packWarnungen,
  gewichtVon, formatKg, formatGramm, neueId,
} from './listenlogik.js';

function tabs(aktiv) {
  return `
    <h1 class="seitentitel">Listen</h1>
    <nav class="tabs" aria-label="Listen">
      <a href="#checkliste" class="${aktiv === 'checkliste' ? 'aktiv' : ''}">✅ Checkliste</a>
      <a href="#packliste" class="${aktiv === 'packliste' ? 'aktiv' : ''}">🧳 Packliste</a>
    </nav>`;
}

// ---------- Checkliste ----------

export function renderCheckliste(daten, eigene, { ausblenden }) {
  const gruppen = checklistenGruppen(daten, eigene);
  const alle = fortschritt(gruppen.flatMap((g) => g.punkte));

  const gruppenHtml = gruppen.map((g) => {
    const f = fortschritt(g.punkte);
    const sichtbar = ausblenden ? g.punkte.filter((p) => !p.erledigt) : g.punkte;
    return `
      <section class="karte">
        <h2 class="gruppenkopf"><span>${e(g.gruppe)}</span><span class="leise klein">${f.erledigt}/${f.gesamt}</span></h2>
        ${balken(f.prozent, f.prozent === 100 ? 'gruen' : '')}
        <ul class="checkliste">
          ${sichtbar.map((p) => `
            <li class="check${p.erledigt ? ' check--erledigt' : ''}">
              <label>
                <input type="checkbox" data-check="${e(p.key)}" ${p.erledigt ? 'checked' : ''}>
                <span class="check__text"><b>${e(p.text)}</b>${p.notiz ? `<small>${e(p.notiz)}</small>` : ''}</span>
              </label>
              ${p.eigen ? `<button class="icon-knopf" data-aktion="punkt-loeschen" data-id="${e(p.id)}" aria-label="Punkt löschen">🗑️</button>` : ''}
            </li>`).join('')}
        </ul>
        ${ausblenden && !sichtbar.length && g.punkte.length ? '<p class="leise klein">Alles erledigt ✓</p>' : ''}
        <button class="knopf knopf--klein" data-aktion="punkt-neu" data-gruppe="${e(g.gruppe)}">＋ Punkt hinzufügen</button>
      </section>`;
  }).join('');

  return `
    ${tabs('checkliste')}
    <section class="karte">
      <div class="gruppenkopf"><b>${alle.erledigt} von ${alle.gesamt} erledigt</b><b>${alle.prozent} %</b></div>
      ${balken(alle.prozent, alle.prozent === 100 ? 'gruen' : '')}
      <label class="schalter">
        <input type="checkbox" data-einstellung="ausblenden" ${ausblenden ? 'checked' : ''}>
        <span>Erledigte ausblenden</span>
      </label>
    </section>
    ${gruppenHtml || '<section class="karte"><p class="leise">Keine Checkliste in den Reisedaten.</p></section>'}
    <button class="knopf" data-aktion="punkt-neu" data-gruppe="Eigene Punkte">＋ Punkt in neuer Gruppe „Eigene Punkte“</button>`;
}

// ---------- Packliste ----------

export function renderPackliste(eigene, { bearbeiten }) {
  const liste = Array.isArray(eigene?.packliste) ? eigene.packliste : null;
  if (!liste) {
    return `
      ${tabs('packliste')}
      <section class="karte">
        <h2>Packliste mit Gewicht</h2>
        <p>Trag ein, was du mitnimmst, und wie viel es wiegt. Die App rechnet aus, ob dein Gepäck unter den Grenzen bleibt:</p>
        <ul class="infoliste">
          <li><b>Bangkok Airways:</b> 20 kg Aufgabegepäck</li>
          <li><b>Lufthansa:</b> 23 kg Aufgabegepäck + 8 kg Handgepäck</li>
        </ul>
        <button class="knopf knopf--haupt" data-aktion="pack-vorlage">📋 Mit Vorschlagsliste starten</button>
        <button class="knopf knopf--breit" data-aktion="pack-leer">Leer starten</button>
        <p class="leise klein">Die Vorschläge haben geschätzte Gewichte – am besten mit einer Küchenwaage nachwiegen und anpassen.</p>
      </section>`;
  }

  const s = packSummen(liste);
  const warnungen = packWarnungen(s);

  const bereiche = BEREICHE.map((b) => {
    const teile = liste.filter((x) => (BEREICHE.some((y) => y.key === x.wo) ? x.wo : 'aufgabe') === b.key);
    const neu = bearbeiten?.neu && bearbeiten.wo === b.key;
    return `
      <section class="karte">
        <h2 class="gruppenkopf"><span>${b.icon} ${b.name}</span><span>${formatKg(s[b.key])}</span></h2>
        <ul class="packliste">
          ${teile.map((x) => (bearbeiten?.id === x.id ? `<li>${formular(x)}</li>` : `
            <li class="packteil${x.gepackt ? ' packteil--gepackt' : ''}">
              <label>
                <input type="checkbox" data-gepackt="${e(x.id)}" ${x.gepackt ? 'checked' : ''} aria-label="gepackt">
                <span class="packteil__name">${e(x.name)}</span>
              </label>
              <span class="packteil__g">${(Number(x.anzahl) || 1) > 1 ? `${e(x.anzahl)} × ${formatGramm(Number(x.g) || 0)} = ` : ''}<b>${formatGramm(gewichtVon(x))}</b></span>
              <button class="icon-knopf" data-aktion="pack-bearbeiten" data-id="${e(x.id)}" aria-label="${e(x.name)} bearbeiten">✏️</button>
            </li>`)).join('')}
          ${neu ? `<li>${formular({ id: bearbeiten.id, name: '', g: '', anzahl: 1, wo: b.key }, true)}</li>` : ''}
        </ul>
        ${!teile.length && !neu ? '<p class="leise klein">Noch nichts eingetragen.</p>' : ''}
        ${neu ? '' : `<button class="knopf knopf--klein" data-aktion="pack-neu" data-wo="${b.key}">＋ Gegenstand</button>`}
      </section>`;
  }).join('');

  return `
    ${tabs('packliste')}
    <section class="karte">
      <h2>Gewicht</h2>
      <div class="gewicht">
        <div class="gruppenkopf"><span>🧳 Aufgabegepäck</span><b>${formatKg(s.aufgabe)}</b></div>
        <div class="skala">
          ${balken((s.aufgabe / LIMITS.lufthansa) * 100, s.aufgabe > LIMITS.lufthansa ? 'rot' : s.aufgabe > LIMITS.bangkokAirways ? 'orange' : 'gruen')}
          <span class="skala__marke" style="left:${(LIMITS.bangkokAirways / LIMITS.lufthansa) * 100}%"></span>
        </div>
        <p class="leise klein">Strich = 20 kg (Bangkok Airways) · Ende = 23 kg (Lufthansa)</p>
      </div>
      <div class="gewicht">
        <div class="gruppenkopf"><span>🎒 Handgepäck</span><b>${formatKg(s.hand)} <span class="leise">/ 8 kg</span></b></div>
        ${balken((s.hand / LIMITS.handgepaeck) * 100, s.hand > LIMITS.handgepaeck ? 'rot' : 'gruen')}
      </div>
      <div class="gruppenkopf gewicht"><span>🧍 Am Körper</span><b>${formatKg(s.koerper)}</b></div>
      ${warnungen.map((w) => `<p class="warnung warnung--${w.stufe}">${w.stufe === 'ok' ? '✅' : '⚠️'} ${e(w.text)}</p>`).join('')}
      <p class="leise klein">Gepackt: ${s.gepackt} von ${s.anzahl} Sachen</p>
    </section>
    ${bereiche}
    <section class="karte">
      <h2>Packliste verwalten</h2>
      <div class="knopfreihe">
        <button class="knopf" data-aktion="pack-haken-weg">↩️ Alle „gepackt“-Haken entfernen</button>
        <button class="knopf" data-aktion="pack-vorlage-ergaenzen">📋 Fehlende Vorschläge ergänzen</button>
      </div>
      <p class="leise klein">„Haken entfernen“ ist praktisch, wenn du für die nächste Etappe neu packst.</p>
    </section>`;
}

function formular(x, neu = false) {
  return `
    <div class="packform" data-form="${e(x.id)}">
      <label class="feld feld--breit"><span>Was?</span>
        <input class="eingabe" name="name" value="${e(x.name)}" placeholder="z. B. Sonnenbrille" maxlength="80">
      </label>
      <label class="feld"><span>Anzahl</span>
        <input class="eingabe" name="anzahl" type="number" inputmode="numeric" min="1" max="99" value="${e(x.anzahl ?? 1)}">
      </label>
      <label class="feld"><span>Gramm (je Stück)</span>
        <input class="eingabe" name="g" type="number" inputmode="numeric" min="0" max="50000" value="${e(x.g)}" placeholder="z. B. 150">
      </label>
      <label class="feld feld--breit"><span>Wo?</span>
        <select class="eingabe" name="wo">
          ${BEREICHE.map((b) => `<option value="${b.key}" ${x.wo === b.key ? 'selected' : ''}>${b.icon} ${b.name}</option>`).join('')}
        </select>
      </label>
      <div class="knopfreihe feld--breit">
        <button class="knopf knopf--haupt" data-aktion="pack-speichern">Speichern</button>
        <button class="knopf" data-aktion="pack-abbrechen">Abbrechen</button>
        ${neu ? '' : '<button class="knopf knopf--gefahr" data-aktion="pack-loeschen">🗑️ Löschen</button>'}
      </div>
    </div>`;
}

// ---------- Bedienung ----------
// ctx: { state, speichereEigene(), render(), toast(text) }

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
  'punkt-loeschen': (el, ctx) => {
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
    const liste = packliste(ctx);
    const namen = new Set(liste.map((x) => x.name));
    const neu = ausVorlage().filter((x) => !namen.has(x.name));
    liste.push(...neu);
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
  'pack-neu': (el, ctx) => {
    ctx.state.packBearbeiten = { id: neueId(), wo: el.dataset.wo, neu: true };
    ctx.render();
    fokusInFormular();
  },
  'pack-bearbeiten': (el, ctx) => {
    ctx.state.packBearbeiten = { id: el.dataset.id };
    ctx.render();
  },
  'pack-abbrechen': (el, ctx) => {
    ctx.state.packBearbeiten = null;
    ctx.render();
  },
  'pack-loeschen': (el, ctx) => {
    const id = el.closest('[data-form]').dataset.form;
    ctx.state.eigene.packliste = packliste(ctx).filter((x) => x.id !== id);
    ctx.state.packBearbeiten = null;
    ctx.speichereEigene();
    ctx.render();
  },
  'pack-speichern': (el, ctx) => {
    const form = el.closest('[data-form]');
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
    const liste = packliste(ctx);
    const vorhanden = liste.find((x) => x.id === form.dataset.form);
    if (vorhanden) Object.assign(vorhanden, daten);
    else liste.push({ id: form.dataset.form, gepackt: false, ...daten });
    ctx.state.packBearbeiten = null;
    ctx.speichereEigene();
    ctx.render();
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
  ctx.speichereEigene();
  ctx.render();
  return true;
}

function fokusInFormular() {
  requestAnimationFrame(() => {
    const feld = document.querySelector('.packform [name="name"]');
    feld?.scrollIntoView({ block: 'center' });
    feld?.focus();
  });
}
