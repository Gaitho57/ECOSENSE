"""
EcoSense AI — Baseline Scoring Engine.

Calculates sensitivity heuristics based on combined external API data.
"""

def calculate_sensitivity_score(baseline_data: dict) -> dict:
    """
    Computes component and overall sensitivity scores.
    Expects data block outputs aggregated from USGS, GBIF, GEE, and OpenWeather.
    """
    # Guard against missing or null compilation mapping
    if not baseline_data:
        baseline_data = {}

    scores = {
        "vegetation": 15,
        "hydrology": 20, 
        "biodiversity": 15,
        "air_quality": 20,
        "soil": 20
    }

    # -- 1. Vegetation (GEE)
    satellite = baseline_data.get("satellite") or {}
    ndvi = satellite.get("ndvi", 0) if isinstance(satellite, dict) else 0
    if ndvi > 0.6:
        scores["vegetation"] = 85
    elif 0.4 <= ndvi <= 0.6:
        scores["vegetation"] = 60
    elif 0.2 <= ndvi < 0.4:
        scores["vegetation"] = 35
    else:
        scores["vegetation"] = 15

    # -- 2. Hydrology
    hydrology = baseline_data.get("hydrology") or {}
    hydro = hydrology.get("proximity", "none") if isinstance(hydrology, dict) else "none"
    if hydro == "wetland":
        scores["hydrology"] = 90
    elif hydro == "river":
        scores["hydrology"] = 60
    else:
        scores["hydrology"] = 20

    # -- 3. Biodiversity (GBIF)
    biodiversity = baseline_data.get("biodiversity") or {}
    threatened = biodiversity.get("threatened_species_count", 0) if isinstance(biodiversity, dict) else 0
    if threatened > 10:
        scores["biodiversity"] = 90
    elif 5 <= threatened <= 10:
        scores["biodiversity"] = 65
    elif 1 <= threatened <= 4:
        scores["biodiversity"] = 40
    else:
        scores["biodiversity"] = 15

    # -- 4. Air Quality (OpenWeather)
    air_quality = baseline_data.get("air_quality") or {}
    aqi = air_quality.get("aqi", 1) if isinstance(air_quality, dict) else 1
    if aqi >= 4:
        scores["air_quality"] = 80
    elif aqi == 3:
        scores["air_quality"] = 50
    else:
        scores["air_quality"] = 20

    # -- 5. Soil (USGS)
    soil = baseline_data.get("soil") or {}
    org_carb = soil.get("organic_carbon_percent", 0) if isinstance(soil, dict) else 0
    if org_carb > 3.0:
        scores["soil"] = 70
    elif 1.0 <= org_carb <= 3.0:
        scores["soil"] = 45
    else:
        scores["soil"] = 20

    # -- 6. Overall Weighted Average
    # vegetation 30%, biodiversity 25%, hydrology 20%, soil 15%, air 10%
    overall = (
        (scores["vegetation"] * 0.30) +
        (scores["biodiversity"] * 0.25) +
        (scores["hydrology"] * 0.20) +
        (scores["soil"] * 0.15) +
        (scores["air_quality"] * 0.10)
    )

    # -- 7. Grade Mapping
    grade = "F"
    if overall >= 80:
        grade = "A"
    elif overall >= 60:
        grade = "B"
    elif overall >= 40:
        grade = "C"
    elif overall >= 20:
        grade = "D"

    return {
        "overall": round(overall, 2),
        "grade": grade,
        "breakdown": scores
    }
