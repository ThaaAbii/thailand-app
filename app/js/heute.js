// Startseite „Heute“: das Wichtigste auf einen Blick.
import {
  TZ_DE, TZ_TH, uhrzeitIn, versatzStunden, plusTage, tageDiff, datumIn, formatTag,
  formatLang, countdown, reisePhase,
} from './zeit.js';
import { e, zeilen, ortInfo } from './ui.js';
import { liste, karte, abschnitt, held, kacheln } from './bausteine.js';
import { packSummen, formatKg, LIMITS } from './listenlogik.js';
import { tagesbudgetEur, gueltigeAusgaben, inEur, inThb, budgetStatus, STATUS_TEXT, formatThb, formatEur } from './ausgabenlogik.js';
import { fluegeAm, unterkunftDetails } from './anpassungen.js';
import { flugZeile } from './details.js';
import { alleAufgaben, anstehend, zaehle, aufgabeZeile } from './aufgaben.js';

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
      <span>Deutschland <b data-uhr="${TZ_DE}">${uhrzeitIn(jetzt, TZ_DE)}</b></span>
      <span>Thailand <b data-uhr="${TZ_TH}">${uhrzeitIn(jetzt, TZ_TH)}</b></span>
      <span>+${diff} Std.</span>
    </p>`;
}

// ---------- Vor der Reise ----------

function vorher(daten, ph, jetzt, eigene) {
  const aufgaben = alleAufgaben(daten, eigene);
  const z = zaehle(aufgaben);
  const naechste = anstehend(aufgaben, jetzt).slice(0, 4);
  const pack = Array.isArray(eigene?.packliste) ? eigene.packliste : null;
  const kg = packSummen(pack ?? []).aufgabe;

  return `
    ${ph.abflug ? `
    <section class="held held--gross" data-cd="${e(ph.abflug.toISOString())}">
      <p class="held__label">Noch bis zum Abflug</p>
      <h1 class="held__zahl"><span data-cd-teil="tage">–</span><small data-cd-teil="tage-label">Tage</small></h1>
      <p class="held__unter"><span data-cd-teil="uhr" class="tabellenzahl">––:––:––</span><span class="trenner"></span>${e(formatLang(ph.abflug, TZ_DE))} Uhr</p>
    </section>` : held({ titel: daten?.reise?.titel || 'Reise' })}
    ${kacheln([
      { href: '#aufgaben', zahl: z.offen, label: 'Aufgaben offen' },
      { href: '#packliste', zahl: pack ? formatKg(kg).replace(' kg', '') : '–', einheit: pack ? 'kg' : '', label: pack ? 'Aufgabegepäck' : 'Packliste anlegen', ton: kg > LIMITS.bangkokAirways ? 'warn' : '' },
    ])}
    ${abschnitt('Als Nächstes', naechste.length
      ? karte(naechste.map((a) => aufgabeZeile(a, jetzt)).join('') + '<a class="zeile zeile--fuss" href="#aufgaben"><span class="zeile__text"><span class="zeile__titel">Alle Aufgaben</span></span><span class="zeile__pfeil" aria-hidden="true"></span></a>')
      : karte('<p class="leer">Keine offenen Termine.</p>'))}
    ${uhren(jetzt)}`;
}

// ---------- Während der Reise ----------

function unterwegs(daten, ph, jetzt, eigene) {
  const t = ph.tag;
  const ort = ortInfo(daten, t?.p);
  const imLand = ph.label !== 'Abreisetag' && ph.label !== 'Heimreisetag';
  const schritte = zeilen(t?.tr);
  const stay = t?.stay && !/flieger/i.test(t.stay) ? t.stay : null;
  const det = stay ? unterkunftDetails(eigene, stay) : {};
  const stayUnter = [det.zimmer && `Zimmer ${det.zimmer}`, ...zeilen(t?.ci)].filter(Boolean).join(' · ');
  const fluege = fluegeAm(eigene, ph.datum);

  const ausgaben = gueltigeAusgaben(eigene).filter((a) => a.d === ph.datum);
  const eur = ausgaben.reduce((s, a) => s + inEur(a), 0);
  const thb = ausgaben.reduce((s, a) => s + inThb(a), 0);
  const status = budgetStatus(eur, tagesbudgetEur(daten, eigene));
  const tb = eigene?.tagebuch?.[ph.datum];

  const heuteDe = datumIn(jetzt, TZ_DE);
  const offen = anstehend(alleAufgaben(daten, eigene), jetzt);
  const bald = offen.filter((a) => a.faellig > jetzt && tageDiff(heuteDe, datumIn(a.faellig, TZ_DE)) <= 3);
  const ueberfaellig = offen.filter((a) => a.faellig <= jetzt).length;

  const morgenDatum = plusTage(ph.datum, 1);
  const morgen = ph.tage.find((x) => x.d === morgenDatum);
  const morgenOrt = morgen ? ortInfo(daten, morgen.p) : null;

  return `
    ${held({
      label: `${ph.label} · ${formatTag(ph.datum)}`,
      titel: t?.t || 'Kein Eintrag für heute',
      unterHtml: t?.p && t.p !== 'travel' && t.t !== ort.name ? `<span class="punkt" style="--ort:${ort.farbe}"></span>${e(ort.name)}` : '',
      farbe: ort.farbe,
    })}
    ${ph.abflug && ph.abflug > jetzt ? `<p class="hinweiszeile" data-cd="${e(ph.abflug.toISOString())}">Abflug in <b data-cd-teil="uhr" class="tabellenzahl">––:––:––</b></p>` : ''}
    ${imLand ? kacheln([
      { href: '#geld', zahl: thb ? formatThb(thb) : '0 ฿', label: thb ? `${formatEur(eur)} · ${STATUS_TEXT[status].text}` : 'heute ausgegeben', ton: status === 'rot' ? 'warn' : '' },
      { href: `#tagebuch/${ph.datum}`, zahl: tb?.stimmung || '+', label: tb?.text || tb?.fotos?.length ? 'Tagebuch' : 'Tagebuch schreiben' },
    ]) : ''}
    ${schritte.length ? abschnitt('Unterwegs heute', karte(`<ul class="schritte">${schritte.map((x) => `<li>${e(x)}</li>`).join('')}</ul>`, 'karte--text')) : ''}
    ${fluege.length ? abschnitt('Flug', liste(fluege.map((f) => flugZeile(f, jetzt)))) : ''}
    ${stay || t?.prog ? abschnitt('Heute', liste([
      stay ? { href: `#tag/${ph.datum}`, icon: 'bett', titel: stay, unter: stayUnter || 'Unterkunft' } : null,
      t?.prog && !schritte.length ? { href: `#tag/${ph.datum}`, icon: 'kalender', titel: t.prog } : null,
    ])) : ''}
    ${t?.note ? `<p class="notiz">${zeilen(t.note).map(e).join('<br>')}</p>` : ''}
    ${bald.length || ueberfaellig ? abschnitt('Bald fällig', karte(bald.map((a) => aufgabeZeile(a, jetzt, ph.tz)).join('')
      + (ueberfaellig ? `<a class="zeile zeile--fuss" href="#aufgaben"><span class="zeile__text"><span class="zeile__titel">${ueberfaellig} ${ueberfaellig === 1 ? 'überfällige Aufgabe' : 'überfällige Aufgaben'}</span></span><span class="zeile__pfeil" aria-hidden="true"></span></a>` : ''))) : ''}
    ${morgen ? abschnitt('Morgen', liste([
      {
        href: `#tag/${morgenDatum}`,
        punkt: morgenOrt.farbe,
        titel: morgen.t || morgenOrt.name,
        unter: zeilen(morgen.tr)[0] || (morgen.stay && morgen.stay !== t?.stay ? morgen.stay : formatTag(morgenDatum, true)),
      },
      ...fluegeAm(eigene, morgenDatum).map((f) => flugZeile(f, jetzt)),
    ])) : ''}
    ${uhren(jetzt)}`;
}

// ---------- Nach der Reise ----------

function nachher(daten, ph, eigene) {
  const tage = Object.values(eigene?.tagebuch ?? {}).filter((x) => x?.text || x?.fotos?.length).length;
  const fotos = Object.values(eigene?.tagebuch ?? {}).reduce((n, x) => n + (x?.fotos?.length ?? 0), 0);
  const eur = gueltigeAusgaben(eigene).reduce((s, a) => s + inEur(a), 0);
  return `
    ${held({ label: 'Reise beendet', titel: 'Willkommen zurück', unter: `${formatTag(ph.tage[0]?.d ?? ph.datum, true)} bis ${formatTag(ph.tage[ph.tage.length - 1]?.d ?? ph.datum, true)}` })}
    ${kacheln([
      { href: '#tagebuch', zahl: tage, label: tage === 1 ? 'Tag im Tagebuch' : 'Tage im Tagebuch' },
      { href: '#tagebuch', zahl: fotos, label: 'Fotos' },
      { href: '#geld/statistik', zahl: formatEur(eur), label: 'vor Ort ausgegeben' },
    ])}
    ${abschnitt('', liste([
      { href: '#tagebuch', icon: 'buch', titel: 'Reisetagebuch ansehen' },
      { href: '#daten', icon: 'speicher', titel: 'Backup mit Fotos speichern' },
    ]))}`;
}
