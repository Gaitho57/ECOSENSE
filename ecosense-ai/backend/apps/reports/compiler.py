"""
EcoSense AI — Data Compiler.

Aggregates structured properties globally translating deeply nested variables bridging standard templating capabilities smoothly.
"""

from django.utils import timezone
from apps.projects.models import Project
from apps.baseline.models import BaselineReport
from apps.predictions.models import ImpactPrediction
from apps.community.models import CommunityFeedback

def compile_report_data(project_id: str) -> dict:
    """
    Builds the massive structured context array resolving parameters seamlessly safely catching missing modules.
    """
    project = Project.objects.get(id=project_id)
    
    # Baseline
    try:
        baseline = BaselineReport.objects.get(project=project)
        ndv = baseline.satellite_data.get("ndvi", "N/A") if baseline.satellite_data else "N/A"
        air = baseline.air_quality_baseline.get("aqi", "N/A") if baseline.air_quality_baseline else "N/A"
        bio = baseline.biodiversity_data.get("total_species_count", "N/A") if baseline.biodiversity_data else "N/A"
        soil = baseline.soil_data.get("soil_type", "N/A") if baseline.soil_data else "N/A"
        grade = baseline.sensitivity_scores.get("grade", "N/A") if baseline.sensitivity_scores else "N/A"
    except BaselineReport.DoesNotExist:
        ndv = air = bio = soil = grade = "Data Missing"

    # Predictions
    preds = ImpactPrediction.objects.filter(project=project, scenario_name="baseline").order_by("-probability")
    predictions_data = []
    for p in preds:
         predictions_data.append({
              "category": p.category.title(),
              "severity": p.severity.upper(),
              "probability": float(p.probability),
              "top_mitigations": p.mitigation_suggestions[:3] if p.mitigation_suggestions else ["Monitor structural integrity continuously."]
         })

    # Community
    feedback = CommunityFeedback.objects.filter(project=project)
    sentiment_map = {"positive": 0, "neutral": 0, "negative": 0}
    cat_counts = {}
    quotes = []

    for f in feedback:
         if f.sentiment in sentiment_map:
             sentiment_map[f.sentiment] += 1
         for c in f.categories:
             cat_counts[c] = cat_counts.get(c, 0) + 1
         if len(quotes) < 5 and f.raw_text:
             quotes.append(f.raw_text)

    top_concerns = sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)[:3]
    top_concerns_list = [c[0].title() for c in top_concerns]

    # Compliance Mock Data since proper compliance app handles this in other tasks
    compliance_list = [
        {"name": "EMCA Act 1999", "status": "Applicable"},
        {"name": "Water Quality Regulations 2006", "status": "Applicable"},
        {"name": "Noise and Excessive Vibration Control", "status": "Applicable"}
    ]

    return {
        "project": {
            "name": project.name,
            "type": getattr(project, "project_type", "Infrastructure").title(),
            "scale_ha": getattr(project, "scale_ha", 500.0),
            "location": f"LAT: {project.location.y if project.location else 'N/A'}, LNG: {project.location.x if project.location else 'N/A'}",
            "date": timezone.now().strftime("%B %d, %Y"),
            "lead_consultant": "EcoSense Automation Engine"
        },
        "baseline": {
            "ndvi": ndv,
            "air_quality_aqi": air,
            "biodiversity_summary": f"{bio} Species Logged",
            "soil_type": soil,
            "sensitivity_grade": grade
        },
        "predictions": predictions_data,
        "community": {
            "total_count": feedback.count(),
            "sentiment_breakdown": sentiment_map,
            "top_concerns": top_concerns_list,
            "sample_quotes": quotes
        },
        "compliance": compliance_list,
        "maps": {
             "placeholder_img": "https://upload.wikimedia.org/wikipedia/commons/e/e4/Globe.png"
        }
    }
