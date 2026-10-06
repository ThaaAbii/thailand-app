"""Erzeugt die App-Icons (Sonne über Meer). Aufruf: python3 tools/icons.py"""
from PIL import Image, ImageDraw

def icon(groesse, rand=0.0):
    s = 4 * groesse  # hochskaliert zeichnen, dann glätten
    img = Image.new("RGB", (s, s))
    d = ImageDraw.Draw(img)
    oben, unten = (11, 110, 120), (18, 154, 150)
    for y in range(s):
        t = y / s
        d.line([(0, y), (s, y)], fill=tuple(int(oben[i] + (unten[i] - oben[i]) * t) for i in range(3)))
    m = s * rand
    def p(x, y):
        return (m + x * (s - 2 * m), m + y * (s - 2 * m))
    # Sonne
    cx, cy = p(0.5, 0.42)
    r = 0.2 * (s - 2 * m)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 183, 77))
    # Wellen
    import math
    for i, (hoehe, farbe) in enumerate([(0.62, (255, 255, 255)), (0.74, (200, 240, 236))]):
        punkte = []
        for k in range(0, 201):
            x = k / 200
            y = hoehe + 0.025 * math.sin(x * math.pi * 4 + i)
            punkte.append(p(x, y))
        punkte += [p(1, 1), p(0, 1)]
        d.polygon([(0, punkte[0][1])] + punkte + [(0, s)], fill=farbe)
    return img.resize((groesse, groesse), Image.LANCZOS)

icon(192).save("app/icons/icon-192.png", optimize=True)
icon(512).save("app/icons/icon-512.png", optimize=True)
icon(512, rand=0.12).save("app/icons/icon-maskable-512.png", optimize=True)
