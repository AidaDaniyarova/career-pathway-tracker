import requests
import json
import re
import time
from typing import List, Dict, Any
from django.conf import settings
import logging

from .skill_matching import extract_skills, split_soft_skills

logger = logging.getLogger(__name__)


def _years_in_job(job_text: str):
    patterns = [
        r'(\d+)\s*\+?\s*years? of (?:\w+ )?experience',
        r'experience[:;]?\s*(\d+)\s*\+?\s*years?',
        r'(\d+)\s*\+?\s*years?\s+(?:\w+ )?experience',
        r'minimum of (\d+) years',
        r'at least (\d+) years',
    ]
    for pattern in patterns:
        match = re.search(pattern, job_text.lower())
        if match:
            return int(match.group(1))
    return None


def _years_in_cv(cv_text: str):
    text = cv_text.lower()
    for pattern in (r'(\d+)\s*\+?\s*years? of (?:\w+ )?experience', r'experience[:;]?\s*(\d+)\s*\+?\s*years?',
                    r'(\d+)\s*\+?\s*years?\s+(?:\w+ )?experience', r'worked for (\d+) years'):
        match = re.search(pattern, text)
        if match:
            return int(match.group(1))
    # Date ranges in work history: "2021 - 2024", "Jun 2023 - present", "2022 to now"
    import datetime
    current_year = datetime.datetime.now().year
    ranges = re.findall(
        r'(?:[a-z]{3,9}\.?\s+)?(\d{4})\s*(?:-|–|—|to)\s*(?:[a-z]{3,9}\.?\s+)?(\d{4}|present|now|current)', text)
    if ranges:
        return sum(max(0, (current_year if end in ('present', 'now', 'current') else int(end)) - int(start))
                   for start, end in ranges)
    return None


def _calculate_experience_match(cv_text: str, job_text: str):
    """Experience score 0-100, or None when the job doesn't ask for a number of years."""
    job_years = _years_in_job(job_text)
    if job_years is None:
        return None
    cv_years = _years_in_cv(cv_text)
    if cv_years is None:
        return 50  # The job asks for experience and the CV doesn't say: count it as half
    if cv_years >= job_years:
        return 100
    return max(0, 100 - (job_years - cv_years) * 25)


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
        """Skills mentioned in a job description (whole-word matching, see ai/skill_matching.py)"""
        return extract_skills(job_description)

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
        return extract_skills(text)

    # Share of the score for each part. Parts the job doesn't mention are left out
    # and the remaining weights are scaled up, so a perfect CV can reach 100.
    MATCH_WEIGHTS = {'skill_match': 0.6, 'keyword_match': 0.2, 'soft_skill_match': 0.1, 'experience_match': 0.1}

    def calculate_match_score(self, cv_text: str, job_text: str) -> Dict:
        """How well a CV matches a job description, 0-100."""
        job_skills = set(extract_skills(job_text))
        cv_skills = set(extract_skills(cv_text))
        job_hard, job_soft = split_soft_skills(job_skills)

        parts = {}
        if job_hard:
            parts['skill_match'] = len(job_hard & cv_skills) / len(job_hard) * 100
        keyword_score = self._calculate_keyword_density(cv_text, job_text)
        if keyword_score is not None:
            parts['keyword_match'] = keyword_score
        if job_soft:
            parts['soft_skill_match'] = len(job_soft & cv_skills) / len(job_soft) * 100
        experience_score = _calculate_experience_match(cv_text, job_text)
        if experience_score is not None:
            parts['experience_match'] = experience_score

        total_weight = sum(self.MATCH_WEIGHTS[name] for name in parts)
        final_score = (sum(score * self.MATCH_WEIGHTS[name] for name, score in parts.items()) / total_weight
                       if total_weight else 0)

        return {
            'score': round(min(100, final_score), 2),
            'method': 'skill_matching',
            'details': {
                **{name: round(score, 2) for name, score in parts.items()},
                'not_applicable': [name for name in self.MATCH_WEIGHTS if name not in parts],
                'matched_skills': sorted(job_skills & cv_skills),
                'total_job_skills': len(job_skills),
                'total_cv_skills': len(cv_skills),
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
        """Skills mentioned in any text (CV or job description)"""
        return extract_skills(text)

    # Words that appear in almost every job advert and say nothing about the role
    KEYWORD_STOPWORDS = {
        'this', 'that', 'these', 'those', 'with', 'from', 'have', 'will', 'your', 'their', 'they', 'what',
        'about', 'which', 'would', 'could', 'should', 'being', 'been', 'were', 'where', 'there', 'after',
        'before', 'into', 'also', 'more', 'than', 'then', 'them', 'over', 'such', 'other', 'well', 'when',
        'while', 'within', 'across', 'including', 'using', 'must', 'essential', 'required', 'preferred',
        'plus', 'ideal', 'ideally', 'candidate', 'role', 'join', 'team', 'teams', 'work', 'working', 'skills',
        'ability', 'able', 'strong', 'good', 'great', 'excellent', 'experience', 'experienced', 'years', 'year',
        'looking', 'opportunity', 'company', 'help', 'make', 'part', 'like', 'very', 'most', 'some', 'each',
    }

    def _calculate_keyword_density(self, cv_text: str, job_text: str):
        """Share (0-100) of the job's 30 most frequent meaningful words that the CV also uses, or None."""
        from collections import Counter

        job_words = [w for w in re.findall(r'\b[a-z][a-z+#]{3,}\b', job_text.lower())
                     if w not in self.KEYWORD_STOPWORDS]
        top_job_keywords = [kw for kw, _ in Counter(job_words).most_common(30)]
        if not top_job_keywords:
            return None

        cv_words = set(re.findall(r'\b[a-z][a-z+#]{3,}\b', cv_text.lower()))

        def in_cv(word):
            # Count simple plural/singular forms as the same word
            return word in cv_words or word.rstrip('s') in cv_words or word + 's' in cv_words

        matched = [kw for kw in top_job_keywords if in_cv(kw)]
        return len(matched) / len(top_job_keywords) * 100

# Singleton instance
huggingface_service = HuggingFaceService()