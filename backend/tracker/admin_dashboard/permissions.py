from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """Allow access only to admin users"""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff

    def has_object_permission(self, request, view, obj):
        return request.user and request.user.is_authenticated and request.user.is_staff


class IsAdminOrReadOnly(permissions.BasePermission):
    """Allow read-only access to all, full access to admins"""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and request.user.is_staff

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and request.user.is_staff