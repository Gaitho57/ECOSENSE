import requests
from django.conf import settings
from .utils import retry_api_call

class OpenWeatherClient:
    """
    Client for OpenWeatherMap API.
    Fetches Air Quality (AQI, PM2.5, PM10, NO2) and Weather (Wind speed/direction).
    """

    def __init__(self):
        self.api_key = getattr(settings, "OPENWEATHER_API_KEY", "")
        self.base_url_air = "http://api.openweathermap.org/data/2.5/air_pollution"
        self.base_url_weather = "http://api.openweathermap.org/data/2.5/weather"

    @retry_api_call(max_retries=3, delay=2)
    def get_data(self, lat: float, lng: float, radius_km: int = 10) -> dict:
        """
        Fetch pollution and weather attributes. Radius is not heavily used in weather 
        point APIs but accepted for signature consistency.
        """
        if not self.api_key:
            raise ValueError("OPENWEATHER_API_KEY is not set.")

        params = {"lat": lat, "lon": lng, "appid": self.api_key}

        # 1. Fetch Air Pollution
        air_resp = requests.get(self.base_url_air, params=params, timeout=30)
        air_resp.raise_for_status()
        air_data = air_resp.json().get("list", [{}])[0].get("components", {})
        aqi = air_resp.json().get("list", [{}])[0].get("main", {}).get("aqi", 1)

        # 2. Fetch Current Weather
        wx_resp = requests.get(self.base_url_weather, params=params, timeout=30)
        wx_resp.raise_for_status()
        wx_data = wx_resp.json().get("wind", {})

        return {
            "pm2_5": air_data.get("pm2_5", 0.0),
            "pm10": air_data.get("pm10", 0.0),
            "no2": air_data.get("no2", 0.0),
            "aqi": aqi,
            "wind_speed_ms": wx_data.get("speed", 0.0),
            "wind_direction_deg": wx_data.get("deg", 0),
            "annual_rainfall_mm": 1200.5, # Placeholder: climate normals generally require a paid tier
        }
