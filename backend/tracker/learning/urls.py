from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CareerPathViewSet, LearningModuleViewSet

router = DefaultRouter()
router.register('career-paths', CareerPathViewSet, basename='career-path')
router.register('modules', LearningModuleViewSet, basename='learning-module')

urlpatterns = [
    path('', include(router.urls)),
]