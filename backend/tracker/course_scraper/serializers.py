from rest_framework import serializers
from .models import ExternalCourse, CourseScrapeLog


class ExternalCourseSerializer(serializers.ModelSerializer):
    """Serializer for external courses"""

    class Meta:
        model = ExternalCourse
        fields = ['id', 'title', 'description', 'detail_page_url', 'image_url',
                  'partner', 'provider', 'difficulty', 'duration', 'course_type',
                  'skills', 'rating', 'reviews_count', 'status', 'linked_to_module']
        read_only_fields = ['id', 'provider']


class ExternalCourseDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for external courses"""

    class Meta:
        model = ExternalCourse
        fields = '__all__'
        read_only_fields = ['id', 'provider', 'scraped_at']


class CourseSearchSerializer(serializers.Serializer):
    """Serializer for course search"""
    query = serializers.CharField(required=True)
    limit = serializers.IntegerField(default=20, min_value=1, max_value=100)


class CourseScrapeRequestSerializer(serializers.Serializer):
    """Serializer for triggering course scrape"""
    search_terms = serializers.ListField(
        child=serializers.CharField(),
        required=True,
        help_text="List of search terms (e.g., ['python', 'data science'])"
    )
    max_items_per_term = serializers.IntegerField(default=20, min_value=5, max_value=100)


class CourseScrapeLogSerializer(serializers.ModelSerializer):
    """Serializer for scrape logs"""

    class Meta:
        model = CourseScrapeLog
        fields = ['id', 'search_terms', 'courses_found', 'courses_saved',
                  'status', 'error_message', 'started_at', 'completed_at']