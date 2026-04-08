"""
EcoSense AI — Hydrology Client.

Retrieves real water body data near a project site using the OpenStreetMap
Overpass API (free, no API key required).

Returns:
  - Nearby rivers, lakes, wetlands, dams, springs with coordinates
  - GeoJSON FeatureCollection for map rendering
  - Proximity classification for sensitivity scoring
  - Distance to nearest water body
"""

import logging
import math

import requests
from .utils import retry_api_call

logger = logging.getLogger(__name__)


class HydrologyClient:
    """
    Client for fetching hydrological features from OpenStreetMap via Overpass API.
    """

    def __init__(self):
        self.overpass_url = "https://overpass-api.de/api/interpreter"

    @retry_api_call(max_retries=3, delay=3)
    def get_data(self, lat: float, lng: float, radius_km: int = 10) -> dict:
        """
        Fetch water bodies and hydrological features around a coordinate.
        Returns structured data + GeoJSON for map rendering.
        """
        radius_m = radius_km * 1000

        # Overpass QL query for water features
        query = f"""
        [out:json][timeout:30];
        (
          // Rivers and streams
          way["waterway"~"river|stream|canal|drain|ditch"](around:{radius_m},{lat},{lng});
          relation["waterway"~"river|stream"](around:{radius_m},{lat},{lng});
          // Lakes and reservoirs
          way["natural"="water"](around:{radius_m},{lat},{lng});
          relation["natural"="water"](around:{radius_m},{lat},{lng});
          way["water"~"lake|reservoir|pond|basin"](around:{radius_m},{lat},{lng});
          // Wetlands
          way["natural"="wetland"](around:{radius_m},{lat},{lng});
          relation["natural"="wetland"](around:{radius_m},{lat},{lng});
          // Dams
          way["waterway"="dam"](around:{radius_m},{lat},{lng});
          node["waterway"="dam"](around:{radius_m},{lat},{lng});
          // Springs / boreholes
          node["natural"="spring"](around:{radius_m},{lat},{lng});
          node["man_made"="water_well"](around:{radius_m},{lat},{lng});
        );
        out body geom;
        """

        resp = requests.post(self.overpass_url, data={"data": query}, timeout=45)
        resp.raise_for_status()
        elements = resp.json().get("elements", [])

        # Process elements into structured data
        water_bodies = []
        geojson_features = []
        nearest_distance_km = float("inf")
        nearest_type = "none"

        # Category counters
        category_counts = {
            "river": 0,
            "stream": 0,
            "lake": 0,
            "wetland": 0,
            "dam": 0,
            "spring": 0,
            "canal": 0,
            "pond": 0,
            "other": 0,
        }

        for el in elements:
            tags = el.get("tags", {})
            el_type = el.get("type")

            # Determine water body category
            category = self._classify_water_body(tags)
            name = tags.get("name", f"Unnamed {category}")

            # Count categories
            cat_key = category.lower()
            if cat_key in category_counts:
                category_counts[cat_key] += 1
            else:
                category_counts["other"] += 1

            # Calculate centroid and distance
            centroid = self._get_centroid(el)
            if centroid:
                dist = self._haversine(lat, lng, centroid[1], centroid[0])
                if dist < nearest_distance_km:
                    nearest_distance_km = dist
                    nearest_type = category.lower()

                water_bodies.append({
                    "name": name,
                    "type": category,
                    "distance_km": round(dist, 2),
                    "tags": {k: v for k, v in tags.items() if k in [
                        "name", "waterway", "natural", "water", "intermittent",
                        "seasonal", "width", "depth",
                    ]},
                })

            # Build GeoJSON feature
            feature = self._element_to_geojson(el, category, name)
            if feature:
                geojson_features.append(feature)

        # Determine proximity classification for scoring
        if nearest_distance_km <= 0.5:
            proximity = "wetland" if nearest_type == "wetland" else "river"
        elif nearest_distance_km <= 2.0:
            proximity = "river"
        elif nearest_distance_km <= 5.0:
            proximity = "moderate"
        else:
            proximity = "none"

        # Sort water bodies by distance
        water_bodies.sort(key=lambda x: x["distance_km"])

        return {
            "proximity": proximity,
            "nearest_water_body": water_bodies[0] if water_bodies else None,
            "nearest_distance_km": round(nearest_distance_km, 2) if nearest_distance_km < float("inf") else None,
            "total_water_bodies": len(water_bodies),
            "water_bodies": water_bodies[:20],  # Cap at 20 for response size
            "category_counts": {k: v for k, v in category_counts.items() if v > 0},
            "features": {
                "type": "FeatureCollection",
                "features": geojson_features,
            },
            "source": "OpenStreetMap Overpass API",
        }

    def _classify_water_body(self, tags: dict) -> str:
        """Classify a water body based on OSM tags."""
        waterway = tags.get("waterway", "")
        natural = tags.get("natural", "")
        water = tags.get("water", "")

        if waterway == "river":
            return "River"
        elif waterway == "stream":
            return "Stream"
        elif waterway == "canal":
            return "Canal"
        elif waterway in ("drain", "ditch"):
            return "Drain"
        elif waterway == "dam":
            return "Dam"
        elif natural == "wetland":
            return "Wetland"
        elif natural == "spring":
            return "Spring"
        elif natural == "water" or water:
            if water in ("lake", ""):
                return "Lake"
            elif water == "reservoir":
                return "Reservoir"
            elif water == "pond":
                return "Pond"
            return "Water Body"
        elif tags.get("man_made") == "water_well":
            return "Borehole"
        return "Water Feature"

    def _get_centroid(self, element: dict) -> list | None:
        """Get centroid [lng, lat] from an OSM element."""
        el_type = element.get("type")

        if el_type == "node":
            lat = element.get("lat")
            lon = element.get("lon")
            if lat is not None and lon is not None:
                return [lon, lat]

        elif el_type == "way":
            geometry = element.get("geometry", [])
            if geometry:
                lats = [p["lat"] for p in geometry if "lat" in p]
                lons = [p["lon"] for p in geometry if "lon" in p]
                if lats and lons:
                    return [sum(lons) / len(lons), sum(lats) / len(lats)]

        elif el_type == "relation":
            members = element.get("members", [])
            all_lats, all_lons = [], []
            for member in members:
                geom = member.get("geometry", [])
                for p in geom:
                    if "lat" in p and "lon" in p:
                        all_lats.append(p["lat"])
                        all_lons.append(p["lon"])
            if all_lats and all_lons:
                return [sum(all_lons) / len(all_lons), sum(all_lats) / len(all_lats)]

        return None

    def _element_to_geojson(self, element: dict, category: str, name: str) -> dict | None:
        """Convert an OSM element to a GeoJSON Feature."""
        el_type = element.get("type")

        if el_type == "node":
            lat = element.get("lat")
            lon = element.get("lon")
            if lat is not None and lon is not None:
                return {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [lon, lat]},
                    "properties": {"name": name, "category": category},
                }

        elif el_type == "way":
            geometry = element.get("geometry", [])
            coordinates = [[p["lon"], p["lat"]] for p in geometry if "lat" in p and "lon" in p]
            if len(coordinates) < 2:
                return None

            # Check if it's a closed polygon (area) or line
            is_closed = (
                len(coordinates) >= 4 and
                coordinates[0][0] == coordinates[-1][0] and
                coordinates[0][1] == coordinates[-1][1]
            )

            if is_closed:
                return {
                    "type": "Feature",
                    "geometry": {"type": "Polygon", "coordinates": [coordinates]},
                    "properties": {"name": name, "category": category},
                }
            else:
                return {
                    "type": "Feature",
                    "geometry": {"type": "LineString", "coordinates": coordinates},
                    "properties": {"name": name, "category": category},
                }

        elif el_type == "relation":
            # Simplify relation to its outer members as LineStrings
            members = element.get("members", [])
            for member in members:
                if member.get("role") == "outer" or member.get("type") == "way":
                    geom = member.get("geometry", [])
                    coordinates = [[p["lon"], p["lat"]] for p in geom if "lat" in p and "lon" in p]
                    if len(coordinates) >= 2:
                        is_closed = (
                            len(coordinates) >= 4 and
                            coordinates[0][0] == coordinates[-1][0] and
                            coordinates[0][1] == coordinates[-1][1]
                        )
                        return {
                            "type": "Feature",
                            "geometry": {
                                "type": "Polygon" if is_closed else "LineString",
                                "coordinates": [coordinates] if is_closed else coordinates,
                            },
                            "properties": {"name": name, "category": category},
                        }

        return None

    @staticmethod
    def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate the great circle distance in km between two points."""
        R = 6371  # Earth's radius in km
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (
            math.sin(d_lat / 2) ** 2 +
            math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
            math.sin(d_lon / 2) ** 2
        )
        c = 2 * math.asin(math.sqrt(a))
        return R * c
