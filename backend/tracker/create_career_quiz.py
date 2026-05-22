import os
import django
import uuid

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tracker.settings')
django.setup()

from quizzes.models import CareerQuiz, QuizQuestion, QuizOption
from learning.models import CareerPath


def create_career_quiz():
    # Get career paths - remove is_active filter since it doesn't exist
    # Use all career paths
    all_careers = CareerPath.objects.all()
    careers = {c.title: str(c.id) for c in all_careers}

    print(f"Found {len(careers)} career paths:")
    for title in careers.keys():
        print(f"  - {title}")
    print()

    # Create quiz
    quiz, created = CareerQuiz.objects.get_or_create(
        title="Career Path Diagnostic Quiz",
        defaults={
            'description': """Discover which career path suits you best! This quiz will ask you about your interests, 
preferred work style, and strengths. Based on your answers, we'll recommend career paths 
that align with your profile. There are no right or wrong answers - just be honest about 
your preferences!"""
        }
    )

    if not created:
        # Clear existing questions
        quiz.questions.all().delete()
        print(f"Cleared existing questions for quiz: {quiz.title}")

    print(f"Creating quiz: {quiz.title}")

    # Question 1: Work Environment Preference
    q1 = QuizQuestion.objects.create(
        quiz=quiz,
        question_text="What type of work environment do you prefer?",
        question_type='multiple_choice',
        order=1
    )

    QuizOption.objects.create(
        question=q1,
        option_text="Working independently on deep technical problems",
        order=1,
        career_weights={
            careers.get('Software Developer', ''): 10,
            careers.get('Data Scientist', ''): 8,
            careers.get('DevOps Engineer', ''): 8,
        }
    )

    QuizOption.objects.create(
        question=q1,
        option_text="Collaborating with teams on creative solutions",
        order=2,
        career_weights={
            careers.get('Product Manager', ''): 10,
            careers.get('UX Designer', ''): 9,
            careers.get('Full Stack Developer', ''): 7,
        }
    )

    QuizOption.objects.create(
        question=q1,
        option_text="Fast-paced environment with quick decisions",
        order=3,
        career_weights={
            careers.get('DevOps Engineer', ''): 9,
            careers.get('Cybersecurity Analyst', ''): 8,
            careers.get('Product Manager', ''): 8,
        }
    )

    QuizOption.objects.create(
        question=q1,
        option_text="Structured environment with clear processes",
        order=4,
        career_weights={
            careers.get('QA Engineer', ''): 10,
            careers.get('IT Project Manager', ''): 8,
            careers.get('Security Analyst', ''): 8,
        }
    )

    # Question 2: Interest Area
    q2 = QuizQuestion.objects.create(
        quiz=quiz,
        question_text="Which area interests you the most?",
        question_type='multiple_choice',
        order=2
    )

    QuizOption.objects.create(
        question=q2,
        option_text="Building websites and applications",
        order=1,
        career_weights={
            careers.get('Software Developer', ''): 10,
            careers.get('Full Stack Developer', ''): 10,
            careers.get('Frontend Developer', ''): 9,
        }
    )

    QuizOption.objects.create(
        question=q2,
        option_text="Working with data and analytics",
        order=2,
        career_weights={
            careers.get('Data Scientist', ''): 10,
            careers.get('Data Analyst', ''): 10,
            careers.get('Business Intelligence', ''): 8,
        }
    )

    QuizOption.objects.create(
        question=q2,
        option_text="Designing user experiences",
        order=3,
        career_weights={
            careers.get('UX Designer', ''): 10,
            careers.get('Product Manager', ''): 8,
            careers.get('Frontend Developer', ''): 7,
        }
    )

    QuizOption.objects.create(
        question=q2,
        option_text="Managing infrastructure and systems",
        order=4,
        career_weights={
            careers.get('DevOps Engineer', ''): 10,
            careers.get('Cloud Architect', ''): 10,
            careers.get('System Administrator', ''): 8,
        }
    )

    QuizOption.objects.create(
        question=q2,
        option_text="Security and protection",
        order=5,
        career_weights={
            careers.get('Cybersecurity Analyst', ''): 10,
            careers.get('Security Engineer', ''): 10,
            careers.get('Network Security', ''): 8,
        }
    )

    # Question 3: Preferred Work Style
    q3 = QuizQuestion.objects.create(
        quiz=quiz,
        question_text="How do you prefer to work?",
        question_type='multiple_choice',
        order=3
    )

    QuizOption.objects.create(
        question=q3,
        option_text="Writing code and building things",
        order=1,
        career_weights={
            careers.get('Software Developer', ''): 10,
            careers.get('Full Stack Developer', ''): 10,
            careers.get('Frontend Developer', ''): 9,
        }
    )

    QuizOption.objects.create(
        question=q3,
        option_text="Analyzing data and finding patterns",
        order=2,
        career_weights={
            careers.get('Data Scientist', ''): 10,
            careers.get('Data Analyst', ''): 10,
            careers.get('Business Analyst', ''): 8,
        }
    )

    QuizOption.objects.create(
        question=q3,
        option_text="Planning and organizing projects",
        order=3,
        career_weights={
            careers.get('Product Manager', ''): 10,
            careers.get('IT Project Manager', ''): 10,
            careers.get('Scrum Master', ''): 8,
        }
    )

    QuizOption.objects.create(
        question=q3,
        option_text="Testing and ensuring quality",
        order=4,
        career_weights={
            careers.get('QA Engineer', ''): 10,
            careers.get('Test Automation', ''): 9,
            careers.get('Software Developer', ''): 6,
        }
    )

    # Question 4: Problem Solving Style
    q4 = QuizQuestion.objects.create(
        quiz=quiz,
        question_text="How do you approach problem-solving?",
        question_type='multiple_choice',
        order=4
    )

    QuizOption.objects.create(
        question=q4,
        option_text="Break down complex problems into smaller pieces",
        order=1,
        career_weights={
            careers.get('Software Developer', ''): 10,
            careers.get('DevOps Engineer', ''): 9,
            careers.get('Data Scientist', ''): 9,
        }
    )

    QuizOption.objects.create(
        question=q4,
        option_text="Look for patterns and trends in data",
        order=2,
        career_weights={
            careers.get('Data Scientist', ''): 10,
            careers.get('Data Analyst', ''): 10,
            careers.get('Business Intelligence', ''): 8,
        }
    )

    QuizOption.objects.create(
        question=q4,
        option_text="Consider the big picture and long-term impact",
        order=3,
        career_weights={
            careers.get('Product Manager', ''): 10,
            careers.get('Cloud Architect', ''): 9,
            careers.get('IT Project Manager', ''): 8,
        }
    )

    QuizOption.objects.create(
        question=q4,
        option_text="Focus on security and risk mitigation",
        order=4,
        career_weights={
            careers.get('Cybersecurity Analyst', ''): 10,
            careers.get('Security Engineer', ''): 10,
            careers.get('Risk Analyst', ''): 8,
        }
    )

    # Question 5: Tools Preference
    q5 = QuizQuestion.objects.create(
        quiz=quiz,
        question_text="What tools do you enjoy working with?",
        question_type='multiple_choice',
        order=5
    )

    QuizOption.objects.create(
        question=q5,
        option_text="Code editors and IDEs (VS Code, PyCharm)",
        order=1,
        career_weights={
            careers.get('Software Developer', ''): 10,
            careers.get('Full Stack Developer', ''): 10,
            careers.get('Frontend Developer', ''): 9,
        }
    )

    QuizOption.objects.create(
        question=q5,
        option_text="Data tools (SQL, Python, Tableau)",
        order=2,
        career_weights={
            careers.get('Data Scientist', ''): 10,
            careers.get('Data Analyst', ''): 10,
            careers.get('Business Intelligence', ''): 9,
        }
    )

    QuizOption.objects.create(
        question=q5,
        option_text="Design tools (Figma, Adobe XD)",
        order=3,
        career_weights={
            careers.get('UX Designer', ''): 10,
            careers.get('Frontend Developer', ''): 7,
            careers.get('Product Manager', ''): 6,
        }
    )

    QuizOption.objects.create(
        question=q5,
        option_text="Cloud platforms (AWS, Azure, GCP)",
        order=4,
        career_weights={
            careers.get('DevOps Engineer', ''): 10,
            careers.get('Cloud Architect', ''): 10,
            careers.get('System Administrator', ''): 8,
        }
    )

    QuizOption.objects.create(
        question=q5,
        option_text="Security tools (Wireshark, Metasploit)",
        order=5,
        career_weights={
            careers.get('Cybersecurity Analyst', ''): 10,
            careers.get('Security Engineer', ''): 10,
            careers.get('Penetration Tester', ''): 9,
        }
    )

    print(f"✅ Created quiz with {quiz.questions.count()} questions")
    print("\nQuestions created:")
    for q in quiz.questions.all().order_by('order'):
        print(f"  {q.order}. {q.question_text}")

    # Print warning about missing career paths
    missing_careers = []
    expected_careers = ['Software Developer', 'Data Scientist', 'DevOps Engineer', 'Product Manager',
                        'UX Designer', 'Full Stack Developer', 'Frontend Developer', 'Data Analyst',
                        'Cybersecurity Analyst', 'QA Engineer', 'Cloud Architect', 'Security Engineer']

    for career in expected_careers:
        if career not in careers:
            missing_careers.append(career)

    if missing_careers:
        print("\n⚠️ Warning: The following career paths were not found in the database:")
        for career in missing_careers:
            print(f"  - {career}")
        print("\nPlease create these career paths for better quiz recommendations.")


if __name__ == '__main__':
    create_career_quiz()