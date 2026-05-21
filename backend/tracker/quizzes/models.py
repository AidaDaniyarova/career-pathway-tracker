import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class CareerQuiz(models.Model):
    """Main quiz for career path recommendation"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200, default="Career Path Diagnostic Quiz")
    description = models.TextField(blank=True, help_text="Description shown before taking the quiz")

    # Quiz settings
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    def get_question_count(self):
        return self.questions.filter(is_active=True).count()

    class Meta:
        db_table = 'career_quizzes'
        ordering = ['order', 'created_at']


class QuizQuestion(models.Model):
    """Questions for the career quiz"""
    QUESTION_TYPES = [
        ('multiple_choice', 'Multiple Choice'),
        ('likert', 'Likert Scale'),
        ('ranking', 'Ranking'),
        ('open_ended', 'Open Ended'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(CareerQuiz, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, default='multiple_choice')

    # For ranking questions
    ranking_items = models.JSONField(default=list, blank=True, help_text="Items to rank")

    # Display settings
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Q{self.order}: {self.question_text[:50]}"

    class Meta:
        db_table = 'quiz_questions'
        ordering = ['quiz', 'order']


class QuizOption(models.Model):
    """Options for multiple choice questions with career path weights"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(QuizQuestion, on_delete=models.CASCADE, related_name='options')
    option_text = models.CharField(max_length=500)
    order = models.IntegerField(default=0)

    # Career path weights (JSON mapping career_path_id -> weight)
    career_weights = models.JSONField(default=dict, help_text="{'career_path_id': weight_value}")

    def __str__(self):
        return f"{self.option_text[:50]}"

    class Meta:
        db_table = 'quiz_options'
        ordering = ['question', 'order']


class QuizResponse(models.Model):
    """User's quiz responses"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quiz_responses')
    quiz = models.ForeignKey(CareerQuiz, on_delete=models.CASCADE, related_name='responses')

    # Responses stored as JSON
    responses = models.JSONField(default=dict, help_text="{'question_id': selected_option_id}")

    # Results
    career_scores = models.JSONField(default=dict, help_text="{'career_path_id': score}")
    recommended_career_path_id = models.UUIDField(null=True, blank=True)

    # Metadata
    completed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.email} - {self.quiz.title} - {self.completed_at.date()}"

    class Meta:
        db_table = 'quiz_responses'
        ordering = ['-completed_at']