from django.urls import path
from apps.emp.views import IoTReadingsIngestionView, IoTSensorView, IoTSensorReadingsView, EMPTaskView, EMPTaskDetailView

app_name = "emp"

urlpatterns = [
    # IoT Public Ingestion natively 
    path('iot/readings/', IoTReadingsIngestionView.as_view(), name='iot_ingestion'),
    
    # Internal Dashboard API arrays smoothly
    path('<uuid:project_id>/sensors/', IoTSensorView.as_view(), name='sensors'),
    path('<uuid:project_id>/sensors/<uuid:sensor_id>/readings/', IoTSensorReadingsView.as_view(), name='sensor_readings'),
    
    # Task Kanban 
    path('<uuid:project_id>/tasks/', EMPTaskView.as_view(), name='emp_tasks'),
    path('<uuid:project_id>/tasks/<uuid:task_id>/', EMPTaskDetailView.as_view(), name='emp_task_detail'),
]
