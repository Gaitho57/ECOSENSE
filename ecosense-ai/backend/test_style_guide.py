import os
import sys
import django
from pathlib import Path

# Setup Django environment
sys.path.append("/home/home/Desktop/EIA/ECOSENSE/ecosense-ai/backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from apps.predictions.ml.engine import PredictionEngine

def test_engine_style_guide():
    engine = PredictionEngine()
    if engine.style_guide:
        print("✅ Style Guide loaded successfully.")
        print(f"Report Count: {engine.style_guide.get('report_count')}")
        print(f"Standard Structure: {engine.style_guide.get('standard_structure')}")
    else:
        print("❌ Style Guide not found or failed to load.")

if __name__ == "__main__":
    test_engine_style_guide()
