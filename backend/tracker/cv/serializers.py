from rest_framework import serializers
from .models import CV, CVTemplate


class CVTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CVTemplate
        fields = ['id', 'name', 'description', 'structure', 'preview_image', 'is_active']


class CVSerializer(serializers.ModelSerializer):
    class Meta:
        model = CV
        fields = ['id', 'title', 'content', 'ats_score', 'is_default', 'created_at', 'updated_at']
        read_only_fields = ['id', 'ats_score', 'created_at', 'updated_at']


class CVDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = CV
        fields = ['id', 'title', 'content', 'ats_score', 'ats_feedback', 'is_default', 'created_at', 'updated_at']
        read_only_fields = ['id', 'ats_score', 'ats_feedback', 'created_at', 'updated_at']