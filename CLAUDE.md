# Thailand-App – Projektbeschreibung für Claude Code

## Wer und was
Ich bin Abdullah, Azubi, null Programmierkenntnisse. Ich mache vom 17.11. bis 10.12.2026 eine Solo-Backpacking-Reise durch Südthailand
(Bangkok → Koh Samui → Koh Tao mit PADI-Tauchkurs → Ao Nang → Bangkok).
Ich will eine **persönliche App nur für mich**, auf meinem **Samsung Galaxy S25 Ultra** (Android, Chrome).

Erklär mir jeden Schritt, den ich selbst machen muss (z. B. auf GitHub klicken), in einfachem Deutsch. Code-Details musst du mir nicht erklären.

## Technische Leitplanken
- **Progressive Web App (PWA)**: installierbar über Chrome → „Zum Startbildschirm hinzufügen“. Kein Play Store, kein Android Studio.
- **Offline-fähig** (Service Worker): Fähren, Inseln und Flugzeug haben oft kein Netz. Nach dem ersten Öffnen muss alles ohne Internet laufen.
- **Kein Server, kein Login.** Alle Daten bleiben auf dem Handy (IndexedDB).
- **Keine persönlichen Daten im Repository.** Das Repo darf öffentlich sein (GitHub Pages). Meine Reisedaten liegen in `reise-daten.json`, die ich auf dem Handy **importiere** (Datei-Auswahl). Die App braucht deshalb:
  - Import von `reise-daten.json` beim ersten Start (und später erneut)
  - Export aller Daten inkl. meiner Einträge (Ausgaben, Häkchen, Tagebuch) als JSON-Backup
  - Eine kleine Beispiel-/Demo-Datei im Repo, damit die App auch ohne Import etwas zeigt
- Hosting: **GitHub Pages** über eine GitHub Action. Sag mir genau, welchen Schalter ich unter Settings → Pages umlegen muss.
- Einfacher Stack, wenig Abhängigkeiten (z. B. Vite + Vanilla JS/TypeScript oder Preact). Alles auf **Deutsch**, Hell- und Dunkelmodus, für Handy optimiert (große Tap-Flächen, Bottom-Navigation).
- Zeitzonen beachten: Deutschland UTC+1 (November), Thailand UTC+7. Fristen sind teils in deutscher Zeit, teils Ortszeit (steht in den Daten).

## Funktionen
Baue in Phasen. Nach jeder Phase soll eine funktionierende Version online sein, die ich am Handy testen kann.

**Phase 1 – Grundgerüst (zuerst!)**
1. PWA-Grundgerüst, Offline, Installierbarkeit, GitHub-Pages-Deployment
2. JSON-Import/Export
3. **Heute-Ansicht** als Startseite: vor der Reise Countdown + nächste Frist; während der Reise „Tag X von 22“, wo ich bin, Transport heute/morgen, Unterkunft, Check-in/out, Notizen

**Phase 2 – Planung**
4. **Fahrplan** Tag für Tag (Daten aus `tage`)
5. **Fristen** mit „noch X Tage“, Farben: rot ≤ 7 Tage, orange ≤ 21 Tage
6. **Checkliste** mit Gruppen, Fortschrittsbalken, „Erledigte ausblenden“
7. **Packliste mit Gewicht**: Gegenstände mit Gramm, getrennt nach Aufgabegepäck / Handgepäck / am Körper; Warnung bei Bangkok Airways 20 kg und Lufthansa 23 kg + 8 kg Handgepäck

**Phase 3 – Unterwegs**
8. **Ausgaben-Tracker in Baht**: schnell eintippen (Betrag, Kategorie, Notiz), Umrechnung in Euro (Kurs einstellbar, Standard 37,9), Tagesbudget ca. 52 € mit Ampel, Summen pro Tag/Ort/Kategorie, einfache Diagramme
9. **Routenkarte**: Offline-taugliche, vereinfachte Karte von Südthailand mit der Route (Flug/Fähre/Bus farbig). Optional online mit OpenStreetMap-Kacheln, aber offline darf nichts kaputtgehen
10. **Thai-Spickzettel**: wichtige Sätze mit Lautschrift und Thai-Schrift, Vollbild-„Zeigen“-Modus. Unbedingt dabei: „ohne Schweinefleisch“ (mai sai moo), „ist das halal?“, Preise fragen, danke, Entschuldigung, Zahlen, Wegbeschreibung, „ich bin allergisch“ als Vorlage
11. **Notfall-Seite**: Nummern aus `notfall` zum Antippen, Versicherungs-Notruf, Botschaft Bangkok

**Phase 4 – Erinnerung**
12. **Reisetagebuch**: pro Tag Text, Stimmung, Fotos (Fotos lokal speichern, verkleinert), Ansicht als schöne Timeline. Export als JSON; Fotos sollen nicht verloren gehen, wenn ich den Browser-Cache leere → beim Export mit sichern
13. **Ausflugsideen pro Ort** (Ang Thong, Phi Phi, Railay, 4 Islands, Fun Dives Koh Tao …) mit „will ich machen / gemacht“

**Benachrichtigungen:** Erinnerungen laufen bereits separat über geplante Aufgaben in Claude (Push aufs Handy). In der App reicht: Fristen und „morgen“-Hinweise auf der Heute-Ansicht. Optional, wenn einfach machbar: lokale Benachrichtigung, solange die App offen ist.

## Daten
`reise-daten.json` (liegt NICHT im Repo) enthält: `reise`, `orte`, `tage`, `buchungen`, `fristen`, `checkliste`, `tipps`, `budget`, `versicherung`, `notfall`.
Kurz zu `tage`: `d` Datum, `p` Ort-Schlüssel, `t` Titel, `prog` Programm, `tr` Transport, `stay` Unterkunft, `ci` Check-in/out, `note` Notiz.
Bei `fristen`: `t` Zeitpunkt mit Zeitzone, `w` was, `h` Hinweis, `s` Wichtigkeit (crit/warn/ok).
Lege im Repo eine `demo-daten.json` mit erfundenen Beispieldaten im selben Format an.

## Arbeitsweise
- Fang mit Phase 1 an und hör dort auf, damit ich testen kann.
- Halte Fragen an mich kurz und mit Auswahlmöglichkeiten.
- Am Ende jeder Phase: Link zur App und 3–5 Sätze, was ich am Handy ausprobieren soll.
