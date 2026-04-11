from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsSameTenant
from apps.projects.models import Project, ProjectMedia, ProjectDocument
from apps.projects.serializers import ProjectSerializer, ProjectMediaSerializer, ProjectDocumentSerializer
from apps.projects.utils.media import process_field_image
from apps.projects.utils.screening import screen_project
from rest_framework import viewsets

class ProjectDocumentViewSet(viewsets.ModelViewSet):
    """
    Handles statutory document storage (Title Deeds, Licenses, etc.)
    """
    serializer_class = ProjectDocumentSerializer
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get_queryset(self):
        return ProjectDocument.objects.filter(project_id=self.kwargs['project_id'])

    def perform_create(self, serializer):
        serializer.save(project_id=self.kwargs['project_id'])

class ProjectMediaViewSet(viewsets.ModelViewSet):
    """
    Handles onsite field evidence uploads.
    Automatically applies GPS watermarking and compression.
    """
    serializer_class = ProjectMediaSerializer
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get_queryset(self):
        return ProjectMedia.objects.filter(project_id=self.kwargs['project_id'])

    def perform_create(self, serializer):
        # Extract metadata from request if present, or fallback to model defaults
        lat = self.request.data.get('latitude')
        lng = self.request.data.get('longitude')
        
        # Trigger watermarking and compression utility
        processed_file = process_field_image(
            self.request.FILES['file'],
            latitude=lat,
            longitude=lng
        )
        
        serializer.save(
            project_id=self.kwargs['project_id'],
            file=processed_file,
            latitude=lat,
            longitude=lng
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
