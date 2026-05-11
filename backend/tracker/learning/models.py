import uuid
from django.db import models
from skills.models import Skill


class CareerPath(models.Model):
    """Career Paths Table"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=200)
    description = models.TextField(blank=True, null=True)
    industry = models.CharField(max_length=100, blank=True, null=True)
    avg_salary_min = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    avg_salary_max = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    growth_outlook = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'career_paths'

    def __str__(self):
        return self.title

    @property
    def avg_salary_range(self):
        if self.avg_salary_min and self.avg_salary_max:
            return f"${self.avg_salary_min:,.0f} - ${self.avg_salary_max:,.0f}"
        return "Not specified"

class LearningModule(models.Model):
    """Learning Modules Table"""
    CONTENT_TYPE_CHOICES = [
        ('video', 'Video'),
        ('article', 'Article'),
        ('quiz', 'Quiz'),
        ('pdf', 'PDF'),
        ('interactive', 'Interactive'),
    ]
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True, null=True)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPE_CHOICES, blank=True, null=True)
    content_url = models.TextField(blank=True, null=True)
    duration_minutes = models.IntegerField(blank=True, null=True)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, blank=True, null=True)
    xp_points = models.IntegerField(default=10)
    is_required = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'learning_modules'

    def __str__(self):
        return self.title

    @property
    def duration_display(self):
        if self.duration_minutes:
            hours = self.duration_minutes // 60
            minutes = self.duration_minutes % 60
            if hours > 0:
                return f"{hours}h {minutes}m"
            return f"{minutes}m"
        return "Not specified"

class CareerPathModule(models.Model):
    """Career Path - Learning Module Junction Table"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    career_path = models.ForeignKey('CareerPath', on_delete=models.CASCADE, related_name='modules')
    module = models.ForeignKey(LearningModule, on_delete=models.CASCADE, related_name='career_paths')
    order_index = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'career_path_modules'
        unique_together = ['career_path', 'module']
        ordering = ['order_index']

    def __str__(self):
        return f"{self.career_path.title} - {self.module.title} (Order: {self.order_index})"

class CareerPathSkill(models.Model):
    """Career Path Skills Junction Table"""
    IMPORTANCE_CHOICES = [
        ('required', 'Required'),
        ('recommended', 'Recommended'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    career_path = models.ForeignKey('CareerPath', on_delete=models.CASCADE, related_name='required_skills')
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name='career_paths')
    importance = models.CharField(max_length=20, choices=IMPORTANCE_CHOICES, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'career_path_skills'
        unique_together = ['career_path', 'skill']

    def __str__(self):
        return f"{self.career_path.title} - {self.skill.name} ({self.importance})"

class Prerequisite(models.Model):
    """Module Prerequisites Table"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.ForeignKey(LearningModule, on_delete=models.CASCADE, related_name='prerequisites_of')
    prerequisite = models.ForeignKey(LearningModule, on_delete=models.CASCADE, related_name='required_for')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'prerequisites'
        unique_together = ['module', 'prerequisite']

    def __str__(self):
        return f"{self.prerequisite.title} → {self.module.title}"