from rest_framework import serializers
from skills.models import Skill, UserSkill


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ('id', 'name')


class UserSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.ReadOnlyField(source='skill.name')
    skill_id = serializers.ReadOnlyField(source='skill.id')

    class Meta:
        model = UserSkill
        fields = ('id', 'skill', 'skill_id', 'skill_name', 'level', 'created_at')
        read_only_fields = ('id', 'created_at')


class UserSkillCreateSerializer(serializers.ModelSerializer):
    skill_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = UserSkill
        fields = ('skill_id', 'level')

    def create(self, validated_data):
        from skills.models import Skill
        skill = Skill.objects.get(id=validated_data['skill_id'])
        return UserSkill.objects.create(
            user=self.context['request'].user,
            skill=skill,
            level=validated_data.get('level', 3)
        )