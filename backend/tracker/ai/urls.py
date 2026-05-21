from django.urls import path
from .views import (
    CareerRecommendationsView, RecommendationDetailView,
    JobMatchView, JobScanHistoryView, JobScanDetailView,
    DashboardRecommendationsView, SkillGapAnalysisView,
    AIChatView, JobDescriptionSummarizeView, InterviewQuestionsView,
    InterviewAnswerSaveView, InterviewAnswerListView, InterviewAnswerDeleteView
)

urlpatterns = [
    # Career recommendations
    path('recommendations/', CareerRecommendationsView.as_view(), name='recommendations'),
    path('recommendations/<uuid:career_path_id>/', RecommendationDetailView.as_view(), name='recommendation-detail'),

    # Job matching
    path('job-match/', JobMatchView.as_view(), name='job-match'),
    path('job-scans/', JobScanHistoryView.as_view(), name='job-scans'),
    path('job-scans/<uuid:scan_id>/', JobScanDetailView.as_view(), name='job-scan-detail'),

    # Interview answers
    path('interview-answers/', InterviewAnswerListView.as_view(), name='interview-answers'),
    path('interview-answers/save/', InterviewAnswerSaveView.as_view(), name='interview-answer-save'),
    path('interview-answers/<uuid:answer_id>/', InterviewAnswerDeleteView.as_view(), name='interview-answer-delete'),

    # AI Chat
    path('chat/', AIChatView.as_view(), name='ai-chat'),

    # Job Description Processing
    path('summarize-job/', JobDescriptionSummarizeView.as_view(), name='summarize-job'),
    path('interview-questions/', InterviewQuestionsView.as_view(), name='interview-questions'),

    # Dashboard
    path('dashboard-recommendations/', DashboardRecommendationsView.as_view(), name='dashboard-recommendations'),

    # Skill gap analysis
    path('skill-gap/<uuid:career_path_id>/', SkillGapAnalysisView.as_view(), name='skill-gap'),
]