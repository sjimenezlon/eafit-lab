import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        zafre: "#000066",
        azure: "#00A9E0",
        gris: { claro: "#CFD1D2", medio: "#6D6E71", borde: "#E4E5E6" },
        noche: "#0d0f14",
      },
      fontFamily: { sans: ["Inter", "Arial", "system-ui", "sans-serif"], mono: ["'JetBrains Mono'", "ui-monospace", "monospace"] },
    },
  },
  plugins: [],
};
export default config;
