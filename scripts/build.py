"""Construye las capas de Eafit-Lab a partir de los crudos (scripts/crudo/).

Área: círculo de 1.500 m alrededor del campus EAFIT (OSM way 33784057).
Salida: public/data/*.geojson y public/data/resumen.json.
"""
import json
import math
import random
from collections import Counter, defaultdict
from pathlib import Path

import networkx as nx
from pyproj import Transformer
from shapely.geometry import LineString, Point, Polygon, mapping, shape
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree

LAT0, LON0, RADIO = 6.2002, -75.5785, 1500
AQUI = Path(__file__).parent
CRUDO = AQUI / "crudo"
SAL = AQUI.parent / "public" / "data"
SAL.mkdir(parents=True, exist_ok=True)

LOCAL = f"+proj=aeqd +lat_0={LAT0} +lon_0={LON0} +datum=WGS84 +units=m"
A_LOCAL = Transformer.from_crs("EPSG:4326", LOCAL, always_xy=True).transform
A_WGS = Transformer.from_crs(LOCAL, "EPSG:4326", always_xy=True).transform
CIRC_L = Point(0, 0).buffer(RADIO, quad_segs=64)
CIRC = transform(A_WGS, CIRC_L)
random.seed(7)


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


def fc(features):
    return {"type": "FeatureCollection", "features": features}


def write(name, obj):
    p = SAL / name
    p.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))
    print(f"  {name}: {p.stat().st_size/1e6:.2f} MB")


def load(name):
    return json.loads((CRUDO / name).read_text())


osm = load("osm.json")["elements"]


def way_poly(e):
    pts = [(p["lon"], p["lat"]) for p in e["geometry"]]
    if len(pts) < 4:
        return None
    return Polygon(pts).buffer(0)


# ---------------------------------------------------------------- campus
campus_polys = [way_poly(e) for e in osm if e["type"] == "way" and e["id"] in (33784057, 1311312323, 1311312586)]
CAMPUS = unary_union(campus_polys)
CAMPUS_L = loc(CAMPUS)
write("campus.geojson", fc([{"type": "Feature", "properties": {"name": "Universidad EAFIT · sede Medellín",
                                                              "area_m2": round(CAMPUS_L.area)},
                             "geometry": rnd(mapping(CAMPUS))}]))

# ---------------------------------------------------------------- bloques OSM del campus
osm_bld = []
for e in osm:
    if e["type"] == "way" and "building" in e.get("tags", {}) and "geometry" in e:
        g = way_poly(e)
        if g is None or g.is_empty:
            continue
        if CAMPUS.buffer(0.0002).contains(g.centroid):
            osm_bld.append((e, g))

# ---------------------------------------------------------------- edificios City Urban 2025
alt = load("alturas.geojson")["features"]
cat = load("catastro.geojson")["features"]
cat_g = [loc(shape(c["geometry"])).buffer(0) for c in cat]
cat_idx = STRtree(cat_g)
osm_l = [(e, loc(g)) for e, g in osm_bld]

edif, hs, campus_h = [], [], []
bloque_h = defaultdict(list)
for f in alt:
    a = f["properties"]
    agl, amsl = a.get("agl"), a.get("amsl")
    if not agl or agl <= 0 or amsl is None:
        continue
    g = shape(f["geometry"]).buffer(0)
    if g.is_empty or not g.intersects(CIRC):
        continue
    gl = loc(g)
    pisos = None
    best, ov = None, 0
    for j in cat_idx.query(gl):
        t = gl.intersection(cat_g[j]).area
        if t > ov:
            best, ov = j, t
    if best is not None and ov > 0.3 * gl.area:
        pisos = cat[best]["properties"].get("numero_pisos")
    en_campus = CAMPUS_L.buffer(3).contains(gl.centroid)
    bloque = None
    if en_campus:
        for e, ol in osm_l:
            if ol.intersects(gl) and gl.intersection(ol).area > 0.25 * min(gl.area, ol.area):
                bloque = e["tags"].get("name")
                bloque_h[e["id"]].append((agl, gl.area))
                break
        campus_h.append(agl)
    hs.append(agl)
    edif.append({"type": "Feature",
                 "properties": {"h": round(agl, 1), "z": round(amsl - agl, 1), "p": pisos,
                                "a": round(gl.area), "c": 1 if en_campus else 0,
                                **({"b": bloque} if bloque else {})},
                 "geometry": rnd(mapping(g.simplify(0.000004)), 6)})
write("edificios.geojson", fc(edif))

# bloques: huellas OSM con altura City Urban (máximo ponderado) y centroide
bloques = []
for e, g in osm_bld:
    t = e["tags"]
    name = t.get("name")
    if not name:
        continue
    hh = bloque_h.get(e["id"])
    h = round(max(x for x, _ in hh), 1) if hh else None
    gl = loc(g)
    bloques.append({"type": "Feature",
                    "properties": {"id": e["id"], "name": name, "ref": t.get("ref"),
                                   "levels": t.get("building:levels"), "h": h,
                                   "area_m2": round(gl.area), "kind": t.get("amenity") or t.get("building")},
                    "geometry": rnd(mapping(g))})
write("bloques.geojson", fc(bloques))

# ---------------------------------------------------------------- mapa oficial EAFIT (uMap)
oficial = []
for cat_, fn in (("parqueadero", "umap_parqueaderos.json"), ("porteria", "umap_accesos.json"),
                 ("deporte", "umap_deportes.json"), ("alimentacion", "umap_alimentacion.json")):
    for f in load(fn)["features"]:
        p = f["properties"]
        desc = (p.get("description") or "").strip()
        if cat_ == "porteria" and not p.get("name", "").startswith("Portería"):
            continue
        tipo = None
        if cat_ == "porteria":
            tipo = "vehicular" if "vehicular" in desc.split("\n")[0].lower() else "peatonal"
        oficial.append({"type": "Feature", "properties": {"cat": cat_, "name": p.get("name"), "desc": desc,
                                                          **({"tipo": tipo} if tipo else {})},
                        "geometry": rnd(f["geometry"])})
write("campus_oficial.geojson", fc(oficial))

# ---------------------------------------------------------------- población DANE CNPV 2018
man = []
tot = Counter()
# El servicio CNPV no publica geometría: se toma la del MGN 2024 por código de manzana.
MGN = {{k.upper(): v for k, v in f["properties"].items()}["MANZ_CCNCT"]: f["geometry"] for f in load("mgn_manzanas.geojson")["features"]}
for f in load("manzanas.geojson")["features"]:
    gj = MGN.get(f["properties"]["COD_DANE_A"])
    if not gj:
        continue
    g = shape(gj).buffer(0)
    if not g.intersects(CIRC):
        continue
    p = f["properties"]
    area = loc(g).area
    per = p.get("TP27_PERSO") or 0
    frac = loc(g).intersection(CIRC_L).area / area if area else 0
    ee = [p.get(f"TP19_EE_E{i}") or 0 for i in range(1, 7)]
    est = (sum((i + 1) * v for i, v in enumerate(ee)) / sum(ee)) if sum(ee) else None
    edad = [p.get(f"TP34_{i}_EDA") or 0 for i in range(1, 10)]
    for k, v in (("personas", per * frac), ("viviendas", (p.get("TVIVIENDA") or 0) * frac),
                 ("hogares", (p.get("TP16_HOG") or 0) * frac),
                 ("superior", (p.get("TP51SUPERI") or 0) * frac), ("posgrado", (p.get("TP51POSTGR") or 0) * frac)):
        tot[k] += v
    for i, v in enumerate(edad):
        tot[f"edad{i}"] += v * frac
    for i, v in enumerate(ee):
        tot[f"ee{i+1}"] += v * frac
    man.append({"type": "Feature",
                "properties": {"per": per, "viv": p.get("TVIVIENDA") or 0, "hog": p.get("TP16_HOG") or 0,
                               "dens": round(per / area * 10000) if area else 0,
                               "est": round(est, 1) if est else None,
                               "sup": (p.get("TP51SUPERI") or 0) + (p.get("TP51POSTGR") or 0),
                               "com": p.get("NMB_LC_CM"), "mun": "Envigado" if p.get("MPIO_CCDGO") == "266" else "Medellín"},
                "geometry": rnd(mapping(g.simplify(0.000005)))})
write("manzanas.geojson", fc(man))

# ---------------------------------------------------------------- estrato (Alcaldía)
est = []
cnt_est = Counter()
for f in load("estrato.geojson")["features"]:
    if not f.get("geometry"):
        continue
    g = shape(f["geometry"]).buffer(0)
    if not g.intersects(CIRC):
        continue
    e = f["properties"].get("estrato")
    cnt_est[e] += loc(g.intersection(CIRC)).area
    est.append({"type": "Feature", "properties": {"e": e, "barrio": f["properties"].get("codigo_barrio")},
                "geometry": rnd(mapping(g.simplify(0.000005)))})
write("estrato.geojson", fc(est))

# ---------------------------------------------------------------- árboles (SAU)
arb, esp_campus, esp_all = [], Counter(), Counter()
n_campus = 0
for f in load("arboles.geojson")["features"]:
    p = f["properties"]
    if p.get("s_estado_individuo") != "Activo" or not f.get("geometry"):
        continue
    g = shape(f["geometry"])
    if g.is_empty or not CIRC.contains(g):
        continue
    en = CAMPUS.contains(g)
    sp = p.get("s_especie") or "Sin identificar"
    esp_all[sp] += 1
    if en:
        n_campus += 1
        esp_campus[sp] += 1
    arb.append({"type": "Feature",
                "properties": {"sp": sp, "nc": (p.get("nombre_comun") or "").split(",")[0].strip(),
                               "c": 1 if en else 0},
                "geometry": rnd(mapping(g), 6)})
write("arboles.geojson", fc(arb))

# ---------------------------------------------------------------- equipamientos, espacio público, POT
def clip_layer(name, keep, out):
    feats = []
    for f in load(name)["features"]:
        if not f.get("geometry"):
            continue
        g = shape(f["geometry"]).buffer(0)
        if not g.intersects(CIRC):
            continue
        feats.append({"type": "Feature", "properties": {k: f["properties"].get(k) for k in keep},
                      "geometry": rnd(mapping(g.simplify(0.000005)))})
    write(out, fc(feats))
    return feats


eq = clip_layer("equipamientos.geojson", ["nombre", "tipo", "componentes", "nivel"], "equipamientos.geojson")
ep = clip_layer("espacio_publico.geojson", ["nombre", "categoria", "subcategor"], "espacio_publico.geojson")
pot = clip_layer("pot.geojson", ["codigo_tramiento", "tratamiento", "tipo", "densidadmax", "indiceconstruccmax",
                                 "alturanormativa"], "pot.geojson")

# ---------------------------------------------------------------- POI OSM
CATS = {
    "gastronomia": {"restaurant", "fast_food", "cafe", "bar", "ice_cream", "food_court", "pub", "nightclub"},
    "salud": {"hospital", "clinic", "pharmacy", "doctors", "dentist"},
    "educacion": {"school", "university", "college", "kindergarten", "library", "language_school"},
    "finanzas": {"bank", "atm", "bureau_de_change"},
    "cultura": {"theatre", "arts_centre", "cinema", "events_venue", "community_centre", "place_of_worship"},
    "servicios": {"fuel", "post_office", "police", "fire_station", "townhall", "courthouse"},
}
poi = []
for e in osm:
    t = e.get("tags", {})
    if not t.get("name"):
        continue
    cat_ = None
    am = t.get("amenity")
    for k, s in CATS.items():
        if am in s:
            cat_ = k
    if not cat_ and "shop" in t:
        cat_ = "comercio"
    if not cat_ and t.get("tourism") in ("hotel", "hostel", "apartment", "guest_house"):
        cat_ = "hospedaje"
    if not cat_ and "office" in t:
        cat_ = "oficinas"
    if not cat_ and t.get("leisure") in ("park", "sports_centre", "fitness_centre", "stadium", "pitch", "garden"):
        cat_ = "recreacion"
    if not cat_:
        continue
    if e["type"] == "node":
        pt = Point(e["lon"], e["lat"])
    elif "geometry" in e:
        try:
            pt = LineString([(p["lon"], p["lat"]) for p in e["geometry"]]).centroid
        except Exception:
            continue
    elif "bounds" in e:
        b = e["bounds"]
        pt = Point((b["minlon"] + b["maxlon"]) / 2, (b["minlat"] + b["maxlat"]) / 2)
    else:
        continue
    if not CIRC.contains(pt):
        continue
    poi.append({"type": "Feature", "properties": {"name": t["name"], "cat": cat_,
                                                  "tipo": am or t.get("shop") or t.get("tourism") or t.get("office") or t.get("leisure"),
                                                  "c": 1 if CAMPUS.contains(pt) else 0},
                "geometry": rnd(mapping(pt))})
write("poi.geojson", fc(poi))

# ---------------------------------------------------------------- transporte
metro_line, metro_st, bus_stops, cycle, water = [], [], [], [], []
for e in osm:
    t = e.get("tags", {})
    if e["type"] == "way" and t.get("railway") == "subway" and "geometry" in e:
        metro_line.append({"type": "Feature", "properties": {"name": t.get("name", "Línea A")},
                           "geometry": rnd(mapping(LineString([(p["lon"], p["lat"]) for p in e["geometry"]])))})
    if t.get("railway") == "station" and t.get("name") and t["name"] not in [m["properties"]["name"] for m in metro_st]:
        if e["type"] == "node":
            c = [e["lon"], e["lat"]]
        elif "bounds" in e:
            b = e["bounds"]
            c = [(b["minlon"] + b["maxlon"]) / 2, (b["minlat"] + b["maxlat"]) / 2]
        else:
            continue
        metro_st.append({"type": "Feature", "properties": {"name": t.get("name"), "kind": "metro"},
                         "geometry": {"type": "Point", "coordinates": [round(c[0], 6), round(c[1], 6)]}})
    if e["type"] == "node" and t.get("highway") == "bus_stop":
        bus_stops.append({"type": "Feature", "properties": {"name": t.get("name") or "Paradero"},
                          "geometry": {"type": "Point", "coordinates": [e["lon"], e["lat"]]}})
    if e["type"] == "way" and (t.get("highway") == "cycleway" or t.get("cycleway") in ("track", "lane")
                               or t.get("cycleway:right") in ("track", "lane") or t.get("cycleway:left") in ("track", "lane")) and "geometry" in e:
        cycle.append({"type": "Feature", "properties": {"name": t.get("name")},
                      "geometry": rnd(mapping(LineString([(p["lon"], p["lat"]) for p in e["geometry"]])))})
    if e["type"] == "way" and t.get("waterway") in ("river", "stream", "canal") and "geometry" in e:
        water.append({"type": "Feature", "properties": {"name": t.get("name"), "kind": t["waterway"]},
                      "geometry": rnd(mapping(LineString([(p["lon"], p["lat"]) for p in e["geometry"]])))})
# rutas de bus (relaciones)
bus_routes = []
for e in osm:
    if e["type"] == "relation" and e.get("tags", {}).get("route") == "bus":
        lines = []
        for m in e.get("members", []):
            if m["type"] == "way" and "geometry" in m:
                lines.append([[round(p["lon"], 6), round(p["lat"], 6)] for p in m["geometry"]])
        if lines:
            bus_routes.append({"type": "Feature", "properties": {"name": e["tags"].get("name"), "ref": e["tags"].get("ref")},
                               "geometry": {"type": "MultiLineString", "coordinates": lines}})
encicla = []
for s in load("encicla.json")["network"]["stations"]:
    pt = Point(s["longitude"], s["latitude"])
    if loc(pt).distance(Point(0, 0)) < 2500:
        encicla.append({"type": "Feature", "properties": {"name": s["name"], "free": s.get("free_bikes"),
                                                          "slots": s.get("empty_slots")},
                        "geometry": {"type": "Point", "coordinates": [s["longitude"], s["latitude"]]}})
write("metro_linea.geojson", fc(metro_line))
write("metro_estaciones.geojson", fc(metro_st))
write("paraderos.geojson", fc(bus_stops))
write("rutas_bus.geojson", fc(bus_routes))
write("ciclorrutas.geojson", fc(cycle))
write("encicla.geojson", fc(encicla))
write("agua.geojson", fc(water))

# ---------------------------------------------------------------- red peatonal/vial + rutas de agentes
G = nx.Graph()
GV = nx.Graph()
NOPIE = {"motorway", "motorway_link", "trunk_link"}
VEH = {"primary", "secondary", "tertiary", "residential", "unclassified", "service", "trunk",
       "primary_link", "secondary_link", "tertiary_link", "living_street"}
for e in osm:
    t = e.get("tags", {})
    hw = t.get("highway")
    if e["type"] != "way" or not hw or "geometry" not in e or hw in ("bus_stop", "platform", "construction", "proposed"):
        continue
    pts = [(round(p["lon"], 6), round(p["lat"], 6)) for p in e["geometry"]]
    for a, b in zip(pts, pts[1:]):
        d = loc(LineString([a, b])).length
        if hw not in NOPIE and t.get("foot") != "no":
            G.add_edge(a, b, w=d)
        if hw in VEH:
            GV.add_edge(a, b, w=d)
G = G.subgraph(max(nx.connected_components(G), key=len)).copy()
GV = GV.subgraph(max(nx.connected_components(GV), key=len)).copy()
nodes = list(G.nodes)
node_pts = [Point(n) for n in nodes]
nidx = STRtree(node_pts)
vnodes = list(GV.nodes)
vidx = STRtree([Point(n) for n in vnodes])


def nearest(pt, idx, arr):
    return arr[idx.nearest(pt)]


# destinos: bloques del campus con nombre, pesados por área
dest = [(Point(f["geometry"]["coordinates"][0][0]) if False else shape(f["geometry"]).centroid, f["properties"]["area_m2"])
        for f in bloques if f["properties"]["area_m2"] > 150]
dest_n = [(nearest(p, nidx, nodes), w) for p, w in dest]
dest_v = [nearest(p, vidx, vnodes) for p, _ in dest]


def pick_dest():
    tot_ = sum(w for _, w in dest_n)
    r = random.random() * tot_
    for n, w in dest_n:
        r -= w
        if r <= 0:
            return n
    return dest_n[-1][0]


def path(g, a, b):
    try:
        return [list(x) for x in nx.shortest_path(g, a, b, weight="w")]
    except nx.NetworkXNoPath:
        return None


gates_pie = list({nearest(shape(f["geometry"]).centroid, nidx, nodes) for f in oficial
                  if f["properties"]["cat"] == "porteria" and f["properties"]["tipo"] == "peatonal"})
gates_veh = list({nearest(shape(f["geometry"]).centroid, vidx, vnodes) for f in oficial
                  if f["properties"]["cat"] == "porteria" and f["properties"]["tipo"] == "vehicular"})
_, gate_path_pie = nx.multi_source_dijkstra(G, gates_pie, weight="w")
_, gate_path_veh = nx.multi_source_dijkstra(GV, gates_veh, weight="w")


def via_porteria(o, d, veh=False):
    """Origen → portería más cercana por la red → destino dentro del campus."""
    gp = (gate_path_veh if veh else gate_path_pie).get(o)
    if not gp:
        return None
    ida = list(reversed(gp))            # origen → portería
    resto = path(GV if veh else G, ida[-1], d)
    if not resto:
        return None
    return [list(x) for x in ida] + resto[1:]


def generar(pick, pick_v, pick_t):
    rutas = []
    for mode, pt, reps, nm in origins:
        o = nearest(pt, nidx, nodes)
        for _ in range(min(reps, 14)):
            p = via_porteria(o, pick())
            if p and len(p) > 2:
                rutas.append({"m": mode, "o": nm, "p": p})
    for n in bordes[:70]:
        p = via_porteria(n, pick_v(), veh=True)
        if p and len(p) > 2:
            rutas.append({"m": "carro", "o": "Vía de acceso", "p": p})
    for n in bordes[70:95]:
        p = path(GV, n, pick_t())
        if p and len(p) > 2:
            rutas.append({"m": "taxi", "o": "Plataforma / taxi", "p": p})
    for n in bordes[95:130]:
        p = via_porteria(n, pick_v(), veh=True)
        if p and len(p) > 2:
            rutas.append({"m": "moto", "o": "Vía de acceso", "p": p})
    return rutas


origins = []
for f in metro_st:
    origins.append(("metro", Point(f["geometry"]["coordinates"]), 14, f["properties"]["name"]))
for f in bus_stops:
    pt = Point(f["geometry"]["coordinates"])
    if loc(pt).distance(loc(CAMPUS.centroid)) < 900:
        origins.append(("bus", pt, 2, f["properties"]["name"]))
for f in encicla:
    pt = Point(f["geometry"]["coordinates"])
    if loc(pt).distance(Point(0, 0)) < 1600:
        origins.append(("bici", pt, 3, f["properties"]["name"]))
# peatones: desde manzanas residenciales pesadas por población
res = sorted(man, key=lambda f: -f["properties"]["per"])[:60]
for f in res:
    origins.append(("pie", shape(f["geometry"]).centroid, max(1, f["properties"]["per"] // 150), "Manzana residencial"))
# carros: desde bordes del área por vías vehiculares hacia portería/parqueaderos
bordes = [n for n in vnodes if 1250 < loc(Point(n)).distance(Point(0, 0)) < 1500]
random.shuffle(bordes)
park = [shape(f["geometry"]).centroid for f in oficial if f["properties"]["cat"] == "parqueadero"]
park_v = [nearest(p, vidx, vnodes) for p in park] or dest_v


def park_pick():
    return random.choice(park_v)


rutas = generar(pick_dest, park_pick, lambda: random.choice(dest_v))
aud = next(f for f in bloques if "Fundadores" in f["properties"]["name"])
aud_n = nearest(shape(aud["geometry"]).centroid, nidx, nodes)
aud_v = nearest(shape(aud["geometry"]).centroid, vidx, vnodes)
rutas_ev = generar(lambda: aud_n, park_pick, lambda: aud_v)
write("rutas_evento.json", rutas_ev)
write("rutas.json", rutas)
print("  rutas por modo:", Counter(r["m"] for r in rutas))

# ---------------------------------------------------------------- resumen
edad_lbl = ["0–9", "10–19", "20–29", "30–39", "40–49", "50–59", "60–69", "70–79", "80+"]
resumen = {
    "centro": [LON0, LAT0], "radio_m": RADIO,
    "campus_area_m2": round(CAMPUS_L.area),
    "edificios": {"n": len(hs), "h_max": round(max(hs), 1), "h_media": round(sum(hs) / len(hs), 1),
                  "campus_n": len(campus_h), "campus_h_max": round(max(campus_h), 1),
                  "campus_h_media": round(sum(campus_h) / len(campus_h), 1),
                  "mas_de_20_pisos": sum(1 for h in hs if h > 60)},
    "bloques_osm": len(bloques),
    "poblacion_2018": {k: round(v) for k, v in tot.items() if not k.startswith(("edad", "ee"))},
    "edad_2018": [{"g": edad_lbl[i], "v": round(tot[f"edad{i}"])} for i in range(9)],
    "estrato_energia_viv": {str(i): round(tot[f"ee{i}"]) for i in range(1, 7)},
    "estrato_area_ha": {str(k): round(v / 10000, 1) for k, v in sorted(cnt_est.items(), key=lambda x: str(x[0]))},
    "arboles": {"n": len(arb), "campus": n_campus, "especies_area": len(esp_all), "especies_campus": len(esp_campus),
                "top_campus": [{"sp": k, "n": v} for k, v in esp_campus.most_common(10)]},
    "poi": dict(Counter(f["properties"]["cat"] for f in poi)),
    "transporte": {"metro_estaciones": [f["properties"]["name"] for f in metro_st], "paraderos": len(bus_stops),
                   "rutas_bus": len(bus_routes), "encicla": len(encicla),
                   "ciclorrutas_km": round(sum(loc(shape(f["geometry"])).length for f in cycle) / 1000, 1)},
    "equipamientos": dict(Counter(f["properties"]["tipo"] for f in eq)),
    "espacio_publico": {"n": len(ep), "ha": round(sum(loc(shape(f["geometry"])).area for f in ep) / 10000, 1)},
    "pot": [{"c": f["properties"]["codigo_tramiento"], "t": f["properties"]["tratamiento"]} for f in pot],
}
write("resumen.json", resumen)
print(json.dumps(resumen, ensure_ascii=False, indent=1)[:4000])
