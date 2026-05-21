from rest_framework import serializers
from users.models import User
from skills.models import Skill, UserSkill
from learning.models import CareerPath, LearningModule, CareerPathModule, CareerPathSkill, Prerequisite
from quizzes.models import CareerQuiz, QuizQuestion, QuizOption, QuizResponse
from progress.models import UserEnrollment, UserProgress
from ai.models import JobScan, Recommendation
from cv.models import CV

# USER SERIALIZERS
class UserListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [ 'id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'is_active', 'is_staff', 'education_level', 'years_experience', 'created_at', 'updated_at' ]

    def get_full_name(self, obj):
        return obj.get_full_name()

class UserDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    skills = serializers.SerializerMethodField()
    enrollments_count = serializers.SerializerMethodField()
    completed_modules_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [ 'id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'profile_picture', 'education_level', 'years_experience', 'is_active', 'is_staff', 'is_superuser', 'created_at', 'updated_at', 'skills', 'enrollments_count', 'completed_modules_count' ]

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_skills(self, obj):
        user_skills = UserSkill.objects.filter(user=obj).select_related('skill')

        return [
            {
                'id': str(us.skill.id),
                'name': us.skill.name,
                'level': us.level
            }
            for us in user_skills
        ]

    def get_enrollments_count(self, obj):
        return UserEnrollment.objects.filter(user=obj).count()

    def get_completed_modules_count(self, obj):
        return UserProgress.objects.filter(
            user=obj,
            status='completed'
        ).count()

class UserCreateUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True
    )

    class Meta:
        model = User
        fields = [ 'id', 'username', 'email', 'password', 'first_name', 'last_name', 'profile_picture', 'education_level', 'years_experience', 'is_active', 'is_staff', 'is_superuser' ]

    def create(self, validated_data):
        password = validated_data.pop('password', None)

        user = User.objects.create(**validated_data)

        if password:
            user.set_password(password)
            user.save()

        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()

        return instance

# SKILL SERIALIZERS
class SkillSerializer(serializers.ModelSerializer):

    class Meta:
        model = Skill
        fields = ['id', 'name']


class UserSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(
        source='skill.name',
        read_only=True
    )

    username = serializers.CharField(
        source='user.username',
        read_only=True
    )

    class Meta:
        model = UserSkill
        fields = [ 'id', 'user', 'username', 'skill', 'skill_name', 'level' ]


# CAREER PATH SERIALIZERS
class CareerPathListSerializer(serializers.ModelSerializer):
    modules_count = serializers.SerializerMethodField()
    enrollments_count = serializers.SerializerMethodField()

    class Meta:
        model = CareerPath
        fields = [ 'id', 'title', 'slug', 'industry', 'avg_salary_min', 'avg_salary_max', 'growth_outlook', 'modules_count', 'enrollments_count', 'created_at' ]

    def get_modules_count(self, obj):
        return obj.modules.count()

    def get_enrollments_count(self, obj):
        return obj.enrollments.count()


class CareerPathDetailSerializer(serializers.ModelSerializer):
    modules = serializers.SerializerMethodField()
    required_skills = serializers.SerializerMethodField()

    class Meta:
        model = CareerPath
        fields = [ 'id', 'title', 'slug', 'description', 'industry', 'avg_salary_min', 'avg_salary_max', 'growth_outlook', 'modules', 'required_skills', 'created_at' ]

    def get_modules(self, obj):
        path_modules = CareerPathModule.objects.filter(
            career_path=obj
        ).select_related('module').order_by('order_index')

        return [
            {
                'id': str(pm.module.id),
                'title': pm.module.title,
                'order_index': pm.order_index,
                'content_type': pm.module.content_type,
                'duration_minutes': pm.module.duration_minutes,
                'xp_points': pm.module.xp_points
            }
            for pm in path_modules
        ]

    def get_required_skills(self, obj):
        path_skills = CareerPathSkill.objects.filter(
            career_path=obj
        ).select_related('skill')

        return [
            {
                'id': str(ps.skill.id),
                'name': ps.skill.name,
                'importance': ps.importance
            }
            for ps in path_skills
        ]


class CareerPathCreateUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = CareerPath
        fields = [ 'id', 'title', 'slug', 'description', 'industry', 'avg_salary_min', 'avg_salary_max', 'growth_outlook' ]


# LEARNING MODULE SERIALIZERS
class LearningModuleListSerializer(serializers.ModelSerializer):

    class Meta:
        model = LearningModule
        fields = [ 'id', 'title', 'content_type', 'duration_minutes', 'difficulty', 'xp_points', 'is_required' ]


class LearningModuleDetailSerializer(serializers.ModelSerializer):
    prerequisites = serializers.SerializerMethodField()
    career_paths = serializers.SerializerMethodField()

    class Meta:
        model = LearningModule
        fields = [ 'id', 'title', 'description', 'content_type', 'content_url', 'duration_minutes', 'difficulty', 'xp_points', 'is_required', 'prerequisites', 'career_paths' ]

    def get_prerequisites(self, obj):
        prereqs = Prerequisite.objects.filter(
            module=obj
        ).select_related('prerequisite')

        return [
            {
                'id': str(p.prerequisite.id),
                'title': p.prerequisite.title
            }
            for p in prereqs
        ]

    def get_career_paths(self, obj):
        path_modules = CareerPathModule.objects.filter(
            module=obj
        ).select_related('career_path')

        return [
            {
                'id': str(pm.career_path.id),
                'title': pm.career_path.title,
                'order_index': pm.order_index
            }
            for pm in path_modules
        ]


class LearningModuleCreateUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = LearningModule
        fields = [ 'id', 'title', 'description', 'content_type', 'content_url', 'duration_minutes', 'difficulty', 'xp_points', 'is_required' ]


# QUIZ SERIALIZERS
class QuizOptionSerializer(serializers.ModelSerializer):

    class Meta:
        model = QuizOption
        fields = [ 'id', 'option_text', 'career_weights', 'order' ]

class QuizQuestionSerializer(serializers.ModelSerializer):
    options = QuizOptionSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = QuizQuestion
        fields = [ 'id', 'quiz', 'question_text', 'question_type', 'ranking_items', 'order', 'options' ]


class CareerQuizListSerializer(serializers.ModelSerializer):
    questions_count = serializers.SerializerMethodField()

    class Meta:
        model = CareerQuiz
        fields = [ 'id', 'title', 'description', 'is_active', 'order', 'questions_count', 'created_at' ]

    def get_questions_count(self, obj):
        return obj.questions.count()


class CareerQuizDetailSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = CareerQuiz
        fields = [ 'id', 'title', 'description', 'is_active', 'order', 'questions' ]


class CareerQuizCreateUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = CareerQuiz
        fields = [ 'id', 'title', 'description', 'is_active', 'order' ]

class PrerequisiteSerializer(serializers.ModelSerializer):
    module_title = serializers.CharField(source='module.title', read_only=True)
    prerequisite_title = serializers.CharField(source='prerequisite.title', read_only=True)
    class Meta:
        model = Prerequisite
        fields = ['id', 'module', 'module_title', 'prerequisite', 'prerequisite_title']

class QuizResponseSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source='user.username',
        read_only=True
    )

    quiz_title = serializers.CharField(
        source='quiz.title',
        read_only=True
    )

    class Meta:
        model = QuizResponse
        fields = [ 'id', 'user', 'username', 'quiz', 'quiz_title', 'responses', 'career_scores', 'recommended_career_path_id', 'completed_at' ]


# PROGRESS SERIALIZERS
class UserEnrollmentListSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source='user.username',
        read_only=True
    )

    career_path_title = serializers.CharField(
        source='career_path.title',
        read_only=True
    )

    class Meta:
        model = UserEnrollment
        fields = [ 'id', 'user', 'username', 'career_path', 'career_path_title', 'status', 'progress_percent', 'started_at' ]


class UserEnrollmentDetailSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source='user.username',
        read_only=True
    )

    career_path_title = serializers.CharField(
        source='career_path.title',
        read_only=True
    )

    class Meta:
        model = UserEnrollment
        fields = [ 'id', 'user', 'username', 'career_path', 'career_path_title', 'status', 'progress_percent', 'started_at' ]


class UserProgressListSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source='user.username',
        read_only=True
    )

    module_title = serializers.CharField(
        source='module.title',
        read_only=True
    )

    class Meta:
        model = UserProgress
        fields = [ 'id', 'user', 'username', 'module', 'module_title', 'status', 'progress_percent', 'time_spent_seconds', 'score', 'enrollment' ]


# AI SERIALIZERS
class CVListSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source='user.username',
        read_only=True
    )

    class Meta:
        model = CV
        fields = [ 'id', 'user', 'username', 'title', 'ats_score', 'created_at' ]


class CVDetailSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source='user.username',
        read_only=True
    )

    class Meta:
        model = CV
        fields = [ 'id', 'user', 'username', 'title', 'content', 'ats_score', 'created_at' ]


class JobScanSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source='user.username',
        read_only=True
    )

    cv_title = serializers.CharField(
        source='cv.title',
        read_only=True
    )

    class Meta:
        model = JobScan
        fields = [ 'id', 'user', 'username', 'cv', 'cv_title', 'job_description', 'match_score', 'created_at' ]


class RecommendationSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source='user.username',
        read_only=True
    )

    career_path_title = serializers.CharField(
        source='career_path.title',
        read_only=True
    )

    class Meta:
        model = Recommendation
        fields = [ 'id', 'user', 'username', 'career_path', 'career_path_title', 'score', 'created_at' ]


# DASHBOARD STATS
class DashboardStatsSerializer(serializers.Serializer):
    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()
    total_career_paths = serializers.IntegerField()
    total_modules = serializers.IntegerField()
    total_quizzes = serializers.IntegerField()
    total_quiz_responses = serializers.IntegerField()
    total_enrollments = serializers.IntegerField()
    total_completed_modules = serializers.IntegerField()
    total_cvs = serializers.IntegerField()

    recent_users = UserListSerializer(many=True)
    recent_enrollments = UserEnrollmentListSerializer(many=True)