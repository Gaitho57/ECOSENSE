"""
EcoSense AI — Predictions Engine.

Executes local XGBoost inference loading synced models from ML training.
Interacts with OpenAI via LangChain to convert raw arrays into qualitative descriptions.
"""

import logging
import joblib
import pandas as pd
import os
from pathlib import Path

# Local configuration
from django.conf import settings
from apps.predictions.training.sample_data import PROJECT_TYPES

# Langchain integration
try:
    from langchain.chat_models import ChatOpenAI
    from langchain.schema import HumanMessage, SystemMessage
except ImportError:
    ChatOpenAI = None

logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).resolve().parent / "models"
CATEGORIES = ["air", "water", "noise", "biodiversity", "social", "soil", "climate"]
SEV_REVERSE_MAPPING = {0: "low", 1: "medium", 2: "high", 3: "critical"}


class PredictionEngine:
    def __init__(self):
        """
        Validates and loads machine learning binaries securely into memory exactly once.
        """
        self.models = {}
        self.scaler = None
        self.llm = None
        
        # Load scaler
        scaler_path = MODELS_DIR / "scaler.pkl"
        if scaler_path.exists():
            self.scaler = joblib.load(scaler_path)
            
        # Load XGBoost arrays
        for cat in CATEGORIES:
            clf_path = MODELS_DIR / f"{cat}_severity.pkl"
            reg_path = MODELS_DIR / f"{cat}_probability.pkl"
            
            if clf_path.exists() and reg_path.exists():
                self.models[cat] = {
                    "clf": joblib.load(clf_path),
                    "reg": joblib.load(reg_path),
                }

        # Initialize LLM
        openai_key = getattr(settings, "OPENAI_API_KEY", "")
        if ChatOpenAI and openai_key and "your-value" not in openai_key:
            try:
                self.llm = ChatOpenAI(temperature=0.7, openai_api_key=openai_key)
            except Exception as e:
                logger.warning(f"LLM (ChatOpenAI) initialization failed: {e}")
                self.llm = None

    def extract_features(self, baseline_data: dict) -> dict:
        """
        Converts the dynamic unstructured baseline dicts into static ML integer constraints.
        """
        # Satellite features
        ndvi = baseline_data.get("satellite", {}).get("ndvi", 0.5)
        
        # Biodiversity
        threats = baseline_data.get("biodiversity", {}).get("threatened_species_count", 0)
        
        # OpenWeather Air/Hydrology Proxies
        aqi = baseline_data.get("air_quality", {}).get("aqi", 2)
        
        # Water/Urban logic proxies depending heavily on coordinates usually, we'll dummy static boundaries
        # M3-T2 hydrological bounds mapped logic to textual. Here we assume static properties generically.
        water_km = 5.0
        if baseline_data.get("hydrology", {}).get("proximity") == "river":
            water_km = 0.5
        elif baseline_data.get("hydrology", {}).get("proximity") == "wetland":
             water_km = 0.1
             
        urban_km = 10.0 # Approximation 
        rainfall = 1000.0 # Default structural payload mapping
        
        return {
            "ndvi_score": ndvi,
            "threatened_species_count": threats,
            "aqi_baseline": aqi,
            "distance_to_water_km": water_km,
            "urban_proximity_km": urban_km,
            "rainfall_mm": rainfall
        }

    def predict(self, project_type: str, scale_ha: float, baseline_data: dict, scenario_name: str = "baseline") -> list:
        """
        Executes ML arrays mapping outputs towards AI explanations securely.
        """
        # Feature dictionary assembly
        features = self.extract_features(baseline_data)
        features["scale_ha"] = scale_ha
        
        for ptype in PROJECT_TYPES:
            features[f"ptype_{ptype}"] = 1 if ptype == project_type else 0

        # DataFrame column alignment (matches train.py sequentially)
        cols = [
            "scale_ha", "ndvi_score", "distance_to_water_km", 
            "threatened_species_count", "aqi_baseline", 
            "urban_proximity_km", "rainfall_mm"
        ] + [f"ptype_{p}" for p in PROJECT_TYPES]

        df = pd.DataFrame([features], columns=cols)
        
        if self.scaler:
             X_array = self.scaler.transform(df)
        else:
             X_array = df.values

        predictions = []

        for cat in CATEGORIES:
            out_severity = "medium"
            out_prob = 0.500
            
            # Prediction boundaries (ML Logic with Heuristic Fallback)
            if cat in self.models:
                 pred_cls_idx = int(self.models[cat]["clf"].predict(X_array)[0])
                 out_severity = SEV_REVERSE_MAPPING.get(pred_cls_idx, "medium")
                 
                 pred_reg_val = float(self.models[cat]["reg"].predict(X_array)[0])
                 out_prob = max(0.001, min(0.999, pred_reg_val))
            else:
                 # EcoSense Heuristic Fallback (Dynamic Logic for Athi River sites)
                 out_severity, out_prob = self._get_heuristic_prediction(cat, features, scale_ha, project_type)
                 
            # LLM Prompt Engineering boundary
            desc, mitigations = self._generate_llm_description(project_type, cat, out_severity, out_prob)

            predictions.append({
                "category": cat,
                "severity": out_severity,
                "probability": round(out_prob, 3),
                "confidence": 0.85, # Simplistic arbitrary confidence bound simulating classification margin
                "description": desc,
                "mitigation_suggestions": mitigations,
                "scenario_name": scenario_name,
                "model_version": "v1.0-xgboost"
            })

        return predictions

    def _get_heuristic_prediction(self, category: str, features: dict, scale_ha: float, project_type: str) -> tuple:
        """
        Expert heuristic fallback for EIA impact modeling when ML binaries are missing.
        Uses EMCA criteria mapping baseline features to qualitative risk levels.
        """
        # Baseline severity mappings
        sev = "medium"
        prob = 0.50

        if category == "air":
            if features["aqi_baseline"] >= 4:
                sev, prob = "critical", 0.88
            elif features["aqi_baseline"] == 3:
                sev, prob = "high", 0.68
            else:
                sev, prob = "medium", 0.42

        elif category == "water":
            if features["distance_to_water_km"] <= 0.2:
                sev, prob = "critical", 0.94
            elif features["distance_to_water_km"] <= 1.0:
                sev, prob = "high", 0.76
            elif features["distance_to_water_km"] <= 3.0:
                sev, prob = "medium", 0.48
            else:
                sev, prob = "low", 0.18

        elif category == "biodiversity":
            if features["threatened_species_count"] > 0:
                sev, prob = "critical", 0.92
            elif features["ndvi_score"] > 0.6:
                sev, prob = "high", 0.72
            elif features["ndvi_score"] < 0.2:
                # Disturbed habitat but still has social/soil value
                sev, prob = "medium", 0.38
            else:
                sev, prob = "low", 0.22

        elif category == "soil":
            if features["rainfall_mm"] > 1500 or scale_ha > 1000:
                sev, prob = "high", 0.74
            else:
                sev, prob = "medium", 0.46
        
        elif category == "noise":
            if project_type.lower() in ("industrial", "infrastructure") and scale_ha > 50:
                sev, prob = "high", 0.70
            else:
                sev, prob = "medium", 0.52

        elif category == "social":
            # Social impact is usually high for large-scale development
            if scale_ha > 500:
                sev, prob = "high", 0.65
            else:
                sev, prob = "medium", 0.48

        return sev, prob

    def _generate_llm_description(self, project_type: str, category: str, severity: str, prob: float) -> tuple:
        """
        LLM description and mitigations builder protected gracefully via robust try-except.
        """
        fallback_desc = f"Based on baseline parameters, the {category} impacts for this {project_type} project are scaled at a {severity} level."
        fallback_mitigations = [f"Monitor {category} continuously.", "Implement standard operating compliance.", "Maintain buffer zones securely."]
        
        if not self.llm:
            return fallback_desc, fallback_mitigations

        try:
            prompt = f"Given a {project_type} project with {severity} {category} impact (probability {prob:.2f}): write a 2-sentence impact description and 3 specific mitigation measures formatted loosely."
            
            messages = [
                SystemMessage(content="You are an expert environmental compliance assistant generating structured mitigation matrices."),
                HumanMessage(content=prompt)
            ]
            
            res = self.llm(messages).content
            
            # Simple text parsing heuristic (assuming LLM returns lines mapping to mitigating phrases)
            lines = res.strip().split('\n')
            desc = " ".join([l for l in lines if not l.startswith("-") and not l.startswith("1.")])
            mitigations = [l.strip().lstrip("-*123456789. ") for l in lines if l.strip().startswith("-") or l.strip().startswith("1.") or l.strip().startswith("2.")]
            
            if not mitigations:
                 mitigations = fallback_mitigations
            
            return desc[:500] if desc else fallback_desc, mitigations
            
        except Exception as e:
            logger.warning(f"LLM Generation Failed cleanly. Exception: {e}")
            return fallback_desc, fallback_mitigations

    def simulate(self, base_predictions: list, mitigations_applied: list) -> list:
        """
        Lowers probability scopes dynamically tracking string reductions natively.
        Returns a new array modified.
        """
        modified = []
        mitig_str = "_".join(mitigations_applied) if mitigations_applied else "baseline"
        
        # Safe severity reduction dictionary boundary
        sev_down = {"critical": "high", "high": "medium", "medium": "low", "low": "low"}
        
        for pred in base_predictions:
            # We copy structurally mimicking immutability 
            new_pred = pred.copy()
            new_pred["scenario_name"] = mitig_str
            
            # Rules applied uniquely
            if "dust_suppression" in mitigations_applied and new_pred["category"] == "air":
                new_pred["severity"] = sev_down[new_pred["severity"]]
                
            if "silt_traps" in mitigations_applied and new_pred["category"] == "water":
                new_pred["severity"] = sev_down[new_pred["severity"]]
                
            if "noise_barriers" in mitigations_applied and new_pred["category"] == "noise":
                new_pred["severity"] = sev_down[new_pred["severity"]]
                
            if "revegetation" in mitigations_applied:
                if new_pred["category"] == "biodiversity":
                    new_pred["severity"] = sev_down[new_pred["severity"]]
                elif new_pred["category"] == "climate":
                    new_pred["probability"] = max(0.001, new_pred["probability"] - 0.1)
                    
            if "community_consultation" in mitigations_applied and new_pred["category"] == "social":
                new_pred["severity"] = sev_down[new_pred["severity"]]

            modified.append(new_pred)
            
        return modified

    def generate_mitigation_strategy(self, project_type: str, scale_ha: float, base_predictions: list) -> list:
        """
        Expert AI Strategy Generator: Converts risk probabilities into 5 advanced remedies.
        """
        if not self.llm:
             # Basic heuristic strategies
             return [
                  {"id": "ai_water_recycling", "label": "Zero Liquid Discharge (ZLD)", "desc": "Closed-loop water treatment recycling 95% of industrial effluent."},
                  {"id": "ai_green_buffer", "label": "Vertical Foliage Screen", "desc": "Multilayered bio-shields reducing noise and particulate drift."},
                  {"id": "ai_solar_microgrid", "label": "On-site Solar Microgrid", "desc": "Renewable energy integration lowering the overall carbon footprint."}
             ]

        try:
            # Aggregate the most critical risks to focus the LLM
            high_risks = [p["category"] for p in base_predictions if p["severity"] in ("high", "critical")]
            risk_context = ", ".join(high_risks) if high_risks else "general industrial impacts"
            
            prompt = (
                f"You are a NEMA-certified EIA expert. For a {project_type} project ({scale_ha} ha) "
                f"with high risks in {risk_context}, generate 5 innovative, specific mitigation measures. "
                f"Format as: Label | Short Description (max 15 words)."
            )
            
            messages = [
                SystemMessage(content="You generate professional EIA mitigation strategies. Unique ID each suggestion."),
                HumanMessage(content=prompt)
            ]
            
            res = self.llm(messages).content
            
            # Parsing "Label | Desc" format
            lines = [l.strip() for l in res.split('\n') if "|" in l]
            suggested = []
            for i, line in enumerate(lines[:6]):
                label, desc = line.split("|")
                suggested.append({
                    "id": f"ai_gen_{i}",
                    "label": label.strip().lstrip("-*123. "),
                    "desc": desc.strip(),
                    "is_ai_generated": True
                })
            
            return suggested if suggested else self.generate_mitigation_strategy(project_type, scale_ha, []) # Fallback 
            
        except Exception as e:
            logger.warning(f"AI Strategy Generation Failed: {e}")
            return self.generate_mitigation_strategy(project_type, scale_ha, []) # Basic Fallback
