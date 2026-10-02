"""Bloque 20 de EAFIT (Edificio de Ciencias) modelado por procedimiento en Blender.

Uso:  blender -b -P blender/bloque20.py -- [fotos] [giro] [glb] [blend] [prueba]
      (antes: python3 blender/preparar_escena.py → blender/escena.json)

Dimensiones con fuente (ver data/bloque20.ts):
  huella 33 x 49 m ........ Catastro Medellín (1.643 m², 8 pisos, 0 sótanos)
  8 pisos ................. Catastro + EAFIT 2018 ("ocho pisos")
  3 anillos ............... EAFIT 2018: laboratorios al centro, pasillo que
                            da la vuelta, y oficinas/servicios por fuera
  12 aisladores LRB ....... mageba (LASTO-LRB, 25.000 kN, ±200 mm)
  exoesqueleto en X y
  paneles en la cubierta .. foto aérea publicada (Vivir en El Poblado, 2023)
Altura de entrepiso (4,2 m) y modulación de fachada: estimadas, no medidas.
"""
import bpy, bmesh, json, math, sys, random
from pathlib import Path
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["fotos"]
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
random.seed(20)

# ---------------------------------------------------------------- limpieza
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def col(nombre):
    c = bpy.data.collections.new(nombre); sc.collection.children.link(c); return c

C_B20, C_INT, C_AIS, C_CTX = col("Bloque20"), col("Interior"), col("Aisladores"), col("Entorno")

# ---------------------------------------------------------------- materiales
def mat(nombre, rgb, rough=0.6, metal=0.0, alpha=1.0, emis=None, trans=0.0):
    m = bpy.data.materials.new(nombre); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if trans:
        b.inputs["Transmission Weight"].default_value = trans
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
    if emis:
        b.inputs["Emission Color"].default_value = (*emis[0], 1)
        b.inputs["Emission Strength"].default_value = emis[1]
    return m

def hexrgb(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

M = {
    "acero": mat("Acero exoesqueleto", hexrgb("#2b2d33"), 0.45, 0.6),
    "losa": mat("Losa concreto", hexrgb("#d9d7d2"), 0.8),
    "lama": mat("Lamas fachada", hexrgb("#9da1a8"), 0.55, 0.2),
    "vidrio": mat("Vidrio", hexrgb("#3e4a57"), 0.08, 0.0),
    "solar": mat("Paneles solares", hexrgb("#1b2a4a"), 0.25, 0.3),
    "nucleo": mat("Anillo 1 laboratorios", hexrgb("#00A9E0"), 0.6),
    "pasillo": mat("Anillo 2 pasillo", hexrgb("#f2f2f0"), 0.9),
    "oficina": mat("Anillo 3 oficinas", hexrgb("#000066"), 0.6),
    "aislador": mat("Aislador LRB", hexrgb("#00A9E0"), 0.5, 0.0, emis=(hexrgb("#00A9E0"), 0.6)),
    "plomo": mat("Núcleo de plomo", hexrgb("#6e7075"), 0.4, 0.8),
    "foso": mat("Foso de aislamiento", hexrgb("#a9a6a0"), 0.9),
    "ctx": mat("Maqueta entorno", hexrgb("#f4f3f0"), 0.9),
    "suelo": mat("Suelo", hexrgb("#e6e3dc"), 0.95),
    "copa": mat("Copa", hexrgb("#9fb79a"), 0.9),
    "tronco": mat("Tronco", hexrgb("#8a7d6c"), 0.9),
}

# ---------------------------------------------------------------- geometría
class Malla:
    """Acumula cajas, prismas y cilindros en una sola malla (bmesh)."""
    def __init__(self, nombre, material, coleccion):
        self.bm = bmesh.new(); self.nombre = nombre; self.m = material; self.c = coleccion

    def caja(self, x0, y0, z0, x1, y1, z1):
        vs = [self.bm.verts.new(v) for v in [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
                                             (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]]
        for f in [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]:
            self.bm.faces.new([vs[i] for i in f])

    def barra(self, a, b, s):
        """Viga de sección cuadrada s entre los puntos a y b."""
        a, b = Vector(a), Vector(b); d = b - a
        if d.length < 1e-6: return
        t = d.normalized()
        u = t.cross(Vector((0, 0, 1)))
        if u.length < 1e-3: u = t.cross(Vector((1, 0, 0)))
        u.normalize(); v = t.cross(u).normalized()
        h = s / 2; vs = []
        for p in (a, b):
            for du, dv in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                vs.append(self.bm.verts.new(p + u * du * h + v * dv * h))
        for f in [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]:
            self.bm.faces.new([vs[i] for i in f])

    def prisma(self, pts, z0, z1):
        b = [self.bm.verts.new((x, y, z0)) for x, y in pts]
        t = [self.bm.verts.new((x, y, z1)) for x, y in pts]
        try:
            self.bm.faces.new(list(reversed(b))); self.bm.faces.new(t)
        except ValueError:
            pass
        n = len(pts)
        for i in range(n):
            j = (i + 1) % n
            try: self.bm.faces.new([b[i], b[j], t[j], t[i]])
            except ValueError: pass

    def cilindro(self, x, y, z0, z1, r, n=24):
        b = [self.bm.verts.new((x + r * math.cos(2 * math.pi * k / n), y + r * math.sin(2 * math.pi * k / n), z0)) for k in range(n)]
        t = [self.bm.verts.new((v.co.x, v.co.y, z1)) for v in b]
        self.bm.faces.new(list(reversed(b))); self.bm.faces.new(t)
        for i in range(n):
            j = (i + 1) % n; self.bm.faces.new([b[i], b[j], t[j], t[i]])

    def fin(self, suave=False):
        me = bpy.data.meshes.new(self.nombre)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        self.bm.to_mesh(me); self.bm.free()
        if suave:
            for p in me.polygons: p.use_smooth = True
        ob = bpy.data.objects.new(self.nombre, me); ob.data.materials.append(self.m)
        self.c.objects.link(ob); return ob

def rect(cx, cy, w, d):
    return (cx - w / 2, cy - d / 2, cx + w / 2, cy + d / 2)

# ---- exoesqueleto: columnas, anillos cada dos pisos y cruces en X
exo = Malla("Exoesqueleto", M["acero"], C_B20)
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
# pérgola de cubierta: retícula que sostiene los paneles
for x in xs:
    exo.barra((x, y0, PERGOLA), (x, y1, PERGOLA), 0.4)
for y in ys:
    exo.barra((x0, y, PERGOLA), (x1, y, PERGOLA), 0.4)
for x in xs[1:-1]:
    for y in ys[1:-1]:
        exo.barra((x, y, TECHO), (x, y, PERGOLA), 0.3)
# brazos que amarran el exoesqueleto a cada losa
for z in Z[1:]:
    for cara in caras:
        for (px, py) in cara[1:-1]:
            qx = max(-EW / 2, min(EW / 2, px)); qy = max(-ED / 2, min(ED / 2, py))
            exo.barra((px, py, z), (qx, qy, z), 0.22)
exo.fin()

# ---- losas, fachada (vidrio + lamas verticales) y cubierta
def edificio(niveles, sufijo="", tope=PISOS):
    losas = Malla("Losas" + sufijo, M["losa"], C_B20)
    vid = Malla("Vidrio" + sufijo, M["vidrio"], C_B20)
    lam = Malla("Lamas" + sufijo, M["lama"], C_B20)
    for i in niveles:
        z = Z[i]
        losas.caja(-EW / 2 - 0.35, -ED / 2 - 0.35, z - 0.35, EW / 2 + 0.35, ED / 2 + 0.35, z)
        if i == tope:
            if tope == PISOS:  # pretil de cubierta
                losas.caja(-EW / 2 - 0.35, -ED / 2 - 0.35, z, EW / 2 + 0.35, ED / 2 + 0.35, z + 1.1)
            continue
        zt = Z[i + 1] - 0.35
        vid.caja(-EW / 2 + 0.25, -ED / 2 + 0.25, z, EW / 2 - 0.25, ED / 2 - 0.25, zt)
        # lamas: modulación de 1,2 m con anchos variables (como en la foto)
        for (ax, ay), (bx, by) in [((-EW / 2, -ED / 2), (EW / 2, -ED / 2)), ((EW / 2, -ED / 2), (EW / 2, ED / 2)),
                                   ((EW / 2, ED / 2), (-EW / 2, ED / 2)), ((-EW / 2, ED / 2), (-EW / 2, -ED / 2))]:
            L = math.hypot(bx - ax, by - ay); n = int(L / 1.2)
            nx, ny = (by - ay) / L, -(bx - ax) / L  # normal exterior
            for k in range(n):
                if random.random() < 0.18: continue
                t = (k + 0.5) / n; w = random.choice([0.25, 0.35, 0.55, 0.8])
                cx, cy = ax + (bx - ax) * t + nx * 0.15, ay + (by - ay) * t + ny * 0.15
                ux, uy = (bx - ax) / L * w / 2, (by - ay) / L * w / 2
                lam.prisma([(cx - ux - nx * 0.1, cy - uy - ny * 0.1), (cx + ux - nx * 0.1, cy + uy - ny * 0.1),
                            (cx + ux + nx * 0.1, cy + uy + ny * 0.1), (cx - ux + nx * 0.1, cy - uy + ny * 0.1)], z, zt)
    return losas.fin(), vid.fin(), lam.fin()

edificio(range(0, PISOS + 1))

sol = Malla("Paneles solares", M["solar"], C_B20)
for i in range(NX):
    for j in range(NY):
        a, b = xs[i] + 0.5, xs[i + 1] - 0.5
        c, d = ys[j] + 0.5, ys[j + 1] - 0.5
        for k in range(3):
            yy0 = c + (d - c) * k / 3 + 0.2; yy1 = c + (d - c) * (k + 1) / 3 - 0.2
            sol.prisma([(a, yy0), (b, yy0), (b, yy1), (a, yy1)], PERGOLA + 0.25, PERGOLA + 0.32)
sol.fin()

# ---- planta tipo con los tres anillos (para el corte)
def planta(z, coleccion=C_INT):
    nw, nd = NUCLEO
    nuc = Malla("Anillo 1 · laboratorios", M["nucleo"], coleccion)
    nuc.caja(-nw / 2, -nd / 2, z, nw / 2, nd / 2, z + 3.4)
    pas = Malla("Anillo 2 · pasillo", M["pasillo"], coleccion)
    pw, pd = nw + 2 * PASILLO, nd + 2 * PASILLO
    pas.prisma([(-pw / 2, -pd / 2), (pw / 2, -pd / 2), (pw / 2, pd / 2), (-pw / 2, pd / 2)], z, z + 0.08)
    ofi = Malla("Anillo 3 · oficinas", M["oficina"], coleccion)
    # muros de oficinas y servicios entre el pasillo y la fachada, modulados cada ~4 m
    for x in [i for i in range(int(-EW / 2) + 2, int(EW / 2) - 1, 4)]:
        ofi.caja(x - 0.08, -ED / 2 + 0.4, z, x + 0.08, -pd / 2, z + 3.0)
        ofi.caja(x - 0.08, pd / 2, z, x + 0.08, ED / 2 - 0.4, z + 3.0)
    for y in [i for i in range(int(-ED / 2) + 2, int(ED / 2) - 1, 4)]:
        if abs(y) < pd / 2:
            ofi.caja(-EW / 2 + 0.4, y - 0.08, z, -pw / 2, y + 0.08, z + 3.0)
            ofi.caja(pw / 2, y - 0.08, z, EW / 2 - 0.4, y + 0.08, z + 3.0)
    ofi.caja(-pw / 2 - 0.1, -pd / 2 - 0.1, z, pw / 2 + 0.1, -pd / 2 + 0.1, z + 3.0)
    ofi.caja(-pw / 2 - 0.1, pd / 2 - 0.1, z, pw / 2 + 0.1, pd / 2 + 0.1, z + 3.0)
    ofi.caja(-pw / 2 - 0.1, -pd / 2, z, -pw / 2 + 0.1, pd / 2, z + 3.0)
    ofi.caja(pw / 2 - 0.1, -pd / 2, z, pw / 2 + 0.1, pd / 2, z + 3.0)
    return [nuc.fin(), pas.fin(), ofi.fin()]

# ---- sistema de aislamiento: foso, 12 aisladores LRB, losa de transferencia
ais = Malla("Aisladores LRB", M["aislador"], C_AIS)
plo = Malla("Núcleos de plomo", M["plomo"], C_AIS)
fos = Malla("Foso y pedestales", M["foso"], C_AIS)
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
ctx = Malla("Edificios entorno", M["ctx"], C_CTX)
for e in ESC["edificios"]:
    p = e["p"]
    if len(p) >= 3:
        ctx.prisma(p, 0, max(3, e["h"]))
ctx.fin()
cop = Malla("Copas", M["copa"], C_CTX); tro = Malla("Troncos", M["tronco"], C_CTX)
for a in ESC["arboles"]:
    r = max(2.2, min(6, a["r"])); h = max(5, a["h"])
    tro.cilindro(a["x"], a["y"], 0, h * 0.55, 0.25, 8)
    me = bmesh.new(); bmesh.ops.create_icosphere(me, subdivisions=2, radius=r)
    for v in me.verts:
        v.co.z *= 0.75; v.co += Vector((a["x"], a["y"], h * 0.55 + r * 0.6))
    vm = {v: cop.bm.verts.new(v.co) for v in me.verts}
    for f in me.faces: cop.bm.faces.new([vm[v] for v in f.verts])
    me.free()
cop.fin(True); tro.fin()

# suelo con el foso perimetral abierto: el edificio aislado no toca el terreno
sue = Malla("Suelo", M["suelo"], C_CTX)
gx, gy, G = EW / 2 + 1.2, ED / 2 + 1.2, 450
for (a0, b0, a1, b1) in [(-G, -G, G, -gy), (-G, gy, G, G), (-G, -gy, -gx, gy), (gx, -gy, G, gy)]:
    sue.caja(a0, b0, -0.3, a1, b1, -0.02)
sue.fin()

# ---------------------------------------------------------------- luz y cámara
w = bpy.data.worlds.new("Cielo"); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes["Background"]; bg.inputs[0].default_value = (*hexrgb("#dfe6ee"), 1); bg.inputs[1].default_value = 0.9
bpy.ops.object.light_add(type="SUN", rotation=(math.radians(48), 0, math.radians(-35)))
solL = bpy.context.object; solL.data.energy = 4.2; solL.data.angle = math.radians(2.5)

def camara(nombre, pos, mira, lente=35, orto=None):
    cd = bpy.data.cameras.new(nombre); cd.lens = lente; cd.clip_end = 3000
    if orto: cd.type = "ORTHO"; cd.ortho_scale = orto
    ob = bpy.data.objects.new(nombre, cd); sc.collection.objects.link(ob)
    ob.location = pos
    ob.rotation_euler = (Vector(mira) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    return ob

PRUEBA = "prueba" in ARGS
def motor(cycles=True, w=1800, h=1100, muestras=96):
    if PRUEBA: w, h, muestras = w // 3, h // 3, 16
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.film_transparent = False
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
        sc.render.engine = "BLENDER_EEVEE"
        sc.eevee.taa_render_samples = 32

def ver(objs_ocultos=(), colecciones_ocultas=()):
    for ob in sc.objects:
        ob.hide_render = ob.name in objs_ocultos
    for c in (C_B20, C_INT, C_AIS, C_CTX):
        bpy.context.view_layer.layer_collection.children[c.name].exclude = c.name in colecciones_ocultas

def foto(cam, nombre):
    sc.camera = cam; sc.render.filepath = str(OUT / nombre)
    sc.render.image_settings.file_format = "WEBP"; sc.render.image_settings.quality = 84
    bpy.ops.render.render(write_still=True); print("✓", nombre)

# ---------------------------------------------------------------- salidas
interior = planta(Z[5] + 0.01)

if "fotos" in ARGS:
    motor(True)
    # 1. Aérea, en el ángulo de la foto publicada
    ver(colecciones_ocultas=("Interior", "Aisladores"))
    foto(camara("Aérea", (105, -95, 78), (0, 0, 14), 40), "aerea.webp")
    # 2. Peatonal desde el corredor de Junín (sur-oriente, bajo)
    foto(camara("Peatón", (8, -72, 1.7), (0, 0, 19), 22), "peaton.webp")
    # 3. Corte: se quitan los pisos 6-8 y se ve la planta tipo con los tres anillos
    arriba = [ob for ob in C_B20.objects]
    for ob in arriba: ob.hide_render = True
    losas, vid, lam = edificio(range(0, 6), "_corte", tope=5)
    ver(colecciones_ocultas=("Aisladores",))
    for ob in C_B20.objects:
        ob.hide_render = not ob.name.endswith("_corte") and ob.name != "Exoesqueleto"
    foto(camara("Corte", (62, -70, 78), (0, 0, 18), 42), "corte.webp")
    # 4. Aisladores: el edificio se levanta 7 m para dejar ver el sistema
    for ob in C_B20.objects:
        ob.hide_render = ob.name.endswith("_corte")
        ob.location.z = 7.0
    ver(colecciones_ocultas=("Interior",))
    for ob in C_CTX.objects: ob.hide_render = ob.name != "Suelo"
    foto(camara("Aisladores", (31, -33, 7.5), (0, -2, -0.5), 24), "aisladores.webp")
    for ob in C_CTX.objects: ob.hide_render = False
    for ob in C_B20.objects: ob.location.z = 0

if "giro" in ARGS:
    motor(False, 1280, 720)
    for ob in C_B20.objects: ob.hide_render = ob.name.endswith("_corte")
    ver(colecciones_ocultas=("Interior", "Aisladores"))
    eje = bpy.data.objects.new("Eje", None); sc.collection.objects.link(eje)
    cam = camara("Giro", (0, -135, 66), (0, 0, 14), 40)
    cam.parent = eje
    sc.frame_start, sc.frame_end = 1, 240; sc.render.fps = 30
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
    eje.rotation_euler = (0, 0, 0); eje.keyframe_insert("rotation_euler", frame=1)
    eje.rotation_euler = (0, 0, math.radians(360)); eje.keyframe_insert("rotation_euler", frame=241)
    sc.camera = cam
    # Blender 5 sin FFMPEG en este build: cuadros JPEG y luego ffmpeg
    import subprocess, tempfile
    tmp = Path(tempfile.mkdtemp())
    sc.render.image_settings.file_format = "JPEG"; sc.render.image_settings.quality = 92
    sc.render.filepath = str(tmp / "f_####")
    bpy.ops.render.render(animation=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "30", "-i", str(tmp / "f_%04d.jpg"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "26", "-movflags", "+faststart",
                    str(OUT / "giro.mp4")], check=True)
    print("✓ giro.mp4")

if "glb" in ARGS:
    bpy.ops.object.select_all(action="DESELECT")
    for ob in list(C_B20.objects) + list(C_AIS.objects):
        if not ob.name.endswith("_corte"):
            ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT / "bloque20.glb"), use_selection=True,
                              export_apply=True, export_yup=True, export_draco_mesh_compression_enable=True)
    print("✓ bloque20.glb")

if "blend" in ARGS:
    bpy.ops.wm.save_as_mainfile(filepath=str(R / "bloque20.blend"))
    print("✓ bloque20.blend")
