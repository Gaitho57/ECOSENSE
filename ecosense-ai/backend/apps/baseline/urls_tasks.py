from django.urls import path
from apps.baseline.views import TaskStatusView

app_name = "tasks"

urlpatterns = [
    path('<str:task_id>/', TaskStatusView.as_view(), name='task_status'),
]
