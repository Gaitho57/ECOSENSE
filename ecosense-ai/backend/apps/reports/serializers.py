from rest_framework import serializers
from .models import ReportSection

class ReportSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportSection
        fields = ['id', 'section_id', 'title', 'content', 'status', 'last_modified_by', 'updated_at']
        read_only_fields = ['id', 'updated_at', 'last_modified_by']
