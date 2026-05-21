from rest_framework import serializers
from .models import Recommendation, JobScan


class RecommendationSerializer(serializers.ModelSerializer):
    career_path_title = serializers.ReadOnlyField(source='career_path.title')
    career_path_slug = serializers.ReadOnlyField(source='career_path.slug')

    class Meta:
        model = Recommendation
        fields = ['id', 'career_path', 'career_path_title', 'career_path_slug',
                  'score', 'created_at', 'updated_at']


class RecommendationDetailSerializer(serializers.ModelSerializer):
    career_path_title = serializers.ReadOnlyField(source='career_path.title')
    career_path_slug = serializers.ReadOnlyField(source='career_path.slug')
    career_path_description = serializers.ReadOnlyField(source='career_path.description')
    career_path_industry = serializers.ReadOnlyField(source='career_path.industry')

    class Meta:
        model = Recommendation
        fields = '__all__'


class JobScanSerializer(serializers.ModelSerializer):
    cv_title = serializers.ReadOnlyField(source='cv.title')

    class Meta:
        model = JobScan
        fields = ['id', 'cv', 'cv_title', 'job_title', 'company', 'match_score',
                  'extracted_keywords', 'required_skills', 'missing_skills', 'created_at']


class JobMatchRequestSerializer(serializers.Serializer):
    cv_id = serializers.UUIDField()
    job_description = serializers.CharField()
    job_title = serializers.CharField(required=False, allow_blank=True)
    company = serializers.CharField(required=False, allow_blank=True)


class SkillGapAnalysisSerializer(serializers.Serializer):
    matched_skills = serializers.ListField(child=serializers.CharField())
    missing_skills = serializers.ListField(child=serializers.CharField())
    total_required = serializers.IntegerField()
    total_matched = serializers.IntegerField()
    completion_rate = serializers.FloatField()