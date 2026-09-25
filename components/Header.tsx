"use client";
import { lab, useLab } from "./store";

function Seg<T extends string>({ opts, val, on, label }: { opts: [T, string][]; val: T; on: (v: T) => void; label: string }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-white/10 p-0.5 backdrop-blur" role="group" aria-label={label}>
      {opts.map(([k, l]) => (
        <button key={k} onClick={() => on(k)} aria-pressed={val === k}
          className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${val === k ? "bg-white text-zafre" : "text-white/70 hover:text-white"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

export default function Header() {
  const st = useLab();
  return (
    <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex items-center justify-between gap-3 px-5 pt-4 max-sm:px-3 max-sm:pt-3">
      <div className="pointer-events-auto flex items-center gap-3">
        <img src="/img/eafit-blanco.svg" alt="Universidad EAFIT" className="h-7 w-auto max-sm:h-6" />
        <span className="h-5 w-px bg-white/25" />
        <span className="text-[15px] font-semibold tracking-tight text-white">Lab</span>
      </div>
      <div className="pointer-events-auto flex items-center gap-2">
        <div className="max-sm:hidden">
          <Seg label="Mapa base" opts={[["maqueta", "Maqueta"], ["satelite", "Satélite"]]} val={st.basemap} on={(v) => lab.set({ basemap: v })} />
        </div>
        <Seg label="Vista" opts={[["2d", "2D"], ["3d", "3D"]]} val={st.vista} on={(v) => lab.set({ vista: v })} />
      </div>
    </header>
  );
}
