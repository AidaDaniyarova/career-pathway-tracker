from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CVViewSet, CVTemplateViewSet

router = DefaultRouter()
router.register('cvs', CVViewSet, basename='cv')
router.register('templates', CVTemplateViewSet, basename='cv-template')

urlpatterns = [
    path('', include(router.urls)),
]