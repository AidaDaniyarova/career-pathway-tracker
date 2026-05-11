import uuid
from django.db import models


class UserEnrollment(models.Model):
    """User Career Path Enrollment Table"""
    STATUS_CHOICES = [
        ('enrolled', 'Enrolled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('dropped', 'Dropped'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='enrollments')
    career_path = models.ForeignKey('learning.CareerPath', on_delete=models.CASCADE, related_name='enrollments')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='enrolled')
    progress_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    started_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_enrollments'
        unique_together = ['user', 'career_path']

    def __str__(self):
        return f"{self.user.username} - {self.career_path.title} ({self.status})"

    @property
    def is_completed(self):
        return self.status == 'completed'

    def update_progress(self):
        """Update progress based on completed modules in user's selected modules"""
        # Get only the modules the user has selected (has progress records)
        user_modules = UserProgress.objects.filter(
            user=self.user,
            enrollment=self
        )

        total_modules = user_modules.count()
        if total_modules == 0:
            self.progress_percent = 0
        else:
            completed = user_modules.filter(status='completed').count()
            self.progress_percent = (completed / total_modules) * 100

        if self.progress_percent >= 100 and self.status != 'completed':
            self.status = 'completed'
        elif self.progress_percent > 0 and self.status == 'enrolled':
            self.status = 'in_progress'

        self.save(update_fields=['progress_percent', 'status'])


class UserProgress(models.Model):
    """User Module Progress Table"""
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]


    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='module_progress')
    module = models.ForeignKey('learning.LearningModule', on_delete=models.CASCADE, related_name='user_progress')
    enrollment = models.ForeignKey(UserEnrollment, on_delete=models.CASCADE, related_name='module_progress', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    progress_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    time_spent_seconds = models.IntegerField(default=0)
    score = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_progress'
        unique_together = ['user', 'module']

    def __str__(self):
        return f"{self.user.username} - {self.module.title} ({self.status})"

    @property
    def is_completed(self):
        return self.status == 'completed'
