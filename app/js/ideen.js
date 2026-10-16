// Ausflugsideen pro Ort mit „will ich“ / „gemacht“.
import { e, ortInfo } from './ui.js';
import { liste, abschnitt, held, leer } from './bausteine.js';
import { neueId } from './listenlogik.js';
import { route } from './karte.js';

// Vorschläge (allgemeine Reise-Infos, keine persönlichen Daten)
const VORSCHLAEGE = {
  bkk: [
    ['Wat Pho & liegender Buddha', 'Riesiger goldener Buddha – am besten früh morgens'],
    ['Großer Palast', 'Kleiderordnung: lange Hose, Schultern bedeckt'],
    ['Wat Arun', 'Mit der Fähre über den Fluss, schön zum Sonnenuntergang'],
    ['Chinatown (Yaowarat)', 'Abends Streetfood – an „mai sai moo“ denken'],
    ['Chao-Phraya-Expressboot', 'Günstige Stadtrundfahrt auf dem Fluss'],
    ['Nachtmarkt', 'z. B. Jodd Fairs: Essen, Klamotten, Atmosphäre'],
    ['Große Mall', 'ICONSIAM oder Siam Paragon – Klimaanlage und Food Courts'],
    ['Lumphini Park', 'Grüne Pause mitten in der Stadt, Warane beobachten'],
  ],
  samui: [
    ['Ang Thong Marine Park', 'Bootstour mit Kajak, Aussichtspunkt und Schnorcheln'],
    ['Big Buddha (Wat Phra Yai)', 'Wahrzeichen im Norden der Insel'],
    ['Fisherman’s Village (Bophut)', 'Freitags Walking-Street-Markt'],
    ['Na-Muang-Wasserfall', 'Baden im Naturbecken'],
    ['Lamai Beach & Hin Ta Hin Yai', 'Felsformationen, ruhigerer Strand'],
    ['Tagesausflug Koh Phangan', 'Mit der Fähre, schöne Buchten im Norden'],
    ['Chaweng Night Market', 'Streetfood am Abend'],
  ],
  tao: [
    ['Fun Dives nach dem Kurs', 'z. B. Chumphon Pinnacle oder Sail Rock'],
    ['Koh Nang Yuan', 'Drei verbundene Inseln mit Aussichtspunkt'],
    ['Shark Bay schnorcheln', 'Mit Glück Riffhaie und Schildkröten'],
    ['John-Suwan-Viewpoint', 'Kurzer Aufstieg, Blick auf zwei Buchten'],
    ['Freedom Beach', 'Ruhiger Strand im Süden'],
    ['Sonnenuntergang Sairee Beach', 'Mit einem Shake am Strand'],
    ['Tanote Bay / Aow Leuk', 'Schnorcheln direkt vom Strand aus'],
  ],
  aonang: [
    ['Railay Beach & Phra Nang Cave', 'Mit dem Longtail-Boot ab Ao Nang'],
    ['4-Islands-Tour', 'Phra Nang, Chicken Island, Tup Island, Poda'],
    ['Koh Phi Phi Tagestour', 'Maya Bay und Schnorcheln – früh buchen'],
    ['Hong Islands', 'Lagune mit Kajak, ruhiger als Phi Phi'],
    ['Tiger Cave Temple', 'Über 1.200 Stufen, tolle Aussicht – früh losgehen'],
    ['Emerald Pool & Hot Springs', 'Natürliche Pools im Dschungel'],
    ['Krabi Town Night Market', 'Viel Streetfood am Wochenende'],
    ['Kajak in den Mangroven', 'z. B. Ao Thalane – Felsen und Mangroven'],
  ],
};

const NAMEN = { bangkok: 'bkk', 'koh samui': 'samui', samui: 'samui', 'koh tao': 'tao', 'ao nang': 'aonang', krabi: 'aonang' };

function vorschlagsSchluessel(daten, ort) {
  if (VORSCHLAEGE[ort]) return ort;
  const name = (daten?.orte?.[ort]?.name ?? '').toLowerCase();
  const treffer = Object.keys(NAMEN).find((n) => name.includes(n));
  return treffer ? NAMEN[treffer] : null;
}

const STATUS = {
  offen: { icon: '○', text: 'Idee' },
  will: { icon: '⭐', text: 'Will ich machen' },
  gemacht: { icon: '✅', text: 'Gemacht' },
};
const NAECHSTER = { offen: 'will', will: 'gemacht', gemacht: 'offen' };

/** Alle Ideen eines Orts mit Status. */
export function ideenFuerOrt(daten, eigene, ort) {
  const status = eigene?.ideen?.status ?? {};
  const key = vorschlagsSchluessel(daten, ort);
  const vorschlaege = (VORSCHLAEGE[key] ?? []).map(([titel, info]) => {
    const k = `${ort}|${titel}`;
    return { key: k, titel, info, status: status[k] ?? 'offen', eigen: false };
  });
  const eigeneIdeen = (eigene?.ideen?.eigene ?? []).filter((x) => x?.ort === ort && x.titel).map((x) => {
    const k = `eigen:${x.id}`;
    return { key: k, id: x.id, titel: x.titel, info: 'Eigene Idee', status: status[k] ?? 'offen', eigen: true };
  });
  return [...eigeneIdeen, ...vorschlaege];
}

/** Orte der Reise in Reihenfolge (ohne Doppelte). */
function reiseOrte(daten) {
  const orte = [];
  for (const s of route(daten)) if (!orte.includes(s.p)) orte.push(s.p);
  return orte;
}

export function seiteIdeen(daten, eigene, teile) {
  const ort = teile[0];
  if (ort) return ortSeite(daten, eigene, ort);
  const orte = reiseOrte(daten);
  return {
    titel: 'Ausflugsideen',
    html: `
      ${held({ titel: 'Ausflugsideen', unter: 'Markiere, was du machen willst – und hake ab, was du gemacht hast.' })}
      ${liste(orte.map((p) => {
        const o = ortInfo(daten, p);
        const ideen = ideenFuerOrt(daten, eigene, p);
        const gemacht = ideen.filter((i) => i.status === 'gemacht').length;
        const will = ideen.filter((i) => i.status === 'will').length;
        return {
          href: `#ideen/${p}`, punkt: o.farbe, titel: o.name,
          unter: [will ? `${will} geplant` : '', gemacht ? `${gemacht} gemacht` : ''].filter(Boolean).join(' · ') || `${ideen.length} Ideen`,
        };
      }))}`,
  };
}

function ortSeite(daten, eigene, ort) {
  const o = ortInfo(daten, ort);
  const ideen = ideenFuerOrt(daten, eigene, ort);
  const gruppe = (st) => ideen.filter((i) => i.status === st);
  const zeileFuer = (i) => ({
    aktion: 'idee-status', daten: { key: i.key },
    icon: STATUS[i.status].icon,
    titel: i.titel,
    unter: i.info,
    wertHtml: i.eigen ? `<span class="zeile__klein" data-aktion="idee-loeschen" data-id="${e(i.id)}" role="button" aria-label="Löschen">×</span>` : '',
    pfeil: '',
    klasse: i.status === 'gemacht' ? 'ist-erledigt' : '',
  });
  return {
    titel: o.name,
    zurueck: '#ideen',
    html: `
      ${held({ label: 'Ausflugsideen', titel: o.name, unter: 'Antippen: Idee → will ich → gemacht', farbe: o.farbe })}
      ${abschnitt('Will ich machen', liste(gruppe('will').map(zeileFuer)))}
      ${abschnitt('Ideen', liste(gruppe('offen').map(zeileFuer)))}
      ${abschnitt('Gemacht', liste(gruppe('gemacht').map(zeileFuer)))}
      ${!ideen.length ? leer('Noch keine Ideen für diesen Ort.') : ''}
      <button class="knopf knopf--leise knopf--breit" data-aktion="idee-neu" data-ort="${e(ort)}">Eigene Idee</button>`,
  };
}

// ---------- Bedienung ----------

function ideenSpeicher(ctx) {
  const e2 = ctx.state.eigene;
  if (!e2.ideen || typeof e2.ideen !== 'object') e2.ideen = {};
  e2.ideen.status ??= {};
  e2.ideen.eigene ??= [];
  return e2.ideen;
}

export const ideenAktionen = {
  'idee-status': (el, ctx, ev) => {
    if (ev?.target?.closest('[data-aktion="idee-loeschen"]')) return;
    const s = ideenSpeicher(ctx);
    const jetzt = s.status[el.dataset.key] ?? 'offen';
    const neu = NAECHSTER[jetzt];
    if (neu === 'offen') delete s.status[el.dataset.key];
    else s.status[el.dataset.key] = neu;
    ctx.vibriere();
    ctx.speichereEigene();
    ctx.render();
  },
  'idee-loeschen': (el, ctx) => {
    if (!confirm('Diese eigene Idee löschen?')) return;
    const s = ideenSpeicher(ctx);
    s.eigene = s.eigene.filter((x) => x.id !== el.dataset.id);
    delete s.status[`eigen:${el.dataset.id}`];
    ctx.speichereEigene();
    ctx.render();
  },
  'idee-neu': (el, ctx) => {
    const titel = prompt('Deine Idee:')?.trim();
    if (!titel) return;
    ideenSpeicher(ctx).eigene.push({ id: neueId(), ort: el.dataset.ort, titel: titel.slice(0, 120) });
    ctx.speichereEigene();
    ctx.render();
  },
};
