"""
EcoSense AI — Baseline Scoring Engine.

Calculates environmental sensitivity scores for EIA baseline assessment.
Now includes 7 components: vegetation, hydrology, biodiversity, air quality,
soil, climate, and topography.

Scoring methodology:
  - Each component scored 0-100 based on environmental sensitivity
  - Higher score = more sensitive environment = greater impact potential
  - Weighted average produces overall sensitivity score
  - Grade assigned A (highest sensitivity) through F (lowest)
"""


def calculate_sensitivity_score(baseline_data: dict) -> dict:
    """
    Computes component and overall sensitivity scores.
    Expects compiled data from all external API clients.
    """
    if not baseline_data:
        baseline_data = {}

    scores = {}

    # ---- 1. Vegetation Sensitivity (GEE Satellite Data) ----
    satellite = baseline_data.get("satellite") or {}
    ndvi = satellite.get("ndvi", 0) if isinstance(satellite, dict) else 0
    tree_cover = satellite.get("tree_cover_percent", 0) if isinstance(satellite, dict) else 0
    land_cover = satellite.get("land_cover_class", "") if isinstance(satellite, dict) else ""

    veg_score = 15  # Base
    if ndvi > 0.7:
        veg_score = 90
    elif ndvi > 0.5:
        veg_score = 70
    elif ndvi > 0.3:
        veg_score = 50
    elif ndvi > 0.15:
        veg_score = 30

    # Bonus for high tree cover
    if tree_cover > 60:
        veg_score = min(95, veg_score + 10)
    elif tree_cover > 30:
        veg_score = min(95, veg_score + 5)

    # Bonus for sensitive land cover types
    if land_cover in ("Herbaceous wetland", "Mangroves"):
        veg_score = max(veg_score, 85)
    elif land_cover in ("Tree cover",):
        veg_score = max(veg_score, 70)

    scores["vegetation"] = veg_score

    # ---- 2. Hydrology Sensitivity ----
    hydrology = baseline_data.get("hydrology") or {}
    if isinstance(hydrology, dict):
        proximity = hydrology.get("proximity", "none")
        total_water = hydrology.get("total_water_bodies", 0)
        nearest_km = hydrology.get("nearest_distance_km")
        categories = hydrology.get("category_counts", {})
    else:
        proximity = "none"
        total_water = 0
        nearest_km = None
        categories = {}

    hydro_score = 15
    # Distance-based scoring
    if nearest_km is not None:
        if nearest_km <= 0.5:
            hydro_score = 90
        elif nearest_km <= 1.0:
            hydro_score = 75
        elif nearest_km <= 2.0:
            hydro_score = 60
        elif nearest_km <= 5.0:
            hydro_score = 40
        else:
            hydro_score = 20
    elif proximity == "wetland":
        hydro_score = 90
    elif proximity == "river":
        hydro_score = 65
    elif proximity == "moderate":
        hydro_score = 40
    else:
        hydro_score = 15

    # Bonus for wetlands present
    if categories.get("wetland", 0) > 0:
        hydro_score = max(hydro_score, 85)

    # Bonus for significant water presence
    if total_water > 10:
        hydro_score = min(95, hydro_score + 10)

    scores["hydrology"] = hydro_score

    # ---- 3. Biodiversity Sensitivity (GBIF) ----
    biodiversity = baseline_data.get("biodiversity") or {}
    if isinstance(biodiversity, dict):
        threatened = biodiversity.get("threatened_species_count", 0)
        total_species = biodiversity.get("total_species_count", 0)
        shannon = biodiversity.get("shannon_diversity_index", 0)
        has_endemic = biodiversity.get("has_endemic_species", False)
    else:
        threatened = 0
        total_species = 0
        shannon = 0
        has_endemic = False

    bio_score = 15
    # Threatened species are the primary signal
    if threatened > 10:
        bio_score = 95
    elif threatened >= 5:
        bio_score = 80
    elif threatened >= 3:
        bio_score = 65
    elif threatened >= 1:
        bio_score = 50
    else:
        bio_score = 15

    # Species richness bonus
    if total_species > 50:
        bio_score = min(95, bio_score + 10)
    elif total_species > 20:
        bio_score = min(95, bio_score + 5)

    # Shannon diversity bonus
    if shannon > 3.0:
        bio_score = min(95, bio_score + 10)
    elif shannon > 2.0:
        bio_score = min(95, bio_score + 5)

    # Endemic species penalty
    if has_endemic:
        bio_score = max(bio_score, 80)

    scores["biodiversity"] = bio_score

    # ---- 4. Air Quality Sensitivity (OpenWeather) ----
    air_quality = baseline_data.get("air_quality") or {}
    if isinstance(air_quality, dict):
        aqi = air_quality.get("aqi", 1)
        who_exceedances = air_quality.get("who_exceedances", [])
    else:
        aqi = 1
        who_exceedances = []

    if aqi >= 5:
        air_score = 90
    elif aqi >= 4:
        air_score = 75
    elif aqi == 3:
        air_score = 50
    elif aqi == 2:
        air_score = 30
    else:
        air_score = 15

    # WHO exceedance bonus
    if len(who_exceedances) >= 3:
        air_score = min(95, air_score + 15)
    elif len(who_exceedances) >= 1:
        air_score = min(95, air_score + 10)

    scores["air_quality"] = air_score

    # ---- 5. Soil Sensitivity (SoilGrids) ----
    soil = baseline_data.get("soil") or {}
    if isinstance(soil, dict):
        org_carb = soil.get("organic_carbon_percent", 0)
        erosion = soil.get("erosion_risk", "medium")
        fertility = soil.get("fertility_rating", "moderate")
        carbon_stock = soil.get("carbon_stock_tonnes_ha", 0)
    else:
        org_carb = 0
        erosion = "medium"
        fertility = "moderate"
        carbon_stock = 0

    soil_score = 20
    # High organic carbon means valuable, sensitive soil
    if org_carb > 5.0:
        soil_score = 85
    elif org_carb > 3.0:
        soil_score = 65
    elif org_carb > 1.5:
        soil_score = 45
    elif org_carb > 0.5:
        soil_score = 25

    # Erosion vulnerability increases sensitivity
    erosion_bonus = {"very_high": 20, "high": 15, "medium": 5, "low": 0, "very_low": 0}
    soil_score = min(95, soil_score + erosion_bonus.get(erosion, 0))

    # High carbon stock means nationally/globally significant soil
    if carbon_stock > 100:
        soil_score = max(soil_score, 80)

    scores["soil"] = soil_score

    # ---- 6. Climate Sensitivity ----
    climate = baseline_data.get("climate") or {}
    if isinstance(climate, dict):
        annual = climate.get("annual_summary", {})
        seasons = climate.get("seasons", {})
        total_precip = annual.get("total_annual_precipitation_mm", 0) if annual else 0
        rainy_days = annual.get("total_rainy_days", 0) if annual else 0
        seasonality = seasons.get("rainfall_seasonality_index", 1) if seasons else 1
    else:
        total_precip = 0
        rainy_days = 0
        seasonality = 1

    climate_score = 20
    # High rainfall areas are more sensitive to disruption
    if total_precip > 2000:
        climate_score = 75
    elif total_precip > 1000:
        climate_score = 55
    elif total_precip > 500:
        climate_score = 35
    elif total_precip > 200:
        climate_score = 20
    else:
        climate_score = 10  # Arid — different sensitivity profile

    # High seasonality increases flood/drought risk
    if seasonality > 3.0:
        climate_score = min(95, climate_score + 15)
    elif seasonality > 2.0:
        climate_score = min(95, climate_score + 5)

    scores["climate"] = climate_score

    # ---- 7. Topography Sensitivity ----
    topography = baseline_data.get("topography") or {}
    if isinstance(topography, dict):
        elevation = topography.get("elevation_m", 0)
        lc_breakdown = topography.get("land_cover_breakdown", {})
    else:
        elevation = 0
        lc_breakdown = {}

    topo_score = 20
    # Highland/montane areas are ecologically sensitive
    if elevation > 3000:
        topo_score = 80
    elif elevation > 2000:
        topo_score = 60
    elif elevation > 1000:
        topo_score = 35
    else:
        topo_score = 20

    # Mixed land cover increases complexity/sensitivity
    diverse_covers = len([v for v in lc_breakdown.values() if v > 5])
    if diverse_covers >= 4:
        topo_score = min(95, topo_score + 15)
    elif diverse_covers >= 2:
        topo_score = min(95, topo_score + 5)

    scores["topography"] = topo_score

    # ---- 8. Overall Weighted Average ----
    # Weights reflect typical EIA importance hierarchy
    weights = {
        "vegetation": 0.20,
        "biodiversity": 0.20,
        "hydrology": 0.18,
        "soil": 0.12,
        "air_quality": 0.10,
        "climate": 0.12,
        "topography": 0.08,
    }

    overall = sum(scores.get(k, 0) * w for k, w in weights.items())

    # ---- 9. Grade Mapping ----
    if overall >= 80:
        grade = "A"
    elif overall >= 65:
        grade = "B"
    elif overall >= 45:
        grade = "C"
    elif overall >= 25:
        grade = "D"
    else:
        grade = "F"

    return {
        "overall": round(overall, 2),
        "grade": grade,
        "breakdown": scores,
        "weights": weights,
        "interpretation": _interpret_grade(grade),
    }


def _interpret_grade(grade: str) -> str:
    """Provide a human-readable interpretation of the sensitivity grade."""
    interpretations = {
        "A": "Very High Sensitivity — Significant environmental constraints. Full EIA with detailed mitigation required.",
        "B": "High Sensitivity — Notable environmental features present. Comprehensive assessment and mitigation needed.",
        "C": "Moderate Sensitivity — Some environmental concerns. Standard EIA assessment recommended.",
        "D": "Low Sensitivity — Limited environmental constraints. Focused assessment on key issues sufficient.",
        "F": "Minimal Sensitivity — Few environmental constraints identified. Basic screening may suffice.",
    }
    return interpretations.get(grade, "Assessment incomplete.")
