from rest_framework import serializers
from .models import ReportSection, NEMAGazetteNotice

class ReportSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportSection
        fields = ['id', 'section_id', 'title', 'content', 'status', 'last_modified_by', 'updated_at']
        read_only_fields = ['id', 'updated_at', 'last_modified_by']


class NEMAGazetteNoticeSerializer(serializers.ModelSerializer):
    matched_project_name = serializers.CharField(source='matched_project.name', read_only=True)
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = NEMAGazetteNotice
        fields = [
            'id', 'notice_number', 'gazette_issue', 'publication_date',
            'project_title', 'proponent_name', 'county', 'location_description',
            'plot_number', 'anticipated_impacts', 'proposed_mitigations',
            'public_comments_deadline', 'days_remaining', 'matched_project',
            'matched_project_name', 'match_confidence', 'match_reason',
            'status', 'source_url', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_days_remaining(self, obj):
        if obj.public_comments_deadline:
            from django.utils import timezone
            today = timezone.now().date()
            delta = (obj.public_comments_deadline - today).days
            return max(0, delta)
        return None
