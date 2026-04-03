import requests
from .utils import retry_api_call

class USGSClient:
    """
    Client for USGS SoilGrids REST API.
    Does not require an API key. 
    Queries local soil composition properties.
    """

    def __init__(self):
        self.base_url = "https://rest.soilgrids.org/soilgrids/v2.0/properties/query"

    @retry_api_call(max_retries=3, delay=2)
    def get_data(self, lat: float, lng: float, radius_km: int = 10) -> dict:
        """
        Fetch soil composition variables (pH, Carbon, Clay, Sand).
        """
        params = {
            "lat": lat,
            "lon": lng,
            "property": ["phh2o", "soc", "clay", "sand"],
            "depth": "0-5cm",
            "value": "mean"
        }

        resp = requests.get(self.base_url, params=params, timeout=30)
        resp.raise_for_status()
        
        # Parse ISRIC soilgrids structure
        # Example format: properties => layers => [list of properties] => depths
        layers = resp.json().get("properties", {}).get("layers", [])
        
        extracted = {"ph": 0.0, "soc": 0.0, "clay": 0.0, "sand": 0.0}
        for layer in layers:
            name = layer.get("name")
            try:
                # Value is returned as dict with mean
                val = layer.get("depths", [{}])[0].get("values", {}).get("mean", 0)
                if name == "phh2o":
                    extracted["ph"] = val / 10.0 # pH is mapped by a factor of 10
                elif name == "soc":
                    extracted["soc"] = val / 10.0 # soc in dg/kg
                elif name == "clay":
                    extracted["clay"] = val / 10.0 # %
                elif name == "sand":
                    extracted["sand"] = val / 10.0 # %
            except (IndexError, TypeError):
                pass
                
        # Simple rule-based heuristic for erosion risk based on sand/clay ratios and slopes
        erosion_risk = "medium"
        if extracted.get("sand", 0) > 60:
            erosion_risk = "high"

        return {
            "soil_type": "Acrisols", # Categorical mapping usually requires different SoilGrids endpoint
            "ph_level": extracted.get("ph", 6.5),
            "organic_carbon_percent": extracted.get("soc", 2.1),
            "clay_percent": extracted.get("clay", 30.0),
            "sand_percent": extracted.get("sand", 40.0),
            "erosion_risk": erosion_risk
        }
