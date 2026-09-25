// Cifras institucionales de EAFIT. Consultadas el 25-sep-2026.
// Fuente principal: Informe de Sostenibilidad EAFIT 2025 (PDF publicado en 2026).
// El detalle con página y nota de cada cifra está en data/eafit_cifras.json.

export const INFORME_2025 =
  "https://universidadeafit.widen.net/content/uf7bnmzwqu/original/informe-sostenibildad-2025.pdf";
export const MAPA_OFICIAL = "https://umap.openstreetmap.de/en/map/universidad-eafit-campus-medellin_67039";

export type Cifra = { k: string; v: string; nota?: string; fuente?: string };
export type Grupo = { titulo: string; cifras: Cifra[] };

export const INSTITUCION = {
  nombre: "Universidad EAFIT",
  fundacion: "4 de mayo de 1960",
  rectora: "Claudia Restrepo Montoya (periodo 2026–2030)",
  naturaleza: "Privada, sin ánimo de lucro, con carácter de fundación",
  acreditacion: "Alta calidad por 10 años: Resolución 016360 del 23-jun-2026, vigente hasta 2036 (cuarta acreditación)",
  escuelas: [
    "Administración",
    "Ciencias Aplicadas e Ingeniería",
    "Artes y Humanidades",
    "Derecho",
    "Finanzas, Economía y Gobierno",
  ],
  sedes: ["Medellín (Cra. 49 # 7 Sur-50)", "Llanogrande", "Bogotá", "Pereira"],
};

export const KPIS: Cifra[] = [
  { k: "Estudiantes de pregrado", v: "9.831", nota: "2025-1 (9.639 en 2025-2)", fuente: INFORME_2025 },
  { k: "Estudiantes de posgrado", v: "3.181", nota: "2025-1 (3.123 en 2025-2)", fuente: INFORME_2025 },
  { k: "Profesores", v: "2.363", nota: "350 de planta; 76 % de ellos con doctorado", fuente: INFORME_2025 },
  { k: "Graduados", v: "70.383", nota: "acumulado a dic-2025", fuente: INFORME_2025 },
];

export const GRUPOS: Grupo[] = [
  {
    titulo: "Comunidad",
    cifras: [
      { k: "Colaboradores administrativos", v: "1.486", fuente: INFORME_2025 },
      { k: "Pregrado de Medellín y el Área Metropolitana", v: "63,9 %", nota: "26,9 % del resto del país; 3,7 % de otros países", fuente: INFORME_2025 },
      { k: "Personas en todos los ciclos (incluye educación continua)", v: "+65.000", fuente: INFORME_2025 },
    ],
  },
  {
    titulo: "Oferta académica",
    cifras: [
      { k: "Pregrados", v: "27", fuente: INFORME_2025 },
      { k: "Especializaciones", v: "48", fuente: INFORME_2025 },
      { k: "Maestrías", v: "62", fuente: INFORME_2025 },
      { k: "Doctorados", v: "7", fuente: INFORME_2025 },
      { k: "Programas acreditados", v: "33", nota: "20 pregrados, 11 maestrías, 2 doctorados", fuente: INFORME_2025 },
      { k: "Programas de educación continua", v: "854", fuente: INFORME_2025 },
    ],
  },
  {
    titulo: "Investigación e innovación",
    cifras: [
      { k: "Grupos reconocidos por MinCiencias", v: "29", nota: "69 % en A1 y 17 % en A (Convocatoria 957)", fuente: INFORME_2025 },
      { k: "Publicaciones en Scopus (2025)", v: "334", nota: "200 en Q1", fuente: INFORME_2025 },
      { k: "Patentes", v: "74", nota: "acumulado", fuente: INFORME_2025 },
      { k: "Spin-offs", v: "8", nota: "acumulado", fuente: INFORME_2025 },
      { k: "Semilleros / semilleristas", v: "82 / 1.121", fuente: INFORME_2025 },
      { k: "Proyectos de CTeI gestionados", v: "378", fuente: INFORME_2025 },
      { k: "QS World University Rankings 2026", v: "951–1000", nota: "5.ª de Colombia", fuente: INFORME_2025 },
      { k: "QS América Latina y el Caribe 2026", v: "57", nota: "7.ª de Colombia", fuente: INFORME_2025 },
    ],
  },
  {
    titulo: "Campus Medellín",
    cifras: [
      { k: "Área total", v: "126.058 m²", nota: "campus principal + Los Guayabos", fuente: INFORME_2025 },
      { k: "Área construida", v: "96.261 m²", fuente: INFORME_2025 },
      { k: "Zonas verdes", v: "48.346 m²", fuente: INFORME_2025 },
      { k: "Espacios deportivos", v: "15.849 m²", fuente: INFORME_2025 },
      { k: "Aulas · laboratorios · auditorios", v: "200 · 61 · 7", fuente: INFORME_2025 },
      { k: "Porterías", v: "10", nota: "6 peatonales y bici, 4 vehiculares", fuente: MAPA_OFICIAL },
      { k: "Auditorio Fundadores", v: "630 personas", nota: "inaugurado en 1987 (El Colombiano, may-2026)", fuente: "https://www.elcolombiano.com/cultura/auditorio-fundadores-eafit-orquesta-sinfonica-LN37090" },
      { k: "Biblioteca Luis Echavarría Villegas", v: "481.780 ejemplares", nota: "6.232 m²; 795.392 títulos digitales", fuente: INFORME_2025 },
    ],
  },
  {
    titulo: "Movilidad del campus",
    cifras: [
      { k: "Celdas para carros", v: "1.042", fuente: INFORME_2025 },
      { k: "Celdas para motos", v: "459", fuente: INFORME_2025 },
      { k: "Cicloparqueaderos", v: "448", fuente: INFORME_2025 },
      { k: "Carros que ingresan al día (promedio)", v: "2.645", fuente: INFORME_2025 },
      { k: "Motos que ingresan al día (promedio)", v: "899", fuente: INFORME_2025 },
    ],
  },
  {
    titulo: "Naturaleza y ambiente",
    cifras: [
      { k: "Especies de árboles y palmas", v: "139", nota: "1.568 individuos inventariados", fuente: "https://www.eafit.edu.co/sostenibilidad-ambiental/vegetacion-y-fauna" },
      { k: "Especies de aves", v: "74", nota: "13 migratorias", fuente: "https://www.eafit.edu.co/sostenibilidad-ambiental/vegetacion-y-fauna" },
      { k: "Energía eléctrica consumida (2025)", v: "7,64 GWh", nota: "411 MWh de generación solar propia", fuente: INFORME_2025 },
      { k: "Agua de EPM (2025)", v: "134.342 m³", fuente: INFORME_2025 },
      { k: "Emisiones (2025)", v: "16.629 t CO₂e", fuente: INFORME_2025 },
    ],
  },
  {
    titulo: "Finanzas",
    cifras: [
      { k: "Ingresos operacionales 2025", v: "$518.241 millones", fuente: INFORME_2025 },
      { k: "Excedente 2025", v: "$8.027 millones", fuente: INFORME_2025 },
    ],
  },
];

/** Usos de bloques verificados en fuentes públicas (la lista oficial completa no es pública). */
export const BLOQUES_USO: Record<string, { uso: string; fuente: string; confirmado: boolean }> = {
  "18": { uso: "Rectoría, Centro de Cómputo y alta dirección", fuente: "Audioguías del campus, eafit.edu.co", confirmado: true },
  "19": { uso: "Edificio de Ingenierías; una de las primeras construcciones sostenibles del campus (2010)", fuente: "eafit.edu.co · sostenibilidad", confirmado: true },
  "20": { uso: "Ciencia y tecnología, Escuela de Ciencias Aplicadas e Ingeniería (entregado en 2023)", fuente: "eafit.edu.co · noticias", confirmado: true },
  "26": { uso: "Escuela de Administración", fuente: "Pie de foto en Wikipedia", confirmado: false },
  "29": { uso: "Administrativo: Registro Académico (piso 1)", fuente: "eafit.edu.co · espacios", confirmado: true },
  "32": { uso: "Centro Cultural Biblioteca Luis Echavarría Villegas", fuente: "Fuentes secundarias", confirmado: false },
  "33": { uso: "Servicios de tecnología", fuente: "Página antigua de eafit.edu.co", confirmado: false },
  "36": { uso: "Cafetería norte: El Tejadito, Juan Valdez, Recanto, Pimientos", fuente: "Mapa oficial (uMap)", confirmado: true },
  "38": { uso: "Construido para Ciencias y Humanidades; dos auditorios de 160 puestos (2004)", fuente: "El Tiempo, 29-jul-2004", confirmado: true },
};

export const ENTORNO_OFICIAL: Cifra[] = [
  { k: "Población de la comuna 14 · El Poblado (2026)", v: "116.445", nota: "proyección DANE, actualización jul-2025", fuente: "https://www.medellin.gov.co/es/centro-documental/proyecciones-poblacion-viviendas-y-hogares/" },
  { k: "Viviendas de estrato 6 en la comuna 14", v: "73,5 %", nota: "Encuesta de Calidad de Vida 2019", fuente: "https://www.medellin.gov.co/irj/go/km/docs/pccdesign/medellin/Temas/PlaneacionMunicipal/Publicaciones/Shared%20Content/Documentos/2021/Comuna%2014%20El%20Poblado-Ficha%20Informativa.pdf" },
  { k: "Distancia de la estación Aguacatala a la portería 4", v: "≈ 480 m", nota: "en línea recta", fuente: "GTFS Metro 2025 + mapa oficial" },
];
