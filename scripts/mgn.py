"""Geometría de las manzanas censales: el servicio CNPV 2018 del DANE no publica geometría,
así que se trae del MGN 2024 (capa 215) por código de manzana (COD_DANE_A = MANZ_CCNCT)."""
import json

import requests

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36"
URL = "https://geoportal.dane.gov.co/mparcgis/rest/services/MGN2024/Serv_CapasMGN_2024/FeatureServer/215/query"
codes = [x["properties"]["COD_DANE_A"] for x in json.load(open("crudo/manzanas.geojson"))["features"]]
out = []
for i in range(0, len(codes), 80):
    w = "MANZ_CCNCT IN (" + ",".join(f"'{c}'" for c in codes[i:i + 80]) + ")"
    r = requests.post(URL, data={"where": w, "outFields": "MANZ_CCNCT", "returnGeometry": "true", "outSR": 4326, "f": "geojson"},
                      headers={"User-Agent": UA}, timeout=120)
    out += r.json().get("features", [])
print(len(out), "de", len(codes))
json.dump({"type": "FeatureCollection", "features": out}, open("crudo/mgn_manzanas.geojson", "w"))
