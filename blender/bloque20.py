"""Bloque 20 de EAFIT (Edificio de Ciencias) modelado por procedimiento en Blender.

Antes:  python blender/preparar_escena.py   (→ blender/escena.json, blender/suelo.png)
Uso:    blender -b -P blender/bloque20.py -- [fotos] [giro] [glb] [blend] [prueba]

Dimensiones con fuente (detalle y enlaces en data/bloque20.ts):
  huella 33 x 49 m ........ Catastro Medellín (1.643 m², 8 pisos, 0 sótanos)
  8 pisos ................. Catastro + EAFIT 2018 ("ocho pisos")
  3 anillos ............... EAFIT 2018: laboratorios al centro, pasillo que
                            da la vuelta, y oficinas/servicios por fuera
  12 aisladores LRB ....... mageba (LASTO-LRB, 25.000 kN, ±200 mm)
  exoesqueleto en X y
  paneles en la cubierta .. foto aérea publicada (Vivir en El Poblado, 2023)
Altura de entrepiso (4,2 m), modulación de fachada y tabiques: estimados.

Cada piso es un grupo de objetos «P{n}_*» (losa, vidrio, lamas, lab, pasillo,
oficinas) para que el visor web pueda cortar y despiezar el edificio.
"""
import bpy, bmesh, json, math, sys, random, subprocess, tempfile
from pathlib import Path
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["fotos"]
PRUEBA = "prueba" in ARGS
R = Path(__file__).resolve().parent
OUT = R.parent / "public" / "bloque20"
OUT.mkdir(parents=True, exist_ok=True)
ESC = json.load(open(R / "escena.json"))

# ---------------------------------------------------------------- medidas
W, D = 33.0, 49.3             # huella catastral (x este, y norte)
INSET = 2.0                   # del exoesqueleto a la fachada
EW, ED = W - 2 * INSET, D - 2 * INSET
PISOS = 8
H1, HT = 4.6, 4.2             # primer piso más alto; entrepiso tipo
Z = [0.0] + [H1 + HT * i for i in range(PISOS)]   # 0, 4.6, 8.8 ... 34.0
TECHO = Z[-1]
PERGOLA = TECHO + 3.0
NUCLEO = (11.0, 27.3)         # anillo 1: laboratorios
PASILLO = 2.6                 # anillo 2: pasillo perimetral
LADO_SUELO = 512              # lado de suelo.png en metros
random.seed(20)

# ---------------------------------------------------------------- escena
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def col(nombre):
    c = bpy.data.collections.new(nombre); sc.collection.children.link(c); return c

C_ED, C_PI, C_AIS, C_CTX, C_GEN = col("Edificio"), col("Pisos"), col("Aisladores"), col("Entorno"), col("Personas")

def hexrgb(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

def mat(nombre, hx, rough=0.6, metal=0.0, emis=None):
    m = bpy.data.materials.new(nombre); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*hexrgb(hx), 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emis:
        b.inputs["Emission Color"].default_value = (*hexrgb(emis[0]), 1)
        b.inputs["Emission Strength"].default_value = emis[1]
    return m

M = {
    "acero": mat("Acero exoesqueleto", "#2b2d33", 0.42, 0.6),
    "losa": mat("Losa concreto", "#dcdad5", 0.8),
    "lama": mat("Lamas fachada", "#9da1a8", 0.55, 0.2),
    "vidrio": mat("Vidrio", "#3c4856", 0.08),
    "solar": mat("Paneles solares", "#1b2a4a", 0.22, 0.3),
    "lab": mat("Anillo 1 laboratorios", "#00A9E0", 0.6),
    "pasillo": mat("Anillo 2 pasillo", "#f4f4f2", 0.9),
    "oficinas": mat("Anillo 3 oficinas", "#000066", 0.6),
    "aislador": mat("Aislador LRB", "#00A9E0", 0.5, 0.0, ("#00A9E0", 0.6)),
    "plomo": mat("Núcleo de plomo", "#6e7075", 0.4, 0.8),
    "foso": mat("Foso de aislamiento", "#aeaba5", 0.9),
    "ctx": mat("Maqueta ciudad", "#f5f4f1", 0.9),
    "campus": mat("Maqueta campus", "#efe9df", 0.9),
    "copa1": mat("Copa clara", "#a9c2a0", 0.9),
    "copa2": mat("Copa media", "#8fb08a", 0.9),
    "copa3": mat("Copa oscura", "#7b9c79", 0.9),
    "tronco": mat("Tronco", "#8a7d6c", 0.9),
    "gente": mat("Personas", "#55565a", 0.8),
}
# suelo: plano de OpenStreetMap dibujado en preparar_escena.py
ms = bpy.data.materials.new("Suelo OSM"); ms.use_nodes = True
tx = ms.node_tree.nodes.new("ShaderNodeTexImage"); tx.image = bpy.data.images.load(str(R / "suelo.png"))
bs = ms.node_tree.nodes["Principled BSDF"]; bs.inputs["Roughness"].default_value = 0.95
ms.node_tree.links.new(tx.outputs["Color"], bs.inputs["Base Color"])
M["suelo"] = ms

# ---------------------------------------------------------------- geometría
class Malla:
    """Acumula cajas, prismas, barras y cilindros en una sola malla (bmesh)."""
    def __init__(self, nombre, material, coleccion):
        self.bm = bmesh.new(); self.nombre = nombre; self.m = material; self.c = coleccion

    def _caras(self, vs, idx):
        for f in idx:
            try: self.bm.faces.new([vs[i] for i in f])
            except ValueError: pass

    def caja(self, x0, y0, z0, x1, y1, z1):
        vs = [self.bm.verts.new(v) for v in [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
                                             (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]]
        self._caras(vs, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])

    def barra(self, a, b, s):
        """Viga de sección cuadrada s entre los puntos a y b."""
        a, b = Vector(a), Vector(b); d = b - a
        if d.length < 1e-6: return
        t = d.normalized(); u = t.cross(Vector((0, 0, 1)))
        if u.length < 1e-3: u = t.cross(Vector((1, 0, 0)))
        u.normalize(); v = t.cross(u).normalized(); h = s / 2; vs = []
        for p in (a, b):
            for du, dv in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                vs.append(self.bm.verts.new(p + u * du * h + v * dv * h))
        self._caras(vs, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)])

    def prisma(self, pts, z0, z1):
        b = [self.bm.verts.new((x, y, z0)) for x, y in pts]
        t = [self.bm.verts.new((x, y, z1)) for x, y in pts]
        self._caras(b + t, [tuple(reversed(range(len(pts)))), tuple(range(len(pts), 2 * len(pts)))])
        n = len(pts)
        self._caras(b + t, [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)])

    def cilindro(self, x, y, z0, z1, r, n=24):
        b = [self.bm.verts.new((x + r * math.cos(2 * math.pi * k / n), y + r * math.sin(2 * math.pi * k / n), z0)) for k in range(n)]
        t = [self.bm.verts.new((v.co.x, v.co.y, z1)) for v in b]
        self._caras(b + t, [tuple(reversed(range(n))), tuple(range(n, 2 * n))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)])

    def esfera(self, x, y, z, r, aplastar=0.75, sub=2):
        me = bmesh.new(); bmesh.ops.create_icosphere(me, subdivisions=sub, radius=r)
        vm = {}
        for v in me.verts:
            vm[v] = self.bm.verts.new((x + v.co.x, y + v.co.y, z + v.co.z * aplastar))
        for f in me.faces: self.bm.faces.new([vm[v] for v in f.verts])
        me.free()

    def fin(self, suave=False, uv_suelo=False):
        me = bpy.data.meshes.new(self.nombre)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        if uv_suelo:
            uv = self.bm.loops.layers.uv.new("UVMap")
            for f in self.bm.faces:
                for l in f.loops:
                    l[uv].uv = (l.vert.co.x / LADO_SUELO + 0.5, l.vert.co.y / LADO_SUELO + 0.5)
        self.bm.to_mesh(me); self.bm.free()
        if suave:
            for p in me.polygons: p.use_smooth = True
        ob = bpy.data.objects.new(self.nombre, me); ob.data.materials.append(self.m)
        self.c.objects.link(ob); return ob

# ---- exoesqueleto: columnas, anillos cada dos pisos, cruces en X y pérgola
exo = Malla("Exoesqueleto", M["acero"], C_ED)
x0, y0, x1, y1 = -W / 2 + 0.3, -D / 2 + 0.3, W / 2 - 0.3, D / 2 - 0.3
NX, NY = 4, 6
xs = [x0 + (x1 - x0) * i / NX for i in range(NX + 1)]
ys = [y0 + (y1 - y0) * i / NY for i in range(NY + 1)]
anillos = [Z[0], Z[2], Z[4], Z[6], Z[8], PERGOLA]
def lado(p, q, n):
    return [(p[0] + (q[0] - p[0]) * i / n, p[1] + (q[1] - p[1]) * i / n) for i in range(n + 1)]
caras = [lado((x0, y0), (x1, y0), NX), lado((x1, y0), (x1, y1), NY),
         lado((x1, y1), (x0, y1), NX), lado((x0, y1), (x0, y0), NY)]
for cara in caras:
    for (px, py) in cara:
        exo.barra((px, py, -0.4), (px, py, PERGOLA), 0.45)
    for z in anillos:
        exo.barra((cara[0][0], cara[0][1], z), (cara[-1][0], cara[-1][1], z), 0.42)
    for a, b in zip(cara, cara[1:]):
        for za, zb in zip(anillos[:-2], anillos[1:-1]):
            exo.barra((a[0], a[1], za), (b[0], b[1], zb), 0.26)
            exo.barra((b[0], b[1], za), (a[0], a[1], zb), 0.26)
for x in xs: exo.barra((x, y0, PERGOLA), (x, y1, PERGOLA), 0.4)
for y in ys: exo.barra((x0, y, PERGOLA), (x1, y, PERGOLA), 0.4)
for x in xs[1:-1]:
    for y in ys[1:-1]:
        exo.barra((x, y, TECHO), (x, y, PERGOLA), 0.3)
for z in Z[1:]:   # brazos que amarran el exoesqueleto a cada losa
    for cara in caras:
        for (px, py) in cara[1:-1]:
            exo.barra((px, py, z), (max(-EW / 2, min(EW / 2, px)), max(-ED / 2, min(ED / 2, py)), z), 0.22)
exo.fin()

sol = Malla("Cubierta solar", M["solar"], C_ED)
for i in range(NX):
    for j in range(NY):
        a, b, c, d = xs[i] + 0.5, xs[i + 1] - 0.5, ys[j] + 0.5, ys[j + 1] - 0.5
        for k in range(3):
            q0 = c + (d - c) * k / 3 + 0.2; q1 = c + (d - c) * (k + 1) / 3 - 0.2
            sol.prisma([(a, q0), (b, q0), (b, q1), (a, q1)], PERGOLA + 0.25, PERGOLA + 0.32)
sol.fin()

# ---- pisos: losa, vidrio (piel delgada), lamas y los tres anillos
LADOS = [((-EW / 2, -ED / 2), (EW / 2, -ED / 2)), ((EW / 2, -ED / 2), (EW / 2, ED / 2)),
         ((EW / 2, ED / 2), (-EW / 2, ED / 2)), ((-EW / 2, ED / 2), (-EW / 2, -ED / 2))]
PISO = {}
for k in range(1, PISOS + 1):
    z, zt = Z[k - 1], Z[k] - 0.35
    obs = {}
    m = Malla(f"P{k}_losa", M["losa"], C_PI)
    m.caja(-EW / 2 - 0.35, -ED / 2 - 0.35, z - 0.35, EW / 2 + 0.35, ED / 2 + 0.35, z)
    obs["losa"] = m.fin()
    m = Malla(f"P{k}_vidrio", M["vidrio"], C_PI)
    g = 0.7
    m.caja(-EW / 2 + g, -ED / 2 + g, z, EW / 2 - g, -ED / 2 + g + 0.06, zt)
    m.caja(-EW / 2 + g, ED / 2 - g - 0.06, z, EW / 2 - g, ED / 2 - g, zt)
    m.caja(-EW / 2 + g, -ED / 2 + g, z, -EW / 2 + g + 0.06, ED / 2 - g, zt)
    m.caja(EW / 2 - g - 0.06, -ED / 2 + g, z, EW / 2 - g, ED / 2 - g, zt)
    obs["vidrio"] = m.fin()
    m = Malla(f"P{k}_lamas", M["lama"], C_PI)
    for (ax, ay), (bx, by) in LADOS:
        L = math.hypot(bx - ax, by - ay); n = int(L / 1.2)
        nx, ny = (by - ay) / L, -(bx - ax) / L  # normal exterior
        for i in range(n):
            if random.random() < 0.18: continue
            t = (i + 0.5) / n; w = random.choice([0.25, 0.35, 0.55, 0.8])
            cx, cy = ax + (bx - ax) * t + nx * 0.15, ay + (by - ay) * t + ny * 0.15
            ux, uy = (bx - ax) / L * w / 2, (by - ay) / L * w / 2
            m.prisma([(cx - ux - nx * 0.1, cy - uy - ny * 0.1), (cx + ux - nx * 0.1, cy + uy - ny * 0.1),
                      (cx + ux + nx * 0.1, cy + uy + ny * 0.1), (cx - ux + nx * 0.1, cy - uy + ny * 0.1)], z, zt)
    obs["lamas"] = m.fin()
    # tres anillos
    nw, nd = NUCLEO; pw, pd = nw + 2 * PASILLO, nd + 2 * PASILLO; zi = z + 0.01
    m = Malla(f"P{k}_lab", M["lab"], C_PI); m.caja(-nw / 2, -nd / 2, zi, nw / 2, nd / 2, zi + 3.4); obs["lab"] = m.fin()
    m = Malla(f"P{k}_pasillo", M["pasillo"], C_PI)
    m.prisma([(-pw / 2, -pd / 2), (pw / 2, -pd / 2), (pw / 2, pd / 2), (-pw / 2, pd / 2)], zi, zi + 0.08); obs["pasillo"] = m.fin()
    m = Malla(f"P{k}_oficinas", M["oficinas"], C_PI)
    for x in range(int(-EW / 2) + 2, int(EW / 2) - 1, 4):
        m.caja(x - 0.08, -ED / 2 + g + 0.1, zi, x + 0.08, -pd / 2, zi + 3.0)
        m.caja(x - 0.08, pd / 2, zi, x + 0.08, ED / 2 - g - 0.1, zi + 3.0)
    for y in range(int(-ED / 2) + 2, int(ED / 2) - 1, 4):
        if abs(y) < pd / 2:
            m.caja(-EW / 2 + g + 0.1, y - 0.08, zi, -pw / 2, y + 0.08, zi + 3.0)
            m.caja(pw / 2, y - 0.08, zi, EW / 2 - g - 0.1, y + 0.08, zi + 3.0)
    for (a0, b0, a1, b1) in [(-pw / 2 - .1, -pd / 2 - .1, pw / 2 + .1, -pd / 2 + .1), (-pw / 2 - .1, pd / 2 - .1, pw / 2 + .1, pd / 2 + .1),
                             (-pw / 2 - .1, -pd / 2, -pw / 2 + .1, pd / 2), (pw / 2 - .1, -pd / 2, pw / 2 + .1, pd / 2)]:
        m.caja(a0, b0, zi, a1, b1, zi + 3.0)
    obs["oficinas"] = m.fin()
    PISO[k] = obs
m = Malla("Techo", M["losa"], C_PI)
m.caja(-EW / 2 - 0.35, -ED / 2 - 0.35, TECHO - 0.35, EW / 2 + 0.35, ED / 2 + 0.35, TECHO)
m.caja(-EW / 2 - 0.35, -ED / 2 - 0.35, TECHO, EW / 2 + 0.35, ED / 2 + 0.35, TECHO + 1.1)
TECHO_OB = m.fin()
INTERIOR = [o for k in PISO for n, o in PISO[k].items() if n in ("lab", "pasillo", "oficinas")]

# ---- aislamiento: foso, 12 aisladores LRB, pedestales
ais = Malla("Aisladores LRB", M["aislador"], C_AIS)
plo = Malla("Núcleos de plomo", M["plomo"], C_AIS)
fos = Malla("Foso", M["foso"], C_AIS)
AX = [-EW / 2 + 4, 0, EW / 2 - 4]
AY = [-ED / 2 + 5, -ED / 6 + 1.5, ED / 6 - 1.5, ED / 2 - 5]
fos.caja(-EW / 2 - 1.2, -ED / 2 - 1.2, -3.2, EW / 2 + 1.2, ED / 2 + 1.2, -2.8)
for x in AX:
    for y in AY:
        fos.caja(x - 0.9, y - 0.9, -2.8, x + 0.9, y + 0.9, -1.6)
        ais.cilindro(x, y, -1.6, -1.1, 0.6, 32)
        plo.cilindro(x, y, -1.1, -1.08, 0.18, 16)
ais.fin(True); plo.fin(); fos.fin()
assert len(AX) * len(AY) == 12

# ---------------------------------------------------------------- entorno
ciu = Malla("Edificios ciudad", M["ctx"], C_CTX); cam_ = Malla("Edificios campus", M["campus"], C_CTX)
for e in ESC["edificios"]:
    if len(e["p"]) >= 3:
        (cam_ if e.get("c") == 1 else ciu).prisma(e["p"], 0, max(3, e["h"]))
ciu.fin(); cam_.fin()
copas = [Malla(f"Copas {i}", M[f"copa{i}"], C_CTX) for i in (1, 2, 3)]
tro = Malla("Troncos", M["tronco"], C_CTX)
for a in ESC["arboles"]:
    r = max(2.2, min(6, a["r"])); h = max(5, a["h"])
    tro.cilindro(a["x"], a["y"], 0, h * 0.55, 0.22, 6)
    random.choice(copas).esfera(a["x"], a["y"], h * 0.55 + r * 0.55, r)
for c in copas: c.fin(True)
tro.fin()
# suelo texturizado con el foso perimetral abierto (el edificio aislado no toca el terreno)
sue = Malla("Suelo", M["suelo"], C_CTX)
gx, gy, G = EW / 2 + 1.2, ED / 2 + 1.2, LADO_SUELO / 2
for (a0, b0, a1, b1) in [(-G, -G, G, -gy), (-G, gy, G, G), (-G, -gy, -gx, gy), (gx, -gy, G, gy)]:
    sue.prisma([(a0, b0), (a1, b0), (a1, b1), (a0, b1)], -0.3, -0.02)
sue.fin(uv_suelo=True)
# personas a escala (ilustrativas), en el andén y el acceso sur
gen = Malla("Personas", M["gente"], C_GEN)
for _ in range(26):
    px, py = random.uniform(-14, 18), random.uniform(-40, -27)
    hh = random.uniform(1.6, 1.8)
    gen.cilindro(px, py, 0, hh - 0.25, 0.2, 8); gen.esfera(px, py, hh - 0.12, 0.13, 1.0, 1)
gen.fin(True)

# ---------------------------------------------------------------- luz, cámara, render
w = bpy.data.worlds.new("Cielo"); sc.world = w; w.use_nodes = True
BG = w.node_tree.nodes["Background"]
bpy.ops.object.light_add(type="SUN", rotation=(math.radians(48), 0, math.radians(-35)))
SOL = bpy.context.object; SOL.data.angle = math.radians(2.5)

def dia():
    BG.inputs[0].default_value = (*hexrgb("#dfe6ee"), 1); BG.inputs[1].default_value = 0.9
    SOL.data.energy = 4.2; SOL.data.color = (1, 1, 1)
    b = M["vidrio"].node_tree.nodes["Principled BSDF"]; b.inputs["Emission Strength"].default_value = 0

def noche():
    BG.inputs[0].default_value = (*hexrgb("#1a2233"), 1); BG.inputs[1].default_value = 0.35
    SOL.data.energy = 0.25; SOL.data.color = hexrgb("#9fb4d9")
    b = M["vidrio"].node_tree.nodes["Principled BSDF"]
    b.inputs["Emission Color"].default_value = (*hexrgb("#ffd9a0"), 1); b.inputs["Emission Strength"].default_value = 1.5

def camara(nombre, pos, mira, lente=35, orto=None):
    cd = bpy.data.cameras.new(nombre); cd.lens = lente; cd.clip_end = 3000
    if orto: cd.type = "ORTHO"; cd.ortho_scale = orto
    ob = bpy.data.objects.new(nombre, cd); sc.collection.objects.link(ob)
    ob.location = pos
    ob.rotation_euler = (Vector(mira) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    return ob

def motor(cycles=True, w=1800, h=1100, muestras=128):
    if PRUEBA: w, h, muestras = w // 3, h // 3, 16
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
    if cycles:
        sc.render.engine = "CYCLES"
        pr = bpy.context.preferences.addons["cycles"].preferences
        try:
            pr.compute_device_type = "METAL"; pr.get_devices()
            for d in pr.devices: d.use = True
            sc.cycles.device = "GPU"
        except Exception as ex:
            print("sin GPU:", ex)
        sc.cycles.samples = muestras; sc.cycles.use_denoising = True
    else:
        sc.render.engine = "BLENDER_EEVEE"; sc.eevee.taa_render_samples = 32

def mostrar(visibles):
    """Oculta en el render todo lo que no esté en `visibles` (objetos)."""
    vis = set(visibles)
    for ob in sc.objects:
        if ob.type == "MESH": ob.hide_render = ob not in vis

def todo(*cols, sin=()):
    return [o for c in cols for o in c.objects if o not in sin]

def foto(cam, nombre):
    sc.camera = cam; sc.render.filepath = str(OUT / nombre)
    sc.render.image_settings.file_format = "WEBP"; sc.render.image_settings.quality = 84
    bpy.ops.render.render(write_still=True); print("✓", nombre)

def mover(obs, dz):
    for o in obs: o.location.z = dz

BASE = todo(C_ED, C_PI, C_AIS, C_CTX, sin=INTERIOR)

if "fotos" in ARGS:
    motor(True); dia()
    # 1. Aérea desde el nororiente, en el ángulo de la foto publicada en 2023
    mostrar(BASE)
    foto(camara("Aérea", (66, 86, 58), (0, -3, 13), 36), "aerea.webp")
    # 2. Peatonal desde el sur, con personas a escala
    mostrar(BASE + todo(C_GEN))
    foto(camara("Peatón", (8, -72, 1.7), (0, 0, 19), 22), "peaton.webp")
    # 3. Corte en el piso 6: sin pisos de arriba ni cubierta, con los tres anillos del 6
    corte = [o for k in PISO for n, o in PISO[k].items() if k < 6 and n not in ("lab", "pasillo", "oficinas")]
    corte += [PISO[6][n] for n in ("losa", "lamas", "lab", "pasillo", "oficinas")]
    mostrar(corte + [bpy.data.objects["Exoesqueleto"]] + todo(C_AIS, C_CTX))
    foto(camara("Corte", (62, -70, 78), (0, 0, 18), 42), "corte.webp")
    # 4. Aisladores: el edificio se levanta 7 m
    edificio = todo(C_ED, C_PI)
    mover(edificio, 7.0)
    mostrar([o for o in BASE if o.name == "Suelo" or o in edificio or o in todo(C_AIS)])
    foto(camara("Aisladores", (31, -33, 7.5), (0, -2, -0.5), 24), "aisladores.webp")
    # 5. Despiece: cada piso se separa 5 m; se ven losa y anillos de los ocho
    for k in PISO:
        mover(PISO[k].values(), 6 + (k - 1) * 5)
    mover([TECHO_OB], 6 + PISOS * 5); mover([bpy.data.objects["Cubierta solar"]], 6 + PISOS * 5 + 4)
    piezas = [o for k in PISO for n, o in PISO[k].items() if n in ("losa", "lab", "pasillo", "oficinas")]
    mostrar(piezas + [TECHO_OB, bpy.data.objects["Cubierta solar"], bpy.data.objects["Suelo"]] + todo(C_AIS))
    foto(camara("Despiece", (180, -190, 122), (0, 0, 40), 72), "despiece.webp")
    mover(edificio, 0)
    # 6. De noche: los laboratorios encendidos
    noche(); mostrar(BASE)
    foto(camara("Noche", (58, 84, 20), (0, 0, 18), 28), "noche.webp")
    dia()

if "giro" in ARGS:
    motor(False, 1280, 720); dia(); mostrar(BASE)
    eje = bpy.data.objects.new("Eje", None); sc.collection.objects.link(eje)
    cam = camara("Giro", (0, -135, 66), (0, 0, 14), 40); cam.parent = eje
    sc.frame_start, sc.frame_end = 1, 240; sc.render.fps = 30
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
    eje.rotation_euler = (0, 0, 0); eje.keyframe_insert("rotation_euler", frame=1)
    eje.rotation_euler = (0, 0, math.radians(360)); eje.keyframe_insert("rotation_euler", frame=241)
    sc.camera = cam
    # este build de Blender 5 no trae FFMPEG como formato: cuadros JPEG y luego ffmpeg
    tmp = Path(tempfile.mkdtemp())
    sc.render.image_settings.file_format = "JPEG"; sc.render.image_settings.quality = 92
    sc.render.filepath = str(tmp / "f_####")
    bpy.ops.render.render(animation=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "30", "-i", str(tmp / "f_%04d.jpg"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "26", "-movflags", "+faststart",
                    str(OUT / "giro.mp4")], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp / "f_0001.jpg"), "-q:v", "4", str(OUT / "giro.jpg")], check=True)
    print("✓ giro.mp4")

if "glb" in ARGS:
    bpy.ops.object.select_all(action="DESELECT")
    for ob in todo(C_ED, C_PI, C_AIS, C_CTX):
        ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT / "bloque20.glb"), use_selection=True, export_apply=True,
                              export_yup=True, export_draco_mesh_compression_enable=True,
                              export_image_format="JPEG", export_jpeg_quality=82)
    print("✓ bloque20.glb")

if "blend" in ARGS:
    bpy.ops.wm.save_as_mainfile(filepath=str(R / "bloque20.blend"))
    print("✓ bloque20.blend")
