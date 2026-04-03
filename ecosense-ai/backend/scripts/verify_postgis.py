#!/usr/bin/env python
"""
EcoSense AI — PostGIS Verification Script.

Verifies that PostGIS is correctly installed and functional by:
1. Creating a test Point at Nairobi coordinates
2. Saving it to the Project model
3. Querying it back using spatial distance filter
4. Printing SUCCESS/FAIL
5. Cleaning up the test record

Usage (inside backend container):
    python scripts/verify_postgis.py
"""

import os
import sys
import uuid

import django

# ===========================================
# Django Setup
# ===========================================

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

# ===========================================
# PostGIS Verification
# ===========================================

from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D

from apps.projects.models import Project
from core.models import set_tenant_id


def verify_postgis():
    """Run PostGIS verification test."""
    print("=" * 50)
    print("EcoSense AI — PostGIS Verification")
    print("=" * 50)

    # Generate a test tenant ID
    test_tenant_id = uuid.uuid4()
    set_tenant_id(test_tenant_id)

    # Nairobi coordinates (lng, lat) — EPSG:4326
    nairobi = Point(36.8219, -1.2921, srid=4326)

    test_project = None
    try:
        # Step 1: Create a test project with a PostGIS Point
        print("\n[1/4] Creating test project at Nairobi coordinates...")
        test_project = Project.objects.create(
            name="PostGIS Verification Test",
            location=nairobi,
            tenant_id=test_tenant_id,
        )
        print(f"  ✓ Created project: {test_project.id}")

        # Step 2: Query using spatial distance filter (within 10km)
        print("\n[2/4] Querying with spatial distance filter (≤10km)...")
        nearby = Project.objects.filter(
            location__distance_lte=(nairobi, D(m=10000)),
        )
        count = nearby.count()
        print(f"  ✓ Found {count} project(s) within 10km of Nairobi")

        # Step 3: Verify the result
        print("\n[3/4] Verifying retrieved project...")
        if count > 0 and nearby.first().id == test_project.id:
            print("  ✓ Project correctly retrieved via spatial query")
            result = "SUCCESS"
        else:
            print("  ✗ Spatial query did not return expected project")
            result = "FAIL"

    except Exception as e:
        print(f"\n  ✗ Error: {e}")
        result = "FAIL"

    finally:
        # Step 4: Clean up
        print("\n[4/4] Cleaning up test data...")
        if test_project:
            test_project.delete()
            print("  ✓ Test project deleted")

    # Final result
    print("\n" + "=" * 50)
    print(f"PostGIS Verification: {result}")
    print("=" * 50)

    return result == "SUCCESS"


if __name__ == "__main__":
    success = verify_postgis()
    sys.exit(0 if success else 1)
