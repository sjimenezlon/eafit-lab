# Eafit-Lab

Maqueta territorial 3D de la **Universidad EAFIT** (sede Medellín) y de 1,5 km a su alrededor: bloques con altura medida,
cifras oficiales de la universidad, población, estratos, arbolado, POT, transporte y una simulación de llegada al campus
por las 10 porterías oficiales. Inspirada en la maqueta del CCU de CSLab GDL (ciudadudg.cslabgdl.com).

Next.js 14 + MapLibre GL (terreno Terrarium, base vectorial OpenFreeMap sin llave, satélite Esri). Sin clave: todos los datos son públicos.

## Capas y fuentes

| Capa | Fuente | Corte |
|---|---|---|
| Cifras institucionales | EAFIT, Informe de Sostenibilidad 2025 (detalle con página en `data/eafit_cifras.json`) | 2025 |
| Porterías, parqueaderos, deporte, comidas | Mapa oficial del campus (uMap 67039) | vigente |
| Alturas de 11.468 edificios | Alcaldía de Medellín, Cartografía City Urban 2025 (AGL) | 2025 |
| Pisos | Catastro de Medellín, huella de construcción | vigente |
| Población por manzana | DANE CNPV 2018 (geometría MGN 2024) | 2018 |
| Estrato, arbolado (SAU), equipamientos, espacio público, POT | Servidor de mapas de Medellín (CC BY-SA 4.0) | sep-2026 |
| Bloques, lugares, vías, paraderos, Metro, rutas de bus | OpenStreetMap | 25-sep-2026 |
| EnCicla | CityBikes API | 25-sep-2026 |
| Reparto modal de referencia | Encuesta Origen-Destino AMVA 2023 | 2023 |

Límites: EAFIT no publica la lista completa de bloques ni su reparto modal propio; la población es del último censo (2018).

## Regenerar los datos

```bash
cd scripts
python3 overpass.py          # OSM → crudo/osm.json
python3 arcgis.py            # Medellín + DANE → crudo/*.geojson
python3 mgn.py               # geometría de manzanas (MGN 2024) por código DANE
# además: crudo/encicla.json (CityBikes), crudo/umap_*.json (mapa oficial EAFIT)
python3 build.py             # → public/data/*.geojson, rutas.json, resumen.json
```
Requiere `requests`, `shapely`, `pyproj`, `networkx`. Los crudos no van al repositorio.

## Desarrollo

```bash
npm install && npm run dev
```
`?intro=0` abre directo en la maqueta. `qa/cdp.mjs` toma capturas con Chrome sin cabeza y mide el lienzo
(`node --experimental-websocket qa/cdp.mjs URL 1440 900 salida.png 20`).
