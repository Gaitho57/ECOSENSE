"""
EcoSense AI — Data Compiler.

Aggregates structured properties globally translating deeply nested variables bridging standard templating capabilities smoothly.
"""

from django.utils import timezone
from apps.projects.models import Project
from apps.baseline.models import BaselineReport
from apps.predictions.models import ImpactPrediction
from apps.community.models import CommunityFeedback
from apps.compliance.engine import ComplianceEngine

def compile_report_data(project_id: str) -> dict:
    """
    Builds the massive structured context array resolving parameters seamlessly safely catching missing modules.
    Expands data for professional-grade 20-100 page reports.
    """
    project = Project.objects.get(id=project_id)
    lat, lng = (project.location.y, project.location.x) if project.location else (-1.2921, 36.8219)
    
    # 1. Baseline Exhaustive Mapping
    try:
        baseline = BaselineReport.objects.get(project=project)
        baseline_data = {
            "ndvi": baseline.satellite_data.get("ndvi", "N/A"),
            "air_quality": baseline.air_quality_baseline or {},
            "biodiversity": baseline.biodiversity_data or {},
            "soil": baseline.soil_data or {},
            "climate": baseline.climate_data or {},
            "hydrology": baseline.hydrology_data or {},
            "topography": baseline.topography_data or {},
            "sensitivity_grade": baseline.sensitivity_scores.get("grade", "N/A"),
            "sensitivity_score": baseline.sensitivity_scores.get("overall", 0),
        }
    except BaselineReport.DoesNotExist:
        baseline_data = {"status": "Missing"}

    # 2. Predictions & Every Mitigation Step
    preds = ImpactPrediction.objects.filter(project=project).order_by("-probability")
    predictions_data = []
    for p in preds:
         predictions_data.append({
              "category": p.category.replace("_", " ").title(),
              "severity": p.severity.upper(),
              "probability": float(p.probability),
              "description": p.description,
              "mitigations": p.mitigation_suggestions or ["No specific mitigations identified."]
         })

    # 3. Community Feedback - Full Extraction
    feedback_objs = CommunityFeedback.objects.filter(project=project).order_by("-submitted_at")
    sentiment_map = {"positive": 0, "neutral": 0, "negative": 0}
    detailed_feedback = []

    for f in feedback_objs:
         if f.sentiment in sentiment_map:
             sentiment_map[f.sentiment] += 1
         detailed_feedback.append({
              "date": f.submitted_at.strftime("%Y-%m-%d"),
              "channel": f.channel.upper(),
              "sentiment": f.sentiment.title(),
              "text": f.raw_text,
              "location": f.community_name or "Anonymous"
         })

    # 4. Compliance Audit - Detailed verification section
    engine = ComplianceEngine()
    audit_results = engine.run_check(project_id)

    # 6. Pre-processed Template Context (Simplifying Django Template Logic)
    critical_impacts = [p for p in predictions_data if p["severity"] == "CRITICAL"]
    dominant_sentiment = "Neutral"
    if sentiment_map:
         dominant_sentiment = max(sentiment_map, key=sentiment_map.get).title()
    
    ndvi_val = baseline_data.get("ndvi", 0)
    try:
        ndvi_num = float(ndvi_val)
        ndvi_desc = "Robust" if ndvi_num > 0.5 else "Moderate"
    except (ValueError, TypeError):
        ndvi_desc = "Unknown"

    # Build a static map URL for the cover page
    static_map_url = f"https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/{lng},{lat},12,0/600x400?access_token=pk.placeholder"

    return {
        "project": {
            "id": str(project.id),
            "name": project.name,
            "type": getattr(project, "project_type", "Infrastructure").replace("_", " ").title(),
            "scale_ha": getattr(project, "scale_ha", 0),
            "location_coords": f"LAT: {lat}, LNG: {lng}",
            "date": timezone.now().strftime("%B %d, %Y"),
            "lead_consultant": "EcoSense AI Professional Systems",
            "map_url": static_map_url
        },
        "baseline": {
             **baseline_data,
             "ndvi_interpretation": ndvi_desc,
             "sensitivity_desc": "Extremely High" if baseline_data.get("sensitivity_grade") == "A" else "Moderate"
        },
        "predictions": predictions_data,
        "critical_impact_count": len(critical_impacts),
        "community": {
            "total_count": feedback_objs.count(),
            "sentiment_breakdown": sentiment_map,
            "dominant_sentiment": dominant_sentiment,
            "entries": detailed_feedback
        },
        "audit": audit_results,
        "timestamp": timezone.now().isoformat()
    }

