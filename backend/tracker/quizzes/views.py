from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import CareerQuiz, QuizResponse, QuizOption, QuizQuestion
from .serializers import CareerQuizSerializer
from .services import QuizDataService
from learning.models import CareerPath
from .scoring import score_quiz, scores_for_response, top_career_id


class CareerQuizViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing career quizzes"""
    permission_classes = [permissions.AllowAny]
    serializer_class = CareerQuizSerializer

    def get_queryset(self):
        # Check if is_active field exists, if not, return all
        try:
            return CareerQuiz.objects.filter(is_active=True)
        except:
            return CareerQuiz.objects.all()

    @action(detail=False, methods=['get'], url_path='take')
    def take_quiz(self, request):
        """Get the quiz to take"""
        quiz_data = QuizDataService.get_quiz_for_taking()

        if not quiz_data:
            return Response(
                {'error': 'No active quiz found'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(quiz_data)

    @action(detail=True, methods=['get'], url_path='results')
    def get_results(self, request, pk=None):
        """Get user's previous results for this quiz"""
        quiz = self.get_object()

        # Check if user is authenticated (handle None)
        user = request.user
        is_authenticated = user is not None and user.is_authenticated

        if is_authenticated:
            response = QuizResponse.objects.filter(
                user=user,
                quiz=quiz
            ).order_by('-completed_at').first()

            if response:
                career_scores = scores_for_response(response)
                recommended_id = top_career_id(career_scores) or response.recommended_career_path_id
                recommended_career = None
                if recommended_id:
                    try:
                        recommended_career = CareerPath.objects.get(id=recommended_id)
                        recommended_career_data = {
                            'id': str(recommended_career.id),
                            'title': recommended_career.title,
                            'slug': recommended_career.slug,
                            'description': recommended_career.description,
                            'industry': recommended_career.industry,
                        }
                    except CareerPath.DoesNotExist:
                        recommended_career_data = None
                else:
                    recommended_career_data = None

                return Response({
                    'has_previous_result': True,
                    'completed_at': response.completed_at,
                    'career_scores': career_scores,
                    'recommended_career': recommended_career_data,
                })

        return Response({'has_previous_result': False})


class QuizSubmitView(APIView):
    """Submit quiz answers and get career recommendations"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        quiz_id = request.data.get('quiz_id')
        responses = request.data.get('responses', {})

        if not quiz_id:
            return Response(
                {'error': 'quiz_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(responses, dict):
            return Response(
                {'error': 'responses must be an object of {question_id: option_id}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            quiz = CareerQuiz.objects.get(id=quiz_id, is_active=True)
        except (CareerQuiz.DoesNotExist, ValueError, TypeError):
            return Response(
                {'error': 'Quiz not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Calculate career scores based on responses
        career_scores = score_quiz(quiz, responses)

        # Get top career recommendations
        recommendations = self._get_top_recommendations(career_scores)

        # Save the quiz response
        quiz_response = QuizResponse.objects.create(
            user=request.user,
            quiz=quiz,
            responses=responses,
            career_scores=career_scores,
            recommended_career_path_id=recommendations[0]['career_path_id'] if recommendations else None
        )

        # Recalculate the combined AI recommendations (quiz + skills + CV + progress)
        from ai.services import AIRecommendationService
        AIRecommendationService(request.user).generate_recommendations()

        return Response({
            'message': 'Quiz submitted successfully',
            'response_id': str(quiz_response.id),
            'recommendations': recommendations,
            'career_scores': career_scores
        }, status=status.HTTP_201_CREATED)

    def _get_top_recommendations(self, career_scores, limit=5):
        """Get top career recommendations based on scores"""
        recommendations = []

        # Filter scores > 0 and sort
        sorted_scores = [(career_id, score) for career_id, score in career_scores.items() if score > 0]
        sorted_scores.sort(key=lambda x: x[1], reverse=True)

        for career_id, score in sorted_scores[:limit]:
            try:
                career = CareerPath.objects.get(id=career_id)
                recommendations.append({
                    'career_path_id': str(career.id),
                    'title': career.title,
                    'slug': career.slug,
                    'description': career.description or '',
                    'industry': career.industry or '',
                    'match_score': score,
                    'avg_salary_min': float(career.avg_salary_min) if career.avg_salary_min else None,
                    'avg_salary_max': float(career.avg_salary_max) if career.avg_salary_max else None,
                    'growth_outlook': career.growth_outlook,
                })
            except CareerPath.DoesNotExist:
                continue

        return recommendations


class QuizStartView(APIView):
    """Get quiz questions to start"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get the first active quiz
        quiz = CareerQuiz.objects.filter(is_active=True).order_by('order', 'created_at').first()

        if not quiz:
            return Response(
                {'error': 'No active quizzes available'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get previous results if any
        previous_response = QuizResponse.objects.filter(
            user=request.user,
            quiz=quiz
        ).order_by('-completed_at').first()

        # Get questions
        questions = QuizQuestion.objects.filter(
            quiz=quiz,
            is_active=True
        ).order_by('order')

        questions_data = []
        for q in questions:
            options = QuizOption.objects.filter(question=q).order_by('order')
            questions_data.append({
                'id': str(q.id),
                'text': q.question_text,
                'type': q.question_type,
                'order': q.order,
                'options': [{
                    'id': str(opt.id),
                    'text': opt.option_text
                } for opt in options]
            })

        return Response({
            'quiz': {
                'id': str(quiz.id),
                'title': quiz.title,
                'description': quiz.description,
                'total_questions': len(questions_data),
                'questions': questions_data
            },
            'previous_results': {
                'completed_at': previous_response.completed_at,
                'career_scores': scores_for_response(previous_response)
            } if previous_response else None
        })