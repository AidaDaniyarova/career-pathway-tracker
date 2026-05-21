from django.shortcuts import render, redirect
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib import messages
from django.http import JsonResponse
from django.utils import timezone
from .coursera_api_scraper import CourseraAPIScraper, CourseraCourseImporter
from .models import CrawlLog
from learning.models import CareerPath, LearningModule


@staff_member_required
def crawl_dashboard(request):
    """Admin dashboard for course crawling"""
    context = {
        'title': 'Course Crawler Dashboard',
        'career_paths': CareerPath.objects.all(),
        'recent_crawls': CrawlLog.objects.all().order_by('-started_at')[:10],
        'total_modules': LearningModule.objects.count(),
        'external_modules': LearningModule.objects.filter(content_type='external').count(),
    }
    return render(request, 'admin/crawler/dashboard.html', context)


@staff_member_required
def start_crawl(request):
    """Start a new crawl job"""
    if request.method == 'POST':
        search_terms = request.POST.get('search_terms', '').split(',')
        search_terms = [term.strip() for term in search_terms if term.strip()]

        max_courses = int(request.POST.get('max_courses', 20))
        career_path_id = request.POST.get('career_path_id')

        if not search_terms:
            messages.error(request, 'Please enter at least one search term')
            return redirect('admin:crawl_dashboard')

        # Create crawl log
        crawl_log = CrawlLog.objects.create(
            search_terms=search_terms,
            max_courses=max_courses,
            career_path_id=career_path_id,
            status='running',
            started_at=timezone.now()
        )

        try:
            # Run scraper
            scraper = CourseraAPIScraper()
            importer = CourseraCourseImporter()

            courses = scraper.scrape_courses_by_search(search_terms, max_courses)

            # Import courses
            result = importer.import_courses(courses, career_path_id)

            # Update crawl log
            crawl_log.courses_found = len(courses)
            crawl_log.courses_created = result['created']
            crawl_log.courses_updated = result['updated']
            crawl_log.status = 'completed'
            crawl_log.completed_at = timezone.now()
            crawl_log.save()

            messages.success(
                request,
                f'Crawl completed! Created {result["created"]} new courses, updated {result["updated"]} existing.'
            )

        except Exception as e:
            crawl_log.status = 'failed'
            crawl_log.error_message = str(e)
            crawl_log.completed_at = timezone.now()
            crawl_log.save()
            messages.error(request, f'Crawl failed: {str(e)}')

        return redirect('admin:crawl_dashboard')

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@staff_member_required
def crawl_for_career_path(request, career_path_id):
    """Start a crawl specifically for a career path"""
    if request.method == 'POST':
        try:
            career_path = CareerPath.objects.get(id=career_path_id)
        except CareerPath.DoesNotExist:
            messages.error(request, 'Career path not found')
            return redirect('admin:crawl_dashboard')

        # Generate search terms from career path
        search_terms = [career_path.title]
        if career_path.industry:
            search_terms.append(career_path.industry)

        max_courses = int(request.POST.get('max_courses', 20))

        # Create crawl log
        crawl_log = CrawlLog.objects.create(
            search_terms=search_terms,
            max_courses=max_courses,
            career_path=career_path,
            status='running',
            started_at=timezone.now()
        )

        try:
            scraper = CourseraAPIScraper()
            importer = CourseraCourseImporter()

            courses = scraper.scrape_courses_by_search(search_terms, max_courses)
            result = importer.import_courses(courses, str(career_path.id))

            crawl_log.courses_found = len(courses)
            crawl_log.courses_created = result['created']
            crawl_log.courses_updated = result['updated']
            crawl_log.status = 'completed'
            crawl_log.completed_at = timezone.now()
            crawl_log.save()

            messages.success(
                request,
                f'Crawled {len(courses)} courses for {career_path.title}. Created {result["created"]}, updated {result["updated"]}.'
            )

        except Exception as e:
            crawl_log.status = 'failed'
            crawl_log.error_message = str(e)
            crawl_log.completed_at = timezone.now()
            crawl_log.save()
            messages.error(request, f'Crawl failed: {str(e)}')

        return redirect('admin:crawl_dashboard')

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@staff_member_required
def get_crawl_status(request, log_id):
    """Get status of a crawl job via AJAX"""
    try:
        log = CrawlLog.objects.get(id=log_id)
        return JsonResponse({
            'status': log.status,
            'courses_found': log.courses_found,
            'courses_created': log.courses_created,
            'courses_updated': log.courses_updated,
            'error_message': log.error_message,
            'started_at': log.started_at.isoformat() if log.started_at else None,
            'completed_at': log.completed_at.isoformat() if log.completed_at else None,
        })
    except CrawlLog.DoesNotExist:
        return JsonResponse({'error': 'Log not found'}, status=404)


@staff_member_required
def test_scrape(request):
    """Test scraping without saving to database"""
    if request.method == 'POST':
        search_term = request.POST.get('search_term', '')
        max_courses = int(request.POST.get('max_courses', 5))

        if not search_term:
            return JsonResponse({'error': 'Search term required'}, status=400)

        try:
            scraper = CourseraAPIScraper()
            courses = scraper.scrape_courses_by_search([search_term], max_courses)

            return JsonResponse({
                'success': True,
                'count': len(courses),
                'courses': [
                    {
                        'title': c.get('title', 'Unknown'),
                        'partner': c.get('partner', 'Unknown'),
                        'difficulty': c.get('difficulty', 'beginner'),
                        'duration_minutes': c.get('duration_minutes', 60)
                    }
                    for c in courses[:10]
                ]
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)