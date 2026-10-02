"use client";
// Visor del Bloque 20: carga el GLB exportado desde Blender (blender/bloque20.py)
// y permite cortarlo por piso, despiezarlo, levantarlo sobre los aisladores y verlo de noche.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Modo = "completo" | "corte" | "despiece" | "aisladores";
const PISOS = 8;
// encuadre por modo: posición de cámara y punto de mira (y = altura)
const ENCUADRE: Record<Modo, [number[], number[]]> = {
  completo: [[95, 70, 120], [0, 16, 0]],
  corte: [[70, 95, 85], [0, 14, 0]],
  despiece: [[150, 95, 175], [0, 38, 0]],
  aisladores: [[38, 14, 42], [0, 4, 0]],
};
const MODOS: [Modo, string][] = [["completo", "Completo"], ["corte", "Corte"], ["despiece", "Despiece"], ["aisladores", "Aisladores"]];

// Qué es cada pieza y de dónde sale (dato, estimado o ilustrativo)
function describir(nombre: string): { t: string; d: string; tipo: string } | null {
  const p = nombre.match(/^P(\d)_(\w+)/);
  if (p) {
    const k = p[1];
    const m: Record<string, [string, string, string]> = {
      lab: [`Piso ${k} · anillo 1`, "Laboratorios en el bloque central (EAFIT, 2018). 42 en total en el edificio.", "dato"],
      pasillo: [`Piso ${k} · anillo 2`, "Pasillo que da la vuelta al bloque de laboratorios (EAFIT, 2018).", "dato"],
      oficinas: [`Piso ${k} · anillo 3`, "Oficinas de profesores, baños, servicios y salas. Tabiques ilustrativos.", "ilustrativo"],
      losa: [`Piso ${k} · losa`, "Ocho pisos según el catastro. Entrepiso de 4,2 m (estimado).", "estimado"],
      vidrio: [`Piso ${k} · fachada`, "Piel de vidrio detrás de las lamas.", "ilustrativo"],
      lamas: [`Piso ${k} · lamas`, "Lamas verticales grises, como en la foto aérea de 2023. Ritmo ilustrativo.", "ilustrativo"],
    };
    const r = m[p[2]];
    return r ? { t: r[0], d: r[1], tipo: r[2] } : null;
  }
  if (/^Exoesqueleto/.test(nombre)) return { t: "Exoesqueleto de acero", d: "Columnas, anillos cada dos pisos y cruces en X, leídos en la foto aérea. Modulación de 4 × 6 vanos estimada.", tipo: "estimado" };
  if (/^Cubierta/.test(nombre)) return { t: "Cubierta solar", d: "Paneles sobre una pérgola de acero, visibles en la foto aérea.", tipo: "estimado" };
  if (/^Techo/.test(nombre)) return { t: "Cubierta", d: "Losa de techo con pretil.", tipo: "estimado" };
  if (/^Aisladores|^N.cleos/.test(nombre)) return { t: "12 aisladores LRB", d: "Apoyos de caucho con núcleo de plomo de mageba: 25.000 kN y ±200 mm. Posición en retícula 3 × 4 estimada.", tipo: "dato" };
  if (/^Foso/.test(nombre)) return { t: "Foso de aislamiento", d: "Holgura alrededor del edificio para que se mueva sobre los apoyos.", tipo: "estimado" };
  if (/^Edificios_campus|^Edificios campus/.test(nombre)) return { t: "Edificio del campus", d: "Volumen con altura de City Urban 2025 (Alcaldía de Medellín).", tipo: "dato" };
  if (/^Edificios/.test(nombre)) return { t: "Edificio vecino", d: "Volumen con altura de City Urban 2025 (Alcaldía de Medellín).", tipo: "dato" };
  if (/^Copas|^Troncos/.test(nombre)) return { t: "Árbol", d: "Árboles del inventario de la Alcaldía y copas detectadas en la ortofoto. Altura ilustrativa en las detectadas.", tipo: "estimado" };
  if (/^Suelo/.test(nombre)) return { t: "Suelo", d: "Calles, andenes, canchas, parqueaderos, quebradas y Metro de OpenStreetMap.", tipo: "dato" };
  return null;
}

const TIPO_COLOR: Record<string, string> = { dato: "bg-azure text-zafre", estimado: "bg-zafre/10 text-zafre", ilustrativo: "bg-[#efeff0] text-[#6d6e71]" };

export default function Visor3D() {
  const caja = useRef<HTMLDivElement>(null);
  const api = useRef<{ aplicar: () => void } | null>(null);
  const estado = useRef({ modo: "completo" as Modo, piso: 6, exo: true, entorno: true, noche: false });
  const [modo, setModo] = useState<Modo>("completo");
  const [piso, setPiso] = useState(6);
  const [exo, setExo] = useState(true);
  const [entorno, setEntorno] = useState(true);
  const [noche, setNoche] = useState(false);
  const [carga, setCarga] = useState(0);
  const [error, setError] = useState(false);
  const [sel, setSel] = useState<{ t: string; d: string; tipo: string } | null>(null);

  useEffect(() => {
    estado.current = { modo, piso, exo, entorno, noche };
    api.current?.aplicar();
  }, [modo, piso, exo, entorno, noche]);

  useEffect(() => {
    const el = caja.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.25;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 1, 3000);
    camera.position.set(95, 70, 120);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 16, 0); controls.enableDamping = true;
    controls.minDistance = 25; controls.maxDistance = 420; controls.maxPolarAngle = Math.PI * 0.49;

    const hemi = new THREE.HemisphereLight(0xf2f6fb, 0xc9c0b0, 1.9); scene.add(hemi);
    const sol = new THREE.DirectionalLight(0xffffff, 2.6);
    sol.position.set(-60, 110, 70); sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 10, far: 400 });
    sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.4;
    scene.add(sol);

    // piezas por nombre
    const pisos: Record<number, Record<string, THREE.Object3D>> = {};
    const grupos = { exo: [] as THREE.Object3D[], cubierta: [] as THREE.Object3D[], techo: [] as THREE.Object3D[], ais: [] as THREE.Object3D[], entorno: [] as THREE.Object3D[] };
    const base = new Map<THREE.Object3D, number>();
    const objetivo = new Map<THREE.Object3D, number>();
    let vidrio: THREE.MeshStandardMaterial | null = null;
    let resaltado: { m: THREE.Mesh; orig: THREE.Material } | null = null;

    // la cámara viaja al encuadre del modo; si el usuario la toma, se detiene
    let viaje: { p: THREE.Vector3; t: THREE.Vector3 } | null = null;
    let modoPrevio: Modo | null = null;
    controls.addEventListener("start", () => { viaje = null; });
    const aplicar = () => {
      const s = estado.current;
      if (s.modo !== modoPrevio) {
        const [pp, tt] = ENCUADRE[s.modo];
        if (modoPrevio !== null) viaje = { p: new THREE.Vector3(...pp), t: new THREE.Vector3(...tt) };
        modoPrevio = s.modo;
      }
      const vis = (o: THREE.Object3D, v: boolean) => { o.visible = v; };
      const subir = (o: THREE.Object3D, dz: number) => objetivo.set(o, (base.get(o) ?? 0) + dz);
      const interior = s.modo === "corte" || s.modo === "despiece";
      for (let k = 1; k <= PISOS; k++) {
        const p = pisos[k]; if (!p) continue;
        const arriba = s.modo === "corte" && k > s.piso;
        const cortado = s.modo === "corte" && k === s.piso;
        for (const [n, o] of Object.entries(p)) {
          const esInt = n === "lab" || n === "pasillo" || n === "oficinas";
          let v = !arriba;
          if (esInt) v = interior && (s.modo === "despiece" || cortado);
          if (n === "vidrio") v = v && !cortado && s.modo !== "despiece";
          if (n === "lamas") v = v && s.modo !== "despiece";
          vis(o, v);
          subir(o, s.modo === "despiece" ? 6 + (k - 1) * 5 : s.modo === "aisladores" ? 7 : 0);
        }
      }
      const levantar = s.modo === "aisladores" ? 7 : 0;
      grupos.techo.forEach((o) => { vis(o, s.modo !== "corte"); subir(o, s.modo === "despiece" ? 6 + PISOS * 5 : levantar); });
      grupos.cubierta.forEach((o) => { vis(o, s.modo !== "corte"); subir(o, s.modo === "despiece" ? 10 + PISOS * 5 : levantar); });
      grupos.exo.forEach((o) => { vis(o, s.exo && s.modo !== "despiece"); subir(o, levantar); });
      grupos.entorno.forEach((o) => vis(o, s.entorno || /^Suelo/.test(o.name)));
      // de noche: cielo oscuro y los laboratorios encendidos
      hemi.intensity = s.noche ? 0.08 : 1.9; sol.intensity = s.noche ? 0.04 : 2.6;
      if (vidrio) { vidrio.emissive.set(s.noche ? 0xffd9a0 : 0x000000); vidrio.emissiveIntensity = s.noche ? 2.6 : 0; }
      el.style.background = s.noche ? "linear-gradient(#0d1320,#1c2537)" : "";
    };
    api.current = { aplicar };

    const draco = new DRACOLoader(); draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
    const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
    loader.load("/bloque20/bloque20.glb", (gltf) => {
      gltf.scene.traverse((o) => {
        const n = o.name;
        if ((o as THREE.Mesh).isMesh) {
          const m = o as THREE.Mesh;
          m.castShadow = !/^Suelo|^Foso/.test(n); m.receiveShadow = true;
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat?.name === "Vidrio") vidrio = mat;
        }
        if (o.parent !== gltf.scene) return;
        base.set(o, o.position.y);
        const p = n.match(/^P(\d)_(\w+)/);
        if (p) (pisos[+p[1]] ??= {})[p[2]] = o;
        else if (/^Exoesqueleto/.test(n)) grupos.exo.push(o);
        else if (/^Cubierta/.test(n)) grupos.cubierta.push(o);
        else if (/^Techo/.test(n)) grupos.techo.push(o);
        else if (/^Aisladores|^N.cleos|^Foso/.test(n)) grupos.ais.push(o);
        else grupos.entorno.push(o);
      });
      scene.add(gltf.scene);
      setCarga(1); aplicar();
    }, (e) => e.total && setCarga(Math.min(0.99, e.loaded / e.total)), () => setError(true));

    // tocar una pieza
    const ray = new THREE.Raycaster(); const ptr = new THREE.Vector2(); let abajo = [0, 0];
    const onDown = (e: PointerEvent) => { abajo = [e.clientX, e.clientY]; };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - abajo[0], e.clientY - abajo[1]) > 5) return;
      const r = renderer.domElement.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      const hit = ray.intersectObjects(scene.children, true).find((h) => {
        let o: THREE.Object3D | null = h.object; while (o) { if (!o.visible) return false; o = o.parent; } return true;
      });
      if (resaltado) { (resaltado.m.material as THREE.Material).dispose(); resaltado.m.material = resaltado.orig; resaltado = null; }
      if (!hit) { setSel(null); return; }
      let o: THREE.Object3D = hit.object; while (o.parent && o.parent !== scene && o.parent.type !== "Scene") o = o.parent;
      const d = describir(hit.object.name) ?? describir(o.name);
      setSel(d);
      if (d && !/^Suelo/.test(o.name)) {
        const m = hit.object as THREE.Mesh;
        const orig = m.material as THREE.MeshStandardMaterial;
        const c = orig.clone(); c.emissive = new THREE.Color(0xffc400); c.emissiveIntensity = 0.45;
        m.material = c; resaltado = { m, orig };
      }
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    });
    ro.observe(el);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      objetivo.forEach((y, o) => { o.position.y += (y - o.position.y) * 0.12; });
      if (viaje) {
        camera.position.lerp(viaje.p, 0.06); controls.target.lerp(viaje.t, 0.06);
        if (camera.position.distanceTo(viaje.p) < 0.5) viaje = null;
      }
      controls.update(); renderer.render(scene, camera);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); draco.dispose();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose()); } });
      renderer.dispose(); el.removeChild(renderer.domElement);
    };
  }, []);

  const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-[12px] font-medium transition ${on ? "bg-zafre text-white" : "bg-white/85 text-zafre hover:bg-white"}`;
  return (
    <div className="relative h-full w-full">
      <div ref={caja} className="absolute inset-0 overflow-hidden rounded-[18px] bg-gradient-to-b from-[#e9edf2] to-[#d7dadf]" />
      {carga < 1 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-zafre/70">
          {error ? "No se pudo cargar el modelo." : `Cargando el modelo… ${Math.round(carga * 100)} %`}
        </div>
      )}
      {/* modos */}
      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5" role="group" aria-label="Modo de vista">
        {MODOS.map(([k, l]) => <button key={k} onClick={() => setModo(k)} aria-pressed={modo === k} className={chip(modo === k)}>{l}</button>)}
      </div>
      <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-1.5 max-sm:left-3 max-sm:right-auto max-sm:top-12 max-sm:justify-start">
        <button onClick={() => setNoche(!noche)} aria-pressed={noche} className={chip(noche)}>Noche</button>
        <button onClick={() => setExo(!exo)} aria-pressed={exo} className={chip(exo)}>Exoesqueleto</button>
        <button onClick={() => setEntorno(!entorno)} aria-pressed={entorno} className={chip(entorno)}>Entorno</button>
      </div>
      {modo === "corte" && (
        <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-full bg-white/90 px-4 py-2 shadow">
          <label htmlFor="piso" className="whitespace-nowrap text-[12px] font-medium text-zafre">Piso <span className="num">{piso}</span></label>
          <input id="piso" type="range" min={1} max={PISOS} value={piso} onChange={(e) => setPiso(+e.target.value)} className="desliz w-36" />
        </div>
      )}
      {sel ? (
        <div className="absolute bottom-3 right-3 max-w-[300px] rounded-2xl bg-white/95 p-3.5 shadow-lg max-sm:left-3 max-sm:max-w-none" role="status">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${TIPO_COLOR[sel.tipo]}`}>{sel.tipo}</span>
            <span className="text-[13px] font-semibold text-zafre">{sel.t}</span>
          </div>
          <p className="mt-1 text-[12px] leading-snug text-[#55565a]">{sel.d}</p>
        </div>
      ) : carga >= 1 && modo !== "corte" && (
        <p className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/80 px-3 py-1 text-[11px] text-[#55565a]">Arrastre para girar · toque una pieza para saber qué es</p>
      )}
    </div>
  );
}
