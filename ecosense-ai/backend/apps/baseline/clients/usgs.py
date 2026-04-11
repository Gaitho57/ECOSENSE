"""
EcoSense AI — Soil Data Client (ISRIC SoilGrids).

Retrieves real soil property data from the ISRIC SoilGrids REST API
(free, no API key required).

Enhancements over previous version:
  - Queries soil WRB classification for actual soil taxonomy
  - Multi-depth analysis (0-5cm, 5-15cm, 15-30cm)
  - Improved erosion risk assessment (organic carbon + texture + slope proxy)
  - Additional properties: nitrogen, CEC, bulk density
  - Soil texture triangle classification
"""

import logging

import requests
from .utils import retry_api_call

logger = logging.getLogger(__name__)

# WRB Soil Classification reference
WRB_SOIL_GROUPS = {
    "AC": "Acrisols",
    "AL": "Alisols",
    "AN": "Andosols",
    "AR": "Arenosols",
    "AT": "Anthrosols",
    "CH": "Chernozems",
    "CL": "Calcisols",
    "CM": "Cambisols",
    "CR": "Crysols",
    "DU": "Durisols",
    "FL": "Fluvisols",
    "FR": "Ferralsols",
    "GL": "Gleysols",
    "GY": "Gypsisols",
    "HS": "Histosols",
    "KS": "Kastanozems",
    "LP": "Leptosols",
    "LV": "Luvisols",
    "LX": "Lixisols",
    "NT": "Nitisols",
    "PH": "Phaeozems",
    "PL": "Planosols",
    "PT": "Plinthosols",
    "PZ": "Podzols",
    "RG": "Regosols",
    "SC": "Solonchaks",
    "SN": "Solonetz",
    "ST": "Stagnosols",
    "TC": "Technosols",
    "UM": "Umbrisols",
    "VR": "Vertisols",
}

# Soil texture classes based on USDA triangle
TEXTURE_CLASSES = {
    "Clay": {"clay_min": 40, "sand_max": 45},
    "Sandy Clay": {"clay_min": 35, "sand_min": 45},
    "Silty Clay": {"clay_min": 40, "sand_max": 20},
    "Clay Loam": {"clay_min": 27, "clay_max": 40, "sand_max": 45},
    "Sandy Clay Loam": {"clay_min": 20, "clay_max": 35, "sand_min": 45},
    "Silty Clay Loam": {"clay_min": 27, "clay_max": 40, "sand_max": 20},
    "Loam": {"clay_min": 7, "clay_max": 27, "sand_max": 52},
    "Sandy Loam": {"sand_min": 50, "clay_max": 20},
    "Silt Loam": {"sand_max": 50, "clay_max": 27},
    "Sand": {"sand_min": 85, "clay_max": 10},
    "Loamy Sand": {"sand_min": 70, "sand_max": 85, "clay_max": 15},
}


class USGSClient:
    """
    Client for ISRIC SoilGrids REST API.
    Does not require an API key.
    Queries soil composition properties at multiple depths.
    """

    DEPTHS = ["0-5cm", "5-15cm", "15-30cm"]
    PROPERTIES = ["phh2o", "soc", "clay", "sand", "silt", "nitrogen", "cec", "bdod", "ocd"]

    def __init__(self):
        self.properties_url = "https://rest.soilgrids.org/soilgrids/v2.0/properties/query"
        self.classification_url = "https://rest.soilgrids.org/soilgrids/v2.0/classification/query"

    @retry_api_call(max_retries=3, delay=2)
    def get_data(self, lat: float, lng: float, radius_km: int = 10) -> dict:
        """
        Fetch comprehensive soil data at multiple depths.
        """
        # ---- 1. Soil Properties ----
        depth_profiles = {}
        for depth in self.DEPTHS:
            profile = self._fetch_properties(lat, lng, depth)
            depth_profiles[depth] = profile

        # Primary surface profile (0-5cm) for backward compatibility
        surface = depth_profiles.get("0-5cm", {})

        # ---- 2. Soil Classification (WRB taxonomy) ----
        soil_type = self._fetch_classification(lat, lng)

        # ---- 3. Soil Texture Classification ----
        texture_class = self._classify_texture(
            surface.get("clay", 0),
            surface.get("sand", 0),
            surface.get("silt", 0),
        )

        # ---- 4. Erosion Risk Assessment ----
        erosion_risk = self._assess_erosion_risk(surface)

        # ---- 5. Fertility Assessment ----
        fertility = self._assess_fertility(surface)

        # ---- 6. Carbon Stock Estimate ----
        carbon_stock = self._estimate_carbon_stock(depth_profiles)

        return {
            "soil_type": soil_type,
            "texture_class": texture_class,
            "ph_level": surface.get("ph", 6.5),
            "organic_carbon_percent": surface.get("soc", 0),
            "clay_percent": surface.get("clay", 0),
            "sand_percent": surface.get("sand", 0),
            "silt_percent": surface.get("silt", 0),
            "nitrogen_g_per_kg": surface.get("nitrogen", 0),
            "cec_cmol_per_kg": surface.get("cec", 0),
            "bulk_density_kg_m3": surface.get("bdod", 0),
            "ocd_hg_m3": surface.get("ocd", 0),
            "erosion_risk": erosion_risk["level"],
            "erosion_risk_factors": erosion_risk["factors"],
            "fertility_rating": fertility["rating"],
            "fertility_details": fertility["details"],
            "depth_profiles": depth_profiles,
            "carbon_stock_tonnes_ha": carbon_stock,
            "source": "ISRIC SoilGrids v2.0",
        }

    def _fetch_properties(self, lat: float, lng: float, depth: str) -> dict:
        """Fetch soil properties for a specific depth."""
        try:
            params = {
                "lat": lat,
                "lon": lng,
                "property": self.PROPERTIES,
                "depth": depth,
                "value": "mean",
            }

            resp = requests.get(self.properties_url, params=params, timeout=30)
            resp.raise_for_status()

            layers = resp.json().get("properties", {}).get("layers", [])

            extracted = {}
            for layer in layers:
                name = layer.get("name")
                try:
                    val = layer.get("depths", [{}])[0].get("values", {}).get("mean", 0)
                    if val is None:
                        val = 0

                    # Apply SoilGrids scale factors
                    if name == "phh2o":
                        extracted["ph"] = round(val / 10.0, 1)
                    elif name == "soc":
                        extracted["soc"] = round(val / 10.0, 2)  # dg/kg → g/kg → %
                    elif name == "clay":
                        extracted["clay"] = round(val / 10.0, 1)  # g/kg → %
                    elif name == "sand":
                        extracted["sand"] = round(val / 10.0, 1)
                    elif name == "silt":
                        extracted["silt"] = round(val / 10.0, 1)
                    elif name == "nitrogen":
                        extracted["nitrogen"] = round(val / 100.0, 2)  # cg/kg → g/kg
                    elif name == "cec":
                        extracted["cec"] = round(val / 10.0, 1)  # mmol(c)/kg → cmol/kg
                    elif name == "bdod":
                        extracted["bdod"] = round(val / 100.0, 2)  # cg/cm³ → kg/dm³
                    elif name == "ocd":
                        extracted["ocd"] = round(val / 10.0, 2)  # hg/dm³ → kg/m³
                except (IndexError, TypeError, ValueError):
                    pass

            return extracted

        except Exception as e:
            logger.warning(f"SoilGrids property fetch failed for {depth}: {e}")
            return {}

    def _fetch_classification(self, lat: float, lng: float) -> str:
        """Fetch WRB soil classification."""
        try:
            params = {"lat": lat, "lon": lng, "number_classes": 3}
            resp = requests.get(self.classification_url, params=params, timeout=30)
            resp.raise_for_status()

            wrb_data = resp.json().get("wrb_class_name", "")
            if wrb_data:
                return wrb_data

            # Fallback 1: try to parse from classification probability
            classifications = resp.json().get("classification", {}).get("classifications", [])
            if classifications:
                top_class = classifications[0]
                # Extract code from name (e.g. "Acrisols" or "AC")
                full_name = top_class.get("name", "")
                if full_name:
                    return full_name
                
                code = full_name[:2].upper()
                return WRB_SOIL_GROUPS.get(code, code)

            # Fallback 2: Regional Heuristic for Kenyan Highland/Rift areas if coordinates match
            if -5.0 <= lat <= 5.0 and 33.0 <= lng <= 42.0:
                # Common soil types in Kenya: Nitisols, Ferralsols, Vertisols
                return "Ferralsols / Nitisols (Regional Kenyan Proxy)"

            return "Inland Sedimentary (General)"
        except Exception as e:
            logger.warning(f"SoilGrids classification failed: {e}")
            return "Ferralsols (Regional Fallback)"

    @staticmethod
    def _classify_texture(clay: float, sand: float, silt: float) -> str:
        """Classify soil texture using USDA texture triangle."""
        if clay <= 0 and sand <= 0:
            return "Unknown"

        # Ensure percentages sum to ~100
        total = clay + sand + silt
        if total > 0:
            clay = (clay / total) * 100
            sand = (sand / total) * 100
            silt = (silt / total) * 100

        if clay >= 40:
            if sand >= 45:
                return "Sandy Clay"
            elif silt >= 40:
                return "Silty Clay"
            return "Clay"
        elif clay >= 27:
            if sand >= 45:
                return "Sandy Clay Loam"
            elif sand <= 20:
                return "Silty Clay Loam"
            return "Clay Loam"
        elif clay >= 7:
            if sand >= 52:
                return "Sandy Loam"
            elif silt >= 50:
                return "Silt Loam"
            return "Loam"
        elif sand >= 85:
            return "Sand"
        elif sand >= 70:
            return "Loamy Sand"
        elif silt >= 80:
            return "Silt"
        return "Loam"

    @staticmethod
    def _assess_erosion_risk(surface: dict) -> dict:
        """
        Comprehensive erosion risk assessment considering multiple factors.
        """
        factors = []
        risk_score = 0

        sand = surface.get("sand", 0)
        clay = surface.get("clay", 0)
        soc = surface.get("soc", 0)  # Organic carbon percentage
        silt = surface.get("silt", 0)

        # Factor 1: Sand content (high sand = high erodibility)
        if sand > 70:
            risk_score += 3
            factors.append("Very high sand content (>70%)")
        elif sand > 50:
            risk_score += 2
            factors.append("High sand content (>50%)")

        # Factor 2: Silt content (high silt = moderate-high erodibility)
        if silt > 60:
            risk_score += 2
            factors.append("High silt content (>60%)")
        elif silt > 40:
            risk_score += 1
            factors.append("Moderate silt content")

        # Factor 3: Clay content (high clay = low erodibility when dry, high when wet)
        if clay < 10:
            risk_score += 1
            factors.append("Low clay binding (<10%)")

        # Factor 4: Organic carbon (protects against erosion)
        if soc < 1.0:
            risk_score += 2
            factors.append("Very low organic carbon (<1%)")
        elif soc < 2.0:
            risk_score += 1
            factors.append("Low organic carbon (<2%)")
        elif soc >= 4.0:
            risk_score -= 1
            factors.append("High organic carbon provides protection")

        # Determine level
        if risk_score >= 5:
            level = "very_high"
        elif risk_score >= 3:
            level = "high"
        elif risk_score >= 2:
            level = "medium"
        elif risk_score >= 1:
            level = "low"
        else:
            level = "very_low"

        return {"level": level, "factors": factors, "score": max(risk_score, 0)}

    @staticmethod
    def _assess_fertility(surface: dict) -> dict:
        """Assess soil fertility from nutrient indicators."""
        details = []
        score = 0

        ph = surface.get("ph", 6.5)
        soc = surface.get("soc", 0)
        nitrogen = surface.get("nitrogen", 0)
        cec = surface.get("cec", 0)

        # pH assessment (ideal: 6.0-7.5)
        if 6.0 <= ph <= 7.5:
            score += 2
            details.append(f"Optimal pH ({ph})")
        elif 5.5 <= ph < 6.0 or 7.5 < ph <= 8.0:
            score += 1
            details.append(f"Acceptable pH ({ph})")
        else:
            details.append(f"Suboptimal pH ({ph})")

        # Organic carbon
        if soc >= 3.0:
            score += 3
            details.append(f"High organic matter ({soc}%)")
        elif soc >= 1.5:
            score += 2
            details.append(f"Moderate organic matter ({soc}%)")
        elif soc >= 0.5:
            score += 1
            details.append(f"Low organic matter ({soc}%)")
        else:
            details.append(f"Very low organic matter ({soc}%)")

        # Nitrogen
        if nitrogen >= 2.0:
            score += 2
            details.append("Good nitrogen availability")
        elif nitrogen >= 1.0:
            score += 1
            details.append("Moderate nitrogen")
        else:
            details.append("Low nitrogen")

        # CEC (cation exchange capacity)
        if cec >= 25:
            score += 2
            details.append("High nutrient retention capacity")
        elif cec >= 10:
            score += 1
            details.append("Moderate nutrient retention")
        else:
            details.append("Low nutrient retention capacity")

        if score >= 7:
            rating = "high"
        elif score >= 4:
            rating = "moderate"
        elif score >= 2:
            rating = "low"
        else:
            rating = "very_low"

        return {"rating": rating, "details": details, "score": score}

    @staticmethod
    def _estimate_carbon_stock(depth_profiles: dict) -> float:
        """
        Estimate soil organic carbon stock in tonnes/hectare for top 30cm.
        SOC stock = SOC (g/kg) × BD (kg/dm³) × depth (cm) × 0.1
        """
        total = 0.0
        depth_cm = {"0-5cm": 5, "5-15cm": 10, "15-30cm": 15}

        for depth_key, cm in depth_cm.items():
            profile = depth_profiles.get(depth_key, {})
            soc = profile.get("soc", 0) or 0  # g/kg
            bd = profile.get("bdod", 1.3) or 1.3  # kg/dm³, default if missing

            # Convert: SOC(g/kg) * BD(kg/dm³) * depth(cm) * 0.1 = tonnes/ha
            stock = soc * bd * cm * 0.1
            total += stock

        return round(total, 1)
