#!/usr/bin/env python3
"""Neue Infos (Hotels, Flüge, Buchungen) in die private reise-daten.json einfügen.

Aufruf:
  python3 tools/daten_einfuegen.py <reise-daten.json> <neue-infos.json> [--bilder <ordner>] [--aus <ziel.json>]

- <neue-infos.json> hat das Format aus docs/DATENFORMAT.md: {"hotels": {...}, "fluege": [...], "buchungen": [...]}
- Bilder in "bilder" dürfen Dateinamen sein (relativ zu --bilder). Sie werden verkleinert (max. 1200 px,
  JPEG) und als data:-URL eingebettet. Fertige data:-URLs bleiben unverändert.
- Hotels werden pro Name ersetzt (vorhandene Bilder bleiben, wenn keine neuen angegeben sind).
- Flüge werden über Flugnummer + Datum zusammengeführt; Buchungen über „leistung“.
- Die Datei enthält persönliche Daten und gehört NIE ins Repository (.gitignore: reise-daten*.json).
"""
import argparse
import base64
import io
import json
import os
import sys


def bild_als_data_url(pfad, max_seite=1200, qualitaet=80):
    try:
        from PIL import Image
    except ImportError:  # ohne Pillow: Datei unverändert einbetten
        with open(pfad, 'rb') as f:
            roh = f.read()
        typ = 'png' if pfad.lower().endswith('.png') else 'jpeg'
        return f'data:image/{typ};base64,' + base64.b64encode(roh).decode()
    im = Image.open(pfad).convert('RGB')
    im.thumbnail((max_seite, max_seite))
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=qualitaet)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


def bilder_aufloesen(liste, ordner):
    aus = []
    for b in liste or []:
        if isinstance(b, str) and b.startswith('data:image/'):
            aus.append(b)
        elif isinstance(b, str):
            pfad = b if os.path.isabs(b) else os.path.join(ordner or '.', b)
            if os.path.exists(pfad):
                aus.append(bild_als_data_url(pfad))
            else:
                print(f'  ! Bild nicht gefunden: {pfad}', file=sys.stderr)
    return aus


def schluessel_flug(f):
    return (str(f.get('nummer', '')).replace(' ', '').upper(), f.get('d', ''))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('reise')
    ap.add_argument('neu')
    ap.add_argument('--bilder', default=None)
    ap.add_argument('--aus', default=None)
    a = ap.parse_args()

    with open(a.reise, encoding='utf-8') as f:
        daten = json.load(f)
    with open(a.neu, encoding='utf-8') as f:
        neu = json.load(f)
    ordner = a.bilder or os.path.dirname(os.path.abspath(a.neu))

    hotels = daten.setdefault('hotels', {})
    for name, h in (neu.get('hotels') or {}).items():
        alt = hotels.get(name, {})
        h = dict(h)
        if 'bilder' in h:
            h['bilder'] = bilder_aufloesen(h['bilder'], ordner)
            if not h['bilder']:
                h['bilder'] = alt.get('bilder', [])
        elif alt.get('bilder'):
            h['bilder'] = alt['bilder']
        hotels[name] = h
        print(f'Hotel: {name} ({len(h.get("bilder", []))} Bilder)')

    fluege = daten.setdefault('fluege', [])
    for fl in neu.get('fluege') or []:
        k = schluessel_flug(fl)
        vorhanden = next((x for x in fluege if schluessel_flug(x) == k), None)
        if vorhanden:
            vorhanden.update({kk: vv for kk, vv in fl.items() if vv not in ('', None)})
        else:
            fluege.append(fl)
        print(f'Flug: {k[0] or fl.get("airline", "?")} am {k[1]}')
    fluege.sort(key=lambda x: (x.get('d', ''), x.get('abflug', '')))

    buchungen = daten.setdefault('buchungen', [])
    for b in neu.get('buchungen') or []:
        vorhanden = next((x for x in buchungen if x.get('leistung') == b.get('leistung')), None)
        if vorhanden:
            vorhanden.update(b)
        else:
            buchungen.append(b)
        print(f'Buchung: {b.get("leistung")}')

    ziel = a.aus or a.reise
    with open(ziel, 'w', encoding='utf-8') as f:
        json.dump(daten, f, ensure_ascii=False, indent=2)
    print(f'Gespeichert: {ziel} ({os.path.getsize(ziel) // 1024} KB)')


if __name__ == '__main__':
    main()
