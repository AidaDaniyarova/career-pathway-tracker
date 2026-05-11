from django.contrib import admin
from .models import (
    CareerPath, CareerPathSkill, LearningModule,
    CareerPathModule, Prerequisite
)


@admin.register(CareerPath)
class CareerPathAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'industry', 'created_at')
    prepopulated_fields = {'slug': ('title',)}
    search_fields = ('title', 'industry')


@admin.register(CareerPathSkill)
class CareerPathSkillAdmin(admin.ModelAdmin):
    list_display = ('career_path', 'skill', 'importance')
    list_filter = ('importance',)
    search_fields = ('career_path__title', 'skill__name')


@admin.register(LearningModule)
class LearningModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'content_type', 'difficulty', 'duration_minutes', 'xp_points', 'is_required')
    list_filter = ('content_type', 'difficulty', 'is_required')
    search_fields = ('title',)


@admin.register(CareerPathModule)
class CareerPathModuleAdmin(admin.ModelAdmin):
    list_display = ('career_path', 'module', 'order_index')
    list_filter = ('career_path',)
    search_fields = ('career_path__title', 'module__title')


@admin.register(Prerequisite)
class PrerequisiteAdmin(admin.ModelAdmin):
    list_display = ('module', 'prerequisite')
    search_fields = ('module__title', 'prerequisite__title')