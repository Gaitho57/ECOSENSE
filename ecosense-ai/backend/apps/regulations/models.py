"""
EcoSense AI — Regulation Registry Models.

Structured database of all environmental regulations applicable in Kenya,
organized by sector and county for automatic matching at report generation.
"""
import uuid
from django.db import models


class Regulation(models.Model):
    """
    A single enforceable environmental regulation, act section, or legal notice.
    """
    SECTOR_CHOICES = [
        ("all", "All Sectors"),
        ("agriculture", "Agriculture & Forestry"),
        ("borehole", "Borehole & Water Abstraction"),
        ("construction", "Urban & Housing Development"),
        ("energy", "Energy & Power Generation"),
        ("health_facilities", "Health & Medical Facilities"),
        ("infrastructure", "Infrastructure & Transport"),
        ("manufacturing", "Industrial Manufacturing"),
        ("mining", "Mining & Extraction"),
        ("tourism", "Tourism & Conservation"),
        ("waste_management", "Waste Management & Disposal"),
        ("water_resources", "Water Resources & Dams"),
    ]

    CATEGORY_CHOICES = [
        ("act", "Act of Parliament"),
        ("regulation", "Statutory Regulation"),
        ("legal_notice", "Legal Notice"),
        ("guideline", "NEMA Guideline"),
        ("standard", "Environmental Standard"),
        ("county_bylaw", "County Government By-Law"),
        ("international", "International Convention / Protocol"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True, help_text="e.g. EMCA-S58, OSHA-S15")
    title = models.CharField(max_length=300)
    act_name = models.CharField(max_length=200, help_text="e.g. Environmental Management and Coordination Act")
    section = models.CharField(max_length=100, blank=True, help_text="e.g. Section 58, Second Schedule")
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default="act")

    # Applicability
    sectors = models.JSONField(default=list, help_text="List of applicable project type keys, or ['all']")
    counties = models.JSONField(default=list, help_text="List of applicable county names, or ['all']")

    # Content
    description = models.TextField(help_text="Plain-language description of what this regulation requires.")
    requirement = models.TextField(blank=True, help_text="Specific requirement / threshold / limit.")
    penalty = models.TextField(blank=True, help_text="Penalty for non-compliance.")
    pdf_reference = models.CharField(max_length=200, blank=True, help_text="Filename in the RAG store.")

    # Status tracking
    is_active = models.BooleanField(default=True)
    effective_date = models.DateField(null=True, blank=True)
    amended_date = models.DateField(null=True, blank=True)
    amendment_note = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "Regulation"
        verbose_name_plural = "Regulations"

    def __str__(self):
        return f"[{self.code}] {self.title}"

    def applies_to(self, sector: str, county: str) -> bool:
        """Returns True if this regulation applies to the given sector and county."""
        sector_match = "all" in self.sectors or sector in self.sectors
        county_match = "all" in self.counties or county.lower() in [c.lower() for c in self.counties]
        return sector_match and county_match


class RequiredDocument(models.Model):
    """
    Tracks the statutory documents that must be attached to a project before NEMA submission.
    Auto-populated based on project_type and nema_category.
    """
    STATUS_CHOICES = [
        ("missing", "Missing"),
        ("uploaded", "Uploaded — Pending Verification"),
        ("verified", "Verified"),
        ("waived", "Waived by Expert"),
    ]

    DOC_TYPE_CHOICES = [
        ("title_deed", "Proof of Land Ownership (Title Deed / Lease)"),
        ("kra_pin", "KRA PIN Certificate (Proponent)"),
        ("expert_license", "Lead Expert Practicing License (NEMA)"),
        ("firm_registration", "Firm of Experts Certificate (NEMA)"),
        ("land_use_permit", "Land Use / Change of User Permit"),
        ("site_plan", "Architectural / Engineering Drawings"),
        ("lab_results", "Laboratory Analysis Certificate"),
        ("tor_approval", "NEMA Terms of Reference Approval Letter"),
        ("newspaper_notice", "Statutory Newspaper Public Notice"),
        ("attendance_register", "Public Baraza Attendance Register"),
        ("noise_survey", "Noise Impact Survey Report"),
        ("traffic_study", "Traffic Impact Assessment"),
        ("heritage_clearance", "National Museums of Kenya Heritage Clearance"),
        ("water_abstraction", "WRMA Water Abstraction Permit"),
        ("nema_license", "Existing NEMA Environmental License (if any)"),
        ("other", "Other Supporting Document"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="required_documents"
    )
    doc_type = models.CharField(max_length=50, choices=DOC_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="missing")

    file = models.FileField(upload_to="projects/required_docs/%Y/%m/", null=True, blank=True)
    reference_no = models.CharField(max_length=150, blank=True)
    notes = models.TextField(blank=True)
    is_mandatory = models.BooleanField(default=True)

    verified_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="verified_docs"
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    uploaded_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["is_mandatory", "doc_type"]
        unique_together = [["project", "doc_type"]]
        verbose_name = "Required Document"
        verbose_name_plural = "Required Documents"

    def __str__(self):
        return f"{self.project.name} — {self.get_doc_type_display()} [{self.status}]"
