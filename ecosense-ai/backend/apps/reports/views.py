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

def envelope(data=None, meta=None, error=None, status_code=status.HTTP_200_OK):
    return Response({"data": data, "meta": meta or {}, "error": error}, status=status_code)

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

        task = generate_report.delay(str(project_id), fmt, jurisdiction)
        
        return envelope(data={"task_id": task.id, "message": f"Generation mapping initiated successfully."}, status_code=status.HTTP_202_ACCEPTED)


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
                 "download_url": r.s3_url,
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
             
         if not report.s3_url:
              return envelope(error={"code": 400, "message": "Report logic currently generating."}, status_code=400)
              
         return redirect(report.s3_url)
