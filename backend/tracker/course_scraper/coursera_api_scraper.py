import requests
import time
import re
from typing import List, Dict, Any
from fake_useragent import UserAgent
import cloudscraper
import logging

logger = logging.getLogger(__name__)


class CourseraAPIScraper:
    """Scrape courses using Coursera's public API (no Selenium required)"""

    def __init__(self):
        self.ua = UserAgent()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': self.ua.random,
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.coursera.org/'
        })

    def scrape_courses_by_search(self, search_terms: List[str], max_per_term: int = 20) -> List[Dict]:
        """Scrape courses using Coursera's search API"""
        all_courses = []

        for term in search_terms:
            logger.info(f"Searching for: {term}")
            courses = self._search_courses_api(term, max_per_term)
            all_courses.extend(courses)
            time.sleep(1)

        return all_courses

    def _search_courses_api(self, query: str, limit: int = 20) -> List[Dict]:
        """Use Coursera's internal search API"""
        courses = []

        # Coursera's search endpoint
        url = "https://www.coursera.org/api/legacySearch"

        params = {
            'query': query,
            'limit': limit,
            'fields': 'id,name,description,slug,photoUrl,partnerIds,courseType,workload,metadata',
            'includes': 'partners,v1',
            'typeaheadEnabled': 'false'
        }

        try:
            response = self.session.get(url, params=params, timeout=30)

            if response.status_code == 200:
                data = response.json()

                # Extract elements from response
                elements = data.get('elements', [])

                # Get partners data
                partners = {}
                if 'linked' in data and 'partners.v1' in data['linked']:
                    for partner in data['linked']['partners.v1']:
                        partners[partner['id']] = partner.get('name', '')

                for element in elements:
                    course = self._parse_course_element(element, partners, query)
                    if course:
                        courses.append(course)

            else:
                logger.warning(f"API returned status {response.status_code}")

        except Exception as e:
            logger.error(f"Error searching courses: {e}")

        return courses

    def _parse_course_element(self, element: Dict, partners: Dict, search_term: str) -> Dict:
        """Parse course element from API response"""
        try:
            # Get basic info
            name = element.get('name', '')
            if not name:
                return None

            description = element.get('description', '')
            course_type = element.get('courseType', 'course')
            slug = element.get('slug', '')

            # Get partner (institution)
            partner_ids = element.get('partnerIds', [])
            partner = partners.get(partner_ids[0], 'Coursera') if partner_ids else 'Coursera'

            # Get workload (duration)
            workload = element.get('workload', '')
            duration_minutes = self._parse_workload(workload)

            # Get photo URL
            photo_url = element.get('photoUrl', '')
            if photo_url and not photo_url.startswith('http'):
                photo_url = f"https://www.coursera.org{photo_url}"

            # Determine difficulty from metadata
            metadata = element.get('metadata', [])
            difficulty = self._extract_difficulty(metadata)

            # Build course URL
            course_url = f"https://www.coursera.org/learn/{slug}" if slug else ""

            # Extract skills from description
            skills = self._extract_skills_from_text(description + " " + name)

            # Determine content type
            content_type = self._determine_content_type(course_type, name, description)

            # Calculate XP
            xp_points = self._calculate_xp_points(duration_minutes, difficulty)

            return {
                'title': name,
                'description': description[:1000] if description else '',
                'content_url': course_url,
                'partner': partner,
                'duration_minutes': duration_minutes,
                'difficulty': difficulty,
                'content_type': content_type,
                'skills': skills[:10],
                'search_term': search_term,
                'source': 'coursera_api',
                'xp_points': xp_points,
                'image_url': photo_url
            }

        except Exception as e:
            logger.error(f"Error parsing course element: {e}")
            return None

    def _parse_workload(self, workload: str) -> int:
        """Parse workload string to minutes"""
        if not workload:
            return 60

        workload_lower = workload.lower()

        # Look for hours
        hours_match = re.search(r'(\d+)\s*hours?', workload_lower)
        if hours_match:
            hours = int(hours_match.group(1))
            return hours * 60

        # Look for weeks with hours per week
        weeks_match = re.search(r'(\d+)\s*weeks?', workload_lower)
        if weeks_match:
            weeks = int(weeks_match.group(1))

            hours_per_week = re.search(r'(\d+)\s*hours?\s*per\s*week', workload_lower)
            if hours_per_week:
                hours = int(hours_per_week.group(1))
                return weeks * hours * 60

            return weeks * 5 * 60  # Assume 5 hours per week

        return 60

    def _extract_difficulty(self, metadata: List) -> str:
        """Extract difficulty from metadata"""
        for item in metadata:
            if isinstance(item, dict) and 'difficultyLevel' in item:
                level = item.get('difficultyLevel', '').lower()
                if 'beginner' in level:
                    return 'beginner'
                elif 'intermediate' in level:
                    return 'intermediate'
                elif 'advanced' in level:
                    return 'advanced'
        return 'beginner'

    def _extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skills from text"""
        skills_keywords = [
            'python', 'java', 'javascript', 'react', 'angular', 'vue', 'django',
            'flask', 'spring', 'node.js', 'express', 'sql', 'mongodb', 'postgresql',
            'mysql', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'github',
            'machine learning', 'data science', 'artificial intelligence', 'deep learning',
            'html', 'css', 'typescript', 'agile', 'scrum', 'project management',
            'data analysis', 'pandas', 'numpy', 'tensorflow', 'pytorch', 'scikit-learn',
            'tableau', 'power bi', 'excel', 'leadership', 'communication', 'teamwork'
        ]

        text_lower = text.lower()
        found_skills = []

        for skill in skills_keywords:
            if skill in text_lower:
                found_skills.append(skill)
                if len(found_skills) >= 10:
                    break

        return list(set(found_skills))

    def _determine_content_type(self, course_type: str, title: str, description: str) -> str:
        """Determine content type"""
        text = (title + " " + description).lower()

        if 'specialization' in course_type.lower():
            return 'interactive'
        elif 'project' in course_type.lower() or 'project' in text:
            return 'interactive'
        elif 'video' in text:
            return 'video'
        elif 'article' in text:
            return 'article'
        else:
            return 'video'

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


class MockCourseraScraper:
    """Mock scraper for testing when API is blocked"""

    def scrape_courses_by_search(self, search_terms: List[str], max_per_term: int = 20) -> List[Dict]:
        """Return mock course data for testing"""
        mock_courses = {
            'java': [
                {
                    'title': 'Java Programming and Software Engineering Fundamentals',
                    'description': 'Learn to code in Java and improve your programming and problem-solving skills. You will learn to design algorithms, develop programs, and analyze their correctness.',
                    'content_url': 'https://www.coursera.org/specializations/java-programming',
                    'partner': 'Duke University',
                    'duration_minutes': 480,
                    'difficulty': 'beginner',
                    'content_type': 'video',
                    'skills': ['java', 'programming', 'algorithms', 'problem solving'],
                    'xp_points': 50,
                    'source': 'mock'
                },
                {
                    'title': 'Object Oriented Programming in Java',
                    'description': 'Explore advanced Java concepts including inheritance, polymorphism, and encapsulation. Learn to write efficient and maintainable code.',
                    'content_url': 'https://www.coursera.org/learn/object-oriented-java',
                    'partner': 'UC San Diego',
                    'duration_minutes': 240,
                    'difficulty': 'intermediate',
                    'content_type': 'video',
                    'skills': ['java', 'oop', 'inheritance', 'polymorphism'],
                    'xp_points': 30,
                    'source': 'mock'
                },
                {
                    'title': 'Java for Android',
                    'description': 'Master Java programming fundamentals for Android development. Learn to build Android apps using Java.',
                    'content_url': 'https://www.coursera.org/learn/java-for-android',
                    'partner': 'Vanderbilt University',
                    'duration_minutes': 360,
                    'difficulty': 'intermediate',
                    'content_type': 'video',
                    'skills': ['java', 'android', 'mobile development'],
                    'xp_points': 40,
                    'source': 'mock'
                },
                {
                    'title': 'Data Structures and Performance',
                    'description': 'Learn how to use data structures like lists, maps, and trees to create efficient Java applications.',
                    'content_url': 'https://www.coursera.org/learn/data-structures-optimizing-performance',
                    'partner': 'UC San Diego',
                    'duration_minutes': 300,
                    'difficulty': 'advanced',
                    'content_type': 'video',
                    'skills': ['java', 'data structures', 'algorithms', 'performance'],
                    'xp_points': 45,
                    'source': 'mock'
                }
            ],
            'python': [
                {
                    'title': 'Python for Everybody',
                    'description': 'Learn the basics of programming with Python. This course covers variables, loops, functions, and data structures.',
                    'content_url': 'https://www.coursera.org/specializations/python',
                    'partner': 'University of Michigan',
                    'duration_minutes': 480,
                    'difficulty': 'beginner',
                    'content_type': 'video',
                    'skills': ['python', 'programming', 'data structures'],
                    'xp_points': 50,
                    'source': 'mock'
                }
            ],
            'web development': [
                {
                    'title': 'HTML, CSS, and Javascript for Web Developers',
                    'description': 'Learn to build responsive websites using HTML, CSS, and JavaScript. Master front-end development.',
                    'content_url': 'https://www.coursera.org/learn/html-css-javascript-for-web-developers',
                    'partner': 'Johns Hopkins University',
                    'duration_minutes': 240,
                    'difficulty': 'beginner',
                    'content_type': 'video',
                    'skills': ['html', 'css', 'javascript', 'web development'],
                    'xp_points': 30,
                    'source': 'mock'
                }
            ]
        }

        all_courses = []
        for term in search_terms:
            term_lower = term.lower()
            for key, courses in mock_courses.items():
                if key in term_lower:
                    for course in courses[:max_per_term]:
                        course_copy = course.copy()
                        course_copy['search_term'] = term
                        all_courses.append(course_copy)

        return all_courses