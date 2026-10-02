"use client";
import Script from "next/script";
import { createElement } from "react";

// <model-viewer> de Google: orbita el GLB exportado desde Blender (compresión Draco).
export default function Visor3D() {
  return (
    <>
      <Script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js" strategy="afterInteractive" />
      {createElement("model-viewer", {
        src: "/bloque20/bloque20.glb",
        alt: "Modelo 3D del Bloque 20 de EAFIT con su exoesqueleto, fachada, cubierta solar y aisladores sísmicos",
        "camera-controls": true,
        "auto-rotate": true,
        "auto-rotate-delay": 1500,
        "rotation-per-second": "18deg",
        "camera-orbit": "35deg 68deg 115m",
        "min-camera-orbit": "auto auto 45m",
        "max-camera-orbit": "auto 95deg 220m",
        "shadow-intensity": "1",
        exposure: "1.05",
        "environment-image": "neutral",
        "interaction-prompt": "none",
        poster: "/bloque20/giro.jpg",
        style: { width: "100%", height: "100%", background: "transparent", "--poster-color": "transparent" },
      })}
    </>
  );
}
