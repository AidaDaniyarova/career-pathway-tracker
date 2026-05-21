from django.urls import path
from .views import ScrapeCoursesView, ScrapeForCareerPathView

urlpatterns = [
    path('scrape/', ScrapeCoursesView.as_view(), name='scrape-courses'),
    path('scrape/career-path/<uuid:career_path_id>/', ScrapeForCareerPathView.as_view(), name='scrape-career-path'),
]