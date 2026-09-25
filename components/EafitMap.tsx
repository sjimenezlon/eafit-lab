"use client";
import { useEffect, useRef } from "react";
import maplibregl, { Map as MlMap, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { centroid, circle } from "@turf/turf";
import { estiloBase, VISTA_2D, VISTA_3D, CENTRO } from "./mapStyle";
import { lab, useLab, MODOS, type Modo, type CapaId, type Seleccion } from "./store";
import { BLOQUES_USO } from "@/data/eafit";

import { POI_COLOR, POI_LABEL, ESTRATO_COLOR, OFICIAL_COLOR } from "./paletas";

const MODO_COLOR = Object.fromEntries(MODOS.map((m) => [m.id, m.color])) as Record<Modo, string>;
const MODO_VEL = Object.fromEntries(MODOS.map((m) => [m.id, m.vel])) as Record<Modo, number>;

// Qué capas del mapa pertenecen a cada interruptor del panel.
const GRUPOS: Record<CapaId, string[]> = {
  edificios: ["edif-3d", "edif-line"],
  bloques: ["bloques-label", "bloques-label-sm"],
  poblacion: ["manz-fill", "manz-line"],
  estrato: ["estrato-fill"],
  arboles: ["arboles", "arboles-3d"],
  poi: ["poi"],
  transporte: ["bus-rutas", "metro-linea", "metro-3d", "metro-est", "metro-label", "paraderos", "ciclo", "encicla"],
  oficial: ["oficial-fill", "oficial-line", "oficial-label"],
  pot: ["pot-fill", "pot-line", "pot-label"],
  espacio: ["ep-fill"],
  equipamientos: ["eq-fill", "eq-line"],
  agua: ["agua", "rio-poly"],
  radios: ["radios", "radios-label"],
  rutas: ["rutas-lineas"],
};

type Ruta = { m: Modo; o: string; p: [number, number][]; cum: number[]; len: number };
type Agente = { r: number; d: number; v: number; m: Modo };

const M_LAT = 110574;
const M_LON = 111320 * Math.cos((6.2 * Math.PI) / 180);

function prepararRutas(raw: { m: Modo; o: string; p: [number, number][] }[]): Ruta[] {
  return raw.map((r) => {
    const cum = [0];
    for (let i = 1; i < r.p.length; i++) {
      const dx = (r.p[i][0] - r.p[i - 1][0]) * M_LON;
      const dy = (r.p[i][1] - r.p[i - 1][1]) * M_LAT;
      cum.push(cum[i - 1] + Math.hypot(dx, dy));
    }
    return { ...r, cum, len: cum[cum.length - 1] };
  });
}

function posicion(r: Ruta, d: number): [number, number] {
  const c = r.cum;
  let lo = 0, hi = c.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (c[mid] <= d) lo = mid; else hi = mid;
  }
  const seg = c[hi] - c[lo] || 1;
  const t = Math.min(1, Math.max(0, (d - c[lo]) / seg));
  const a = r.p[lo], b = r.p[hi];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

const fmt = (n: number, d = 0) => n.toLocaleString("es-CO", { maximumFractionDigits: d, minimumFractionDigits: d });

/** Ejecuta fn cuando el estilo está listo, sin depender de 'load' (que espera todas las teselas). */
function conEstilo(map: MlMap, fn: () => void) {
  let hecho = false;
  const intentar = () => {
    if (hecho) return;
    if (map.getStyle()?.layers?.length) { hecho = true; fn(); }
  };
  map.once("style.load", intentar);
  const reloj = setInterval(() => { intentar(); if (hecho) clearInterval(reloj); }, 150);
}

export default function EafitMap({ mapRef }: { mapRef: React.MutableRefObject<MlMap | null> }) {
  const cont = useRef<HTMLDivElement>(null);
  const listo = useRef(false);
  const rutasRef = useRef<{ normal: Ruta[]; evento: Ruta[] }>({ normal: [], evento: [] });
  const agentes = useRef<Agente[]>([]);
  const st = useLab();

  // ------------------------------------------------------------ creación del mapa
  useEffect(() => {
    if (!cont.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: cont.current,
      style: estiloBase(),
      center: VISTA_3D.center,
      zoom: VISTA_3D.zoom,
      pitch: VISTA_3D.pitch,
      bearing: VISTA_3D.bearing,
      maxPitch: 78,
      attributionControl: { compact: true },
      antialias: true,
      preserveDrawingBuffer: true,
    } as any);
    mapRef.current = map;
    (window as any).__map = map;
    (window as any).__lab = lab;
    // Los paneles laterales tapan los bordes: se centra la cámara en el hueco libre.
    if (window.innerWidth > 768) map.setPadding({ left: 320, right: 340, top: 40, bottom: 0 });

    const J = (u: string) => fetch(u).then((r) => r.json());
    const datos = Promise.all([
      J("/data/edificios.geojson"), J("/data/bloques.geojson"), J("/data/campus.geojson"),
      J("/data/manzanas.geojson"), J("/data/estrato.geojson"), J("/data/arboles.geojson"),
      J("/data/poi.geojson"), J("/data/metro_linea.geojson"), J("/data/metro_estaciones.geojson"),
      J("/data/paraderos.geojson"), J("/data/rutas_bus.geojson"), J("/data/ciclorrutas.geojson"),
      J("/data/encicla.geojson"), J("/data/agua.geojson"), J("/data/rio_medellin.geojson"),
      J("/data/pot.geojson"), J("/data/espacio_publico.geojson"), J("/data/equipamientos.geojson"),
      J("/data/campus_oficial.geojson"), J("/data/rutas.json"), J("/data/rutas_evento.json"),
      J("/data/arboles3d.geojson"), J("/data/metro3d.geojson"), J("/data/rio3d.geojson"),
    ]);

    conEstilo(map, async () => {
      const [edif, bloques, campus, manz, estrato, arboles, poi, mLinea, mEst, parad, busR, ciclo, encicla,
        agua, rio, pot, ep, eq, oficial, rutas, rutasEv, arb3d, metro3d, rio3d] = await datos;

      const add = (id: string, data: any) => map.addSource(id, { type: "geojson", data });
      add("campus", campus);
      map.addSource("edif", { type: "geojson", data: edif, generateId: true });
      add("bloques-pt", {
        type: "FeatureCollection",
        features: bloques.features.map((f: any) => ({ ...centroid(f), properties: f.properties })),
      });
      add("manz", manz); add("estrato", estrato); add("arboles", arboles); add("poi", poi);
      add("metro-linea", mLinea); add("metro-est", mEst); add("paraderos", parad); add("bus-rutas", busR);
      add("ciclo", ciclo); add("encicla", encicla); add("agua", agua); add("rio", rio);
      add("pot", pot); add("ep", ep); add("eq", eq); add("oficial", oficial);
      add("arb3d", arb3d); add("metro3d", metro3d); add("rio3d", rio3d);
      add("oficial-pt", {
        type: "FeatureCollection",
        features: oficial.features.map((f: any) => ({ ...centroid(f), properties: f.properties })),
      });
      const anillos = [500, 1000, 1500].map((r) =>
        circle(CENTRO, r / 1000, { steps: 96, units: "kilometers", properties: { r, min: Math.round(r / 80) } }));
      add("radios", { type: "FeatureCollection", features: anillos });
      add("rutas-lineas", {
        type: "FeatureCollection",
        features: rutas.map((r: any) => ({ type: "Feature", properties: { m: r.m }, geometry: { type: "LineString", coordinates: r.p } })),
      });
      add("agentes", { type: "FeatureCollection", features: [] });
      add("sel", { type: "FeatureCollection", features: [] });
      rutasRef.current = { normal: prepararRutas(rutas), evento: prepararRutas(rutasEv) };

      const L = (spec: any) => map.addLayer(spec);
      // --- superficies
      L({ id: "estrato-fill", type: "fill", source: "estrato", paint: {
        "fill-color": ["match", ["get", "e"], 1, ESTRATO_COLOR[0], 2, ESTRATO_COLOR[1], 3, ESTRATO_COLOR[2], 4, ESTRATO_COLOR[3], 5, ESTRATO_COLOR[4], 6, ESTRATO_COLOR[5], "#444"],
        "fill-opacity": 0.42 } });
      L({ id: "manz-fill", type: "fill", source: "manz", paint: {
        "fill-color": ["interpolate", ["linear"], ["get", "dens"], 0, "#1b1522", 100, "#9D7E95", 300, "#BA3A93", 600, "#F368F3"],
        "fill-opacity": 0.6 } });
      L({ id: "manz-line", type: "line", source: "manz", paint: { "line-color": "#F368F3", "line-width": 0.4, "line-opacity": 0.5 } });
      L({ id: "pot-fill", type: "fill", source: "pot", paint: {
        "fill-color": ["match", ["get", "tipo"], "API", "#6E76AB", "CN1", "#46C69F", "CN2", "#7BB851", "CN3", "#BCCA7C", "CN4", "#F8D300", "CN5", "#FF8F1B", "R", "#F0142C", "D", "#FF7AC0", "#9ACAD1"],
        "fill-opacity": 0.3 } });
      L({ id: "pot-line", type: "line", source: "pot", paint: { "line-color": "#FFFFFF", "line-width": 0.8, "line-opacity": 0.5 } });
      L({ id: "ep-fill", type: "fill", source: "ep", paint: { "fill-color": "#47D16A", "fill-opacity": 0.45 } });
      L({ id: "eq-fill", type: "fill", source: "eq", paint: { "fill-color": "#FF8F1B", "fill-opacity": 0.35 } });
      L({ id: "eq-line", type: "line", source: "eq", paint: { "line-color": "#FF8F1B", "line-width": 1 } });
      L({ id: "campus-fill", type: "fill", source: "campus", paint: { "fill-color": "#1b5c40", "fill-opacity": 0.22 } });
      L({ id: "oficial-fill", type: "fill", source: "oficial", paint: {
        "fill-color": ["match", ["get", "cat"], "porteria", OFICIAL_COLOR.porteria, "parqueadero", OFICIAL_COLOR.parqueadero, "deporte", OFICIAL_COLOR.deporte, OFICIAL_COLOR.alimentacion],
        "fill-opacity": 0.4 } });
      L({ id: "oficial-line", type: "line", source: "oficial", paint: {
        "line-color": ["match", ["get", "cat"], "porteria", OFICIAL_COLOR.porteria, "parqueadero", OFICIAL_COLOR.parqueadero, "deporte", OFICIAL_COLOR.deporte, OFICIAL_COLOR.alimentacion],
        "line-width": 0.8, "line-opacity": 0.7 } });
      L({ id: "campus-line", type: "line", source: "campus", paint: { "line-color": "#8adcf6", "line-width": 1.6, "line-opacity": 0.9 } });
      L({ id: "radios", type: "line", source: "radios", paint: { "line-color": "#BCE6FB", "line-width": 1.1, "line-dasharray": [3, 3], "line-opacity": 0.7 } });
      // --- redes
      L({ id: "rio-poly", type: "fill", source: "rio3d", paint: { "fill-color": "#1a5270", "fill-opacity": 0.92 } });
      L({ id: "agua", type: "line", source: "agua", paint: { "line-color": "#45C6D8", "line-width": ["match", ["get", "kind"], "river", 2.5, 1], "line-opacity": 0.55 } });
      L({ id: "rio", type: "line", source: "rio", layout: { visibility: "none" }, paint: { "line-color": "#45C6D8", "line-width": 3, "line-opacity": 0.5 } });
      L({ id: "bus-rutas", type: "line", source: "bus-rutas", paint: { "line-color": "#155FE7", "line-width": 0.9, "line-opacity": 0.35 } });
      L({ id: "ciclo", type: "line", source: "ciclo", paint: { "line-color": "#46C69F", "line-width": 1.2, "line-opacity": 0.7, "line-dasharray": [2, 1.5] } });
      L({ id: "metro-linea", type: "line", source: "metro-linea", paint: { "line-color": "#7ad4f2", "line-width": 1.4, "line-opacity": 0.45 } });
      L({ id: "metro-3d", type: "fill-extrusion", source: "metro3d", paint: {
        "fill-extrusion-color": "#5ec8ef", "fill-extrusion-height": 8.6, "fill-extrusion-base": 6.4,
        "fill-extrusion-opacity": 0.95 } });
      L({ id: "rutas-lineas", type: "line", source: "rutas-lineas", paint: {
        "line-color": ["match", ["get", "m"], ...MODOS.flatMap((m) => [m.id, m.color]), "#fff"],
        "line-width": 1.1, "line-opacity": 0.35 } });
      // --- volumetría
      L({ id: "campus-base", type: "fill-extrusion", source: "campus", paint: {
        "fill-extrusion-color": "#1b5c40", "fill-extrusion-height": 0.7, "fill-extrusion-base": 0,
        "fill-extrusion-opacity": 0.96 } });
      L({ id: "edif-3d", type: "fill-extrusion", source: "edif", paint: {
        "fill-extrusion-color": marcarSel(colorEdif("campus")),
        "fill-extrusion-height": ["get", "h"],
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": 0.96,
        "fill-extrusion-vertical-gradient": true } });
      L({ id: "edif-line", type: "line", source: "edif", minzoom: 16.7, filter: ["==", ["get", "c"], 1], paint: {
        "line-color": "rgba(255,255,255,0.55)", "line-width": 0.8, "line-opacity": 0.45 } });
      L({ id: "arboles-3d", type: "fill-extrusion", source: "arb3d", paint: {
        "fill-extrusion-color": ["case", [">", ["get", "h"], 9.5], "#2f6b45", "#3d9a5c"],
        "fill-extrusion-height": ["get", "h"], "fill-extrusion-base": 0,
        "fill-extrusion-opacity": 0.95, "fill-extrusion-vertical-gradient": true } });
      L({ id: "sel-line", type: "line", source: "sel", paint: { "line-color": "#F8D300", "line-width": 3 } });
      // --- puntos
      L({ id: "arboles", type: "circle", source: "arboles", filter: ["==", ["get", "c"], 0], paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 0.6, 16, 1.3, 18, 3.2],
        "circle-color": "#3d9b63",
        "circle-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0.35, 17, 0.75], "circle-pitch-alignment": "map" } });
      L({ id: "poi", type: "circle", source: "poi", paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 2.5, 18, 6],
        "circle-color": ["match", ["get", "cat"], ...Object.entries(POI_COLOR).flat(), "#fff"],
        "circle-stroke-color": "#0d0f14", "circle-stroke-width": 1 } });
      L({ id: "paraderos", type: "circle", source: "paraderos", minzoom: 15, paint: { "circle-radius": 2.5, "circle-color": "#155FE7", "circle-opacity": 0.8 } });
      L({ id: "encicla", type: "circle", source: "encicla", paint: { "circle-radius": 4, "circle-color": "#46C69F", "circle-stroke-color": "#0b0c10", "circle-stroke-width": 1 } });
      L({ id: "metro-est", type: "circle", source: "metro-est", paint: { "circle-radius": 5, "circle-color": "#FFFFFF", "circle-stroke-color": "#00A9E0", "circle-stroke-width": 2.5 } });
      L({ id: "agentes", type: "circle", source: "agentes", paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 1.6, 16, 3, 18, 5],
        "circle-color": ["match", ["get", "m"], ...MODOS.flatMap((m) => [m.id, m.color]), "#fff"],
        "circle-stroke-width": 0.7, "circle-stroke-color": "rgba(8,10,14,0.65)",
        "circle-blur": 0.05 } });
      // --- rótulos
      const txt = { "text-font": ["Noto Sans Regular"], "text-size": 10.5, "text-letter-spacing": 0.02 } as any;
      const halo = { "text-color": "rgba(255,255,255,0.85)", "text-halo-color": "rgba(11,12,16,0.85)", "text-halo-width": 1.2 };
      L({ id: "metro-label", type: "symbol", source: "metro-est", layout: { ...txt, "text-field": ["concat", "Metro ", ["get", "name"]], "text-offset": [0, 1.5], "text-size": 12 }, paint: halo });
      const lbl = ["coalesce", ["get", "lbl"], ["get", "ref"], ""] as any;
      L({ id: "bloques-label", type: "symbol", source: "bloques-pt", minzoom: 15.4,
        filter: [">=", ["coalesce", ["get", "area_m2"], 0], 400], layout: {
        ...txt, "text-field": lbl, "text-size": 12,
        "text-max-width": 8, "symbol-z-order": "source" }, paint: { ...halo, "text-color": "#FFFFFF", "text-halo-width": 1.4 } });
      L({ id: "bloques-label-sm", type: "symbol", source: "bloques-pt", minzoom: 17.4,
        filter: ["<", ["coalesce", ["get", "area_m2"], 0], 400], layout: {
        ...txt, "text-field": lbl, "text-size": 10,
        "text-max-width": 8 }, paint: { ...halo, "text-color": "rgba(255,255,255,0.8)" } });
      L({ id: "oficial-label", type: "symbol", source: "oficial-pt", minzoom: 15.5, filter: ["==", ["get", "cat"], "porteria"], layout: {
        ...txt, "text-field": ["concat", "P", ["slice", ["get", "name"], 9]], "text-size": 9.5 }, paint: { ...halo, "text-color": "#F8D300" } });
      L({ id: "pot-label", type: "symbol", source: "pot", layout: { ...txt, "text-field": ["get", "codigo_tramiento"], "text-size": 10 }, paint: halo });
      L({ id: "radios-label", type: "symbol", source: "radios", layout: {
        ...txt, "symbol-placement": "line", "text-field": ["concat", ["to-string", ["get", "r"]], " m · ~", ["to-string", ["get", "min"]], " min a pie"], "text-size": 10 },
        paint: { ...halo, "text-color": "#BCE6FB" } });

      // etiquetas del mapa base al final (encima de todo)
      for (const l of map.getStyle().layers) {
        if ((l as any).metadata?.base === "etiquetas") map.moveLayer(l.id);
      }

      // --- interacción
      const clicables = ["agentes", "metro-est", "encicla", "paraderos", "poi", "arboles", "arboles-3d", "oficial-fill", "metro-3d", "edif-3d", "campus-base", "eq-fill", "ep-fill", "pot-fill", "manz-fill", "estrato-fill"];
      let selId: number | string | undefined;
      map.on("click", (e) => {
        const capas = clicables.filter((id) => map.getLayer(id) && map.getLayoutProperty(id, "visibility") !== "none");
        const f = map.queryRenderedFeatures(e.point, { layers: capas })[0];
        if (!f) return;
        const sel = ficha(f);
        if (!sel) return;
        lab.set({ seleccion: sel, panelDer: "ficha" });
        if (selId != null) map.setFeatureState({ source: "edif", id: selId }, { sel: false });
        selId = undefined;
        if (f.layer.id === "edif-3d" && f.id != null) {
          selId = f.id;
          map.setFeatureState({ source: "edif", id: selId }, { sel: true });
        }
        const g: any = f.geometry;
        (map.getSource("sel") as GeoJSONSource).setData(
          f.layer.id !== "edif-3d" && (g.type === "Polygon" || g.type === "MultiPolygon") ? { type: "Feature", properties: {}, geometry: g } as any : { type: "FeatureCollection", features: [] });
      });
      for (const id of clicables) {
        map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
      }

      listo.current = true;
      aplicarEstado(map, lab.get());
      reiniciarAgentes();
    });

    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------ agentes
  const reiniciarAgentes = () => {
    const s = lab.get();
    const rutas = s.escenario === "evento" ? rutasRef.current.evento : rutasRef.current.normal;
    if (!rutas.length) return;
    const idx: Record<string, number[]> = {};
    rutas.forEach((r, i) => (idx[r.m] ||= []).push(i));
    const n = s.agentes;
    const lista: Agente[] = [];
    for (const m of MODOS) {
      const k = Math.round((n * (s.reparto[m.id] || 0)) / 100);
      const cand = idx[m.id];
      if (!cand?.length) continue;
      for (let i = 0; i < k; i++) {
        const r = cand[Math.floor(Math.random() * cand.length)];
        // arranque escalonado: cada agente empieza en un punto aleatorio antes del origen
        lista.push({ r, d: rutas[r].len * (Math.random() * 1.1 - 0.25), v: MODO_VEL[m.id] * (0.8 + Math.random() * 0.4), m: m.id });
      }
    }
    agentes.current = lista;
    lab.set({ sim: { t: 0, enRuta: 0, llegados: 0, porModo: {} } });
  };

  useEffect(() => {
    if (listo.current) reiniciarAgentes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.escenario, st.agentes, st.reparto]);

  useEffect(() => {
    let raf = 0, last = performance.now(), acum = 0, statsT = 0;
    let llegados = 0; const porModo: Partial<Record<Modo, number>> = {}; let tSim = 0;
    let resetKey = agentes.current;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const map = mapRef.current;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!map || !listo.current) return;
      if (resetKey !== agentes.current) { resetKey = agentes.current; llegados = 0; tSim = 0; for (const k in porModo) delete porModo[k as Modo]; }
      const s = lab.get();
      const rutas = s.escenario === "evento" ? rutasRef.current.evento : rutasRef.current.normal;
      // 1 s real = 30 s simulados × velocidad elegida
      const paso = s.corriendo ? dt * 30 * s.vel : 0;
      tSim += paso;
      const feats: any[] = [];
      let enRuta = 0;
      for (const a of agentes.current) {
        const r = rutas[a.r];
        if (!r) continue;
        a.d += a.v * paso;
        if (a.d >= r.len) {
          llegados++;
          porModo[a.m] = (porModo[a.m] || 0) + 1;
          a.d = -Math.random() * r.len * 0.35;   // vuelve a entrar al flujo
          continue;
        }
        if (a.d < 0) continue;
        enRuta++;
        feats.push({ type: "Feature", properties: { m: a.m, o: r.o, len: Math.round(r.len) }, geometry: { type: "Point", coordinates: posicion(r, a.d) } });
      }
      acum += dt;
      if (acum > 0.05) {
        acum = 0;
        (map.getSource("agentes") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: feats });
      }
      statsT += dt;
      if (statsT > 0.5) {
        statsT = 0;
        lab.set({ sim: { t: tSim, enRuta, llegados, porModo: { ...porModo } } });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------ estado → mapa
  useEffect(() => {
    const map = mapRef.current;
    if (map && listo.current) aplicarEstado(map, st);
  }, [st.capas, st.basemap, st.colorEdif, st.poiCats]);

  const vistaPrev = useRef(st.vista);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || vistaPrev.current === st.vista) return;
    vistaPrev.current = st.vista;
    const v = st.vista === "3d" ? VISTA_3D : VISTA_2D;
    map.easeTo({ ...v, duration: 1200 });
  }, [st.vista, mapRef]);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div ref={cont} className="h-full w-full" />
    </div>
  );
}

function usoDe(nombre?: string, ref?: string) {
  const id = ref || nombre?.match(/Bloque (\d+)/)?.[1];
  if (id && BLOQUES_USO[id]) return BLOQUES_USO[id];
  if (nombre && /Biblioteca/i.test(nombre)) return BLOQUES_USO["32"];
  return undefined;
}

/** El edificio tocado se pinta de amarillo por feature-state. */
function marcarSel(expr: any): any {
  return ["case", ["boolean", ["feature-state", "sel"], false], "#F8D300", expr];
}

function colorEdif(modo: "altura" | "campus"): any {
  if (modo === "altura") {
    return ["interpolate", ["linear"], ["get", "h"], 0, "#3d4a63", 8, "#3d6ea8", 18, "#2aa3c7", 35, "#46C69F", 60, "#F8D300", 100, "#ffb020"];
  }
  // El campus va en azules EAFIT, más claros cuanto más alto, para separar los bloques.
  return ["case", ["==", ["get", "c"], 1],
    ["interpolate", ["linear"], ["get", "h"], 0, "#127eae", 10, "#3ec4ef", 22, "#8adcf6", 40, "#e8f7ff"],
    ["interpolate", ["linear"], ["get", "h"], 0, "#4a5160", 12, "#6a7384", 30, "#8e98a8", 70, "#d5dbe3"]];
}

function aplicarEstado(map: MlMap, s: ReturnType<typeof lab.get>) {
  const vis = (id: string, on: boolean) => map.getLayer(id) && map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
  (Object.keys(GRUPOS) as CapaId[]).forEach((k) => GRUPOS[k].forEach((id) => vis(id, !!s.capas[k])));
  // mapa base
  const sat = s.basemap === "satelite";
  vis("sat", sat);
  for (const l of map.getStyle().layers) {
    if ((l as any).metadata?.base === "maqueta") vis(l.id, !sat);
  }
  if (map.getLayer("edif-3d")) {
    map.setPaintProperty("edif-3d", "fill-extrusion-color", marcarSel(colorEdif(s.colorEdif)));
    map.setPaintProperty("edif-3d", "fill-extrusion-opacity", s.capas.poblacion || s.capas.estrato || s.capas.pot ? 0.55 : 0.92);
  }
  if (map.getLayer("poi")) {
    const cats = Object.entries(s.poiCats).filter(([, v]) => v).map(([k]) => k);
    map.setFilter("poi", ["in", ["get", "cat"], ["literal", cats]]);
  }
}

// ------------------------------------------------------------ fichas
function ficha(f: maplibregl.MapGeoJSONFeature): Seleccion {
  const p: any = f.properties || {};
  switch (f.layer.id) {
    case "edif-3d": {
      const uso = usoDe(p.b, p.ref);
      return {
        tipo: p.c === 1 ? "Edificio del campus EAFIT" : "Edificación del entorno",
        titulo: p.b || (p.c === 1 ? "Edificio del campus" : "Edificación"),
        filas: [
          ["Altura", p.e ? `${fmt(p.h, 1)} m, estimada` : `${fmt(p.h, 1)} m`],
          ["Pisos (catastro)", p.p ? String(p.p) : "sin cruce"],
          ["Área de huella", `${fmt(p.a)} m²`],
          ...(p.z != null ? [["Cota del suelo", `${fmt(p.z)} m s. n. m.`] as [string, string]] : []),
          ...(uso ? [["Uso", uso.uso + (uso.confirmado ? "" : " (sin confirmar)")] as [string, string]] : []),
        ],
        nota: p.e
          ? "Esta huella no tiene medición de City Urban. La altura se estimó con los pisos de OpenStreetMap, a 3,1 m por piso. El nombre viene de OpenStreetMap."
          : "Altura del techo de este volumen: Alcaldía de Medellín, Cartografía City Urban 2025 (AGL). Las piezas contiguas del mismo techo se unieron. Pisos: Catastro. Nombre: OpenStreetMap.",
      };
    }
    case "campus-base":
      return {
        tipo: "Campus EAFIT · sede Medellín",
        titulo: "Límite dibujado del campus",
        filas: [
          ["Área del polígono", "111.362 m²"],
          ["Área oficial 2025", "126.058 m²"],
          ["No está en el polígono", "Los Guayabos"],
        ],
        nota: "Polígono de OpenStreetMap. El Informe de Sostenibilidad 2025 suma el campus principal y Los Guayabos; ese predio no está en el polígono dibujado.",
      };
    case "manz-fill":
      return {
        tipo: "Manzana censal (DANE CNPV 2018)", titulo: `${p.com ?? ""} · ${p.mun}`,
        filas: [["Personas", fmt(p.per)], ["Viviendas", fmt(p.viv)], ["Hogares", fmt(p.hog)],
          ["Densidad", `${fmt(p.dens)} hab/ha`], ["Estrato medio (factura de energía)", p.est ? fmt(p.est, 1) : "—"],
          ["Con educación superior o posgrado", fmt(p.sup)]],
        nota: "DANE, Censo Nacional de Población y Vivienda 2018 (último censo; el conteo de 2025 se canceló). Geometría: MGN 2024.",
      };
    case "estrato-fill":
      return { tipo: "Estrato socioeconómico", titulo: `Estrato ${p.e}`, filas: [["Código de barrio", p.barrio ?? "—"]],
        nota: "Alcaldía de Medellín, capa Estrato socioeconómico (moda por lote o manzana). CC BY-SA 4.0." };
    case "arboles":
    case "arboles-3d":
      return { tipo: p.c === 1 ? "Árbol del campus (registro SAU)" : "Árbol urbano", titulo: p.nc || p.sp,
        filas: [["Especie", p.sp] as [string, string],
          ...(p.h ? [["Copa en la maqueta", `${fmt(p.h, 1)} m (ilustrativa)`] as [string, string]] : [])],
        nota: "Alcaldía de Medellín, Sistema de Arbolado Urbano (SAU). La posición es la registrada; la copa en 3D es una convención de la maqueta. El inventario propio de EAFIT (1.568 individuos, 139 especies) no está georreferenciado en abierto." };
    case "poi":
      return { tipo: POI_LABEL[p.cat] || "Lugar", titulo: p.name, filas: [["Tipo", p.tipo], ["Dentro del campus", p.c === 1 ? "sí" : "no"]], nota: "OpenStreetMap, consultado 25-sep-2026." };
    case "metro-est":
      return { tipo: "Estación del Metro · Línea A", titulo: p.name, filas: [["Sistema", "Metro de Medellín"]],
        nota: "La afluencia por estación no es pública: el Metro publica pasajeros por línea." };
    case "encicla":
      return { tipo: "Estación EnCicla", titulo: p.name, filas: [["Bicicletas disponibles (al consultar)", String(p.free ?? "—")], ["Puestos libres", String(p.slots ?? "—")]],
        nota: "CityBikes API, red «encicla», consultada el 25-sep-2026." };
    case "metro-3d":
      return { tipo: "Metro de Medellín", titulo: p.name || "Corredor de la Línea A",
        filas: [], nota: "Trazado real de OpenStreetMap. El tablero elevado es una convención de la maqueta: la Línea A va en viaducto junto al río." };
    case "paraderos":
      return { tipo: "Paradero de bus", titulo: p.name, filas: [], nota: "OpenStreetMap." };
    case "oficial-fill":
      return { tipo: { porteria: "Portería", parqueadero: "Parqueadero", deporte: "Espacio deportivo", alimentacion: "Alimentación y estancia" }[p.cat as string] || "Campus",
        titulo: p.name, filas: (p.desc || "").split("\n").filter(Boolean).map((l: string) => ["", l.replace(/^-\s*/, "")] as [string, string]),
        nota: "Mapa oficial del campus EAFIT (uMap)." };
    case "eq-fill":
      return { tipo: "Equipamiento (POT)", titulo: p.nombre, filas: [["Tipo", p.tipo], ["Nivel", p.nivel ?? "—"]], nota: "Alcaldía de Medellín, inventario de equipamientos (revisión de mediano plazo 2025)." };
    case "ep-fill":
      return { tipo: "Espacio público", titulo: p.nombre, filas: [["Categoría", p.categoria], ["Subcategoría", p.subcategor ?? "—"]], nota: "Alcaldía de Medellín, espacio público de esparcimiento." };
    case "pot-fill":
      return { tipo: "Tratamiento urbanístico (POT)", titulo: p.codigo_tramiento, filas: [["Tratamiento", p.tratamiento], ["Densidad máx.", `${p.densidadmax} viv/ha`], ["Índice de construcción máx.", p.indiceconstruccmax], ["Altura normativa", p.alturanormativa]],
        nota: "POT de Medellín, Acuerdo 48 de 2014. La revisión (Proyecto de Acuerdo 104 de 2026) está en el Concejo." };
    case "agentes": {
      const m = MODOS.find((x) => x.id === p.m);
      return { tipo: "Agente simulado", titulo: m?.label ?? p.m, filas: [["Origen", p.o], ["Longitud del recorrido", `${fmt(p.len)} m`]],
        nota: "Recorrido calculado sobre la red vial de OpenStreetMap, entrando por la portería más cercana." };
    }
  }
  return null;
}
