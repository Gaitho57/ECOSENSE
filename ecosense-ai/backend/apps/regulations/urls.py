"""
EcoSense AI — Regulations & Site Visit API URLs.
"""
from django.urls import path
from apps.regulations.views import RegulationListView, DocumentChecklistView, DocumentUploadView

urlpatterns = [
    # Regulation Registry
    path("", RegulationListView.as_view(), name="regulation-list"),
    # Document Checklist
    path("projects/<uuid:project_id>/documents/", DocumentChecklistView.as_view(), name="document-checklist"),
    path("projects/<uuid:project_id>/documents/<str:doc_type>/upload/", DocumentUploadView.as_view(), name="document-upload"),
]
