from rest_framework import serializers
from .models import CareerQuiz, QuizQuestion, QuizOption, QuizResponse


class QuizOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizOption
        fields = ['id', 'option_text', 'order']


class QuizQuestionSerializer(serializers.ModelSerializer):
    options = QuizOptionSerializer(many=True, read_only=True)

    class Meta:
        model = QuizQuestion
        fields = ['id', 'question_text', 'question_type', 'ranking_items', 'order', 'options']


class CareerQuizSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, read_only=True)
    question_count = serializers.IntegerField(source='get_question_count', read_only=True)

    class Meta:
        model = CareerQuiz
        fields = ['id', 'title', 'description', 'question_count', 'questions', 'is_active']


class QuizResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizResponse
        fields = ['id', 'quiz', 'responses', 'career_scores', 'recommended_career_path_id', 'completed_at']
        read_only_fields = ['id', 'career_scores', 'recommended_career_path_id', 'completed_at']


class QuizSubmitSerializer(serializers.Serializer):
    """Serializer for submitting quiz answers"""
    quiz_id = serializers.UUIDField(required=True)
    responses = serializers.DictField(
        child=serializers.CharField(),
        help_text="Dictionary of question_id to selected option_id"
    )


class QuizRecommendationSerializer(serializers.Serializer):
    """Serializer for quiz recommendations"""
    career_path_id = serializers.UUIDField()
    title = serializers.CharField()
    slug = serializers.CharField()
    description = serializers.CharField()
    industry = serializers.CharField(allow_null=True)
    match_score = serializers.FloatField()
    avg_salary_min = serializers.FloatField(allow_null=True)
    avg_salary_max = serializers.FloatField(allow_null=True)
    growth_outlook = serializers.CharField(allow_null=True)