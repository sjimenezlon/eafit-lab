"use client";
import { useSyncExternalStore } from "react";

export type Modo = "pie" | "metro" | "bus" | "bici" | "carro" | "moto" | "taxi";
export const MODOS: { id: Modo; label: string; corto: string; color: string; vel: number }[] = [
  // vel en m/s (velocidad media de desplazamiento del último tramo)
  { id: "carro", corto: "Carro", label: "Carro / parqueadero", color: "#6E76AB", vel: 6.5 },
  { id: "metro", corto: "Metro", label: "Metro · Aguacatala / Poblado", color: "#00A9E0", vel: 1.3 },
  { id: "bus", corto: "Bus", label: "Bus / integrado", color: "#155FE7", vel: 1.3 },
  { id: "moto", corto: "Moto", label: "Moto", color: "#FF7AC0", vel: 7 },
  { id: "taxi", corto: "Taxi", label: "Taxi / plataforma", color: "#F8D300", vel: 6.5 },
  { id: "bici", corto: "Bici", label: "Bici / EnCicla", color: "#46C69F", vel: 3.8 },
  { id: "pie", corto: "A pie", label: "A pie desde el barrio", color: "#FF8F1B", vel: 1.3 },
];

export const REPARTO_EOD: Record<Modo, number> = { pie: 42, bici: 3, bus: 16, metro: 11, carro: 9, moto: 15, taxi: 4 };

export type SimStats = { t: number; enRuta: number; llegados: number; porModo: Partial<Record<Modo, number>> };

export type CapaId =
  | "edificios" | "bloques" | "poblacion" | "estrato" | "arboles" | "poi"
  | "transporte" | "oficial" | "pot" | "espacio" | "equipamientos" | "agua" | "radios" | "rutas";

export type Seleccion = { tipo: string; titulo: string; filas: [string, string][]; nota?: string } | null;

export type Escenario = "pico" | "evento" | "valle";

export type LabState = {
  basemap: "maqueta" | "satelite";
  vista: "3d" | "2d";
  capas: Record<CapaId, boolean>;
  colorEdif: "altura" | "campus";
  poiCats: Record<string, boolean>;
  escenario: Escenario;
  reparto: Record<Modo, number>;
  corriendo: boolean;
  vel: number;
  agentes: number;
  seleccion: Seleccion;
  sim: SimStats;
  intro: boolean;
  panelDer: "universidad" | "entorno" | "ficha";
};

const initial: LabState = {
  basemap: "maqueta",
  vista: "3d",
  capas: {
    edificios: true, bloques: true, poblacion: false, estrato: false, arboles: false, poi: false,
    transporte: true, oficial: true, pot: false, espacio: false, equipamientos: false, agua: true, radios: false, rutas: false,
  },
  colorEdif: "campus",
  poiCats: {
    gastronomia: true, comercio: true, salud: true, educacion: true, finanzas: true,
    cultura: true, hospedaje: true, oficinas: true, recreacion: true, servicios: true,
  },
  escenario: "pico",
  // Punto de partida: Encuesta Origen-Destino AMVA 2023 (todos los motivos). EAFIT no publica su reparto propio.
  reparto: { ...REPARTO_EOD },
  corriendo: true,
  vel: 1,
  agentes: 600,
  seleccion: null,
  sim: { t: 0, enRuta: 0, llegados: 0, porModo: {} },
  intro: true,
  panelDer: "universidad",
};

let state: LabState = { ...initial };
const listeners = new Set<() => void>();

export const lab = {
  get: () => state,
  set: (patch: Partial<LabState>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  capa: (id: CapaId, v?: boolean) =>
    lab.set({ capas: { ...state.capas, [id]: v ?? !state.capas[id] } }),
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useLab(): LabState {
  return useSyncExternalStore(lab.subscribe, lab.get, lab.get);
}

/** Reparto ajustado para que siempre sume 100 al mover un deslizador. */
export function ajustarReparto(r: Record<Modo, number>, modo: Modo, valor: number): Record<Modo, number> {
  const otros = MODOS.map((m) => m.id).filter((m) => m !== modo);
  const resto = 100 - valor;
  const sumaOtros = otros.reduce((s, m) => s + r[m], 0);
  const out = { ...r, [modo]: valor } as Record<Modo, number>;
  let acum = 0;
  otros.forEach((m, i) => {
    const v = i === otros.length - 1 ? resto - acum : Math.round(sumaOtros ? (r[m] / sumaOtros) * resto : resto / otros.length);
    out[m] = Math.max(0, v);
    acum += out[m];
  });
  return out;
}
