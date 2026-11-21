from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from progress.models import UserEnrollment
from skills.models import UserSkill
from users.models import User
from skills.models import Skill


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'full_name',
                  'profile_picture', 'education_level', 'years_experience', 'created_at')
        read_only_fields = ('id', 'email', 'created_at')

    def get_full_name(self, obj):
        return obj.full_name


class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed user with skills and progress"""
    skills = serializers.SerializerMethodField()
    enrollments = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'profile_picture',
                  'bio', 'interests', 'education_level', 'years_experience', 'current_job_title',
                  'skills', 'enrollments', 'created_at', 'total_xp', 'current_level')

    def get_skills(self, obj):
        user_skills = UserSkill.objects.filter(user=obj).select_related('skill')
        return [{'id': str(us.skill.id), 'name': us.skill.name, 'level': us.level} for us in user_skills]

    def get_enrollments(self, obj):
        enrollments = UserEnrollment.objects.filter(user=obj).select_related('career_path')
        return [{'id': str(e.id), 'career_path': e.career_path.title, 'status': e.status,
                 'progress': float(e.progress_percent)}
                for e in enrollments]


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'password_confirm',
                  'first_name', 'last_name')
        read_only_fields = ('id',)

    def validate_email(self, value):
        value = User.objects.normalize_email(value).lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already registered")
        return value

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords do not match"})

        candidate = User(email=data.get('email', ''), first_name=data.get('first_name', ''),
                         last_name=data.get('last_name', ''))
        try:
            validate_password(data['password'], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})

        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    confirm_password = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match"})
        request = self.context.get('request')
        try:
            validate_password(data['new_password'], user=getattr(request, 'user', None))
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": list(exc.messages)})
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile display"""
    full_name = serializers.SerializerMethodField()
    member_since = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'profile_picture', 'bio', 'interests',
            'education_level', 'years_experience', 'current_job_title',
            'member_since', 'total_xp', 'current_level', 'is_active', 'is_staff',
            'ai_consent', 'ai_consent_at', 'ai_consent_version', 'ai_consent_required'
        )
        read_only_fields = ('id', 'email', 'created_at', 'is_active', 'is_staff', 'total_xp',
                            'current_level', 'ai_consent', 'ai_consent_at', 'ai_consent_version')

    ai_consent_required = serializers.SerializerMethodField()

    def get_ai_consent_required(self, obj):
        """True when the user must (re)answer the AI notice."""
        return obj.ai_consent is None or (
            obj.ai_consent and obj.ai_consent_version != settings.AI_CONSENT_VERSION
        )

    def get_full_name(self, obj):
        return obj.get_full_name()


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile"""
    skills = serializers.ListField(child=serializers.DictField(), required=False, write_only=True)

    class Meta:
        model = User
        fields = (
            'first_name', 'last_name', 'profile_picture', 'bio',
            'interests', 'education_level', 'years_experience',
            'current_job_title', 'skills'
        )

    def validate_profile_picture(self, value):
        return _validate_picture_url(value)

    def validate_skills(self, value):
        if len(value) > 100:
            raise serializers.ValidationError("Too many skills")
        return value

    def validate_years_experience(self, value):
        if value < 0:
            raise serializers.ValidationError("Years of experience cannot be negative")
        if value > 60:
            raise serializers.ValidationError("Please enter a valid number of years")
        return value

    def validate_education_level(self, value):
        valid_choices = ['high_school', 'associate', 'bachelor', 'master', 'phd', 'other']
        if value and value not in valid_choices:
            raise serializers.ValidationError(f"Must be one of: {', '.join(valid_choices)}")
        return value

    def update(self, instance, validated_data):
        skills_data = validated_data.pop('skills', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if skills_data is not None:
            UserSkill.objects.filter(user=instance).delete()
            for skill_data in skills_data:
                skill_id = skill_data.get('id')
                level = skill_data.get('level', 3)
                if skill_id:
                    try:
                        skill = Skill.objects.get(id=skill_id)
                        UserSkill.objects.create(
                            user=instance,
                            skill=skill,
                            level=level
                        )
                    except Skill.DoesNotExist:
                        pass

        return instance


class UserAvatarSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('profile_picture',)

    def validate_profile_picture(self, value):
        return _validate_picture_url(value)


class UserStatsSerializer(serializers.Serializer):
    enrollments = serializers.DictField()
    modules = serializers.DictField()
    xp = serializers.DictField()
    quizzes = serializers.DictField()
    skills = serializers.DictField()
    cvs = serializers.DictField()
    time_spent = serializers.DictField()
    streak = serializers.DictField()


class UserSettingsSerializer(serializers.Serializer):
    email_notifications = serializers.BooleanField(default=True)
    marketing_emails = serializers.BooleanField(default=False)
    profile_visibility = serializers.ChoiceField(choices=['public', 'private'], default='public')
    language = serializers.ChoiceField(choices=['en', 'es', 'fr', 'de'], default='en')

    def update(self, instance, validated_data):
        return validated_data

def _validate_picture_url(value):
    """Allow only http(s) URLs or site-relative paths (blocks javascript:/data: URLs)."""
    if not value:
        return value
    if value.startswith('/') and not value.startswith('//'):
        return value
    try:
        URLValidator(schemes=['http', 'https'])(value)
    except DjangoValidationError:
        raise serializers.ValidationError("Invalid URL format")
    return value


class PublicProfileSerializer(serializers.ModelSerializer):
    """Public, non-sensitive view of a user (no email, no consent data)."""
    full_name = serializers.SerializerMethodField()
    member_since = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = User
        fields = ('id', 'first_name', 'last_name', 'full_name', 'profile_picture', 'bio',
                  'current_job_title', 'member_since', 'total_xp', 'current_level')
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.get_full_name()


class AIConsentSerializer(serializers.Serializer):
    accepted = serializers.BooleanField()
