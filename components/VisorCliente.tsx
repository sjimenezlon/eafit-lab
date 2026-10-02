"use client";
import dynamic from "next/dynamic";

// three.js solo en el navegador y solo en esta página
const Visor3D = dynamic(() => import("./Visor3D"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center rounded-[18px] bg-[#e6e3dc] text-[13px] text-zafre/60">Cargando el visor…</div>,
});
export default Visor3D;
