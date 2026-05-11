from django.contrib import admin
from django.urls import path, include, reverse
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.shortcuts import redirect


def redirect_to_login(request):
    if request.user.is_authenticated:
         return redirect('dashboard/')
    return redirect('/login')

urlpatterns = [
    path('admin/', admin.site.urls),

    # API endpoints (all under /api/)
    path('api/admin/', include('admin_dashboard.urls')),
    path('api/users/', include('users.urls')),
    path('api/learning/', include('learning.urls')),
    path('api/quizzes/', include('assessment.urls')),
    path('api/progress/', include('progress.urls')),
    path('api/ai/', include('ai.urls')),
    path('api/cv/', include('cv.urls')),
    path('api/skills/', include('skills.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)