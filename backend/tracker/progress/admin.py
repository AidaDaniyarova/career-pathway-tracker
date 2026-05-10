from django.contrib import admin
from .models import UserEnrollment, UserProgress


@admin.register(UserEnrollment)
class UserEnrollmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'career_path', 'status', 'progress_percent', 'started_at')
    list_filter = ('status',)
    search_fields = ('user__username', 'career_path__title')


@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'module', 'status', 'progress_percent', 'time_spent_seconds', 'score')
    list_filter = ('status',)
    search_fields = ('user__username', 'module__title')