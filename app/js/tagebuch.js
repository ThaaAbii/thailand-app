// Reisetagebuch: pro Tag Stimmung, Text und Fotos – als Timeline.
import { reisePhase, tagLabel, formatTag, plusTage } from './zeit.js';
import { e, ortInfo } from './ui.js';
import { held, leer } from './bausteine.js';
import { neueId } from './listenlogik.js';
import * as db from './db.js';

export const STIMMUNGEN = [
  ['😍', 'Traumhaft'], ['😊', 'Schön'], ['😐', 'Okay'], ['😕', 'Naja'], ['😫', 'Anstrengend'],
];

const MAX_SEITE = 1600;   // Fotos werden auf max. 1600 px verkleinert
const VORSCHAU = 400;     // Vorschaubilder

export function eintragVon(eigene, d) {
  const x = eigene?.tagebuch?.[d];
  return x && typeof x === 'object' ? x : null;
}

function hatInhalt(x) {
  return !!(x && (x.text?.trim() || x.fotos?.length || x.stimmung));
}

// ---------- Übersicht (Timeline) ----------

export function seiteTagebuch(daten, eigene, jetzt, teile) {
  if (teile[0] && /^\d{4}-\d{2}-\d{2}$/.test(teile[0])) return eintragSeite(daten, eigene, jetzt, teile[0]);
  const ph = reisePhase(daten, jetzt);
  const tage = Object.entries(eigene?.tagebuch ?? {})
    .filter(([d, x]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && hatInhalt(x))
    .sort(([a], [b]) => a.localeCompare(b));
  const heuteHatEintrag = hatInhalt(eintragVon(eigene, ph.datum));
  const fotosGesamt = tage.reduce((n, [, x]) => n + (x.fotos?.length ?? 0), 0);

  const timeline = tage.map(([d, x]) => {
    const t = (daten?.tage ?? []).find((y) => y.d === d);
    const ort = ortInfo(daten, t?.p);
    const label = ph.tage.length && d >= ph.tage[0].d && d <= ph.tage[ph.tage.length - 1].d ? tagLabel(ph, d).label : '';
    return `
      <li class="tl" style="--ort:${ort.farbe}">
        <a class="tl__karte" href="#tagebuch/${d}">
          <span class="tl__kopf">
            <span class="tl__datum">${e(formatTag(d))}${label ? ` · ${e(label)}` : ''}</span>
            ${x.stimmung ? `<span class="tl__stimmung" aria-hidden="true">${e(x.stimmung)}</span>` : ''}
          </span>
          <span class="tl__titel">${e(t?.t || ort.name || '')}</span>
          ${x.fotos?.length ? `<span class="tl__fotos">${x.fotos.slice(0, 3).map((id) => `<img data-foto="${e(id)}" alt="">`).join('')}${x.fotos.length > 3 ? `<span class="tl__mehr">+${x.fotos.length - 3}</span>` : ''}</span>` : ''}
          ${x.text?.trim() ? `<span class="tl__text">${e(x.text.trim())}</span>` : ''}
        </a>
      </li>`;
  }).join('');

  return {
    titel: 'Tagebuch',
    html: `
      ${held({ titel: 'Reisetagebuch', unter: tage.length ? `${tage.length} ${tage.length === 1 ? 'Tag' : 'Tage'} · ${fotosGesamt} Fotos` : 'Halte jeden Tag fest – mit Stimmung, ein paar Sätzen und Fotos.' })}
      <a class="knopf knopf--haupt knopf--breit" href="#tagebuch/${ph.datum}">${heuteHatEintrag ? 'Heutigen Eintrag öffnen' : 'Heute schreiben'}</a>
      ${tage.length ? `<ol class="timeline">${timeline}</ol>` : leer('Noch keine Einträge. Dein erster Eintrag erscheint hier als Timeline.')}
      <label class="feld feld--abstand"><span>Anderen Tag öffnen</span>
        <input type="date" class="eingabe" id="tagebuch-datum" value="${e(ph.datum)}">
      </label>`,
  };
}

// ---------- Eintrag eines Tages ----------

function eintragSeite(daten, eigene, jetzt, d) {
  const x = eintragVon(eigene, d) ?? {};
  const ph = reisePhase(daten, jetzt);
  const t = (daten?.tage ?? []).find((y) => y.d === d);
  const ort = ortInfo(daten, t?.p);
  const imPlan = ph.tage.length && d >= ph.tage[0].d && d <= ph.tage[ph.tage.length - 1].d;
  return {
    titel: formatTag(d),
    zurueck: '#tagebuch',
    html: `
      ${held({ label: imPlan ? `${tagLabel(ph, d).label} · ${formatTag(d, true)}` : formatTag(d, true), titel: t?.t || 'Tagebuch', farbe: ort.farbe })}

      <section class="abschnitt">
        <h2 class="label">Wie war der Tag?</h2>
        <div class="stimmungen" role="radiogroup" aria-label="Stimmung">
          ${STIMMUNGEN.map(([emoji, text]) => `
            <label class="stimmung">
              <input type="radio" name="stimmung" value="${emoji}" ${x.stimmung === emoji ? 'checked' : ''}>
              <span><b aria-hidden="true">${emoji}</b><small>${text}</small></span>
            </label>`).join('')}
        </div>
      </section>

      <section class="abschnitt">
        <h2 class="label">Was ist passiert? <span class="label__status" id="tagebuch-status"></span></h2>
        <textarea id="tagebuch-text" class="textfeld" rows="6" placeholder="Ein paar Sätze reichen – wo warst du, was hast du gegessen, wen getroffen?" data-datum="${e(d)}">${e(x.text ?? '')}</textarea>
      </section>

      <section class="abschnitt">
        <h2 class="label">Fotos</h2>
        <div class="fotoraster">
          ${(x.fotos ?? []).map((id) => `<button class="foto" data-aktion="foto-zeigen" data-id="${e(id)}" aria-label="Foto ansehen"><img data-foto="${e(id)}" alt=""></button>`).join('')}
          <label class="foto foto--neu" aria-label="Fotos hinzufügen">
            <input type="file" id="foto-datei" accept="image/*" multiple hidden data-datum="${e(d)}">
            <span>+<small>Foto</small></span>
          </label>
        </div>
        <p class="leise klein">Fotos werden verkleinert und nur auf deinem Handy gespeichert. Im Backup (unter Mehr → Daten) sind sie enthalten.</p>
      </section>

      <nav class="blaettern">
        <a class="knopf" href="#tagebuch/${plusTage(d, -1)}">‹ Vortag</a>
        <a class="knopf" href="#tagebuch/${plusTage(d, 1)}">Nächster Tag ›</a>
      </nav>`,
  };
}

// ---------- Fotos ----------

const urlCache = new Map();

/** Vorschaubilder nach dem Zeichnen nachladen (asynchron aus IndexedDB). */
export async function ladeFotos(root) {
  for (const img of root.querySelectorAll('img[data-foto]')) {
    const id = img.dataset.foto;
    if (urlCache.has(id)) {
      img.src = urlCache.get(id);
      continue;
    }
    try {
      const f = await db.fotoLesen(id);
      if (!f) continue;
      const url = URL.createObjectURL(f.vorschau ?? f.bild);
      urlCache.set(id, url);
      img.src = url;
    } catch { /* Foto fehlt */ }
  }
}

async function verkleinere(datei, max, qualitaet) {
  const bmp = await createImageBitmap(datei);
  const faktor = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * faktor);
  const h = Math.round(bmp.height * faktor);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return new Promise((ok, fehler) => canvas.toBlob((b) => (b ? ok(b) : fehler(new Error('Bild konnte nicht umgewandelt werden'))), 'image/jpeg', qualitaet));
}

/** Foto speichern (verkleinert + Vorschau). Gibt die neue ID zurück. */
export async function fotoAufnehmen(datei, d, id = neueId()) {
  const bild = await verkleinere(datei, MAX_SEITE, 0.82);
  const vorschau = await verkleinere(bild, VORSCHAU, 0.75);
  await db.fotoSpeichern({ id, d, bild, vorschau, erstellt: new Date().toISOString() });
  return id;
}

function eintrag(ctx, d) {
  const e2 = ctx.state.eigene;
  if (!e2.tagebuch || typeof e2.tagebuch !== 'object') e2.tagebuch = {};
  if (!e2.tagebuch[d]) e2.tagebuch[d] = { text: '', fotos: [] };
  e2.tagebuch[d].fotos ??= [];
  return e2.tagebuch[d];
}

let speicherTimer = null;

/** Eingaben auf der Tagebuch-Seite. */
export function tagebuchEingabe(t, ctx) {
  if (t.id !== 'tagebuch-text') return false;
  const x = eintrag(ctx, t.dataset.datum);
  x.text = t.value.slice(0, 20000);
  x.geaendert = new Date().toISOString();
  const status = document.getElementById('tagebuch-status');
  if (status) status.textContent = '…';
  clearTimeout(speicherTimer);
  speicherTimer = setTimeout(async () => {
    await ctx.speichereEigene();
    if (status) status.textContent = 'gespeichert ✓';
  }, 600);
  return true;
}

export async function tagebuchAenderung(t, ctx) {
  if (t.name === 'stimmung') {
    const d = document.getElementById('tagebuch-text')?.dataset.datum;
    if (!d) return false;
    const x = eintrag(ctx, d);
    x.stimmung = x.stimmung === t.value ? '' : t.value;
    ctx.vibriere();
    await ctx.speichereEigene();
    return true;
  }
  if (t.id === 'tagebuch-datum' && t.value) {
    location.hash = `#tagebuch/${t.value}`;
    return true;
  }
  if (t.id === 'foto-datei' && t.files?.length) {
    const d = t.dataset.datum;
    const dateien = [...t.files];
    ctx.toast(`${dateien.length === 1 ? 'Foto wird' : `${dateien.length} Fotos werden`} gespeichert …`);
    let ok = 0;
    for (const datei of dateien) {
      try {
        const id = await fotoAufnehmen(datei, d);
        eintrag(ctx, d).fotos.push(id);
        ok += 1;
      } catch { /* einzelnes Bild übersprungen */ }
    }
    await ctx.speichereEigene();
    ctx.dauerhaftAnfragen?.();
    ctx.toast(ok === dateien.length ? 'Gespeichert ✓' : `${ok} von ${dateien.length} Fotos gespeichert`);
    ctx.render();
    return true;
  }
  return false;
}

export const tagebuchAktionen = {
  'foto-zeigen': async (el, ctx) => {
    const id = el.dataset.id;
    const f = await db.fotoLesen(id).catch(() => null);
    if (!f) return;
    const url = URL.createObjectURL(f.bild);
    const ov = document.createElement('div');
    ov.className = 'fotoansicht';
    ov.innerHTML = `
      <img src="${url}" alt="">
      <div class="fotoansicht__leiste">
        <button class="knopf" data-fa="zu">Schließen</button>
        <button class="knopf knopf--gefahr" data-fa="weg">Löschen</button>
      </div>`;
    const zu = () => {
      ov.remove();
      URL.revokeObjectURL(url);
    };
    history.pushState({ foto: true }, '');
    window.addEventListener('popstate', zu, { once: true });
    ov.addEventListener('click', async (ev) => {
      const was = ev.target.closest('[data-fa]')?.dataset.fa;
      if (was === 'weg') {
        if (!confirm('Dieses Foto löschen?')) return;
        if (el.dataset.flug) {
          const flug = (ctx.state.eigene.fluege ?? []).find((y) => y.id === el.dataset.flug);
          if (flug) flug.fotos = (flug.fotos ?? []).filter((y) => y !== id);
        } else {
          const x = eintrag(ctx, f.d);
          x.fotos = x.fotos.filter((y) => y !== id);
        }
        await db.fotoLoeschen(id).catch(() => {});
        urlCache.delete(id);
        await ctx.speichereEigene();
        history.back();
        setTimeout(() => ctx.render(), 50);
      } else if (was === 'zu' || ev.target === ov) {
        history.back();
      }
    });
    document.body.append(ov);
  },
};

// ---------- Backup ----------

function blobZuDataUrl(blob) {
  return new Promise((ok, fehler) => {
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.onerror = () => fehler(r.error);
    r.readAsDataURL(blob);
  });
}

/** Alle Fotos als { id: { d, data } } für das Backup. */
export async function fotosFuerBackup() {
  const alle = await db.alleFotos().catch(() => []);
  const aus = {};
  for (const f of alle) aus[f.id] = { d: f.d, data: await blobZuDataUrl(f.bild) };
  return aus;
}

/** Fotos aus einem Backup zurückspielen. Gibt die Anzahl zurück. */
export async function fotosAusBackup(fotos) {
  let n = 0;
  for (const [id, f] of Object.entries(fotos ?? {})) {
    if (typeof f?.data !== 'string' || !f.data.startsWith('data:image/')) continue;
    try {
      const blob = await (await fetch(f.data)).blob();
      const vorschau = await verkleinere(blob, VORSCHAU, 0.75);
      await db.fotoSpeichern({ id, d: f.d, bild: blob, vorschau, erstellt: new Date().toISOString() });
      n += 1;
    } catch { /* Foto übersprungen */ }
  }
  return n;
}
