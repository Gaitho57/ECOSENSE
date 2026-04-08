"""
EcoSense AI — OpenWeatherMap Client.

Fetches air quality and weather data from OpenWeatherMap API.

Enhancements:
  - Added SO₂ and CO extraction from air pollution endpoint
  - Added temperature and humidity readings
  - Removed hardcoded annual_rainfall_mm (now from ClimateClient)
  - Added comprehensive pollutant breakdown
"""

import logging

import requests
from django.conf import settings
from .utils import retry_api_call

logger = logging.getLogger(__name__)

# AQI level descriptions per OpenWeather scale
AQI_LABELS = {
    1: "Good",
    2: "Fair",
    3: "Moderate",
    4: "Poor",
    5: "Very Poor",
}


class OpenWeatherClient:
    """
    Client for OpenWeatherMap API.
    Fetches Air Quality (AQI, PM2.5, PM10, NO2, SO2, CO, O3) and
    Weather (Wind, Temperature, Humidity).
    """

    def __init__(self):
        self.api_key = getattr(settings, "OPENWEATHER_API_KEY", "")
        self.base_url_air = "http://api.openweathermap.org/data/2.5/air_pollution"
        self.base_url_weather = "http://api.openweathermap.org/data/2.5/weather"

    @retry_api_call(max_retries=3, delay=2)
    def get_data(self, lat: float, lng: float, radius_km: int = 10) -> dict:
        """
        Fetch comprehensive air quality and weather attributes.
        """
        if not self.api_key:
            raise ValueError("OPENWEATHER_API_KEY is not set.")

        params = {"lat": lat, "lon": lng, "appid": self.api_key}

        # ---- 1. Air Pollution Data ----
        air_resp = requests.get(self.base_url_air, params=params, timeout=30)
        air_resp.raise_for_status()
        air_json = air_resp.json()

        air_entry = air_json.get("list", [{}])[0]
        components = air_entry.get("components", {})
        aqi = air_entry.get("main", {}).get("aqi", 1)

        # ---- 2. Current Weather Data ----
        wx_params = {**params, "units": "metric"}
        wx_resp = requests.get(self.base_url_weather, params=wx_params, timeout=30)
        wx_resp.raise_for_status()
        wx_json = wx_resp.json()

        wind = wx_json.get("wind", {})
        main = wx_json.get("main", {})
        weather = wx_json.get("weather", [{}])[0]

        # ---- 3. Build comprehensive response ----
        return {
            # Air Quality Index
            "aqi": aqi,
            "aqi_label": AQI_LABELS.get(aqi, "Unknown"),

            # Primary pollutants (µg/m³)
            "pm2_5": components.get("pm2_5", 0.0),
            "pm10": components.get("pm10", 0.0),
            "no2": components.get("no2", 0.0),
            "so2": components.get("so2", 0.0),
            "co": components.get("co", 0.0),
            "o3": components.get("o3", 0.0),
            "nh3": components.get("nh3", 0.0),
            "no": components.get("no", 0.0),

            # WHO guideline exceedances
            "who_exceedances": self._check_who_limits(components),

            # Wind
            "wind_speed_ms": wind.get("speed", 0.0),
            "wind_direction_deg": wind.get("deg", 0),
            "wind_gust_ms": wind.get("gust", None),

            # Temperature & Humidity
            "temperature_c": main.get("temp", 0),
            "feels_like_c": main.get("feels_like", 0),
            "humidity_percent": main.get("humidity", 0),
            "pressure_hpa": main.get("pressure", 0),

            # Current conditions
            "weather_description": weather.get("description", ""),
            "visibility_m": wx_json.get("visibility", 10000),

            "source": "OpenWeatherMap API",
        }

    @staticmethod
    def _check_who_limits(components: dict) -> list:
        """
        Check pollutant levels against WHO Air Quality Guidelines (2021).
        Returns list of exceedances for EIA reporting.
        """
        exceedances = []

        # WHO 24-hour guidelines (µg/m³)
        who_limits = {
            "pm2_5": {"limit": 15, "name": "PM2.5", "period": "24-hour"},
            "pm10": {"limit": 45, "name": "PM10", "period": "24-hour"},
            "no2": {"limit": 25, "name": "NO₂", "period": "24-hour"},
            "so2": {"limit": 40, "name": "SO₂", "period": "24-hour"},
            "co": {"limit": 4000, "name": "CO", "period": "24-hour"},
            "o3": {"limit": 100, "name": "O₃", "period": "8-hour"},
        }

        for key, info in who_limits.items():
            value = components.get(key, 0)
            if value and value > info["limit"]:
                exceedances.append({
                    "pollutant": info["name"],
                    "measured": round(value, 1),
                    "who_limit": info["limit"],
                    "period": info["period"],
                    "exceedance_factor": round(value / info["limit"], 2),
                })

        return exceedances
