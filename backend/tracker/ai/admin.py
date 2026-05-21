from django.contrib import admin
from .models import JobScan, Recommendation

@admin.register(JobScan)
class JobScanAdmin(admin.ModelAdmin):
    list_display = ('user', 'cv', 'match_score', 'model_version', 'created_at')
    list_filter = ('model_version', 'created_at')
    search_fields = ('user__username',)


@admin.register(Recommendation)
class RecommendationAdmin(admin.ModelAdmin):
    list_display = ('user', 'career_path', 'score', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'career_path__title')