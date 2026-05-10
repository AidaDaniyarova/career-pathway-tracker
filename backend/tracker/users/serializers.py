from rest_framework import serializers
from progress.models import UserEnrollment
from skills.models import UserSkill
from users.models import User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'full_name',
                  'profile_picture', 'education_level', 'years_experience', 'created_at')
        read_only_fields = ('created_at',)

    def get_full_name(self, obj):
        return obj.full_name


class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed user with skills and progress"""
    skills = serializers.SerializerMethodField()
    enrollments = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'profile_picture',
                  'education_level', 'years_experience', 'skills', 'enrollments', 'created_at')

    def get_skills(self, obj):
        user_skills = UserSkill.objects.filter(user=obj).select_related('skill')
        return [{'id': us.skill.id, 'name': us.skill.name, 'level': us.level} for us in user_skills]

    def get_enrollments(self, obj):
        enrollments = UserEnrollment.objects.filter(user=obj).select_related('career_path')
        return [{'id': e.id, 'career_path': e.career_path.title, 'status': e.status, 'progress': e.progress_percent}
                for e in enrollments]


class UserRegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'password_confirm',
                  'first_name', 'last_name')
        read_only_fields = ('id',)

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords do not match"})

        # Check if username already exists
        if User.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError({"username": "Username already taken"})

        # Check if email already exists
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({"email": "Email already registered"})

        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    confirm_password = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match"})
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile display"""
    full_name = serializers.SerializerMethodField()
    member_since = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'profile_picture', 'education_level', 'years_experience',
            'member_since', 'is_active'
        )
        read_only_fields = ('id', 'email', 'created_at', 'is_active')

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile"""

    class Meta:
        model = User
        fields = (
            'first_name', 'last_name', 'profile_picture',
            'education_level', 'years_experience'
        )

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


class UserAvatarSerializer(serializers.ModelSerializer):
    """Serializer for updating profile picture"""

    class Meta:
        model = User
        fields = ('profile_picture',)

    def validate_profile_picture(self, value):
        # Basic URL validation
        if value and not (value.startswith('http://') or value.startswith('https://') or value.startswith('/')):
            raise serializers.ValidationError("Invalid URL format")
        return value


class UserStatsSerializer(serializers.Serializer):
    """Serializer for user statistics (read-only)"""
    enrollments = serializers.DictField()
    modules = serializers.DictField()
    xp = serializers.DictField()
    quizzes = serializers.DictField()
    skills = serializers.DictField()
    cvs = serializers.DictField()
    time_spent = serializers.DictField()
    streak = serializers.DictField()


class UserSettingsSerializer(serializers.Serializer):
    """Serializer for user settings"""
    email_notifications = serializers.BooleanField(default=True)
    marketing_emails = serializers.BooleanField(default=False)
    profile_visibility = serializers.ChoiceField(choices=['public', 'private'], default='public')
    language = serializers.ChoiceField(choices=['en', 'es', 'fr', 'de'], default='en')

    def update(self, instance, validated_data):
        return validated_data