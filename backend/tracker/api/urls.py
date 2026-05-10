from django.urls import path
from django.views.generic import TemplateView

urlpatterns = [
    path('', TemplateView.as_view(template_name='career_paths.html'), name='home'),
    path('career-paths/', TemplateView.as_view(template_name='career_paths.html'), name='career_paths'),
    path('skills/', TemplateView.as_view(template_name='skills.html'), name='skills'),
    path('profile/', TemplateView.as_view(template_name='profile.html'), name='profile'),
    path('users/', TemplateView.as_view(template_name='users.html'), name='users'),
    path('progress/', TemplateView.as_view(template_name='progress.html'), name='progress'),
]