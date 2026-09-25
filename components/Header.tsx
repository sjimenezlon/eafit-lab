"use client";
import { lab, useLab } from "./store";

function Seg<T extends string>({ opts, val, on }: { opts: [T, string][]; val: T; on: (v: T) => void }) {
  return (
    <div className="flex rounded-lg border border-gris-borde bg-[#F4F5F6] p-0.5" role="group">
      {opts.map(([k, l]) => (
        <button key={k} onClick={() => on(k)} aria-pressed={val === k}
          className={`rounded-md px-3 py-1.5 text-[13px] max-sm:px-2 max-sm:text-[12px] font-semibold transition ${val === k ? (k === "3d" || k === "2d" ? "bg-zafre text-white" : "bg-white text-zafre shadow-sm") : "text-gris-medio hover:text-zafre"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

export default function Header() {
  const st = useLab();
  return (
    <header className="absolute left-0 right-0 top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-gris-borde bg-white px-4">
      <div className="flex min-w-0 items-center gap-3">
        <img src="/img/eafit-zafre.svg" alt="Universidad EAFIT" className="h-8 w-auto shrink-0 max-sm:h-6" />
        <div className="h-8 w-px shrink-0 bg-gris-borde max-sm:hidden" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[15px] font-extrabold tracking-tight text-zafre">EAFIT-LAB</h1>
            <span className="hidden rounded bg-azure px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zafre sm:inline">CAMPUS MEDELLÍN</span>
          </div>
          <p className="truncate text-[11.5px] text-gris-medio max-sm:hidden">La Aguacatala · El Poblado, Medellín</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="max-sm:hidden">
          <Seg opts={[["maqueta", "Maqueta"], ["satelite", "Satélite"]]} val={st.basemap} on={(v) => lab.set({ basemap: v })} />
        </div>
        <Seg opts={[["2d", "Plano 2D"], ["3d", "Maqueta 3D"]]} val={st.vista} on={(v) => lab.set({ vista: v })} />
      </div>
    </header>
  );
}
