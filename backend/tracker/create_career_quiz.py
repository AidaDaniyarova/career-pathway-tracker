"""
Create or update only the career quiz.

The quiz is defined in populate_db.py (QUIZ_QUESTIONS). It is updated in place:
questions and options are never deleted, so the ids stored in users' past quiz
responses stay valid. Run populate_db.py first so the career paths exist.
"""
from django.db import transaction

from populate_db import create_career_quiz  # also runs django.setup()


if __name__ == '__main__':
    with transaction.atomic():
        create_career_quiz()
