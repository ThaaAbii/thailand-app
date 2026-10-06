// Startseite „Heute“: nur das Wichtigste, Details per Antippen.
import {
  TZ_DE, TZ_TH, uhrzeitIn, versatzStunden, plusTage, tageDiff, datumIn, formatTag,
  formatLang, countdown, naechsteFristen, reisePhase,
} from './zeit.js';
import { e, zeilen, ortInfo } from './ui.js';
import { liste, abschnitt, fristZeile, held } from './bausteine.js';
import { checklistenGruppen, fortschritt, packSummen, packWarnungen, formatKg } from './listenlogik.js';
import { tagesbudgetEur, gueltigeAusgaben, inEur, inThb, budgetStatus, STATUS_TEXT, formatThb } from './ausgabenlogik.js';
import { ideenFuerOrt } from './ideen.js';
import { fluegeAm, unterkunftDetails } from './anpassungen.js';
import { flugZeile } from './details.js';

export function renderHeute(daten, jetzt, eigene = {}) {
  const ph = reisePhase(daten, jetzt);
  if (ph.phase === 'vorher') return vorher(daten, ph, jetzt, eigene);
  if (ph.phase === 'nachher') return nachher(daten, ph, eigene);
  return unterwegs(daten, ph, jetzt, eigene);
}

/** Countdown und Uhren jede Sekunde aktualisieren, ohne die Seite neu aufzubauen. */
export function aktualisiereTicker(root, jetzt) {
  for (const el of root.querySelectorAll('[data-cd]')) {
    const c = countdown(new Date(el.dataset.cd), jetzt);
    const setze = (teil, wert) => {
      const t = el.querySelector(`[data-cd-teil="${teil}"]`);
      if (t) t.textContent = wert;
    };
    const zwei = (n) => String(n).padStart(2, '0');
    setze('tage', c.tage);
    setze('tage-label', c.tage === 1 ? 'Tag' : 'Tage');
    setze('uhr', `${zwei(c.stunden)}:${zwei(c.minuten)}:${zwei(c.sekunden)}`);
  }
  for (const el of root.querySelectorAll('[data-uhr]')) el.textContent = uhrzeitIn(jetzt, el.dataset.uhr);
}

function uhren(jetzt) {
  const diff = versatzStunden(jetzt, TZ_TH) - versatzStunden(jetzt, TZ_DE);
  return `
    <p class="uhrzeile">
      <span>🇩🇪 <b data-uhr="${TZ_DE}">${uhrzeitIn(jetzt, TZ_DE)}</b></span>
      <span>🇹🇭 <b data-uhr="${TZ_TH}">${uhrzeitIn(jetzt, TZ_TH)}</b></span>
      <span class="leise">+${diff} Std.</span>
    </p>`;
}

// ---------- Vor der Reise ----------

function vorher(daten, ph, jetzt, eigene) {
  const fristen = naechsteFristen(daten.fristen, jetzt);
  const punkte = checklistenGruppen(daten, eigene).flatMap((g) => g.punkte);
  const fc = fortschritt(punkte);
  const pack = Array.isArray(eigene?.packliste) ? eigene.packliste : null;
  const s = packSummen(pack ?? []);
  const warn = packWarnungen(s)[0];

  const kopf = ph.abflug ? `
    <section class="held" data-cd="${e(ph.abflug.toISOString())}">
      <p class="held__label">Noch</p>
      <h1 class="held__zahl"><span data-cd-teil="tage">–</span> <small data-cd-teil="tage-label">Tage</small></h1>
      <p class="held__unter"><span data-cd-teil="uhr" class="tabellenzahl">––:––:––</span> bis zum Abflug<br>
        <span class="leise">${e(formatLang(ph.abflug, TZ_DE))} Uhr</span></p>
    </section>` : held({ titel: daten?.reise?.titel || 'Reise' });

  return `
    ${kopf}
    ${abschnitt('Als Nächstes', liste([
      fristen[0] ? fristZeile(fristen[0], jetzt, TZ_DE, '#fristen', true) : { titel: 'Keine offenen Fristen', icon: '🎉' },
    ]), fristen.length > 1 ? ` <a class="label__link" href="#fristen">Alle ${fristen.length}</a>` : '')}
    ${abschnitt('Vorbereitung', liste([
      fc.gesamt ? { href: '#checkliste', icon: '✅', titel: 'Checkliste', wert: `${fc.erledigt}/${fc.gesamt}` } : null,
      {
        href: '#packliste', icon: '🧳', titel: 'Packliste',
        unter: pack ? (warn && warn.stufe !== 'ok' ? warn.text.split(' – ')[0] : 'Aufgabegepäck') : 'Noch nicht angelegt',
        wert: pack ? formatKg(s.aufgabe) : '',
        wertKlasse: warn && warn.stufe !== 'ok' ? `text-${warn.stufe}` : '',
      },
      { href: '#plan', icon: '🗓️', titel: 'Fahrplan', wert: `${ph.tage.length} Tage` },
    ]))}
    ${uhren(jetzt)}`;
}

// ---------- Während der Reise ----------

function unterwegs(daten, ph, jetzt, eigene) {
  const t = ph.tag;
  const ort = ortInfo(daten, t?.p);
  const imLand = ph.label !== 'Abreisetag' && ph.label !== 'Heimreisetag';

  const kopf = held({
    label: `${ph.label} · ${formatTag(ph.datum)}`,
    titel: t?.t || 'Kein Eintrag für heute',
    unterHtml: t?.p && t.p !== 'travel' && t.t !== ort.name ? `<span class="punkt" style="--ort:${ort.farbe}"></span>${e(ort.name)}` : '',
    farbe: ort.farbe,
  });

  const countdownAbflug = ph.abflug && ph.abflug > jetzt ? `
    <p class="hinweiszeile" data-cd="${e(ph.abflug.toISOString())}">✈️ Abflug in <b data-cd-teil="uhr" class="tabellenzahl">––:––:––</b></p>` : '';

  const transport = zeilen(t?.tr);
  const stay = t?.stay && !/flieger/i.test(t.stay) ? t.stay : null;
  const det = stay ? unterkunftDetails(eigene, stay) : {};
  const stayUnter = [det.zimmer && `Zimmer ${det.zimmer}`, ...zeilen(t?.ci)].filter(Boolean).join(' · ');
  const fluege = fluegeAm(eigene, ph.datum);

  const ausgaben = gueltigeAusgaben(eigene).filter((a) => a.d === ph.datum);
  const eur = ausgaben.reduce((s, a) => s + inEur(a), 0);
  const thb = ausgaben.reduce((s, a) => s + inThb(a), 0);
  const status = budgetStatus(eur, tagesbudgetEur(daten, eigene));

  const tagebuch = eigene?.tagebuch?.[ph.datum];
  const hatTagebuch = !!(tagebuch?.text || tagebuch?.fotos?.length || tagebuch?.stimmung);
  const ideen = t?.p && t.p !== 'travel' ? ideenFuerOrt(daten, eigene, t.p) : [];
  const offeneWuensche = ideen.filter((i) => i.status === 'will').length;

  const heuteDe = datumIn(jetzt, TZ_DE);
  const bald = naechsteFristen(daten.fristen, jetzt).filter((f) => tageDiff(heuteDe, datumIn(f.zeit, TZ_DE)) <= 3);

  const morgenDatum = plusTage(ph.datum, 1);
  const morgen = ph.tage.find((x) => x.d === morgenDatum);
  const morgenOrt = morgen ? ortInfo(daten, morgen.p) : null;

  return `
    ${kopf}
    ${countdownAbflug}
    ${transport.length ? abschnitt('Unterwegs heute', `<ul class="schritte">${transport.map((x) => `<li>${e(x)}</li>`).join('')}</ul>`) : ''}
    ${fluege.length ? abschnitt('Flug heute', liste(fluege.map((f) => flugZeile(f, jetzt)))) : ''}
    ${abschnitt('Heute', liste([
      stay ? { href: `#tag/${ph.datum}`, icon: '🛏️', titel: stay, unter: stayUnter || 'Hotel-Details & Karte' } : null,
      !stay && t?.ci ? { icon: '🔑', titel: zeilen(t.ci).join(' · ') } : null,
      t?.prog && !transport.length ? { icon: '🗓️', titel: t.prog } : null,
      imLand ? { href: '#ausgaben', icon: '💸', titel: 'Ausgaben', unter: thb ? `${STATUS_TEXT[status].icon} ${STATUS_TEXT[status].text}` : 'Noch nichts eingetragen', wert: thb ? formatThb(thb) : '＋' } : null,
      { href: `#tagebuch/${ph.datum}`, icon: tagebuch?.stimmung || '📔', titel: hatTagebuch ? 'Tagebuch' : 'Tagebuch schreiben', unter: tagebuch?.text ? tagebuch.text.slice(0, 60) : '' },
      ideen.length ? { href: `#ideen/${t.p}`, icon: '💡', titel: `Ideen für ${ort.name}`, wert: offeneWuensche ? `${offeneWuensche} ⭐` : `${ideen.length}` } : null,
    ]))}
    ${t?.note ? `<p class="notiz">📝 ${zeilen(t.note).map(e).join('<br>')}</p>` : ''}
    ${bald.length ? abschnitt('Bald fällig', liste(bald.map((f) => fristZeile(f, jetzt, ph.tz, '#fristen', true)))) : ''}
    ${morgen ? abschnitt('Morgen', liste([{
      href: `#tag/${morgenDatum}`,
      punkt: morgenOrt.farbe,
      titel: morgen.t || morgenOrt.name,
      unter: zeilen(morgen.tr)[0] || (morgen.stay && morgen.stay !== t?.stay ? `🛏️ ${morgen.stay}` : formatTag(morgenDatum, true)),
    }, ...fluegeAm(eigene, morgenDatum).map((f) => flugZeile(f, jetzt))])) : ''}
    ${uhren(jetzt)}`;
}

// ---------- Nach der Reise ----------

function nachher(daten, ph, eigene) {
  const eintraege = Object.keys(eigene?.tagebuch ?? {}).length;
  return `
    ${held({ label: 'Reise beendet', titel: 'Willkommen zurück! 🏠', unter: `${formatTag(ph.tage[0]?.d ?? ph.datum, true)} bis ${formatTag(ph.tage[ph.tage.length - 1]?.d ?? ph.datum, true)}` })}
    ${abschnitt('Erinnerungen', liste([
      { href: '#tagebuch', icon: '📔', titel: 'Reisetagebuch', wert: eintraege ? `${eintraege} Tage` : '' },
      { href: '#ausgaben/statistik', icon: '💸', titel: 'Ausgaben-Übersicht' },
      { href: '#daten', icon: '💾', titel: 'Backup mit Fotos speichern' },
    ]))}`;
}
