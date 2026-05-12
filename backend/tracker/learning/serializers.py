from rest_framework import serializers
from learning.models import CareerPath, CareerPathSkill, LearningModule, CareerPathModule, Prerequisite


class CareerPathSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.ReadOnlyField(source='skill.name')

    class Meta:
        model = CareerPathSkill
        fields = ('id', 'skill', 'skill_name', 'importance')


class LearningModuleSimpleSerializer(serializers.ModelSerializer):
    """Basic module info (for nested use)"""
    is_selected = serializers.BooleanField(default=False, read_only=True)
    is_completed = serializers.BooleanField(default=False, read_only=True)
    progress_percent = serializers.FloatField(default=0, read_only=True)

    class Meta:
        model = LearningModule
        fields = ('id', 'title', 'description', 'content_type', 'duration_minutes',
                  'difficulty', 'xp_points', 'is_required',
                  'is_selected', 'is_completed', 'progress_percent')


class CareerPathModuleSerializer(serializers.ModelSerializer):
    module = LearningModuleSimpleSerializer(read_only=True)

    class Meta:
        model = CareerPathModule
        fields = ('id', 'module')


class CareerPathSerializer(serializers.ModelSerializer):
    modules_count = serializers.IntegerField(read_only=True)
    enrollment_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CareerPath
        fields = ('id', 'title', 'slug', 'description', 'industry',
                  'avg_salary_min', 'avg_salary_max', 'growth_outlook',
                  'modules_count', 'enrollment_count', 'created_at')


class CareerPathListSerializer(serializers.ModelSerializer):
    """Simplified for list views"""
    modules_count = serializers.IntegerField(read_only=True)
    enrollment_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CareerPath
        fields = ('id', 'title', 'slug', 'industry', 'description',
                  'avg_salary_min', 'avg_salary_max', 'growth_outlook',
                  'modules_count', 'enrollment_count', 'created_at')


class CareerPathDetailSerializer(serializers.ModelSerializer):
    """Detailed career path serializer with modules and required skills"""
    modules = serializers.SerializerMethodField()
    required_skills = CareerPathSkillSerializer(many=True, read_only=True)
    modules_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CareerPath
        fields = ('id', 'title', 'slug', 'description', 'industry',
                  'avg_salary_min', 'avg_salary_max', 'growth_outlook',
                  'required_skills', 'modules', 'modules_count', 'created_at')

    def get_modules(self, obj):
        """Get all modules for this career path with ordering"""
        path_modules = CareerPathModule.objects.filter(
            career_path=obj
        ).select_related('module')

        return LearningModuleSimpleSerializer(
            [pm.module for pm in path_modules],
            many=True
        ).data


class PrerequisiteSerializer(serializers.ModelSerializer):
    prerequisite_title = serializers.ReadOnlyField(source='prerequisite.title')

    class Meta:
        model = Prerequisite
        fields = ('id', 'prerequisite', 'prerequisite_title')


class LearningModuleSerializer(serializers.ModelSerializer):
    prerequisites = PrerequisiteSerializer(source='prerequisites_of', many=True, read_only=True)

    class Meta:
        model = LearningModule
        fields = ('id', 'title', 'description', 'content_type', 'content_url',
                  'duration_minutes', 'difficulty', 'xp_points', 'is_required',
                  'prerequisites', 'created_at')