"""
Seed demo users and reference data (career paths, modules, skills, quiz).

Safe to run repeatedly, including on production:
  - Reference rows are matched by a natural key (slug, title, name) and created
    only if missing; existing rows are not overwritten, except seeded quiz
    weights, module order within a path, and broken links left from older seeds.
  - Nothing is ever deleted.
  - Demo activity (skills, enrollments, CVs, scans, recommendations) is added
    only to the demo users, and only when that user has none of that kind yet.
  - No staff or superuser accounts are created.
"""
import os
import django
from decimal import Decimal
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tracker.settings')
django.setup()

from django.db import transaction

from users.models import User
from skills.models import Skill, UserSkill
from learning.models import CareerPath, LearningModule, CareerPathModule, CareerPathSkill, Prerequisite
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
        # ("jane@example.com", "Jane", "Smith", 5, "master"),
        # ("mike@example.com", "Mike", "Johnson", 2, "bachelor"),
        # ("sarah@example.com", "Sarah", "Wilson", 8, "phd"),
        # ("alex@example.com", "Alex", "Chen", 4, "master"),
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
# Skills handed out at random to demo users
DEMO_USER_SKILLS = [
    "Python", "JavaScript", "React", "Django", "Node.js",
    "Data Analysis", "Machine Learning", "SQL", "AWS", "Docker",
    "Git", "REST APIs", "TypeScript", "Leadership",
]

SKILLS = DEMO_USER_SKILLS + [
    # Languages and web
    "HTML", "CSS", "Java", "C#", "Go", "Bash",
    # Backend and data stores
    "PostgreSQL", "System Design", "Authentication & Security",
    # DevOps and cloud
    "Linux", "Kubernetes", "Terraform", "CI/CD", "GitHub Actions",
    "Monitoring & Observability", "Azure", "Google Cloud", "Networking",
    # Data
    "Pandas", "NumPy", "Statistics", "Data Visualisation", "Power BI", "Excel",
    "ETL", "Apache Spark", "Apache Airflow",
    # ML / AI
    "scikit-learn", "PyTorch", "Deep Learning", "NLP", "LLMs", "MLOps",
    # Security
    "Cyber Security Fundamentals", "OWASP Top 10", "Penetration Testing",
    "SIEM", "Incident Response", "Cryptography",
    # Quality
    "Manual Testing", "Test Automation", "pytest", "Selenium", "Playwright", "API Testing",
    # Design, product and soft skills
    "Accessibility", "Figma", "User Research", "Agile", "Communication", "Problem Solving",
]


def create_skills():
    print("\nCreating skills...")

    created_count = 0
    for name in SKILLS:
        _, created = Skill.objects.get_or_create(name=name)
        created_count += int(created)
    print(f"  {len(SKILLS)} skills ({created_count} new)")

    return list(Skill.objects.filter(name__in=DEMO_USER_SKILLS))


# -----------------------------
# USER SKILLS + XP BOOST
# -----------------------------
def assign_skills(users, skills):
    print("\nAssigning skills + XP boost...")

    for user in users:
        # Only for demo users with no skills yet, so re-runs don't keep adding skills or XP
        if UserSkill.objects.filter(user=user).exists():
            print(f"  skip (has skills): {user.email}")
            continue

        for skill in random.sample(skills, min(5, len(skills))):
            UserSkill.objects.get_or_create(
                user=user,
                skill=skill,
                defaults={"level": random.randint(2, 5)}
            )

        # ⭐ XP bonus per skill assignment
        user.total_xp += random.randint(20, 120)
        user.save(update_fields=["total_xp"])


# -----------------------------
# CAREER PATHS
# -----------------------------
# (title, slug, industry, description, salary min, salary max, growth outlook)
CAREER_PATHS = [
    # Original paths (values unchanged)
    ("Full Stack Developer", "full-stack-developer", "Technology",
     "Build complete web applications working with both frontend and backend technologies.",
     65000, 130000, "Very High"),
    ("Data Scientist", "data-scientist", "Data & Analytics",
     "Use machine learning and statistical methods to analyze complex data and build predictive models.",
     70000, 140000, "Very High"),
    ("DevOps Engineer", "devops-engineer", "DevOps",
     "Manage CI/CD pipelines, infrastructure automation, and system reliability.",
     80000, 160000, "Very High"),
    ("Software Developer", "software-developer", "Technology",
     "Design, code, and maintain software applications. Work on backend systems, databases, and APIs.",
     60000, 120000, "Very High"),
    ("Product Manager", "product-manager", "Product Management",
     "Lead product development, define requirements, and coordinate between stakeholders and development teams.",
     80000, 160000, "High"),
    ("UX Designer", "ux-designer", "Design",
     "Create intuitive and engaging user experiences through research, wireframing, and prototyping.",
     55000, 110000, "High"),
    ("Frontend Developer", "frontend-developer", "Technology",
     "Build responsive web applications using modern frameworks like React, Vue, or Angular.",
     55000, 115000, "Very High"),
    ("Data Analyst", "data-analyst", "Data & Analytics",
     "Analyze data to extract insights, create visualizations, and support data-driven decision making.",
     50000, 100000, "Very High"),
    ("Cybersecurity Analyst", "cybersecurity-analyst", "Security",
     "Protect systems and networks from security threats, monitor for breaches, and implement security measures.",
     65000, 130000, "Very High"),
    ("QA Engineer", "qa-engineer", "Quality Assurance",
     "Ensure software quality through testing, automation, and quality assurance processes.",
     45000, 90000, "Moderate"),
    ("Cloud Architect", "cloud-architect", "Cloud Computing",
     "Design and manage cloud infrastructure on AWS, Azure, or Google Cloud Platform.",
     100000, 180000, "Very High"),
    ("Security Engineer", "security-engineer", "Security",
     "Build and maintain security systems, conduct security assessments, and respond to incidents.",
     75000, 150000, "Very High"),

    # Graduate-friendly tech roles
    ("Backend Developer", "backend-developer", "Technology",
     "Build the server side of web products: REST APIs, databases, authentication and background jobs. "
     "Graduate roles usually start with Python, Java, C# or Node.js plus SQL.",
     55000, 120000, "Very High"),
    ("Data Engineer", "data-engineer", "Data & Analytics",
     "Build and run the pipelines that move, clean and store data so analysts and data scientists can use it. "
     "Works with SQL, Python, ETL tools and cloud data warehouses.",
     60000, 130000, "Very High"),
    ("Machine Learning Engineer", "machine-learning-engineer", "AI & Machine Learning",
     "Turn machine learning models into reliable products: data preparation, training, evaluation, "
     "deployment and monitoring of models in production.",
     70000, 150000, "Very High"),
    ("AI Engineer", "ai-engineer", "AI & Machine Learning",
     "Build applications on top of large language models and other AI services: prompt design, retrieval, "
     "evaluation and safe integration into real products.",
     70000, 150000, "Very High"),
    ("Site Reliability Engineer", "site-reliability-engineer", "DevOps",
     "Keep production systems fast and available using software engineering: monitoring, alerting, "
     "incident response, automation and capacity planning.",
     75000, 150000, "High"),
    ("Cloud Engineer", "cloud-engineer", "Cloud Computing",
     "Provision and operate cloud infrastructure on AWS, Azure or Google Cloud using infrastructure as code, "
     "containers and automated deployments. A common entry route towards cloud architecture.",
     60000, 125000, "Very High"),
    ("Penetration Tester", "penetration-tester", "Security",
     "Find vulnerabilities in web applications, networks and systems before attackers do, "
     "then report them clearly so they can be fixed. Often starts from a SOC or security analyst role.",
     60000, 130000, "High"),
    ("Test Automation Engineer", "test-automation-engineer", "Quality Assurance",
     "Write automated UI, API and integration tests and run them in CI pipelines so teams can release "
     "quickly without breaking things.",
     50000, 105000, "High"),
]


def create_paths():
    print("\nCreating career paths...")

    paths = []
    created_count = 0
    for title, slug, industry, description, salary_min, salary_max, outlook in CAREER_PATHS:
        p, created = CareerPath.objects.get_or_create(
            slug=slug,
            defaults={
                "title": title,
                "industry": industry,
                "description": description,
                "avg_salary_min": salary_min,
                "avg_salary_max": salary_max,
                "growth_outlook": outlook,
            }
        )
        created_count += int(created)
        paths.append(p)
    print(f"  {len(paths)} career paths ({created_count} new)")
    return paths


# -----------------------------
# CAREER PATH <-> SKILLS
# -----------------------------
# path title -> (required skills, recommended skills)
PATH_SKILLS = {
    "Full Stack Developer": (["JavaScript", "React", "Python", "Django", "SQL", "REST APIs", "Git"],
                             ["TypeScript", "HTML", "CSS", "Docker", "PostgreSQL"]),
    "Software Developer": (["Python", "Git", "SQL", "REST APIs", "Problem Solving"],
                           ["Java", "System Design", "Docker", "pytest", "Agile"]),
    "Backend Developer": (["Python", "Django", "SQL", "REST APIs", "Git", "PostgreSQL"],
                          ["Docker", "Authentication & Security", "System Design", "pytest", "Linux"]),
    "Frontend Developer": (["HTML", "CSS", "JavaScript", "React", "Git"],
                           ["TypeScript", "Accessibility", "REST APIs", "Figma", "Test Automation"]),
    "Data Analyst": (["SQL", "Excel", "Data Analysis", "Data Visualisation"],
                     ["Python", "Pandas", "Power BI", "Statistics", "Communication"]),
    "Data Scientist": (["Python", "Statistics", "Pandas", "Machine Learning", "SQL"],
                       ["scikit-learn", "NumPy", "Data Visualisation", "Deep Learning", "Communication"]),
    "Data Engineer": (["Python", "SQL", "ETL", "PostgreSQL", "Git"],
                      ["Apache Spark", "Apache Airflow", "AWS", "Docker", "Linux"]),
    "Machine Learning Engineer": (["Python", "Machine Learning", "scikit-learn", "PyTorch", "Git"],
                                  ["MLOps", "Docker", "Deep Learning", "Statistics", "AWS"]),
    "AI Engineer": (["Python", "LLMs", "REST APIs", "Git", "NLP"],
                    ["PyTorch", "Docker", "Machine Learning", "System Design", "Authentication & Security"]),
    "DevOps Engineer": (["Linux", "Docker", "CI/CD", "Git", "Bash"],
                        ["Kubernetes", "Terraform", "AWS", "GitHub Actions", "Monitoring & Observability"]),
    "Site Reliability Engineer": (["Linux", "Monitoring & Observability", "Incident Response", "Python", "Networking"],
                                  ["Kubernetes", "Terraform", "Go", "CI/CD", "System Design"]),
    "Cloud Engineer": (["AWS", "Linux", "Networking", "Terraform", "Docker"],
                       ["Azure", "Google Cloud", "Kubernetes", "CI/CD", "Bash"]),
    "Cloud Architect": (["AWS", "System Design", "Networking", "Terraform"],
                        ["Azure", "Google Cloud", "Kubernetes", "Authentication & Security", "Communication"]),
    "Cybersecurity Analyst": (["Cyber Security Fundamentals", "Networking", "Linux", "SIEM", "Incident Response"],
                              ["Python", "OWASP Top 10", "Cryptography", "Bash", "Communication"]),
    "Security Engineer": (["Cyber Security Fundamentals", "Authentication & Security", "Networking", "Linux", "Python"],
                          ["Cryptography", "AWS", "OWASP Top 10", "Incident Response", "Docker"]),
    "Penetration Tester": (["Penetration Testing", "OWASP Top 10", "Networking", "Linux"],
                           ["Python", "Bash", "Cryptography", "Cyber Security Fundamentals", "Communication"]),
    "QA Engineer": (["Manual Testing", "Test Automation", "API Testing", "SQL", "Git"],
                    ["Python", "Playwright", "Selenium", "Agile", "Communication"]),
    "Test Automation Engineer": (["Test Automation", "Python", "Playwright", "API Testing", "CI/CD"],
                                 ["pytest", "Selenium", "JavaScript", "Docker", "Git"]),
    "Product Manager": (["Communication", "Agile", "User Research", "Data Analysis"],
                        ["SQL", "Leadership", "Figma", "Problem Solving"]),
    "UX Designer": (["User Research", "Figma", "Accessibility", "Communication"],
                    ["HTML", "CSS", "Problem Solving", "Agile"]),
}


def link_path_skills():
    """Attach required/recommended skills to career paths (idempotent, never overwrites)."""
    print("\nLinking skills to career paths...")
    skills = {s.name: s for s in Skill.objects.all()}
    created_count = 0
    for path_title, (required, recommended) in PATH_SKILLS.items():
        path = CareerPath.objects.filter(title=path_title).first()
        if not path:
            print(f"  skip (no path): {path_title}")
            continue
        for importance, names in (("required", required), ("recommended", recommended)):
            for name in names:
                skill = skills.get(name)
                if not skill:
                    print(f"  skip (no skill): {name}")
                    continue
                _, created = CareerPathSkill.objects.get_or_create(
                    career_path=path, skill=skill, defaults={"importance": importance}
                )
                created_count += int(created)
    print(f"Created {created_count} new path-skill links")


# -----------------------------
# MODULES
# -----------------------------
# (title, difficulty, xp, minutes, content type, url, description)
MODULES = [
    # Original modules
    ("Python Fundamentals", "beginner", 50, 480, "video", "https://www.coursera.org/learn/python-programming",
     "Learn Python programming fundamentals including variables, loops, functions, and basic data structures."),
    ("Django Basics", "beginner", 75, 600, "video", "https://www.coursera.org/learn/django-web-framework",
     "Build web applications using Django framework, including models, views, templates, and URL routing."),
    ("React Basics", "beginner", 75, 540, "video", "https://www.coursera.org/learn/react-basics",
     "Learn React fundamentals including components, props, state, and hooks."),
    ("SQL Basics", "beginner", 50, 360, "video", "https://www.coursera.org/learn/sql-for-data-science",
     "Master SQL queries, joins, aggregations, and database design fundamentals."),
    ("Docker Intro", "beginner", 60, 300, "article", "https://docs.docker.com/get-started/",
     "Learn containerization with Docker, including images, containers, and Docker Compose."),
    ("Advanced Python", "advanced", 100, 720, "article", "https://docs.python.org/3/howto/index.html",
     "Deep dive into Python decorators, generators, context managers, and concurrency."),
    ("REST API Development", "intermediate", 85, 480, "article",
     "https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design",
     "Design and build RESTful APIs with best practices and authentication."),
    ("Database Design", "intermediate", 80, 540, "article", "https://www.postgresql.org/docs/current/tutorial.html",
     "Learn normalization, indexing, query optimization, and database architecture."),
    ("DevOps Fundamentals", "intermediate", 90, 600, "interactive", "https://roadmap.sh/devops",
     "Understand CI/CD pipelines, infrastructure as code, and deployment strategies."),
    ("Cloud Computing with AWS", "advanced", 120, 720, "video",
     "https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials/",
     "Learn cloud concepts, AWS services, and cloud architecture best practices."),

    # Web
    ("HTML & CSS Foundations", "beginner", 50, 480, "interactive",
     "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content",
     "Write semantic HTML and style it with CSS: the box model, Flexbox, Grid and responsive layouts."),
    ("Modern JavaScript", "beginner", 70, 720, "interactive", "https://javascript.info/",
     "Variables, functions, objects, arrays, the DOM, events, promises and async/await."),
    ("TypeScript Essentials", "intermediate", 70, 360, "article",
     "https://www.typescriptlang.org/docs/handbook/intro.html",
     "Add static types to JavaScript: types and interfaces, generics, narrowing and typing React components."),
    ("React in Depth", "intermediate", 90, 600, "interactive", "https://react.dev/learn",
     "State management, effects, context, custom hooks, data fetching and performance in React."),
    ("Web Accessibility", "beginner", 40, 180, "article",
     "https://www.w3.org/WAI/fundamentals/accessibility-intro/",
     "Build interfaces everyone can use: WCAG principles, semantic markup, keyboard support and ARIA basics."),

    # Engineering foundations
    ("Git & GitHub Workflow", "beginner", 40, 240, "article", "https://git-scm.com/book/en/v2",
     "Commits, branches, merges, rebasing, pull requests and resolving conflicts in a team workflow."),
    ("Linux Command Line", "beginner", 40, 240, "interactive",
     "https://ubuntu.com/tutorials/command-line-for-beginners",
     "Navigate the filesystem, manage files and permissions, use pipes and write simple shell scripts."),
    ("Django REST Framework", "intermediate", 85, 480, "article",
     "https://www.django-rest-framework.org/tutorial/quickstart/",
     "Build APIs with serializers, viewsets, routers, authentication, permissions and pagination."),
    ("Testing with pytest", "intermediate", 60, 300, "article",
     "https://docs.pytest.org/en/stable/getting-started.html",
     "Write unit and integration tests with fixtures, parametrisation and mocking, and measure coverage."),
    ("System Design Basics", "advanced", 110, 600, "article",
     "https://github.com/donnemartin/system-design-primer",
     "Scalability, caching, load balancing, databases, queues and how to approach system design interviews."),

    # DevOps and cloud
    ("CI/CD with GitHub Actions", "intermediate", 70, 300, "article",
     "https://docs.github.com/en/actions/get-started/understand-github-actions",
     "Automate builds, tests and deployments with workflows, jobs, secrets and environments."),
    ("Kubernetes Basics", "intermediate", 90, 480, "interactive",
     "https://kubernetes.io/docs/tutorials/kubernetes-basics/",
     "Deploy, scale and update containerised apps with pods, deployments and services."),
    ("Infrastructure as Code with Terraform", "intermediate", 90, 420, "interactive",
     "https://developer.hashicorp.com/terraform/tutorials/aws-get-started",
     "Define cloud infrastructure in code: providers, resources, state, variables and modules."),
    ("Site Reliability Engineering", "advanced", 110, 600, "article",
     "https://sre.google/sre-book/table-of-contents/",
     "SLIs and SLOs, error budgets, monitoring, on-call, incident response and blameless postmortems."),

    # Data
    ("Data Analysis with pandas", "beginner", 70, 480, "article",
     "https://pandas.pydata.org/docs/getting_started/intro_tutorials/index.html",
     "Load, clean, filter, group and reshape tabular data with pandas."),
    ("Statistics & Probability", "beginner", 70, 720, "interactive",
     "https://www.khanacademy.org/math/statistics-probability",
     "Descriptive statistics, distributions, probability, sampling and hypothesis testing."),
    ("Data Visualisation with Power BI", "beginner", 60, 420, "interactive",
     "https://learn.microsoft.com/en-us/training/powerplatform/power-bi",
     "Connect to data, model it and build interactive reports and dashboards for stakeholders."),
    ("Data Engineering Pipelines", "advanced", 120, 900, "video",
     "https://github.com/DataTalksClub/data-engineering-zoomcamp",
     "Build batch and streaming pipelines: workflow orchestration, data warehouses, Spark and Kafka."),

    # ML / AI
    ("Machine Learning Foundations", "intermediate", 100, 900, "interactive",
     "https://developers.google.com/machine-learning/crash-course",
     "Regression, classification, training and evaluation, overfitting and feature engineering."),
    ("Machine Learning with scikit-learn", "intermediate", 90, 480, "article",
     "https://scikit-learn.org/stable/getting_started.html",
     "Train and evaluate models with pipelines, cross-validation and hyperparameter tuning."),
    ("Deep Learning with PyTorch", "advanced", 120, 720, "article",
     "https://docs.pytorch.org/tutorials/beginner/basics/intro.html",
     "Tensors, datasets, neural network building blocks, training loops and saving models."),
    ("Large Language Models & NLP", "advanced", 120, 720, "interactive",
     "https://huggingface.co/learn/llm-course",
     "Transformers, tokenisation, fine-tuning and using pretrained language models from the Hugging Face Hub."),

    # Security
    ("Cyber Security Fundamentals", "beginner", 60, 420, "video",
     "https://www.netacad.com/courses/introduction-to-cybersecurity",
     "Threats, vulnerabilities, network security basics, defence in depth and staying safe online."),
    ("OWASP Top 10", "intermediate", 70, 300, "article", "https://owasp.org/www-project-top-ten/",
     "The most critical web application security risks and how to prevent them."),
    ("Web Security Academy", "advanced", 120, 900, "interactive", "https://portswigger.net/web-security",
     "Hands-on labs for SQL injection, XSS, CSRF, access control and other web vulnerabilities."),

    # Quality
    ("End-to-End Testing with Playwright", "intermediate", 70, 360, "article",
     "https://playwright.dev/docs/intro",
     "Write reliable browser tests with locators, assertions, fixtures and run them in CI."),
    ("Selenium WebDriver", "intermediate", 60, 360, "article", "https://www.selenium.dev/documentation/",
     "Automate browsers with Selenium WebDriver, waits and the page object pattern."),
    ("API Testing", "beginner", 50, 240, "article", "https://www.postman.com/api-platform/api-testing/",
     "Test REST APIs for status codes, payloads, authentication and edge cases, manually and automatically."),

    # Product and design
    ("Agile & Scrum", "beginner", 30, 120, "article", "https://scrumguides.org/scrum-guide.html",
     "Scrum roles, events and artifacts, and how agile teams plan and deliver work in sprints."),
    ("UX Design Fundamentals", "beginner", 50, 300, "article",
     "https://www.figma.com/resource-library/what-is-ux-design/",
     "User research, personas, user journeys, wireframes, prototyping and usability testing."),
]

# Links from older seeds that now return 404: (title, old url). The new url comes
# from MODULES. Only rows still holding the old url are updated, so edits made in
# the admin are kept.
BROKEN_MODULE_URLS = [
    ("Docker Intro", "https://www.coursera.org/learn/docker-basics"),
    ("Advanced Python", "https://www.coursera.org/learn/advanced-python"),
    ("REST API Development", "https://www.coursera.org/learn/rest-api-design"),
    ("Database Design", "https://www.coursera.org/learn/database-design"),
    ("DevOps Fundamentals", "https://www.coursera.org/learn/devops-basics"),
    ("Cloud Computing with AWS", "https://www.coursera.org/learn/aws-cloud-practitioner"),
]


def create_modules():
    print("\nCreating modules...")

    by_title = {}
    created_count = 0
    for title, difficulty, xp, minutes, content_type, url, description in MODULES:
        m, created = LearningModule.objects.get_or_create(
            title=title,
            defaults={
                "difficulty": difficulty,
                "xp_points": xp,
                "duration_minutes": minutes,
                "content_type": content_type,
                "content_url": url,
                "description": description,
            }
        )
        created_count += int(created)
        by_title[title] = (m, url, content_type)

    fixed = 0
    for title, old_url in BROKEN_MODULE_URLS:
        module, new_url, content_type = by_title[title]
        if module.content_url == old_url:
            module.content_url = new_url
            module.content_type = content_type
            module.save(update_fields=["content_url", "content_type"])
            fixed += 1

    print(f"  {len(MODULES)} modules ({created_count} new, {fixed} broken links fixed)")
    return [m for m, _, _ in by_title.values()]


# Module -> modules it builds on
PREREQUISITES = [
    ("Advanced Python", ["Python Fundamentals"]),
    ("Django Basics", ["Python Fundamentals"]),
    ("Django REST Framework", ["Django Basics"]),
    ("Testing with pytest", ["Python Fundamentals"]),
    ("Database Design", ["SQL Basics"]),
    ("Modern JavaScript", ["HTML & CSS Foundations"]),
    ("TypeScript Essentials", ["Modern JavaScript"]),
    ("React Basics", ["Modern JavaScript"]),
    ("React in Depth", ["React Basics"]),
    ("Kubernetes Basics", ["Docker Intro"]),
    ("CI/CD with GitHub Actions", ["Git & GitHub Workflow"]),
    ("Infrastructure as Code with Terraform", ["Cloud Computing with AWS"]),
    ("Site Reliability Engineering", ["DevOps Fundamentals"]),
    ("Data Analysis with pandas", ["Python Fundamentals"]),
    ("Data Engineering Pipelines", ["SQL Basics", "Data Analysis with pandas"]),
    ("Machine Learning Foundations", ["Statistics & Probability"]),
    ("Machine Learning with scikit-learn", ["Machine Learning Foundations", "Data Analysis with pandas"]),
    ("Deep Learning with PyTorch", ["Machine Learning Foundations"]),
    ("Large Language Models & NLP", ["Deep Learning with PyTorch"]),
    ("OWASP Top 10", ["Cyber Security Fundamentals"]),
    ("Web Security Academy", ["OWASP Top 10"]),
    ("End-to-End Testing with Playwright", ["Modern JavaScript"]),
    ("System Design Basics", ["REST API Development", "Database Design"]),
]


def create_prerequisites():
    print("\nLinking module prerequisites...")
    modules = {m.title: m for m in LearningModule.objects.all()}
    created_count = 0
    for title, prereq_titles in PREREQUISITES:
        for prereq_title in prereq_titles:
            if title not in modules or prereq_title not in modules:
                continue
            _, created = Prerequisite.objects.get_or_create(
                module=modules[title], prerequisite=modules[prereq_title]
            )
            created_count += int(created)
    print(f"Created {created_count} new prerequisites")


# -----------------------------
# CAREER PATH <-> MODULE LINKS
# -----------------------------
# Modules per path, in learning order (beginner -> advanced).
PATH_MODULES = {
    "Full Stack Developer": ["HTML & CSS Foundations", "Modern JavaScript", "Python Fundamentals", "SQL Basics",
                             "React Basics", "Django Basics", "Database Design", "REST API Development",
                             "TypeScript Essentials", "Git & GitHub Workflow", "Docker Intro"],
    "Software Developer": ["Python Fundamentals", "Git & GitHub Workflow", "SQL Basics", "Django Basics",
                           "Database Design", "REST API Development", "Testing with pytest", "Docker Intro",
                           "Advanced Python", "System Design Basics"],
    "Backend Developer": ["Python Fundamentals", "Git & GitHub Workflow", "SQL Basics", "Django Basics",
                          "Django REST Framework", "Database Design", "Testing with pytest", "Docker Intro",
                          "OWASP Top 10", "System Design Basics"],
    "Frontend Developer": ["HTML & CSS Foundations", "Modern JavaScript", "Git & GitHub Workflow", "React Basics",
                           "Web Accessibility", "TypeScript Essentials", "React in Depth", "REST API Development",
                           "End-to-End Testing with Playwright"],
    "Data Analyst": ["SQL Basics", "Statistics & Probability", "Data Visualisation with Power BI",
                     "Python Fundamentals", "Data Analysis with pandas", "Database Design"],
    "Data Scientist": ["Python Fundamentals", "SQL Basics", "Statistics & Probability", "Data Analysis with pandas",
                       "Machine Learning Foundations", "Machine Learning with scikit-learn", "Database Design",
                       "Advanced Python", "Deep Learning with PyTorch"],
    "Data Engineer": ["Python Fundamentals", "SQL Basics", "Linux Command Line", "Git & GitHub Workflow",
                      "Database Design", "Data Analysis with pandas", "Docker Intro", "Cloud Computing with AWS",
                      "Data Engineering Pipelines"],
    "Machine Learning Engineer": ["Python Fundamentals", "Statistics & Probability", "Data Analysis with pandas",
                                  "Machine Learning Foundations", "Machine Learning with scikit-learn",
                                  "Git & GitHub Workflow", "Docker Intro", "Deep Learning with PyTorch",
                                  "CI/CD with GitHub Actions"],
    "AI Engineer": ["Python Fundamentals", "Git & GitHub Workflow", "REST API Development",
                    "Machine Learning Foundations", "Deep Learning with PyTorch", "Large Language Models & NLP",
                    "Docker Intro", "OWASP Top 10"],
    "DevOps Engineer": ["Linux Command Line", "Git & GitHub Workflow", "Python Fundamentals", "Docker Intro",
                        "CI/CD with GitHub Actions", "DevOps Fundamentals", "Kubernetes Basics",
                        "Cloud Computing with AWS", "Infrastructure as Code with Terraform"],
    "Site Reliability Engineer": ["Linux Command Line", "Python Fundamentals", "Git & GitHub Workflow",
                                  "Docker Intro", "DevOps Fundamentals", "Kubernetes Basics",
                                  "Cloud Computing with AWS", "Site Reliability Engineering"],
    "Cloud Engineer": ["Linux Command Line", "Git & GitHub Workflow", "Docker Intro", "Cloud Computing with AWS",
                       "Infrastructure as Code with Terraform", "CI/CD with GitHub Actions", "Kubernetes Basics"],
    "Cloud Architect": ["Docker Intro", "Database Design", "DevOps Fundamentals", "Cloud Computing with AWS",
                        "Infrastructure as Code with Terraform", "Kubernetes Basics", "System Design Basics"],
    "Cybersecurity Analyst": ["Cyber Security Fundamentals", "Linux Command Line", "Python Fundamentals",
                              "SQL Basics", "OWASP Top 10", "Docker Intro"],
    "Security Engineer": ["Cyber Security Fundamentals", "Linux Command Line", "Python Fundamentals",
                          "Docker Intro", "OWASP Top 10", "DevOps Fundamentals", "Cloud Computing with AWS",
                          "Web Security Academy"],
    "Penetration Tester": ["Cyber Security Fundamentals", "Linux Command Line", "Python Fundamentals",
                           "HTML & CSS Foundations", "OWASP Top 10", "Web Security Academy"],
    "QA Engineer": ["Agile & Scrum", "Python Fundamentals", "SQL Basics", "API Testing", "REST API Development",
                    "Testing with pytest", "End-to-End Testing with Playwright", "Docker Intro"],
    "Test Automation Engineer": ["Python Fundamentals", "Modern JavaScript", "Git & GitHub Workflow", "API Testing",
                                 "Testing with pytest", "End-to-End Testing with Playwright", "Selenium WebDriver",
                                 "CI/CD with GitHub Actions"],
    "Product Manager": ["Agile & Scrum", "UX Design Fundamentals", "SQL Basics",
                        "Data Visualisation with Power BI"],
    "UX Designer": ["UX Design Fundamentals", "Web Accessibility", "HTML & CSS Foundations", "React Basics"],
}


def link_path_modules():
    """Attach learning modules to career paths (idempotent)."""
    print("\nLinking modules to career paths...")
    modules = {m.title: m for m in LearningModule.objects.all()}
    created_total = 0
    for path_title, module_titles in PATH_MODULES.items():
        path = CareerPath.objects.filter(title=path_title).first()
        if not path:
            print(f"  skip (no path): {path_title}")
            continue
        for order, title in enumerate(module_titles, start=1):
            module = modules.get(title)
            if not module:
                print(f"  skip (no module): {title}")
                continue
            link, created = CareerPathModule.objects.get_or_create(
                career_path=path, module=module, defaults={"order_index": order}
            )
            if not created and link.order_index != order:
                link.order_index = order
                link.save(update_fields=["order_index"])
            created_total += int(created)
        print(f"  {path_title}: {len(module_titles)} modules")
    print(f"Created {created_total} new links")


# -----------------------------
# ENROLLMENT + PROGRESS
# -----------------------------
def create_progress(users, paths, modules):
    print("\nCreating enrollments + progress...")

    for user in users:
        # Only for demo users with no enrollments yet, so re-runs don't keep enrolling them
        if UserEnrollment.objects.filter(user=user).exists():
            print(f"  skip (has enrollments): {user.email}")
            continue

        path = random.choice(paths)
        path_modules = [
            link.module for link in
            CareerPathModule.objects.filter(career_path=path).select_related("module").order_by("order_index")
        ] or random.sample(modules, 3)

        # First modules of the path: completed, then one in progress
        started = path_modules[:3]
        statuses = ["completed"] * (len(started) - 1) + ["in_progress"]

        enrollment, _ = UserEnrollment.objects.get_or_create(
            user=user,
            career_path=path,
            defaults={
                "status": "in_progress",
                "progress_percent": round(100 * statuses.count("completed") / len(path_modules)),
            }
        )

        for module, status in zip(started, statuses):
            _, created = UserProgress.objects.get_or_create(
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

            # ⭐ XP reward for completed modules (only when the progress row is new)
            if created and status == "completed":
                user.total_xp += module.xp_points
                user.save(update_fields=["total_xp"])


# -----------------------------
# QUIZZES
# -----------------------------
QUIZ_TITLE = "Career Path Diagnostic Quiz"
QUIZ_DESCRIPTION = """Discover which career path suits you best! This quiz will ask you about your interests,
preferred work style, and strengths. Based on your answers, we'll recommend career paths
that align with your profile. There are no right or wrong answers - just be honest about
your preferences!"""

# (question, [(option, {career path title: weight})]). Questions and options are
# matched by their text, so keep the text of existing ones unchanged: their ids
# are stored in users' past quiz responses.
QUIZ_QUESTIONS = [
    ("What type of work environment do you prefer?", [
        ("Working independently on deep technical problems",
         {"Software Developer": 10, "Backend Developer": 9, "Data Scientist": 8, "DevOps Engineer": 8,
          "Machine Learning Engineer": 8}),
        ("Collaborating with teams on creative solutions",
         {"Product Manager": 10, "UX Designer": 9, "Full Stack Developer": 7, "Frontend Developer": 7}),
        ("Fast-paced environment with quick decisions",
         {"DevOps Engineer": 9, "Site Reliability Engineer": 9, "Cybersecurity Analyst": 8, "Product Manager": 8}),
        ("Structured environment with clear processes",
         {"QA Engineer": 10, "Test Automation Engineer": 8, "Data Analyst": 8, "Security Engineer": 7}),
    ]),
    ("Which area interests you the most?", [
        ("Building websites and applications",
         {"Software Developer": 10, "Full Stack Developer": 10, "Frontend Developer": 9, "Backend Developer": 9}),
        ("Working with data and analytics",
         {"Data Scientist": 10, "Data Analyst": 10, "Data Engineer": 9, "Machine Learning Engineer": 7}),
        ("Designing user experiences",
         {"UX Designer": 10, "Product Manager": 8, "Frontend Developer": 7}),
        ("Managing infrastructure and systems",
         {"DevOps Engineer": 10, "Cloud Architect": 10, "Cloud Engineer": 10, "Site Reliability Engineer": 9}),
        ("Security and protection",
         {"Cybersecurity Analyst": 10, "Security Engineer": 10, "Penetration Tester": 9}),
    ]),
    ("How do you prefer to work?", [
        ("Writing code and building things",
         {"Software Developer": 10, "Full Stack Developer": 10, "Backend Developer": 9, "Frontend Developer": 9,
          "AI Engineer": 8}),
        ("Analyzing data and finding patterns",
         {"Data Scientist": 10, "Data Analyst": 10, "Machine Learning Engineer": 7}),
        ("Planning and organizing projects",
         {"Product Manager": 10, "Cloud Architect": 6}),
        ("Testing and ensuring quality",
         {"QA Engineer": 10, "Test Automation Engineer": 10, "Software Developer": 6}),
    ]),
    ("How do you approach problem-solving?", [
        ("Break down complex problems into smaller pieces",
         {"Software Developer": 10, "Backend Developer": 9, "DevOps Engineer": 9, "Data Scientist": 9}),
        ("Look for patterns and trends in data",
         {"Data Scientist": 10, "Data Analyst": 10, "Machine Learning Engineer": 8, "Data Engineer": 7}),
        ("Consider the big picture and long-term impact",
         {"Product Manager": 10, "Cloud Architect": 9, "Site Reliability Engineer": 7}),
        ("Focus on security and risk mitigation",
         {"Cybersecurity Analyst": 10, "Security Engineer": 10, "Penetration Tester": 8}),
    ]),
    ("What tools do you enjoy working with?", [
        ("Code editors and IDEs (VS Code, PyCharm)",
         {"Software Developer": 10, "Full Stack Developer": 10, "Backend Developer": 9, "Frontend Developer": 9}),
        ("Data tools (SQL, Python, Tableau)",
         {"Data Scientist": 10, "Data Analyst": 10, "Data Engineer": 9}),
        ("Design tools (Figma, Adobe XD)",
         {"UX Designer": 10, "Frontend Developer": 7, "Product Manager": 6}),
        ("Cloud platforms (AWS, Azure, GCP)",
         {"DevOps Engineer": 10, "Cloud Architect": 10, "Cloud Engineer": 10, "Site Reliability Engineer": 8}),
        ("Security tools (Wireshark, Metasploit)",
         {"Cybersecurity Analyst": 10, "Security Engineer": 10, "Penetration Tester": 10}),
    ]),
    ("Which subject did you enjoy most at school or university?", [
        ("Computer science or programming",
         {"Software Developer": 10, "Backend Developer": 10, "Full Stack Developer": 9, "AI Engineer": 7}),
        ("Maths or statistics",
         {"Data Scientist": 10, "Machine Learning Engineer": 10, "Data Analyst": 8, "AI Engineer": 7}),
        ("Physics, engineering or electronics",
         {"DevOps Engineer": 9, "Site Reliability Engineer": 9, "Cloud Engineer": 8, "Security Engineer": 7}),
        ("Art, design or psychology",
         {"UX Designer": 10, "Frontend Developer": 8, "Product Manager": 6}),
        ("Business, economics or management",
         {"Product Manager": 10, "Data Analyst": 8}),
    ]),
    ("Which result gives you the most satisfaction?", [
        ("A feature people can see and use",
         {"Frontend Developer": 10, "Full Stack Developer": 9, "UX Designer": 8, "Product Manager": 6}),
        ("A fast, reliable system that never goes down",
         {"Site Reliability Engineer": 10, "Backend Developer": 9, "DevOps Engineer": 9, "Cloud Engineer": 8}),
        ("A chart or model that answers a real question",
         {"Data Analyst": 10, "Data Scientist": 10, "Machine Learning Engineer": 8, "Data Engineer": 6}),
        ("Finding a bug or weakness before anyone else does",
         {"QA Engineer": 9, "Test Automation Engineer": 9, "Penetration Tester": 10, "Cybersecurity Analyst": 8}),
    ]),
    ("Which portfolio project would you most like to build first?", [
        ("A responsive web app with a polished interface",
         {"Frontend Developer": 10, "Full Stack Developer": 9, "UX Designer": 6}),
        ("A REST API with a database and user authentication",
         {"Backend Developer": 10, "Software Developer": 9, "Full Stack Developer": 8}),
        ("A dashboard or data pipeline built on public data",
         {"Data Analyst": 10, "Data Engineer": 10, "Data Scientist": 7}),
        ("A trained model or an LLM-powered chatbot",
         {"Machine Learning Engineer": 10, "AI Engineer": 10, "Data Scientist": 8}),
        ("A CI/CD pipeline that deploys an app to the cloud",
         {"DevOps Engineer": 10, "Cloud Engineer": 10, "Site Reliability Engineer": 8, "Cloud Architect": 6}),
        ("A home security lab or capture-the-flag write-ups",
         {"Penetration Tester": 10, "Cybersecurity Analyst": 9, "Security Engineer": 8}),
        ("An automated test suite for an existing app",
         {"Test Automation Engineer": 10, "QA Engineer": 10}),
    ]),
    ("How comfortable are you with maths and statistics?", [
        ("I enjoy it and want to use it every day",
         {"Data Scientist": 10, "Machine Learning Engineer": 10, "AI Engineer": 7}),
        ("Comfortable, when it solves a practical problem",
         {"Data Analyst": 9, "Data Engineer": 8, "Backend Developer": 6, "Product Manager": 5}),
        ("I prefer logic and systems to maths",
         {"Software Developer": 8, "DevOps Engineer": 8, "QA Engineer": 7, "Security Engineer": 7,
          "Penetration Tester": 7}),
        ("I prefer visual and creative work",
         {"UX Designer": 10, "Frontend Developer": 8}),
    ]),
    ("How do you feel about fixing problems in live systems, sometimes out of hours?", [
        ("I'd enjoy it: incidents are exciting",
         {"Site Reliability Engineer": 10, "DevOps Engineer": 9, "Cybersecurity Analyst": 9}),
        ("Fine occasionally, if it's well organised",
         {"Backend Developer": 8, "Cloud Engineer": 8, "Security Engineer": 7, "Data Engineer": 7}),
        ("I prefer predictable, planned work",
         {"QA Engineer": 8, "Data Analyst": 8, "UX Designer": 8, "Frontend Developer": 7, "Data Scientist": 7}),
    ]),
]


def create_career_quiz():
    """Create or update the career quiz in place. Never deletes questions or options."""
    print("\nCreating career quiz...")
    careers = {c.title: str(c.id) for c in CareerPath.objects.all()}

    quiz, created = CareerQuiz.objects.get_or_create(
        title=QUIZ_TITLE,
        defaults={'description': QUIZ_DESCRIPTION}
    )
    print(f"{'Created' if created else 'Updating'} quiz: {quiz.title}")

    missing = set()
    new_questions = new_options = 0
    for q_order, (question_text, options) in enumerate(QUIZ_QUESTIONS, start=1):
        question = quiz.questions.filter(question_text=question_text).order_by('order').first()
        if question is None:
            question = QuizQuestion.objects.create(
                quiz=quiz, question_text=question_text, question_type='multiple_choice', order=q_order
            )
            new_questions += 1
        elif question.order != q_order:
            question.order = q_order
            question.save(update_fields=['order'])

        for o_order, (option_text, weights_by_title) in enumerate(options, start=1):
            missing.update(t for t in weights_by_title if t not in careers)
            weights = {careers[t]: w for t, w in weights_by_title.items() if t in careers}

            option = question.options.filter(option_text=option_text).order_by('order').first()
            if option is None:
                QuizOption.objects.create(
                    question=question, option_text=option_text, order=o_order, career_weights=weights
                )
                new_options += 1
            elif option.order != o_order or option.career_weights != weights:
                option.order = o_order
                option.career_weights = weights
                option.save(update_fields=['order', 'career_weights'])

    print(f"Quiz has {quiz.questions.count()} questions ({new_questions} new questions, {new_options} new options)")
    if missing:
        print("Warning: career paths referenced by the quiz but missing from the database: " + ", ".join(sorted(missing)))


# -----------------------------
# CV + ATS SCORE
# -----------------------------
# Content written by older versions of this script
OLD_SEED_CV_CONTENT = {
    "summary": "Software developer profile",
    "skills": ["Python", "Django", "React"],
}


def demo_cv_content(user):
    return {
        "personal_info": {
            "name": f"{user.first_name} {user.last_name}".strip(),
            "email": user.email,
            "phone": "",
            "location": "London, UK",
            "linkedin": "",
            "github": "",
        },
        "summary": "Computer Science graduate looking for a junior software developer role. "
                   "Built and deployed full stack projects with Python, Django and React, "
                   "and enjoys writing clean, tested code in a team.",
        "work_experience": [
            {
                "title": "Software Engineering Intern",
                "company": "Example Tech Ltd",
                "dates": "Jun 2025 - Sep 2025",
                "description": "Built REST API endpoints in Django REST Framework, added unit tests with pytest "
                               "and fixed frontend bugs in a React and TypeScript app.",
            },
        ],
        "education": [
            {
                "degree": "BSc Computer Science",
                "institution": "Example University",
                "dates": "2022 - 2025",
                "grade": "2:1",
            },
        ],
        "skills": ["Python", "Django", "React", "JavaScript", "SQL", "Git", "Docker", "REST APIs"],
        "certifications": [],
    }


def create_cvs(users):
    print("\nCreating CVs...")

    for user in users:
        cvs = CV.objects.filter(user=user)
        if not cvs.exists():
            CV.objects.create(
                user=user,
                title=f"{user.first_name} CV",
                content=demo_cv_content(user),
                ats_score=Decimal(random.randint(60, 95)),
            )
            continue
        # Upgrade the bare CV from older seeds only if nobody has edited it since
        for cv in cvs:
            if cv.content == OLD_SEED_CV_CONTENT:
                cv.content = demo_cv_content(user)
                cv.save(update_fields=["content"])


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
        # Only for demo users with none yet, so re-runs don't keep adding paths
        if Recommendation.objects.filter(user=user).exists():
            continue
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
@transaction.atomic
def main():
    print("\n===== POPULATING DATABASE =====")

    users = create_users()
    demo_skills = create_skills()
    assign_skills(users, demo_skills)

    paths = create_paths()
    link_path_skills()
    modules = create_modules()
    create_prerequisites()
    link_path_modules()

    create_progress(users, paths, modules)
    create_cvs(users)
    create_job_scans(users)
    create_recommendations(users, paths)
    create_career_quiz()

    print("\n===== DONE =====")
    print(f"Users: {User.objects.count()}")
    print(f"Career paths: {CareerPath.objects.count()}")
    print(f"Modules: {LearningModule.objects.count()}")
    print(f"Skills: {Skill.objects.count()}")
    print(f"Quiz questions: {QuizQuestion.objects.count()}")
    print(f"Progress: {UserProgress.objects.count()}")
    print(f"Enrollments: {UserEnrollment.objects.count()}")


if __name__ == "__main__":
    main()
