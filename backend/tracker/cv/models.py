import uuid
from django.db import models


class CV(models.Model):
    """User CV/Resume Table"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='cvs')
    title = models.CharField(max_length=200, blank=True, null=True)
    content = models.JSONField(default=dict)
    ats_score = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    ats_feedback = models.JSONField(default=dict, blank=True)
    is_default = models.BooleanField(default=False)
    pdf_file = models.FileField(upload_to='cvs/pdf/', null=True, blank=True)
    word_file = models.FileField(upload_to='cvs/word/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cvs'
        verbose_name = 'CV'
        verbose_name_plural = 'CVs'
        ordering = ['-is_default', '-updated_at']

    def __str__(self):
        return f"{self.user.email} - {self.title or 'Untitled CV'}"


class CVTemplate(models.Model):
    """CV Template Model"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    structure = models.JSONField(default=dict)
    preview_image = models.ImageField(upload_to='templates/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cv_templates'

    def __str__(self):
        return self.name