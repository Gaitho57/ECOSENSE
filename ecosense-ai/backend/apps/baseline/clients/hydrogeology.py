"""
EcoSense AI — Hydrogeology Client.

Determines underground water potential and aquifer characteristics across Kenya
using national hydrogeological heuristics based on the Africa Groundwater Atlas.
"""

import logging
from .utils import retry_api_call

logger = logging.getLogger(__name__)

class HydrogeologyClient:
    """
    Heuristic client for Kenyan hydrogeological assessment.
    Provides aquifer type, productivity, and groundwater vulnerability.
    """

    @retry_api_call(max_retries=1, delay=0)
    def get_data(self, lat: float, lng: float) -> dict:
        """
        Classify the hydrogeology at a given coordinate in Kenya.
        """
        # 1. Coastal Sedimentary Belt (Tiwi, Mombasa, Kilifi)
        if -4.7 <= lat <= -3.0 and 39.0 <= lng <= 40.0:
            return {
                "aquifer_type": "Sedimentary (Coastal)",
                "productivity": "High",
                "flow_system": "Intergranular",
                "typical_yield_m3h": "10-100",
                "groundwater_vulnerability": "High (Saline intrusion risk)",
                "description": "Quaternary and Tertiary sands and limestones. Excellent potential for high-capacity boreholes but requires strict salinity monitoring."
            }

        # 2. Central Volcanics (Nairobi, Nakuru, Naivasha, Aberdares)
        if -1.8 <= lat <= 0.5 and 36.0 <= lng <= 37.5:
            return {
                "aquifer_type": "Volcanic (Fractured Cenozoic)",
                "productivity": "Moderate to High",
                "flow_system": "Fracture/Fissure",
                "typical_yield_m3h": "5-25",
                "groundwater_vulnerability": "Medium (Fluoride risk)",
                "description": "Tertiary lavas and pyroclastics. Significant storage in fractured and weathered zones. High fluoride levels common in Rift Valley aquifers."
            }

        # 3. Eastern Basement (Machakos, Kitui, Mwingi, Makueni)
        if -2.5 <= lat <= -0.5 and 37.5 <= lng <= 39.5:
            return {
                "aquifer_type": "Metamorphic (Precambrian Basement)",
                "productivity": "Low",
                "flow_system": "Weathered Layer / Fracture",
                "typical_yield_m3h": "0.5-3",
                "groundwater_vulnerability": "Low",
                "description": "Gneisses and schists. Groundwater restricted to the regolith and localized fractures. Generally low borehole success rates."
            }

        # 4. Arid Northern/Eastern Sediments (Wajir, Garissa, Mandera)
        if -1.0 <= lat <= 4.0 and 38.0 <= lng <= 41.5:
            return {
                "aquifer_type": "Sedimentary (Mesozoic/Paleozoic)",
                "productivity": "Moderate",
                "flow_system": "Intergranular/FRACTURE",
                "typical_yield_m3h": "1-10",
                "groundwater_vulnerability": "Medium (Salinity & Drought)",
                "description": "Sandstones and alluvial deposits. Strategic water resources in arid zones; often deeper with varying mineral content."
            }

        # 5. Lake Victoria Basin (Kisumu, Kakamega, Homa Bay)
        if -1.2 <= lat <= 1.0 and 34.0 <= lng <= 35.5:
            return {
                "aquifer_type": "Basement-Alluvial Complex",
                "productivity": "Moderate",
                "flow_system": "Mixed Intergranular/Fracture",
                "typical_yield_m3h": "2-15",
                "groundwater_vulnerability": "Medium",
                "description": "Weathered basement rocks and localized alluvial deposits along river valleys and the lake margins."
            }

        # Global Fallback for Kenya General
        return {
            "aquifer_type": "Undifferentiated Regional Aquifer",
            "productivity": "Unknown/Low",
            "flow_system": "Composite",
            "typical_yield_m3h": "1-5",
            "groundwater_vulnerability": "Medium",
            "description": "General Kenyan highland or lowland complex. Specific site yield dependent on local fracture density and weathered thickness."
        }
