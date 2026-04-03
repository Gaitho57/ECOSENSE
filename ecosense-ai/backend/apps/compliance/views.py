"""
EcoSense API — Compliance Views.

Aggregates execution triggers structurally routing GET paths actively mapping engines.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsSameTenant
from apps.projects.models import Project
from apps.compliance.models import ComplianceResult
from apps.compliance.engine import ComplianceEngine

def envelope(data=None, meta=None, error=None, status_code=status.HTTP_200_OK):
    return Response({"data": data, "meta": meta or {}, "error": error}, status=status_code)

class RunComplianceCheckView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id):
         """
         Dynamically instantiates engines logging executions tracking variables seamlessly explicitly natively.
         """
         try:
              project = Project.objects.get(id=project_id)
              self.check_object_permissions(request, project)
         except Project.DoesNotExist:
              return envelope(error={"code": 404, "message": "Project mapping failed."}, status_code=404)

         try:
              engine = ComplianceEngine()
              report = engine.run_check(project_id)
              return envelope(data=report)
         except Exception as e:
              return envelope(error={"code": 500, "message": f"Compliance engine crashed evaluating bounds: {e}"}, status_code=500)


class ComplianceHistoryView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id):
         """
         Fetches past stored traces formatting structurally out across arrays seamlessly.
         """
         try:
              project = Project.objects.get(id=project_id)
              self.check_object_permissions(request, project)
         except Project.DoesNotExist:
              return envelope(error={"code": 404, "message": "Project mapping failed."}, status_code=404)

         history = ComplianceResult.objects.filter(project=project)
         
         data = []
         for h in history:
              data.append({
                  "id": str(h.id),
                  "regulation_id": h.regulation_id,
                  "status": h.status,
                  "evidence": h.evidence,
                  "remedy": h.remedy,
                  "checked_at": h.checked_at.isoformat()
              })
              
         return envelope(data=data, meta={"total": len(data)})
