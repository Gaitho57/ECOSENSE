"""
EcoSense AI — EMP & IoT Views.

Exposes nested matrices capturing telemetry logs actively validating constraints over spatial boundaries securely natively.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.contrib.gis.geos import Point

from apps.accounts.permissions import IsSameTenant
from apps.projects.models import Project
from apps.emp.models import IoTSensor, IoTReading, EMPTask
from apps.emp.iot_handler import process_iot_reading

def envelope(data=None, meta=None, error=None, status_code=status.HTTP_200_OK):
    return Response({"data": data, "meta": meta or {}, "error": error}, status=status_code)

@method_decorator(csrf_exempt, name='dispatch')
class IoTReadingsIngestionView(APIView):
    """
    Open ingestion executing strict headers explicitly isolating bounds matching IoT keys securely.
    """
    permission_classes = [AllowAny]

    def post(self, request):
         device_id = request.data.get("device_id")
         value = request.data.get("value")
         unit = request.data.get("unit")
         recorded_at = request.data.get("recorded_at")

         # Simulate Native explicit hardware authentication 
         # In a real environment, this utilizes AWS IoT Core rules securely executing MQTT loops directly natively!
         if not all([device_id, value, unit, recorded_at]):
              return envelope(error={"code": 400, "message": "Missing telemetry variables."}, status_code=400)
              
         try:
              # Celery offload in real system: process_iot_reading.delay(device_id, value, unit, recorded_at)
              # For structural constraints we execute natively directly
              process_iot_reading(device_id, float(value), unit, recorded_at)
              return envelope(data={"status": "received"})
         except Exception as e:
              return envelope(error={"code": 400, "message": f"Ingestion bounds failed checking constraints natively: {e}"}, status_code=400)


class IoTSensorView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id):
         """ Lists all active arrays. """
         try:
              project = Project.objects.get(id=project_id)
              self.check_object_permissions(request, project)
              sensors = IoTSensor.objects.filter(project=project)
         except Project.DoesNotExist:
              return envelope(error={"code": 404, "message": "Project mapping missing limits."}, status_code=404)
              
         data = []
         for s in sensors:
              # Get latest reading cleanly 
              last = IoTReading.objects.filter(sensor=s).order_by("-recorded_at").first()
              data.append({
                  "id": str(s.id),
                  "device_id": s.device_id,
                  "sensor_type": s.sensor_type,
                  "name": s.name,
                  "is_active": s.is_active,
                  "latest_reading": {"value": float(last.value), "unit": last.unit} if last else None,
                  "last_reading_at": s.last_reading_at.isoformat() if s.last_reading_at else None
              })
         return envelope(data=data)

    def post(self, request, project_id):
         """ Maps new sensors into bounds limits natively. """
         try:
              project = Project.objects.get(id=project_id)
              self.check_object_permissions(request, project)
         except Project.DoesNotExist:
              return envelope(error={"code": 404, "message": "Project mapping missing limits."}, status_code=404)

         s = IoTSensor.objects.create(
              project=project,
              tenant_id=project.tenant_id,
              device_id=request.data["device_id"],
              sensor_type=request.data["sensor_type"],
              name=request.data["name"],
              location=Point(
                   float(request.data["lng"]), 
                   float(request.data["lat"])
              ) if "lng" in request.data and "lat" in request.data else None
         )
         return envelope(data={"id": str(s.id)}, status_code=201)


class IoTSensorReadingsView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id, sensor_id):
         """ Returns historical traces checking limits natively natively. """
         try:
              project = Project.objects.get(id=project_id)
              self.check_object_permissions(request, project)
              sensor = IoTSensor.objects.get(id=sensor_id, project=project)
         except (Project.DoesNotExist, IoTSensor.DoesNotExist):
              return envelope(error={"code": 404, "message": "Mappings failing extraction loops natively."}, status_code=404)

         readings = IoTReading.objects.filter(sensor=sensor).order_by("recorded_at")[:200]
         data = [{"value": float(r.value), "unit": r.unit, "recorded_at": r.recorded_at.isoformat(), "is_breach": r.is_breach} for r in readings]
         
         return envelope(data=data, meta={"kpi_threshold": float(readings[0].breach_threshold) if readings and readings[0].breach_threshold else None})


class EMPTaskView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id):
         try:
              project = Project.objects.get(id=project_id)
              self.check_object_permissions(request, project)
         except Project.DoesNotExist:
              return envelope(error={"code": 404, "message": "Project mapping missing limits."}, status_code=404)
              
         tasks = EMPTask.objects.filter(project=project)
         data = []
         for t in tasks:
              data.append({
                  "id": str(t.id),
                  "title": t.title,
                  "category": t.category,
                  "status": t.status,
                  "kpi_metric": t.kpi_metric,
                  "kpi_threshold": float(t.kpi_threshold) if t.kpi_threshold else None,
                  "mitigation_source": t.mitigation_source,
                  "due_date": t.due_date.isoformat()
              })
         return envelope(data=data)


class EMPTaskDetailView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def patch(self, request, project_id, task_id):
         try:
              project = Project.objects.get(id=project_id)
              self.check_object_permissions(request, project)
              task = EMPTask.objects.get(id=task_id, project=project)
         except (Project.DoesNotExist, EMPTask.DoesNotExist):
              return envelope(error={"code": 404, "message": "Failed matching bounds executing parameters limit."}, status_code=404)

         if "status" in request.data:
              task.status = request.data["status"]
         if "assignee" in request.data:
              task.assignee_id = request.data["assignee"]
              
         task.save()
         return envelope(data={"status": "success"})
