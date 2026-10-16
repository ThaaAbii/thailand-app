// Budgetplanung (Unterseite von Geld): Werte anpassen, Optionen vergleichen, eine als Plan wählen.
import { e } from './ui.js';
import { abschnitt, held, leer } from './bausteine.js';
import { ikon } from './ikonen.js';
import { neueId } from './listenlogik.js';
import { aktuellerKurs, formatEur, formatThb } from './ausgabenlogik.js';
import { planWerte, reisegeld, optionen, parseZahl, STUFE_TEXT } from './budgetlogik.js';

const euro = (n) => formatEur(n).replace(',00', '');
const zahlFeld = (n) => String(n).replace('.', ',');

function wertZeile(feld, label, wert, unter = '', einheit = '€') {
  return `
    <label class="zeile wertzeile">
      <span class="zeile__text"><span class="zeile__titel">${e(label)}</span>${unter ? `<span class="zeile__unter">${e(unter)}</span>` : ''}</span>
      <span class="wertzeile__feld"><input class="wertzeile__eingabe" data-plan="${e(feld)}" inputmode="decimal" value="${e(zahlFeld(wert))}" aria-label="${e(label)}"><span>${e(einheit)}</span></span>
    </label>`;
}

export function seiteBudgetplan(daten, eigene) {
  const kurs = aktuellerKurs(daten, eigene).wert;
  const plan = planWerte(daten, eigene);
  const opts = optionen(plan, kurs);
  const gewaehlt = opts.find((o) => o.nr === plan.gewaehlt);
  const manuell = Number(eigene?.einstellungen?.tagesbudget) > 0;
  const r = reisegeld(plan);

  return {
    titel: 'Budgetplanung',
    zurueck: '#geld',
    html: `
      ${held({ label: 'Budgetplanung', titel: 'Wie viel pro Tag?' })}
      <section class="planbox">
        ${gewaehlt ? `
          <span class="marke">Dein Plan · Option ${gewaehlt.nr}</span>
          <p class="planbox__zahl">${formatEur(gewaehlt.proTag)}<small>pro Tag</small></p>
          <p class="planbox__unter">${formatThb(gewaehlt.proTagThb)} · ${euro(gewaehlt.gesamt)} für ${plan.reisetage} Tage · ${e(gewaehlt.name)}</p>
          ${manuell ? '<p class="planbox__hinweis">Unter „Kurs & Budget“ ist ein eigenes Tagesbudget eingetragen – das gilt gerade statt des Plans. Wähle unten eine Option, um wieder den Plan zu nutzen.</p>' : ''}`
        : '<p class="planbox__unter">Wähle unten eine Option als deinen Plan. Sie erscheint dann vorne bei Geld als Tagesbudget.</p>'}
      </section>

      ${abschnitt('Optionen', `<div class="optionen" role="radiogroup" aria-label="Optionen">${opts.map((o) => `
        <label class="option${o.nr === plan.gewaehlt ? ' option--gewaehlt' : ''}">
          <input type="radio" name="planOption" value="${o.nr}" ${o.nr === plan.gewaehlt ? 'checked' : ''}>
          <span class="option__links">
            <small>Option ${o.nr}${o.nr === plan.gewaehlt ? ' · Plan' : ''}</small>
            <b>${e(o.name)}</b>
            <span>${euro(o.gesamt)} gesamt${o.stufe ? ` · <span class="text-${o.stufe}">${e(STUFE_TEXT[o.stufe])}</span>` : ''}</span>
          </span>
          <span class="option__rechts">
            <b>${formatEur(o.proTag)}</b>
            <small>${formatThb(o.proTagThb)} / Tag</small>
          </span>
        </label>`).join('')}</div>
        ${plan.sparsam || plan.normal ? `<p class="legende"><span class="legende__punkt legende--rot">unter sparsam</span><span class="legende__punkt legende--orange">sparsam (${euro(plan.sparsam)})</span><span class="legende__punkt legende--gruen">normal (${euro(plan.normal)})</span></p>` : ''}`)}

      ${abschnitt('Dein Geld bis zur Abreise', `
        <div class="karte">
          ${plan.posten.map((x) => `
            <div class="zeile posten">
              <input class="posten__was" data-posten="${e(x.id)}" data-teil="was" value="${e(x.was)}" placeholder="Posten" aria-label="Posten">
              <input class="posten__betrag${x.betrag < 0 ? ' text-rot' : ''}" data-posten="${e(x.id)}" data-teil="betrag" inputmode="decimal" value="${e(zahlFeld(x.betrag))}" aria-label="Betrag">
              <button class="zeile__klein" type="button" data-aktion="posten-weg" data-id="${e(x.id)}" aria-label="Posten löschen">×</button>
              ${x.wann || x.hinweis ? `<span class="posten__info">${e([x.wann, x.hinweis].filter(Boolean).join(' · '))}</span>` : ''}
            </div>`).join('') || '<p class="leer">Noch keine Posten.</p>'}
          <button class="zeile zeile--fuss" type="button" data-aktion="posten-neu"><span class="zeile__icon">${ikon('plus')}</span><span class="zeile__text"><span class="zeile__titel">Posten hinzufügen</span></span></button>
          <div class="zeile summenzeile"><span class="zeile__text"><span class="zeile__titel">Reisegeld</span><span class="zeile__unter">dein eigenes Geld für Thailand</span></span><b>${formatEur(r)}</b></div>
        </div>
        <p class="leise klein">Ausgaben mit Minus eintragen (z. B. −100 für Maske + Schnorchel).</p>`)}

      ${abschnitt('Kreditkarte & Reserve', `<div class="karte">
        ${wertZeile('kreditkarte', 'Kreditkarte (Plan)', plan.kreditkarte, 'Abhebung in Thailand')}
        ${wertZeile('kreditkarteMax', 'Kreditkarte (maximal)', plan.kreditkarteMax, 'höchstens sinnvoll gedeckt')}
        ${wertZeile('umschlag', 'Reserve-Umschlag', plan.umschlag, 'Bargeld als Notreserve')}
        ${wertZeile('reisetage', 'Reisetage', plan.reisetage, '', 'Tage')}
      </div>`)}

      ${abschnitt('Richtwerte pro Tag', `<div class="karte">
        ${wertZeile('sparsam', 'Sparsam', plan.sparsam, 'Kosten vor Ort ÷ Reisetage')}
        ${wertZeile('normal', 'Normal', plan.normal)}
      </div>`)}

      ${plan.hinweise.length ? abschnitt('Gut zu wissen', `<ul class="infoliste">${plan.hinweise.map((h) => `<li>${e(h)}</li>`).join('')}</ul>`) : ''}
      <button class="knopf knopf--leise knopf--breit" data-aktion="plan-zuruecksetzen">Auf Werte aus den Reisedaten zurücksetzen</button>
      ${!plan.posten.length && !daten?.budget?.planung ? leer('Tipp: Trag deine Posten ein – die Optionen rechnen sich automatisch.') : ''}`,
  };
}

// ---------- Bedienung ----------

function speichere(ctx, plan) {
  const { hinweise, ...rest } = plan;
  ctx.state.eigene.budgetPlan = rest;
  ctx.speichereEigene();
}

export function budgetAenderung(t, ctx) {
  const daten = ctx.state.reise;
  if (t.name === 'planOption') {
    const plan = planWerte(daten, ctx.state.eigene);
    plan.gewaehlt = Number(t.value);
    // der Plan bestimmt jetzt das Tagesbudget
    if (ctx.state.eigene.einstellungen) delete ctx.state.eigene.einstellungen.tagesbudget;
    speichere(ctx, plan);
    ctx.vibriere();
    ctx.toast(`Option ${plan.gewaehlt} ist jetzt dein Plan ✓`);
    ctx.render();
    return true;
  }
  if (t.dataset?.plan) {
    const n = parseZahl(t.value);
    if (n == null || n < 0) {
      ctx.toast('Bitte eine gültige Zahl eingeben');
      ctx.render();
      return true;
    }
    const plan = planWerte(daten, ctx.state.eigene);
    plan[t.dataset.plan] = t.dataset.plan === 'reisetage' ? Math.max(1, Math.round(n)) : n;
    speichere(ctx, plan);
    ctx.render();
    return true;
  }
  if (t.dataset?.posten) {
    const plan = planWerte(daten, ctx.state.eigene);
    const x = plan.posten.find((y) => y.id === t.dataset.posten);
    if (!x) return true;
    if (t.dataset.teil === 'was') x.was = t.value.trim().slice(0, 80);
    else {
      const n = parseZahl(t.value);
      if (n == null) {
        ctx.toast('Bitte einen Betrag eingeben (z. B. 500 oder −100)');
        ctx.render();
        return true;
      }
      x.betrag = n;
    }
    speichere(ctx, plan);
    ctx.render();
    return true;
  }
  return false;
}

export const budgetAktionen = {
  'posten-neu': (el, ctx) => {
    const plan = planWerte(ctx.state.reise, ctx.state.eigene);
    plan.posten.push({ id: neueId(), was: '', betrag: 0, wann: '', hinweis: '' });
    speichere(ctx, plan);
    ctx.render();
    const felder = document.querySelectorAll('.posten__was');
    felder[felder.length - 1]?.focus();
  },
  'posten-weg': (el, ctx) => {
    const plan = planWerte(ctx.state.reise, ctx.state.eigene);
    const x = plan.posten.find((y) => y.id === el.dataset.id);
    if (x?.was && !confirm(`„${x.was}“ löschen?`)) return;
    plan.posten = plan.posten.filter((y) => y.id !== el.dataset.id);
    speichere(ctx, plan);
    ctx.render();
  },
  'plan-zuruecksetzen': (el, ctx) => {
    if (!confirm('Deine Änderungen an der Budgetplanung verwerfen?')) return;
    delete ctx.state.eigene.budgetPlan;
    ctx.speichereEigene();
    ctx.toast('Zurückgesetzt');
    ctx.render();
  },
};
