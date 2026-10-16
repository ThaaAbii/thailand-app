# Thailand 2026 – Reise-App

Persönliche Reise-App (Progressive Web App) für meine Thailand-Reise vom 17.11. bis 10.12.2026.
Läuft im Browser auf dem Handy, lässt sich wie eine App installieren und funktioniert **offline**.

**Datenschutz:** Meine echten Reisedaten (`reise-daten.json`) liegen **nicht** in diesem Repository.
Sie werden in der App auf dem Handy importiert und bleiben dort (IndexedDB). Im Repo liegt nur
`app/demo-daten.json` mit erfundenen Beispieldaten.

## Stand

- ✅ Phase 1: Grundgerüst (offline, installierbar), JSON-Import/Export, Heute-Ansicht mit Countdown
- ✅ Phase 2: Fahrplan, Fristen (rot ≤ 7 / orange ≤ 21 Tage), Checkliste, Packliste mit Gewicht;
  dazu Buchungen, Tipps und ein Vorbereitungs-Überblick auf der Heute-Seite
- ✅ Phase 3: Ausgaben-Tracker in Baht (Kurs automatisch von der EZB via frankfurter.dev, Reserve open.er-api.com,
  offline der zuletzt geholte Kurs; Tagesbudget mit Ampel; Auswertung pro Tag/Kategorie/Ort; CSV-Export),
  Offline-Routenkarte (SVG), Thai-Spickzettel mit Vollbild-Zeigen, Notfall-Seite (SOS-Knopf oben rechts)
- ✅ App-Gefühl: kein Zoom, kein Pull-to-refresh, kein versehentliches Markieren, Installieren-Knopf, App-Kurzbefehle
- ✅ Phase 4: Reisetagebuch (Stimmung, Text, Fotos verkleinert in IndexedDB, Timeline; Backup inkl. Fotos),
  Ausflugsideen pro Ort (Vorschläge + eigene, ○ → ⭐ will ich → ✅ gemacht)
- ✅ Neues Design: ruhige Listen statt Kästen, Unterseiten mit Zurück-Pfeil (Hash-Routen wie `#tag/2026-11-21`,
  `#ausgaben/neu`), Scroll-Position bleibt beim Zurückgehen erhalten, kein Scrollbalken

Eigene Einträge (Häkchen, eigene Checklisten-Punkte, Packliste, Ausgaben, Tagebuch, Ideen, Einstellungen, zuletzt geholter Kurs) liegen in IndexedDB unter `eigene`
und sind im Backup-Export unter `_app.eigene` enthalten. Fotos liegen im IndexedDB-Store `fotos` und stehen im Backup als data-URLs unter `_app.fotos`.

- ✅ Bearbeiten in der App: Tage (Titel, Programm, Transport, Unterkunft, Check-in/out, Notiz) als Änderungen
  in `eigene.tagAenderungen` (Original bleibt, pro Tag zurücksetzbar); Hotel-Details in `eigene.unterkuenfte`;
  Flüge in `eigene.fluege` mit Online-Check-in-Status – offene Check-ins erscheinen automatisch als Fristen

- ✅ Neuaufbau (Okt. 2026): Navigation **Heute · Reise · Aufgaben · Geld · Mehr**; „Aufgaben“ vereint Fristen,
  Checkliste und Online-Check-ins (abhakbar, eigene Aufgaben mit Datum); „Reise“ gliedert die Tage nach Etappen.
  Design: weiß, Karten mit feinem Rand, Schrift Figtree (lokal, OFL-Lizenz in `app/fonts/`), Linien-Symbole statt Emojis

## Aufbau

```
app/                 die fertige Website (wird 1:1 veröffentlicht)
  index.html         Seite
  sw.js              Service Worker (Offline-Speicher) – neue Dateien hier in DATEIEN eintragen!
  demo-daten.json    erfundene Beispieldaten
  js/                Logik (zeit.js = Zeitzonen & Reisetag, daten.js = Import/Export, …)
tests/               automatische Tests (npm test)
.github/workflows/   Veröffentlichung auf GitHub Pages
```

Kein Build-Schritt, keine Abhängigkeiten. Lokal starten: `npm start` → http://localhost:8080

## Zeitzonen

- Vor dem Abflug zählt das deutsche Datum, zwischen Abflug und Heimkehr das thailändische.
- „Tag X von 22“ zählt die Tage in Thailand; der Abflugtag heißt „Abreisetag“, der Rückkehrtag „Heimreisetag“.
- Fristen werden immer in deutscher **und** thailändischer Zeit angezeigt.
