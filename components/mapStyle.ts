import type { StyleSpecification, LayerSpecification } from "maplibre-gl";
import ofm from "./ofm_dark.json";

// Centro del campus (OSM way 33784057) y vista inicial de la maqueta.
export const CENTRO: [number, number] = [-75.5785, 6.2002];
export const VISTA_3D = { center: [-75.5787, 6.20005] as [number, number], zoom: 16.45, pitch: 60, bearing: -24 };
export const VISTA_2D = { center: CENTRO, zoom: 14.6, pitch: 0, bearing: 0 };

/** Estilo inicial local: base vectorial OpenFreeMap (sin llave) + satélite Esri + terreno Terrarium.
 *  No se usa setStyle después: las bases se alternan con visibility.
 *  El oscuro de OpenFreeMap deja calles y parques casi del color del fondo: se retocan. */
const RETOQUE: Record<string, Record<string, unknown>> = {
  landcover_wood: { "fill-color": "#1c3a2e", "fill-opacity": 0.9 },
  landuse_park: { "fill-color": "#1c3a2e", "fill-opacity": 1 },
  landuse_residential: { "fill-color": "#171a21", "fill-opacity": 0.85 },
  water: { "fill-color": "#16384c" },
  waterway: { "line-color": "#2a6d88" },
  highway_path: { "line-color": "#3c4658" },
  highway_minor: { "line-color": "#556278" },
  highway_major_casing: { "line-color": "#9aa6b8" },
  highway_major_inner: { "line-color": "#667488" },
  highway_major_subtle: { "line-color": "#556278" },
  highway_motorway_casing: { "line-color": "#9aa6b8" },
  highway_motorway_inner: { "line-color": "#738298" },
  highway_motorway_subtle: { "line-color": "#556278" },
  highway_name_other: { "text-color": "rgba(226,230,236,0.9)", "text-halo-color": "rgba(10,12,16,0.92)" },
  highway_name_motorway: { "text-color": "rgba(226,230,236,0.9)" },
};

export function estiloBase(): StyleSpecification {
  const baseLayers = (ofm.layers as LayerSpecification[]).map((l) => {
    const paint = { ...(l.paint as object) } as Record<string, unknown>;
    if (l.id === "landcover_wood") delete paint["fill-pattern"];
    // Los nombres de calle solo aparecen al acercarse: en la vista inicial compiten con los bloques.
    const minzoom = l.id === "highway_name_other" ? 16.85 : l.id === "highway_name_motorway" ? 14.5 : l.minzoom;
    return {
      ...l,
      ...(minzoom != null ? { minzoom } : {}),
      paint: { ...paint, ...(RETOQUE[l.id] || {}) },
      metadata: { base: "maqueta" },
    };
  }) as LayerSpecification[];
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
      { id: "fondo", type: "background", paint: { "background-color": "#12151c" } },
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
    // Luz fija al encuadre, un poco baja, para que las caras de la extrusión se lean.
    light: { anchor: "viewport", color: "#fff6ea", intensity: 0.52, position: [1.3, 205, 38] } as any,
    sky: { "sky-color": "#12151c", "horizon-color": "#314056", "fog-color": "#12151c", "fog-ground-blend": 0.55, "sky-horizon-blend": 0.7 } as any,
  };
}
