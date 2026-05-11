# models/skill.py
import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Skill(models.Model):
    """Normalized Skills Table"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'skills'

    def __str__(self):
        return self.name


class UserSkill(models.Model):
    """User Skills Junction Table"""
    LEVEL_CHOICES = [(i, i) for i in range(1, 6)]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='skills')
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name='users')
    level = models.IntegerField(
        choices=LEVEL_CHOICES,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_skills'
        unique_together = ['user', 'skill']

    def __str__(self):
        return f"{self.user.username} - {self.skill.name}: {self.level}"