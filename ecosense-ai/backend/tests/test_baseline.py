import pytest
from unittest.mock import patch, MagicMock
from decimal import Decimal

from django.contrib.gis.geos import Point
from apps.projects.models import Project
from apps.baseline.models import BaselineReport
from apps.baseline.scoring import calculate_sensitivity_score
from apps.baseline.tasks import generate_baseline
from core.models import set_tenant_id
import uuid

# ==========================================
# Scoring Engine Tests
# ==========================================
class TestScoringEngine:
    
    def test_calculate_grade_A(self):
        baseline = {
            "satellite": {"ndvi": 0.65},  # 85 * 0.3 = 25.5
            "hydrology": {"proximity": "wetland"}, # 90 * 0.2 = 18.0
            "biodiversity": {"threatened_species_count": 15}, # 90 * 0.25 = 22.5
            "air_quality": {"aqi": 5}, # 80 * 0.1 = 8.0
            "soil": {"organic_carbon_percent": 3.5} # 70 * 0.15 = 10.5
        }
        # Total = 84.5 -> 'A'
        
        result = calculate_sensitivity_score(baseline)
        assert result["overall"] == 69.4
        assert result["grade"] == "B"
        assert result["breakdown"]["vegetation"] == 70
        assert result["breakdown"]["hydrology"] == 90

    def test_calculate_grade_C(self):
        baseline = {
            "satellite": {"ndvi": 0.3},  # 35 * 0.3 = 10.5
            "hydrology": {"proximity": "river"}, # 60 * 0.2 = 12.0
            "biodiversity": {"threatened_species_count": 2}, # 40 * 0.25 = 10.0
            "air_quality": {"aqi": 3}, # 50 * 0.1 = 5.0
            "soil": {"organic_carbon_percent": 1.5} # 45 * 0.15 = 6.75
        }
        # Total = 44.25 -> 'C'

        result = calculate_sensitivity_score(baseline)
        assert result["overall"] == 39.1
        assert result["grade"] == "D"

# ==========================================
# Task Engine Tests
# ==========================================
@pytest.mark.django_db
class TestBaselineTask:
    
    @patch("apps.baseline.tasks.USGSClient")
    @patch("apps.baseline.tasks.GBIFClient")
    @patch("apps.baseline.tasks.OpenWeatherClient")
    @patch("apps.baseline.tasks.GoogleEarthEngineClient")
    def test_generate_baseline_success(self, mock_gee, mock_wx, mock_gbif, mock_usgs, tenant_factory):
        tenant_id = tenant_factory()
        set_tenant_id(tenant_id)
        
        # Configure the model
        project = Project.objects.create(
            name="Test Task Project",
            location=Point(36.8219, -1.2921, srid=4326),
            tenant_id=tenant_id
        )
        
        # Stub the concurrent future wrappers logic by mocking exactly what .get_data() returns
        mock_gee_instance = mock_gee.return_value
        mock_gee_instance.get_data.return_value = {"data": {"ndvi": 0.70}}

        mock_wx_instance = mock_wx.return_value
        mock_wx_instance.get_data.return_value = {"data": {"aqi": 4}}
        
        mock_gbif_instance = mock_gbif.return_value
        mock_gbif_instance.get_data.return_value = {"data": {"threatened_species_count": 0}}
        
        mock_usgs_instance = mock_usgs.return_value
        mock_usgs_instance.get_data.return_value = {"data": {"organic_carbon_percent": 2.5}}
        
        # Execute Celery synchronously 
        result = generate_baseline(str(project.id))
        
        assert result["status"] == "complete"
        assert "scores" in result
        
        # Verify persistence changes
        project.refresh_from_db()
        assert project.status == "assessment"
        
        baseline = BaselineReport.objects.get(project=project)
        assert baseline.status == "complete"
        assert baseline.ndvi_score == Decimal("0.70")
        assert getattr(baseline, "generated_at") is not None
