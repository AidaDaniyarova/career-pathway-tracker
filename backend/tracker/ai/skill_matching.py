"""
Find skills mentioned in free text (CVs, job descriptions).

One list is used for both sides, so a skill found in a job description can be
found in a CV the same way. Aliases are matched as whole words: "java" does not
match "javascript", "sql" does not match "postgresql".

Names line up with the Skill rows seeded by populate_db.py where they overlap,
so career-path required skills can be looked up here too.
"""
import re
from typing import Iterable, List, Set

# Canonical skill name -> lowercase aliases matched as whole words
SKILL_ALIASES = {
    # Languages
    "Python": ["python"],
    "Java": ["java"],
    "JavaScript": ["javascript", "js", "ecmascript"],
    "TypeScript": ["typescript"],
    "C#": ["c#", "csharp"],
    "C++": ["c++", "cpp"],
    "Go": ["golang"],
    "R": [],
    "Rust": ["rust"],
    "Ruby": ["ruby"],
    "PHP": ["php"],
    "Swift": ["swiftui"],
    "Kotlin": ["kotlin"],
    "Scala": ["scala"],
    "MATLAB": ["matlab"],
    "Bash": ["bash", "shell scripting"],
    # Web
    "HTML": ["html", "html5"],
    "CSS": ["css", "css3"],
    "Sass": ["sass", "scss"],
    "Tailwind CSS": ["tailwind", "tailwindcss"],
    "Bootstrap": ["bootstrap"],
    "React": ["react", "react.js", "reactjs"],
    "Angular": ["angular", "angularjs"],
    "Vue": ["vue", "vue.js", "vuejs"],
    "Next.js": ["next.js", "nextjs"],
    "Node.js": ["node.js", "nodejs", "node"],
    "Express": ["express.js", "expressjs"],
    "Django": ["django"],
    "Flask": ["flask"],
    "FastAPI": ["fastapi"],
    "Spring Boot": ["spring boot", "spring framework"],
    "Laravel": ["laravel"],
    "Ruby on Rails": ["ruby on rails", "rails"],
    ".NET": [".net", "asp.net", "dotnet"],
    "REST APIs": ["rest api", "rest apis", "restful", "rest framework"],
    "GraphQL": ["graphql"],
    "Accessibility": ["accessibility", "wcag", "a11y"],
    # Data stores
    "SQL": ["sql"],
    "PostgreSQL": ["postgresql", "postgres"],
    "MySQL": ["mysql"],
    "SQLite": ["sqlite"],
    "MongoDB": ["mongodb", "mongo"],
    "Redis": ["redis"],
    "Elasticsearch": ["elasticsearch"],
    "DynamoDB": ["dynamodb"],
    "Firebase": ["firebase"],
    # Cloud and DevOps
    "AWS": ["aws", "amazon web services"],
    "Azure": ["azure"],
    "Google Cloud": ["gcp", "google cloud"],
    "Docker": ["docker"],
    "Kubernetes": ["kubernetes", "k8s"],
    "Terraform": ["terraform"],
    "Ansible": ["ansible"],
    "Jenkins": ["jenkins"],
    "GitHub Actions": ["github actions"],
    "GitLab CI": ["gitlab ci", "gitlab-ci"],
    "CI/CD": ["ci/cd", "ci cd", "continuous integration", "continuous delivery", "continuous deployment"],
    "Git": ["git"],
    "Linux": ["linux", "unix"],
    "Monitoring & Observability": ["observability", "prometheus", "grafana", "datadog", "application monitoring"],
    "Networking": ["networking", "tcp/ip"],
    "System Design": ["system design", "distributed systems"],
    # Data and ML
    "Pandas": ["pandas"],
    "NumPy": ["numpy"],
    "scikit-learn": ["scikit-learn", "sklearn"],
    "TensorFlow": ["tensorflow"],
    "PyTorch": ["pytorch"],
    "Apache Spark": ["apache spark", "spark", "pyspark"],
    "Apache Airflow": ["airflow"],
    "Hadoop": ["hadoop"],
    "ETL": ["etl", "elt", "data pipeline", "data pipelines"],
    "Tableau": ["tableau"],
    "Power BI": ["power bi", "powerbi"],
    "Excel": ["microsoft excel", "ms excel"],
    "Machine Learning": ["machine learning"],
    "Deep Learning": ["deep learning"],
    "NLP": ["nlp", "natural language processing"],
    "Computer Vision": ["computer vision"],
    "LLMs": ["llm", "llms", "large language model", "large language models", "generative ai"],
    "MLOps": ["mlops"],
    "Data Analysis": ["data analysis", "data analytics"],
    "Data Visualisation": ["data visualisation", "data visualization"],
    "Statistics": ["statistics", "statistical"],
    "Data Science": ["data science"],
    "Big Data": ["big data"],
    # Security
    "Cyber Security Fundamentals": ["cyber security", "cybersecurity", "information security", "infosec"],
    "OWASP Top 10": ["owasp"],
    "Penetration Testing": ["penetration testing", "pen testing", "pentesting", "ethical hacking"],
    "SIEM": ["siem", "splunk"],
    "Incident Response": ["incident response"],
    "Cryptography": ["cryptography", "encryption"],
    "Authentication & Security": ["authentication", "oauth", "jwt"],
    # Testing
    "pytest": ["pytest"],
    "JUnit": ["junit"],
    "Selenium": ["selenium"],
    "Cypress": ["cypress"],
    "Jest": ["jest"],
    "Playwright": ["playwright"],
    "Test Automation": ["test automation", "automated testing", "automated tests"],
    "Manual Testing": ["manual testing"],
    "API Testing": ["api testing", "postman"],
    # Design and product
    "Figma": ["figma"],
    "User Research": ["user research", "usability testing"],
    # Soft skills and ways of working
    "Communication": ["communication", "communicator"],
    "Teamwork": ["teamwork", "team player", "collaboration", "collaborative"],
    "Leadership": ["leadership"],
    "Problem Solving": ["problem solving", "problem-solving", "problem solver"],
    "Critical Thinking": ["critical thinking"],
    "Time Management": ["time management"],
    "Adaptability": ["adaptability", "adaptable"],
    "Mentoring": ["mentoring", "mentored"],
    "Project Management": ["project management"],
    "Agile": ["agile"],
    "Scrum": ["scrum"],
    "Kanban": ["kanban"],
}

SOFT_SKILLS: Set[str] = {
    "Communication", "Teamwork", "Leadership", "Problem Solving", "Critical Thinking",
    "Time Management", "Adaptability", "Mentoring", "Project Management", "Agile", "Scrum", "Kanban",
}

# Short or everyday words that are skills only when they appear in a list or
# after "with"/"in"/"and" ("Python, Go and SQL", "experience with R"), not in
# ordinary sentences ("good to go", "excel in a team", "R&D").
CONTEXT_ONLY = {"Go": "go", "R": "r", "Swift": "swift", "Excel": "excel"}

_BOUNDARY_BEFORE = r"(?<![a-z0-9+#.])"
_BOUNDARY_AFTER = r"(?![a-z0-9+#])"
_CONTEXT_BEFORE = re.compile(r"(?:^|[,;/:(|•·]|\b(?:with|in|and|or|using|including|like))\s*$")
_CONTEXT_AFTER = re.compile(r"^\s*(?:$|[,;/)|•·]|\.(?:\s|$)|(?:and|or|programming|developer|language|lang)\b)")


def _alias_pattern(alias: str) -> re.Pattern:
    before = "" if alias[0] in ".+#" else _BOUNDARY_BEFORE
    return re.compile(before + re.escape(alias) + _BOUNDARY_AFTER)


_PATTERNS = {name: [_alias_pattern(a) for a in aliases] for name, aliases in SKILL_ALIASES.items()}
_CONTEXT_PATTERNS = {
    name: re.compile(_BOUNDARY_BEFORE + re.escape(word) + r"(?![a-z0-9+#&'’-])")
    for name, word in CONTEXT_ONLY.items()
}
_LOOKUP = {name.lower(): name for name in SKILL_ALIASES}


def _mentions_in_context(text: str, name: str) -> bool:
    pattern = _CONTEXT_PATTERNS.get(name)
    if pattern is None:
        return False
    for match in pattern.finditer(text):
        before = text[max(0, match.start() - 20):match.start()]
        after = text[match.end():match.end() + 20]
        if _CONTEXT_BEFORE.search(before) and _CONTEXT_AFTER.match(after):
            return True
    return False


def mentions_skill(text: str, skill_name: str) -> bool:
    """True if the text mentions the skill. Unknown skill names are matched as a whole phrase."""
    text = (text or "").lower()
    name = _LOOKUP.get(skill_name.strip().lower())
    if name is None:
        return bool(_alias_pattern(skill_name.strip().lower()).search(text)) if skill_name.strip() else False
    if any(p.search(text) for p in _PATTERNS[name]):
        return True
    return _mentions_in_context(text, name)


def extract_skills(text: str) -> List[str]:
    """All known skills mentioned in the text, sorted by name."""
    text = (text or "").lower()
    return sorted(name for name in SKILL_ALIASES if mentions_skill(text, name))


def split_soft_skills(skills: Iterable[str]):
    """(hard skills, soft skills) as sets."""
    skills = set(skills)
    return skills - SOFT_SKILLS, skills & SOFT_SKILLS
