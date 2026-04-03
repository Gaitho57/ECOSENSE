from django.urls import path
from apps.projects.views import ProjectListCreateView, ProjectDetailView

app_name = "projects"

urlpatterns = [
    path('', ProjectListCreateView.as_view(), name='project_list_create'),
    path('<uuid:id>/', ProjectDetailView.as_view(), name='project_detail'),
]
