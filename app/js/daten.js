// Prüfen, Importieren und Exportieren der Reisedaten.
import { parseZeit, datumIn, TZ_DE } from './zeit.js';

export const BACKUP_FORMAT = 'thailand-app-backup';

/** Prüft, ob ein Objekt wie eine reise-daten.json aussieht. */
export function pruefeReiseDaten(obj) {
  const fehler = [];
  const warnungen = [];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, fehler: ['Die Datei enthält keine Reisedaten.'], warnungen };
  }

  if (!obj.reise || typeof obj.reise !== 'object') {
    fehler.push('Der Abschnitt „reise“ fehlt.');
  } else {
    for (const k of ['abflug', 'heimkehr']) {
      if (!parseZeit(obj.reise[k])) fehler.push(`„reise.${k}“ fehlt oder ist kein gültiger Zeitpunkt.`);
    }
  }

  if (!Array.isArray(obj.tage) || obj.tage.length === 0) {
    fehler.push('Die Liste „tage“ (Fahrplan) fehlt oder ist leer.');
  } else {
    obj.tage.forEach((t, i) => {
      if (!t || typeof t.d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t.d)) {
        fehler.push(`Tag ${i + 1}: Datum „d“ fehlt oder ist nicht im Format JJJJ-MM-TT.`);
      }
    });
    const orte = obj.orte && typeof obj.orte === 'object' ? obj.orte : null;
    if (!orte) warnungen.push('Der Abschnitt „orte“ fehlt – Orte werden ohne Namen angezeigt.');
    else {
      const unbekannt = [...new Set(obj.tage.map((t) => t?.p).filter((p) => p && !orte[p]))];
      if (unbekannt.length) warnungen.push(`Unbekannte Orte im Fahrplan: ${unbekannt.join(', ')}.`);
    }
  }

  if (obj.fristen !== undefined && !Array.isArray(obj.fristen)) {
    fehler.push('„fristen“ muss eine Liste sein.');
  } else {
    (obj.fristen ?? []).forEach((f, i) => {
      if (!parseZeit(f?.t)) warnungen.push(`Frist ${i + 1} („${f?.w ?? '?'}“) hat keinen gültigen Zeitpunkt und wird übersprungen.`);
    });
  }

  return { ok: fehler.length === 0, fehler, warnungen };
}

/** Kurzer Überblick für die Anzeige vor dem Import. */
export function zusammenfassung(obj) {
  const tage = Array.isArray(obj?.tage) ? obj.tage.map((t) => t?.d).filter(Boolean).sort() : [];
  const punkte = (Array.isArray(obj?.checkliste) ? obj.checkliste : [])
    .reduce((n, g) => n + (Array.isArray(g?.punkte) ? g.punkte.length : 0), 0);
  return {
    titel: obj?.reise?.titel ?? '',
    tage: tage.length,
    von: tage[0] ?? null,
    bis: tage[tage.length - 1] ?? null,
    orte: obj?.orte && typeof obj.orte === 'object' ? Object.keys(obj.orte).length : 0,
    fristen: Array.isArray(obj?.fristen) ? obj.fristen.length : 0,
    buchungen: Array.isArray(obj?.buchungen) ? obj.buchungen.length : 0,
    checkpunkte: punkte,
  };
}

/** Trennt eine importierte Datei in Reisedaten und (bei Backups) eigene Einträge. */
export function trenneImport(obj) {
  const { _app, ...reise } = obj;
  const app = _app && typeof _app === 'object' && _app.format === BACKUP_FORMAT ? _app : null;
  return { reise, eigene: app && app.eigene && typeof app.eigene === 'object' ? app.eigene : null };
}

/** Backup = Reisedaten + eigene Einträge. Lässt sich genauso wieder importieren. */
export function baueExport(reise, eigene, jetzt = new Date()) {
  return {
    ...reise,
    _app: {
      format: BACKUP_FORMAT,
      version: 1,
      exportiertAm: jetzt.toISOString(),
      eigene: eigene ?? {},
    },
  };
}

export function backupDateiname(jetzt = new Date()) {
  return `thailand-backup-${datumIn(jetzt, TZ_DE)}.json`;
}
