import json, math, time, requests, sys
LAT, LON, R = 6.2002, -75.5785, 1600
S = requests.Session(); S.headers["User-Agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36"
def caja():
    dlat = R/111320; dlon = R/(111320*math.cos(math.radians(LAT)))
    return (LON-dlon, LAT-dlat, LON+dlon, LAT+dlat)
def get(url, params):
    for i in range(6):
        try:
            r = S.get(url, params=params, timeout=120)
            if r.status_code == 200: return r
            print("status", r.status_code)
        except Exception as e: print(e)
        time.sleep(2*(i+1))
    raise RuntimeError(url)
def feats(capa, campos="*", pagina=1000, order="objectid"):
    w,s,e,n = caja(); out=[]; off=0
    while True:
        p = {"geometry":f"{w},{s},{e},{n}","geometryType":"esriGeometryEnvelope","inSR":4326,"outSR":4326,
             "spatialRel":"esriSpatialRelIntersects","outFields":campos,"resultOffset":off,"resultRecordCount":pagina,"f":"geojson"}
        if order: p["orderByFields"]=order
        lote = get(capa+"/query", p).json().get("features",[])
        if not lote: break
        out += lote; off += pagina; print(" ", len(out), end="\r")
    print()
    return out
capas = {
 "alturas": ("https://www.medellin.gov.co/servidormapas/rest/services/mapas_nacionales/VM_Cartografia_City_Urban_2025/MapServer/10","objectid,agl,amsl"),
 "catastro": ("https://www.medellin.gov.co/servidormapas/rest/services/ServiciosCatastro/ide_catastro/MapServer/7","objectid,cbml,numero_pisos,numero_sotanos,tipo_construccion"),
 "manzanas": ("https://geoportal.dane.gov.co/mparcgis/rest/services/MARCO_INTEGRADO/Serv_DatosCNPV2018_Integrados_MGN2018/MapServer/808","*"),
 "estrato": ("https://www.medellin.gov.co/servidormapas/rest/services/mapas_nacionales/VC_Distribucion_Poblacional/MapServer/0","*"),
 "arboles": ("https://www.medellin.gov.co/servidormapas/rest/services/mapas_nacionales/VC_Cobertura_Uso_suelo/MapServer/0","*"),
 "equipamientos": ("https://www.medellin.gov.co/servidormapas/rest/services/mapas_nacionales/VC_Infraestructura_Fisica/MapServer/1","*"),
 "espacio_publico": ("https://www.medellin.gov.co/servidormapas/rest/services/mapas_nacionales/VC_Infraestructura_Fisica/MapServer/2","*"),
 "pot": ("https://www.medellin.gov.co/servidormapas/rest/services/ordenamiento_ter/VM_22_Tratamientos_Urbanos/MapServer/0","*"),
}
for k in (sys.argv[1:] or capas):
    url, campos = capas[k]
    print(k)
    try:
        f = feats(url, campos, order=None if k=="manzanas" else "objectid")
        json.dump({"type":"FeatureCollection","features":f}, open(f"crudo/{k}.geojson","w"))
        print(k, len(f))
    except Exception as e: print("FALLO", k, e)
