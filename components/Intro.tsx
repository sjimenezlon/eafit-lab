"use client";
import { lab } from "./store";
import { INFORME_2025, MAPA_OFICIAL } from "@/data/eafit";

const FUENTES: [string, string, string][] = [
  ["Cifras institucionales", "EAFIT · Informe de Sostenibilidad 2025", INFORME_2025],
  ["Porterías, parqueaderos, deportes y comidas", "EAFIT · mapa oficial del campus (uMap)", MAPA_OFICIAL],
  ["Alturas de 11.468 edificios", "Alcaldía de Medellín · Cartografía City Urban 2025", "https://www.medellin.gov.co/servidormapas/rest/services/mapas_nacionales/VM_Cartografia_City_Urban_2025/MapServer/10"],
  ["Pisos por edificio", "Alcaldía de Medellín · Catastro, huella de construcción", "https://www.medellin.gov.co/servidormapas/rest/services/ServiciosCatastro/ide_catastro/MapServer/7"],
  ["Población por manzana", "DANE · CNPV 2018 + MGN 2024", "https://geoportal.dane.gov.co/"],
  ["Estratos, arbolado, equipamientos, espacio público, POT", "Alcaldía de Medellín · servidor de mapas (CC BY-SA 4.0)", "https://www.medellin.gov.co/servidormapas/rest/services"],
  ["Bloques, lugares, vías, paraderos, Metro", "OpenStreetMap (ODbL)", "https://www.openstreetmap.org/way/33784057"],
  ["EnCicla", "CityBikes API", "https://api.citybik.es/v2/networks/encicla"],
  ["Reparto modal de referencia", "Encuesta Origen-Destino AMVA 2023", "https://www.elcolombiano.com/antioquia/resultados-encuesta-origen-destino-area-metropolitana"],
];

export default function Intro() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="intro-t">
      <div className="max-h-full w-full max-w-[680px] overflow-y-auto rounded-xl bg-white shadow-2xl scroll-fino">
        <div className="h-1.5 bg-azure" />
        <div className="p-7 max-sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <p className="font-mono text-[11px] font-semibold tracking-widest text-zafre/70">PLATAFORMA TERRITORIAL · CAMPUS EAFIT</p>
            <span className="rounded border border-gris-borde bg-[#F4F5F6] px-2 py-0.5 font-mono text-[11px] text-gris-medio">v1.0</span>
          </div>
          <h2 id="intro-t" className="mt-2 text-[28px] font-extrabold leading-tight tracking-tight text-zafre">Eafit-Lab</h2>
          <p className="text-[14px] text-gris-medio">Maqueta 3D de la universidad y de 1,5 km a su alrededor</p>
          <hr className="my-5 border-gris-borde" />
          <p className="text-[14.5px] leading-relaxed text-black/80">
            Una herramienta para entender el campus de EAFIT y el barrio que lo rodea. Muestra cada edificio con su altura medida,
            las cifras oficiales de la universidad, quién vive alrededor, cómo se llega y qué hay cerca. Todo sale de fuentes públicas, citadas en cada ficha.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["Volumetría medida", "11.468 edificios con altura real de la cartografía City Urban 2025, sobre el relieve."],
              ["Cifras con fuente", "Estudiantes, oferta, investigación, campus y movilidad, del Informe de Sostenibilidad 2025."],
              ["Llegada al campus", "Agentes que caminan por la red real y entran por las 10 porterías oficiales."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-lg border border-gris-borde p-3">
                <p className="text-[12px] font-bold uppercase tracking-wide text-zafre">{t}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-gris-medio">{d}</p>
              </div>
            ))}
          </div>
          <details className="mt-5 rounded-lg border border-gris-borde">
            <summary className="cursor-pointer px-3 py-2 text-[13px] font-semibold text-zafre">Fuentes y límites</summary>
            <ul className="space-y-1.5 px-3 pb-3 text-[12px] text-gris-medio">
              {FUENTES.map(([q, f, u]) => (
                <li key={q}><b className="text-black/75">{q}:</b> <a className="text-zafre underline" href={u} target="_blank" rel="noreferrer">{f}</a></li>
              ))}
              <li className="pt-1"><b className="text-black/75">Límites:</b> EAFIT no publica la lista completa de bloques ni cómo llega su comunidad; los nombres de bloque vienen de OpenStreetMap y el reparto modal parte de la encuesta metropolitana. La población es del censo de 2018, el último que hay. Consultado el 25-sep-2026.</li>
            </ul>
          </details>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-gris-borde bg-[#FAFAFA] px-7 py-4 max-sm:px-5">
          <span className="font-mono text-[11px] text-gris-medio">Medellín, Colombia · 6,2002° N 75,5785° O</span>
          <button autoFocus onClick={() => lab.set({ intro: false })} className="rounded-lg bg-zafre px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#00004d]">Entrar a la maqueta →</button>
        </div>
      </div>
    </div>
  );
}
