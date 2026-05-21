import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Recommendation(models.Model):
    """AI Career Path Recommendations Table"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='recommendations')
    career_path = models.ForeignKey('learning.CareerPath', on_delete=models.CASCADE, related_name='recommendations')
    score = models.DecimalField(max_digits=5, decimal_places=2,
                                validators=[MinValueValidator(0), MaxValueValidator(100)])

    # Detailed recommendation data
    recommendation_data = models.JSONField(default=dict, blank=True, help_text="Detailed breakdown of recommendation")

    # Sources that contributed to this recommendation
    source_quiz = models.BooleanField(default=False)
    source_cv = models.BooleanField(default=False)
    source_skills = models.BooleanField(default=False)
    source_progress = models.BooleanField(default=False)
    source_job_scans = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'recommendations'
        unique_together = ['user', 'career_path']
        ordering = ['-score']

    def __str__(self):
        return f"Recommendation for {self.user.email}: {self.career_path.title} ({self.score}%)"


import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class JobScan(models.Model):
    """Job Description Scanner Table"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='job_scans')
    cv = models.ForeignKey('cv.CV', on_delete=models.CASCADE, related_name='job_scans', null=True, blank=True)
    job_title = models.CharField(max_length=200, blank=True)
    company = models.CharField(max_length=200, blank=True)
    job_description = models.TextField()
    match_score = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)

    # Extracted data
    extracted_keywords = models.JSONField(default=list, blank=True)
    required_skills = models.JSONField(default=list, blank=True)
    missing_skills = models.JSONField(default=list, blank=True)
    matched_skills = models.JSONField(default=list, blank=True)
    recommendations = models.JSONField(default=list, blank=True)

    model_version = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'job_scans'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.job_title or 'Scan'} - {self.created_at:%Y-%m-%d}"


class InterviewAnswer(models.Model):
    """User's saved answers to interview questions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='interview_answers')
    question_text = models.TextField()
    question_category = models.CharField(max_length=50, blank=True)
    answer_text = models.TextField()
    job_title = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'interview_answers'
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.email} - {self.question_text[:50]}..."