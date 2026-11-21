import requests
import json
import re
import time
from typing import List, Dict, Any
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def _calculate_experience_match(cv_text: str, job_text: str) -> float:
    """Calculate experience level match based on years mentioned"""
    import re

    # Look for years of experience in job description
    job_exp_patterns = [
        r'(\d+)[\+\s]*years? of experience',
        r'experience[:;]?\s*(\d+)[\+\s]*years?',
        r'(\d+)[\+\s]*years?[\s]+experience',
        r'minimum of (\d+) years',
        r'at least (\d+) years'
    ]

    job_years = None
    for pattern in job_exp_patterns:
        match = re.search(pattern, job_text.lower())
        if match:
            job_years = int(match.group(1))
            break

    # If no specific years mentioned, assume 2-5 years (medium difficulty)
    if not job_years:
        return 70  # Neutral score

    # Look for years in CV
    cv_exp_patterns = [
        r'(\d+)[\+\s]*years? of experience',
        r'experience[:;]?\s*(\d+)[\+\s]*years?',
        r'(\d+)[\+\s]*years?[\s]+experience',
        r'worked for (\d+) years',
        r'total experience:?\s*(\d+) years'
    ]

    cv_years = None
    for pattern in cv_exp_patterns:
        match = re.search(pattern, cv_text.lower())
        if match:
            cv_years = int(match.group(1))
            break

    # Also look for job history duration
    if not cv_years:
        # Try to calculate from work experience entries
        work_years = re.findall(r'(\d{4})\s*-\s*(\d{4}|present)', cv_text.lower())
        if work_years:
            total_years = 0
            import datetime
            current_year = datetime.datetime.now().year
            for start, end in work_years:
                start_year = int(start)
                end_year = current_year if end == 'present' else int(end)
                total_years += (end_year - start_year)
            cv_years = total_years

    if not cv_years:
        return 50  # No experience info found

    # Calculate match score (higher is better)
    # Perfect match if cv_years >= job_years
    if cv_years >= job_years:
        return min(100, 100 + (cv_years - job_years) * 5)  # Bonus for extra experience
    else:
        # Penalty for missing experience
        return max(0, 100 - ((job_years - cv_years) * 15))


# Hugging Face Inference Providers, "hf-inference" provider: models hosted by
# Hugging Face itself. Replaces the retired api-inference.huggingface.co host.
HF_INFERENCE_URL = "https://router.huggingface.co/hf-inference/models/"


class HuggingFaceService:
    """Service for interacting with Hugging Face Inference Providers.

    Every AI feature has a local fallback; the API is used only when HF_TOKEN is
    set and Hugging Face accepts it. Failures pause API calls for a while instead
    of slowing every request down.
    """

    UNREACHABLE_PAUSE_SECONDS = 300   # network errors, timeouts, 5xx
    REJECTED_PAUSE_SECONDS = 3600     # bad token, no credits

    def __init__(self):
        self.api_url = HF_INFERENCE_URL
        self._paused_until = 0.0
        self._warned_missing_token = False

    @property
    def api_key(self):
        # Read on each call so tests and settings overrides take effect
        return getattr(settings, 'HF_TOKEN', None)

    def _pause(self, seconds: int):
        self._paused_until = time.monotonic() + seconds

    def _make_request(self, model: str, payload: Dict, timeout: int = 20):
        """POST to the Hugging Face API. Returns parsed JSON, or None to use the fallback."""
        if not self.api_key:
            if not self._warned_missing_token:
                logger.info("HF_TOKEN is not set; AI features use their built-in fallback.")
                self._warned_missing_token = True
            return None

        if time.monotonic() < self._paused_until:
            return None

        try:
            response = requests.post(
                f"{self.api_url}{model}",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json=payload,
                timeout=timeout,
            )
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            logger.warning("Hugging Face API is not reachable (%s); using fallback for %d minutes.",
                           type(e).__name__, self.UNREACHABLE_PAUSE_SECONDS // 60)
            self._pause(self.UNREACHABLE_PAUSE_SECONDS)
            return None
        except requests.exceptions.RequestException as e:
            logger.error("Hugging Face request failed (%s); using fallback.", type(e).__name__)
            return None

        status_code = response.status_code
        if status_code == 200:
            try:
                return response.json()
            except ValueError:
                logger.error("Hugging Face returned a non-JSON response for %s; using fallback.", model)
                return None
        if status_code in (401, 403):
            logger.error("Hugging Face rejected HF_TOKEN (HTTP %s). Create a fine-grained token with the "
                         "'Make calls to Inference Providers' permission and set it as HF_TOKEN. "
                         "Using fallback.", status_code)
            self._pause(self.REJECTED_PAUSE_SECONDS)
        elif status_code == 402:
            logger.error("Hugging Face Inference Providers credits are used up (HTTP 402); using fallback.")
            self._pause(self.REJECTED_PAUSE_SECONDS)
        elif status_code == 429 or status_code >= 500:
            logger.warning("Hugging Face API is unavailable (HTTP %s); using fallback for %d minutes.",
                           status_code, self.UNREACHABLE_PAUSE_SECONDS // 60)
            self._pause(self.UNREACHABLE_PAUSE_SECONDS)
        else:
            logger.error("Hugging Face API error for %s: HTTP %s - %s", model, status_code, response.text[:200])
        return None

    def extract_skills_from_job(self, job_description: str) -> List[str]:
        """Extract skills from job description using keyword matching (always use fallback)"""
        # Use keyword-based extraction directly (more reliable)
        return self._extract_skills_keyword_based(job_description)

    def _parse_ner_skills(self, ner_result) -> List[str]:
        """Parse NER results to extract skills"""
        skills = []
        if not ner_result:
            return skills

        skill_keywords = [
            'python', 'java', 'javascript', 'react', 'angular', 'vue', 'django',
            'flask', 'spring', 'node', 'express', 'sql', 'mongodb', 'postgresql',
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'jenkins',
            'machine learning', 'data science', 'ai', 'tensorflow', 'pytorch',
            'pandas', 'numpy', 'tableau', 'power bi', 'excel', 'project management',
            'agile', 'scrum', 'leadership', 'communication', 'teamwork'
        ]

        if isinstance(ner_result, list):
            for item in ner_result:
                if isinstance(item, dict) and 'entity' in item:
                    entity = item.get('entity', '').lower()
                    word = item.get('word', '').lower()
                    if 'skill' in entity or 'tech' in entity:
                        skills.append(word)

        text = str(ner_result).lower()
        for skill in skill_keywords:
            if skill in text and skill not in skills:
                skills.append(skill)

        return skills[:20]

    def _extract_skills_keyword_based(self, text: str) -> List[str]:
        """Extract skills using keyword matching (reliable fallback)"""
        skills = []
        text_lower = text.lower()

        skill_database = [
            # Programming Languages
            'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'go', 'rust',
            'ruby', 'php', 'swift', 'kotlin', 'scala', 'perl', 'r',

            # Frameworks & Libraries
            'react', 'angular', 'vue', 'django', 'flask', 'fastapi', 'spring', 'spring boot',
            'node.js', 'express', 'laravel', 'rails', 'asp.net', 'graphql', 'rest api',
            'jquery', 'bootstrap', 'tailwind', 'sass', 'webpack',

            # Databases
            'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb',
            'cassandra', 'oracle', 'sqlite', 'firebase',

            # Cloud & DevOps
            'aws', 'amazon web services', 'azure', 'microsoft azure', 'gcp', 'google cloud',
            'docker', 'kubernetes', 'terraform', 'jenkins', 'gitlab ci', 'github actions',
            'ansible', 'prometheus', 'grafana', 'ci/cd', 'devops',

            # Data Science & AI
            'pandas', 'numpy', 'tensorflow', 'pytorch', 'scikit-learn', 'spark', 'hadoop',
            'tableau', 'power bi', 'machine learning', 'deep learning', 'data science',
            'natural language processing', 'computer vision', 'data visualization',
            'data analysis', 'statistics', 'big data',

            # Testing
            'junit', 'pytest', 'selenium', 'cypress', 'jest', 'mocha', 'chai',

            # Soft Skills (still useful for job description matching)
            'leadership', 'communication', 'teamwork', 'problem solving', 'critical thinking',
            'time management', 'adaptability', 'creativity', 'project management', 'agile',
            'scrum', 'kanban', 'collaboration', 'mentoring'
        ]

        for skill in skill_database:
            if skill in text_lower:
                skills.append(skill.title() if len(skill) > 2 else skill)

        return list(set(skills))[:25]

    def calculate_match_score(self, cv_text: str, job_text: str) -> Dict:
        """Calculate match score using comprehensive skill matching"""

        # Extract skills from both CV and job description
        job_skills = self._extract_skills_keyword_based(job_text)
        cv_skills = self._extract_skills_from_text(cv_text)

        # Also extract soft skills
        soft_skills = ['leadership', 'communication', 'teamwork', 'problem solving',
                       'critical thinking', 'time management', 'adaptability', 'creativity',
                       'project management', 'agile', 'scrum', 'collaboration', 'mentoring']

        job_skills_lower = set(s.lower() for s in job_skills)
        cv_skills_lower = set(s.lower() for s in cv_skills)
        soft_skills_lower = set(s.lower() for s in soft_skills)

        # Calculate skill match score
        if job_skills_lower:
            matched_skills = cv_skills_lower & job_skills_lower
            skill_match_score = (len(matched_skills) / len(job_skills_lower)) * 100
        else:
            skill_match_score = 0

        # Calculate soft skills match
        job_soft_skills = job_skills_lower & soft_skills_lower
        if job_soft_skills:
            matched_soft = cv_skills_lower & job_soft_skills
            soft_skill_score = (len(matched_soft) / len(job_soft_skills)) * 100
        else:
            soft_skill_score = 0

        # Calculate keyword density score
        keyword_score = self._calculate_keyword_density(cv_text, job_text)

        # Calculate experience level match (if applicable)
        experience_score = _calculate_experience_match(cv_text, job_text)

        # Weighted final score (60% skills, 20% keywords, 10% soft skills, 10% experience)
        final_score = (
                (skill_match_score * 0.6) +
                (keyword_score * 0.2) +
                (soft_skill_score * 0.1) +
                (experience_score * 0.1)
        )

        return {
            'score': round(min(100, final_score), 2),
            'method': 'skill_matching',
            'details': {
                'skill_match': round(skill_match_score, 2),
                'keyword_match': round(keyword_score, 2),
                'soft_skill_match': round(soft_skill_score, 2),
                'experience_match': round(experience_score, 2),
                'matched_skills': list(matched_skills)[:10] if job_skills_lower else [],
                'total_job_skills': len(job_skills_lower),
                'total_cv_skills': len(cv_skills_lower)
            }
        }

    def _calculate_similarity_fallback(self, cv_text: str, job_text: str) -> float:
        """Calculate similarity using keyword matching (reliable fallback)"""
        from collections import Counter
        import re

        # Extract words
        cv_words = set(re.findall(r'\b[a-z]{3,}\b', cv_text.lower()))
        job_words = set(re.findall(r'\b[a-z]{3,}\b', job_text.lower()))

        # Remove common stopwords
        stopwords = {'the', 'and', 'for', 'with', 'that', 'this', 'are', 'was', 'were',
                     'have', 'has', 'from', 'they', 'will', 'what', 'your', 'you', 'can',
                     'all', 'been', 'had', 'our', 'may', 'its', 'also', 'than', 'then',
                     'only', 'other', 'such', 'out', 'up', 'down', 'into', 'over', 'under',
                     'using', 'used', 'use', 'would', 'could', 'should'}

        cv_words = cv_words - stopwords
        job_words = job_words - stopwords

        if not job_words:
            return 0

        matches = len(cv_words & job_words)
        score = (matches / len(job_words)) * 100

        return min(100, score)

    def generate_interview_questions(self, job_title: str, job_description: str, cv_content: Dict = None) -> List[Dict]:
        """Generate interview questions based on job description (fully functional without API)"""
        questions = []

        # Extract skills from job description
        skills = self.extract_skills_from_job(job_description)

        # Technical questions based on extracted skills
        for skill in skills[:5]:
            questions.append({
                'question': f"Describe your experience with {skill}. What projects have you worked on using {skill}?",
                'category': 'technical',
                'difficulty': 'medium',
                'suggested_answer': f"Share specific projects where you used {skill}. Mention challenges you faced and how you overcame them.",
                'answer_tips': "Focus on practical experience rather than theoretical knowledge. Use numbers to quantify your impact.",
                'related_skills': [skill]
            })

        # Backend/Java questions (if relevant)
        if 'java' in job_title.lower() or 'java' in job_description.lower() or 'backend' in job_title.lower():
            java_questions = [
                {
                    'question': "Explain the difference between REST and SOAP APIs. When would you use each?",
                    'category': 'technical',
                    'difficulty': 'medium',
                    'suggested_answer': "REST is simpler, uses HTTP methods, and is stateless. SOAP is more rigid, uses XML, and has built-in error handling. Use REST for web services, SOAP for enterprise-level security requirements.",
                    'answer_tips': "Mention that REST is more common for modern web APIs.",
                    'related_skills': ['API Design', 'REST', 'SOAP']
                },
                {
                    'question': "What is the difference between SQL and NoSQL databases? Give examples of when to use each.",
                    'category': 'technical',
                    'difficulty': 'medium',
                    'suggested_answer': "SQL databases are relational with structured schemas (PostgreSQL, MySQL). NoSQL databases are non-relational (MongoDB, Redis). Use SQL for complex queries and transactions, NoSQL for scalability and flexible data models.",
                    'answer_tips': "Discuss specific use cases like e-commerce (SQL) vs real-time analytics (NoSQL).",
                    'related_skills': ['SQL', 'NoSQL', 'Database Design']
                },
                {
                    'question': "How would you design a scalable REST API that can handle millions of requests?",
                    'category': 'technical',
                    'difficulty': 'hard',
                    'suggested_answer': "Use caching (Redis), load balancers, horizontal scaling, database indexing, CDN for static content, and implement rate limiting. Consider using message queues for async processing.",
                    'answer_tips': "Mention specific technologies like Nginx, Redis, and Kafka.",
                    'related_skills': ['API Design', 'Scalability', 'System Design']
                }
            ]
            questions.extend(java_questions[:3])

        # Frontend questions (if relevant)
        if 'frontend' in job_title.lower() or 'react' in job_description.lower() or 'angular' in job_description.lower():
            frontend_questions = [
                {
                    'question': "What's the difference between a class component and a functional component in React?",
                    'category': 'technical',
                    'difficulty': 'medium',
                    'suggested_answer': "Functional components are simpler, use hooks for state/effects, and are preferred for most cases. Class components use lifecycle methods and are still used in older codebases.",
                    'answer_tips': "Mention that functional components with hooks are now the standard.",
                    'related_skills': ['React', 'JavaScript']
                }
            ]
            questions.extend(frontend_questions)

        # Cloud/DevOps questions (if relevant)
        if 'cloud' in job_description.lower() or 'aws' in job_description.lower() or 'devops' in job_title.lower():
            cloud_questions = [
                {
                    'question': "What experience do you have with cloud platforms? Describe CI/CD pipeline you've implemented.",
                    'category': 'technical',
                    'difficulty': 'medium',
                    'suggested_answer': "Describe your experience with specific cloud services. Explain your CI/CD pipeline including version control, testing, building, and deployment stages.",
                    'answer_tips': "Be specific about tools used (GitHub Actions, Jenkins, GitLab CI).",
                    'related_skills': ['Cloud Computing', 'CI/CD', 'DevOps']
                },
                {
                    'question': "How would you troubleshoot a production issue where the application becomes slow?",
                    'category': 'technical',
                    'difficulty': 'hard',
                    'suggested_answer': "1. Check metrics and logs. 2. Identify if it's database, network, or code issue. 3. Use profiling tools. 4. Implement temporary fix if needed. 5. Root cause analysis.",
                    'answer_tips': "Show systematic approach to troubleshooting.",
                    'related_skills': ['Troubleshooting', 'Monitoring', 'Performance Optimization']
                }
            ]
            questions.extend(cloud_questions[:2])

        # Behavioral questions
        behavioral_questions = [
            {
                'question': "Tell me about a time you faced a challenging technical problem and how you solved it.",
                'category': 'behavioral',
                'difficulty': 'medium',
                'suggested_answer': "Use the STAR method: describe the Situation, Task, Action you took, and the Result achieved. Focus on your specific contribution and the outcome.",
                'answer_tips': "Quantify the result if possible (e.g., 'Improved performance by 50%').",
                'related_skills': ['Problem Solving', 'Critical Thinking']
            },
            {
                'question': "Describe a situation where you had to work under pressure to meet a tight deadline.",
                'category': 'behavioral',
                'difficulty': 'medium',
                'suggested_answer': "Describe how you prioritized tasks, communicated with stakeholders, and delivered results. Explain what you learned from the experience.",
                'answer_tips': "Show that you can remain calm and effective under pressure.",
                'related_skills': ['Time Management', 'Stress Management']
            },
            {
                'question': "How do you stay updated with the latest technologies and industry trends?",
                'category': 'behavioral',
                'difficulty': 'easy',
                'suggested_answer': "Follow tech blogs, take online courses, attend conferences or meetups, contribute to open source, or build personal projects.",
                'answer_tips': "Give specific examples of recent technologies you've learned.",
                'related_skills': ['Continuous Learning', 'Adaptability']
            }
        ]
        questions.extend(behavioral_questions[:3])

        # Situational questions
        situational_questions = [
            {
                'question': "If you discovered a critical security vulnerability in production code, what would you do?",
                'category': 'situational',
                'difficulty': 'hard',
                'suggested_answer': "1. Immediately assess severity. 2. Notify relevant stakeholders. 3. Implement temporary mitigation if possible. 4. Plan and deploy permanent fix. 5. Conduct post-mortem to prevent recurrence.",
                'answer_tips': "Show that you prioritize security while maintaining transparency.",
                'related_skills': ['Security', 'Crisis Management']
            },
            {
                'question': "How would you handle a disagreement with your manager about technical implementation?",
                'category': 'situational',
                'difficulty': 'medium',
                'suggested_answer': "1. Understand their perspective. 2. Present data and alternatives. 3. Find common ground. 4. Respect final decision. 5. Document the reasoning.",
                'answer_tips': "Show professional communication and respect for hierarchy.",
                'related_skills': ['Communication', 'Conflict Resolution']
            }
        ]
        questions.extend(situational_questions[:2])

        return questions[:12]  # Return up to 12 questions

    def summarize_job_description(self, job_description: str) -> str:
        """Summarize a job description with Hugging Face, falling back to the first sentences."""
        summary = self._summarize_with_huggingface(job_description)
        if summary:
            return summary
        return self._summarize_fallback(job_description)

    def _summarize_with_huggingface(self, job_description: str):
        # Short texts don't need a model; long ones are cut to fit the model's input limit
        if len(job_description) < 200:
            return None
        model = settings.HUGGINGFACE_MODELS['summarizer']
        result = self._make_request(model, {"inputs": job_description[:3000]})
        if isinstance(result, list) and result:
            result = result[0]
        if isinstance(result, dict):
            summary = str(result.get('summary_text') or '').strip()
            if summary:
                return summary
        if result is not None:
            logger.error("Unexpected Hugging Face summarization response; using fallback.")
        return None

    def _summarize_fallback(self, job_description: str) -> str:
        # Fallback: return first few sentences
        sentences = job_description.split('. ')
        summary = '. '.join(sentences[:3])
        if len(summary) > 300:
            summary = summary[:297] + '...'
        elif len(summary) < 100 and len(job_description) > 100:
            summary = job_description[:297] + '...'

        return summary

    def get_career_advice(self, question: str, user_context: Dict) -> str:
        """Get career advice (always use fallback)"""
        # Comprehensive fallback responses
        responses = {
            'career': "Based on your profile, focus on developing in-demand skills. Consider cloud platforms (AWS/Azure), AI/ML, and full-stack development. Build a portfolio of projects and contribute to open source.",
            'skill': "Focus on learning: Python for data science/backend, JavaScript/TypeScript for frontend, SQL for databases, and cloud services. Practice on platforms like LeetCode and build real projects.",
            'cv': "Tailor your CV to each job: Use keywords from job description, quantify achievements with numbers, keep it to 1-2 pages, and highlight relevant skills and technologies.",
            'interview': "Practice common questions, research the company, prepare your own questions, use the STAR method for behavioral questions, and showcase your projects.",
            'learning': "Take online courses (Coursera, Udemy, edX), read documentation and blogs, build personal projects, join coding communities, and attend workshops/conferences.",
            'default': "Continue building your skills through projects and courses. Stay updated with industry trends. Network with professionals in your field. Consider certifications to validate your expertise."
        }

        question_lower = question.lower()
        if any(word in question_lower for word in ['career', 'path', 'future', 'direction']):
            return responses['career']
        elif any(word in question_lower for word in ['skill', 'learn', 'technology', 'tech']):
            return responses['skill']
        elif any(word in question_lower for word in ['cv', 'resume', 'application']):
            return responses['cv']
        elif any(word in question_lower for word in ['interview', 'job', 'position']):
            return responses['interview']
        elif any(word in question_lower for word in ['course', 'study', 'practice', 'improve']):
            return responses['learning']
        else:
            return responses['default']

    def _extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skills from any text (CV or job description)"""
        skills = []
        text_lower = text.lower()

        skill_database = [
            # Programming Languages
            'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'go', 'rust',
            'ruby', 'php', 'swift', 'kotlin', 'scala', 'perl', 'r',

            # Frameworks & Libraries
            'react', 'angular', 'vue', 'django', 'flask', 'fastapi', 'spring', 'spring boot',
            'node.js', 'express', 'laravel', 'rails', 'asp.net', 'graphql', 'rest',
            'jquery', 'bootstrap', 'tailwind', 'sass', 'webpack', 'vite',

            # Databases
            'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb',
            'cassandra', 'oracle', 'sqlite', 'firebase', 'neo4j',

            # Cloud & DevOps
            'aws', 'amazon web services', 'azure', 'microsoft azure', 'gcp', 'google cloud',
            'docker', 'kubernetes', 'terraform', 'jenkins', 'gitlab ci', 'github actions',
            'ansible', 'prometheus', 'grafana', 'ci/cd', 'devops', 'cloudformation',

            # Data Science & AI
            'pandas', 'numpy', 'tensorflow', 'pytorch', 'scikit-learn', 'spark', 'hadoop',
            'tableau', 'power bi', 'excel', 'machine learning', 'deep learning', 'data science',
            'natural language processing', 'computer vision', 'data visualization',
            'data analysis', 'statistics', 'big data', 'llm', 'openai',

            # Testing
            'junit', 'pytest', 'selenium', 'cypress', 'jest', 'mocha', 'chai',

            # Soft Skills
            'leadership', 'communication', 'teamwork', 'problem solving', 'critical thinking',
            'time management', 'adaptability', 'creativity', 'project management', 'agile',
            'scrum', 'kanban', 'collaboration', 'mentoring', 'decision making',
            'presentation', 'negotiation', 'conflict resolution'
        ]

        for skill in skill_database:
            if skill in text_lower:
                skills.append(skill)

        return list(set(skills))

    def _calculate_keyword_density(self, cv_text: str, job_text: str) -> float:
        """Calculate keyword density match between CV and job description"""
        import re
        from collections import Counter

        # Extract important keywords from job description (exclude common words)
        job_words = re.findall(r'\b[a-z]{4,}\b', job_text.lower())

        # Remove common stopwords
        stopwords = {'this', 'that', 'these', 'those', 'with', 'from', 'have', 'will',
                     'your', 'their', 'they', 'what', 'about', 'which', 'would', 'could',
                     'should', 'being', 'been', 'were', 'where', 'there', 'after', 'before'}

        job_words = [w for w in job_words if w not in stopwords]

        # Get most frequent keywords from job description (top 30)
        job_keyword_counts = Counter(job_words)
        top_job_keywords = [kw for kw, count in job_keyword_counts.most_common(30)]

        if not top_job_keywords:
            return 0

        # Check which keywords appear in CV
        cv_lower = cv_text.lower()
        matched_keywords = [kw for kw in top_job_keywords if kw in cv_lower]

        # Calculate match percentage
        match_percentage = (len(matched_keywords) / len(top_job_keywords)) * 100

        return match_percentage


# Singleton instance
huggingface_service = HuggingFaceService()