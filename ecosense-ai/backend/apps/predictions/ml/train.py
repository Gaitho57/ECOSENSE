"""
EcoSense AI — ML Training Script.

Trains the per-category XGBoost severity classifiers and probability regressors
used by the prediction engine, and writes them to ``ml/models/``.

DATA SOURCES (in priority order):
  1. A real labelled dataset — set the environment variable ``EIA_TRAINING_CSV``
     to the path of a CSV with the same columns as ``sample_data`` plus the
     ``<category>_severity`` label columns. USE THIS FOR PRODUCTION.
  2. A rules-bootstrapped synthetic set (the default) — deterministic, seeded,
     and derived from documented Kenyan EIA heuristics. This lets the pipeline
     run end-to-end before you have a labelled corpus, but the resulting model
     only approximates the built-in expert rules. It is NOT a substitute for a
     model trained on real assessment outcomes.

Probability targets are derived DETERMINISTICALLY from severity + feature
intensity (never random), so the regressor learns a real, reproducible signal.
"""

import os
import json
import joblib
import pandas as pd
from datetime import datetime

import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, r2_score

# Because this runs standalone or via django shell, we adjust paths
import sys
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
sys.path.append(str(BASE_DIR))

from apps.predictions.training.sample_data import SAMPLE_DATA, PROJECT_TYPES, SEVERITY_LEVELS

# We ensure output targets exist
MODELS_DIR = Path(__file__).resolve().parent / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

CATEGORIES = ["air", "water", "noise", "biodiversity", "social", "soil", "climate"]

def load_dataset():
    """Load a real labelled CSV if EIA_TRAINING_CSV is set, else the bootstrap set."""
    csv_path = os.environ.get("EIA_TRAINING_CSV")
    if csv_path and os.path.exists(csv_path):
        print(f"Loading REAL labelled dataset from {csv_path} ...")
        return pd.read_csv(csv_path), "real"
    print(
        "No EIA_TRAINING_CSV provided — using rules-bootstrapped synthetic data.\n"
        "  (The trained model will approximate the built-in expert rules only.\n"
        "   Set EIA_TRAINING_CSV to a real labelled corpus for production models.)"
    )
    return pd.DataFrame(SAMPLE_DATA), "bootstrap"


# Deterministic probability targets: severity band midpoint, nudged by feature
# intensity. No randomness, so the regressor learns a reproducible signal.
_SEV_PROB_BAND = {
    "low": (0.10, 0.35),
    "medium": (0.36, 0.65),
    "high": (0.66, 0.89),
    "critical": (0.90, 0.99),
}


def _intensity(row) -> float:
    """A 0..1 intensity proxy from scale + proximity + threats (deterministic)."""
    scale = min(float(row.get("scale_ha", 0)) / 5000.0, 1.0)
    water = 1.0 - min(float(row.get("distance_to_water_km", 50)) / 50.0, 1.0)
    threat = min(float(row.get("threatened_species_count", 0)) / 25.0, 1.0)
    return round((scale + water + threat) / 3.0, 4)


def _deterministic_probability(severity: str, intensity: float) -> float:
    lo, hi = _SEV_PROB_BAND.get(severity, (0.4, 0.6))
    return round(lo + (hi - lo) * intensity, 4)


def run_training():
    df, source = load_dataset()

    # 1. Feature Engineering
    # One-hot encode the project types explicitely based on known classes securely
    # Doing it manually ensures the scaler pipeline never misses a project type
    for ptype in PROJECT_TYPES:
        df[f"ptype_{ptype}"] = (df["project_type"] == ptype).astype(int)

    feature_cols = [
        "scale_ha", "ndvi_score", "distance_to_water_km", 
        "threatened_species_count", "aqi_baseline", 
        "urban_proximity_km", "rainfall_mm"
    ] + [f"ptype_{p}" for p in PROJECT_TYPES]

    X = df[feature_cols].copy()

    # Scaling
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Save scaler
    joblib.dump(scaler, MODELS_DIR / "scaler.pkl")

    metadata = {
        "version": "1.0",
        "training_date": datetime.utcnow().isoformat(),
        "data_source": source,  # "real" or "bootstrap"
        "categories": {}
    }

    print("Beginning XGBoost loops...")

    # Map String severity to Ints for Classifier
    sev_mapping = {"low": 0, "medium": 1, "high": 2, "critical": 3}

    for cat in CATEGORIES:
        sev_col = f"{cat}_severity"
        
        # Classifier target setup
        y_cls = df[sev_col].map(sev_mapping)
        
        # Regressor target: deterministic probability from severity + intensity.
        # Prefer a real "<category>_probability" column if the dataset provides one.
        prob_col = f"{cat}_probability"
        if prob_col in df.columns:
            y_reg = df[prob_col].astype(float)
        else:
            y_reg = df.apply(
                lambda r: _deterministic_probability(r[sev_col], _intensity(r)),
                axis=1,
            )

        # Train/Test Split
        X_train, X_test, y_train_cls, y_test_cls = train_test_split(X_scaled, y_cls, test_size=0.2, random_state=42)
        _, _, y_train_reg, y_test_reg = train_test_split(X_scaled, y_reg, test_size=0.2, random_state=42)

        # Train Classifier
        clf = xgb.XGBClassifier(use_label_encoder=False, eval_metric="mlogloss", random_state=42)
        clf.fit(X_train, y_train_cls)
        preds_cls = clf.predict(X_test)
        acc = accuracy_score(y_test_cls, preds_cls)

        # Train Regressor
        reg = xgb.XGBRegressor(random_state=42)
        reg.fit(X_train, y_train_reg)
        preds_reg = reg.predict(X_test)
        r2 = r2_score(y_test_reg, preds_reg)

        # Save models
        joblib.dump(clf, MODELS_DIR / f"{cat}_severity.pkl")
        joblib.dump(reg, MODELS_DIR / f"{cat}_probability.pkl")

        metadata["categories"][cat] = {
            "classifier_accuracy": float(acc),
            "regressor_r2": float(r2)
        }
        
        print(f"[{cat.upper()}] Accuracy: {acc:.2f} | R2: {r2:.2f}")

    # Save meta
    with open(MODELS_DIR / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
        
    print("Training completely synchronized and saved.")

if __name__ == "__main__":
    run_training()
