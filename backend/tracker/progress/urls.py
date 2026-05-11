from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserEnrollmentViewSet, UserProgressViewSet, DashboardView, EnrollmentProgressView

router = DefaultRouter()
router.register(r'enrollments', UserEnrollmentViewSet, basename='enrollment')
router.register(r'progress', UserProgressViewSet, basename='progress')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('enrollments/<uuid:enrollment_id>/progress/', EnrollmentProgressView.as_view(), name='enrollment-progress'),
]