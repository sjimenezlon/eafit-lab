// Bloque 20 · Edificio de Ciencias. Cada cifra con su fuente; consultado el 2-oct-2026.

export const F = {
  eafit2023: "https://www.eafit.edu.co/noticias/bloque-20-una-obra-que-le-da-vida-la-voluntad-eafitense-de-crear-y-aprender",
  eafit2018: "https://www.eafit.edu.co/noticias/la-universidad-comenzo-la-construccion-del-edificio-de-ciencias",
  poblado: "https://vivirenelpoblado.com/el-bloque-20-de-eafit-un-espacio-para-motivar-la-vocacion-cientifica/",
  semana: "https://www.semana.com/universidad-eafit-estrenara-su-edificio-de-ciencias-en-2020/633275/",
  mageba: "https://www.mageba-group.com/latam/en/1023/Latin%20America/Colombia/179358/Edificio-de-Ciencias-EAFIT.htm",
  sostenibilidad: "https://www.eafit.edu.co/sostenibilidad-ambiental/infraestructura",
  catastro: "https://www.medellin.gov.co/servidormapas/rest/services/ServiciosCatastro/ide_catastro/MapServer/7",
  cityurban: "https://www.medellin.gov.co/servidormapas/rest/services/mapas_nacionales/VM_Cartografia_City_Urban_2025/MapServer/10",
  osm: "https://www.openstreetmap.org/way/320921304",
  aci: "https://x.com/EAFIT/status/1815845362214789612",
  blacksmith: "https://blacksmith.com.co/edificio-escuela-de-ciencias-bloque-20-universidad-eafit/",
};

export const CIFRAS: { v: string; k: string; f: string }[] = [
  { v: "12.500 m²", k: "construidos", f: F.eafit2023 },
  { v: "42", k: "laboratorios", f: F.eafit2023 },
  { v: "950", k: "puestos de trabajo", f: F.eafit2023 },
  { v: "12", k: "aisladores sísmicos", f: F.mageba },
  { v: "−18 %", k: "energía", f: F.poblado },
  { v: "−67 %", k: "agua potable", f: F.poblado },
];

export const FICHA: { k: string; v: string; f?: string; nota?: string }[] = [
  { k: "Uso", v: "Escuela de Ciencias Aplicadas e Ingeniería", f: F.eafit2023 },
  { k: "Ubicación", v: "Corredor de Junín, entre el Bloque 19 y el edificio Argos", f: F.eafit2023 },
  { k: "Inauguración", v: "27 de septiembre de 2023", f: F.eafit2023 },
  { k: "Inicio de obra", v: "septiembre de 2018", f: F.eafit2018 },
  { k: "Concepto", v: "Arq. Emerson Marín", f: F.eafit2023 },
  { k: "Diseño arquitectónico", v: "Estudio Transversal Arquitectura", f: F.eafit2018 },
  { k: "Construcción", v: "Arquitectura y Concreto · Intervé", f: F.eafit2023 },
  { k: "Programa", v: "42 laboratorios · 8 talleres · 3 aulas activas", f: F.eafit2023 },
  { k: "Huella catastral", v: "1.643 m²", f: F.catastro, nota: "Catastro de Medellín, predio 14220250024" },
  { k: "Pisos", v: "8 sobre el terreno, sin sótanos", f: F.catastro, nota: "EAFIT habla de 10 pisos en 2023 y de 8 en 2018" },
  { k: "Aislamiento", v: "12 apoyos LASTO-LRB · 25.000 kN · ±200 mm", f: F.mageba },
  { k: "Residuos de obra reciclados", v: "75 %", f: F.poblado },
  { k: "Certificación", v: "LEED Oro, en proceso", f: F.sostenibilidad },
  { k: "Reconocimiento", v: "Premio a la Excelencia en la Construcción, ACI Sección Colombia (2024)", f: F.aci },
];

// Qué sale de un dato y qué es interpretación del modelo
export const MEDIDO: { k: string; v: string; tipo: "dato" | "estimado" | "ilustrativo" }[] = [
  { k: "Huella de 33 × 49 m", v: "Polígono del catastro de Medellín (1.643 m²); coincide con OpenStreetMap (1.680 m²).", tipo: "dato" },
  { k: "8 pisos, sin sótanos", v: "Catastro. 8 × 1.643 m² ≈ 13.100 m², en línea con los 12.500–13.600 m² que publica EAFIT.", tipo: "dato" },
  { k: "Tres anillos", v: "EAFIT (2018): laboratorios al centro, un pasillo que da la vuelta y oficinas, baños y salas por fuera.", tipo: "dato" },
  { k: "12 aisladores", v: "mageba suministró 12 apoyos de caucho con núcleo de plomo. Su posición exacta no es pública: aquí van en una retícula de 3 × 4.", tipo: "estimado" },
  { k: "Exoesqueleto en X y paneles en la cubierta", v: "Se leen en la foto aérea publicada en 2023. La modulación (4 × 6 vanos, cruces cada dos pisos) se ajustó a ojo.", tipo: "estimado" },
  { k: "Altura de 34 m (37 m con la pérgola)", v: "Primer piso de 4,6 m y siete de 4,2 m. City Urban 2025 registra 19–20 m, menos de lo que permiten ocho pisos de laboratorio: parece medido con la obra a medias.", tipo: "estimado" },
  { k: "Entorno en 250 m", v: "165 edificios con altura de City Urban 2025 y suelo de OpenStreetMap. De los 992 árboles, 84 son del inventario de la Alcaldía; las otras 908 copas se detectaron por color y textura en la ortofoto, con altura ilustrativa.", tipo: "estimado" },
  { k: "Personas", v: "Figuras a escala en la vista peatonal; no representan aforo.", tipo: "ilustrativo" },
  { k: "Lamas de fachada y tabiques interiores", v: "Ritmo y anchos ilustrativos; no hay planos públicos.", tipo: "ilustrativo" },
];
