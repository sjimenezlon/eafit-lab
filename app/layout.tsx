import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Eafit-Lab",
  description:
    "Maqueta territorial 3D de la Universidad EAFIT y su entorno en El Poblado (Medellín): bloques con altura medida, cifras oficiales, población, estratos, arbolado, transporte y simulación de llegada al campus.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
        <link rel="icon" href="/img/favicon.svg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
