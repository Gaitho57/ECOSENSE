"""
EcoSense AI — Unified 47-County Profile Resolver.

Provides an accurate regional profile for ANY location in Kenya, replacing the
old hardcoded 7-county table that silently defaulted every other county to
Nairobi.

It merges the two existing county datasets:
  * regulatory_data/kenya_county_matrix.json  — lat/lng, basin, water board,
                                                 soil, elevation, major road
  * knowledge_base/kenya_county_matrix.json    — soil, elevation, groundwater,
                                                 flora, agro-ecological zone

and derives zone-appropriate fauna / restoration flora / environmental
vulnerability for every county from its agro-ecological zone and drainage basin.

County is resolved from coordinates by nearest administrative centroid. For
sub-county precision, drop an official county-boundary GeoJSON at
settings.COUNTY_GEOJSON_PATH and point-in-polygon resolution will be used
instead (see resolve_county).

Every returned profile exposes exactly the keys the narrative engine consumes:
    basin, board, major_road, common_flora, restoration_flora, fauna, soil,
    vulnerability, zone, elevation, groundwater, lat, lng, county
"""

import json
import logging
import os

logger = logging.getLogger(__name__)

_BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # apps/baseline
_REG_PATH = os.path.join(_BASE, "regulatory_data", "kenya_county_matrix.json")
_KB_PATH = os.path.join(_BASE, "knowledge_base", "kenya_county_matrix.json")

# ---------------------------------------------------------------------------
# Zone-based ecological derivation.
# Each agro-ecological zone maps to representative fauna, indigenous restoration
# species, and the dominant environmental vulnerability for that landscape.
# These are used when a county has no hand-authored authoritative entry below.
# ---------------------------------------------------------------------------
_ZONE_ECOLOGY = {
    "coastal": {
        "fauna": "Coastal avifauna, sea turtles (nesting beaches), and mangrove-associated species",
        "restoration_flora": "Avicennia marina and Rhizophora mucronata (mangroves), Casuarina equisetifolia, and indigenous coastal palms",
        "vulnerability": "Sea-level rise, coastal/mangrove erosion, and saline intrusion into freshwater",
    },
    "lake": {
        "fauna": "Aquatic avifauna, Nile perch and tilapia fisheries, and hippopotamus in shoreline zones",
        "restoration_flora": "Cyperus papyrus, Phragmites reeds, and indigenous lake-edge vegetation (invasive water hyacinth excluded)",
        "vulnerability": "Nutrient loading / eutrophication, wetland encroachment, and flood-prone shorelines",
    },
    "rift": {
        "fauna": "Lesser flamingo and alkaline-lake avifauna, plains game, and Rift Valley raptors",
        "restoration_flora": "Acacia xanthophloea and salt-tolerant indigenous shrubs",
        "vulnerability": "Alkaline lake sensitivity, geological/rift instability, and soil erosion",
    },
    "highland": {
        "fauna": "Montane forest birds, colobus monkeys, and highland catchment species",
        "restoration_flora": "Podocarpus falcatus, Olea africana, and indigenous montane hardwoods",
        "vulnerability": "Water-tower catchment degradation, steep-slope landslide risk, and riparian encroachment",
    },
    "urban": {
        "fauna": "Urban avifauna and protected-area buffer species",
        "restoration_flora": "Podocarpus falcatus, Olea africana, and indigenous riparian trees",
        "vulnerability": "Urban runoff, air quality, waste management, and high population density",
    },
    "arid": {
        "fauna": "Arid-adapted ungulates (e.g. Grevy's zebra, reticulated giraffe) and pastoralist livestock",
        "restoration_flora": "Acacia tortilis, Commiphora africana, Hyphaene compressa (doum palm), and drought-resistant native shrubs",
        "vulnerability": "Drought, extreme heat, desertification, and pastoralist water/rangeland stress",
    },
    "semiarid": {
        "fauna": "Savanna raptors (incl. vultures), dryland antelope, and mixed livestock",
        "restoration_flora": "Acacia tortilis, Balanites aegyptiaca, and indigenous savanna grasses",
        "vulnerability": "ASAL water scarcity, soil erosion, and rangeland degradation",
    },
    "plateau": {
        "fauna": "Grassland birds, plains game, and agricultural landscape species",
        "restoration_flora": "Indigenous acacias and native grassland species",
        "vulnerability": "Soil erosion, agricultural runoff, and seasonal water stress",
    },
}


def _zone_key(zone: str) -> str:
    """Map a free-text agro-ecological zone to an ecology bucket."""
    z = (zone or "").lower()
    if "coast" in z:
        return "coastal"
    if "lake" in z:
        return "lake"
    if "rift" in z:
        return "rift"
    if "urban" in z:
        return "urban"
    if "arid north" in z or z == "arid north":
        return "arid"
    if "semi" in z:
        return "semiarid"
    if "arid" in z:
        return "arid"
    if "plateau" in z or "mixed" in z:
        return "plateau"
    if "high" in z:
        return "highland"
    return "plateau"


# Authoritative, hand-authored profiles for major counties (higher-quality prose
# than the derived defaults). Other counties are built from the matrices + zone
# derivation. Keys mirror the engine's expected fields.
_AUTHORITATIVE = {
    "Kisumu": {
        "common_flora": "Cyperus papyrus, indigenous lake-edge vegetation (water hyacinth is invasive)",
        "fauna": "Hippopotamus amphibius, Lates niloticus (Nile perch), and aquatic avifauna",
    },
    "Nairobi": {
        "common_flora": "Jacaranda mimosifolia, eucalyptus, and urban riparian corridors",
        "fauna": "Urban avifauna and Nairobi National Park buffer species",
    },
    "Mombasa": {
        "common_flora": "Cocos nucifera (coconut palm), Casuarina equisetifolia, and mangroves",
        "fauna": "Marine avifauna, sea turtles (nesting areas), and coastal primates",
    },
    "Nakuru": {
        "common_flora": "Acacia xanthophloea (yellow-fever tree) and alkaline-tolerant species",
        "fauna": "Phoeniconaias minor (lesser flamingo) and Rothschild's giraffe",
    },
    "Garissa": {
        "common_flora": "Commiphora and Acacia bushland with Tana riverine trees",
        "fauna": "Hirola (Beatragus hunteri) and Tana River primates",
    },
}

_cache = None


def _load():
    global _cache
    if _cache is not None:
        return _cache
    reg, kb = {}, {}
    try:
        with open(_REG_PATH, "r", encoding="utf-8") as f:
            reg = json.load(f).get("counties", {})
    except Exception as exc:  # noqa: BLE001
        logger.warning("county_profiles: could not load regulatory matrix (%s)", exc)
    try:
        with open(_KB_PATH, "r", encoding="utf-8") as f:
            raw = json.load(f)
            kb = raw.get("counties", raw)
    except Exception as exc:  # noqa: BLE001
        logger.warning("county_profiles: could not load knowledge base matrix (%s)", exc)

    merged = {}
    for name in set(list(reg.keys()) + list(kb.keys())):
        r = reg.get(name, {})
        k = kb.get(name, {})
        zone = k.get("zone", "")
        eco = _ZONE_ECOLOGY[_zone_key(zone)]
        flora_list = k.get("flora", [])
        common_flora = ", ".join(flora_list) if flora_list else eco["restoration_flora"]

        profile = {
            "county": name,
            "lat": r.get("lat"),
            "lng": r.get("lng"),
            "basin": r.get("basin", "Kenyan drainage basin"),
            "board": r.get("water_board", "the relevant Water Works Development Agency"),
            "major_road": r.get("road", "the nearest classified road"),
            "soil": r.get("soil") or k.get("soil", "Mixed soils"),
            "elevation": r.get("elevation") or k.get("elevation"),
            "groundwater": k.get("groundwater", "variable"),
            "zone": zone or "Mixed",
            "common_flora": common_flora,
            "restoration_flora": eco["restoration_flora"],
            "fauna": eco["fauna"],
            "vulnerability": eco["vulnerability"],
        }
        # Apply authoritative overrides (nicer prose for major counties).
        profile.update(_AUTHORITATIVE.get(name, {}))
        merged[name] = profile

    _cache = merged
    return merged


def resolve_county(lat, lng):
    """Return the county name whose administrative centroid is nearest to (lat,lng).

    If settings.COUNTY_GEOJSON_PATH points to a valid county-boundary GeoJSON,
    point-in-polygon resolution is used for sub-county precision instead.
    """
    data = _load()

    # Optional: precise point-in-polygon if an official boundary file is provided.
    try:
        from django.conf import settings

        geojson_path = getattr(settings, "COUNTY_GEOJSON_PATH", "") or ""
        if geojson_path and os.path.exists(geojson_path) and lat is not None and lng is not None:
            county = _point_in_county(lat, lng, geojson_path)
            if county:
                return county
    except Exception as exc:  # noqa: BLE001 - fall back to centroid
        logger.debug("county_profiles: polygon resolve unavailable (%s)", exc)

    if lat is None or lng is None:
        return None
    nearest, best = None, float("inf")
    for name, p in data.items():
        if p.get("lat") is None or p.get("lng") is None:
            continue
        d = (lat - p["lat"]) ** 2 + (lng - p["lng"]) ** 2
        if d < best:
            best, nearest = d, name
    return nearest


def _point_in_county(lat, lng, geojson_path):
    """Point-in-polygon county lookup using shapely (optional, high precision)."""
    from shapely.geometry import shape, Point

    with open(geojson_path, "r", encoding="utf-8") as f:
        gj = json.load(f)
    pt = Point(lng, lat)
    for feat in gj.get("features", []):
        try:
            if shape(feat["geometry"]).contains(pt):
                props = feat.get("properties", {})
                # Common property keys for Kenyan county GeoJSONs.
                for key in ("COUNTY", "county", "NAME_1", "name", "ADM1_EN"):
                    if props.get(key):
                        return str(props[key]).title()
        except Exception:  # noqa: BLE001
            continue
    return None


def get_county_profile(county_name=None, lat=None, lng=None):
    """Return the full regional profile for a county.

    Resolution order: explicit county_name (if known) → nearest centroid from
    coordinates → Nairobi as a last resort. Always returns every key the
    narrative engine expects.
    """
    data = _load()

    name = None
    if county_name and county_name in data:
        name = county_name
    elif county_name:
        # Case-insensitive / trimmed match.
        for k in data:
            if k.lower() == str(county_name).strip().lower():
                name = k
                break

    if name is None:
        name = resolve_county(lat, lng)

    if name is None or name not in data:
        name = "Nairobi" if "Nairobi" in data else (next(iter(data)) if data else None)

    if name is None:
        # Absolute fallback if data files are missing entirely.
        return {
            "county": "Kenya", "basin": "Kenyan drainage basin",
            "board": "the relevant Water Works Development Agency",
            "major_road": "the nearest classified road", "soil": "Mixed soils",
            "elevation": None, "groundwater": "variable", "zone": "Mixed",
            "common_flora": "indigenous vegetation",
            "restoration_flora": "indigenous native species",
            "fauna": "locally occurring wildlife",
            "vulnerability": "site-specific environmental sensitivities",
        }

    return dict(data[name])
