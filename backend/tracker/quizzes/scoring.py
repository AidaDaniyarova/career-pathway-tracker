"""
Career quiz scoring.

Each answer adds its career weights to those careers. A career's score is the
points it earned divided by the most points any answer set could have earned:
for every active question, the highest weight among its options. So someone who
picks the strongest answer for a career on every question that mentions it gets
a high score, and a career the quiz barely asks about can't reach 100% from a
single answer.
"""
from learning.models import CareerPath


def _weight(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def score_quiz(quiz, responses):
    """Return {career_path_id: score 0-100}, highest first.

    responses: {question_id: option_id}. Answers to unknown or inactive questions,
    and options that don't belong to the question, are ignored.
    """
    if not isinstance(responses, dict):
        responses = {}

    questions = {
        str(q.id): {str(o.id): o.career_weights or {} for o in q.options.all()}
        for q in quiz.questions.filter(is_active=True).prefetch_related('options')
    }

    best_possible = sum(
        max((max((_weight(w) for w in weights.values()), default=0) for weights in options.values()), default=0)
        for options in questions.values()
    )

    earned = {}
    for question_id, option_id in responses.items():
        weights = questions.get(str(question_id), {}).get(str(option_id))
        if weights is None:
            continue
        for career_id, weight in weights.items():
            earned[str(career_id)] = earned.get(str(career_id), 0) + _weight(weight)

    scores = {}
    for career_id in CareerPath.objects.values_list('id', flat=True):
        career_id = str(career_id)
        points = earned.get(career_id, 0)
        scores[career_id] = round(min(100.0, points / best_possible * 100), 2) if best_possible else 0.0

    return dict(sorted(scores.items(), key=lambda item: item[1], reverse=True))


def scores_for_response(quiz_response):
    """Scores for a saved quiz response, recalculated with the current scoring.

    Falls back to the stored scores if any of the saved answers no longer exist
    (for example after the quiz was rebuilt), so old results are never lost.
    """
    responses = quiz_response.responses if isinstance(quiz_response.responses, dict) else {}
    if not responses:
        return quiz_response.career_scores or {}

    option_ids = {str(o) for o in responses.values()}
    from .models import QuizOption
    existing = {str(o) for o in QuizOption.objects.filter(
        id__in=[o for o in option_ids if _is_uuid(o)],
        question__quiz=quiz_response.quiz,
    ).values_list('id', flat=True)}
    if existing != option_ids:
        return quiz_response.career_scores or {}

    return score_quiz(quiz_response.quiz, responses)


def top_career_id(scores):
    """The highest-scoring career id, or None if nothing scored above zero."""
    best = max(scores.items(), key=lambda item: item[1], default=(None, 0))
    return best[0] if best[1] > 0 else None


def _is_uuid(value):
    import uuid
    try:
        uuid.UUID(str(value))
        return True
    except ValueError:
        return False
