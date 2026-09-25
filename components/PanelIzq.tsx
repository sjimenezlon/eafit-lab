"use client";
import { useEffect, useMemo, useState } from "react";
import { lab, useLab, MODOS, REPARTO_EOD, ajustarReparto, type Modo, type Escenario, type CapaId } from "./store";
import { POI_COLOR, POI_LABEL, ESTRATO_COLOR } from "./paletas";

const fmt = (n: number, d = 0) => n.toLocaleString("es-CO", { maximumFractionDigits: d, minimumFractionDigits: d });

const ESCENARIOS: { id: Escenario; t: string; agentes: number; nota: string }[] = [
  { id: "pico", t: "Hora pico", agentes: 600, nota: "Llegada de la mañana, de 6:30 a 8:00." },
  { id: "evento", t: "Evento", agentes: 630, nota: "Función en el Auditorio Fundadores: 630 personas, su aforo." },
  { id: "valle", t: "Valle", agentes: 200, nota: "Media tarde, con poco movimiento." },
];

export default function PanelIzq() {
  const st = useLab();
  const acceso = useAcceso();
  const [ajustar, setAjustar] = useState(false);
  const esc = ESCENARIOS.find((e) => e.id === st.escenario)!;
  const hora = (() => {
    const base = st.escenario === "valle" ? 15 * 60 : st.escenario === "evento" ? 17 * 60 + 30 : 6 * 60 + 30;
    const m = Math.floor(base + st.sim.t / 60);
    return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  })();

  return (
    <div className="card max-h-[calc(100vh-150px)] overflow-y-auto p-5 scroll-fino max-md:max-h-[calc(100vh-150px)]">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold tracking-tight text-zafre">Llegada al campus</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => lab.set({ corriendo: !st.corriendo })} aria-label={st.corriendo ? "Pausar" : "Reanudar"}
            className="flex h-7 w-7 items-center justify-center rounded-full text-zafre hover:bg-black/5">
            {st.corriendo
              ? <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="1.5" width="2.6" height="9" rx=".6" fill="currentColor" /><rect x="7.4" y="1.5" width="2.6" height="9" rx=".6" fill="currentColor" /></svg>
              : <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor" /></svg>}
          </button>
          <button onClick={() => lab.set({ vel: st.vel === 4 ? 1 : st.vel * 2 })} aria-label="Cambiar velocidad"
            className="num h-7 min-w-[34px] rounded-full px-2 text-[11.5px] font-medium text-zafre hover:bg-black/5">{st.vel}×</button>
        </div>
      </div>

      <div className="mt-3 flex gap-4 border-b linea" role="tablist">
        {ESCENARIOS.map((e) => (
          <button key={e.id} role="tab" aria-selected={st.escenario === e.id} onClick={() => lab.set({ escenario: e.id, agentes: e.agentes })}
            className={`-mb-px border-b pb-2 text-[12.5px] transition ${st.escenario === e.id ? "border-zafre font-medium text-zafre" : "border-transparent text-[#8a8b8f] hover:text-zafre"}`}>{e.t}</button>
        ))}
      </div>
      <p className="mt-2 text-[11.5px] leading-snug text-[#8a8b8f]">{esc.nota}</p>

      <div className="mt-4 grid grid-cols-3">
        {[["Hora", hora], ["En ruta", fmt(st.sim.enRuta)], ["Llegados", fmt(st.sim.llegados)]].map(([k, v]) => (
          <div key={k}>
            <div className="etq">{k}</div>
            <div className="num text-[22px] font-light tracking-tight text-zafre">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="etq">Cómo llegan</span>
          <button onClick={() => setAjustar(!ajustar)} aria-expanded={ajustar} className="text-[11.5px] font-medium text-zafre hover:underline">{ajustar ? "Listo" : "Ajustar"}</button>
        </div>
        <div className="mt-2 flex h-1.5 overflow-hidden rounded-full">
          {MODOS.map((m) => st.reparto[m.id] ? <div key={m.id} style={{ width: `${st.reparto[m.id]}%`, background: m.color }} title={`${m.label}: ${st.reparto[m.id]} %`} /> : null)}
        </div>
        {!ajustar && (
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {MODOS.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-[11.5px]">
                <span className="flex items-center gap-1.5 text-[#55565a]"><i className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />{m.corto}</span>
                <span className="num text-[#8a8b8f]">{st.reparto[m.id]} %</span>
              </div>
            ))}
          </div>
        )}
        {ajustar && (
          <div className="mt-3 space-y-2.5">
            {MODOS.map((m) => (
              <label key={m.id} className="block">
                <span className="flex justify-between text-[11.5px] text-[#55565a]"><span>{m.label}</span><span className="num">{st.reparto[m.id]} %</span></span>
                <input className="desliz mt-1" style={{ ["--c" as any]: m.color }} type="range" min={0} max={100} value={st.reparto[m.id]}
                  onChange={(e) => lab.set({ reparto: ajustarReparto(st.reparto, m.id, +e.target.value) })} />
              </label>
            ))}
            <label className="block">
              <span className="flex justify-between text-[11.5px] text-[#55565a]"><span>Agentes</span><span className="num">{fmt(st.agentes)}</span></span>
              <input className="desliz mt-1" type="range" min={100} max={1500} step={50} value={st.agentes} onChange={(e) => lab.set({ agentes: +e.target.value })} />
            </label>
            <div className="flex items-center justify-between pt-1">
              <button onClick={() => lab.set({ reparto: { ...REPARTO_EOD } })} className="text-[11.5px] text-zafre hover:underline">Volver a la encuesta 2023</button>
              <button onClick={() => lab.set({ reparto: { ...st.reparto } })} className="text-[11.5px] text-zafre hover:underline">Reiniciar</button>
            </div>
          </div>
        )}
        <p className="mt-2 text-[10.5px] leading-snug text-[#a0a1a5]">Reparto de la Encuesta Origen-Destino 2023 del Valle de Aburrá. EAFIT no publica el suyo.</p>
      </div>

      <details className="group mt-4 border-t linea pt-3">
        <summary className="flex cursor-pointer items-center justify-between text-[12px] font-medium text-zafre">
          Cuánto se tarda y dónde se parquea
          <span className="text-[#a0a1a5] transition group-open:rotate-45">+</span>
        </summary>
        <table className="mt-3 w-full text-[11.5px]">
          <tbody>
            {acceso.map((a) => {
              const m = MODOS.find((x) => x.id === a.m)!;
              return (
                <tr key={a.m} className="border-b linea last:border-0">
                  <td className="py-1.5 text-[#55565a]"><i className="mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: m.color }} />{m.corto}</td>
                  <td className="num text-right text-[#8a8b8f]">{fmt(a.len)} m</td>
                  <td className="num w-16 text-right text-zafre">{fmt(a.min, 1)} min</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-[10.5px] leading-snug text-[#a0a1a5]">Recorrido medio por la red de OpenStreetMap hasta el bloque, entrando por la portería más cercana.</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div><div className="num text-[20px] font-light text-zafre">2.645</div><div className="text-[10.5px] leading-snug text-[#8a8b8f]">carros entran al día para 1.042 celdas</div></div>
          <div><div className="num text-[20px] font-light text-zafre">899</div><div className="text-[10.5px] leading-snug text-[#8a8b8f]">motos al día para 459 celdas</div></div>
        </div>
        <p className="mt-2 text-[10.5px] text-[#a0a1a5]">Informe de Sostenibilidad EAFIT 2025.</p>
      </details>
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

// ---------------------------------------------------------------- capas (menú flotante)
const CAPAS: { grupo: string; items: { id: CapaId; t: string; c: string }[] }[] = [
  { grupo: "Campus", items: [
    { id: "edificios", t: "Edificios 3D", c: "#00A9E0" },
    { id: "bloques", t: "Números de bloque", c: "#BCE6FB" },
    { id: "oficial", t: "Porterías y parqueaderos", c: "#F8D300" },
  ] },
  { grupo: "Movilidad", items: [
    { id: "transporte", t: "Metro, bus y bici", c: "#155FE7" },
    { id: "rutas", t: "Recorridos simulados", c: "#6E76AB" },
    { id: "radios", t: "Radios de caminata", c: "#BCE6FB" },
  ] },
  { grupo: "Territorio", items: [
    { id: "poblacion", t: "Población (2018)", c: "#BA3A93" },
    { id: "estrato", t: "Estrato", c: ESTRATO_COLOR[5] },
    { id: "pot", t: "Tratamientos del POT", c: "#46C69F" },
    { id: "espacio", t: "Espacio público", c: "#47D16A" },
    { id: "equipamientos", t: "Equipamientos", c: "#FF8F1B" },
  ] },
  { grupo: "Naturaleza y servicios", items: [
    { id: "arboles", t: "Árboles", c: "#159449" },
    { id: "agua", t: "Río y quebradas", c: "#45C6D8" },
    { id: "poi", t: "Lugares", c: "#FF7AC0" },
  ] },
];

export function Capas() {
  const st = useLab();
  return (
    <div className="space-y-3">
      {CAPAS.map((g) => (
        <div key={g.grupo}>
          <p className="etq mb-1">{g.grupo}</p>
          {g.items.map((it) => {
            const on = st.capas[it.id];
            return (
              <div key={it.id}>
                <button onClick={() => lab.capa(it.id)} aria-pressed={on} className="flex w-full items-center gap-2.5 py-1 text-left text-[12.5px]">
                  <i className={`h-2 w-2 shrink-0 rounded-full transition ${on ? "" : "opacity-25"}`} style={{ background: it.c }} />
                  <span className={on ? "text-[#1d1d24]" : "text-[#a0a1a5]"}>{it.t}</span>
                </button>
                {on && it.id === "edificios" && (
                  <div className="mb-1 ml-[18px] flex gap-3 text-[11px]">
                    {([["campus", "Resaltar campus"], ["altura", "Por altura"]] as const).map(([k, l]) => (
                      <button key={k} onClick={() => lab.set({ colorEdif: k })} className={st.colorEdif === k ? "text-zafre underline underline-offset-2" : "text-[#a0a1a5]"}>{l}</button>
                    ))}
                  </div>
                )}
                {on && it.id === "estrato" && (
                  <div className="mb-1 ml-[18px] flex gap-1">{ESTRATO_COLOR.map((c, i) => <span key={i} className="flex h-3.5 w-5 items-center justify-center rounded-sm text-[8.5px] text-white" style={{ background: c }}>{i + 1}</span>)}</div>
                )}
                {on && it.id === "poi" && (
                  <div className="mb-1 ml-[18px] flex flex-wrap gap-x-2.5 gap-y-0.5">
                    {Object.keys(POI_COLOR).map((k) => (
                      <button key={k} onClick={() => lab.set({ poiCats: { ...st.poiCats, [k]: !st.poiCats[k] } })} aria-pressed={st.poiCats[k]}
                        className={`flex items-center gap-1 text-[10.5px] ${st.poiCats[k] ? "text-[#55565a]" : "text-[#c4c5c8]"}`}>
                        <i className="h-1.5 w-1.5 rounded-full" style={{ background: POI_COLOR[k], opacity: st.poiCats[k] ? 1 : 0.3 }} />{POI_LABEL[k]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
