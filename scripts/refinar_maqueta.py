"""Une la maqueta: el campus pasa de esquirlas de City Urban a volúmenes por bloque,
y el arbolado 3D y el viaducto del Metro dejan de tapar el modelo.

City Urban parte cada edificio en decenas de huellas. Dentro de cada bloque de
OpenStreetMap se funden las piezas cuyo techo es continuo. Fuera del campus se
descartan solo las esquirlas diminutas. Las copas 3D quedan en el campus; el
barrio sigue en puntos. El Metro se dibuja como un tablero estrecho y elevado.
"""
import json
import math
import random
import re
from collections import Counter, defaultdict
from pathlib import Path

from shapely.geometry import LineString, Polygon, mapping, shape
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree
from pyproj import Transformer

LAT0, LON0 = 6.2002, -75.5785
LOCAL = f"+proj=aeqd +lat_0={LAT0} +lon_0={LON0} +datum=WGS84 +units=m"
A_LOCAL = Transformer.from_crs("EPSG:4326", LOCAL, always_xy=True).transform
A_WGS = Transformer.from_crs(LOCAL, "EPSG:4326", always_xy=True).transform
HEX = [(math.cos(i * math.pi / 3), math.sin(i * math.pi / 3)) for i in range(6)]


def loc(g):
    return transform(A_LOCAL, g)


def rnd(geom, nd=6):
    def r(c):
        if isinstance(c, (list, tuple)) and c and isinstance(c[0], (int, float)):
            return [round(c[0], nd), round(c[1], nd)]
        return [r(x) for x in c]

    g = dict(geom)
    g["coordinates"] = r(g["coordinates"])
    return g


def etiqueta(name, ref):
    if ref:
        return str(ref)
    m = re.search(r"Bloque\s+(\d+)", name or "")
    if m:
        return m.group(1)
    cortos = (
        ("Biblioteca", "Biblioteca"),
        ("Argos", "Argos"),
        ("Fundadores", "Fundadores"),
        ("VIVO", "VIVO"),
        ("cafetería", "Cafetería"),
        ("Cafetería", "Cafetería"),
        ("cargas", "Cargas"),
        ("artístico", "Artes"),
        ("artistico", "Artes"),
        ("Torre", "Torre"),
        ("Portería", "Portería"),
        ("Casa ", None),
    )
    for clave, corto in cortos:
        if clave in (name or ""):
            if corto:
                return corto
            return name.replace(" - Universidad EAFIT", "").strip()
    return (name or "").split(" - ")[0][:18]


def _partes(g):
    if g.is_empty:
        return []
    if g.geom_type == "Polygon":
        return [g]
    if g.geom_type == "MultiPolygon":
        return [p for p in g.geoms if p.area >= 12]
    if g.geom_type == "GeometryCollection":
        out = []
        for p in g.geoms:
            out.extend(_partes(p))
        return out
    return []


def _fusionar(clips):
    """clips: (geom local, props). Une techos continuos."""
    clips = [(g, p) for g, p in clips if g.area >= 8]
    if not clips:
        return []
    parent = list(range(len(clips)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    bufs = [g.buffer(0.45, join_style=2) for g, _ in clips]
    tr = STRtree(bufs)
    for i, b in enumerate(bufs):
        hi = clips[i][1]["h"]
        for j in tr.query(b):
            j = int(j)
            if j <= i:
                continue
            hj = clips[j][1]["h"]
            if abs(hi - hj) > max(1.6, 0.08 * max(hi, hj)):
                continue
            if b.intersects(bufs[j]):
                ri, rj = find(i), find(j)
                if ri != rj:
                    parent[rj] = ri
    grupos = defaultdict(list)
    for i in range(len(clips)):
        grupos[find(i)].append(i)
    out = []
    for ids in grupos.values():
        u = unary_union([clips[i][0] for i in ids]).buffer(0)
        i0 = max(ids, key=lambda i: clips[i][0].area)
        base = dict(clips[i0][1])
        base["h"] = round(max(clips[i][1]["h"] for i in ids), 1)
        pisos = [clips[i][1].get("p") for i in ids if clips[i][1].get("p")]
        if pisos:
            base["p"] = Counter(pisos).most_common(1)[0][0]
        zs = [clips[i][1].get("z") for i in ids if clips[i][1].get("z") is not None]
        if zs:
            base["z"] = round(sum(zs) / len(zs), 1)
        for part in _partes(u.simplify(0.35)):
            if part.area < 12:
                continue
            p = dict(base)
            p["a"] = round(part.area)
            out.append((part, p))
    return out


def _feat(g_local, props):
    limpio = {k: v for k, v in props.items() if v is not None}
    return {
        "type": "Feature",
        "properties": limpio,
        "geometry": rnd(mapping(transform(A_WGS, g_local)), 6),
    }


def _masas(placas):
    """Una masa por bloque, o dos si hay un salto claro de techo (torre y plataforma)."""
    placas = [x for x in placas if x[0].area >= 40] or placas
    if not placas:
        return []
    grandes = [x for x in placas if x[0].area >= 80] or placas
    hs = sorted({round(p["h"], 1) for _, p in grandes})
    corte = None
    if len(hs) >= 2:
        i = max(range(len(hs) - 1), key=lambda k: hs[k + 1] - hs[k])
        if hs[i + 1] - hs[i] >= 8:
            corte = (hs[i] + hs[i + 1]) / 2
    grupos = [grandes] if corte is None else (
        [x for x in grandes if x[1]["h"] < corte],
        [x for x in grandes if x[1]["h"] >= corte],
    )
    out = []
    for grupo in grupos:
        if not grupo:
            continue
        u = unary_union([g for g, _ in grupo]).buffer(0)
        area = sum(g.area for g, _ in grupo) or 1
        h = sum(p["h"] * g.area for g, p in grupo) / area
        base = dict(max(grupo, key=lambda x: x[0].area)[1])
        base["h"] = round(h, 1)
        pisos = [p.get("p") for _, p in grupo if p.get("p")]
        if pisos:
            base["p"] = Counter(pisos).most_common(1)[0][0]
        for part in _partes(u.simplify(0.4)):
            if part.area < 30:
                continue
            p = dict(base)
            p["a"] = round(part.area)
            out.append((part, p))
    return out


def refinar_edificios(edif, bloques):
    """Devuelve (edificios, bloques con etiqueta corta)."""
    piezas = []
    ciudad = []
    for f in edif:
        g = loc(shape(f["geometry"])).buffer(0)
        if g.is_empty:
            continue
        p = dict(f["properties"])
        if p.get("c") == 1:
            piezas.append((g, p))
        elif g.area >= 15:
            ciudad.append((g, p))

    arbol = STRtree([g for g, _ in piezas]) if piezas else None
    usados = set()
    out = []

    for b in bloques:
        bg = loc(shape(b["geometry"])).buffer(0)
        nombre = b["properties"].get("name")
        ref = b["properties"].get("ref")
        b["properties"]["lbl"] = etiqueta(nombre, ref)
        clips = []
        if arbol is not None:
            for j in arbol.query(bg):
                j = int(j)
                inter = bg.intersection(piezas[j][0])
                if inter.is_empty or inter.area < 8:
                    continue
                if inter.area >= 12:
                    clips.append((inter, piezas[j][1]))
                    if inter.area >= 0.35 * piezas[j][0].area:
                        usados.add(j)
        vols = _masas(_fusionar(clips))
        if vols:
            for g, p in vols:
                p = dict(p)
                p["c"] = 1
                p["b"] = nombre
                if ref:
                    p["ref"] = str(ref)
                out.append(_feat(g, p))
            continue
        if bg.area < 40:
            continue
        nivel = b["properties"].get("levels")
        try:
            nivel = float(nivel) if nivel else None
        except (TypeError, ValueError):
            nivel = None
        h = round((nivel or 2) * 3.1, 1)
        out.append(_feat(bg, {
            "h": h, "p": int(nivel) if nivel else None, "a": round(bg.area),
            "c": 1, "b": nombre, "ref": str(ref) if ref else None, "e": 1,
        }))

    huellas = unary_union([loc(shape(b["geometry"])).buffer(0) for b in bloques]) if bloques else None
    for i, (g, p) in enumerate(piezas):
        if i in usados:
            continue
        resto = g.difference(huellas.buffer(0.5)) if huellas is not None else g
        for part in _partes(resto):
            if part.area < 70:
                continue
            pp = dict(p)
            pp["a"] = round(part.area)
            out.append(_feat(part, pp))

    for g, p in ciudad:
        out.append(_feat(g, p))

    for b in bloques:
        b["properties"].setdefault("lbl", etiqueta(b["properties"].get("name"), b["properties"].get("ref")))
    return out, bloques


def copas(arb):
    """Copas ilustrativas solo dentro del campus. El barrio no se extruye."""
    rng = random.Random(11)
    out = []
    for f in arb:
        if f["properties"].get("c") != 1:
            continue
        gl = loc(shape(f["geometry"])).centroid
        sp = f["properties"].get("sp") or ""
        nc = (f["properties"].get("nc") or "")
        palma = "Syagrus" in sp or "palma" in nc.lower() or "Palma" in nc
        h = rng.uniform(7, 13) if palma else rng.uniform(4.5, 9)
        r = rng.uniform(0.55, 1.05) if palma else rng.uniform(1.5, 2.6)
        hexa = Polygon([(gl.x + r * cx, gl.y + r * cy) for cx, cy in HEX])
        out.append({
            "type": "Feature",
            "properties": {"h": round(h, 1), "c": 1, "sp": sp, "nc": nc},
            "geometry": rnd(mapping(transform(A_WGS, hexa)), 6),
        })
    return out


def senderos(elementos, campus):
    """Caminos y vías internas del campus, como cintas sobre el prado."""
    campus_l = loc(campus).buffer(0)
    lineas = []
    vias = {"footway", "path", "pedestrian", "service", "living_street", "steps"}
    for e in elementos:
        t = e.get("tags") or {}
        if e.get("type") != "way" or t.get("highway") not in vias or "geometry" not in e:
            continue
        pts = [(p["lon"], p["lat"]) for p in e["geometry"]]
        if len(pts) < 2:
            continue
        g = loc(LineString(pts))
        if not g.intersects(campus_l):
            continue
        seg = g.intersection(campus_l)
        if seg.is_empty or seg.length < 12:
            continue
        lineas.append(seg)
    if not lineas:
        return []
    cinta = unary_union([ln.buffer(1.45, cap_style=2) for ln in lineas]).intersection(campus_l.buffer(-0.3))
    out = []
    for part in _partes(cinta.buffer(0).simplify(0.6)):
        if part.area < 25:
            continue
        out.append(_feat(part, {"k": "sendero"}))
    return out


def corredor_metro(lineas):
    """Tablero de ~2,3 m, no una franja de 6 m que se confunde con el río."""
    out = []
    for f in lineas:
        franja = transform(A_WGS, loc(shape(f["geometry"])).buffer(1.15, cap_style=2).simplify(0.35))
        out.append({
            "type": "Feature",
            "properties": {"name": f["properties"].get("name") or "Línea A"},
            "geometry": rnd(mapping(franja), 6),
        })
    return out


def main():
    sal = Path(__file__).parent.parent / "public" / "data"

    def load(n):
        return json.loads((sal / n).read_text())

    def write(n, obj):
        p = sal / n
        p.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))
        print(f"  {n}: {p.stat().st_size / 1e6:.2f} MB")

    edif = load("edificios.geojson")["features"]
    bloques = load("bloques.geojson")["features"]
    print("edificios antes", len(edif), "campus", sum(1 for f in edif if f["properties"].get("c") == 1))
    edif2, bloques2 = refinar_edificios(edif, bloques)
    campus = [f for f in edif2 if f["properties"].get("c") == 1]
    print("edificios después", len(edif2), "campus", len(campus),
          "estimados", sum(1 for f in campus if f["properties"].get("e")))
    write("edificios.geojson", {"type": "FeatureCollection", "features": edif2})
    write("bloques.geojson", {"type": "FeatureCollection", "features": bloques2})

    arb = load("arboles.geojson")["features"]
    arb3 = copas(arb)
    print("copas campus", len(arb3))
    write("arboles3d.geojson", {"type": "FeatureCollection", "features": arb3})

    metro = load("metro_linea.geojson")["features"]
    write("metro3d.geojson", {"type": "FeatureCollection", "features": corredor_metro(metro)})

    crudo = Path(__file__).parent / "crudo" / "osm.json"
    if crudo.exists():
        campus_g = shape(load("campus.geojson")["features"][0]["geometry"])
        snd = senderos(json.loads(crudo.read_text())["elements"], campus_g)
        print("senderos", len(snd))
        write("senderos.geojson", {"type": "FeatureCollection", "features": snd})

    resumen = load("resumen.json")
    resumen["edificios"]["medidos"] = resumen["edificios"].get("medidos") or resumen["edificios"]["n"]
    resumen["edificios"]["volumenes"] = len(edif2)
    resumen["edificios"]["campus_volumenes"] = len(campus)
    resumen["arboles"]["copas_3d"] = len(arb3)
    write("resumen.json", resumen)


if __name__ == "__main__":
    main()
