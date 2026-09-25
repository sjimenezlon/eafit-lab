"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Map as MlMap } from "maplibre-gl";
import Header from "./Header";
import Intro from "./Intro";
import PanelIzq, { Capas } from "./PanelIzq";
import PanelDer from "./PanelDer";
import { useLab, lab } from "./store";
import { VISTA_3D } from "./mapStyle";

const EafitMap = dynamic(() => import("./EafitMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-[13px] text-white/50">Cargando la maqueta…</div>,
});

const Icono = ({ d }: { d: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

export default function AppShell() {
  const mapRef = useRef<MlMap | null>(null);
  const st = useLab();
  const [capas, setCapas] = useState(false);
  const [movil, setMovil] = useState<"izq" | "der" | null>(null);
  // ?intro=0 abre directo en la maqueta (útil para enlaces y pruebas)
  useEffect(() => {
    if (new URLSearchParams(location.search).get("intro") === "0") lab.set({ intro: false });
  }, []);
  const reset = () => mapRef.current?.easeTo({ ...VISTA_3D, duration: 1000 });

  const boton = "flex h-9 items-center gap-2 rounded-full bg-white/90 px-3.5 text-[12.5px] font-medium text-zafre shadow-lg backdrop-blur hover:bg-white";

  return (
    <main className="fixed inset-0 overflow-hidden">
      <div style={{ position: "absolute", inset: 0 }}>
        <EafitMap mapRef={mapRef} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-black/60 to-transparent" />
      <Header />

      <aside className={`absolute left-5 top-[68px] z-20 w-[300px] ${capas ? "hidden" : ""} ${movil === "izq" ? "max-md:block" : "max-md:hidden"} max-md:inset-x-3 max-md:top-[56px] max-md:w-auto`}>
        <PanelIzq />
      </aside>
      <aside className={`absolute bottom-5 right-5 top-[68px] z-20 flex w-[320px] flex-col ${movil === "der" ? "max-md:flex" : "max-md:hidden"} max-md:inset-x-3 max-md:bottom-20 max-md:top-[56px] max-md:w-auto`}>
        <PanelDer />
      </aside>

      {/* capas, encuadre y fuentes */}
      <div className="absolute bottom-5 left-5 z-20 flex flex-col items-start gap-2 max-md:bottom-20 max-md:left-3">
        {capas && (
          <div className="card max-h-[calc(100vh-150px)] w-[260px] overflow-y-auto p-4 scroll-fino">
            <Capas />
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={() => { setCapas(!capas); setMovil(null); }} aria-expanded={capas} className={boton}>
            <Icono d="M12 3 2 8l10 5 10-5-10-5ZM2 16l10 5 10-5M2 12l10 5 10-5" />Capas
          </button>
          <button onClick={reset} aria-label="Volver a la vista inicial" title="Volver a la vista inicial" className={boton + " px-2.5"}>
            <Icono d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
          </button>
          <button onClick={() => lab.set({ intro: true })} className={boton + " max-sm:hidden"}>Fuentes</button>
        </div>
      </div>

      {/* móvil */}
      <div className="absolute bottom-5 left-1/2 z-30 hidden -translate-x-1/2 gap-1 rounded-full bg-white/90 p-1 shadow-lg backdrop-blur max-md:flex">
        {([["izq", "Simulación"], ["der", "Cifras"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => { setMovil(movil === k ? null : k); setCapas(false); }} aria-pressed={movil === k}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium ${movil === k ? "bg-zafre text-white" : "text-zafre"}`}>{l}</button>
        ))}
      </div>

      {st.intro && <Intro />}
    </main>
  );
}
