from rest_framework import generics, status, viewsets
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsSameTenant
from apps.projects.models import Project, ProjectMedia, ProjectDocument
from apps.projects.serializers import ProjectSerializer, ProjectMediaSerializer, ProjectDocumentSerializer
from apps.projects.utils.media import process_field_image
from apps.projects.utils.screening import screen_project
from rest_framework import viewsets


def _get_tenant_project(request, project_id):
    """Return the project only if it belongs to the caller's tenant, else 404.

    Prevents cross-tenant IDOR when a URL supplies an arbitrary project_id.
    """
    try:
        return Project.objects.get(id=project_id, tenant_id=request.user.tenant_id)
    except Project.DoesNotExist:
        raise NotFound("Project not found.")


class ProjectDocumentViewSet(viewsets.ModelViewSet):
    """
    Handles statutory document storage (Title Deeds, Licenses, etc.)
    """
    serializer_class = ProjectDocumentSerializer
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get_queryset(self):
        # Scope to the caller's tenant so one tenant cannot read another's docs.
        return ProjectDocument.objects.filter(
            project_id=self.kwargs['project_id'],
            project__tenant_id=self.request.user.tenant_id,
        )

    def perform_create(self, serializer):
        project = _get_tenant_project(self.request, self.kwargs['project_id'])
        serializer.save(project_id=project.id, tenant_id=self.request.user.tenant_id)

class ProjectMediaViewSet(viewsets.ModelViewSet):
    """
    Handles onsite field evidence uploads.
    Automatically applies GPS watermarking and compression.
    """
    serializer_class = ProjectMediaSerializer
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get_queryset(self):
        return ProjectMedia.objects.filter(
            project_id=self.kwargs['project_id'],
            project__tenant_id=self.request.user.tenant_id,
        )

    def perform_create(self, serializer):
        project = _get_tenant_project(self.request, self.kwargs['project_id'])

        raw_file = self.request.FILES['file']
        lat = self.request.data.get('latitude')
        lng = self.request.data.get('longitude')
        caption = self.request.data.get('caption')

        # Auto-extract EXIF metadata from uploaded photo if not provided
        from apps.projects.utils.media import extract_exif_metadata, process_field_image
        exif_data = extract_exif_metadata(raw_file)

        if not lat and exif_data.get('latitude'):
            lat = exif_data['latitude']
        if not lng and exif_data.get('longitude'):
            lng = exif_data['longitude']

        heading = exif_data.get('cardinal_direction')
        captured_at = exif_data.get('captured_at')

        # Auto-populate NEMA statutory caption if empty
        if not caption:
            orient_str = f"View facing {heading}" if heading else "On-site reconnaissance view"
            coords_str = f" (GPS: {exif_data.get('dms_coords')})" if exif_data.get('dms_coords') else ""
            caption = f"{orient_str} documenting baseline environmental conditions{coords_str}."

        # Trigger watermarking and compression utility
        processed_file = process_field_image(
            raw_file,
            latitude=lat,
            longitude=lng,
            heading=heading
        )

        serializer.save(
            project_id=project.id,
            tenant_id=self.request.user.tenant_id,
            file=processed_file,
            latitude=lat,
            longitude=lng,
            captured_at=captured_at,
            caption=caption
        )

def envelope(data=None, meta=None, error=None, status_code=status.HTTP_200_OK):
    return Response({"data": data, "meta": meta or {}, "error": error}, status=status_code)

class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(tenant_id=self.request.user.tenant_id)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return envelope(data=serializer.data)

    def perform_create(self, serializer):
        # Initial screening based on type and scale
        scale = self.request.data.get('scale_value', 0)
        proj_type = self.request.data.get('project_type', 'residential')
        
        screening = screen_project(proj_type, scale)
        
        serializer.save(
            tenant_id=self.request.user.tenant_id,
            nema_category=screening['category'],
            risk_score=screening['risk_score']
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return envelope(data=serializer.data, status_code=status.HTTP_201_CREATED)

class ProjectDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsSameTenant]
    lookup_field = 'id'

    def get_queryset(self):
        return Project.objects.filter(tenant_id=self.request.user.tenant_id)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return envelope(data=serializer.data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return envelope(data=serializer.data)
