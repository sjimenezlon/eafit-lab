// Entorno en vivo alrededor de EAFIT con datos reales de SIATA.
// Combina tres feeds públicos del lado del servidor (evita CORS), filtra por radio
// alrededor del campus y entrega un GeoJSON único. Se cachea 10 min en el borde.
//
// Fuentes (verificadas 2026-10-26):
//  · Aire (PM2.5 + ICA): https://geoportal.siata.gov.co/fastgeoapi/geodata/geodataJson/1/pm25_minio
//  · Lluvia:  https://siata.gov.co/data/siata_app/Pluviometrica.json
//  · Nivel:   https://siata.gov.co/data/siata_app/Nivel.json

import { NextResponse } from "next/server";

export const revalidate = 600; // 10 min

const CENTRO = { lat: 6.2005, lon: -75.5783 };
const AIRE = "https://geoportal.siata.gov.co/fastgeoapi/geodata/geodataJson/1/pm25_minio";
const LLUVIA = "https://siata.gov.co/data/siata_app/Pluviometrica.json";
const NIVEL = "https://siata.gov.co/data/siata_app/Nivel.json";

const km = (lat: number, lon: number) =>
  Math.hypot((lat - CENTRO.lat) * 111, (lon - CENTRO.lon) * 111 * Math.cos((6.2 * Math.PI) / 180));

// Categoría del Índice de Calidad del Aire (escala oficial SIATA/EPA).
function catICA(ica: number): string {
  if (ica <= 50) return "Buena";
  if (ica <= 100) return "Moderada";
  if (ica <= 150) return "Dañina a grupos sensibles";
  if (ica <= 200) return "Dañina a la salud";
  if (ica <= 300) return "Muy dañina";
  return "Peligrosa";
}

const traer = (u: string) =>
  fetch(u, { next: { revalidate }, headers: { "User-Agent": "EafitLab/1.0 (gemelo territorial)" } })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

export async function GET(req: Request) {
  const radio = Math.min(25, Math.max(1, Number(new URL(req.url).searchParams.get("km")) || 7));
  const [aire, lluvia, nivel] = await Promise.all([traer(AIRE), traer(LLUVIA), traer(NIVEL)]);
  const feats: any[] = [];

  // --- Aire (GeoJSON de puntos con PM2.5 e ICA 24 h)
  if (aire?.features) {
    for (const f of aire.features) {
      const [lon, lat] = f.geometry?.coordinates || [];
      const p = f.properties || {};
      if (lat == null || km(lat, lon) > radio) continue;
      const ica = p.ICA_24H_prom;
      if (p.PM25_24H_prom == null || p.PM25_24H_prom < 0) continue;
      feats.push({
        type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] },
        properties: {
          tipo: "aire", nombre: (p.nombreEstacion || "").trim(), municipio: (p.Municipio || "").trim(),
          pm25: p.PM25_24H_prom, ica, cat: ica != null ? catICA(ica) : null,
          color: p.color || "#9aa0a6", corte: p.fechaFin, dist: +km(lat, lon).toFixed(1),
        },
      });
    }
  }

  // --- Lluvia (estaciones pluviométricas; valor en mm, -999 = sin dato)
  if (lluvia?.estaciones) {
    for (const e of lluvia.estaciones) {
      if (e.latitud == null || km(e.latitud, e.longitud) > radio) continue;
      const v = typeof e.valor === "number" && e.valor > -900 ? e.valor : null;
      if (v == null) continue;
      feats.push({
        type: "Feature", geometry: { type: "Point", coordinates: [e.longitud, e.latitud] },
        properties: { tipo: "lluvia", nombre: e.nombre, barrio: e.barrio, subcuenca: e.subcuenca,
          valor: v, dist: +km(e.latitud, e.longitud).toFixed(1) },
      });
    }
  }

  // --- Nivel de quebradas y río (valor = nivel reportado por SIATA)
  if (nivel?.estaciones) {
    for (const e of nivel.estaciones) {
      if (e.latitud == null || km(e.latitud, e.longitud) > radio) continue;
      const v = typeof e.valor === "number" && e.valor > -900 ? e.valor : null;
      if (v == null) continue;
      feats.push({
        type: "Feature", geometry: { type: "Point", coordinates: [e.longitud, e.latitud] },
        properties: { tipo: "nivel", nombre: e.nombre, barrio: e.barrio, subcuenca: e.subcuenca,
          valor: v, dist: +km(e.latitud, e.longitud).toFixed(1) },
      });
    }
  }

  const ok = aire || lluvia || nivel;
  return NextResponse.json(
    {
      type: "FeatureCollection",
      meta: {
        fuente: "SIATA — Sistema de Alerta Temprana de Medellín y el Valle de Aburrá",
        url: "https://siata.gov.co/", radio_km: radio, generado: new Date().toISOString(),
        n: feats.length, feeds: { aire: !!aire, lluvia: !!lluvia, nivel: !!nivel },
      },
      features: feats,
    },
    {
      status: ok ? 200 : 502,
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" },
    }
  );
}
