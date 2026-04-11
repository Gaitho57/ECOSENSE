"""
EcoSense AI — Synthetic Training Data.

Generates 60 realistic rows of base properties matching logic classifications.
Used to train XGBoost arrays.
"""
import random

# Core variables and constraints
PROJECT_TYPES = ["mining", "construction", "manufacturing", "agriculture", "infrastructure", "borehole"]
SEVERITY_LEVELS = ["low", "medium", "high", "critical"]

# Deterministic seed for reproducible data
random.seed(42)

def generate_sample_data():
    records = []
    
    for i in range(60):
        # Base environmental properties
        ptype = random.choice(PROJECT_TYPES)
        scale_ha = round(random.uniform(1.0, 5000.0), 2)
        ndvi = round(random.uniform(0.05, 0.95), 3)
        water_km = round(random.uniform(0.1, 50.0), 2)
        threat_cnt = random.randint(0, 25)
        aqi = random.randint(1, 5)
        urban_km = round(random.uniform(0.1, 80.0), 2)
        rain_mm = round(random.uniform(200.0, 3000.0), 2)

        record = {
            "project_type": ptype,
            "scale_ha": scale_ha,
            "ndvi_score": ndvi,
            "distance_to_water_km": water_km,
            "threatened_species_count": threat_cnt,
            "aqi_baseline": aqi,
            "urban_proximity_km": urban_km,
            "rainfall_mm": rain_mm,
        }

        # Contextual logic for classifications
        # 1. Air Severity
        if aqi >= 4 or (ptype in ["mining", "construction"] and scale_ha > 1000 and urban_km < 10):
            record["air_severity"] = "critical"
        elif aqi == 3 or (ptype == "manufacturing" and urban_km < 5):
            record["air_severity"] = "high"
        elif ptype in ["mining", "construction"]:
            record["air_severity"] = "medium"
        else:
            record["air_severity"] = random.choice(["low", "medium"])

        # 2. Water Severity
        if water_km < 1.0 and ptype in ["mining", "manufacturing", "agriculture"]:
            record["water_severity"] = "critical"
        elif water_km < 5.0 and scale_ha > 500:
            record["water_severity"] = "high"
        elif water_km < 10.0:
            record["water_severity"] = "medium"
        else:
            record["water_severity"] = "low"

        # 3. Noise Severity
        if urban_km < 2.0 and ptype in ["mining", "infrastructure"]:
            record["noise_severity"] = "critical"
        elif urban_km < 5.0 and ptype in ["construction", "manufacturing"]:
            record["noise_severity"] = "high"
        elif urban_km < 15.0:
            record["noise_severity"] = "medium"
        else:
            record["noise_severity"] = "low"

        # 4. Biodiversity Severity
        if threat_cnt > 15:
            record["biodiversity_severity"] = "critical"
        elif threat_cnt > 5 or (ndvi > 0.7 and scale_ha > 2000):
            record["biodiversity_severity"] = "high"
        elif threat_cnt > 0 or (ndvi > 0.5):
            record["biodiversity_severity"] = "medium"
        else:
            record["biodiversity_severity"] = "low"

        # 5. Social Severity
        if urban_km < 1.0 and scale_ha > 500:
            record["social_severity"] = "critical"
        elif urban_km < 5.0:
            record["social_severity"] = "high"
        elif ptype in ["infrastructure", "mining"] and scale_ha > 1000:
            record["social_severity"] = "medium"
        else:
            record["social_severity"] = random.choice(["low", "medium"])

        # 6. Soil Severity
        if ptype == "mining" and rain_mm > 1500:
            record["soil_severity"] = "critical"
        elif ptype in ["agriculture", "construction"] and scale_ha > 500:
            record["soil_severity"] = "high"
        elif ptype in ["mining", "infrastructure"]:
            record["soil_severity"] = "medium"
        else:
            record["soil_severity"] = "low"

        # 7. Climate Severity
        if ptype == "manufacturing" and scale_ha > 3000:
            record["climate_severity"] = "critical"
        elif ptype in ["manufacturing", "mining"] and scale_ha > 1000:
            record["climate_severity"] = "high"
        elif scale_ha > 1000:
            record["climate_severity"] = "medium"
        else:
            record["climate_severity"] = "low"

        records.append(record)

    return records

SAMPLE_DATA = generate_sample_data()
