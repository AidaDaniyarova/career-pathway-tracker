from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CareerQuizViewSet, QuizSubmitView, QuizStartView

router = DefaultRouter()
router.register(r'quizzes', CareerQuizViewSet, basename='quiz')

urlpatterns = [
    path('', include(router.urls)),
    path('start/', QuizStartView.as_view(), name='quiz-start'),
    path('submit/', QuizSubmitView.as_view(), name='quiz-submit'),
]