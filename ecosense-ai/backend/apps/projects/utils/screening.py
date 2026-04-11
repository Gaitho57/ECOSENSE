"""
EcoSense AI — NEMA Screening Engine.

Provides automated risk categorization for Kenyan EIA projects based on
statutory thresholds defined in Legal Notice 31/32 of 2019.
"""

from decimal import Decimal

def screen_project(project_type: str, scale: Decimal) -> dict:
    """
    Returns the NEMA category and a risk score calculation detail.
    """
    category = "medium"  # Default
    reason = "Standard classification"
    
    # 1. High Risk (Full EIA Study)
    if project_type in ["mining", "dam", "chemical_plant", "petroleum", "heavy_industry"]:
        category = "high"
        reason = "Statutory High-Risk sector (Schedule 2)"
    
    # Scale-based overrides
    elif project_type == "residential":
        if scale > 100:
             category = "high"
             reason = "Large-scale urban development (> 100 units)"
        elif scale > 10:
             category = "medium"
             reason = "Medium-scale housing"
        else:
             category = "low"
             reason = "Small-scale residential (SPR)"
             
    elif project_type == "hotel":
        if scale > 150:
             category = "high"
             reason = "Large-scale tourism infrastructure (> 150 beds)"
        else:
             category = "medium"

    elif project_type == "borehole":
        category = "low"
        reason = "Low-risk water infrastructure (SPR)"
        
    elif project_type == "hospital":
        if scale > 50:
             category = "high"
        else:
             category = "medium"

    return {
        "category": category,
        "reason": reason,
        "risk_score": 100 if category == "high" else (50 if category == "medium" else 10)
    }
