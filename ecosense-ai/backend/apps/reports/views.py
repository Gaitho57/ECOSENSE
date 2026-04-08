"""
EcoSense AI — Reports API Views.

Validates payload triggers querying native S3 bounds orchestrating background tasks efficiently.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import redirect

from apps.accounts.permissions import IsSameTenant
from apps.projects.models import Project
from apps.reports.models import EIAReport
from apps.reports.tasks import generate_report

from django.http import FileResponse
import os
from django.conf import settings

def envelope(data=None, meta=None, error=None, status_code=status.HTTP_200_OK):
    return Response({"data": data, "meta": meta or {}, "error": error}, status=status_code)


import uuid

class GenerateReportView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def post(self, request, project_id):
        try:
             project = Project.objects.get(id=project_id)
             self.check_object_permissions(request, project)
        except Project.DoesNotExist:
             return envelope(error={"code": 404, "message": "Project mapping failed."}, status_code=404)

        fmt = request.data.get("format", "pdf")
        jurisdiction = request.data.get("jurisdiction", "NEMA_Kenya")

        if fmt not in ["pdf", "docx"]:
             return envelope(error={"code": 400, "message": "Format bounds limit unsupported maps."}, status_code=400)

        # Task uses .delay() but executes synchronously due to CELERY_TASK_ALWAYS_EAGER
        generate_report.delay(str(project_id), fmt, jurisdiction)
        
        # Return a 'local-' ID that our TaskStatusView handles as SUCCESS
        local_task_id = f"local-{uuid.uuid4()}"
        return envelope(data={"task_id": local_task_id, "message": f"Generation mapping initiated successfully."}, status_code=status.HTTP_202_ACCEPTED)


class ProjectReportsView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id):
        try:
             project = Project.objects.get(id=project_id)
             self.check_object_permissions(request, project)
        except Project.DoesNotExist:
             return envelope(error={"code": 404, "message": "Project absent."}, status_code=404)

        reports = EIAReport.objects.filter(project=project)
        
        data = []
        for r in reports:
             data.append({
                 "id": str(r.id),
                 "version": r.version,
                 "format": r.format,
                 "jurisdiction": r.jurisdiction,
                 "status": r.status,
                 "file_size": r.file_size_bytes,
                 "download_url": f"reports/{project_id}/reports/{r.id}/download/",
                 "error_message": r.error_message,
                 "diagnostics": r.error_message, # Added for direct debugging
                 "compliance_score": r.error_message if r.error_message and r.error_message.startswith("Compliance:") else None,
                 "compliance_grade": None,
                 "generated_at": r.generated_at.isoformat() if r.generated_at else None
             })

        return envelope(data=data, meta={"total": len(data)})

class DownloadReportView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]
    
    def get(self, request, project_id, report_id):
         try:
             project = Project.objects.get(id=project_id)
             self.check_object_permissions(request, project)
             report = EIAReport.objects.get(id=report_id, project=project)
         except (Project.DoesNotExist, EIAReport.DoesNotExist):
             return envelope(error={"code": 404, "message": "Report mapping un-trackable."}, status_code=404)
             
         if not report.status == 'ready' or not report.s3_url:
              return envelope(error={"code": 400, "message": "Report logic currently generating."}, status_code=400)
              
         # Logic to serve local file if S3 is mocked or file exists locally
         if report.s3_url.startswith("/media/") or report.s3_url.find("mocked=true") != -1:
              local_path = os.path.join(settings.MEDIA_ROOT, report.s3_key)
              if os.path.exists(local_path):
                   return FileResponse(open(local_path, 'rb'), as_attachment=True, filename=f"EIA_Report_v{report.version}.{report.format}")
         
         return redirect(report.s3_url)
