from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()

# User management
router.register('users', UserAdminViewSet, basename='admin-users')
router.register('user-skills', UserSkillAdminViewSet, basename='admin-user-skills')

# Skill management
router.register('skills', SkillAdminViewSet, basename='admin-skills')

# Career path management
router.register('career-paths', CareerPathAdminViewSet, basename='admin-career-paths')
router.register('career-path-modules', CareerPathModuleAdminViewSet, basename='admin-career-path-modules')
router.register('career-path-skills', CareerPathSkillAdminViewSet, basename='admin-career-path-skills')

# Learning module management
router.register('modules', LearningModuleAdminViewSet, basename='admin-modules')
router.register('prerequisites', PrerequisiteAdminViewSet, basename='admin-prerequisites')

# Quiz management
router.register('quizzes', QuizAdminViewSet, basename='admin-quizzes')
router.register('questions', QuestionAdminViewSet, basename='admin-questions')
router.register('question-options', QuestionOptionAdminViewSet, basename='admin-question-options')
router.register('quiz-attempts', QuizAttemptAdminViewSet, basename='admin-quiz-attempts')

# Progress management
router.register('enrollments', UserEnrollmentAdminViewSet, basename='admin-enrollments')
router.register('progress', UserProgressAdminViewSet, basename='admin-progress')

# AI management
router.register('cvs', CVAdminViewSet, basename='admin-cvs')
router.register('job-scans', JobScanAdminViewSet, basename='admin-job-scans')
router.register('recommendations', RecommendationAdminViewSet, basename='admin-recommendations')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard-stats/', AdminDashboardStatsView.as_view(), name='admin-dashboard-stats'),
]