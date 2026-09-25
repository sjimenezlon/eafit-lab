"use client";
import { useEffect, useMemo, useState } from "react";
import { lab, useLab, MODOS, REPARTO_EOD, ajustarReparto, type Modo, type Escenario, type CapaId } from "./store";
import { POI_COLOR, POI_LABEL, ESTRATO_COLOR, OFICIAL_COLOR } from "./paletas";

const fmt = (n: number, d = 0) => n.toLocaleString("es-CO", { maximumFractionDigits: d, minimumFractionDigits: d });

const ESCENARIOS: { id: Escenario; t: string; s: string; agentes: number }[] = [
  { id: "pico", t: "Hora pico", s: "llegada 6:30–8:00", agentes: 600 },
  { id: "evento", t: "Evento", s: "Auditorio Fundadores · 630", agentes: 630 },
  { id: "valle", t: "Hora valle", s: "media tarde", agentes: 200 },
];

export default function PanelIzq() {
  const [tab, setTab] = useState<"sim" | "capas">("sim");
  return (
    <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex border-b border-gris-borde">
        {([["sim", "Simulación"], ["capas", "Capas"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k}
            className={`flex-1 py-2.5 text-[13px] font-semibold ${tab === k ? "border-b-2 border-zafre text-zafre" : "text-gris-medio hover:text-zafre"}`}>{l}</button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3.5 scroll-fino">{tab === "sim" ? <Simulacion /> : <Capas />}</div>
    </div>
  );
}

// ---------------------------------------------------------------- simulación
function Simulacion() {
  const st = useLab();
  const acceso = useAcceso();
  const hora = (() => {
    const base = st.escenario === "valle" ? 15 * 60 : st.escenario === "evento" ? 17 * 60 + 30 : 6 * 60 + 30;
    const m = Math.floor(base + st.sim.t / 60);
    return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  })();
  return (
    <div className="space-y-3.5">
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="etq">Escenario</span>
          <span className="font-mono text-[11px] font-semibold text-zafre">{fmt(st.agentes)} agentes</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {ESCENARIOS.map((e) => (
            <button key={e.id} onClick={() => lab.set({ escenario: e.id, agentes: e.agentes })} aria-pressed={st.escenario === e.id}
              className={`rounded-lg border px-1.5 py-2 text-center ${st.escenario === e.id ? "border-zafre bg-zafre text-white" : "border-gris-borde bg-[#F4F5F6] text-black/80 hover:border-zafre/40"}`}>
              <div className="text-[12.5px] font-bold">{e.t}</div>
              <div className={`text-[10px] leading-tight ${st.escenario === e.id ? "text-white/75" : "text-gris-medio"}`}>{e.s}</div>
            </button>
          ))}
        </div>
        <label className="mt-2.5 flex items-center gap-2 text-[11px] text-gris-medio">
          Agentes
          <input className="desliz" type="range" min={100} max={1500} step={50} value={st.agentes}
            onChange={(e) => lab.set({ agentes: +e.target.value })} aria-label="Número de agentes" />
        </label>
      </div>

      <div className="rounded-xl border border-gris-borde bg-[#FAFAFA] p-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="etq">Reparto modal de llegada</span>
          <button onClick={() => lab.set({ reparto: { ...REPARTO_EOD } })} className="text-[10.5px] font-semibold text-zafre underline">EOD 2023</button>
        </div>
        <div className="space-y-2">
          {MODOS.map((m) => {
            const v = st.reparto[m.id];
            return (
              <div key={m.id}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-1.5 text-black/85"><i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />{m.label}</span>
                  <span className="num font-mono text-[11.5px] font-semibold" style={{ color: m.id === "taxi" ? "#8a7400" : m.id === "pie" ? "#b35f00" : "#000066" }}>{v}% <span className="font-normal text-gris-medio">({Math.round((st.agentes * v) / 100)})</span></span>
                </div>
                <input className="desliz" style={{ ["--c" as any]: m.color }} type="range" min={0} max={100} value={v}
                  aria-label={`Porcentaje ${m.label}`}
                  onChange={(e) => lab.set({ reparto: ajustarReparto(st.reparto, m.id, +e.target.value) })} />
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[10.5px] leading-snug text-gris-medio">
          Parte de la Encuesta Origen-Destino del Valle de Aburrá 2023 (todos los motivos de viaje). EAFIT no publica cómo llega su comunidad: mueva los deslizadores para probar supuestos.
        </p>
      </div>

      <div className="rounded-xl border border-gris-borde p-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="etq">Acceso real por la red</span>
          <span className="font-mono text-[10px] text-gris-medio">OSM · porterías oficiales</span>
        </div>
        <table className="w-full text-[11.5px]">
          <thead><tr className="text-left text-[10px] uppercase tracking-wide text-gris-medio"><th className="font-semibold">Modo</th><th className="text-right font-semibold">Recorrido medio</th><th className="text-right font-semibold">Tiempo</th></tr></thead>
          <tbody>
            {acceso.map((a) => (
              <tr key={a.m} className="border-t border-gris-borde">
                <td className="py-1"><i className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: MODOS.find((x) => x.id === a.m)!.color }} />{MODOS.find((x) => x.id === a.m)!.label.split(" ")[0]}</td>
                <td className="num text-right font-mono">{fmt(a.len)} m</td>
                <td className="num text-right font-mono">{fmt(a.min, 1)} min</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1.5 text-[10.5px] leading-snug text-gris-medio">Último tramo hasta el bloque de destino, a velocidad media del modo. Para Metro y bus: caminata desde la estación o el paradero.</p>
      </div>

      <div className="rounded-xl border border-gris-borde p-3">
        <span className="etq">Dato real · vehículos</span>
        <div className="mt-1.5 grid grid-cols-2 gap-2 text-[11.5px]">
          <div><div className="num font-mono text-[17px] font-bold text-zafre">2.645</div><div className="text-gris-medio">carros entran al día para 1.042 celdas</div></div>
          <div><div className="num font-mono text-[17px] font-bold text-zafre">899</div><div className="text-gris-medio">motos entran al día para 459 celdas</div></div>
        </div>
        <p className="mt-1.5 text-[10.5px] text-gris-medio">Cada celda de carro rota ~2,5 veces al día. Fuente: Informe de Sostenibilidad 2025.</p>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[["Hora", hora, "text-zafre"], ["En ruta", fmt(st.sim.enRuta), "text-[#155FE7]"], ["Llegados", fmt(st.sim.llegados), "text-[#159449]"], ["Vel.", `${st.vel}×`, "text-black"]].map(([k, v, c]) => (
          <div key={k} className="rounded-lg border border-gris-borde px-1 py-2 text-center">
            <div className="text-[9.5px] font-semibold uppercase tracking-wide text-gris-medio">{k}</div>
            <div className={`num font-mono text-[15px] font-bold ${c}`}>{v}</div>
          </div>
        ))}
      </div>
      {st.sim.llegados > 0 && (
        <div className="flex h-2 overflow-hidden rounded-full" title="Llegadas por modo">
          {MODOS.map((m) => {
            const v = st.sim.porModo[m.id] || 0;
            return v ? <div key={m.id} style={{ width: `${(v / st.sim.llegados) * 100}%`, background: m.color }} /> : null;
          })}
        </div>
      )}
      <div className="flex gap-1.5">
        <button onClick={() => lab.set({ corriendo: !st.corriendo })} className="flex-1 rounded-lg border border-gris-borde py-2 text-[13px] font-semibold text-zafre hover:bg-azure/10">
          {st.corriendo ? "❚❚ Pausar" : "▶ Reanudar"}
        </button>
        <button onClick={() => lab.set({ reparto: { ...st.reparto } })} className="flex-1 rounded-lg border border-gris-borde py-2 text-[13px] font-semibold text-zafre hover:bg-azure/10">⟲ Reiniciar</button>
        <div className="flex overflow-hidden rounded-lg border border-gris-borde">
          {[1, 2, 4].map((v) => (
            <button key={v} onClick={() => lab.set({ vel: v })} aria-pressed={st.vel === v}
              className={`px-2.5 text-[12px] font-semibold ${st.vel === v ? "bg-zafre text-white" : "text-gris-medio"}`}>{v}×</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function useAcceso() {
  const [rutas, setRutas] = useState<{ m: Modo; p: [number, number][] }[]>([]);
  const st = useLab();
  useEffect(() => {
    fetch(st.escenario === "evento" ? "/data/rutas_evento.json" : "/data/rutas.json").then((r) => r.json()).then(setRutas);
  }, [st.escenario]);
  return useMemo(() => {
    const kx = 111320 * Math.cos((6.2 * Math.PI) / 180), ky = 110574;
    const acc: Record<string, number[]> = {};
    for (const r of rutas) {
      let d = 0;
      for (let i = 1; i < r.p.length; i++) d += Math.hypot((r.p[i][0] - r.p[i - 1][0]) * kx, (r.p[i][1] - r.p[i - 1][1]) * ky);
      (acc[r.m] ||= []).push(d);
    }
    return MODOS.filter((m) => acc[m.id]).map((m) => {
      const len = acc[m.id].reduce((a, b) => a + b, 0) / acc[m.id].length;
      return { m: m.id, len, min: len / m.vel / 60 };
    });
  }, [rutas]);
}

// ---------------------------------------------------------------- capas
function Interruptor({ id, t, s, children }: { id: CapaId; t: string; s?: string; children?: React.ReactNode }) {
  const st = useLab();
  const on = st.capas[id];
  return (
    <div className="border-b border-gris-borde py-2 last:border-0">
      <button onClick={() => lab.capa(id)} aria-pressed={on} className="flex w-full items-center justify-between gap-2 text-left">
        <span>
          <span className="block text-[12.5px] font-semibold text-black/85">{t}</span>
          {s && <span className="block text-[10.5px] text-gris-medio">{s}</span>}
        </span>
        <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? "bg-zafre" : "bg-gris-claro"}`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
        </span>
      </button>
      {on && children && <div className="mt-1.5">{children}</div>}
    </div>
  );
}

const Muestra = ({ c, t, forma = "o" }: { c: string; t: string; forma?: "o" | "□" | "—" }) => (
  <span className="mr-2.5 inline-flex items-center gap-1 text-[10.5px] text-gris-medio">
    <i className={`inline-block ${forma === "o" ? "h-2 w-2 rounded-full" : forma === "□" ? "h-2.5 w-2.5 rounded-sm" : "h-0.5 w-3"}`} style={{ background: c }} />{t}
  </span>
);

function Capas() {
  const st = useLab();
  return (
    <div>
      <p className="etq mb-1">Campus</p>
      <Interruptor id="edificios" t="Edificios en 3D" s="11.468 con altura medida (City Urban 2025)">
        <div className="flex gap-1">
          {([["campus", "Resaltar campus"], ["altura", "Color por altura"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => lab.set({ colorEdif: k })} aria-pressed={st.colorEdif === k}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold ${st.colorEdif === k ? "bg-zafre text-white" : "bg-[#F4F5F6] text-gris-medio"}`}>{l}</button>
          ))}
        </div>
        <div className="mt-1.5">
          {st.colorEdif === "campus"
            ? <><Muestra c="#00A9E0" t="EAFIT" forma="□" /><Muestra c="#474a52" t="entorno" forma="□" /></>
            : <><Muestra c="#4458A6" t="12 m" forma="□" /><Muestra c="#155FE7" t="30 m" forma="□" /><Muestra c="#46C69F" t="60 m" forma="□" /><Muestra c="#F8D300" t="100 m" forma="□" /></>}
        </div>
      </Interruptor>
      <Interruptor id="bloques" t="Números de bloque" s="47 edificios con nombre en OpenStreetMap" />
      <Interruptor id="oficial" t="Mapa oficial del campus" s="Porterías, parqueaderos, deporte y comidas">
        <Muestra c={OFICIAL_COLOR.porteria} t="porterías" forma="□" /><Muestra c={OFICIAL_COLOR.parqueadero} t="parqueaderos" forma="□" />
        <Muestra c={OFICIAL_COLOR.deporte} t="deporte" forma="□" /><Muestra c={OFICIAL_COLOR.alimentacion} t="comidas" forma="□" />
      </Interruptor>

      <p className="etq mb-1 mt-3">Movilidad</p>
      <Interruptor id="transporte" t="Transporte" s="Metro, rutas de bus, paraderos, ciclorrutas, EnCicla">
        <Muestra c="#00A9E0" t="Metro" /><Muestra c="#155FE7" t="bus" /><Muestra c="#46C69F" t="bici" />
      </Interruptor>
      <Interruptor id="rutas" t="Recorridos de los agentes" s="Rutas calculadas por modo" />
      <Interruptor id="radios" t="Radios de caminata" s="500 m, 1 km y 1,5 km desde el campus" />

      <p className="etq mb-1 mt-3">Gente y territorio</p>
      <Interruptor id="poblacion" t="Población por manzana" s="DANE, censo 2018 · habitantes por hectárea">
        <Muestra c="#9D7E95" t="100" forma="□" /><Muestra c="#BA3A93" t="300" forma="□" /><Muestra c="#F368F3" t="600+" forma="□" />
      </Interruptor>
      <Interruptor id="estrato" t="Estrato socioeconómico" s="Alcaldía de Medellín">
        {ESTRATO_COLOR.map((c, i) => <Muestra key={i} c={c} t={String(i + 1)} forma="□" />)}
      </Interruptor>
      <Interruptor id="pot" t="Tratamientos del POT" s="Acuerdo 48 de 2014 (en revisión)" />
      <Interruptor id="espacio" t="Espacio público" s="Parques y zonas de esparcimiento" />
      <Interruptor id="equipamientos" t="Equipamientos" s="Colegios, salud, culto, deporte…" />

      <p className="etq mb-1 mt-3">Naturaleza</p>
      <Interruptor id="arboles" t="Árboles" s="14.313 del arbolado urbano (SAU)">
        <Muestra c="#47D16A" t="en el campus" /><Muestra c="#159449" t="entorno" />
      </Interruptor>
      <Interruptor id="agua" t="Quebradas y río" s="Río Medellín y afluentes" />

      <p className="etq mb-1 mt-3">Servicios</p>
      <Interruptor id="poi" t="Lugares" s="533 con nombre en OpenStreetMap">
        <div className="flex flex-wrap gap-1">
          {Object.keys(POI_COLOR).map((k) => (
            <button key={k} onClick={() => lab.set({ poiCats: { ...st.poiCats, [k]: !st.poiCats[k] } })} aria-pressed={st.poiCats[k]}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] ${st.poiCats[k] ? "border-transparent bg-[#F4F5F6] text-black/80" : "border-gris-borde text-gris-medio/60 line-through"}`}>
              <i className="h-2 w-2 rounded-full" style={{ background: POI_COLOR[k] }} />{POI_LABEL[k]}
            </button>
          ))}
        </div>
      </Interruptor>
    </div>
  );
}
