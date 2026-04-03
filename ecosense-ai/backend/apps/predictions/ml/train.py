"""
EcoSense AI — ML Training Script.

Compiles baseline datasets modeling XGBoost Classifier and Regressors.
Must be run sequentially before engine execution to guarantee mapped .pkl scopes.
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
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

def run_training():
    print("Loading synthetic records...")
    df = pd.DataFrame(SAMPLE_DATA)

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
        "categories": {}
    }

    print("Beginning XGBoost loops...")

    # Map String severity to Ints for Classifier
    sev_mapping = {"low": 0, "medium": 1, "high": 2, "critical": 3}

    for cat in CATEGORIES:
        sev_col = f"{cat}_severity"
        
        # Classifier target setup
        y_cls = df[sev_col].map(sev_mapping)
        
        # Regressor target setup (synthetic probabilities)
        def map_prob(x):
            if x == "low": return np.random.uniform(0.1, 0.35)
            elif x == "medium": return np.random.uniform(0.36, 0.65)
            elif x == "high": return np.random.uniform(0.66, 0.89)
            elif x == "critical": return np.random.uniform(0.90, 0.99)
            return 0.5
            
        y_reg = df[sev_col].apply(map_prob)

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
