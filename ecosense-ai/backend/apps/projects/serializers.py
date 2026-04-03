from rest_framework import serializers
from apps.projects.models import Project
from django.contrib.gis.geos import Point, Polygon

class ProjectSerializer(serializers.ModelSerializer):
    lead_consultant_name = serializers.CharField(source='lead_consultant.get_full_name', read_only=True)
    # GeoJSON parsing helpers securely returning simple geometry bounds to native client
    coordinates = serializers.SerializerMethodField()
    boundary_coordinates = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'tenant_id', 'name', 'description', 'project_type', 
            'status', 'lead_consultant', 'lead_consultant_name',
            'nema_ref', 'public_token', 'approved_at', 'scale_ha',
            'created_at', 'updated_at', 'coordinates', 'boundary_coordinates'
        ]
        read_only_fields = ['id', 'tenant_id', 'public_token']

    def get_coordinates(self, obj):
        if obj.location:
             return {"lng": obj.location.x, "lat": obj.location.y}
        return None

    def get_boundary_coordinates(self, obj):
        if obj.boundary:
             return list(obj.boundary.coords)
        return None

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['tenant_id'] = request.user.tenant_id
        
        # Raw coords to GEOS abstractions safely Mapping Point logic intuitively 
        coords = self.initial_data.get('coordinates')
        if coords and "lat" in coords and "lng" in coords:
             validated_data['location'] = Point(float(coords['lng']), float(coords['lat']))
        else:
             validated_data['location'] = Point(36.8219, -1.2921) # Default to Nairobi map limit
             
        # Optional boundaries 
        boundary_coords = self.initial_data.get('boundary_coordinates')
        if boundary_coords:
             try:
                 validated_data['boundary'] = Polygon(boundary_coords)
             except Exception:
                 pass
             
        return super().create(validated_data)
