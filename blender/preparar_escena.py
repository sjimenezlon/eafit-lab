"""Prepara la escena del Bloque 20 para Blender: todo en metros locales.

Origen = centroide de la huella catastral del Bloque 20 (Catastro Medellín,
ide_catastro capa 7, objectid 263489). x = este, y = norte.
Entorno: edificios City Urban 2025 y árboles del SAU en 170 m a la redonda.
"""
import json, math
from pathlib import Path

R = Path(__file__).resolve().parents[1]
LAT0, LON0 = 6.1985327, -75.5792027
KX = 111320 * math.cos(math.radians(LAT0)); KY = 110574
RADIO = 170

def xy(lon, lat):
    return (round((lon - LON0) * KX, 2), round((lat - LAT0) * KY, 2))

def anillos(geom):
    if geom["type"] == "Polygon":
        return [geom["coordinates"][0]]
    if geom["type"] == "MultiPolygon":
        return [p[0] for p in geom["coordinates"]]
    return []

cat = json.load(open(R / "scripts/crudo/catastro.geojson"))
huella = next(f for f in cat["features"] if f["properties"]["objectid"] == 263489)
pts = [xy(*c) for c in huella["geometry"]["coordinates"][0]]


esc = {"origen": [LAT0, LON0], "huella": pts, "huella_props": huella["properties"], "edificios": [], "arboles": []}

ed = json.load(open(R / "public/data/edificios.geojson"))
for f in ed["features"]:
    for a in anillos(f["geometry"]):
        p = [xy(*c) for c in a]
        mx = sum(q[0] for q in p) / len(p); my = sum(q[1] for q in p) / len(p)
        if math.hypot(mx, my) > RADIO or (abs(mx) < 19 and abs(my) < 27):  # fuera, o el propio Bloque 20
            continue
        esc["edificios"].append({"p": p[:-1], "h": f["properties"].get("h") or 6})

ar = json.load(open(R / "public/data/arboles3d.geojson"))
for f in ar["features"]:
    a = anillos(f["geometry"])[0]
    p = [xy(*c) for c in a[:-1]]
    mx = sum(q[0] for q in p) / len(p); my = sum(q[1] for q in p) / len(p)
    r = max(math.hypot(q[0] - mx, q[1] - my) for q in p)
    if math.hypot(mx, my) > RADIO:
        continue
    esc["arboles"].append({"x": round(mx, 1), "y": round(my, 1), "r": round(r, 1), "h": f["properties"]["h"]})

json.dump(esc, open(R / "blender/escena.json", "w"))
print("huella", pts)
print(len(esc["edificios"]), "edificios", len(esc["arboles"]), "árboles")
