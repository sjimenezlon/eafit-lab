"use client";
import { useEffect, useState } from "react";
import { lab, useLab } from "./store";
import { INSTITUCION, KPIS, GRUPOS, ENTORNO_OFICIAL, INFORME_2025 } from "@/data/eafit";
import { POI_COLOR, POI_LABEL, ESTRATO_COLOR } from "./paletas";

const fmt = (n: number, d = 0) => n.toLocaleString("es-CO", { maximumFractionDigits: d, minimumFractionDigits: d });

export default function PanelDer() {
  const st = useLab();
  return (
    <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex border-b border-gris-borde">
        {([["universidad", "Universidad"], ["entorno", "Entorno"], ["ficha", "Ficha"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => lab.set({ panelDer: k })} aria-pressed={st.panelDer === k}
            className={`flex-1 py-2.5 text-[13px] font-semibold ${st.panelDer === k ? "border-b-2 border-zafre text-zafre" : "text-gris-medio hover:text-zafre"}`}>
            {l}{k === "ficha" && st.seleccion ? " •" : ""}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3.5 scroll-fino">
        {st.panelDer === "universidad" && <Universidad />}
        {st.panelDer === "entorno" && <Entorno />}
        {st.panelDer === "ficha" && <Ficha />}
      </div>
    </div>
  );
}

function Universidad() {
  const [abierto, setAbierto] = useState<string | null>("Oferta académica");
  return (
    <div className="space-y-3">
      <div>
        <p className="font-mono text-[10.5px] font-semibold tracking-widest text-zafre/70">DESDE {INSTITUCION.fundacion.split(" ").pop()}</p>
        <h2 className="text-[19px] font-extrabold leading-tight tracking-tight text-zafre">{INSTITUCION.nombre}</h2>
        <p className="mt-1 text-[11.5px] leading-snug text-gris-medio">{INSTITUCION.naturaleza}. Rectora: {INSTITUCION.rectora}.</p>
      </div>
      <div className="rounded-lg bg-azure/15 px-3 py-2 text-[11.5px] leading-snug text-zafre">
        <b>Acreditación institucional.</b> {INSTITUCION.acreditacion}.
      </div>
      <div className="grid grid-cols-2 gap-2">
        {KPIS.map((c) => (
          <div key={c.k} className="rounded-lg border border-gris-borde p-2.5">
            <div className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-gris-medio">{c.k}</div>
            <div className="num font-mono text-[21px] font-bold text-zafre">{c.v}</div>
            {c.nota && <div className="text-[10px] leading-tight text-gris-medio">{c.nota}</div>}
          </div>
        ))}
      </div>
      <div>
        <p className="etq mb-1">Escuelas</p>
        <div className="flex flex-wrap gap-1">
          {INSTITUCION.escuelas.map((e) => <span key={e} className="rounded-full bg-[#F4F5F6] px-2 py-0.5 text-[11px] text-black/80">{e}</span>)}
        </div>
        <p className="mt-1.5 text-[11px] text-gris-medio">Sedes: {INSTITUCION.sedes.join(" · ")}</p>
      </div>
      <div className="divide-y divide-gris-borde rounded-lg border border-gris-borde">
        {GRUPOS.map((g) => (
          <div key={g.titulo}>
            <button onClick={() => setAbierto(abierto === g.titulo ? null : g.titulo)} aria-expanded={abierto === g.titulo}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-[12.5px] font-bold text-zafre">
              {g.titulo}<span className="text-gris-medio">{abierto === g.titulo ? "−" : "+"}</span>
            </button>
            {abierto === g.titulo && (
              <dl className="space-y-1.5 px-3 pb-3">
                {g.cifras.map((c) => (
                  <div key={c.k} className="flex items-baseline justify-between gap-3">
                    <dt className="text-[11.5px] leading-snug text-black/75">
                      {c.fuente ? <a href={c.fuente} target="_blank" rel="noreferrer" className="hover:underline">{c.k}</a> : c.k}
                      {c.nota && <span className="block text-[10px] text-gris-medio">{c.nota}</span>}
                    </dt>
                    <dd className="num shrink-0 text-right font-mono text-[12.5px] font-bold text-zafre">{c.v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ))}
      </div>
      <p className="text-[10.5px] leading-snug text-gris-medio">
        Fuente principal: <a className="underline" href={INFORME_2025} target="_blank" rel="noreferrer">Informe de Sostenibilidad EAFIT 2025</a>. Consultado el 25-sep-2026.
      </p>
    </div>
  );
}

function Barras({ datos, color, sufijo = "" }: { datos: { k: string; v: number; c?: string }[]; color?: string; sufijo?: string }) {
  const max = Math.max(...datos.map((d) => d.v), 1);
  return (
    <div className="space-y-1">
      {datos.map((d) => (
        <div key={d.k} className="grid grid-cols-[72px_1fr_52px] items-center gap-2 text-[11px]">
          <span className="truncate text-black/75">{d.k}</span>
          <span className="h-2.5 rounded-sm bg-[#F0F1F2]"><span className="block h-full rounded-sm" style={{ width: `${(d.v / max) * 100}%`, background: d.c || color }} /></span>
          <span className="num text-right font-mono text-gris-medio">{fmt(d.v)}{sufijo}</span>
        </div>
      ))}
    </div>
  );
}

function Entorno() {
  const [r, setR] = useState<any>(null);
  useEffect(() => { fetch("/data/resumen.json").then((x) => x.json()).then(setR); }, []);
  if (!r) return <p className="text-[12px] text-gris-medio">Cargando…</p>;
  const pob = r.poblacion_2018;
  const ee = r.estrato_energia_viv;
  const eeTot = Object.values(ee).reduce((a: number, b: any) => a + b, 0) as number;
  const tile = (k: string, v: string, n?: string) => (
    <div className="rounded-lg border border-gris-borde p-2.5">
      <div className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-gris-medio">{k}</div>
      <div className="num font-mono text-[19px] font-bold text-zafre">{v}</div>
      {n && <div className="text-[10px] leading-tight text-gris-medio">{n}</div>}
    </div>
  );
  return (
    <div className="space-y-3.5">
      <div>
        <p className="font-mono text-[10.5px] font-semibold tracking-widest text-zafre/70">RADIO DE 1,5 KM</p>
        <h2 className="text-[17px] font-extrabold leading-tight tracking-tight text-zafre">El campus y su vecindario</h2>
        <p className="mt-1 text-[11.5px] leading-snug text-gris-medio">El círculo toma parte de El Poblado, Guayabal y el norte de Envigado, con el río Medellín en medio.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {tile("Habitantes (2018)", fmt(pob.personas), `${fmt(pob.viviendas)} viviendas · ${fmt(pob.hogares)} hogares`)}
        {tile("Edificios", fmt(r.edificios.n), `${fmt(r.edificios.mas_de_20_pisos)} con más de 60 m`)}
        {tile("Altura máxima", `${fmt(r.edificios.h_max, 0)} m`, `media ${fmt(r.edificios.h_media, 1)} m`)}
        {tile("Campus EAFIT", `${fmt(r.edificios.campus_n)} volúmenes`, `el más alto mide ${fmt(r.edificios.campus_h_max, 0)} m`)}
      </div>

      <div>
        <p className="etq mb-1.5">Edad de los vecinos (censo 2018)</p>
        <Barras datos={r.edad_2018.map((d: any) => ({ k: d.g + " años", v: d.v }))} color="#155FE7" />
        <p className="mt-1 text-[10.5px] text-gris-medio">{fmt((pob.superior + pob.posgrado) / pob.personas * 100, 0)} % de los habitantes tiene educación superior o posgrado.</p>
      </div>

      <div>
        <p className="etq mb-1.5">Viviendas por estrato (factura de energía)</p>
        <div className="flex h-3 overflow-hidden rounded-sm">
          {Object.entries(ee).map(([k, v]: any) => <div key={k} title={`Estrato ${k}: ${fmt(v)}`} style={{ width: `${(v / eeTot) * 100}%`, background: ESTRATO_COLOR[+k - 1] }} />)}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-2.5 text-[10.5px] text-gris-medio">
          {Object.entries(ee).map(([k, v]: any) => <span key={k}><i className="mr-1 inline-block h-2 w-2 rounded-sm" style={{ background: ESTRATO_COLOR[+k - 1] }} />E{k} {fmt((v / eeTot) * 100, 0)} %</span>)}
        </div>
      </div>

      <div>
        <p className="etq mb-1.5">Lugares con nombre (OpenStreetMap)</p>
        <Barras datos={Object.entries(r.poi).sort((a: any, b: any) => b[1] - a[1]).map(([k, v]: any) => ({ k: POI_LABEL[k], v, c: POI_COLOR[k] }))} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {tile("Árboles urbanos", fmt(r.arboles.n), `${fmt(r.arboles.especies_area)} especies registradas`)}
        {tile("Espacio público", `${fmt(r.espacio_publico.ha, 1)} ha`, `${r.espacio_publico.n} parques y zonas`)}
        {tile("Metro", r.transporte.metro_estaciones.join(" · "), "Línea A")}
        {tile("Bus y bici", `${r.transporte.rutas_bus} rutas`, `${r.transporte.paraderos} paraderos · ${fmt(r.transporte.ciclorrutas_km, 1)} km de ciclorruta`)}
      </div>

      <div>
        <p className="etq mb-1">Especies más comunes en el campus (SAU)</p>
        <ol className="space-y-0.5 text-[11.5px]">
          {r.arboles.top_campus.slice(0, 5).map((t: any) => (
            <li key={t.sp} className="flex justify-between"><i className="text-black/80">{t.sp}</i><span className="num font-mono text-gris-medio">{t.n}</span></li>
          ))}
        </ol>
      </div>

      <div className="rounded-lg border border-gris-borde p-3">
        <p className="etq mb-1.5">Comuna 14 · El Poblado</p>
        <dl className="space-y-1.5">
          {ENTORNO_OFICIAL.map((c) => (
            <div key={c.k} className="flex items-baseline justify-between gap-3">
              <dt className="text-[11.5px] leading-snug text-black/75">
                {c.fuente?.startsWith("http") ? <a href={c.fuente} target="_blank" rel="noreferrer" className="hover:underline">{c.k}</a> : c.k}
                {c.nota && <span className="block text-[10px] text-gris-medio">{c.nota}</span>}
              </dt>
              <dd className="num shrink-0 font-mono text-[12.5px] font-bold text-zafre">{c.v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="text-[10.5px] leading-snug text-gris-medio">
        La población es del Censo 2018 del DANE, prorrateada por área de manzana dentro del círculo. Es el último censo: el conteo de 2025 se canceló.
      </p>
    </div>
  );
}

function Ficha() {
  const st = useLab();
  const s = st.seleccion;
  if (!s) {
    return (
      <div className="py-8 text-center text-[12.5px] leading-relaxed text-gris-medio">
        Haga clic en un edificio, una manzana, un árbol, una portería o un agente para ver su ficha.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div>
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-widest text-zafre/70">{s.tipo}</p>
        <h2 className="text-[18px] font-extrabold leading-tight tracking-tight text-zafre">{s.titulo}</h2>
      </div>
      <dl className="divide-y divide-gris-borde rounded-lg border border-gris-borde">
        {s.filas.map(([k, v], i) => (
          <div key={i} className={`flex items-baseline gap-3 px-3 py-2 text-[12px] ${k ? "justify-between" : ""}`}>
            {k && <dt className="text-gris-medio">{k}</dt>}
            <dd className={`${k ? "num text-right font-mono font-semibold text-zafre" : "text-black/80"}`}>{v}</dd>
          </div>
        ))}
      </dl>
      {s.nota && <p className="text-[10.5px] leading-snug text-gris-medio">{s.nota}</p>}
      <button onClick={() => lab.set({ seleccion: null })} className="text-[11.5px] font-semibold text-zafre underline">Limpiar selección</button>
    </div>
  );
}
