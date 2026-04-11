"""
EcoSense AI — Core Project Execution Architectures.
"""

import uuid
from django.db import models
from django.conf import settings
from django.contrib.gis.db.models import PointField, PolygonField
from core.models import BaseModel

class Project(BaseModel):
    """
    Overarching boundary mapping scopes tracking constraints strictly cleanly natively.
    """
    TYPE_CHOICES = [
        ("mining", "Mining & Extraction"),
        ("construction", "Commercial Construction"),
        ("manufacturing", "Industrial Manufacturing"),
        ("agriculture", "Large Scale Agriculture"),
        ("infrastructure", "Infrastructure & Transport"),
        ("energy", "Energy & Power Generation"),
        ("tourism", "Tourism & Conservation"),
        ("borehole", "Borehole Project"),
        ("other", "Other Sector")
    ]
    
    STATUS_CHOICES = [
        ("scoping", "Scoping & Screening"),
        ("baseline", "Baseline Extraction"),
        ("assessment", "Impact Assessment"),
        ("review", "Review & Community"),
        ("submitted", "Submitted to NEMA"),
        ("approved", "Approved - Licensed"),
        ("monitoring", "Post-Approval Monitoring")
    ]

    NEMA_CATEGORY_CHOICES = [
        ("low", "Low Risk (SPR Required)"),
        ("medium", "Medium Risk (SPR/CPR Required)"),
        ("high", "High Risk (Full EIA Study Required)"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant_id = models.UUIDField()
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    project_type = models.CharField(max_length=100, choices=TYPE_CHOICES)
    status = models.CharField(max_length=50, default='scoping', choices=STATUS_CHOICES)
    
    # NEMA Categorization
    nema_category = models.CharField(max_length=20, choices=NEMA_CATEGORY_CHOICES, default="medium")
    scale_value = models.DecimalField(max_digits=12, decimal_places=2, help_text="Quantitative scale (e.g. bed capacity, units, hectares)", default=0)
    risk_score = models.IntegerField(default=0)
    
    # Proponent Metadata (Required for Signature Block)
    proponent_name = models.CharField(max_length=200, blank=True)
    proponent_pin = models.CharField(max_length=20, blank=True)
    proponent_id_no = models.CharField(max_length=20, blank=True)
    
    # Geographic execution boundaries
    location = PointField(srid=4326)
    boundary = PolygonField(srid=4326, null=True, blank=True)
    
    lead_consultant = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    
    nema_ref = models.CharField(max_length=100, blank=True)
    public_token = models.UUIDField(default=uuid.uuid4, unique=True)
    
    approved_at = models.DateTimeField(null=True, blank=True)
    scale_ha = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Project"
        verbose_name_plural = "Projects"

    def __str__(self):
        return f"{self.name} ({self.get_project_type_display()})"


class ProjectMedia(BaseModel):
    """
    Stores photographic evidence captured in the field, tagged to specific report sections.
    Supports GPS watermarking and automated compression.
    """
    SECTION_CHOICES = [
        ("site", "General Site Photo"),
        ("baseline", "Chapter 6: Baseline Evidence"),
        ("participation", "Chapter 8: Public Participation"),
        ("impacts", "Chapter 9: Impact Specific"),
        ("mitigation", "Chapter 11: Mitigation Evidence"),
        ("other", "Annex Only"),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="media")
    file = models.ImageField(upload_to="projects/evidence/%Y/%m/%d/")
    
    section_id = models.CharField(max_length=50, choices=SECTION_CHOICES, default="site")
    caption = models.TextField(blank=True, help_text="Figure caption for the report.")
    
    # Metadata extracted from EXIF or provided by client
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    captured_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Project Media"
        verbose_name_plural = "Project Media"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.project.name} - {self.get_section_id_display()} - {self.id}"


class ProjectDocument(BaseModel):
    """
    Stores official statutory documents (PDFs) that must be annexed to the report.
    Examples: Title Deeds, KRA PIN, Expert Licenses, Lab Results.
    """
    DOC_TYPE_CHOICES = [
        ("title_deed", "Proof of Land Ownership (Title Deed)"),
        ("kra_pin", "KRA PIN Certificate (Proponent)"),
        ("expert_license", "Lead Expert Practicing License"),
        ("firm_registration", "Firm of Experts Registration"),
        ("lab_results", "Laboratory Analysis Certificate"),
        ("tor_approval", "NEMA ToR Approval Letter"),
        ("other", "General Statutory Attachment"),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="documents")
    file = models.FileField(upload_to="projects/documents/%Y/%m/%d/")
    doc_type = models.CharField(max_length=50, choices=DOC_TYPE_CHOICES)
    
    reference_no = models.CharField(max_length=100, blank=True, help_text="e.g. Title LR No, License No")
    is_verified = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = "Project Document"
        verbose_name_plural = "Project Documents"
        ordering = ["doc_type"]

    def __str__(self):
        return f"{self.project.name} - {self.get_doc_type_display()}"
