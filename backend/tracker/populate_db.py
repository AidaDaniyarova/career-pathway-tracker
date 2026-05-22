import os
import django
from decimal import Decimal
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tracker.settings')
django.setup()

from users.models import User
from skills.models import Skill, UserSkill
from learning.models import (
    CareerPath, LearningModule
)
from progress.models import UserEnrollment, UserProgress
from ai.models import JobScan, Recommendation
from cv.models import CV


# -----------------------------
# USERS (FIXED)
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
        ("Full Stack Developer", "full-stack-developer"),
        ("Data Scientist", "data-scientist"),
        ("DevOps Engineer", "devops-engineer"),
    ]

    paths = []
    for title, slug in data:
        p, _ = CareerPath.objects.get_or_create(
            slug=slug,
            defaults={"title": title, "industry": "Tech"}
        )
        paths.append(p)

    return paths


# -----------------------------
# MODULES
# -----------------------------
def create_modules():
    print("\nCreating modules...")

    names = [
        "Python Fundamentals",
        "Django Basics",
        "React Basics",
        "SQL Basics",
        "Docker Intro"
    ]

    modules = []
    for name in names:
        m, _ = LearningModule.objects.get_or_create(
            title=name,
            defaults={
                "difficulty": "beginner",
                "xp_points": 50
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

    print("\n===== DONE =====")
    print(f"Users: {User.objects.count()}")
    print(f"Progress: {UserProgress.objects.count()}")
    print(f"Enrollments: {UserEnrollment.objects.count()}")


if __name__ == "__main__":
    main()