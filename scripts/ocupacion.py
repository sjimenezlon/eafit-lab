#!/usr/bin/env python3
"""Genera public/data/ocupacion.json: perfil de ocupación horaria por bloque del campus.

⚠ DATO SINTÉTICO. No es ocupación real de EAFIT. Es un perfil plausible, determinista
(reproducible), pensado como MARCADOR DE POSICIÓN que se reemplaza por el conteo agregado
de clientes asociados por AP y franja horaria que entrega la controladora Wi-Fi (DTI).
El método del gemelo no cambia al llegar el dato real: solo se sustituye 'serie'.

Uso:  python3 scripts/ocupacion.py
"""
import json, hashlib, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
BLOQUES = RAIZ / "public" / "data" / "bloques.geojson"
SALIDA = RAIZ / "public" / "data" / "ocupacion.json"

HORAS = list(range(6, 22))  # 6:00 … 21:00 (16 franjas), día hábil típico (martes)

# Perfil = fracción de la capacidad ocupada en cada franja (índice 0 = 6:00).
# Curvas pensadas a mano para que cada uso tenga su firma diaria reconocible.
PERFILES = {
    #        6    7    8    9   10   11   12   13   14   15   16   17   18   19   20   21
    "aula":     [.02,.18,.55,.78,.88,.90,.55,.42,.72,.86,.80,.62,.48,.40,.22,.08],
    "lab":      [.03,.20,.45,.62,.70,.72,.58,.50,.66,.72,.70,.60,.46,.34,.18,.06],
    "biblioteca":[.04,.15,.32,.46,.58,.66,.60,.58,.68,.78,.84,.88,.82,.74,.58,.40],
    "comidas":  [.05,.22,.40,.34,.30,.52,.95,.90,.42,.58,.66,.40,.44,.38,.22,.10],
    "gimnasio": [.35,.48,.42,.30,.26,.28,.34,.30,.32,.38,.52,.74,.86,.80,.58,.30],
    "eventos":  [.00,.05,.15,.25,.30,.35,.20,.18,.40,.55,.50,.60,.75,.80,.55,.25],
    "servicios":[.02,.12,.35,.50,.58,.60,.52,.46,.56,.60,.58,.50,.38,.26,.12,.04],
    "otros":    [.02,.08,.18,.24,.26,.26,.22,.20,.24,.26,.24,.20,.14,.10,.06,.02],
}
# Densidad de ocupación máxima (personas por m² de huella, ya con pisos prorrateados).
DENS = {"aula":.52, "lab":.42, "biblioteca":.55, "comidas":.42, "gimnasio":.35,
        "eventos":1.0, "servicios":.22, "otros":.10}
ETIQUETA = {"aula":"Aulas y docencia", "lab":"Laboratorios y oficinas", "biblioteca":"Biblioteca",
            "comidas":"Alimentación", "gimnasio":"Deporte", "eventos":"Auditorio y eventos",
            "servicios":"Servicios", "otros":"Otros / acceso"}

def uso_de(p):
    k, n = p.get("kind"), (p.get("name") or "")
    nl = n.lower()
    if "auditorio" in nl or k == "events_venue": return "eventos"
    if "gimnasio" in nl: return "gimnasio"
    if k == "library": return "biblioteca"
    if k in ("cafe", "fast_food", "ice_cream") or "cafeter" in nl: return "comidas"
    if k == "retail": return "servicios"
    if "porter" in nl or "entrada" in nl or "cargas" in nl: return "otros"
    if k == "house": return "otros"
    if k == "university": return "lab" if ("casa" in nl or "cargas" in nl) else "aula"
    return "servicios"

def jitter(id_):  # 0.85 … 1.15, determinista por id
    h = int(hashlib.md5(str(id_).encode()).hexdigest(), 16)
    return 0.85 + (h % 1000) / 1000 * 0.30

def main():
    gj = json.loads(BLOQUES.read_text())
    bloques, tot = [], [0]*len(HORAS)
    for f in gj["features"]:
        p = f["properties"]
        uso = uso_de(p)
        area = p.get("area_m2") or 0
        cap = max(8, round(area * DENS[uso]))
        j = jitter(p["id"])
        serie = [max(0, round(cap * PERFILES[uso][i] * j)) for i in range(len(HORAS))]
        ipico = max(range(len(HORAS)), key=lambda i: serie[i])
        for i, v in enumerate(serie): tot[i] += v
        bloques.append({"id": p["id"], "name": p.get("name"), "uso": uso,
                        "cap": cap, "serie": serie, "pico": {"h": HORAS[ipico], "v": serie[ipico]}})
    out = {
        "_meta": {
            "sintetico": True,
            "titulo": "Ocupación horaria estimada del campus (simulación)",
            "advertencia": ("DATO SINTÉTICO, no es ocupación real de EAFIT. Perfil determinista "
                            "por tipo de uso, marcador de posición del conteo agregado de la "
                            "controladora Wi-Fi (clientes asociados por AP y franja). El método "
                            "no cambia al llegar el dato real: solo se reemplaza 'serie'."),
            "dia": "día hábil típico", "franjas": "cada hora, 6:00–21:00",
            "capacidad": "estimada por huella y uso; no es aforo normativo",
        },
        "horas": HORAS,
        "usos": ETIQUETA,
        "total_dia": tot,
        "bloques": sorted(bloques, key=lambda b: -b["cap"]),
    }
    SALIDA.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    pico = max(range(len(HORAS)), key=lambda i: tot[i])
    print(f"OK → {SALIDA.relative_to(RAIZ)}  ({len(bloques)} bloques)")
    print(f"   pico del campus: {HORAS[pico]}:00 con ~{tot[pico]:,} personas; capacidad total ~{sum(b['cap'] for b in bloques):,}")

if __name__ == "__main__":
    main()
