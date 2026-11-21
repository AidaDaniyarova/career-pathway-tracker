from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle, UserRateThrottle


class AIConsentRequired(PermissionDenied):
    default_detail = (
        'This feature uses AI to process your data. '
        'Please review and accept the AI usage notice to continue.'
    )
    default_code = 'ai_consent_required'


class HasAIConsent(BasePermission):
    """
    Allow access only to authenticated users who accepted the current
    version of the AI usage notice. The frontend listens for the
    `ai_consent_required` error code and shows the consent dialog.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if not user.has_valid_ai_consent:
            # Dict detail => response body includes a machine-readable code
            raise AIConsentRequired({
                'detail': AIConsentRequired.default_detail,
                'code': AIConsentRequired.default_code,
            })
        return True


class AIViewMixin:
    """Mixin for views that process user data with AI: consent + rate limit."""
    permission_classes = [IsAuthenticated, HasAIConsent]
    throttle_classes = [UserRateThrottle, ScopedRateThrottle]
    throttle_scope = 'ai'
