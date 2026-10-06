// Die Seite „Daten“: Import, Export (Backup), Darstellung, Testdatum, Infos.
import { formatTag, formatLang, TZ_DE } from './zeit.js';
import { e } from './ui.js';
import { unterseitenKopf } from './bausteine.js';

export function renderDaten(s) {
  const z = s.zusammenfassung;
  const quelle = s.meta?.quelle === 'import'
    ? `<p>✅ Deine eigenen Reisedaten sind geladen${s.meta.dateiname ? ` (aus „${e(s.meta.dateiname)}“)` : ''}.</p>
       ${s.meta.importiertAm ? `<p class="leise klein">Importiert am ${e(formatLang(new Date(s.meta.importiertAm), TZ_DE))} Uhr</p>` : ''}`
    : `<p>ℹ️ Gerade siehst du <strong>Demo-Daten</strong> mit erfundenen Beispielen.</p>`;

  return `
    ${unterseitenKopf('Daten & Backup')}

    <section class="karte">
      <h2>Aktuelle Daten</h2>
      ${quelle}
      ${z ? `<ul class="zahlen">
        <li><b>${z.tage}</b> Tage${z.von ? ` <span class="leise">(${e(formatTag(z.von))} – ${e(formatTag(z.bis))})</span>` : ''}</li>
        <li><b>${z.fristen}</b> Fristen</li>
        <li><b>${z.buchungen}</b> Buchungen</li>
        <li><b>${z.checkpunkte}</b> Checklisten-Punkte</li>
      </ul>` : ''}
    </section>

    <section class="karte">
      <h2>Reisedaten importieren</h2>
      <p>Wähle deine Datei <code>reise-daten.json</code> (oder ein Backup dieser App) aus dem Handy-Speicher, z. B. aus „Downloads“.</p>
      ${s.vorschau ? vorschauHtml(s.vorschau) : `
      <label class="knopf knopf--haupt">
        📂 Datei auswählen
        <input type="file" id="import-datei" hidden>
      </label>`}
    </section>

    <section class="karte">
      <h2>Backup speichern</h2>
      <p>Speichert alle Daten inklusive deiner Einträge als JSON-Datei. Mach das regelmäßig – vor allem, bevor du den Browser-Speicher leerst.</p>
      <div class="knopfreihe">
        <button class="knopf" data-aktion="export-download">💾 Herunterladen</button>
        ${s.kannTeilen ? '<button class="knopf" data-aktion="export-teilen">📤 Teilen …</button>' : ''}
      </div>
      ${s.kannTeilen ? '<p class="leise klein">„Teilen“ eignet sich z. B. zum Speichern in Google Drive oder zum Mailen an dich selbst.</p>' : ''}
    </section>

    ${s.installiert ? '' : `
    <section class="karte">
      <h2>Als App installieren</h2>
      ${s.kannInstallieren
        ? '<p>Mit eigenem Symbol auf dem Startbildschirm, im Vollbild und offline.</p><button class="knopf knopf--haupt" data-aktion="installieren">📲 Jetzt installieren</button>'
        : '<p>In Chrome oben rechts auf <b>⋮</b> tippen und <b>„App installieren“</b> bzw. <b>„Zum Startbildschirm hinzufügen“</b> wählen.</p>'}
    </section>`}

    <section class="karte">
      <h2>Darstellung</h2>
      <div class="segment" role="radiogroup" aria-label="Farbschema">
        ${[['system', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']].map(([wert, text]) => `
          <label class="segment__teil">
            <input type="radio" name="thema" value="${wert}" ${s.thema === wert ? 'checked' : ''}>
            <span>${text}</span>
          </label>`).join('')}
      </div>
    </section>

    <section class="karte">
      <h2>Testdatum (zum Ausprobieren)</h2>
      <p>Stell ein Datum ein, um zu sehen, wie die Heute-Seite an diesem Tag aussieht (12:00 Uhr Thailand-Zeit).</p>
      <div class="knopfreihe">
        <input type="date" id="testdatum" class="eingabe" value="${e(s.testdatum ?? '')}" min="2026-01-01" max="2027-12-31">
        ${s.testdatum ? '<button class="knopf" data-aktion="testdatum-weg">Zurücksetzen</button>' : ''}
      </div>
    </section>

    <section class="karte">
      <h2>Über die App</h2>
      <ul class="infoliste">
        <li>Offline-Modus: ${s.offlineBereit ? '<b>bereit ✓</b>' : 'wird beim nächsten Öffnen aktiviert'}</li>
        <li>Speicher: ${s.persistent ? '<b>dauerhaft geschützt ✓</b>' : 'normal (Backup empfohlen)'}</li>
        <li>Version: <code>${e(s.version)}</code></li>
      </ul>
      <button class="knopf knopf--gefahr" data-aktion="demo-zurueck">Alles löschen &amp; Demo-Daten anzeigen</button>
    </section>
  `;
}

function vorschauHtml(v) {
  if (v.fehler) {
    return `
      <div class="hinweis hinweis--fehler">
        <p><strong>Diese Datei kann ich nicht importieren:</strong></p>
        <ul>${v.fehler.slice(0, 6).map((f) => `<li>${e(f)}</li>`).join('')}</ul>
        ${v.fehler.length > 6 ? `<p class="klein">… und ${v.fehler.length - 6} weitere Probleme</p>` : ''}
      </div>
      <button class="knopf" data-aktion="import-abbrechen">OK</button>`;
  }
  const z = v.zusammenfassung;
  return `
    <div class="hinweis">
      <p><strong>„${e(v.dateiname)}“</strong>${z.titel ? ` – ${e(z.titel)}` : ''}</p>
      <ul class="zahlen">
        <li><b>${z.tage}</b> Tage${z.von ? ` <span class="leise">(${e(formatTag(z.von))} – ${e(formatTag(z.bis))})</span>` : ''}</li>
        <li><b>${z.fristen}</b> Fristen · <b>${z.buchungen}</b> Buchungen · <b>${z.checkpunkte}</b> Checklisten-Punkte</li>
      </ul>
      ${v.mitEigenen ? '<p>📦 Das ist ein Backup – deine Einträge daraus werden wiederhergestellt.</p>' : '<p class="leise klein">Deine bisherigen Einträge bleiben erhalten.</p>'}
      ${v.warnungen.length ? `<details><summary>${v.warnungen.length} Hinweis(e)</summary><ul>${v.warnungen.map((w) => `<li>${e(w)}</li>`).join('')}</ul></details>` : ''}
    </div>
    <div class="knopfreihe">
      <button class="knopf knopf--haupt" data-aktion="import-ok">✅ Übernehmen</button>
      <button class="knopf" data-aktion="import-abbrechen">Abbrechen</button>
    </div>`;
}
