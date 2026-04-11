from rest_framework import serializers
from apps.projects.models import Project, ProjectMedia, ProjectDocument
from django.contrib.gis.geos import Point, Polygon

class ProjectMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMedia
        fields = [
            "id", "file", "section_id", "caption", 
            "latitude", "longitude", "captured_at", "created_at"
        ]
        read_only_fields = ["id", "created_at"]

class ProjectDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectDocument
        fields = ["id", "file", "doc_type", "reference_no", "is_verified", "created_at"]
        read_only_fields = ["id", "is_verified", "created_at"]

class ProjectSerializer(serializers.ModelSerializer):
    lead_consultant_name = serializers.CharField(source='lead_consultant.get_full_name', read_only=True)
    # GeoJSON parsing helpers securely returning simple geometry bounds to native client
    coordinates = serializers.SerializerMethodField()
    boundary_coordinates = serializers.SerializerMethodField()

    # Project Summaries for Dashboards
    prediction_count = serializers.SerializerMethodField()
    feedback_count = serializers.SerializerMethodField()
    baseline = serializers.SerializerMethodField()
    thinking_summary = serializers.SerializerMethodField()
    mapbox_token = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id", "name", "description", "project_type", "status", 
            "nema_category", "scale_value", "risk_score",
            "proponent_name", "proponent_pin", "proponent_id_no",
            "lead_consultant", "lead_consultant_name", 'tenant_id',
            'nema_ref', 'public_token', 'approved_at', 'scale_ha',
            'created_at', 'updated_at', 'coordinates', 'boundary_coordinates',
            'prediction_count', 'feedback_count', 'baseline', 'thinking_summary',
            'mapbox_token'
        ]
        read_only_fields = ['id', 'tenant_id', 'public_token']

    def get_mapbox_token(self, obj):
        from django.conf import settings
        token = getattr(settings, 'MAPBOX_TOKEN', 'pk.mock')
        # Filter out placeholders to prevent broken static image requests in frontend
        if token in ['your-value-here', 'pk.mock']:
            return None
        return token

    def get_coordinates(self, obj):
        if obj.location:
             return {"lng": obj.location.x, "lat": obj.location.y}
        return None

    def get_boundary_coordinates(self, obj):
        if obj.boundary:
             return list(obj.boundary.coords)
        return None

    def get_prediction_count(self, obj):
        return obj.predictions.count()

    def get_feedback_count(self, obj):
        return obj.feedback.count()

    def get_baseline(self, obj):
        # We handle cases where baseline object results might be missing natively
        try:
             # Using the related_name implicitly mapping BaselineReport->Project
             baseline = obj.baseline
             return {
                 "status": baseline.status,
                 "scoring_summary": baseline.scoring_summary,
                 "generated_at": baseline.generated_at
             }
        except Exception:
             return None

    def get_thinking_summary(self, obj):
        # Dynamically builds the "AI Thinking" summary based on actual prediction context
        preds = obj.predictions.filter(scenario_name="baseline")
        if not preds.exists():
            return "Predictions are being formulated. The engine is analyzing baseline sensitivity and statutory constraints..."
            
        # Prioritize high/critical impacts for the summary (case-insensitive)
        from django.db.models import Q
        major_impacts = preds.filter(Q(severity__iexact="high") | Q(severity__iexact="critical"))
        if major_impacts.exists():
            top = major_impacts.first()
            return f"The engine has detected {top.severity.upper()} sensitivity regarding {top.category.upper()} for {obj.name}. This triggers specific NEMA {top.category.upper()} protocols which must be integrated into the ESMP."
            
        return f"EcoSense AI has evaluated {obj.name} and determined all baseline impacts are within manageable thresholds under standard EMCA guidelines."

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['tenant_id'] = request.user.tenant_id
        
        # Raw coords to GEOS abstractions safely Mapping Point logic intuitively 
        coords = self.initial_data.get('coordinates')
        try:
            if coords and coords.get('lng') and coords.get('lat'):
                validated_data['location'] = Point(float(coords['lng']), float(coords['lat']))
            else:
                validated_data['location'] = Point(36.8219, -1.2921)
        except (ValueError, TypeError):
            validated_data['location'] = Point(36.8219, -1.2921)
             
        # Optional boundaries 
        boundary_coords = self.initial_data.get('boundary_coordinates')
        if boundary_coords:
             try:
                 validated_data['boundary'] = Polygon(boundary_coords)
             except Exception:
                 pass
             
        return super().create(validated_data)
