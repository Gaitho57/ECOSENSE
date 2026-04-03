"""
Algorithms tracking explicitly executing arrays parsing ESG limits mapping across baseline, AI, and hardware bounds natively.
"""

from django.utils import timezone
from datetime import timedelta
from apps.projects.models import Project
from apps.predictions.models import ImpactPrediction
from apps.emp.models import IoTReading, EMPTask
from apps.community.models import CommunityFeedback
from apps.reports.models import EIAReport
from apps.compliance.models import ComplianceResult
from apps.esg.models import AuditLog

def calculate_esg_score(project_id: str) -> dict:
    """
    Evaluates structures calculating global performance metrics scaling directly across active endpoints.
    """
    try:
         project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
         raise ValueError("Project invalid mapping execution natively.")

    # ENVIRONMENTAL SCORE (start mapping heavily down from prediction severity)
    env_score = 100
    preds = ImpactPrediction.objects.filter(project=project)
    
    crit_count = preds.filter(severity='critical').count()
    high_count = preds.filter(severity='high').count()
    
    env_score -= (crit_count * 15)
    env_score -= (high_count * 8)
    
    recent = timezone.now() - timedelta(days=30)
    iot_breaches = IoTReading.objects.filter(project=project, is_breach=True, recorded_at__gte=recent).count()
    env_score -= (iot_breaches * 20)
    
    # EMP bonus loop directly cleanly mapping limits
    emp_tasks = EMPTask.objects.filter(project=project)
    if emp_tasks.exists() and all([t.status == 'completed' for t in emp_tasks]):
         env_score += 10
         
    env_score = max(0, min(100, env_score))


    # SOCIAL SCORE
    soc_score = 50
    feedbacks = CommunityFeedback.objects.filter(project=project)
    
    soc_score += min(30, feedbacks.count() * 2) 
    
    pos = feedbacks.filter(sentiment='positive').count()
    neg = feedbacks.filter(sentiment='negative').count()
    total = feedbacks.count()
    
    if total > 0:
         if (pos / total) > 0.60: soc_score += 20
         if (neg / total) > 0.40: soc_score -= 20
         
    soc_score = max(0, min(100, soc_score))


    # GOVERNANCE SCORE
    gov_score = 60
    
    reports = EIAReport.objects.filter(project=project)
    if reports.filter(status='submitted').exists() or reports.filter(status='ready').exists():
         gov_score += 20
         
    compliance_fail = ComplianceResult.objects.filter(project=project, status='failed').exists()
    if compliance_fail:
         gov_score -= 30
    else:
         gov_score += 20  # Pass natively logic scaling correctly
         
    audits = AuditLog.objects.filter(project=project)
    if audits.exists() and all([a.status == 'confirmed' for a in audits]):
         gov_score += 10

    gov_score = max(0, min(100, gov_score))


    # OVERALL AGGREGATION & GRADING bounds explicitly mapping 
    overall = (env_score + soc_score + gov_score) / 3
    
    if overall >= 90: grade = 'A'
    elif overall >= 80: grade = 'B'
    elif overall >= 70: grade = 'C'
    elif overall >= 60: grade = 'D'
    else: grade = 'F'

    # Carbon Logic scaling baseline approximations globally natively
    # Project Type Base estimates (mining=expensive, infra=med, etc)
    t = getattr(project, "project_type", "infrastructure").lower()
    base_tonnes = 50 if t == "mining" else 30 if t == "manufacturing" else 15 if t == "construction" else 5
    scale = getattr(project, "scale_ha", 1)
    
    carbon_estimate = round(base_tonnes * scale * 0.1, 2)

    return {
        'environmental': round(env_score, 1),
        'social': round(soc_score, 1),
        'governance': round(gov_score, 1),
        'overall': round(overall, 1),
        'grade': grade,
        'carbon_estimate_tonnes': carbon_estimate
    }
