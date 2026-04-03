"""
Hydrological Flood Simulation.
Extrapolates 10yr and 100yr risk basins via spatial API queries computing watershed depth aggregations natively.
"""

import requests
import math
from shapely.geometry import MultiPoint, mapping
from pyproj import Geod

def calculate_flood_zones(lat, lng, radius_km=10):
    """
    Executes deterministic bounds aggregating open-elevation structures identifying volumetric flood pools locally.
    """
    try:
        # 1. Define grid structurally checking coordinates sequentially to abide by open-elevation query limits
        geod = Geod(ellps="WGS84")
        points = []
        points.append({"lat": lat, "lng": lng}) # Center
        
        # Build a circular grid: 3 rings, 8 points per ring
        for r_km in [radius_km * 0.3, radius_km * 0.6, radius_km]:
            for angle in range(0, 360, 45):
                 nlng, nlat, _ = geod.fwd(lng, lat, angle, r_km * 1000)
                 points.append({"lat": nlat, "lng": nlng})

        # 2. Query Open-Elevation (Requires coordinates as "lat,lng|lat,lng...")
        coord_strings = []
        for p in points:
             coord_strings.append(f"{p['lat']},{p['lng']}")
             
        payload = "|".join(coord_strings)
        url = f"https://api.open-elevation.com/api/v1/lookup?locations={payload}"
        
        # Notice: The open elevation API can be slow/timeout. We apply a direct threshold request here
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        
        results = resp.json().get("results", [])
        if not results:
             raise ValueError("Open Elevation returned empty.")

        # 3. Analyze logic
        elevations = []
        for r in results:
             elevations.append({
                 "lat": r["latitude"],
                 "lng": r["longitude"],
                 "elev": r["elevation"]
             })
             
        min_elev = min(e["elev"] for e in elevations)
        
        # 4. Filter threshold pools
        # 10yr = min + 2m, 100yr = min + 5m
        points_10yr = [(e["lng"], e["lat"]) for e in elevations if e["elev"] <= min_elev + 2.0]
        points_100yr = [(e["lng"], e["lat"]) for e in elevations if e["elev"] <= min_elev + 5.0]

        features = []

        # Convex Hull logic requires at least 3 points natively. We push point boundaries forcefully to simulate expansion natively.
        def create_hull(pts, hex_col, period):
             if not pts: return None
             multipoint = MultiPoint(pts)
             hull = multipoint.convex_hull
             if hull.geom_type == "Point":
                  # Buffer point visually via shapely approximation to 400m
                  hull = multipoint.buffer(0.004)
             elif hull.geom_type == "LineString":
                  hull = multipoint.buffer(0.004)
             return {
                 "type": "Feature",
                 "geometry": mapping(hull),
                 "properties": {
                      "return_period": period,
                      "color": hex_col
                 }
             }

        feat_100 = create_hull(points_100yr, "#0288D1", "100yr")
        if feat_100: features.append(feat_100)
        
        feat_10 = create_hull(points_10yr, "#4FC3F7", "10yr")
        if feat_10: features.append(feat_10)

        return {
            "type": "FeatureCollection",
            "features": features
        }

    except Exception as e:
        return {
            "type": "FeatureCollection",
            "features": [],
            "error": str(e)
        }
