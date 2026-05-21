from learning.models import CareerPath
from progress.models import UserEnrollment, UserProgress
from ai.models import Recommendation
from quizzes.models import CareerQuiz, QuizResponse, QuizOption


class CareerRecommendationService:
    """Service to calculate career recommendations from quiz responses"""

    def __init__(self, user, quiz_response):
        self.user = user
        self.quiz_response = quiz_response
        self.career_scores = {}

    def calculate_recommendations(self):
        """Calculate career path scores based on quiz responses"""
        # Initialize scores for all active career paths
        all_careers = CareerPath.objects.filter(is_active=True)
        for career in all_careers:
            self.career_scores[str(career.id)] = 0

        # Process each response
        for question_id, option_id in self.quiz_response.responses.items():
            try:
                option = QuizOption.objects.get(id=option_id)
                weights = option.career_weights

                for career_id, weight in weights.items():
                    if career_id in self.career_scores:
                        self.career_scores[career_id] += weight
            except QuizOption.DoesNotExist:
                continue

        # Normalize scores to 0-100 range
        max_score = max(self.career_scores.values()) if self.career_scores else 1
        for career_id in self.career_scores:
            if max_score > 0:
                self.career_scores[career_id] = round((self.career_scores[career_id] / max_score) * 100, 2)

        # Save scores to response
        self.quiz_response.career_scores = self.career_scores

        # Find top recommended career path
        if self.career_scores:
            top_career_id = max(self.career_scores, key=self.career_scores.get)
            self.quiz_response.recommended_career_path_id = top_career_id

        self.quiz_response.save()

        return self.get_recommendations()

    def get_recommendations(self, limit=5):
        """Get sorted career recommendations"""

        careers = CareerPath.objects.filter(id__in=self.career_scores.keys())
        recommendations = []

        for career in careers:
            score = self.career_scores.get(str(career.id), 0)
            recommendations.append({
                'career_path_id': str(career.id),
                'title': career.title,
                'slug': career.slug,
                'description': career.description,
                'industry': career.industry,
                'match_score': score,
                'avg_salary_min': float(career.avg_salary_min) if career.avg_salary_min else None,
                'avg_salary_max': float(career.avg_salary_max) if career.avg_salary_max else None,
                'growth_outlook': career.growth_outlook,
            })

        # Sort by match score descending
        recommendations.sort(key=lambda x: x['match_score'], reverse=True)

        # Save to AI recommendations table
        self._save_recommendations(recommendations[:limit])

        return recommendations[:limit]

    def _save_recommendations(self, recommendations):
        """Save recommendations to the AI recommendations table"""

        # Clear old recommendations for this user
        Recommendation.objects.filter(user=self.user).delete()

        for rec in recommendations:
            Recommendation.objects.create(
                user=self.user,
                career_path_id=rec['career_path_id'],
                score=rec['match_score']
            )


class QuizDataService:
    """Service for managing quiz data"""

    @staticmethod
    def get_quiz_for_taking(quiz_id=None):
        """Get quiz questions for user to take"""
        if quiz_id:
            quiz = CareerQuiz.objects.get(id=quiz_id, is_active=True)
        else:
            quiz = CareerQuiz.objects.filter(is_active=True).first()

        if not quiz:
            return None

        questions = quiz.questions.filter(is_active=True).order_by('order')

        quiz_data = {
            'id': str(quiz.id),
            'title': quiz.title,
            'description': quiz.description,
            'total_questions': questions.count(),
            'questions': []
        }

        for q in questions:
            question_data = {
                'id': str(q.id),
                'text': q.question_text,
                'type': q.question_type,
                'order': q.order,
                'options': []
            }

            if q.question_type == 'ranking':
                question_data['ranking_items'] = q.ranking_items

            for opt in q.options.all().order_by('order'):
                question_data['options'].append({
                    'id': str(opt.id),
                    'text': opt.option_text
                })

            quiz_data['questions'].append(question_data)

        return quiz_data

    @staticmethod
    def get_user_previous_response(user):
        """Get user's previous quiz response"""
        return QuizResponse.objects.filter(
            user=user
        ).order_by('-completed_at').first()