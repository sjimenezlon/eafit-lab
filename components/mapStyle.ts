import type { StyleSpecification, LayerSpecification } from "maplibre-gl";
import ofm from "./ofm_dark.json";

// Centro del campus (OSM way 33784057) y vista inicial de la maqueta.
export const CENTRO: [number, number] = [-75.5785, 6.2002];
export const VISTA_3D = { center: [-75.5790, 6.1998] as [number, number], zoom: 16.25, pitch: 58, bearing: -30 };
export const VISTA_2D = { center: CENTRO, zoom: 14.6, pitch: 0, bearing: 0 };

/** Estilo inicial local: base vectorial OpenFreeMap (sin llave) + satélite Esri + terreno Terrarium.
 *  No se usa setStyle después: las bases se alternan con visibility. */
export function estiloBase(): StyleSpecification {
  const baseLayers = (ofm.layers as LayerSpecification[]).map((l) => ({
    ...l,
    metadata: { base: "maqueta" },
  })) as LayerSpecification[];
  return {
    version: 8,
    glyphs: ofm.glyphs,
    sources: {
      ofm: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
      sat: {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Imagen © Esri, Maxar, Earthstar Geographics",
      },
      terreno: {
        type: "raster-dem",
        tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
        tileSize: 256,
        encoding: "terrarium",
        maxzoom: 15,
        attribution: "Terreno © Mapzen / AWS Open Data",
      },
    },
    layers: [
      { id: "fondo", type: "background", paint: { "background-color": "#0b0c10" } },
      { id: "sat", type: "raster", source: "sat", layout: { visibility: "none" }, paint: { "raster-saturation": -0.25 } },
      {
        id: "sombra",
        type: "hillshade",
        source: "terreno",
        paint: {
          "hillshade-exaggeration": 0.25,
          "hillshade-shadow-color": "#000000",
          "hillshade-highlight-color": "#2a2e36",
        },
      },
      ...baseLayers.filter((l) => l.type !== "symbol"),
      // Las etiquetas vectoriales se mueven al final en EafitMap (encima de todo).
      ...baseLayers.filter((l) => l.type === "symbol").map((l) => ({ ...l, metadata: { base: "etiquetas" } })),
    ] as LayerSpecification[],
    terrain: { source: "terreno", exaggeration: 1.15 },
    sky: { "sky-color": "#0d0f14", "horizon-color": "#1a1e27", "fog-color": "#0d0f14", "fog-ground-blend": 0.6 } as any,
  };
}
