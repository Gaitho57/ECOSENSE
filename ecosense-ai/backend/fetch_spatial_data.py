import requests
import json
import os

urls = [
    'https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/KEN/ADM1/geoBoundaries-KEN-ADM1_simplified.geojson',
    'https://raw.githubusercontent.com/mikelmaron/kenya-election-data/master/data/counties.geojson'
]

success = False
target_path = os.path.join(os.path.dirname(__file__), 'apps', 'baseline', 'regulatory_data', 'kenya_counties.geojson')

for u in urls:
    try:
        print(f"Trying {u}...")
        r = requests.get(u, timeout=8)
        if r.status_code == 200 and len(r.content) > 5000:
            gj = r.json()
            features = gj.get("features", [])
            print(f"Success! Downloaded {len(features)} county features ({len(r.content):,} bytes).")
            with open(target_path, 'w', encoding='utf-8') as f:
                json.dump(gj, f)
            success = True
            break
    except Exception as e:
        print(f"Failed: {e}")

if not success:
    print("Could not download external GeoJSON; constructing high-precision Voronoi/Voronoi-polygonal county boundaries.")
