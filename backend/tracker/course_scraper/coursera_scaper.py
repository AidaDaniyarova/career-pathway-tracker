import requests
import json
import time
import re
import logging
from typing import List, Dict, Any
from fake_useragent import UserAgent

logger = logging.getLogger(__name__)


class CourseraScraperService:
    """Service for scraping courses from Coursera - with fallback to mock data"""

    def __init__(self, use_mock: bool = False):
        """Initialize scraper"""
        self.use_mock = use_mock
        self.ua = UserAgent()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': self.ua.random,
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.coursera.org/'
        })

    def scrape_courses_by_search(self, search_terms: List[str], max_per_term: int = 20) -> List[Dict]:
        """Scrape courses - returns mock data if API fails"""
        all_courses = []

        for term in search_terms:
            logger.info(f"Searching for: {term}")

            # Try API first (unless use_mock is True)
            if not self.use_mock:
                courses = self._search_courses_api(term, max_per_term)
                if courses:
                    all_courses.extend(courses)
                    continue

            # Fallback to mock data
            logger.info(f"Using mock data for: {term}")
            mock_courses = self._get_mock_courses_for_term(term, max_per_term)
            all_courses.extend(mock_courses)

            time.sleep(0.5)  # Small delay between requests

        # Remove duplicates based on title
        seen = set()
        unique_courses = []
        for course in all_courses:
            if course['title'] not in seen:
                seen.add(course['title'])
                unique_courses.append(course)

        return unique_courses

    def _search_courses_api(self, query: str, limit: int = 20) -> List[Dict]:
        """Use Coursera's internal search API"""
        courses = []

        # Use the search endpoint that returns HTML instead of API
        # This is more reliable
        search_url = "https://www.coursera.org/search"
        params = {
            'query': query,
            'page': 1,
            'limit': limit
        }

        try:
            # Try with HTML parsing instead of JSON API
            response = self.session.get(search_url, params=params, timeout=30)

            if response.status_code == 200:
                # For now, since API is blocked, return empty to trigger mock data
                logger.info(f"API returned HTML (blocked), using mock data for {query}")
                return []
            else:
                logger.warning(f"Search returned status {response.status_code}")
                return []

        except Exception as e:
            logger.error(f"Error searching courses: {e}")
            return []

    def _get_mock_courses_for_term(self, term: str, limit: int) -> List[Dict]:
        """Return mock course data for a specific search term"""

        # Comprehensive mock course database
        mock_database = {
            'python': [
                {
                    'title': 'Python for Everybody Specialization',
                    'description': 'Learn to program and analyze data with Python. Develop programs to gather, clean, analyze, and visualize data.',
                    'content_url': 'https://www.coursera.org/specializations/python',
                    'partner': 'University of Michigan',
                    'duration_minutes': 480,
                    'difficulty': 'beginner',
                    'content_type': 'external',
                    'skills': ['python', 'programming', 'data structures', 'data analysis'],
                    'xp_points': 50
                },
                {
                    'title': 'Python Data Structures',
                    'description': 'Learn to use data structures like lists, dictionaries, and tuples to perform more complex data analysis.',
                    'content_url': 'https://www.coursera.org/learn/python-data',
                    'partner': 'University of Michigan',
                    'duration_minutes': 240,
                    'difficulty': 'intermediate',
                    'content_type': 'external',
                    'skills': ['python', 'data structures', 'algorithms'],
                    'xp_points': 30
                },
                {
                    'title': 'Using Python to Access Web Data',
                    'description': 'Learn to use Python to access web data using APIs and web scraping techniques.',
                    'content_url': 'https://www.coursera.org/learn/python-network-data',
                    'partner': 'University of Michigan',
                    'duration_minutes': 240,
                    'difficulty': 'intermediate',
                    'content_type': 'external',
                    'skills': ['python', 'apis', 'web scraping', 'json'],
                    'xp_points': 35
                },
                {
                    'title': 'Python for Data Science and AI',
                    'description': 'Learn Python for data science and machine learning applications.',
                    'content_url': 'https://www.coursera.org/learn/python-for-applied-data-science-ai',
                    'partner': 'IBM',
                    'duration_minutes': 300,
                    'difficulty': 'intermediate',
                    'content_type': 'external',
                    'skills': ['python', 'data science', 'pandas', 'numpy'],
                    'xp_points': 40
                }
            ],
            'javascript': [
                {
                    'title': 'JavaScript for Beginners',
                    'description': 'Learn JavaScript fundamentals including variables, functions, and DOM manipulation.',
                    'content_url': 'https://www.coursera.org/learn/javascript-basics',
                    'partner': 'UC Davis',
                    'duration_minutes': 180,
                    'difficulty': 'beginner',
                    'content_type': 'external',
                    'skills': ['javascript', 'web development', 'dom'],
                    'xp_points': 25
                },
                {
                    'title': 'Interactivity with JavaScript',
                    'description': 'Learn to add interactive features to web pages using JavaScript.',
                    'content_url': 'https://www.coursera.org/learn/javascript-interactivity',
                    'partner': 'University of Michigan',
                    'duration_minutes': 200,
                    'difficulty': 'intermediate',
                    'content_type': 'external',
                    'skills': ['javascript', 'dom', 'events'],
                    'xp_points': 30
                }
            ],
            'react': [
                {
                    'title': 'React Basics',
                    'description': 'Learn to build dynamic web applications using React.js, the most popular front-end framework.',
                    'content_url': 'https://www.coursera.org/learn/react-basics',
                    'partner': 'Meta',
                    'duration_minutes': 240,
                    'difficulty': 'intermediate',
                    'content_type': 'external',
                    'skills': ['react', 'javascript', 'frontend', 'components'],
                    'xp_points': 35
                },
                {
                    'title': 'Advanced React',
                    'description': 'Master advanced React concepts including hooks, context, and performance optimization.',
                    'content_url': 'https://www.coursera.org/learn/advanced-react',
                    'partner': 'Meta',
                    'duration_minutes': 300,
                    'difficulty': 'advanced',
                    'content_type': 'external',
                    'skills': ['react', 'hooks', 'context', 'performance'],
                    'xp_points': 45
                }
            ],
            'java': [
                {
                    'title': 'Java Programming: Solving Problems with Software',
                    'description': 'Learn to code in Java and improve your programming and problem-solving skills.',
                    'content_url': 'https://www.coursera.org/learn/java-programming',
                    'partner': 'Duke University',
                    'duration_minutes': 360,
                    'difficulty': 'beginner',
                    'content_type': 'external',
                    'skills': ['java', 'programming', 'algorithms'],
                    'xp_points': 40
                },
                {
                    'title': 'Object Oriented Programming in Java',
                    'description': 'Explore advanced Java concepts including inheritance, polymorphism, and encapsulation.',
                    'content_url': 'https://www.coursera.org/learn/object-oriented-java',
                    'partner': 'UC San Diego',
                    'duration_minutes': 240,
                    'difficulty': 'intermediate',
                    'content_type': 'external',
                    'skills': ['java', 'oop', 'inheritance', 'polymorphism'],
                    'xp_points': 35
                },
                {
                    'title': 'Data Structures and Performance',
                    'description': 'Learn how to use data structures like lists, maps, and trees to create efficient Java applications.',
                    'content_url': 'https://www.coursera.org/learn/data-structures-optimizing-performance',
                    'partner': 'UC San Diego',
                    'duration_minutes': 300,
                    'difficulty': 'advanced',
                    'content_type': 'external',
                    'skills': ['java', 'data structures', 'algorithms', 'performance'],
                    'xp_points': 45
                }
            ],
            'django': [
                {
                    'title': 'Django for Everybody',
                    'description': 'Learn to build web applications using Django, the Python-based web framework.',
                    'content_url': 'https://www.coursera.org/specializations/django',
                    'partner': 'University of Michigan',
                    'duration_minutes': 480,
                    'difficulty': 'intermediate',
                    'content_type': 'external',
                    'skills': ['django', 'python', 'web development', 'orm'],
                    'xp_points': 50
                }
            ],
            'web development': [
                {
                    'title': 'HTML, CSS, and Javascript for Web Developers',
                    'description': 'Learn to build responsive websites using HTML, CSS, and JavaScript.',
                    'content_url': 'https://www.coursera.org/learn/html-css-javascript-for-web-developers',
                    'partner': 'Johns Hopkins University',
                    'duration_minutes': 240,
                    'difficulty': 'beginner',
                    'content_type': 'external',
                    'skills': ['html', 'css', 'javascript', 'responsive design'],
                    'xp_points': 30
                },
                {
                    'title': 'Front-End Web Development with React',
                    'description': 'Master front-end web development with React and modern JavaScript.',
                    'content_url': 'https://www.coursera.org/learn/front-end-react',
                    'partner': 'Hong Kong University',
                    'duration_minutes': 360,
                    'difficulty': 'intermediate',
                    'content_type': 'external',
                    'skills': ['react', 'javascript', 'frontend', 'html', 'css'],
                    'xp_points': 45
                }
            ],
            'data science': [
                {
                    'title': 'IBM Data Science Professional Certificate',
                    'description': 'Launch your career in data science with this comprehensive program from IBM.',
                    'content_url': 'https://www.coursera.org/professional-certificates/ibm-data-science',
                    'partner': 'IBM',
                    'duration_minutes': 600,
                    'difficulty': 'beginner',
                    'content_type': 'external',
                    'skills': ['python', 'data science', 'machine learning', 'sql', 'data visualization'],
                    'xp_points': 70
                }
            ]
        }

        # Find matching courses
        term_lower = term.lower()
        courses = []

        for key, course_list in mock_database.items():
            if key in term_lower or term_lower in key:
                for course in course_list[:limit]:
                    course_copy = course.copy()
                    course_copy['search_term'] = term
                    courses.append(course_copy)

        # If no specific match, return some default courses
        if not courses and term_lower:
            # Return first available courses from any category
            for key, course_list in mock_database.items():
                for course in course_list[:2]:
                    course_copy = course.copy()
                    course_copy['search_term'] = term
                    courses.append(course_copy)
                if len(courses) >= limit:
                    break

        return courses[:limit]

    def _extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skills from text"""
        skills_keywords = [
            'python', 'java', 'javascript', 'react', 'angular', 'vue', 'django',
            'flask', 'spring', 'node.js', 'express', 'sql', 'mongodb', 'postgresql',
            'mysql', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'github',
            'machine learning', 'data science', 'artificial intelligence', 'deep learning',
            'html', 'css', 'typescript', 'agile', 'scrum', 'project management'
        ]

        text_lower = text.lower()
        found_skills = []

        for skill in skills_keywords:
            if skill in text_lower:
                found_skills.append(skill)
                if len(found_skills) >= 10:
                    break

        return list(set(found_skills))

    def _calculate_xp_points(self, duration_minutes: int, difficulty: str) -> int:
        """Calculate XP points"""
        base_xp = 10

        if duration_minutes >= 480:
            duration_bonus = 40
        elif duration_minutes >= 240:
            duration_bonus = 20
        elif duration_minutes >= 120:
            duration_bonus = 10
        elif duration_minutes >= 60:
            duration_bonus = 5
        else:
            duration_bonus = 0

        difficulty_bonus = {
            'beginner': 0,
            'intermediate': 10,
            'advanced': 20
        }.get(difficulty, 0)

        return base_xp + duration_bonus + difficulty_bonus


class CourseraCourseImporter:
    """Import scraped courses into LearningModule database"""

    def __init__(self):
        from learning.models import LearningModule, CareerPath, CareerPathModule
        self.LearningModule = LearningModule
        self.CareerPath = CareerPath
        self.CareerPathModule = CareerPathModule

    def import_courses(self, courses_data: List[Dict], career_path_id: str = None) -> Dict:
        """Import scraped courses into database"""
        created_count = 0
        updated_count = 0
        skipped_count = 0
        imported_courses = []

        for course_data in courses_data:
            try:
                # Check if module already exists
                module, created = self.LearningModule.objects.get_or_create(
                    title=course_data['title'],
                    defaults={
                        'description': course_data.get('description', ''),
                        'content_type': 'external',
                        'content_url': course_data.get('content_url', ''),
                        'duration_minutes': course_data.get('duration_minutes', 60),
                        'difficulty': course_data.get('difficulty', 'beginner'),
                        'xp_points': course_data.get('xp_points', 10),
                        'is_required': False
                    }
                )

                if created:
                    created_count += 1
                    imported_courses.append(module)
                else:
                    updated_count += 1

                # Link to career path if specified
                if career_path_id and created:
                    try:
                        career_path = self.CareerPath.objects.get(id=career_path_id)
                        self.CareerPathModule.objects.get_or_create(
                            career_path=career_path,
                            module=module,
                            defaults={
                                'order_index': self.CareerPathModule.objects.filter(career_path=career_path).count()}
                        )
                    except self.CareerPath.DoesNotExist:
                        pass

            except Exception as e:
                logger.error(f"Error importing course {course_data.get('title', 'Unknown')}: {e}")
                skipped_count += 1

        return {
            'created': created_count,
            'updated': updated_count,
            'skipped': skipped_count,
            'total': len(courses_data),
            'imported_courses': imported_courses
        }