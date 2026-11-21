from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from .views import (
    UserViewSet, RegisterView, LoginView, LogoutView,
    ChangePasswordView, PublicProfileView,
    ProfileView, ProfileAvatarView, ProfileStatsView, ProfileManagementView,
    AIConsentView
)

router = DefaultRouter()
router.register('users', UserViewSet, basename='users')

urlpatterns = [
    # API Authentication endpoints - NO TemplateView here!
    path('register/', RegisterView.as_view(), name='api_register'),
    path('login/', LoginView.as_view(), name='api_login'),
    path('logout/', LogoutView.as_view(), name='api_logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),

    # Password management
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),

    # Profile endpoints
    path('profile/', ProfileView.as_view(), name='api_profile'),
    path('profile/avatar/', ProfileAvatarView.as_view(), name='profile_avatar'),
    path('profile/stats/', ProfileStatsView.as_view(), name='profile_stats'),
    path('profile/management/', ProfileManagementView.as_view(), name='profile_management'),
    path('profile/<uuid:user_id>/', PublicProfileView.as_view(), name='public_profile'),

    # AI usage consent
    path('ai-consent/', AIConsentView.as_view(), name='ai_consent'),

    # User management
    path('', include(router.urls)),
]