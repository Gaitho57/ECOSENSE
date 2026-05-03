"""
EcoSense AI — Site Visit Models.

Tracks field visits, geo-tagged photos, and field measurements
that override satellite-derived baseline data.
"""
import uuid
from django.db import models
from django.conf import settings


class SiteVisit(models.Model):
    """A recorded field visit to the project site."""
    STATUS_CHOICES = [
        ("planned", "Planned"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("synced", "Synced to Baseline"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="site_visits"
    )
    conducted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="site_visits"
    )
    visit_date = models.DateField()
    weather_conditions = models.CharField(max_length=100, blank=True)
    general_notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="planned")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-visit_date"]
        verbose_name = "Site Visit"
        verbose_name_plural = "Site Visits"

    def __str__(self):
        return f"{self.project.name} — Visit {self.visit_date}"


class FieldMeasurement(models.Model):
    """
    A single quantitative measurement taken during a site visit.
    Overrides the corresponding satellite/API-derived baseline value when synced.
    """
    CATEGORY_CHOICES = [
        ("noise", "Noise Level (dBA)"),
        ("air_pm25", "Air Quality — PM2.5 (µg/m³)"),
        ("air_pm10", "Air Quality — PM10 (µg/m³)"),
        ("soil_ph", "Soil pH"),
        ("soil_moisture", "Soil Moisture (%)"),
        ("water_turbidity", "Water Turbidity (NTU)"),
        ("water_ph", "Water pH"),
        ("water_do", "Dissolved Oxygen (mg/L)"),
        ("temperature", "Ambient Temperature (°C)"),
        ("humidity", "Relative Humidity (%)"),
        ("other", "Other Measurement"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    site_visit = models.ForeignKey(SiteVisit, on_delete=models.CASCADE, related_name="measurements")

    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    value = models.DecimalField(max_digits=10, decimal_places=4)
    unit = models.CharField(max_length=30)
    equipment_used = models.CharField(max_length=150, blank=True, help_text="e.g. Extech SL130 Sound Meter")

    # GPS location of the measurement point
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    measured_at = models.DateTimeField()
    notes = models.TextField(blank=True)

    # Whether this measurement has been pushed to the baseline
    is_synced = models.BooleanField(default=False)
    synced_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["measured_at"]
        verbose_name = "Field Measurement"

    def __str__(self):
        return f"{self.get_category_display()}: {self.value} {self.unit}"


class SitePhoto(models.Model):
    """
    A geo-tagged photo taken during a site visit, linked to a specific report section.
    """
    SECTION_CHOICES = [
        ("site_overview", "Site Overview"),
        ("baseline", "Baseline Evidence"),
        ("vegetation", "Vegetation & Ecology"),
        ("water", "Water Bodies & Hydrology"),
        ("soil", "Soil Conditions"),
        ("structures", "Existing Structures"),
        ("access", "Access Roads & Infrastructure"),
        ("participation", "Public Participation"),
        ("impact", "Observed Impact Evidence"),
        ("mitigation", "Mitigation Measure Evidence"),
        ("other", "Other / General"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    site_visit = models.ForeignKey(SiteVisit, on_delete=models.CASCADE, related_name="photos")

    file = models.ImageField(upload_to="site_visits/photos/%Y/%m/%d/")
    caption = models.CharField(max_length=300)
    section_tag = models.CharField(max_length=30, choices=SECTION_CHOICES, default="site_overview")

    # GPS from EXIF or manual entry
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    captured_at = models.DateTimeField(null=True, blank=True)
    direction_degrees = models.IntegerField(null=True, blank=True, help_text="Camera bearing 0-359°")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["captured_at"]
        verbose_name = "Site Photo"

    def __str__(self):
        return f"{self.site_visit} — {self.get_section_tag_display()}"


class PublicSubmission(models.Model):
    """
    A tamper-proof public comment submitted via the public portal, SMS, or WhatsApp.
    Distinct from CommunityFeedback — this is the statutory, legally-auditable record.
    """
    CHANNEL_CHOICES = [
        ("web", "Public Web Portal"),
        ("sms", "SMS"),
        ("whatsapp", "WhatsApp"),
        ("email", "Email"),
        ("baraza", "Physical Baraza"),
        ("written", "Written Submission"),
    ]

    SENTIMENT_CHOICES = [
        ("support", "In Support"),
        ("neutral", "Neutral / Inquiry"),
        ("oppose", "In Opposition"),
        ("concern", "Specific Concern"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="public_submissions"
    )

    # Submitter info (name optional for SMS/WhatsApp)
    submitter_name = models.CharField(max_length=150, blank=True)
    submitter_phone = models.CharField(max_length=20, blank=True)
    submitter_email = models.EmailField(blank=True)
    submitter_location = models.CharField(max_length=150, blank=True, help_text="Village/Ward/Estate")

    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    sentiment = models.CharField(max_length=20, choices=SENTIMENT_CHOICES, default="neutral")
    message = models.TextField()

    # Tamper-proof audit fields
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    submission_hash = models.CharField(max_length=64, blank=True, help_text="SHA-256 of content + timestamp")
    submitted_at = models.DateTimeField(auto_now_add=True)

    # Acknowledgment tracking
    ack_sent = models.BooleanField(default=False)
    ack_sent_at = models.DateTimeField(null=True, blank=True)

    # Language
    language = models.CharField(max_length=10, default="en", help_text="en or sw")

    class Meta:
        ordering = ["-submitted_at"]
        verbose_name = "Public Submission"
        verbose_name_plural = "Public Submissions"

    def __str__(self):
        return f"{self.project.name} — {self.channel} [{self.sentiment}] {self.submitted_at.date()}"


class PublicNotice(models.Model):
    """
    Tracks the statutory 21-day public notification period required by NEMA.
    """
    STATUS_CHOICES = [
        ("pending", "Notice Not Yet Published"),
        ("active", "Notice Period Active"),
        ("closed", "Notice Period Closed"),
        ("compliant", "Compliant — Meets Statutory Requirement"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.OneToOneField(
        "projects.Project", on_delete=models.CASCADE, related_name="public_notice"
    )

    newspaper_name = models.CharField(max_length=150, blank=True)
    publication_date = models.DateField(null=True, blank=True)
    notice_end_date = models.DateField(null=True, blank=True, help_text="Auto-set to publication_date + 21 days")
    clipping_file = models.FileField(upload_to="notices/clippings/", null=True, blank=True)

    radio_station = models.CharField(max_length=150, blank=True)
    radio_date = models.DateField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    public_code = models.CharField(max_length=30, unique=True, blank=True, help_text="e.g. EIA-NBI-2025-0042")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Public Notice"

    def save(self, *args, **kwargs):
        from datetime import timedelta
        if self.publication_date and not self.notice_end_date:
            self.notice_end_date = self.publication_date + timedelta(days=21)
        super().save(*args, **kwargs)

    @property
    def days_remaining(self):
        from django.utils import timezone
        if self.notice_end_date:
            delta = self.notice_end_date - timezone.now().date()
            return max(0, delta.days)
        return None

    @property
    def is_compliant(self):
        from django.utils import timezone
        return self.notice_end_date and timezone.now().date() > self.notice_end_date

    def __str__(self):
        return f"{self.project.name} — Public Notice [{self.status}]"
