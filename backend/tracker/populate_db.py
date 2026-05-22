import os
import django
from decimal import Decimal
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tracker.settings')
django.setup()

from users.models import User
from skills.models import Skill, UserSkill
from learning.models import CareerPath, LearningModule
from progress.models import UserEnrollment, UserProgress
from ai.models import JobScan, Recommendation
from cv.models import CV
from quizzes.models import CareerQuiz, QuizQuestion, QuizOption


# -----------------------------
# USERS
# -----------------------------
def create_users():
    print("\nCreating users...")

    users_data = [
        ("john@example.com", "John", "Doe", 3, "bachelor"),
        ("jane@example.com", "Jane", "Smith", 5, "master"),
        ("mike@example.com", "Mike", "Johnson", 2, "bachelor"),
        ("sarah@example.com", "Sarah", "Wilson", 8, "phd"),
        ("alex@example.com", "Alex", "Chen", 4, "master"),
    ]

    users = []

    for email, first, last, exp, edu in users_data:
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": first,
                "last_name": last,
                "education_level": edu,
                "years_experience": exp,
                "total_xp": random.randint(50, 400),  # ⭐ XP added
            }
        )

        if created:
            user.set_password("password123")
            user.save()
            print(f"Created: {email}")
        else:
            print(f"Exists: {email}")

        users.append(user)

    return users


# -----------------------------
# SKILLS
# -----------------------------
def create_skills():
    print("\nCreating skills...")

    skills = [
        "Python", "JavaScript", "React", "Django", "Node.js",
        "Data Analysis", "Machine Learning", "SQL", "AWS", "Docker",
        "Git", "REST APIs", "TypeScript", "Leadership"
    ]

    objs = []
    for s in skills:
        obj, _ = Skill.objects.get_or_create(name=s)
        objs.append(obj)

    return objs


# -----------------------------
# USER SKILLS + XP BOOST
# -----------------------------
def assign_skills(users, skills):
    print("\nAssigning skills + XP boost...")

    skill_map = {s.name: s for s in skills}

    for user in users:
        for skill in random.sample(skills, 5):
            UserSkill.objects.get_or_create(
                user=user,
                skill=skill,
                defaults={"level": random.randint(2, 5)}
            )

        # ⭐ XP bonus per skill assignment
        user.total_xp += random.randint(20, 120)
        user.save()


# -----------------------------
# CAREER PATHS
# -----------------------------
def create_paths():
    print("\nCreating career paths...")

    data = [
        # Original paths
        ("Full Stack Developer", "full-stack-developer"),
        ("Data Scientist", "data-scientist"),
        ("DevOps Engineer", "devops-engineer"),

        # New paths
        ("Software Developer", "software-developer"),
        ("Product Manager", "product-manager"),
        ("UX Designer", "ux-designer"),
        ("Frontend Developer", "frontend-developer"),
        ("Data Analyst", "data-analyst"),
        ("Cybersecurity Analyst", "cybersecurity-analyst"),
        ("QA Engineer", "qa-engineer"),
        ("Cloud Architect", "cloud-architect"),
        ("Security Engineer", "security-engineer"),
    ]

    paths = []
    for title, slug in data:
        p, created = CareerPath.objects.get_or_create(
            slug=slug,
            defaults={
                "title": title,
                "industry": get_industry_for_path(title),
                "description": get_description_for_path(title),
                "avg_salary_min": get_salary_range(title)[0],
                "avg_salary_max": get_salary_range(title)[1],
                "growth_outlook": get_growth_outlook(title)
            }
        )
        paths.append(p)
    return paths


def get_industry_for_path(title):
    """Return industry based on career path"""
    industries = {
        "Software Developer": "Technology",
        "Product Manager": "Product Management",
        "UX Designer": "Design",
        "Frontend Developer": "Technology",
        "Data Analyst": "Data & Analytics",
        "Cybersecurity Analyst": "Security",
        "QA Engineer": "Quality Assurance",
        "Cloud Architect": "Cloud Computing",
        "Security Engineer": "Security",
        "Full Stack Developer": "Technology",
        "Data Scientist": "Data & Analytics",
        "DevOps Engineer": "DevOps"
    }
    return industries.get(title, "Technology")


def get_description_for_path(title):
    """Return description based on career path"""
    descriptions = {
        "Software Developer": "Design, code, and maintain software applications. Work on backend systems, databases, and APIs.",
        "Product Manager": "Lead product development, define requirements, and coordinate between stakeholders and development teams.",
        "UX Designer": "Create intuitive and engaging user experiences through research, wireframing, and prototyping.",
        "Frontend Developer": "Build responsive web applications using modern frameworks like React, Vue, or Angular.",
        "Data Analyst": "Analyze data to extract insights, create visualizations, and support data-driven decision making.",
        "Cybersecurity Analyst": "Protect systems and networks from security threats, monitor for breaches, and implement security measures.",
        "QA Engineer": "Ensure software quality through testing, automation, and quality assurance processes.",
        "Cloud Architect": "Design and manage cloud infrastructure on AWS, Azure, or Google Cloud Platform.",
        "Security Engineer": "Build and maintain security systems, conduct security assessments, and respond to incidents.",
        "Full Stack Developer": "Build complete web applications working with both frontend and backend technologies.",
        "Data Scientist": "Use machine learning and statistical methods to analyze complex data and build predictive models.",
        "DevOps Engineer": "Manage CI/CD pipelines, infrastructure automation, and system reliability."
    }
    return descriptions.get(title, f"Career path for {title}")


def get_salary_range(title):
    """Return min and max salary for career path"""
    salaries = {
        "Software Developer": (60000, 120000),
        "Product Manager": (80000, 160000),
        "UX Designer": (55000, 110000),
        "Frontend Developer": (55000, 115000),
        "Data Analyst": (50000, 100000),
        "Cybersecurity Analyst": (65000, 130000),
        "QA Engineer": (45000, 90000),
        "Cloud Architect": (100000, 180000),
        "Security Engineer": (75000, 150000),
        "Full Stack Developer": (65000, 130000),
        "Data Scientist": (70000, 140000),
        "DevOps Engineer": (80000, 160000)
    }
    return salaries.get(title, (50000, 100000))


def get_growth_outlook(title):
    """Return growth outlook for career path"""
    outlooks = {
        "Software Developer": "Very High",
        "Product Manager": "High",
        "UX Designer": "High",
        "Frontend Developer": "Very High",
        "Data Analyst": "Very High",
        "Cybersecurity Analyst": "Very High",
        "QA Engineer": "Moderate",
        "Cloud Architect": "Very High",
        "Security Engineer": "Very High",
        "Full Stack Developer": "Very High",
        "Data Scientist": "Very High",
        "DevOps Engineer": "Very High"
    }
    return outlooks.get(title, "High")


# -----------------------------
# MODULES
# -----------------------------
def create_modules():
    print("\nCreating modules...")

    modules_data = [
        {
            "title": "Python Fundamentals",
            "difficulty": "beginner",
            "xp_points": 50,
            "duration_minutes": 480,  # 8 hours
            "content_type": "video",
            "content_url": "https://www.coursera.org/learn/python-programming",
            "description": "Learn Python programming fundamentals including variables, loops, functions, and basic data structures."
        },
        {
            "title": "Django Basics",
            "difficulty": "beginner",
            "xp_points": 75,
            "duration_minutes": 600,  # 10 hours
            "content_type": "video",
            "content_url": "https://www.coursera.org/learn/django-web-framework",
            "description": "Build web applications using Django framework, including models, views, templates, and URL routing."
        },
        {
            "title": "React Basics",
            "difficulty": "beginner",
            "xp_points": 75,
            "duration_minutes": 540,  # 9 hours
            "content_type": "video",
            "content_url": "https://www.coursera.org/learn/react-basics",
            "description": "Learn React fundamentals including components, props, state, and hooks."
        },
        {
            "title": "SQL Basics",
            "difficulty": "beginner",
            "xp_points": 50,
            "duration_minutes": 360,  # 6 hours
            "content_type": "video",
            "content_url": "https://www.coursera.org/learn/sql-for-data-science",
            "description": "Master SQL queries, joins, aggregations, and database design fundamentals."
        },
        {
            "title": "Docker Intro",
            "difficulty": "beginner",
            "xp_points": 60,
            "duration_minutes": 300,  # 5 hours
            "content_type": "video",
            "content_url": "https://www.coursera.org/learn/docker-basics",
            "description": "Learn containerization with Docker, including images, containers, and Docker Compose."
        },
        {
            "title": "Advanced Python",
            "difficulty": "advanced",
            "xp_points": 100,
            "duration_minutes": 720,  # 12 hours
            "content_type": "video",
            "content_url": "https://www.coursera.org/learn/advanced-python",
            "description": "Deep dive into Python decorators, generators, context managers, and concurrency."
        },
        {
            "title": "REST API Development",
            "difficulty": "intermediate",
            "xp_points": 85,
            "duration_minutes": 480,  # 8 hours
            "content_type": "video",
            "content_url": "https://www.coursera.org/learn/rest-api-design",
            "description": "Design and build RESTful APIs with best practices and authentication."
        },
        {
            "title": "Database Design",
            "difficulty": "intermediate",
            "xp_points": 80,
            "duration_minutes": 540,  # 9 hours
            "content_type": "video",
            "content_url": "https://www.coursera.org/learn/database-design",
            "description": "Learn normalization, indexing, query optimization, and database architecture."
        },
        {
            "title": "DevOps Fundamentals",
            "difficulty": "intermediate",
            "xp_points": 90,
            "duration_minutes": 600,  # 10 hours
            "content_type": "video",
            "content_url": "https://www.coursera.org/learn/devops-basics",
            "description": "Understand CI/CD pipelines, infrastructure as code, and deployment strategies."
        },
        {
            "title": "Cloud Computing with AWS",
            "difficulty": "advanced",
            "xp_points": 120,
            "duration_minutes": 720,  # 12 hours
            "content_type": "video",
            "content_url": "https://www.coursera.org/learn/aws-cloud-practitioner",
            "description": "Learn cloud concepts, AWS services, and cloud architecture best practices."
        }
    ]

    modules = []
    for module_data in modules_data:
        m, created = LearningModule.objects.get_or_create(
            title=module_data["title"],
            defaults={
                "difficulty": module_data["difficulty"],
                "xp_points": module_data["xp_points"],
                "duration_minutes": module_data["duration_minutes"],
                "content_type": module_data["content_type"],
                "content_url": module_data["content_url"],
                "description": module_data["description"],
            }
        )

        modules.append(m)

    return modules


# -----------------------------
# ENROLLMENT + PROGRESS (FIXED LOGIC)
# -----------------------------
def create_progress(users, paths, modules):
    print("\nCreating enrollments + progress...")

    for user in users:
        path = random.choice(paths)

        enrollment, _ = UserEnrollment.objects.get_or_create(
            user=user,
            career_path=path,
            defaults={
                "status": "in_progress",
                "progress_percent": random.randint(10, 80)
            }
        )

        for module in random.sample(modules, 3):
            status = random.choice(["completed", "in_progress"])

            prog, created = UserProgress.objects.get_or_create(
                user=user,
                module=module,
                enrollment=enrollment,
                defaults={
                    "status": status,
                    "progress_percent": 100 if status == "completed" else 40,
                    "time_spent_seconds": random.randint(1000, 8000),
                    "score": Decimal(random.randint(60, 100))
                }
            )

            # ⭐ XP reward for completed modules
            if status == "completed":
                user.total_xp += module.xp_points
                user.save()

        # update enrollment
        enrollment.refresh_from_db()


# -----------------------------
# QUIZZES
# -----------------------------
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


# -----------------------------
# CV + ATS SCORE
# -----------------------------
def create_cvs(users):
    print("\nCreating CVs...")

    for user in users:
        cv, _ = CV.objects.get_or_create(
            user=user,
            defaults={
                "title": f"{user.first_name} CV",
                "content": {
                    "summary": "Software developer profile",
                    "skills": ["Python", "Django", "React"],
                },
                "ats_score": Decimal(random.randint(60, 95))
            }
        )


# -----------------------------
# JOB SCAN
# -----------------------------
def create_job_scans(users):
    print("\nCreating job scans...")

    for user in users:
        cv = CV.objects.filter(user=user).first()
        if not cv:
            continue

        JobScan.objects.get_or_create(
            user=user,
            cv=cv,
            job_description="Python Django React developer role",
            defaults={
                "match_score": Decimal(random.randint(60, 95)),
                "model_version": "v1"
            }
        )


# -----------------------------
# RECOMMENDATIONS
# -----------------------------
def create_recommendations(users, paths):
    print("\nCreating recommendations...")

    for user in users:
        for path in random.sample(paths, 2):
            Recommendation.objects.get_or_create(
                user=user,
                career_path=path,
                defaults={
                    "score": Decimal(random.randint(60, 95))
                }
            )


# -----------------------------
# MAIN
# -----------------------------
def main():
    print("\n===== POPULATING DATABASE =====")

    users = create_users()
    skills = create_skills()
    assign_skills(users, skills)

    paths = create_paths()
    modules = create_modules()

    create_progress(users, paths, modules)
    create_cvs(users)
    create_job_scans(users)
    create_recommendations(users, paths)
    create_career_quiz()

    print("\n===== DONE =====")
    print(f"Users: {User.objects.count()}")
    print(f"Progress: {UserProgress.objects.count()}")
    print(f"Enrollments: {UserEnrollment.objects.count()}")


if __name__ == "__main__":
    main()