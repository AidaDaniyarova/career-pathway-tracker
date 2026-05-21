from rest_framework import serializers
from learning.models import CareerPath, CareerPathSkill, LearningModule, CareerPathModule, Prerequisite
from progress.models import UserEnrollment, UserProgress
from admin_dashboard.serializers import PrerequisiteSerializer


# SKILLS
class SkillNestedSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)

class CareerPathSkillSerializer(serializers.ModelSerializer):
    skill = SkillNestedSerializer(read_only=True)

    class Meta:
        model = CareerPathSkill
        fields = ('id', 'skill', 'importance')

# MODULES
class LearningModuleSimpleSerializer(serializers.ModelSerializer):
    is_selected = serializers.BooleanField(default=False, read_only=True)
    is_completed = serializers.BooleanField(default=False, read_only=True)
    progress_percent = serializers.FloatField(default=0, read_only=True)

    class Meta:
        model = LearningModule
        fields = (
            'id', 'title', 'description', 'content_url', 'content_type', 'duration_minutes',
            'difficulty', 'xp_points', 'is_required', 'is_selected',
            'is_completed', 'progress_percent'
        )


class CareerPathModuleSerializer(serializers.ModelSerializer):
    module = LearningModuleSimpleSerializer(read_only=True)

    class Meta:
        model = CareerPathModule
        fields = ('id', 'module', 'order_index')


# CAREER PATH
class CareerPathSerializer(serializers.ModelSerializer):
    modules_count = serializers.IntegerField(read_only=True)
    enrollment_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CareerPath
        fields = (
            'id', 'title', 'slug', 'description', 'industry',
            'avg_salary_min', 'avg_salary_max', 'growth_outlook',
            'modules_count', 'enrollment_count', 'created_at'
        )


class CareerPathListSerializer(serializers.ModelSerializer):
    modules_count = serializers.IntegerField(read_only=True)
    enrollment_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CareerPath
        fields = (
            'id', 'title', 'slug', 'industry', 'description',
            'avg_salary_min', 'avg_salary_max', 'growth_outlook',
            'modules_count', 'enrollment_count', 'created_at'
        )


class CareerPathDetailSerializer(serializers.ModelSerializer):
    required_skills = CareerPathSkillSerializer(many=True, read_only=True)
    modules = serializers.SerializerMethodField()
    modules_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CareerPath
        fields = (
            'id', 'title', 'slug', 'description', 'industry',
            'avg_salary_min', 'avg_salary_max', 'growth_outlook',
            'required_skills', 'modules', 'modules_count', 'created_at'
        )

    def get_modules(self, obj):
        request = self.context.get('request')
        user = request.user if request else None

        # Get user's enrollment for this career path
        enrollment = None
        if user and user.is_authenticated:
            enrollment = UserEnrollment.objects.filter(
                user=user, career_path=obj
            ).first()

        # Get progress map for modules in this enrollment
        progress_map = {}
        if enrollment:
            progress_qs = UserProgress.objects.filter(enrollment=enrollment)
            progress_map = {str(p.module_id): p for p in progress_qs}

        # Get all modules in this career path with order
        path_modules = CareerPathModule.objects.filter(
            career_path=obj
        ).select_related('module').order_by('order_index')

        result = []
        for cp_module in path_modules:
            module = cp_module.module
            progress = progress_map.get(str(module.id))

            # A module is SELECTED if it has a UserProgress record in this enrollment
            is_selected = progress is not None
            is_completed = progress.status == 'completed' if progress else False
            progress_percent = float(progress.progress_percent) if progress else 0

            result.append({
                'id': str(module.id),
                'title': module.title,
                'description': module.description,
                'content_type': module.content_type,
                'duration_minutes': module.duration_minutes,
                'difficulty': module.difficulty,
                'xp_points': module.xp_points,
                'is_required': module.is_required,
                'is_selected': is_selected,
                'is_completed': is_completed,
                'progress_percent': progress_percent,
                'order_index': cp_module.order_index
            })

        return result

class LearningModuleSerializer(serializers.ModelSerializer):
    prerequisites = PrerequisiteSerializer(source='prerequisites_of', many=True, read_only=True)

    class Meta:
        model = LearningModule
        fields = ('id', 'title', 'description', 'content_type', 'content_url',
                  'duration_minutes', 'difficulty', 'xp_points', 'is_required',
                  'prerequisites', 'created_at')