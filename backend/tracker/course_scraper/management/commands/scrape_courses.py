from django.core.management.base import BaseCommand
import logging
from course_scraper.coursera_scaper import CourseraScraperService, CourseraCourseImporter

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Scrape courses from Coursera and import into LearningModule database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--terms',
            nargs='+',
            type=str,
            help='Search terms for courses'
        )
        parser.add_argument(
            '--max',
            type=int,
            default=20,
            help='Maximum courses per search term'
        )
        parser.add_argument(
            '--career-path',
            type=str,
            help='Career path ID to link courses to'
        )
        parser.add_argument(
            '--mock',
            action='store_true',
            default=False,
            help='Use mock data for testing'
        )

    def handle(self, *args, **options):
        search_terms = options.get('terms') or [
            'python programming', 'web development', 'data science',
            'machine learning', 'javascript', 'react', 'django',
            'java', 'cloud computing', 'devops'
        ]

        max_courses = options.get('max', 20)
        career_path_id = options.get('career_path')
        use_mock = options.get('mock', False)

        self.stdout.write(self.style.SUCCESS(f'Starting course scraping...'))
        self.stdout.write(f'Search terms: {", ".join(search_terms)}')
        self.stdout.write(f'Max courses per term: {max_courses}')
        self.stdout.write(f'Using mock data: {use_mock}')

        # Create scraper and import courses
        scraper = CourseraScraperService(use_mock=use_mock)
        importer = CourseraCourseImporter()

        all_courses = []

        for term in search_terms:
            self.stdout.write(f'\n📚 Searching for: {term}')
            courses = scraper.scrape_courses_by_search([term], max_courses)
            all_courses.extend(courses)
            self.stdout.write(f'   Found {len(courses)} courses')

            # Display sample of found courses
            for course in courses[:3]:
                self.stdout.write(f'      - {course.get("title", "Unknown")[:60]}...')

        self.stdout.write(f'\n📥 Importing {len(all_courses)} courses...')

        result = importer.import_courses(all_courses, career_path_id)

        self.stdout.write(self.style.SUCCESS(f'\n✅ Import completed!'))
        self.stdout.write(f'   Created: {result["created"]}')
        self.stdout.write(f'   Updated: {result["updated"]}')
        self.stdout.write(f'   Skipped: {result["skipped"]}')
        self.stdout.write(f'   Total: {result["total"]}')

        # Show sample of imported courses
        if result.get('imported_courses'):
            self.stdout.write(f'\n📖 Sample of imported courses:')
            for course in result['imported_courses'][:5]:
                self.stdout.write(f'   - {course.title[:60]} ({course.difficulty}, {course.duration_minutes} min)')