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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="intro-t">
      <div className="max-h-full w-full max-w-[520px] overflow-y-auto rounded-3xl bg-white p-9 shadow-2xl scroll-fino max-sm:p-6">
        <img src="/img/eafit-zafre.svg" alt="Universidad EAFIT" className="h-7 w-auto" />
        <h2 id="intro-t" className="mt-8 text-[30px] font-semibold leading-[1.05] tracking-tight text-zafre">
          El campus y su barrio,<br />en una maqueta.
        </h2>
        <p className="mt-4 text-[14.5px] leading-relaxed text-[#55565a]">
          Cada edificio con su altura medida, las cifras oficiales de la universidad, quién vive alrededor y cómo se llega.
          Todo sale de fuentes públicas.
        </p>
        <div className="mt-7 grid grid-cols-3 gap-4 border-y linea py-5">
          {[["11.468", "edificios con altura real"], ["10", "porterías oficiales"], ["59.273", "vecinos en 1,5 km"]].map(([v, k]) => (
            <div key={k}>
              <div className="num text-[22px] font-light tracking-tight text-zafre">{v}</div>
              <div className="text-[11px] leading-snug text-[#8a8b8f]">{k}</div>
            </div>
          ))}
        </div>
        <details className="group mt-4">
          <summary className="flex cursor-pointer items-center justify-between py-1 text-[12.5px] font-medium text-[#1d1d24]">
            Fuentes y límites<span className="text-[#a0a1a5] transition group-open:rotate-45">+</span>
          </summary>
          <ul className="mt-2 space-y-1.5 text-[11.5px] leading-snug text-[#8a8b8f]">
            {FUENTES.map(([q, f, u]) => (
              <li key={q}>{q}: <a className="text-zafre hover:underline" href={u} target="_blank" rel="noreferrer">{f}</a></li>
            ))}
            <li className="pt-1">EAFIT no publica la lista completa de bloques ni cómo llega su comunidad: los nombres de bloque vienen de OpenStreetMap y el reparto modal, de la encuesta metropolitana. La población es del censo de 2018, el último. Consultado el 25-sep-2026.</li>
          </ul>
        </details>
        <button autoFocus onClick={() => lab.set({ intro: false })}
          className="mt-7 w-full rounded-full bg-zafre py-3 text-[14px] font-medium text-white transition hover:bg-[#00004d]">Entrar</button>
      </div>
    </div>
  );
}
