from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from datetime import timedelta
from django.db.models import Avg

from users.models import User
from skills.models import Skill, UserSkill
from learning.models import CareerPath, LearningModule, CareerPathModule, CareerPathSkill, Prerequisite
from quizzes.models import CareerQuiz, QuizQuestion, QuizOption, QuizResponse
from progress.models import UserEnrollment, UserProgress
from ai.models import JobScan, Recommendation
from cv.models import CV

from .serializers import *
from .permissions import IsAdminUser
from learning.serializers import CareerPathSkillSerializer, CareerPathModuleSerializer
from quizzes.serializers import CareerQuizSerializer


# USER MANAGEMENT  
class UserAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = User.objects.all().order_by('-created_at')
    lookup_field = 'id'

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserCreateUpdateSerializer
        elif self.action == 'list':
            return UserListSerializer
        return UserDetailSerializer

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, id=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()

        return Response({
            'is_active': user.is_active
        })

    @action(detail=True, methods=['post'])
    def toggle_staff(self, request, id=None):
        user = self.get_object()

        if user.is_superuser:
            return Response(
                {'error': 'Cannot modify superuser status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.is_staff = not user.is_staff
        user.save()

        return Response({
            'is_staff': user.is_staff
        })

    @action(detail=True, methods=['delete'])
    def delete_all_data(self, request, id=None):
        user = self.get_object()

        UserEnrollment.objects.filter(user=user).delete()
        UserProgress.objects.filter(user=user).delete()
        UserSkill.objects.filter(user=user).delete()
        QuizResponse.objects.filter(user=user).delete()
        CV.objects.filter(user=user).delete()
        JobScan.objects.filter(user=user).delete()
        Recommendation.objects.filter(user=user).delete()

        return Response({
            'message': 'All user data deleted successfully'
        })


# SKILL MANAGEMENT  
class SkillAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = Skill.objects.all().order_by('name')
    serializer_class = SkillSerializer
    lookup_field = 'id'

    @action(detail=True, methods=['get'])
    def users(self, request, id=None):
        skill = self.get_object()

        user_skills = UserSkill.objects.filter(
            skill=skill
        ).select_related('user')

        return Response([
            {
                'user_id': str(us.user.id),
                'username': us.user.username,
                'level': us.level
            }
            for us in user_skills
        ])


class UserSkillAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = UserSkill.objects.all().select_related('user', 'skill')
    serializer_class = UserSkillSerializer
    lookup_field = 'id'


# CAREER PATH MANAGEMENT  
class CareerPathAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = CareerPath.objects.all().order_by('-created_at')
    lookup_field = 'id'

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CareerPathCreateUpdateSerializer
        elif self.action == 'list':
            return CareerPathListSerializer
        return CareerPathDetailSerializer

    @action(detail=True, methods=['post'])
    def add_module(self, request, id=None):
        career_path = self.get_object()

        module_id = request.data.get('module_id')
        order_index = request.data.get('order_index', 0)

        try:
            module = LearningModule.objects.get(id=module_id)

            career_path_module, created = CareerPathModule.objects.get_or_create(
                career_path=career_path,
                module=module,
                defaults={
                    'order_index': order_index
                }
            )

            if not created:
                career_path_module.order_index = order_index
                career_path_module.save()

            return Response({
                'message': 'Module added successfully'
            })

        except LearningModule.DoesNotExist:
            return Response(
                {'error': 'Module not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(
        detail=True,
        methods=['delete'],
        url_path='remove-module/(?P<module_id>[^/.]+)'
    )
    def remove_module(self, request, id=None, module_id=None):
        career_path = self.get_object()

        try:
            career_path_module = CareerPathModule.objects.get(
                career_path=career_path,
                module_id=module_id
            )

            career_path_module.delete()

            return Response({
                'message': 'Module removed successfully'
            })

        except CareerPathModule.DoesNotExist:
            return Response(
                {'error': 'Module not found in this career path'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def add_skill(self, request, id=None):
        career_path = self.get_object()

        skill_id = request.data.get('skill_id')
        importance = request.data.get('importance', 'required')

        try:
            skill = Skill.objects.get(id=skill_id)

            career_path_skill, created = CareerPathSkill.objects.get_or_create(
                career_path=career_path,
                skill=skill,
                defaults={
                    'importance': importance
                }
            )

            if not created:
                career_path_skill.importance = importance
                career_path_skill.save()

            return Response({
                'message': 'Skill added successfully'
            })

        except Skill.DoesNotExist:
            return Response(
                {'error': 'Skill not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(
        detail=True,
        methods=['delete'],
        url_path='remove-skill/(?P<skill_id>[^/.]+)'
    )
    def remove_skill(self, request, id=None, skill_id=None):
        career_path = self.get_object()

        try:
            career_path_skill = CareerPathSkill.objects.get(
                career_path=career_path,
                skill_id=skill_id
            )

            career_path_skill.delete()

            return Response({
                'message': 'Skill removed successfully'
            })

        except CareerPathSkill.DoesNotExist:
            return Response(
                {'error': 'Skill not found in this career path'},
                status=status.HTTP_404_NOT_FOUND
            )


class CareerPathModuleAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = CareerPathModule.objects.all().select_related(
        'career_path',
        'module'
    )
    serializer_class = CareerPathModuleSerializer
    lookup_field = 'id'


class CareerPathSkillAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = CareerPathSkill.objects.all().select_related(
        'career_path',
        'skill'
    )
    serializer_class = CareerPathSkillSerializer
    lookup_field = 'id'


# LEARNING MODULE MANAGEMENT  
class LearningModuleAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = LearningModule.objects.all().order_by('title')
    lookup_field = 'id'

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return LearningModuleCreateUpdateSerializer
        elif self.action == 'list':
            return LearningModuleListSerializer
        return LearningModuleDetailSerializer

    @action(detail=True, methods=['post'])
    def add_prerequisite(self, request, id=None):
        module = self.get_object()

        prerequisite_id = request.data.get('prerequisite_id')

        try:
            prerequisite = LearningModule.objects.get(id=prerequisite_id)

            Prerequisite.objects.get_or_create(
                module=module,
                prerequisite=prerequisite
            )

            return Response({
                'message': 'Prerequisite added successfully'
            })

        except LearningModule.DoesNotExist:
            return Response(
                {'error': 'Prerequisite module not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(
        detail=True,
        methods=['delete'],
        url_path='remove-prerequisite/(?P<prereq_id>[^/.]+)'
    )
    def remove_prerequisite(self, request, id=None, prereq_id=None):
        module = self.get_object()

        try:
            prereq = Prerequisite.objects.get(
                module=module,
                prerequisite_id=prereq_id
            )

            prereq.delete()

            return Response({
                'message': 'Prerequisite removed successfully'
            })

        except Prerequisite.DoesNotExist:
            return Response(
                {'error': 'Prerequisite not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class PrerequisiteAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = Prerequisite.objects.all().select_related(
        'module',
        'prerequisite'
    )
    serializer_class = PrerequisiteSerializer
    lookup_field = 'id'


# QUIZ MANAGEMENT  
class CareerQuizAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = CareerQuiz.objects.all().order_by('-created_at')
    serializer_class = CareerQuizSerializer
    lookup_field = 'id'


class QuizQuestionAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = QuizQuestion.objects.all().select_related('quiz')
    serializer_class = QuizQuestionSerializer
    lookup_field = 'id'


class QuizOptionAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = QuizOption.objects.all().select_related('question')
    serializer_class = QuizOptionSerializer
    lookup_field = 'id'


class QuizResponseAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = QuizResponse.objects.all().select_related(
        'user',
        'quiz'
    ).order_by('-completed_at')
    serializer_class = QuizResponseSerializer
    lookup_field = 'id'


# PROGRESS MANAGEMENT  
class UserEnrollmentAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = UserEnrollment.objects.all().select_related(
        'user',
        'career_path'
    ).order_by('-started_at')
    lookup_field = 'id'

    def get_serializer_class(self):
        if self.action == 'list':
            return UserEnrollmentListSerializer
        return UserEnrollmentDetailSerializer


class UserProgressAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = UserProgress.objects.all().select_related(
        'user',
        'module'
    ).order_by('-id')
    serializer_class = UserProgressListSerializer
    lookup_field = 'id'


# AI MANAGEMENT  
class CVAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = CV.objects.all().select_related('user').order_by('-created_at')
    lookup_field = 'id'

    def get_serializer_class(self):
        if self.action == 'list':
            return CVListSerializer
        return CVDetailSerializer


class JobScanAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = JobScan.objects.all().select_related(
        'user',
        'cv'
    ).order_by('-created_at')
    serializer_class = JobScanSerializer
    lookup_field = 'id'


class RecommendationAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = Recommendation.objects.all().select_related(
        'user',
        'career_path'
    ).order_by('-created_at')
    serializer_class = RecommendationSerializer
    lookup_field = 'id'


# ADMIN DASHBOARD  
class AdminDashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):

        # USERS
        total_users = User.objects.count()

        active_users = User.objects.filter(
            is_active=True
        ).count()

        new_users_last_7_days = User.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=7)
        ).count()

        # CONTENT
        total_career_paths = CareerPath.objects.count()

        total_modules = LearningModule.objects.count()

        total_quizzes = CareerQuiz.objects.count()

        total_questions = QuizQuestion.objects.count()

        total_skills = Skill.objects.count()

        # PROGRESS
        total_enrollments = UserEnrollment.objects.count()

        active_enrollments = UserEnrollment.objects.filter(
            status__in=['enrolled', 'in_progress']
        ).count()

        completed_enrollments = UserEnrollment.objects.filter(
            status='completed'
        ).count()

        total_module_progress = UserProgress.objects.count()

        completed_modules = UserProgress.objects.filter(
            status='completed'
        ).count()

        # AI
        total_cvs = CV.objects.count()

        total_job_scans = JobScan.objects.count()

        total_recommendations = Recommendation.objects.count()

        # QUIZ ANALYTICS
        total_quiz_responses = QuizResponse.objects.count()

        # ATS
        avg_ats_score = (
            CV.objects.filter(
                ats_score__isnull=False
            ).aggregate(Avg('ats_score'))['ats_score__avg']
            or 0
        )

        # RECENT
        recent_users = User.objects.all().order_by('-created_at')[:10]

        recent_enrollments = UserEnrollment.objects.all().select_related(
            'user',
            'career_path'
        ).order_by('-started_at')[:10]

        return Response({
            'users': {
                'total': total_users,
                'active': active_users,
                'new_last_7_days': new_users_last_7_days,
            },

            'content': {
                'career_paths': total_career_paths,
                'learning_modules': total_modules,
                'career_quizzes': total_quizzes,
                'quiz_questions': total_questions,
                'skills': total_skills,
            },

            'progress': {
                'total_enrollments': total_enrollments,
                'active_enrollments': active_enrollments,
                'completed_enrollments': completed_enrollments,
                'total_module_progress': total_module_progress,
                'completed_modules': completed_modules,
                'module_completion_rate': round(
                    (
                        completed_modules /
                        total_module_progress * 100
                    ) if total_module_progress > 0 else 0,
                    1
                ),
            },

            'ai': {
                'total_cvs': total_cvs,
                'total_job_scans': total_job_scans,
                'total_recommendations': total_recommendations,
                'average_ats_score': round(float(avg_ats_score), 1),
            },

            'quiz_analytics': {
                'total_responses': total_quiz_responses,
            },

            'recent_users': UserListSerializer(
                recent_users,
                many=True
            ).data,

            'recent_enrollments': UserEnrollmentListSerializer(
                recent_enrollments,
                many=True
            ).data,
        })