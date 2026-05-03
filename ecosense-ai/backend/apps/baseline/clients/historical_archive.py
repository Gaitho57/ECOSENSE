import json
import os
import logging

logger = logging.getLogger(__name__)

class HistoricalArchiveClient:
    def __init__(self):
        self.project_data = []
        self.county_data = {}
        base_dir = os.path.dirname(os.path.abspath(__file__))
        proj_path = os.path.join(os.path.dirname(base_dir), "knowledge_base", "historical_eias.json")
        county_path = os.path.join(os.path.dirname(base_dir), "regulatory_data", "kenya_county_matrix.json")
        
        try:
            if os.path.exists(proj_path):
                with open(proj_path, "r", encoding="utf-8") as f:
                    self.project_data = json.load(f)
            if os.path.exists(county_path):
                with open(county_path, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)
                    self.county_data = raw_data.get("counties", {})
        except Exception as e:
            logger.error(f"Failed to load National Knowledge Matrix: {e}")

    def detect_nearest_county(self, lat, lng):
        """
        Dynamically finds the nearest county authority based on spatial proximity.
        """
        nearest_county = "Kenya"
        min_dist = float('inf')
        
        for name, meta in self.county_data.items():
            dist = ((lat - meta['lat'])**2 + (lng - meta['lng'])**2)**0.5
            if dist < min_dist:
                min_dist = dist
                nearest_county = name
        
        return nearest_county, min_dist

    def get_nearby_baseline(self, lat, lng, county_name=None):
        """
        Hierarchical Query: 
        1. Search Project-level (2km radius approximation)
        2. Dynamic Nearest-Neighbor County Search
        """
        # Tier 1: Project Level (Past EIA Reports)
        for entry in self.project_data:
            b = entry.get("bounds", {})
            if b.get("lat_min", -90) <= lat <= b.get("lat_max", 90) and b.get("lng_min", -180) <= lng <= b.get("lng_max", 180):
                return entry, "Project Archive"

        # Tier 2: Dynamic County Search
        if not county_name:
            county_name, dist = self.detect_nearest_county(lat, lng)
            # Only consider "Captured" if within a reasonable distance (e.g. 2 degrees)
            if dist > 2.0:
                return None, None

        if county_name in self.county_data:
            c = self.county_data[county_name]
            return {
                "region": f"County Baseline ({county_name})",
                "historical_elevation_m": c["elevation"],
                "soil_type": c["soil"],
                "groundwater_depth_m": c.get("groundwater", 50),
                "local_flora": c.get("flora", ["Acacia", "Indigenous Shrubs"]),
                "source": f"National Environmental Matrix - {county_name} Profile"
            }, "County Matrix"
        
        return None, None

    def apply_fallbacks(self, baseline_data, lat, lng, county_name=None):
        """
        Automatically applies hierarchical overrides across all of Kenya.
        """
        historical, tier = self.get_nearby_baseline(lat, lng, county_name)
        if not historical:
            return baseline_data

        # 1. Elevation Hallucination Correction (Clamped to County Norms)
        current_elevation = baseline_data.get("topography", {}).get("elevation_m", 0)
        if current_elevation < 10 or current_elevation > 6000: # Hallucination bounds
            logger.info(f"Applying {tier} Elevation Override for {county_name}.")
            if "topography" not in baseline_data: baseline_data["topography"] = {}
            baseline_data["topography"]["elevation_m"] = historical["historical_elevation_m"]
            baseline_data["topography"]["methodology"] = f"National RAG Fallback ({historical['source']})"

        # 2. Soil Type Grounding (Always use historical if satellite 'Unknown')
        if not baseline_data.get("soil") or str(baseline_data.get("soil")).lower() == "unknown":
            logger.info(f"Applying {tier} Soil Data Grounding.")
            baseline_data["soil"] = {
                "classification": historical["soil_type"],
                "source": historical["source"]
            }

        # 3. Groundwater Context (Enrichment)
        if "hydrogeology" not in baseline_data or baseline_data["hydrogeology"] is None:
            baseline_data["hydrogeology"] = {}
        
        baseline_data["hydrogeology"].update({
            "historical_depth": historical["groundwater_depth_m"],
            "historical_source": historical["source"]
        })
        if "aquifer_type" not in baseline_data["hydrogeology"]:
            baseline_data["hydrogeology"]["aquifer_type"] = historical.get("aquifer_type", "Fractured Volcanic")
        
        # 4. Biodiversity Enrichement
        if "biodiversity" not in baseline_data:
            baseline_data["biodiversity"] = {
                "flora_examples": historical.get("local_flora", []),
                "source": historical["source"]
            }

        return baseline_data
