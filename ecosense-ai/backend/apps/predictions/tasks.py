from celery import shared_task
from django.db import transaction

from apps.projects.models import Project
from apps.baseline.models import BaselineReport
from apps.predictions.models import ImpactPrediction
from apps.predictions.ml.engine import PredictionEngine
from apps.esg.tasks import record_audit_event

@shared_task(bind=True)
def run_predictions(self, project_id: str, scenario_params: dict = None):
    # 1. Verification
    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        raise ValueError(f"Project {project_id} not found.")

    try:
        baseline = BaselineReport.objects.get(project=project)
        if baseline.status != "complete":
             raise ValueError("Baseline is not completed yet.")
    except BaselineReport.DoesNotExist:
        raise ValueError(f"No baseline found for project {project_id}.")

    scenario_name = "baseline"
    if scenario_params and scenario_params.get("scenario_name"):
        scenario_name = scenario_params["scenario_name"]

    # 2. Cleanup existing predictions matching constraints
    ImpactPrediction.objects.filter(project=project, scenario_name=scenario_name).delete()

    # 3. Compile dictionary inputs securely
    baseline_data = {
        "satellite": baseline.satellite_data,
        "hydrology": baseline.hydrology_data,
        "biodiversity": baseline.biodiversity_data,
        "air_quality": baseline.air_quality_baseline,
        "soil": baseline.soil_data
    }
    
    ptype = getattr(project, "project_type", "infrastructure")
    scale = getattr(project, "scale_ha", 500.0)

    # 4. Extract
    engine = PredictionEngine()
    
    # Deriving location context from project name or coordinates (simplified logic)
    location_ctx = "Athi River" if "athi" in project.name.lower() else "the specified site"
    if "turkana" in project.name.lower():
         location_ctx = "Turkana"

    predictions = engine.predict(
        ptype, 
        scale, 
        baseline_data, 
        scenario_name=scenario_name,
        project_name=project.name,
        location_name=location_ctx
    )

    # 5. Handle Scenario Mitigations natively replacing prediction objects
    if scenario_params and "mitigations" in scenario_params:
         predictions = engine.simulate(predictions, scenario_params["mitigations"])

    # 6. Bulk Create Records securely inside a transaction to prevent partial mutations
    objs = []
    for pred in predictions:
         objs.append(ImpactPrediction(
             project=project,
             tenant_id=project.tenant_id,
             category=pred["category"],
             severity=pred["severity"],
             probability=pred["probability"],
             confidence=pred["confidence"],
             description=pred["description"],
             significance_score=pred.get("significance_score"),
             significance_label=pred.get("significance_label"),
             impact_pathway=pred.get("impact_pathway"),
             mitigation_suggestions=pred["mitigation_suggestions"],
             model_version=pred["model_version"],
             scenario_name=pred["scenario_name"]
         ))

    with transaction.atomic():
         created_objs = ImpactPrediction.objects.bulk_create(objs)
         
         # 7. Update status map to next phase (Public Feedback)
         project.status = "review"
         project.save(update_fields=["status"])
         
         record_audit_event.delay(
             project_id, 
             "PREDICTION_RUN", 
             {"scenario": scenario_name, "total_impacts": len(created_objs)}
         )
         
         # 8. Return explicitly map count
         return len(created_objs)
