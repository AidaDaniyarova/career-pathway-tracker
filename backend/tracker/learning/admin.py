from django.contrib import admin
from django.shortcuts import redirect
from django.urls import path
from django.utils.html import format_html
from course_scraper.coursera_scaper import CourseraScraperService, CourseraCourseImporter
from .models import (
    CareerPath, CareerPathSkill, LearningModule,
    CareerPathModule, Prerequisite
)

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

@admin.register(CareerPath)
class CareerPathAdmin(admin.ModelAdmin):
    list_display = ['title', 'industry', 'modules_count', 'scrape_button']
    search_fields = ['title', 'description']

    def modules_count(self, obj):
        return obj.modules.count()

    modules_count.short_description = 'Modules'

    def scrape_button(self, obj):
        return format_html(
            '<a class="button" href="{}" style="background: #28a745; color: white; padding: 4px 10px; text-decoration: none; border-radius: 3px;">🔍 Scrape Courses</a>',
            f'/admin/learning/careerpath/{obj.id}/scrape/'
        )

    scrape_button.short_description = 'Scrape Courses'
    scrape_button.allow_tags = True

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('<path:object_id>/scrape/', self.admin_site.admin_view(self.scrape_courses), name='careerpath-scrape'),
        ]
        return custom_urls + urls

    def scrape_courses(self, request, object_id):
        career_path = self.get_object(request, object_id)
        if career_path:
            scraper = CourseraScraperService(headless=True)
            importer = CourseraCourseImporter()

            search_terms = [career_path.title]
            courses = scraper.scrape_courses_by_search(search_terms, 10)
            result = importer.import_courses(courses, str(career_path.id))

            self.message_user(request, f'Scraped {result["created"]} new courses for {career_path.title}')

        return redirect('/admin/learning/careerpath/')