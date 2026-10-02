"""Corrige el Bloque 20 en public/data/edificios.geojson (correr después de build/refinar).

City Urban 2025 le da 19–20 m y solo cubre dos tercios de la huella: parece
medido con la obra a medias. Se reemplaza por la huella catastral (objectid
263489) y la altura del modelo de Blender (8 pisos → 34 m), marcada con e=2
para que la ficha la muestre como estimada. Detalle en /bloque20.
"""
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]
F = R / "public/data/edificios.geojson"
HUELLA = [[-75.5793521, 6.1987547], [-75.5793501, 6.1983088], [-75.5790528, 6.1983107],
          [-75.5790557, 6.1987567], [-75.5793521, 6.1987547]]
d = json.load(open(F))
n = 0
for f in d["features"]:
    if f["properties"].get("b") == "Bloque 20":
        f["geometry"] = {"type": "Polygon", "coordinates": [HUELLA]}
        f["properties"].update({"h": 34.0, "p": 8, "a": 1643, "e": 2})
        n += 1
assert n == 1, n
json.dump(d, open(F, "w"), separators=(",", ":"), ensure_ascii=False)
print("Bloque 20 corregido")
