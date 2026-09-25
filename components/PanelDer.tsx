"use client";
import { useEffect, useState } from "react";
import { lab, useLab } from "./store";
import { INSTITUCION, KPIS, GRUPOS, ENTORNO_OFICIAL, INFORME_2025 } from "@/data/eafit";
import { POI_COLOR, POI_LABEL, ESTRATO_COLOR } from "./paletas";

const fmt = (n: number, d = 0) => n.toLocaleString("es-CO", { maximumFractionDigits: d, minimumFractionDigits: d });

export default function PanelDer() {
  const st = useLab();
  return (
    <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex gap-5 px-5 pt-4" role="tablist">
        {([["universidad", "Universidad"], ["entorno", "Entorno"], ["ficha", "Ficha"]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={st.panelDer === k} onClick={() => lab.set({ panelDer: k })}
            className={`relative pb-2 text-[12.5px] transition ${st.panelDer === k ? "font-medium text-zafre after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-zafre" : "text-[#8a8b8f] hover:text-zafre"}`}>
            {l}{k === "ficha" && st.seleccion && <i className="absolute -right-2 top-0.5 h-1.5 w-1.5 rounded-full bg-azure" />}
          </button>
        ))}
      </div>
      <div className="mx-5 border-b linea" />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scroll-fino">
        {st.panelDer === "universidad" && <Universidad />}
        {st.panelDer === "entorno" && <Entorno />}
        {st.panelDer === "ficha" && <Ficha />}
      </div>
    </div>
  );
}

const Cifra = ({ k, v, n }: { k: string; v: string; n?: string }) => (
  <div>
    <div className="etq">{k}</div>
    <div className="num text-[24px] font-light leading-tight tracking-tight text-zafre">{v}</div>
    {n && <div className="text-[10.5px] leading-snug text-[#a0a1a5]">{n}</div>}
  </div>
);

function Lista({ cifras }: { cifras: { k: string; v: string; nota?: string; fuente?: string }[] }) {
  return (
    <dl>
      {cifras.map((c) => (
        <div key={c.k} className="flex items-baseline justify-between gap-4 border-b linea py-2 last:border-0">
          <dt className="text-[12px] leading-snug text-[#55565a]">
            {c.fuente?.startsWith("http") ? <a href={c.fuente} target="_blank" rel="noreferrer" className="hover:text-zafre hover:underline">{c.k}</a> : c.k}
            {c.nota && <span className="block text-[10.5px] text-[#a0a1a5]">{c.nota}</span>}
          </dt>
          <dd className="num shrink-0 text-right text-[13px] text-zafre">{c.v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Universidad() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[17px] font-semibold tracking-tight text-zafre">{INSTITUCION.nombre}</h2>
        <p className="mt-1 text-[11.5px] leading-snug text-[#8a8b8f]">Fundada en 1960 · acreditada en alta calidad hasta 2036 · rectora {INSTITUCION.rectora.split(" (")[0]}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        {KPIS.map((c) => <Cifra key={c.k} k={c.k.replace("Estudiantes de ", "")} v={c.v} n={c.nota} />)}
      </div>
      <div>
        {GRUPOS.map((g) => (
          <details key={g.titulo} className="group border-t linea" open={g.titulo === "Campus Medellín"}>
            <summary className="flex cursor-pointer items-center justify-between py-2.5 text-[12.5px] font-medium text-[#1d1d24]">
              {g.titulo}<span className="text-[#a0a1a5] transition group-open:rotate-45">+</span>
            </summary>
            <div className="pb-2"><Lista cifras={g.cifras} /></div>
          </details>
        ))}
        <details className="group border-t linea">
          <summary className="flex cursor-pointer items-center justify-between py-2.5 text-[12.5px] font-medium text-[#1d1d24]">
            Escuelas y sedes<span className="text-[#a0a1a5] transition group-open:rotate-45">+</span>
          </summary>
          <ul className="pb-3 text-[12px] leading-relaxed text-[#55565a]">
            {INSTITUCION.escuelas.map((e) => <li key={e}>Escuela de {e}</li>)}
            <li className="mt-1.5 text-[11px] text-[#a0a1a5]">Sedes: {INSTITUCION.sedes.map((x) => x.split(" (")[0]).join(", ")}</li>
          </ul>
        </details>
      </div>
      <p className="text-[10.5px] leading-snug text-[#a0a1a5]">
        Fuente: <a className="underline" href={INFORME_2025} target="_blank" rel="noreferrer">Informe de Sostenibilidad EAFIT 2025</a>. Consultado el 25-sep-2026.
      </p>
    </div>
  );
}

function Barras({ datos, color }: { datos: { k: string; v: number; c?: string }[]; color?: string }) {
  const max = Math.max(...datos.map((d) => d.v), 1);
  return (
    <div className="space-y-1.5">
      {datos.map((d) => (
        <div key={d.k} className="grid grid-cols-[76px_1fr_44px] items-center gap-2 text-[11px]">
          <span className="truncate text-[#55565a]">{d.k}</span>
          <span className="h-[3px] rounded-full bg-[#efeff0]"><span className="block h-full rounded-full" style={{ width: `${(d.v / max) * 100}%`, background: d.c || color }} /></span>
          <span className="num text-right text-[#8a8b8f]">{fmt(d.v)}</span>
        </div>
      ))}
    </div>
  );
}

function Entorno() {
  const [r, setR] = useState<any>(null);
  useEffect(() => { fetch("/data/resumen.json").then((x) => x.json()).then(setR); }, []);
  if (!r) return <p className="text-[12px] text-[#8a8b8f]">Cargando…</p>;
  const pob = r.poblacion_2018;
  const ee = r.estrato_energia_viv;
  const eeTot = Object.values(ee).reduce((a: number, b: any) => a + b, 0) as number;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[17px] font-semibold tracking-tight text-zafre">1,5 km alrededor</h2>
        <p className="mt-1 text-[11.5px] leading-snug text-[#8a8b8f]">Parte de El Poblado, Guayabal y el norte de Envigado, con el río Medellín en medio.</p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Cifra k="Habitantes" v={fmt(pob.personas)} n="censo DANE 2018" />
        <Cifra k="Edificios" v={fmt(r.edificios.n)} n={`el más alto, ${fmt(r.edificios.h_max, 0)} m`} />
        <Cifra k="Árboles" v={fmt(r.arboles.n)} n={`${r.arboles.especies_area} especies`} />
        <Cifra k="Espacio público" v={`${fmt(r.espacio_publico.ha, 1)} ha`} n={`${r.espacio_publico.n} parques y zonas`} />
      </div>

      <div>
        <p className="etq mb-2">Edad de los vecinos</p>
        <Barras datos={r.edad_2018.map((d: any) => ({ k: d.g + " años", v: d.v }))} color="#000066" />
        <p className="mt-2 text-[10.5px] text-[#a0a1a5]">{fmt((pob.superior + pob.posgrado) / pob.personas * 100, 0)} % tiene educación superior o posgrado.</p>
      </div>

      <div>
        <p className="etq mb-2">Viviendas por estrato</p>
        <div className="flex h-1.5 overflow-hidden rounded-full">
          {Object.entries(ee).map(([k, v]: any) => <div key={k} title={`Estrato ${k}: ${fmt(v)}`} style={{ width: `${(v / eeTot) * 100}%`, background: ESTRATO_COLOR[+k - 1] }} />)}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 text-[10.5px] text-[#8a8b8f]">
          {Object.entries(ee).filter(([, v]: any) => v / eeTot >= 0.01).map(([k, v]: any) => <span key={k} className="num">E{k} · {fmt((v / eeTot) * 100, 0)} %</span>)}
        </div>
      </div>

      <div>
        <p className="etq mb-2">Lugares con nombre</p>
        <Barras datos={Object.entries(r.poi).sort((a: any, b: any) => b[1] - a[1]).slice(0, 6).map(([k, v]: any) => ({ k: POI_LABEL[k], v, c: POI_COLOR[k] }))} />
      </div>

      <div>
        <p className="etq mb-1">Comuna 14 · El Poblado</p>
        <Lista cifras={ENTORNO_OFICIAL} />
      </div>
      <p className="text-[10.5px] leading-snug text-[#a0a1a5]">
        Transporte en el radio: Metro {r.transporte.metro_estaciones.join(" y ")}, {r.transporte.rutas_bus} rutas de bus, {fmt(r.transporte.ciclorrutas_km, 1)} km de ciclorruta. Población prorrateada por área de manzana; el censo de 2018 es el último.
      </p>
    </div>
  );
}

function Ficha() {
  const st = useLab();
  const s = st.seleccion;
  if (!s) {
    return <p className="py-10 text-center text-[12px] leading-relaxed text-[#8a8b8f]">Toque un edificio, una manzana, un árbol,<br />una portería o un agente.</p>;
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="etq">{s.tipo}</p>
        <h2 className="mt-0.5 text-[17px] font-semibold leading-tight tracking-tight text-zafre">{s.titulo}</h2>
      </div>
      <dl>
        {s.filas.map(([k, v], i) => (
          <div key={i} className={`flex items-baseline gap-4 border-b linea py-2 text-[12px] last:border-0 ${k ? "justify-between" : ""}`}>
            {k && <dt className="text-[#8a8b8f]">{k}</dt>}
            <dd className={k ? "num text-right text-zafre" : "text-[#55565a]"}>{v}</dd>
          </div>
        ))}
      </dl>
      {s.nota && <p className="text-[10.5px] leading-snug text-[#a0a1a5]">{s.nota}</p>}
      <button onClick={() => lab.set({ seleccion: null })} className="text-[11.5px] text-zafre hover:underline">Limpiar</button>
    </div>
  );
}
