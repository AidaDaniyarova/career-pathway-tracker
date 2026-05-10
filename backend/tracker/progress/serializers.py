from rest_framework import serializers
from django.db.models import Sum, Count, Avg
from .models import UserEnrollment, UserProgress
from learning.models import CareerPath, LearningModule, CareerPathModule


class UserEnrollmentSerializer(serializers.ModelSerializer):
    """Basic serializer for user enrollments"""
    career_path_title = serializers.ReadOnlyField(source='career_path.title')
    career_path_slug = serializers.ReadOnlyField(source='career_path.slug')
    career_path_industry = serializers.ReadOnlyField(source='career_path.industry')

    class Meta:
        model = UserEnrollment
        fields = (
            'id', 'career_path', 'career_path_title', 'career_path_slug',
            'career_path_industry', 'status', 'progress_percent', 'started_at'
        )
        read_only_fields = ('started_at', 'progress_percent')


class UserEnrollmentDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for user enrollments with statistics"""
    career_path_title = serializers.ReadOnlyField(source='career_path.title')
    career_path_slug = serializers.ReadOnlyField(source='career_path.slug')
    career_path_description = serializers.ReadOnlyField(source='career_path.description')
    career_path_industry = serializers.ReadOnlyField(source='career_path.industry')
    career_path_avg_salary_min = serializers.ReadOnlyField(source='career_path.avg_salary_min')
    career_path_avg_salary_max = serializers.ReadOnlyField(source='career_path.avg_salary_max')
    career_path_growth_outlook = serializers.ReadOnlyField(source='career_path.growth_outlook')

    total_modules = serializers.SerializerMethodField()
    completed_modules = serializers.SerializerMethodField()
    in_progress_modules = serializers.SerializerMethodField()
    total_time_spent_hours = serializers.SerializerMethodField()
    average_score = serializers.SerializerMethodField()

    class Meta:
        model = UserEnrollment
        fields = (
            'id', 'career_path', 'career_path_title', 'career_path_slug',
            'career_path_description', 'career_path_industry',
            'career_path_avg_salary_min', 'career_path_avg_salary_max',
            'career_path_growth_outlook', 'status', 'progress_percent',
            'started_at', 'total_modules', 'completed_modules',
            'in_progress_modules', 'total_time_spent_hours', 'average_score'
        )
        read_only_fields = ('started_at', 'progress_percent')

    def get_total_modules(self, obj):
        """Get total number of modules in this career path"""
        return CareerPathModule.objects.filter(career_path=obj.career_path).count()

    def get_completed_modules(self, obj):
        """Get number of completed modules for this enrollment"""
        return UserProgress.objects.filter(
            enrollment=obj,
            status='completed'
        ).count()

    def get_in_progress_modules(self, obj):
        """Get number of in-progress modules for this enrollment"""
        return UserProgress.objects.filter(
            enrollment=obj,
            status='in_progress'
        ).count()

    def get_total_time_spent_hours(self, obj):
        """Get total time spent in hours"""
        total_seconds = UserProgress.objects.filter(
            enrollment=obj
        ).aggregate(total=Sum('time_spent_seconds'))['total'] or 0
        return round(total_seconds / 3600, 1)

    def get_average_score(self, obj):
        """Get average quiz score for this enrollment"""
        avg = UserProgress.objects.filter(
            enrollment=obj,
            score__isnull=False
        ).aggregate(avg=Avg('score'))['avg']
        return round(float(avg), 1) if avg else None


class UserProgressSerializer(serializers.ModelSerializer):
    """Basic serializer for user module progress"""
    module_title = serializers.ReadOnlyField(source='module.title')
    module_description = serializers.ReadOnlyField(source='module.description')
    module_content_type = serializers.ReadOnlyField(source='module.content_type')
    module_duration_minutes = serializers.ReadOnlyField(source='module.duration_minutes')
    module_difficulty = serializers.ReadOnlyField(source='module.difficulty')
    module_xp_points = serializers.ReadOnlyField(source='module.xp_points')
    module_is_required = serializers.ReadOnlyField(source='module.is_required')
    career_path_title = serializers.SerializerMethodField()

    class Meta:
        model = UserProgress
        fields = (
            'id', 'user', 'module', 'module_title', 'module_description',
            'module_content_type', 'module_duration_minutes', 'module_difficulty',
            'module_xp_points', 'module_is_required', 'enrollment',
            'career_path_title', 'status', 'progress_percent',
            'time_spent_seconds', 'score'
        )
        read_only_fields = ('user',)

    def get_career_path_title(self, obj):
        """Get career path title from enrollment"""
        if obj.enrollment:
            return obj.enrollment.career_path.title
        return None


class UserProgressUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user module progress"""

    class Meta:
        model = UserProgress
        fields = ('status', 'progress_percent', 'time_spent_seconds', 'score')

    def validate_progress_percent(self, value):
        """Validate progress percent is between 0 and 100"""
        if value < 0 or value > 100:
            raise serializers.ValidationError("Progress percent must be between 0 and 100")
        return value

    def validate_score(self, value):
        """Validate score is between 0 and 100"""
        if value is not None and (value < 0 or value > 100):
            raise serializers.ValidationError("Score must be between 0 and 100")
        return value

    def validate_status(self, value):
        """Validate status transition"""
        valid_statuses = ['not_started', 'in_progress', 'completed']
        if value not in valid_statuses:
            raise serializers.ValidationError(f"Status must be one of: {', '.join(valid_statuses)}")
        return value

    def update(self, instance, validated_data):
        """Update with automatic completion handling"""
        old_status = instance.status
        new_status = validated_data.get('status', instance.status)

        # If marking as completed, set progress to 100
        if new_status == 'completed' and old_status != 'completed':
            validated_data['progress_percent'] = 100

        # If setting progress to 100, mark as completed
        if validated_data.get('progress_percent', 0) >= 100:
            validated_data['status'] = 'completed'
            validated_data['progress_percent'] = 100

        return super().update(instance, validated_data)


class ModuleProgressSerializer(serializers.Serializer):
    """Serializer for individual module progress within enrollment"""
    module_id = serializers.UUIDField()
    module_title = serializers.CharField()
    order_index = serializers.IntegerField()
    status = serializers.CharField()
    progress_percent = serializers.FloatField()
    time_spent_seconds = serializers.IntegerField()
    score = serializers.FloatField(required=False, allow_null=True)
    xp_earned = serializers.IntegerField()
    is_locked = serializers.BooleanField(default=False)
    prerequisites = serializers.ListField(child=serializers.DictField(), required=False)


class EnrollmentProgressSerializer(serializers.Serializer):
    """Serializer for detailed enrollment progress"""
    enrollment_id = serializers.UUIDField()
    career_path_id = serializers.UUIDField()
    career_path_title = serializers.CharField()
    career_path_slug = serializers.CharField()
    status = serializers.CharField()
    progress_percent = serializers.FloatField()
    started_at = serializers.DateTimeField()

    statistics = serializers.DictField()
    modules = ModuleProgressSerializer(many=True)


class EnrollmentStatisticsSerializer(serializers.Serializer):
    """Serializer for enrollment statistics"""
    total_modules = serializers.IntegerField()
    completed_modules = serializers.IntegerField()
    in_progress_modules = serializers.IntegerField()
    not_started_modules = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    total_time_spent_hours = serializers.FloatField()
    average_score = serializers.FloatField(required=False, allow_null=True)


class DashboardStatisticsSerializer(serializers.Serializer):
    """Serializer for dashboard statistics"""
    total_enrollments = serializers.IntegerField()
    active_enrollments = serializers.IntegerField()
    completed_enrollments = serializers.IntegerField()
    completed_modules = serializers.IntegerField()
    total_xp = serializers.IntegerField()
    level = serializers.IntegerField()
    next_level_xp = serializers.IntegerField()
    current_streak = serializers.IntegerField()


class WeeklyActivitySerializer(serializers.Serializer):
    """Serializer for weekly activity data"""
    day = serializers.CharField()
    date = serializers.DateField()
    completions = serializers.IntegerField()


class SkillSummarySerializer(serializers.Serializer):
    """Serializer for skill summary in dashboard"""
    id = serializers.UUIDField()
    name = serializers.CharField()
    level = serializers.IntegerField()


class RecommendationSummarySerializer(serializers.Serializer):
    """Serializer for recommendation summary in dashboard"""
    id = serializers.UUIDField()
    career_path_id = serializers.UUIDField()
    title = serializers.CharField()
    slug = serializers.CharField()
    score = serializers.FloatField()


class DashboardSerializer(serializers.Serializer):
    """Complete dashboard serializer"""
    enrollments = UserEnrollmentSerializer(many=True)
    statistics = DashboardStatisticsSerializer()
    in_progress_modules = UserProgressSerializer(many=True)
    recent_activity = UserProgressSerializer(many=True)
    top_skills = SkillSummarySerializer(many=True)
    recommendations = RecommendationSummarySerializer(many=True)
    weekly_activity = WeeklyActivitySerializer(many=True)


class StartModuleSerializer(serializers.Serializer):
    """Serializer for starting a module"""
    module_id = serializers.UUIDField(required=True)
    enrollment_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_module_id(self, value):
        """Validate module exists"""
        from ..learning.models import LearningModule
        try:
            LearningModule.objects.get(id=value)
        except LearningModule.DoesNotExist:
            raise serializers.ValidationError("Module not found")
        return value

    def validate_enrollment_id(self, value):
        """Validate enrollment exists if provided"""
        if value:
            from .models import UserEnrollment
            try:
                UserEnrollment.objects.get(id=value)
            except UserEnrollment.DoesNotExist:
                raise serializers.ValidationError("Enrollment not found")
        return value


class UpdateTimeSerializer(serializers.Serializer):
    """Serializer for updating time spent"""
    module_id = serializers.UUIDField(required=True)
    seconds = serializers.IntegerField(min_value=0, required=True)
    enrollment_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_seconds(self, value):
        """Validate seconds is reasonable"""
        if value > 86400:  # Max 24 hours
            raise serializers.ValidationError("Seconds cannot exceed 86400 (24 hours)")
        return value


class UpdateProgressPercentSerializer(serializers.Serializer):
    """Serializer for updating progress percentage"""
    module_id = serializers.UUIDField(required=True)
    progress_percent = serializers.FloatField(min_value=0, max_value=100, required=True)
    enrollment_id = serializers.UUIDField(required=False, allow_null=True)


class CompleteModuleSerializer(serializers.Serializer):
    """Serializer for completing a module"""
    module_id = serializers.UUIDField(required=True)
    score = serializers.FloatField(min_value=0, max_value=100, required=False, allow_null=True)
    enrollment_id = serializers.UUIDField(required=False, allow_null=True)


class PrerequisiteCheckSerializer(serializers.Serializer):
    """Serializer for prerequisite check response"""
    module_id = serializers.UUIDField()
    module_title = serializers.CharField()
    all_prerequisites_completed = serializers.BooleanField()
    prerequisites = serializers.ListField(child=serializers.DictField())


class PrerequisiteInfoSerializer(serializers.Serializer):
    """Serializer for prerequisite information"""
    id = serializers.UUIDField()
    title = serializers.CharField()
    is_completed = serializers.BooleanField()


class ModuleProgressSummarySerializer(serializers.Serializer):
    """Serializer for module progress summary"""
    id = serializers.UUIDField()
    module_id = serializers.UUIDField()
    title = serializers.CharField()
    description = serializers.CharField(required=False, allow_null=True)
    content_type = serializers.CharField(required=False, allow_null=True)
    duration_minutes = serializers.IntegerField(required=False, allow_null=True)
    difficulty = serializers.CharField(required=False, allow_null=True)
    xp_points = serializers.IntegerField()
    status = serializers.CharField()
    progress_percent = serializers.FloatField()
    time_spent_seconds = serializers.IntegerField()
    score = serializers.FloatField(required=False, allow_null=True)
    prerequisites = PrerequisiteInfoSerializer(many=True)
    is_locked = serializers.BooleanField()
    completed_at = serializers.DateTimeField(required=False, allow_null=True)


class CareerPathSummarySerializer(serializers.Serializer):
    """Serializer for career path summary in enrollment detail"""
    id = serializers.UUIDField()
    title = serializers.CharField()
    slug = serializers.CharField()
    description = serializers.CharField(required=False, allow_null=True)
    industry = serializers.CharField(required=False, allow_null=True)


class EnrollmentDetailDataSerializer(serializers.Serializer):
    """Serializer for complete enrollment detail data"""
    enrollment = serializers.DictField()
    statistics = EnrollmentStatisticsSerializer()
    modules = ModuleProgressSummarySerializer(many=True)