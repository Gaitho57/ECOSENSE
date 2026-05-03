#!/usr/bin/env python
"""
EcoSense AI — Full End-to-End Simulation & Test Suite.

Simulates the complete EIA workflow:
  1. User Registration & Authentication
  2. Project Creation (3 project types: hospital, borehole, construction)
  3. Baseline Generation
  4. Impact Predictions
  5. Community Feedback Submission
  6. Document Checklist
  7. Public Notice & Public Submission
  8. Site Visit + Field Measurements
  9. Compliance Audit
  10. Report Generation (HTML + DOCX)

Results written to: simulation_report.txt
"""

import os
import sys
import json
import time
import traceback
from datetime import date, timedelta

# ── Django Setup ──────────────────────────────────────────────────────────────
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
os.environ["DATABASE_URL"] = "postgis://ecosense:ecosense_dev@localhost:5434/ecosense"

import django
django.setup()

# ── Now safe to import models ─────────────────────────────────────────────────
from django.contrib.gis.geos import Point
from django.utils import timezone
from apps.accounts.models import User, Tenant
from apps.projects.models import Project
from apps.baseline.models import BaselineReport
from apps.predictions.models import ImpactPrediction
from apps.community.models import CommunityFeedback
from apps.reports.models import EIAReport
from apps.regulations.models import Regulation, RequiredDocument
from apps.site_visit.models import SiteVisit, FieldMeasurement, PublicSubmission, PublicNotice

# ── Test State ────────────────────────────────────────────────────────────────
PASS = "✅ PASS"
FAIL = "❌ FAIL"
WARN = "⚠️  WARN"
INFO = "ℹ️  INFO"

results = []
errors = []


def log(level, test_name, detail=""):
    msg = f"  {level}  {test_name}"
    if detail:
        msg += f"\n         {detail}"
    results.append(msg)
    print(msg)


def section(title):
    sep = "─" * 60
    msg = f"\n{sep}\n  {title}\n{sep}"
    results.append(msg)
    print(msg)


# ── Scenarios ─────────────────────────────────────────────────────────────────

PROJECTS = [
    {
        "name": "Athi River Oncology Hospital",
        "type": "health_facilities",
        "nema_category": "high",
        "lat": -1.45, "lng": 36.98,
        "scale_ha": 2.5,
        "scale_value": 120,
        "proponent": "Athi Medical Group Ltd",
        "description": "200-bed oncology and cancer treatment facility near Athi River, Machakos County.",
    },
    {
        "name": "Kisumu North Borehole Project",
        "type": "borehole",
        "nema_category": "medium",
        "lat": -0.08, "lng": 34.74,
        "scale_ha": 0.5,
        "scale_value": 15000,
        "proponent": "Lake Basin Water Authority",
        "description": "Community borehole with 15,000 L/day abstraction capacity for 5 villages.",
    },
    {
        "name": "Nakuru Affordable Housing Estate",
        "type": "construction",
        "nema_category": "medium",
        "lat": -0.31, "lng": 36.07,
        "scale_ha": 8.4,
        "scale_value": 500,
        "proponent": "Kenya Urban Housing Accelerator",
        "description": "500-unit affordable housing development in Nakuru East sub-county.",
    },
]


def run_simulation():
    section("ECOSENSE AI — FULL END-TO-END SIMULATION")
    print(f"  Started: {timezone.now().strftime('%Y-%m-%d %H:%M:%S EAT')}")

    # ── 1. TENANT & USER SETUP ───────────────────────────────────────────────
    section("1. Tenant & User Setup")

    try:
        tenant, _ = Tenant.objects.get_or_create(
            name="EcoSense Simulation Firm",
            defaults={"nema_id": "NEMA/EIA/FIRM/SIM001", "is_active": True}
        )
        log(PASS, "Tenant created", f"ID: {tenant.id} | NEMA ID: {tenant.nema_id}")
    except Exception as e:
        log(FAIL, "Tenant creation", str(e))
        errors.append(f"Tenant: {e}")
        tenant = Tenant.objects.first()

    try:
        user, created = User.objects.get_or_create(
            email="sim_consultant@ecosense.test",
            defaults={
                "full_name": "James Mwangi",
                "role": "consultant", "tenant": tenant,
                "is_active": True, "tenant_id": tenant.id,
            }
        )
        if created:
            user.set_password("SimTest@2024!")
            user.save()
        log(PASS, f"Consultant user: {user.email}", f"Role: {user.role} | Tenant: {tenant.name}")
    except Exception as e:
        log(FAIL, "User creation", str(e))
        errors.append(f"User: {e}")
        user = User.objects.filter(role="consultant").first()

    # ── 2. PROJECT CREATION ──────────────────────────────────────────────────
    section("2. Project Creation (3 scenarios)")

    created_projects = []
    for pd in PROJECTS:
        try:
            project, created = Project.objects.get_or_create(
                name=pd["name"],
                defaults={
                    "tenant_id": tenant.id,
                    "description": pd["description"],
                    "project_type": pd["type"],
                    "nema_category": pd["nema_category"],
                    "location": Point(pd["lng"], pd["lat"], srid=4326),
                    "scale_ha": pd["scale_ha"],
                    "scale_value": pd["scale_value"],
                    "proponent_name": pd["proponent"],
                    "proponent_pin": "A123456789B",
                    "lead_consultant": user,
                    "status": "scoping",
                }
            )
            action = "CREATED" if created else "EXISTS"
            log(PASS, f"[{action}] {project.name}", f"Type: {project.project_type} | NEMA: {project.nema_category} | {pd['scale_ha']}ha")
            created_projects.append(project)
        except Exception as e:
            log(FAIL, f"Project: {pd['name']}", str(e))
            errors.append(f"Project {pd['name']}: {e}")
            traceback.print_exc()

    # ── 3. REGULATION REGISTRY ───────────────────────────────────────────────
    section("3. Regulation Registry Check")

    total_regs = Regulation.objects.count()
    log(INFO, f"Total regulations in registry: {total_regs}")

    for project in created_projects[:1]:  # Test with first project
        sector = project.project_type
        matching = [r for r in Regulation.objects.filter(is_active=True) if r.applies_to(sector, "machakos")]
        log(PASS if matching else WARN, f"Regulations for {sector}/{project.name[:30]}",
            f"{len(matching)} applicable: {', '.join(r.code for r in matching[:5])}")

    # ── 4. DOCUMENT CHECKLIST ────────────────────────────────────────────────
    section("4. Document Checklist Auto-Generation")

    from apps.regulations.views import DOC_REQUIREMENTS
    for project in created_projects:
        try:
            required_types = set(DOC_REQUIREMENTS.get("all", []))
            required_types.update(DOC_REQUIREMENTS.get(project.project_type, []))
            for doc_type in required_types:
                RequiredDocument.objects.get_or_create(
                    project=project, doc_type=doc_type,
                    defaults={"is_mandatory": True}
                )
            count = RequiredDocument.objects.filter(project=project).count()
            log(PASS, f"Checklist for {project.name[:40]}", f"{count} documents required")
        except Exception as e:
            log(FAIL, f"Checklist: {project.name[:40]}", str(e))
            errors.append(str(e))

    # ── 5. BASELINE GENERATION ───────────────────────────────────────────────
    section("5. Baseline Generation")

    from apps.baseline.tasks import generate_baseline
    for project in created_projects:
        try:
            existing = BaselineReport.objects.filter(project=project).first()
            if existing and existing.status == "complete":
                log(PASS, f"Baseline EXISTS: {project.name[:40]}", f"Status: {existing.status}")
            else:
                log(INFO, f"Generating baseline for: {project.name[:40]}", "Running synchronously...")
                generate_baseline(str(project.id))
                baseline = BaselineReport.objects.get(project=project)
                log(PASS if baseline.status == "complete" else WARN,
                    f"Baseline result: {project.name[:40]}",
                    f"Status: {baseline.status} | Sources: {len(baseline.data_sources or [])}")
        except Exception as e:
            log(FAIL, f"Baseline: {project.name[:40]}", str(e)[:200])
            errors.append(f"Baseline {project.name}: {e}")

    # ── 6. IMPACT PREDICTIONS ────────────────────────────────────────────────
    section("6. AI Impact Predictions")

    from apps.predictions.tasks import run_predictions
    for project in created_projects:
        try:
            existing_count = ImpactPrediction.objects.filter(project=project).count()
            if existing_count > 0:
                log(PASS, f"Predictions EXIST: {project.name[:40]}", f"{existing_count} predictions")
            else:
                run_predictions(str(project.id))
                count = ImpactPrediction.objects.filter(project=project).count()
                log(PASS if count > 0 else WARN,
                    f"Predictions result: {project.name[:40]}", f"{count} predictions generated")
        except Exception as e:
            log(FAIL, f"Predictions: {project.name[:40]}", str(e)[:200])
            errors.append(f"Predictions {project.name}: {e}")

    # ── 7. COMMUNITY FEEDBACK ────────────────────────────────────────────────
    section("7. Community Feedback Simulation")

    sample_feedback = [
        {"text": "We support this hospital. Cancer patients travel too far to Nairobi.", "channel": "web", "sentiment": "positive"},
        {"text": "Will there be jobs for local Athi River youth during construction?", "channel": "sms", "sentiment": "neutral"},
        {"text": "Concerned about medical waste disposal near our water source.", "channel": "whatsapp", "sentiment": "negative"},
        {"text": "The borehole is desperately needed, our wells are dry.", "channel": "web", "sentiment": "positive"},
        {"text": "Please ensure dust control on the access road during construction.", "channel": "sms", "sentiment": "neutral"},
    ]

    for i, project in enumerate(created_projects):
        try:
            existing = CommunityFeedback.objects.filter(project=project).count()
            if existing == 0:
                for fb in sample_feedback[:3]:
                    CommunityFeedback.objects.create(
                        project=project,
                        tenant_id=project.tenant_id,
                        raw_text=fb["text"],
                        channel=fb["channel"],
                        sentiment=fb["sentiment"],
                    )
            count = CommunityFeedback.objects.filter(project=project).count()
            log(PASS, f"Feedback: {project.name[:40]}", f"{count} entries recorded")
        except Exception as e:
            log(FAIL, f"Feedback: {project.name[:40]}", str(e)[:200])
            errors.append(f"Feedback {project.name}: {e}")

    # ── 8. PUBLIC NOTICE ─────────────────────────────────────────────────────
    section("8. Public Notice & Public Submissions")

    for project in created_projects[:2]:
        try:
            notice, created = PublicNotice.objects.get_or_create(project=project)
            if not notice.public_code:
                year = timezone.now().strftime("%Y")
                short = str(project.id)[:6].upper()
                notice.public_code = f"EIA-{year}-{short}"
            if not notice.publication_date:
                notice.publication_date = timezone.now().date()
                notice.notice_end_date = notice.publication_date + timedelta(days=21)
                notice.status = "active"
                notice.newspaper_name = "Daily Nation"
            notice.save()

            # Simulate 3 public submissions
            existing_subs = PublicSubmission.objects.filter(project=project).count()
            if existing_subs == 0:
                for fb in sample_feedback[:3]:
                    import hashlib
                    raw = f"{project.id}|{fb['text']}|{timezone.now().isoformat()}"
                    PublicSubmission.objects.create(
                        project=project,
                        submitter_name="Community Member",
                        submitter_phone="+254700123456",
                        submitter_location="Local Ward",
                        channel="web",
                        sentiment="neutral",
                        message=fb["text"],
                        submission_hash=hashlib.sha256(raw.encode()).hexdigest(),
                    )

            sub_count = PublicSubmission.objects.filter(project=project).count()
            log(PASS, f"Public Notice: {project.name[:35]}",
                f"Code: {notice.public_code} | Days left: {notice.days_remaining} | Submissions: {sub_count}")
        except Exception as e:
            log(FAIL, f"Notice: {project.name[:40]}", str(e)[:200])
            errors.append(f"Notice {project.name}: {e}")

    # ── 9. SITE VISIT ─────────────────────────────────────────────────────────
    section("9. Site Visit & Field Measurements")

    for project in created_projects[:2]:
        try:
            visit, created = SiteVisit.objects.get_or_create(
                project=project,
                defaults={
                    "conducted_by": user,
                    "visit_date": timezone.now().date(),
                    "weather_conditions": "Partly cloudy, 24°C",
                    "general_notes": "Site accessible via murram road. Vegetation sparse. Observed borehole drilling marks.",
                    "status": "completed",
                }
            )

            # Add field measurements if new
            if created:
                measurements = [
                    {"category": "noise", "value": 58.3, "unit": "dBA", "equipment_used": "Extech SL130"},
                    {"category": "air_pm25", "value": 14.2, "unit": "µg/m³", "equipment_used": "TSI DustTrak"},
                    {"category": "soil_ph", "value": 6.8, "unit": "pH", "equipment_used": "Hanna HI99121"},
                    {"category": "water_turbidity", "value": 4.2, "unit": "NTU", "equipment_used": "Hach 2100Q"},
                ]
                for m in measurements:
                    FieldMeasurement.objects.create(
                        site_visit=visit,
                        latitude=project.location.y,
                        longitude=project.location.x,
                        measured_at=timezone.now(),
                        **m
                    )

                # Sync all measurements to baseline
                from apps.site_visit.views import _sync_measurement_to_baseline
                for measurement in visit.measurements.all():
                    _sync_measurement_to_baseline(measurement, str(project.id))

            m_count = visit.measurements.count()
            synced = visit.measurements.filter(is_synced=True).count()
            log(PASS, f"Site Visit: {project.name[:35]}",
                f"{m_count} field measurements | {synced} synced to baseline")
        except Exception as e:
            log(FAIL, f"Site Visit: {project.name[:40]}", str(e)[:200])
            errors.append(f"SiteVisit {project.name}: {e}")
            traceback.print_exc()

    # ── 10. COMPLIANCE AUDIT ─────────────────────────────────────────────────
    section("10. Compliance Audit")

    from apps.compliance.engine import ComplianceEngine
    engine = ComplianceEngine()

    for project in created_projects:
        try:
            audit = engine.run_check(str(project.id))
            score = audit.get("score", 0)
            passed = len(audit.get("passed", []))
            failed = len(audit.get("failed", []))
            warnings = len(audit.get("warnings", []))
            grade = "A" if score >= 90 else "B" if score >= 75 else "C" if score >= 60 else "D"
            log(PASS if score >= 60 else WARN,
                f"Compliance: {project.name[:35]}",
                f"Score: {score}% (Grade {grade}) | Passed: {passed} | Failed: {failed} | Warnings: {warnings}")
        except Exception as e:
            log(FAIL, f"Compliance: {project.name[:40]}", str(e)[:200])
            errors.append(f"Compliance {project.name}: {e}")

    # ── 11. REPORT GENERATION ────────────────────────────────────────────────
    section("11. Report Generation (Full Pipeline)")

    from apps.reports.tasks import perform_report_generation

    for project in created_projects:
        for fmt in ["docx", "pdf"]:
            try:
                start = time.time()
                report_id = perform_report_generation(str(project.id), fmt, "NEMA_Kenya")
                elapsed = round(time.time() - start, 1)

                report = EIAReport.objects.filter(project=project, format=fmt).order_by("-version").first()
                if report:
                    size_kb = round((report.file_size_bytes or 0) / 1024, 1)
                    log(PASS if report.status not in ("failed",) else FAIL,
                        f"Report [{fmt.upper()}]: {project.name[:30]}",
                        f"Status: {report.status} | Size: {size_kb}KB | Time: {elapsed}s | Compliance: {report.compliance_score}%")
                else:
                    log(WARN, f"Report [{fmt.upper()}]: {project.name[:30]}", "No report object found after generation")
            except Exception as e:
                log(FAIL, f"Report [{fmt.upper()}]: {project.name[:30]}", str(e)[:300])
                errors.append(f"Report {project.name}/{fmt}: {e}")
                traceback.print_exc()

    # ── 12. RAG HISTORICAL CONTEXT ───────────────────────────────────────────
    section("12. RAG Historical Baseline Context")

    try:
        from apps.predictions.ml.engine import PredictionEngine
        engine_ml = PredictionEngine()
        for county in ["Machakos", "Kisumu", "Nakuru"]:
            ctx = engine_ml.get_historical_baseline_context(county)
            if ctx:
                log(PASS, f"RAG context for {county}", ctx[:150] + "..." if len(ctx) > 150 else ctx)
            else:
                log(WARN, f"RAG context for {county}", "No historical context found (RAG store may be empty — run ingest_eias)")
    except Exception as e:
        log(WARN, "RAG Pipeline", f"Vector store not ready yet: {str(e)[:150]}")

    # ── 13. FINAL SUMMARY ────────────────────────────────────────────────────
    section("SIMULATION COMPLETE — FINAL SUMMARY")

    total_pass = sum(1 for r in results if "✅" in r)
    total_fail = sum(1 for r in results if "❌" in r)
    total_warn = sum(1 for r in results if "⚠️" in r)

    print(f"\n  Total Tests : {total_pass + total_fail + total_warn}")
    print(f"  ✅ Passed   : {total_pass}")
    print(f"  ❌ Failed   : {total_fail}")
    print(f"  ⚠️  Warnings : {total_warn}")
    results.append(f"\n  TOTAL: {total_pass + total_fail + total_warn} | PASS: {total_pass} | FAIL: {total_fail} | WARN: {total_warn}")

    if errors:
        print(f"\n  ERRORS TO FIX ({len(errors)}):")
        for err in errors:
            print(f"    → {err[:120]}")

    # Write full report
    report_path = os.path.join(os.path.dirname(__file__), "simulation_report.txt")
    with open(report_path, "w") as f:
        f.write(f"ECOSENSE AI — Simulation Report\n")
        f.write(f"Generated: {timezone.now().strftime('%Y-%m-%d %H:%M:%S EAT')}\n")
        f.write("=" * 70 + "\n\n")
        f.write("\n".join(results))
        if errors:
            f.write("\n\nERRORS TO FIX:\n")
            for err in errors:
                f.write(f"  → {err}\n")

    print(f"\n  📄 Full report written to: simulation_report.txt")
    return total_fail


if __name__ == "__main__":
    fail_count = run_simulation()
    sys.exit(0 if fail_count == 0 else 1)
