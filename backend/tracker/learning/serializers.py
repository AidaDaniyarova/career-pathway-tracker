from rest_framework import serializers
from learning.models import CareerPath, CareerPathSkill, LearningModule, CareerPathModule, Prerequisite


class CareerPathSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.ReadOnlyField(source='skill.name')

    class Meta:
        model = CareerPathSkill
        fields = ('id', 'skill', 'skill_name', 'importance')


class LearningModuleSimpleSerializer(serializers.ModelSerializer):
    """Basic module info (for nested use)"""

    class Meta:
        model = LearningModule
        fields = ('id', 'title', 'description', 'content_type', 'duration_minutes',
                  'difficulty', 'xp_points', 'is_required')


class CareerPathModuleSerializer(serializers.ModelSerializer):
    module = LearningModuleSimpleSerializer(read_only=True)

    class Meta:
        model = CareerPathModule
        fields = ('id', 'module', 'order_index')


class CareerPathSerializer(serializers.ModelSerializer):
    modules = CareerPathModuleSerializer(source='careerpathmodule_set', many=True, read_only=True)
    required_skills = CareerPathSkillSerializer(many=True, read_only=True)
    enrollment_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CareerPath
        fields = ('id', 'title', 'slug', 'description', 'industry',
                  'avg_salary_min', 'avg_salary_max', 'growth_outlook',
                  'modules', 'required_skills', 'enrollment_count', 'created_at')


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
    """Detailed career path serializer with modules"""
    modules = CareerPathModuleSerializer(source='careerpathmodule_set', many=True, read_only=True)
    required_skills = CareerPathSkillSerializer(many=True, read_only=True)

    class Meta:
        model = CareerPath
        fields = ('id', 'title', 'slug', 'description', 'industry',
                  'avg_salary_min', 'avg_salary_max', 'growth_outlook',
                  'required_skills', 'modules', 'created_at')


# LEARNING - MODULES
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
                  'duration_minutes', 'difficulty', 'xp_points', 'is_required', 'prerequisites')