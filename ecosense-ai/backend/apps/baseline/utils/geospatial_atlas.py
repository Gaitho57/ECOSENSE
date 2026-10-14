"""
EcoSense AI — Kenyan Regional Geospatial Atlas.

Provides high-fidelity environmental fallbacks (Soil, Vegetation, Climate)
based on Kenyan agro-ecological zones and administrative boundaries.
"""

def get_regional_profile(lat: float, lng: float) -> dict:
    """
    Determines the ecological profile of a location in Kenya using 
    coordinate-based heuristic boundaries.
    """
    # 1. Lake Victoria Basin & Western Highlands
    # (Kisumu, Kakamega, Bungoma, Busia, Homa Bay, Migori)
    if 33.5 <= lng <= 35.5 and -1.2 <= lat <= 1.2:
        return {
            "region": "Lake Victoria Basin / Western Highlands",
            "soil": {
                "type": "Vertisols (Black Cotton Soil) / Fluvisols",
                "ph": 6.4, "soc": 2.2, "nitrogen": 0.18, "cec": 28.5,
                "texture": "Clay / Silty Clay", "fertility": "Moderate to High"
            },
            "vegetation": {
                "land_cover": "Mixed Urban / Riparian Savannah",
                "ndvi": 0.45, "dominant_species": "Acacia xanthophloea, Phragmites mauritianus",
                "tree_cover": 15
            },
            "climate": { "temp_avg": 24.5, "rainfall_annual": 1200, "humidity": 65 }
        }

    # 2. Central Highlands & Nairobi Area
    # (Nairobi, Kiambu, Murang'a, Nyeri, Kirinyaga, Embu)
    elif 36.5 <= lng <= 37.8 and -1.5 <= lat <= 0.5:
        return {
            "region": "Central Highlands / Nairobi Metropolitan",
            "soil": {
                "type": "Nitisols (Humic Red Volcanic Soils)",
                "ph": 5.8, "soc": 3.5, "nitrogen": 0.25, "cec": 18.2,
                "texture": "Clay Loam", "fertility": "Very High"
            },
            "vegetation": {
                "land_cover": "Highland Forest / Agricultural Mosaic",
                "ndvi": 0.58, "dominant_species": "Croton megalocarpus, Eucalyptus saligna",
                "tree_cover": 35
            },
            "climate": { "temp_avg": 19.5, "rainfall_annual": 1050, "humidity": 55 }
        }

    # 3. Rift Valley Floor
    # (Nakuru, Naivasha, Baringo, Narok)
    elif 35.5 <= lng <= 36.5 and -2.0 <= lat <= 1.5:
        return {
            "region": "Rift Valley Floor / Maasai Mara Ecosystem",
            "soil": {
                "type": "Andosols (Volcanic Ash Soils) / Phaeozems",
                "ph": 7.5, "soc": 1.8, "nitrogen": 0.15, "cec": 22.0,
                "texture": "Loamy Sand / Silt", "fertility": "High"
            },
            "vegetation": {
                "land_cover": "Open Savannah Grassland",
                "ndvi": 0.35, "dominant_species": "Themeda triandra (Red Oat Grass), Acacia tortilis",
                "tree_cover": 10
            },
            "climate": { "temp_avg": 22.0, "rainfall_annual": 750, "humidity": 45 }
        }

    # 4. Eastern Plateau & Semi-Arid Drylands
    # (Machakos, Makueni, Kitui, Tharaka Nithi)
    elif 37.8 <= lng <= 39.0 and -3.0 <= lat <= 0.5:
        return {
            "region": "Eastern Plateau Drylands (Ukambani)",
            "soil": {
                "type": "Ferralsols (Red Sandy Clays) / Luvisols",
                "ph": 6.8, "soc": 0.9, "nitrogen": 0.09, "cec": 14.5,
                "texture": "Sandy Clay Loam", "fertility": "Moderate"
            },
            "vegetation": {
                "land_cover": "Dry Bushland / Acacia-Commiphora Woodland",
                "ndvi": 0.28, "dominant_species": "Commiphora africana, Acacia mellifera",
                "tree_cover": 12
            },
            "climate": { "temp_avg": 26.5, "rainfall_annual": 600, "humidity": 40 }
        }

    # 5. Coastal Strip & Hinterland
    # (Mombasa, Kwale, Kilifi, Lamu, Tana River)
    elif lng >= 39.0 and lat <= -1.0:
        return {
            "region": "Coastal Lowlands & Tana Delta",
            "soil": {
                "type": "Arenosols (Sandy Soils) / Gleysols",
                "ph": 7.2, "soc": 0.8, "nitrogen": 0.08, "cec": 12.5,
                "texture": "Sand / Loamy Sand", "fertility": "Low to Moderate"
            },
            "vegetation": {
                "land_cover": "Coastal Scrub / Mangrove / Palm",
                "ndvi": 0.38, "dominant_species": "Cocos nucifera, Casuarina equisetifolia",
                "tree_cover": 20
            },
            "climate": { "temp_avg": 28.0, "rainfall_annual": 950, "humidity": 80 }
        }

    # 6. Northern Frontier & Xeric Deserts
    # (Turkana, Marsabit, Wajir, Mandera)
    else:
        return {
            "region": "Northern Frontier / Arid Xeric Deserts",
            "soil": {
                "type": "Leptosols (Stony Soils) / Solonchaks (Saline)",
                "ph": 8.2, "soc": 0.3, "nitrogen": 0.03, "cec": 10.0,
                "texture": "Stony / Sand", "fertility": "Very Low"
            },
            "vegetation": {
                "land_cover": "Open Desert Scrub",
                "ndvi": 0.15, "dominant_species": "Acacia reficiens, Euphorbia spp.",
                "tree_cover": 2
            },
            "climate": { "temp_avg": 32.5, "rainfall_annual": 250, "humidity": 25 }
        }


_aez_cache = None


def get_official_aez(lat: float, lng: float) -> dict:
    """
    Resolves the official Kenyan Agro-Ecological Zone (Jaetzold / FAO classification)
    using shapely point-in-polygon queries against the authoritative vector dataset.

    Returns:
      {
        "zone_code": "UM3",
        "zone_name": "Marginal Coffee Zone",
        "thermal_belt": "Upper Midland (1,400–1,650m ASL)",
        "moisture_zone": "Semi-Humid (Zone III)",
        "annual_rainfall_mm": "900–1,150 mm",
        "potential": "Medium Potential (Mixed Commercial, Industrial Godowns & Subdivisions)",
        "recommended_trees": "Acacia polyacantha, Croton megalocarpus, Albizia gummifera",
        "fill_color": "#84cc16"
      }
    """
    global _aez_cache
    import json
    import os
    from shapely.geometry import shape, Point

    if _aez_cache is None:
        aez_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "regulatory_data", "kenya_aez.geojson")
        cached = []
        if os.path.exists(aez_path):
            try:
                with open(aez_path, "r", encoding="utf-8") as f:
                    gj = json.load(f)
                for feat in gj.get("features", []):
                    try:
                        cached.append((shape(feat["geometry"]), feat.get("properties", {})))
                    except Exception:
                        continue
            except Exception as e:
                pass
        _aez_cache = cached

    if lat is not None and lng is not None and _aez_cache:
        pt = Point(lng, lat)
        for geom, props in _aez_cache:
            try:
                if geom.contains(pt):
                    return dict(props)
            except Exception:
                continue

    # Clean fallback: map from heuristic regional profile
    reg = get_regional_profile(lat, lng) if (lat is not None and lng is not None) else {}
    return {
        "zone_code": "UM4",
        "zone_name": f"Transitional Agro-Ecological Zone ({reg.get('region', 'Central Kenya')})",
        "thermal_belt": "Upper Midland / Lower Midland",
        "moisture_zone": "Semi-Humid to Semi-Arid",
        "annual_rainfall_mm": f"{reg.get('climate', {}).get('rainfall_annual', 850)} mm",
        "potential": "Medium Agronomic & Commercial Mixed Development Potential",
        "recommended_trees": reg.get("vegetation", {}).get("dominant_species", "Acacia tortilis, Croton megalocarpus"),
        "fill_color": "#a3e635"
    }


