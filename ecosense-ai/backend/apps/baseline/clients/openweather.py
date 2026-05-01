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
        self.base_url_air = "https://air-quality-api.open-meteo.com/v1/air-quality"
        self.base_url_weather = "https://api.open-meteo.com/v1/forecast"

    @retry_api_call(max_retries=3, delay=2)
    def get_data(self, lat: float, lng: float, radius_km: int = 10) -> dict:
        """
        Fetch comprehensive air quality and weather attributes from Open-Meteo.
        """
        params_air = {
            "latitude": lat,
            "longitude": lng,
            "current": "european_aqi,pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,ozone"
        }

        # ---- 1. Air Pollution Data ----
        air_resp = requests.get(self.base_url_air, params=params_air, timeout=10)
        air_resp.raise_for_status()
        air_json = air_resp.json()

        current_air = air_json.get("current", {})
        aqi = current_air.get("european_aqi", 1)
        # Scale European AQI (0-100) down to 1-5 scale for UI compatibility
        scaled_aqi = min(5, max(1, int((aqi / 20) + 1)))

        components = {
            "pm2_5": current_air.get("pm2_5", 0.0),
            "pm10": current_air.get("pm10", 0.0),
            "no2": current_air.get("nitrogen_dioxide", 0.0),
            "so2": current_air.get("sulphur_dioxide", 0.0),
            "co": current_air.get("carbon_monoxide", 0.0),
            "o3": current_air.get("ozone", 0.0),
        }

        # ---- 2. Current Weather Data ----
        params_wx = {
            "latitude": lat,
            "longitude": lng,
            "current": "temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code"
        }
        wx_resp = requests.get(self.base_url_weather, params=params_wx, timeout=10)
        wx_resp.raise_for_status()
        wx_json = wx_resp.json()

        current_wx = wx_json.get("current", {})

        # ---- 3. Build comprehensive response ----
        return {
            # Air Quality Index
            "aqi": scaled_aqi,
            "aqi_label": AQI_LABELS.get(scaled_aqi, "Unknown"),

            # Primary pollutants (µg/m³)
            "pm2_5": components.get("pm2_5", 0.0),
            "pm10": components.get("pm10", 0.0),
            "no2": components.get("no2", 0.0),
            "so2": components.get("so2", 0.0),
            "co": components.get("co", 0.0),
            "o3": components.get("o3", 0.0),
            "nh3": 0.0,
            "no": 0.0,

            # WHO guideline exceedances
            "who_exceedances": self._check_who_limits(components),

            # Wind
            "wind_speed_ms": current_wx.get("wind_speed_10m", 0.0) / 3.6, # km/h to m/s
            "wind_direction_deg": current_wx.get("wind_direction_10m", 0),
            "wind_gust_ms": current_wx.get("wind_gusts_10m", 0.0) / 3.6 if current_wx.get("wind_gusts_10m") else None,

            # Temperature & Humidity
            "temperature_c": current_wx.get("temperature_2m", 0),
            "feels_like_c": current_wx.get("apparent_temperature", 0),
            "humidity_percent": current_wx.get("relative_humidity_2m", 0),
            "pressure_hpa": current_wx.get("surface_pressure", 0),

            # Current conditions
            "weather_description": f"WMO Code {current_wx.get('weather_code', 0)}",
            "visibility_m": 10000,

            "source": "Open-Meteo API",
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
