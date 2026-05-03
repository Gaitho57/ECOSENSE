import pytest
from unittest.mock import patch, MagicMock
from requests.exceptions import Timeout, RequestException

from apps.baseline.clients import (
    GoogleEarthEngineClient,
    OpenWeatherClient,
    GBIFClient,
    USGSClient,
)

# ==========================================
# Google Earth Engine Tests
# ==========================================
class TestGoogleEarthEngineClient:

    @patch("apps.baseline.clients.google_earth_engine.ee")
    def test_gee_success(self, mock_ee):
        client = GoogleEarthEngineClient()
        # The true get_data involves EE methods mapped internally.
        # As long as it succeeds natively, it should return dict mapping
        result = client.get_data(lat=-1.2921, lng=36.8219)
        
        assert "data" in result
        data = result["data"]
        assert data is not None
        assert "ndvi" in data
        assert "land_cover_class" in data
        assert "tree_cover_percent" in data

    @patch("apps.baseline.clients.google_earth_engine.ee.Geometry.Point")
    def test_gee_error(self, mock_point):
        # Force an exception to trigger the retry/error boundary
        mock_point.side_effect = Exception("GEE quota exceeded")
        client = GoogleEarthEngineClient()
        # Should gracefully fail and return error
        result = client.get_data(lat=-1.2921, lng=36.8219)
        
        assert result["data"] is not None
        assert "Fallback" in result["data"]["source"]


# ==========================================
# OpenWeather Tests
# ==========================================
class TestOpenWeatherClient:

    @pytest.fixture
    def client(self, settings):
        settings.OPENWEATHER_API_KEY = "test_key"
        return OpenWeatherClient()

    @patch("apps.baseline.clients.openweather.requests.get")
    def test_openweather_success(self, mock_get, client):
        # Mocking 2 HTTP calls: air pollution and weather
        mock_resp_air = MagicMock()
        mock_resp_air.json.return_value = {
            "current": {"pm2_5": 12.5, "pm10": 15.0, "nitrogen_dioxide": 20.0, "european_aqi": 40}
        }
        
        mock_resp_wx = MagicMock()
        mock_resp_wx.json.return_value = {
            "current": {"wind_speed_10m": 16.2, "temperature_2m": 25.0, "weather_code": 1}
        }
        
        mock_get.side_effect = [mock_resp_air, mock_resp_wx]

        result = client.get_data(lat=-1.2921, lng=36.8219)
        
        assert "data" in result
        assert result["data"]["pm2_5"] == 12.5
        assert result["data"]["aqi"] == 3
        assert result["data"]["wind_speed_ms"] == 4.5
        assert "retrieved_at" in result

    @patch("apps.baseline.clients.openweather.requests.get")
    def test_openweather_timeout(self, mock_get, client):
        mock_get.side_effect = Timeout("Connection timed out")
        result = client.get_data(lat=-1.2921, lng=36.8219)
        
        assert result["data"] is None
        assert "Connection timed out" in result["error"]
        assert result["source"] == "OpenWeatherClient"

    @patch("apps.baseline.clients.openweather.requests.get")
    def test_openweather_network_error(self, mock_get, client):
        mock_get.side_effect = RequestException("DNS lookup failed")
        result = client.get_data(lat=-1.2921, lng=36.8219)
        
        assert result["data"] is None
        assert "DNS lookup failed" in result["error"]


# ==========================================
# GBIF Tests
# ==========================================
class TestGBIFClient:

    @patch("apps.baseline.clients.gbif.requests.get")
    def test_gbif_success(self, mock_get):
        def mock_get_request(url, *args, **kwargs):
            mock_resp = MagicMock()
            if "occurrence/search" in url:
                mock_resp.json.return_value = {
                    "results": [
                        {"species": "Test Species A", "speciesKey": 1, "class": "Aves"},
                        {"species": "Test Species B", "speciesKey": 2, "class": "Mammalia"}
                    ]
                }
            else:
                if url.endswith("/1") or url.endswith("/1/iucnRedListCategory"):
                    mock_resp.json.return_value = {"category": "VU", "iucnRedListCategory": "VU"}
                else:
                    mock_resp.json.return_value = {"category": "LC", "iucnRedListCategory": "LC"}
            mock_resp.status_code = 200
            return mock_resp
            
        mock_get.side_effect = mock_get_request

        client = GBIFClient()
        result = client.get_data(lat=-1.2921, lng=36.8219)
        
        data = result["data"]
        assert data["total_species_count"] == 2
        assert data["threatened_species_count"] == 1
        assert len(data["species_list"]) == 2

    @patch("apps.baseline.clients.gbif.requests.get")
    def test_gbif_timeout(self, mock_get):
        mock_get.side_effect = Timeout("Timeout")
        client = GBIFClient()
        result = client.get_data(lat=-1.2921, lng=36.8219)
        assert result["data"] is None
        assert "Timeout" in result["error"]


# ==========================================
# USGS Tests
# ==========================================
class TestUSGSClient:

    @patch("apps.baseline.clients.usgs.requests.get")
    def test_usgs_success(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "properties": {
                "layers": [
                    {"name": "phh2o", "depths": [{"values": {"mean": 65}}]}, # pH 6.5
                    {"name": "sand", "depths": [{"values": {"mean": 700}}]}, # 70% sand
                ]
            }
        }
        mock_get.return_value = mock_resp

        client = USGSClient()
        result = client.get_data(lat=-1.2921, lng=36.8219)
        
        data = result["data"]
        assert data["ph_level"] == 6.5
        assert data["sand_percent"] == 70.0
        assert data["erosion_risk"] in ["medium", "high", "very_high"]

    @patch("apps.baseline.clients.usgs.requests.get")
    def test_usgs_network_error(self, mock_get):
        mock_get.side_effect = RequestException("Network Error")
        client = USGSClient()
        result = client.get_data(lat=-1.2921, lng=36.8219)
        assert result["data"] is not None
        assert result["data"]["source"] == "ISRIC SoilGrids v2.0"
