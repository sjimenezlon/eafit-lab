"""Prepara la escena del Bloque 20 para Blender: todo en metros locales.

Origen = centro de la huella catastral del Bloque 20 (Catastro Medellín,
ide_catastro capa 7, objectid 263489). x = este, y = norte.

Salidas (blender/):
  escena.json   huella, edificios vecinos (City Urban 2025), árboles
  suelo.png     plano del suelo dibujado con OpenStreetMap (0,25 m/px)

Árboles: los del SAU (Alcaldía) con especie y altura, más copas detectadas
en la ortofoto Esri World Imagery (vegetación oscura y texturada, sin canchas
ni edificios). Las copas detectadas tienen altura ilustrativa.

Requiere: shapely numpy scipy pillow (venv aparte; el Python de Blender no
las trae). Uso:  python preparar_escena.py
"""
import json, math, os, random, urllib.request
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd
from shapely.geometry import shape, Polygon, LineString, Point
from shapely.ops import unary_union

R = Path(__file__).resolve().parents[1]
B = R / "blender"
LAT0, LON0 = 6.1985327, -75.5792027
KX = 111320 * math.cos(math.radians(LAT0)); KY = 110574
RADIO = 250          # entorno modelado
LADO = 512           # lado del plano del suelo (m)
PX = 0.25            # m por píxel del suelo
random.seed(20)

def xy(lon, lat):
    return (round((lon - LON0) * KX, 2), round((lat - LAT0) * KY, 2))

def anillos(geom):
    if geom["type"] == "Polygon": return [geom["coordinates"][0]]
    if geom["type"] == "MultiPolygon": return [p[0] for p in geom["coordinates"]]
    return []

# ------------------------------------------------------------ huella y vecinos
cat = json.load(open(R / "scripts/crudo/catastro.geojson"))
huella = next(f for f in cat["features"] if f["properties"]["objectid"] == 263489)
esc = {"origen": [LAT0, LON0], "huella": [xy(*c) for c in huella["geometry"]["coordinates"][0]],
       "huella_props": huella["properties"], "edificios": [], "arboles": []}

edif_polys = []
for f in json.load(open(R / "public/data/edificios.geojson"))["features"]:
    for a in anillos(f["geometry"]):
        p = [xy(*c) for c in a]
        mx = sum(q[0] for q in p) / len(p); my = sum(q[1] for q in p) / len(p)
        if math.hypot(mx, my) > RADIO or (abs(mx) < 19 and abs(my) < 27):  # fuera, o el propio Bloque 20
            continue
        esc["edificios"].append({"p": p[:-1], "h": f["properties"].get("h") or 6, "c": f["properties"].get("c", 0)})
        edif_polys.append(Polygon(p).buffer(0))
edif_u = unary_union(edif_polys + [Polygon(esc["huella"]).buffer(2.5)])

# ------------------------------------------------------------ OSM: suelo
osm = json.load(open(B / "osm_entorno.json"))["elements"]
ANCHO = {"trunk": 15, "trunk_link": 8, "primary": 13, "primary_link": 8, "secondary": 11, "secondary_link": 7,
         "tertiary": 9, "tertiary_link": 6, "residential": 7.5, "unclassified": 7, "service": 5,
         "footway": 2.4, "pedestrian": 4, "cycleway": 2.6, "steps": 2.4, "path": 2}
COL = {"base": "#e2ded5", "verde": "#c3d5b3", "cancha": "#a6c597", "parqueo": "#cbc9c3", "via": "#a4a3a0",
       "anden": "#efece5", "cicla": "#b5cde0", "agua": "#9cb8cf", "metro": "#979693", "riel": "#6c6b68"}
N = int(LADO / PX)
img = Image.new("RGB", (N, N), COL["base"]); dr = ImageDraw.Draw(img)
def pix(x, y): return ((x + LADO / 2) / PX, (LADO / 2 - y) / PX)
def poly(g, c):
    if g.is_empty: return
    for p in getattr(g, "geoms", [g]):
        if p.geom_type == "Polygon":
            dr.polygon([pix(*q) for q in p.exterior.coords], fill=c)
            for h in p.interiors: dr.polygon([pix(*q) for q in h.coords], fill=COL["base"])
def linea(e): return LineString([xy(n["lon"], n["lat"]) for n in e["geometry"]])
def area(e):
    pts = [xy(n["lon"], n["lat"]) for n in e["geometry"]]
    return Polygon(pts).buffer(0) if len(pts) >= 4 else Polygon()

canchas = []
capas = {k: [] for k in ("agua", "verde", "parqueo", "cancha", "via", "anden", "cicla", "metro")}
for e in osm:
    t = e.get("tags", {}); g = e.get("geometry")
    if not g: continue
    if t.get("natural") == "water" or t.get("waterway") in ("riverbank",):
        capas["agua"].append(area(e))
    elif t.get("waterway") in ("river", "canal", "stream"):
        capas["agua"].append(linea(e).buffer({"river": 10, "canal": 5}.get(t["waterway"], 2.5)))
    elif t.get("leisure") in ("park", "garden") or t.get("landuse") in ("grass", "recreation_ground"):
        capas["verde"].append(area(e))
    elif t.get("leisure") in ("pitch", "swimming_pool"):
        a = area(e); capas["cancha"].append(a); canchas.append(a)
    elif t.get("amenity") == "parking":
        capas["parqueo"].append(area(e))
    elif t.get("railway") in ("subway", "rail", "light_rail"):
        capas["metro"].append(linea(e).buffer(5))
    elif t.get("highway") in ANCHO and t.get("area") != "yes":
        hw = t["highway"]; w = ANCHO[hw]
        k = "anden" if hw in ("footway", "pedestrian", "steps", "path") else "cicla" if hw == "cycleway" else "via"
        capas[k].append(linea(e).buffer(w / 2, cap_style=2 if k == "via" else 1))
for k in ("verde", "cancha", "parqueo", "agua", "metro", "via", "cicla", "anden"):
    poly(unary_union(capas[k]) if capas[k] else Polygon(), COL[k])
# rieles del Metro: dos vías sobre la franja
for e in osm:
    if e.get("tags", {}).get("railway") in ("subway", "rail"):
        l = linea(e)
        for d in (-1.8, 1.8):
            o = l.parallel_offset(d, "left")
            for s in getattr(o, "geoms", [o]):
                dr.line([pix(*q) for q in s.coords], fill=COL["riel"], width=3)
img.save(B / "suelo.png", optimize=True)
print("suelo.png", img.size)

# ------------------------------------------------------------ árboles
# 1) SAU (Alcaldía): especie y altura
for f in json.load(open(R / "public/data/arboles3d.geojson"))["features"]:
    a = anillos(f["geometry"])[0]
    p = [xy(*c) for c in a[:-1]]
    mx = sum(q[0] for q in p) / len(p); my = sum(q[1] for q in p) / len(p)
    if math.hypot(mx, my) > RADIO: continue
    r = max(math.hypot(q[0] - mx, q[1] - my) for q in p)
    esc["arboles"].append({"x": round(mx, 1), "y": round(my, 1), "r": round(r, 1), "h": f["properties"]["h"], "o": "sau"})

# 2) copas en la ortofoto Esri World Imagery (z19, ~0,3 m/px)
Z = 19; n = 2 ** Z
def tile(lat, lon):
    return ((lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)
dlat = (RADIO + 20) / KY; dlon = (RADIO + 20) / KX
tx0, ty0 = map(int, tile(LAT0 + dlat, LON0 - dlon)); tx1, ty1 = map(int, tile(LAT0 - dlat, LON0 + dlon))
cache = B / "crudo_orto"; cache.mkdir(exist_ok=True)
orto = Image.new("RGB", ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
for X in range(tx0, tx1 + 1):
    for Y in range(ty0, ty1 + 1):
        fn = cache / f"{Z}_{X}_{Y}.jpg"
        if not fn.exists():
            urllib.request.urlretrieve(f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{Z}/{Y}/{X}", fn)
        orto.paste(Image.open(fn), ((X - tx0) * 256, (Y - ty0) * 256))
a = np.asarray(orto).astype(float)
Rr, Gg, Bb = a[..., 0], a[..., 1], a[..., 2]
gray = a.mean(-1); exg = 2 * Gg - Rr - Bb
m = nd.uniform_filter(gray, 7); tex = np.sqrt(np.maximum(nd.uniform_filter(gray ** 2, 7) - m * m, 0))
# la imagen tiene un tinte verde general: umbral alto y verde claramente sobre rojo y azul
copa = (exg > 30) & (Gg - Rr > 14) & (Gg - Bb > 12) & (a.max(-1) < 170) & (tex > 5)
copa = nd.binary_opening(nd.binary_closing(nd.binary_opening(copa, iterations=2), iterations=3), iterations=2)
def pix_lonlat(px, py):
    lon = (tx0 + px / 256) / n * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (ty0 + py / 256) / n))))
    return xy(lon, lat)
excluir = unary_union([edif_u] + canchas + capas["agua"] + capas["metro"])
ocupado = [(t["x"], t["y"], t["r"]) for t in esc["arboles"]]
ys, xs = np.nonzero(copa[::6, ::6])          # rejilla de ~1,8 m
orden = list(range(len(xs))); random.shuffle(orden)
nuevos = 0
for i in orden:
    x, y = pix_lonlat(xs[i] * 6 + 3, ys[i] * 6 + 3)
    if math.hypot(x, y) > RADIO or excluir.contains(Point(x, y)): continue
    r = random.uniform(3.0, 5.2)
    if any((x - ox) ** 2 + (y - oy) ** 2 < (0.8 * (r + orr)) ** 2 for ox, oy, orr in ocupado): continue
    ocupado.append((x, y, r)); nuevos += 1
    esc["arboles"].append({"x": round(x, 1), "y": round(y, 1), "r": round(r, 1), "h": round(random.uniform(8, 16), 1), "o": "orto"})

json.dump(esc, open(B / "escena.json", "w"))
print(len(esc["edificios"]), "edificios ·", len(esc["arboles"]), "árboles (", nuevos, "desde la ortofoto )")
