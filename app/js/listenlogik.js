// Reine Rechenlogik für Checkliste und Packliste (ohne Anzeige, gut testbar).

/** Gepäck-Grenzen in Gramm. */
export const LIMITS = { bangkokAirways: 20000, lufthansa: 23000, handgepaeck: 8000 };

export const BEREICHE = [
  { key: 'aufgabe', name: 'Aufgabegepäck', icon: '🧳' },
  { key: 'hand', name: 'Handgepäck', icon: '🎒' },
  { key: 'koerper', name: 'Am Körper', icon: '🧍' },
];

export function neueId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function punktSchluessel(gruppe, text) {
  return `${gruppe}|${text}`;
}

/**
 * Checkliste aus den Reisedaten + deinen Häkchen + deinen eigenen Punkten.
 * Häkchen werden über „Gruppe|Text“ gemerkt, damit sie einen erneuten Import überstehen.
 */
export function checklistenGruppen(daten, eigene) {
  const haken = eigene?.checkliste ?? {};
  const gruppen = [];
  const nachName = new Map();

  for (const g of Array.isArray(daten?.checkliste) ? daten.checkliste : []) {
    if (!g || typeof g.gruppe !== 'string') continue;
    const gruppe = { gruppe: g.gruppe, punkte: [] };
    for (const p of Array.isArray(g.punkte) ? g.punkte : []) {
      if (!p || typeof p.text !== 'string') continue;
      const key = punktSchluessel(g.gruppe, p.text);
      gruppe.punkte.push({ key, text: p.text, notiz: p.notiz ?? '', erledigt: haken[key] ?? !!p.erledigt, eigen: false });
    }
    gruppen.push(gruppe);
    nachName.set(g.gruppe, gruppe);
  }

  for (const p of Array.isArray(eigene?.checklisteEigene) ? eigene.checklisteEigene : []) {
    if (!p?.id || typeof p.text !== 'string') continue;
    const name = p.gruppe || 'Eigene Punkte';
    if (!nachName.has(name)) {
      const neu = { gruppe: name, punkte: [] };
      gruppen.push(neu);
      nachName.set(name, neu);
    }
    const key = `eigen:${p.id}`;
    nachName.get(name).punkte.push({ key, id: p.id, text: p.text, notiz: p.notiz ?? '', erledigt: haken[key] ?? false, eigen: true });
  }
  return gruppen;
}

export function fortschritt(punkte) {
  const gesamt = punkte.length;
  const erledigt = punkte.filter((p) => p.erledigt).length;
  return { gesamt, erledigt, prozent: gesamt ? Math.round((erledigt / gesamt) * 100) : 0 };
}

function zahl(x, standard) {
  const n = Number(x);
  return Number.isFinite(n) && n >= 0 ? n : standard;
}

export function gewichtVon(gegenstand) {
  return zahl(gegenstand?.g, 0) * zahl(gegenstand?.anzahl, 1);
}

/** Summen in Gramm pro Bereich. */
export function packSummen(liste) {
  const s = { aufgabe: 0, hand: 0, koerper: 0, gesamt: 0, anzahl: 0, gepackt: 0 };
  for (const x of Array.isArray(liste) ? liste : []) {
    const wo = BEREICHE.some((b) => b.key === x?.wo) ? x.wo : 'aufgabe';
    const g = gewichtVon(x);
    s[wo] += g;
    s.gesamt += g;
    s.anzahl += 1;
    if (x.gepackt) s.gepackt += 1;
  }
  return s;
}

/** Warnungen zu den Gepäck-Grenzen. stufe: 'rot' | 'orange' | 'ok'. */
export function packWarnungen(s) {
  const w = [];
  if (s.aufgabe > LIMITS.lufthansa) {
    w.push({ stufe: 'rot', text: `Aufgabegepäck über 23 kg – zu schwer für Lufthansa und Bangkok Airways (${formatKg(s.aufgabe - LIMITS.lufthansa)} zu viel).` });
  } else if (s.aufgabe > LIMITS.bangkokAirways) {
    w.push({ stufe: 'orange', text: `Über 20 kg – zu schwer für Bangkok Airways (Bangkok → Samui), ${formatKg(s.aufgabe - LIMITS.bangkokAirways)} zu viel. Lufthansa (23 kg) passt noch.` });
  } else if (s.aufgabe > 0) {
    w.push({ stufe: 'ok', text: `Aufgabegepäck passt: noch ${formatKg(LIMITS.bangkokAirways - s.aufgabe)} Luft bis 20 kg (Bangkok Airways).` });
  }
  if (s.hand > LIMITS.handgepaeck) {
    w.push({ stufe: 'rot', text: `Handgepäck über 8 kg – Lufthansa-Limit überschritten (${formatKg(s.hand - LIMITS.handgepaeck)} zu viel).` });
  }
  return w;
}

export function formatKg(gramm) {
  return `${(gramm / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
}

export function formatGramm(gramm) {
  return gramm >= 1000 ? formatKg(gramm) : `${Math.round(gramm)} g`;
}

/** Vorschlagsliste zum Start – Gewichte sind Schätzwerte, bitte selbst nachwiegen. */
export const PACK_VORLAGE = [
  ['Hauptgepäck (leer)', 2500, 1, 'aufgabe'],
  ['T-Shirts', 160, 6, 'aufgabe'],
  ['Shorts', 250, 3, 'aufgabe'],
  ['Lange Hose (Tempel)', 450, 1, 'aufgabe'],
  ['Unterhosen', 60, 7, 'aufgabe'],
  ['Socken', 50, 5, 'aufgabe'],
  ['Badehose', 150, 2, 'aufgabe'],
  ['Flip-Flops', 300, 1, 'aufgabe'],
  ['Regenponcho', 200, 1, 'aufgabe'],
  ['Mikrofaserhandtuch', 250, 2, 'aufgabe'],
  ['Kulturbeutel', 800, 1, 'aufgabe'],
  ['Sonnencreme', 250, 2, 'aufgabe'],
  ['Mückenspray', 150, 2, 'aufgabe'],
  ['Reiseapotheke', 500, 1, 'aufgabe'],
  ['Tauchmaske + Schnorchel', 450, 1, 'aufgabe'],
  ['Dry Bag', 150, 1, 'aufgabe'],
  ['Schloss mit Stahlseil', 200, 1, 'aufgabe'],
  ['Tagesrucksack', 700, 1, 'hand'],
  ['Laptop', 1500, 1, 'hand'],
  ['Netzteil + Reiseadapter', 400, 1, 'hand'],
  ['Powerbank (nur Handgepäck!)', 350, 2, 'hand'],
  ['Ladekabel', 50, 3, 'hand'],
  ['Kopfhörer', 250, 1, 'hand'],
  ['Action-Cam + Zubehör', 600, 1, 'hand'],
  ['SSD-Festplatten', 60, 2, 'hand'],
  ['Kompressionssocken', 80, 1, 'hand'],
  ['Handy', 230, 1, 'koerper'],
  ['Reisepass + Geldbeutel', 150, 1, 'koerper'],
  ['Kleidung für den Flug (inkl. Schuhe)', 1800, 1, 'koerper'],
  ['Sicherheitstasche', 80, 1, 'koerper'],
].map(([name, g, anzahl, wo]) => ({ name, g, anzahl, wo }));
