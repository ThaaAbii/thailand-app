# Datenformat für neue Infos (Hotels, Flüge, Buchungen)

Diese Datei beschreibt, wie neue Reise-Infos (aus Screenshots/PDFs) in die **private** `reise-daten.json`
kommen. Sie enthält **keine persönlichen Daten** – die echte Datei liegt nur auf dem Handy und wird nie committet.

## Ablauf (für Claude in einer neuen Sitzung)

1. Der Nutzer lädt hoch: seine aktuelle `reise-daten.json` (oder ein Backup `thailand-backup-….json`),
   die Infos im Format unten (`neue-infos.json` oder als Text im Chat) und ggf. Bilder.
2. Infos in eine Datei `neue-infos.json` schreiben (im Scratchpad, nicht im Repo), Bilder in denselben Ordner.
3. Einfügen:
   ```bash
   python3 tools/daten_einfuegen.py /pfad/reise-daten.json /pfad/neue-infos.json --bilder /pfad/bilder
   ```
   Bilder werden verkleinert (max. 1200 px, JPEG) und eingebettet. Bei einem Backup vorher `reise` + `_app`
   beachten: das Werkzeug arbeitet auf den Reisedaten-Feldern der obersten Ebene – ein Backup funktioniert
   genauso, weil `_app` unverändert bleibt.
4. Prüfen: `node -e "import('./app/js/daten.js').then(m=>console.log(m.pruefeReiseDaten(JSON.parse(require('fs').readFileSync('DATEI')))))"`
5. Fertige Datei dem Nutzer schicken → in der App unter **Mehr → Daten & Backup → Importieren**.
   Häkchen, Ausgaben und eigene Fotos (`_app`/IndexedDB) bleiben erhalten.

Aus Bildern in Screenshots/PDFs können Fotos ausgeschnitten werden (`pdftoppm -r 150 -png`, Pillow `crop`).

## `neue-infos.json`

```json
{
  "hotels": { "<Name genau wie im Fahrplan (tage[].stay) oder dessen Anfang>": { … Hotel … } },
  "fluege": [ { … Flug … } ],
  "buchungen": [ { … Buchung … } ]
}
```

Alle Felder sind optional. Unbekanntes einfach weglassen – **nichts erfinden**.

### Hotel

| Feld | Typ | Beispiel |
|---|---|---|
| `thai` | Text | Name in Thai-Schrift |
| `sterne` | Zahl | `3` |
| `bewertung` | `{ note, text, anzahl, zitat }` | `{ "note": 9.2, "text": "Großartig", "anzahl": 167, "zitat": "…" }` |
| `adresse`, `telefon`, `mail` | Text | |
| `checkin`, `checkout` | Text | `"Mi., 18.11. · 14:00–24:00"` |
| `zimmer` | Text (kurz) | `"Einzelzimmer"` |
| `buchung` | Text | Buchungsnummer / PIN des Hotels |
| `zimmerInfo` | `{ name, merkmale[], ausstattung[] }` | merkmale: Bett, m², Blick, Personen, Mahlzeiten |
| `bezahlt` | Zahl (€) | `58.67` |
| `bezahltText` | Text | `"Online-Vorauszahlung · bezahlt"` oder `"vor Ort zahlen"` |
| `preis` | Liste `{ was, betrag, unter?, rabatt? }` | Rabatte mit negativem Betrag und `"rabatt": true`, Unterposten mit `"unter": true` |
| `highlights` | Liste Text | |
| `regeln` | Liste `{ titel, text, icon? }` | Kaution, Rezeption, Frühstück, Verbote, Mindestalter |
| `zahlung` | Liste Text | `["Visa", "Bargeld"]` |
| `lage` | Liste `{ gruppe, punkte: [{ was, typ?, entfernung }] }` | Gruppen z. B. „Transport“, „Shopping & Essen“, „Sehenswürdigkeiten“ |
| `ausstattung` | Liste `{ gruppe, punkte[] }` | „kostenlos“ im Text → grün; „Kein …“ → durchgestrichen |
| `beschreibung` | Liste Absätze | |
| `hinweise` | Liste Text | eigene Tipps (z. B. Gepäckaufbewahrung am Abreisetag) |
| `quelle` | Text | `"Trip.com, Stand 16.10.2026"` |
| `bilder` | Liste | Dateinamen (werden eingebettet) oder `data:image/…;base64,…` |

`icon` (optional): `geld`, `uhr`, `info`, `notfall`, `person`, `pin`, `stern`, `bett`, `kalender`, `telefon`, `wlan`, `schluessel`.

### Flug

| Feld | Typ | Beispiel |
|---|---|---|
| `d` | Datum Abflug (Ortszeit) | `"2026-11-20"` |
| `nummer` | Text | `"PG191"` |
| `airline` | Text | `"Bangkok Airways"` |
| `von`, `nach` | IATA-Code | `"BKK"`, `"USM"` |
| `abflug`, `ankunft` | `HH:MM` Ortszeit | `"19:15"`, `"20:25"` |
| `terminal` | Text | `"Terminal 1 · Gate B3"` |
| `sitz` | Text | `"23A"` |
| `gepaeck` | Text | `"20 kg Aufgabe · 7 kg Hand"` |
| `code` | Buchungscode/PNR | `"ABC123"` |
| `checkinStunden` | Zahl | Online-Check-in öffnet … Std. vor Abflug |
| `notiz` | Text | Umstieg, Ticketnummer, Klasse … |
| `checkin` | `offen` / `erledigt` / `unnoetig` | `unnoetig` für 2. Teilstrecke (Check-in läuft mit der 1.) |

Bei Umstiegen `checkinStunden` nur bei der **ersten** Teilstrecke setzen, sonst erscheinen doppelte Check-in-Aufgaben.
Trip.com-Buchungsnummern gehören in `notiz`, `code` ist der Airline-Code (PNR, 6 Zeichen).

Ein Flug mit Umstieg = **ein Eintrag pro Teilstrecke** (gleicher `code`, Hinweis in `notiz`).
Flüge werden über `nummer` + `d` mit vorhandenen zusammengeführt; Angaben, die der Nutzer in der App
geändert hat, werden nicht überschrieben (nur leere Felder werden ergänzt).

### Buchung (Kosten-Blatt)

`{ kategorie, leistung, ueber, gebucht, eur, zahlung, storno, bis, risiko, stornoStatus }` –
`stornoStatus`: `ok` (kostenlos stornierbar), `warn` (offen), `crit` (nicht erstattbar).
Zusammengeführt über `leistung`.
