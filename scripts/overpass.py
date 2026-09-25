import json, requests, sys
LAT, LON, R = 6.2002, -75.5785, 1500
Q = f"""
[out:json][timeout:180];
(
  way(33784057); way(1311312323); way(1311312586);
  nwr(around:{R},{LAT},{LON})["amenity"];
  nwr(around:{R},{LAT},{LON})["shop"];
  nwr(around:{R},{LAT},{LON})["leisure"];
  nwr(around:{R},{LAT},{LON})["tourism"];
  nwr(around:{R},{LAT},{LON})["office"];
  nwr(around:{R},{LAT},{LON})["public_transport"];
  nwr(around:{R},{LAT},{LON})["railway"];
  nwr(around:{R},{LAT},{LON})["highway"="bus_stop"];
  way(around:{R},{LAT},{LON})["highway"];
  way(around:{R},{LAT},{LON})["waterway"];
  nwr(around:{R},{LAT},{LON})["natural"="tree"];
  way(around:{R},{LAT},{LON})["building"];
  relation(around:{R},{LAT},{LON})["route"~"subway|light_rail|bus|train"];
);
out body geom;
"""
r = requests.post((sys.argv[1] if len(sys.argv)>1 else "https://overpass.private.coffee/api/interpreter"), data={"data": Q}, headers={"User-Agent":"EafitLab/1.0"}, timeout=300)
r.raise_for_status()
open("crudo/osm.json","w").write(r.text)
d = r.json(); print(len(d["elements"]))
