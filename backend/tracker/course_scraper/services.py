import os
import json
import requests
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from .models import ExternalCourse, CourseScrapeLog


class CourseraScraperService:
    """Service to scrape course data from Coursera using Apify API"""

    def __init__(self):
        self.apify_token = os.getenv('APIFY_API_TOKEN', '')
        self.base_url = "https://api.apify.com/v2"

    def scrape_courses_by_search(self, search_terms, max_items=20):
        """
        Scrape courses from Coursera using search terms
        Uses Coursera Search Scraper Apify actor [citation:4]
        """
        if not self.apify_token:
            return self._get_mock_courses(search_terms)

        all_courses = []

        for term in search_terms:
            try:
                # Scrape by search URL
                search_url = f"https://www.coursera.org/search?query={term.replace(' ', '%20')}"
                courses = self._run_apify_scraper(search_url, max_items)

                for course in courses:
                    course['search_term'] = term
                    all_courses.append(course)

            except Exception as e:
                print(f"Error scraping '{term}': {e}")
                continue

        return all_courses

    def _run_apify_scraper(self, search_url, max_items=20):
        """Run Apify actor to scrape courses"""
        # Actor ID for Coursera Search Scraper [citation:4]
        actor_id = "powerai/coursera-search-scraper"

        # Prepare input for the actor
        input_data = {
            "searchUrl": search_url,
            "maxItems": max_items
        }

        # Run the actor synchronously
        response = requests.post(
            f"{self.base_url}/acts/{actor_id}/run-sync-get-dataset-items",
            params={"token": self.apify_token},
            json=input_data,
            timeout=120
        )

        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Apify API error: {response.status_code}")

    def _get_mock_courses(self, search_terms):
        """Return mock course data when API key is not available"""
        mock_courses = {
            'python': [
                {
                    'title': 'Python for Everybody Specialization',
                    'detailPageUrl': 'https://www.coursera.org/specializations/python',
                    'partner': 'University of Michigan',
                    'rating': 4.8,
                    'reviewsCount': '45K',
                    'difficulty': 'Beginner',
                    'duration': '3 - 6 months',
                    'course_type': 'Specialization',
                    'skills': ['Python Programming', 'Data Structures', 'Web Scraping', 'Database']
                },
                {
                    'title': 'Google IT Automation with Python',
                    'detailPageUrl': 'https://www.coursera.org/professional-certificates/google-it-automation',
                    'partner': 'Google',
                    'rating': 4.7,
                    'reviewsCount': '32K',
                    'difficulty': 'Intermediate',
                    'duration': '6 months',
                    'course_type': 'Professional Certificate',
                    'skills': ['Python', 'Automation', 'Git', 'Troubleshooting']
                }
            ],
            'data science': [
                {
                    'title': 'IBM Data Science Professional Certificate',
                    'detailPageUrl': 'https://www.coursera.org/professional-certificates/ibm-data-science',
                    'partner': 'IBM',
                    'rating': 4.6,
                    'reviewsCount': '67K',
                    'difficulty': 'Beginner',
                    'duration': '5 - 10 months',
                    'course_type': 'Professional Certificate',
                    'skills': ['Data Science', 'Python', 'SQL', 'Machine Learning', 'Data Visualization']
                }
            ],
            'web development': [
                {
                    'title': 'Meta Front-End Developer Professional Certificate',
                    'detailPageUrl': 'https://www.coursera.org/professional-certificates/meta-front-end-developer',
                    'partner': 'Meta',
                    'rating': 4.7,
                    'reviewsCount': '28K',
                    'difficulty': 'Beginner',
                    'duration': '7 months',
                    'course_type': 'Professional Certificate',
                    'skills': ['HTML', 'CSS', 'JavaScript', 'React', 'UI/UX']
                }
            ]
        }

        all_courses = []
        for term in search_terms:
            term_lower = term.lower()
            for key, courses in mock_courses.items():
                if key in term_lower:
                    for course in courses:
                        course_copy = course.copy()
                        course_copy['search_term'] = term
                        all_courses.append(course_copy)

        return all_courses[:50]

    def parse_and_save_courses(self, courses_data):
        """Parse raw scraper data and save to database"""
        saved_count = 0
        new_courses = []

        for course_data in courses_data:
            # Extract difficulty from meta if available
            meta = course_data.get('meta', '')
            difficulty = self._extract_difficulty(meta)
            duration = self._extract_duration(meta)
            course_type = self._extract_course_type(meta)

            # Parse skills (might be string or list)
            skills = course_data.get('skills', [])
            if isinstance(skills, str):
                skills = [s.strip() for s in skills.split(',') if s.strip()]

            # Create or update course
            course, created = ExternalCourse.objects.update_or_create(
                title=course_data.get('title'),
                provider='coursera',
                defaults={
                    'detail_page_url': course_data.get('detailPageUrl', ''),
                    'image_url': course_data.get('imageUrl', ''),
                    'partner': course_data.get('partner', ''),
                    'difficulty': difficulty,
                    'duration': duration,
                    'course_type': course_type,
                    'skills': skills,
                    'rating': course_data.get('rating'),
                    'reviews_count': str(course_data.get('reviewsCount', '')),
                    'status': course_data.get('status', ''),
                    'search_term': course_data.get('search_term', ''),
                }
            )

            saved_count += 1
            new_courses.append(course)

        return saved_count, new_courses

    def _extract_difficulty(self, meta):
        """Extract difficulty level from meta string"""
        if not meta:
            return ''
        meta_lower = meta.lower()
        if 'beginner' in meta_lower:
            return 'Beginner'
        elif 'intermediate' in meta_lower:
            return 'Intermediate'
        elif 'advanced' in meta_lower:
            return 'Advanced'
        return ''

    def _extract_duration(self, meta):
        """Extract duration from meta string"""
        if not meta:
            return ''
        # Extract duration pattern like "1 - 4 Weeks" or "3 months"
        import re
        match = re.search(r'(?:\d+\s*-\s*\d+\s*(?:weeks?|months?)|(?:\d+\s*(?:weeks?|months?)))', meta, re.IGNORECASE)
        if match:
            return match.group()
        return ''

    def _extract_course_type(self, meta):
        """Extract course type from meta string"""
        if not meta:
            return ''
        meta_lower = meta.lower()
        if 'specialization' in meta_lower:
            return 'Specialization'
        elif 'professional certificate' in meta_lower:
            return 'Professional Certificate'
        elif 'guided project' in meta_lower:
            return 'Guided Project'
        elif 'course' in meta_lower:
            return 'Course'
        return ''


class ExternalCourseService:
    """Service for managing external courses"""

    @staticmethod
    def get_courses_by_skills(skills, limit=20):
        """Get external courses that match given skills"""
        courses = ExternalCourse.objects.filter(
            skills__icontains__in=skills
        ).distinct()[:limit]
        return courses

    @staticmethod
    def search_courses(query, limit=30):
        """Search external courses by title, partner, or skills"""
        courses = ExternalCourse.objects.filter(
            models.Q(title__icontains=query) |
            models.Q(partner__icontains=query) |
            models.Q(skills__icontains=query)
        ).distinct()[:limit]
        return courses

    @staticmethod
    def get_courses_by_difficulty(difficulty, limit=20):
        """Get courses by difficulty level"""
        courses = ExternalCourse.objects.filter(
            difficulty__iexact=difficulty
        )[:limit]
        return courses

    @staticmethod
    def get_popular_courses(limit=20):
        """Get popular courses (highest difficulty first, then rating)"""
        courses = ExternalCourse.objects.exclude(
            rating__isnull=True
        ).order_by('-rating', '-id')[:limit]
        return courses