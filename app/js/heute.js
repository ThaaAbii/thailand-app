// Die Startseite „Heute“.
import {
  TZ_DE, TZ_TH, uhrzeitIn, versatzStunden, plusTage, tageDiff, datumIn, formatTag, formatKurz,
  formatLang, countdown, restText, naechsteFristen, reisePhase,
} from './zeit.js';
import { e, zeilen, ortInfo } from './ui.js';

export function renderHeute(daten, jetzt) {
  const ph = reisePhase(daten, jetzt);
  if (ph.phase === 'vorher') return vorher(daten, ph, jetzt);
  if (ph.phase === 'nachher') return nachher(daten, ph);
  return unterwegs(daten, ph, jetzt);
}

/** Aktualisiert Countdown-Zahlen und Uhren jede Sekunde, ohne die Seite neu aufzubauen. */
export function aktualisiereTicker(root, jetzt) {
  for (const el of root.querySelectorAll('[data-cd]')) {
    const c = countdown(new Date(el.dataset.cd), jetzt);
    const setze = (teil, wert) => {
      const t = el.querySelector(`[data-cd-teil="${teil}"]`);
      if (t) t.textContent = wert;
    };
    setze('tage', c.tage);
    setze('tage-label', c.tage === 1 ? 'Tag' : 'Tage');
    setze('stunden', String(c.stunden).padStart(2, '0'));
    setze('minuten', String(c.minuten).padStart(2, '0'));
    setze('sekunden', String(c.sekunden).padStart(2, '0'));
  }
  for (const el of root.querySelectorAll('[data-uhr]')) el.textContent = uhrzeitIn(jetzt, el.dataset.uhr);
}

// ---------- Phasen ----------

function vorher(daten, ph, jetzt) {
  const fristen = naechsteFristen(daten.fristen, jetzt);
  const naechste = fristen[0];
  return `
    ${ph.abflug ? `
    <section class="karte karte--held">
      <p class="ueberzeile">Countdown bis zum Abflug</p>
      ${countdownHtml(ph.abflug)}
      <p class="unterzeile">${e(formatLang(ph.abflug, TZ_DE))} Uhr <span class="leise">(deutsche Zeit)</span></p>
    </section>` : ''}
    ${uhren(jetzt)}
    ${naechste ? `
    <section class="karte">
      <h2>Nächste Frist</h2>
      <ul class="fristen fristen--gross">${fristHtml(naechste, jetzt, TZ_DE)}</ul>
    </section>` : `
    <section class="karte"><h2>Fristen</h2><p class="leise">Keine offenen Fristen. 🎉</p></section>`}
    ${fristen.length > 1 ? `
    <section class="karte">
      <h2>Danach</h2>
      <ul class="fristen">${fristen.slice(1, 5).map((f) => fristHtml(f, jetzt, TZ_DE)).join('')}</ul>
      ${fristen.length > 5 ? `<p class="leise klein">… und ${fristen.length - 5} weitere</p>` : ''}
    </section>` : ''}
    ${morgenKarte(daten, ph, plusTage(ph.datum, 1))}
  `;
}

function unterwegs(daten, ph, jetzt) {
  const t = ph.tag;
  const ort = ortInfo(daten, t?.p);
  const tz = ph.tz;
  const heuteDe = datumIn(jetzt, TZ_DE);
  const bald = naechsteFristen(daten.fristen, jetzt)
    .filter((f) => tageDiff(heuteDe, datumIn(f.zeit, TZ_DE)) <= 7);

  const kopf = `
    <section class="karte karte--held karte--ort" style="--ort:${ort.farbe}">
      <p class="ueberzeile">${e(ph.label)}</p>
      <h1 class="tagtitel">${e(t?.t || 'Kein Eintrag für heute')}</h1>
      <p class="unterzeile">${e(formatTag(ph.datum, true))}
        ${t?.p ? `<span class="ort-chip" style="--ort:${ort.farbe}">${e(ort.name)}</span>` : ''}</p>
    </section>`;

  const abflugBald = ph.abflug && ph.abflug > jetzt ? `
    <section class="karte karte--held karte--klein">
      <p class="ueberzeile">Bis zum Abflug</p>
      ${countdownHtml(ph.abflug)}
    </section>` : '';

  const details = t ? `
    <section class="karte">
      ${zeile('🗓️', 'Programm', t.prog)}
      ${zeile('🚐', 'Transport heute', t.tr, true)}
      ${zeile('🛏️', 'Unterkunft', t.stay)}
      ${zeile('🔑', 'Check-in / Check-out', t.ci, true)}
      ${t.note ? `<div class="notiz"><span aria-hidden="true">📝</span><div>${zeilen(t.note).map(e).join('<br>')}</div></div>` : ''}
      ${!t.prog && !t.tr && !t.stay && !t.ci && !t.note ? '<p class="leise">Für heute ist nichts eingetragen – genieß den Tag!</p>' : ''}
    </section>` : `
    <section class="karte"><p class="leise">Für ${e(formatTag(ph.datum))} gibt es keinen Eintrag im Fahrplan.</p></section>`;

  return `
    ${kopf}
    ${abflugBald}
    ${details}
    ${uhren(jetzt)}
    ${bald.length ? `
    <section class="karte">
      <h2>Fristen in den nächsten 7 Tagen</h2>
      <ul class="fristen">${bald.map((f) => fristHtml(f, jetzt, tz)).join('')}</ul>
    </section>` : ''}
    ${morgenKarte(daten, ph, plusTage(ph.datum, 1))}
  `;
}

function nachher(daten, ph) {
  const erster = ph.tage[0]?.d;
  const letzter = ph.tage[ph.tage.length - 1]?.d;
  return `
    <section class="karte karte--held">
      <p class="ueberzeile">Reise beendet</p>
      <h1 class="tagtitel">Willkommen zurück! 🏠</h1>
      ${erster && letzter ? `<p class="unterzeile">${e(formatTag(erster, true))} bis ${e(formatTag(letzter, true))}</p>` : ''}
    </section>
    <section class="karte">
      <p>Denk daran, unter <a href="#daten">Daten</a> ein Backup zu speichern, damit deine Einträge nicht verloren gehen.</p>
    </section>
  `;
}

// ---------- Bausteine ----------

function countdownHtml(ziel) {
  return `
    <div class="countdown" data-cd="${e(ziel.toISOString())}">
      <div class="countdown__tage"><span data-cd-teil="tage">–</span> <small data-cd-teil="tage-label">Tage</small></div>
      <div class="countdown__rest">
        <span><b data-cd-teil="stunden">––</b> Std</span>
        <span><b data-cd-teil="minuten">––</b> Min</span>
        <span><b data-cd-teil="sekunden">––</b> Sek</span>
      </div>
    </div>`;
}

function uhren(jetzt) {
  const diff = versatzStunden(jetzt, TZ_TH) - versatzStunden(jetzt, TZ_DE);
  return `
    <section class="uhren" aria-label="Uhrzeiten">
      <div class="uhren__uhr"><span>🇩🇪 Deutschland</span><b data-uhr="${TZ_DE}">${uhrzeitIn(jetzt, TZ_DE)}</b></div>
      <div class="uhren__uhr"><span>🇹🇭 Thailand</span><b data-uhr="${TZ_TH}">${uhrzeitIn(jetzt, TZ_TH)}</b></div>
      <p class="uhren__diff">Thailand ist ${diff} Std. voraus</p>
    </section>`;
}

function zeile(icon, titel, text, liste = false) {
  const z = zeilen(text);
  if (!z.length) return '';
  const inhalt = liste && z.length > 1
    ? `<ul>${z.map((x) => `<li>${e(x)}</li>`).join('')}</ul>`
    : `<p>${z.map(e).join('<br>')}</p>`;
  return `
    <div class="zeile">
      <span class="zeile__icon" aria-hidden="true">${icon}</span>
      <div class="zeile__text"><h3>${e(titel)}</h3>${inhalt}</div>
    </div>`;
}

function fristHtml(f, jetzt, tz) {
  const stufe = ['crit', 'warn', 'ok'].includes(f.s) ? f.s : 'ok';
  const stufeText = { crit: 'Wichtig', warn: 'Achtung', ok: 'Info' }[stufe];
  return `
    <li class="frist frist--${stufe}">
      <div class="frist__kopf">
        <strong>${e(f.w)}</strong>
        <span class="frist__rest">${e(restText(f.zeit, jetzt, tz))}</span>
      </div>
      ${f.h ? `<p class="frist__hinweis">${e(f.h)}</p>` : ''}
      <p class="frist__zeit"><span class="sr">${stufeText}: </span>🇩🇪 ${e(formatKurz(f.zeit, TZ_DE))} · 🇹🇭 ${e(formatKurz(f.zeit, TZ_TH))}</p>
    </li>`;
}

function morgenKarte(daten, ph, datum) {
  const t = ph.tage.find((x) => x.d === datum);
  if (!t) return '';
  const ort = ortInfo(daten, t.p);
  const heute = ph.tage.find((x) => x.d === ph.datum);
  const neueUnterkunft = t.stay && t.stay !== heute?.stay;
  return `
    <section class="karte karte--morgen" style="--ort:${ort.farbe}">
      <h2>Morgen · ${e(formatTag(datum))}</h2>
      <p class="morgen__titel">${t.p ? `<span class="ort-chip" style="--ort:${ort.farbe}">${e(ort.name)}</span> ` : ''}${e(t.t)}</p>
      ${zeile('🚐', 'Transport', t.tr, true)}
      ${neueUnterkunft ? zeile('🛏️', 'Unterkunft', t.stay) : ''}
      ${zeile('🔑', 'Check-in / Check-out', t.ci, true)}
      ${zeile('📝', 'Notiz', t.note)}
    </section>`;
}
