# Thailand 2026 – Reise-App

Persönliche Reise-App (Progressive Web App) für meine Thailand-Reise vom 17.11. bis 10.12.2026.
Läuft im Browser auf dem Handy, lässt sich wie eine App installieren und funktioniert **offline**.

**Datenschutz:** Meine echten Reisedaten (`reise-daten.json`) liegen **nicht** in diesem Repository.
Sie werden in der App auf dem Handy importiert und bleiben dort (IndexedDB). Im Repo liegt nur
`app/demo-daten.json` mit erfundenen Beispieldaten.

## Stand

- ✅ Phase 1: Grundgerüst (offline, installierbar), JSON-Import/Export, Heute-Ansicht mit Countdown
- ⏳ Phase 2–4: siehe `CLAUDE.md`

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
