"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Map as MlMap } from "maplibre-gl";
import Header from "./Header";
import Intro from "./Intro";
import PanelIzq from "./PanelIzq";
import PanelDer from "./PanelDer";
import { useLab, lab } from "./store";
import { VISTA_3D } from "./mapStyle";

const EafitMap = dynamic(() => import("./EafitMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-white/70">Cargando la maqueta…</div>,
});

export default function AppShell() {
  const mapRef = useRef<MlMap | null>(null);
  const st = useLab();
  const [movil, setMovil] = useState<"izq" | "der" | null>(null);
  // ?intro=0 abre directo en la maqueta (útil para enlaces y pruebas)
  useEffect(() => {
    if (new URLSearchParams(location.search).get("intro") === "0") lab.set({ intro: false });
  }, []);

  const zoom = (d: number) => mapRef.current?.easeTo({ zoom: (mapRef.current.getZoom() || 15) + d, duration: 300 });
  const reset = () => mapRef.current?.easeTo({ ...VISTA_3D, duration: 1000 });

  return (
    <main className="fixed inset-0 overflow-hidden">
      <div style={{ position: "absolute", top: 56, left: 0, right: 0, bottom: 28 }}>
        <EafitMap mapRef={mapRef} />
      </div>
      <Header />

      {/* paneles: laterales en escritorio, hoja inferior en móvil */}
      <aside className={`absolute left-4 top-[72px] bottom-11 z-20 w-[330px] ${movil === "izq" ? "max-md:flex" : "max-md:hidden"} max-md:left-2 max-md:right-2 max-md:w-auto max-md:top-[64px] max-md:bottom-28 flex flex-col`}>
        <PanelIzq />
      </aside>
      <aside className={`absolute right-4 top-[72px] bottom-11 z-20 w-[340px] ${movil === "der" ? "max-md:flex" : "max-md:hidden"} max-md:left-2 max-md:right-2 max-md:w-auto max-md:top-[64px] max-md:bottom-28 flex flex-col`}>
        <PanelDer />
      </aside>

      {/* controles de cámara */}
      <div className="panel absolute right-[372px] top-[72px] z-10 flex flex-col overflow-hidden max-md:right-2 max-md:top-[64px]">
        {[["+", () => zoom(0.7), "Acercar"], ["−", () => zoom(-0.7), "Alejar"], ["⟲", reset, "Volver a la vista inicial"]].map(([t, fn, l]) => (
          <button key={l as string} aria-label={l as string} title={l as string} onClick={fn as () => void}
            className="h-9 w-9 border-b border-gris-borde text-lg text-zafre last:border-0 hover:bg-azure/10">{t as string}</button>
        ))}
      </div>

      {/* botones de móvil */}
      <div className="absolute bottom-16 left-1/2 z-30 hidden -translate-x-1/2 gap-2 max-md:flex">
        {([["izq", "Simulación · capas"], ["der", "Cifras"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setMovil(movil === k ? null : k)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold shadow-lg ${movil === k ? "bg-zafre text-white" : "bg-white text-zafre"}`}>{movil === k ? "Cerrar" : l}</button>
        ))}
      </div>

      <footer className="absolute bottom-0 left-0 right-0 z-20 flex h-7 items-center justify-between gap-4 border-t border-gris-borde bg-white px-4 text-[11px] text-gris-medio">
        <span className="truncate"><b className="text-zafre">Eafit-Lab</b> · Plataforma territorial del campus y su entorno</span>
        <span className="hidden truncate md:inline">Datos: EAFIT (Informe de Sostenibilidad 2025, mapa oficial) · Alcaldía de Medellín · DANE · Metro · OpenStreetMap</span>
        <button onClick={() => lab.set({ intro: true })} className="shrink-0 font-semibold text-zafre hover:underline">Acerca y fuentes</button>
      </footer>

      {st.intro && <Intro />}
    </main>
  );
}
