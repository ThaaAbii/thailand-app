// „Daten & Backup“: Import, Backup (mit/ohne Fotos), Installation, Darstellung, Testdatum, Infos.
import { formatTag, formatLang, TZ_DE } from './zeit.js';
import { e } from './ui.js';
import { liste, abschnitt } from './bausteine.js';

export function seiteDaten(s) {
  const z = s.zusammenfassung;
  const quelle = s.meta?.quelle === 'import'
    ? { icon: '✅', titel: 'Deine Reisedaten', unter: s.meta.importiertAm ? `Importiert am ${formatLang(new Date(s.meta.importiertAm), TZ_DE)} Uhr` : (s.meta.dateiname ?? '') }
    : { icon: 'ℹ️', titel: 'Demo-Daten', unter: 'Erfundene Beispiele – importiere deine reise-daten.json' };

  return {
    titel: 'Daten & Backup',
    zurueck: '#mehr',
    html: `
      ${abschnitt('Aktuell', liste([
        quelle,
        z ? { icon: '🗓️', titel: `${z.tage} Tage`, unter: z.von ? `${formatTag(z.von)} – ${formatTag(z.bis)}` : '', wert: `${z.fristen} Fristen` } : null,
      ]))}

      ${abschnitt('Reisedaten importieren', s.vorschau ? vorschauHtml(s.vorschau) : `
        <label class="knopf knopf--haupt knopf--breit">
          📂 Datei auswählen
          <input type="file" id="import-datei" hidden>
        </label>
        <p class="leise klein">Deine <code>reise-daten.json</code> oder ein Backup dieser App, z. B. aus „Downloads“.</p>`)}

      ${abschnitt('Backup', `
        ${liste([
          { aktion: 'export-download', daten: { fotos: '1' }, icon: '💾', titel: 'Backup mit Fotos speichern', unter: s.fotoAnzahl ? `Alles inkl. ${s.fotoAnzahl} Fotos – empfohlen` : 'Alle Daten und Einträge' },
          s.fotoAnzahl ? { aktion: 'export-download', daten: { fotos: '0' }, icon: '📄', titel: 'Kleines Backup ohne Fotos' } : null,
          s.kannTeilen ? { aktion: 'export-teilen', icon: '📤', titel: 'Backup teilen …', unter: 'z. B. in Google Drive speichern' } : null,
        ])}
        <p class="leise klein">${s.letztesBackup ? `Letztes Backup: ${e(formatLang(new Date(s.letztesBackup), TZ_DE))} Uhr. ` : ''}Mach regelmäßig ein Backup – vor allem, bevor du den Browser-Speicher leerst.</p>`)}

      ${s.installiert ? '' : abschnitt('Als App installieren', s.kannInstallieren
        ? '<button class="knopf knopf--haupt knopf--breit" data-aktion="installieren">📲 Jetzt installieren</button>'
        : '<p class="leise">In Chrome oben rechts auf <b>⋮</b> tippen und <b>„App installieren“</b> bzw. <b>„Zum Startbildschirm hinzufügen“</b> wählen.</p>')}

      ${abschnitt('Darstellung', `
        <div class="segment" role="radiogroup" aria-label="Farbschema">
          ${[['system', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']].map(([wert, text]) => `
            <label class="segment__teil">
              <input type="radio" name="thema" value="${wert}" ${s.thema === wert ? 'checked' : ''}>
              <span>${text}</span>
            </label>`).join('')}
        </div>`)}

      ${abschnitt('Testdatum', `
        <p class="leise klein">Zeigt die App so, als wäre dieser Tag (12:00 Uhr Thailand-Zeit) – zum Ausprobieren.</p>
        <div class="feldreihe">
          <input type="date" id="testdatum" class="eingabe" value="${e(s.testdatum ?? '')}" min="2026-01-01" max="2027-12-31" aria-label="Testdatum">
          ${s.testdatum ? '<button class="knopf" data-aktion="testdatum-weg">Zurücksetzen</button>' : ''}
        </div>`)}

      ${abschnitt('Über die App', liste([
        { icon: '📶', titel: 'Offline-Modus', wert: s.offlineBereit ? 'bereit ✓' : 'beim nächsten Öffnen' },
        { icon: '🔒', titel: 'Speicher', wert: s.persistent ? 'geschützt ✓' : 'normal' },
        { icon: 'ℹ️', titel: 'Version', wert: s.version },
      ]))}
      <button class="knopf knopf--text knopf--gefahr" data-aktion="demo-zurueck">Alles löschen &amp; Demo-Daten anzeigen</button>`,
  };
}

function vorschauHtml(v) {
  if (v.fehler) {
    return `
      <div class="hinweis hinweis--fehler">
        <p><strong>Diese Datei kann ich nicht importieren:</strong></p>
        <ul>${v.fehler.slice(0, 6).map((f) => `<li>${e(f)}</li>`).join('')}</ul>
        ${v.fehler.length > 6 ? `<p class="klein">… und ${v.fehler.length - 6} weitere Probleme</p>` : ''}
      </div>
      <button class="knopf knopf--breit" data-aktion="import-abbrechen">OK</button>`;
  }
  const z = v.zusammenfassung;
  return `
    <div class="hinweis">
      <p><strong>„${e(v.dateiname)}“</strong>${z.titel ? ` – ${e(z.titel)}` : ''}</p>
      <p>${z.tage} Tage${z.von ? ` (${e(formatTag(z.von))} – ${e(formatTag(z.bis))})` : ''} · ${z.fristen} Fristen · ${z.buchungen} Buchungen · ${z.checkpunkte} Checklisten-Punkte</p>
      ${v.mitEigenen ? `<p>📦 Das ist ein Backup – deine Einträge${v.fotoAnzahl ? ` und ${v.fotoAnzahl} Fotos` : ''} werden wiederhergestellt.</p>` : '<p class="leise klein">Deine bisherigen Einträge bleiben erhalten.</p>'}
      ${v.warnungen.length ? `<details><summary>${v.warnungen.length} Hinweis(e)</summary><ul>${v.warnungen.map((w) => `<li>${e(w)}</li>`).join('')}</ul></details>` : ''}
    </div>
    <div class="feldreihe">
      <button class="knopf knopf--haupt" data-aktion="import-ok">Übernehmen</button>
      <button class="knopf" data-aktion="import-abbrechen">Abbrechen</button>
    </div>`;
}
