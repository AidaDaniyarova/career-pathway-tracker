from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework import status
from learning.models import CareerPath
import logging
from course_scraper.coursera_scaper import CourseraScraperService, CourseraCourseImporter

logger = logging.getLogger(__name__)

class ScrapeCoursesView(APIView):
    """Admin view to trigger course scraping"""
    permission_classes = [IsAdminUser]

    def post(self, request):
        search_terms = request.data.get('search_terms', [])
        career_path_id = request.data.get('career_path_id')
        max_courses = request.data.get('max_courses', 20)

        if not search_terms:
            search_terms = [
                'python programming', 'web development', 'data science',
                'javascript', 'react', 'django', 'java'
            ]

        try:
            # Remove the headless parameter - it's not needed
            scraper = CourseraScraperService(use_mock=False)
            importer = CourseraCourseImporter()

            courses = scraper.scrape_courses_by_search(search_terms, max_courses)
            result = importer.import_courses(courses, career_path_id)

            # Prepare sample for response
            courses_sample = []
            for course in result.get('imported_courses', [])[:10]:
                courses_sample.append({
                    'title': course.title,
                    'difficulty': course.difficulty,
                    'duration': course.duration_minutes
                })

            return Response({
                'message': 'Scraping completed',
                'result': {
                    'created': result['created'],
                    'updated': result['updated'],
                    'skipped': result['skipped'],
                    'total': result['total'],
                    'courses_sample': courses_sample
                }
            })

        except Exception as e:
            logger.error(f"Scraping failed: {e}")
            return Response(
                {'error': str(e), 'message': 'Scraping failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ScrapeForCareerPathView(APIView):
    """Scrape courses for a specific career path"""
    permission_classes = [IsAdminUser]

    def post(self, request, career_path_id):
        try:
            career_path = CareerPath.objects.get(id=career_path_id)
        except CareerPath.DoesNotExist:
            return Response(
                {'error': 'Career path not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Generate search terms based on career path
        search_terms = [career_path.title]
        if career_path.industry:
            search_terms.append(career_path.industry)

        max_courses = request.data.get('max_courses', 20)

        try:
            scraper = CourseraScraperService(use_mock=False)
            importer = CourseraCourseImporter()

            courses = scraper.scrape_courses_by_search(search_terms, max_courses)
            result = importer.import_courses(courses, career_path_id)

            return Response({
                'message': f'Scraping completed for {career_path.title}',
                'result': {
                    'created': result['created'],
                    'updated': result['updated'],
                    'skipped': result['skipped'],
                    'total': result['total']
                }
            })

        except Exception as e:
            logger.error(f"Scraping failed: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )