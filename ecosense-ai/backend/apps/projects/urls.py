from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.projects.views import (
    ProjectListCreateView, ProjectDetailView, 
    ProjectMediaViewSet, ProjectDocumentViewSet
)

app_name = "projects"

router = DefaultRouter()
router.register(r'(?P<project_id>[^/.]+)/media', ProjectMediaViewSet, basename='project-media')
router.register(r'(?P<project_id>[^/.]+)/documents', ProjectDocumentViewSet, basename='project-documents')

urlpatterns = [
    path('', ProjectListCreateView.as_view(), name='project_list_create'),
    path('<uuid:id>/', ProjectDetailView.as_view(), name='project_detail'),
    path('', include(router.urls)),
]
