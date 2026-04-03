"""
API routes resolving to /api/v1/projects/{project_id}/ Predictions bounds natively mapped matching previous architectures.
"""

from django.urls import path
from apps.predictions.views import (
     RunPredictionView, ProjectPredictionsView, ProjectScenariosView,
     DispersionSimulationView, FloodSimulationView
)

app_name = "predictions"

urlpatterns = [
    path('<uuid:project_id>/run-prediction/', RunPredictionView.as_view(), name='run_prediction'),
    path('<uuid:project_id>/predictions/', ProjectPredictionsView.as_view(), name='project_predictions'),
    path('<uuid:project_id>/scenarios/', ProjectScenariosView.as_view(), name='project_scenarios'),
    path('<uuid:project_id>/simulations/dispersion/', DispersionSimulationView.as_view(), name='sim_dispersion'),
    path('<uuid:project_id>/simulations/flood/', FloodSimulationView.as_view(), name='sim_flood'),
]
