from datetime import timedelta
from decimal import Decimal
from django.db.models import Sum, Count, Avg, Q, F
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import UserEnrollment, UserProgress
from .serializers import (
    UserEnrollmentSerializer, UserEnrollmentDetailSerializer,
    UserProgressSerializer, UserProgressUpdateSerializer)
from learning.models import CareerPathModule, Prerequisite, LearningModule
from ai.models import Recommendation
from skills.models import UserSkill
from .services import ProgressService


class UserEnrollmentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user career path enrollments"""
    serializer_class = UserEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    lookup_value_regex = '[0-9a-f-]+'

    def get_queryset(self):
        return UserEnrollment.objects.filter(user=self.request.user).select_related('career_path')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return UserEnrollmentDetailSerializer
        return UserEnrollmentSerializer

    def perform_create(self, serializer):
        # Save the master tracking record first
        enrollment = serializer.save(user=self.request.user)
        career_path = enrollment.career_path

        # Pull down the base track manifest items
        modules = CareerPathModule.objects.filter(
            career_path=career_path
        ).select_related('module').order_by('order_index')

        # Find all modules the user has already completed anywhere across the system
        completed_module_ids = set(
            UserProgress.objects.filter(
                user=self.request.user,
                status='completed'
            ).values_list('module_id', flat=True)
        )

        for cp_module in modules:
            is_completed = cp_module.module.id in completed_module_ids
            initial_status = 'completed' if is_completed else 'not_started'
            initial_percent = 100 if is_completed else 0

            UserProgress.objects.get_or_create(
                user=self.request.user,
                module=cp_module.module,
                enrollment=enrollment,
                defaults={
                    'status': initial_status,
                    'progress_percent': initial_percent,
                    'time_spent_seconds': 0
                }
            )

        enrollment.update_progress()

    @action(detail=True, methods=['get'], url_path='progress')
    def get_progress(self, request, id=None):
        """Get detailed progress for this enrollment"""
        enrollment = self.get_object()

        # Get all module progress records
        module_progress = UserProgress.objects.filter(
            enrollment=enrollment
        ).select_related('module').order_by('module__title')

        # Calculate statistics
        completed_modules = module_progress.filter(status='completed').count()
        in_progress_modules = module_progress.filter(status='in_progress').count()
        not_started_modules = module_progress.filter(status='not_started').count()

        # Calculate total time spent
        total_time_spent = module_progress.aggregate(
            total=Sum('time_spent_seconds')
        )['total'] or 0

        # Calculate average score
        avg_score = module_progress.filter(
            score__isnull=False
        ).aggregate(avg=Avg('score'))['avg'] or 0

        # Get module progress data
        modules_data = []
        for prog in module_progress:
            modules_data.append({
                'module_id': str(prog.module.id),
                'module_title': prog.module.title,
                'order_index': prog.module.career_paths.filter(
                    career_path=enrollment.career_path
                ).first().order_index if prog.module.career_paths.exists() else 0,
                'status': prog.status,
                'progress_percent': float(prog.progress_percent),
                'time_spent_seconds': prog.time_spent_seconds,
                'score': float(prog.score) if prog.score else None,
                'xp_earned': prog.module.xp_points if prog.status == 'completed' else 0
            })

        # Sort by order_index
        modules_data.sort(key=lambda x: x['order_index'])

        return Response({
            'enrollment': {
                'id': str(enrollment.id),
                'career_path_id': str(enrollment.career_path.id),
                'career_path_title': enrollment.career_path.title,
                'career_path_slug': enrollment.career_path.slug,
                'status': enrollment.status,
                'progress_percent': float(enrollment.progress_percent),
                'started_at': enrollment.started_at
            },
            'statistics': {
                'total_modules': total_modules,
                'completed_modules': completed_modules,
                'in_progress_modules': in_progress_modules,
                'not_started_modules': not_started_modules,
                'completion_rate': round((completed_modules / total_modules * 100) if total_modules > 0 else 0, 1),
                'total_time_spent_hours': round(total_time_spent / 3600, 1),
                'average_score': round(float(avg_score), 1)
            },
            'modules': modules_data
        })

    @action(detail=True, methods=['post'], url_path='update-progress')
    def update_progress(self, request, id=None):
        enrollment = self.get_object()
        ProgressService.recalculate_enrollment(enrollment)

        return Response({
            "progress_percent": float(enrollment.progress_percent),
            "status": enrollment.status
        })

    @action(detail=True, methods=['post'], url_path='complete')
    def complete_enrollment(self, request, id=None):
        """Mark career path as completed"""
        enrollment = self.get_object()

        if enrollment.status == 'completed':
            return Response(
                {'message': 'Career path already completed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark all modules as completed
        UserProgress.objects.filter(enrollment=enrollment).update(
            status='completed',
            progress_percent=100
        )

        # Update enrollment
        enrollment.status = 'completed'
        enrollment.progress_percent = 100
        enrollment.save()

        # Calculate total XP earned
        total_xp = UserProgress.objects.filter(
            enrollment=enrollment,
            status='completed'
        ).aggregate(total=Sum('module__xp_points'))['total'] or 0

        return Response({
            'message': 'Career path completed!',
            'career_path_title': enrollment.career_path.title,
            'total_xp_earned': total_xp,
            'completed_at': timezone.now()
        })

    @action(detail=True, methods=['post'], url_path='drop')
    def drop_enrollment(self, request, id=None):
        """Drop enrollment (soft delete)"""
        enrollment = self.get_object()
        enrollment.status = 'dropped'
        enrollment.save(update_fields=['status'])
        return Response({'message': 'Career path dropped successfully', 'status': 'dropped'})

class UserProgressViewSet(viewsets.ModelViewSet):
    """ViewSet for tracking module progress"""
    serializer_class = UserProgressSerializer
    permission_classes = [permissions.IsAuthenticated]  # Must be authenticated
    lookup_field = 'id'
    lookup_value_regex = '[0-9a-f-]+'

    def get_queryset(self):
        """Return only current user's progress"""
        return UserProgress.objects.filter(
            user=self.request.user
        ).select_related('module', 'enrollment')

    def get_serializer_class(self):
        """Use update serializer for write operations"""
        if self.action in ['create', 'update', 'partial_update']:
            return UserProgressUpdateSerializer
        return UserProgressSerializer

    @action(detail=False, methods=['post'], url_path='start')
    def start_module(self, request):
        """Start a module - creates progress records for ALL enrollments containing this module"""
        module_id = request.data.get('module_id') or request.data.get('module')
        enrollment_id = request.data.get('enrollment_id') or request.data.get('enrollment')

        if not module_id:
            return Response(
                {'error': 'module_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            module = LearningModule.objects.get(id=module_id)
        except LearningModule.DoesNotExist:
            return Response(
                {'error': 'Module not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Determine which enrollment(s) to use
        enrollments_to_start = []

        if enrollment_id:
            # Specific enrollment provided
            try:
                enrollment = UserEnrollment.objects.get(id=enrollment_id, user=request.user)
                enrollments_to_start = [enrollment]
            except UserEnrollment.DoesNotExist:
                return Response(
                    {'error': 'Enrollment not found'},
                    status=404
                )
        else:
            # Find ALL enrollments that contain this module
            career_paths_with_module = CareerPathModule.objects.filter(module=module).values_list('career_path_id',
                                                                                                  flat=True)
            enrollments_to_start = UserEnrollment.objects.filter(
                user=request.user,
                career_path_id__in=career_paths_with_module
            )

        if not enrollments_to_start:
            return Response(
                {'error': 'You are not enrolled in any career path that contains this module'},
                status=400
            )

        # Check prerequisites for the main enrollment (if multiple, use first)
        main_enrollment = enrollments_to_start[0]
        prerequisites = Prerequisite.objects.filter(module=module)
        missing_prerequisites = []

        for prereq in prerequisites:
            progress = UserProgress.objects.filter(
                user=request.user,
                module=prereq.prerequisite,
                enrollment=main_enrollment
            ).first()

            if not progress or progress.status != 'completed':
                missing_prerequisites.append({
                    'id': str(prereq.prerequisite.id),
                    'title': prereq.prerequisite.title
                })

        if missing_prerequisites:
            return Response({
                'error': 'Prerequisites not met',
                'missing_prerequisites': missing_prerequisites
            }, status=403)

        # Create or update progress records for ALL enrollments
        created_count = 0
        updated_count = 0
        started_enrollments = []

        for enrollment in enrollments_to_start:
            progress, created = UserProgress.objects.get_or_create(
                user=request.user,
                module=module,
                enrollment=enrollment,
                defaults={
                    'status': 'in_progress',
                    'progress_percent': 0,
                    'time_spent_seconds': 0
                }
            )

            if created:
                created_count += 1

            if progress.status == 'not_started':
                progress.status = 'in_progress'
                progress.save()
                updated_count += 1

            started_enrollments.append({
                'enrollment_id': str(enrollment.id),
                'career_path_title': enrollment.career_path.title
            })

        # Return the enrollment_id to use for subsequent requests
        return Response({
            'message': 'Module started',
            'module_id': str(module.id),
            'module_title': module.title,
            'enrollments_started': len(enrollments_to_start),
            'enrollment_id': str(enrollments_to_start[0].id) if enrollments_to_start else None,
            'enrollments': started_enrollments,
            'created_records': created_count,
            'updated_records': updated_count,
            'status': 'in_progress'
        }, status=200)

    @action(detail=False, methods=['post'], url_path='complete')
    def complete_module(self, request):
        module_id = request.data.get("module_id")
        enrollment_id = request.data.get("enrollment_id")
        score = request.data.get("score")

        if not module_id:
            return Response({"error": "module_id is required"}, status=400)

        try:
            module = LearningModule.objects.get(id=module_id)
        except LearningModule.DoesNotExist:
            return Response({"error": "Module not found"}, status=404)

        progress_records = UserProgress.objects.filter(
            user=request.user,
            module=module,
            enrollment_id=enrollment_id
        )

        if not progress_records.exists():
            return Response({"error": "Module not started"}, status=400)

        total_xp = 0

        for progress in progress_records:
            if progress.status == "completed":
                continue

            progress.status = "completed"
            progress.progress_percent = 100
            progress.completed_at = timezone.now()

            if score:
                try:
                    progress.score = float(score)
                except:
                    pass

            progress.save()
            total_xp = module.xp_points  # only once

        # update XP
        request.user.total_xp += total_xp
        request.user.save()

        # recalc enrollment
        enrollment = progress_records.first().enrollment
        ProgressService.recalculate_enrollment(enrollment)

        return Response({
            "message": "Module completed",
            "xp_earned": total_xp,
            "total_xp": request.user.total_xp,
            "enrollment_progress": float(enrollment.progress_percent)
        })

    @action(detail=False, methods=['post'], url_path='update-time')
    def update_time(self, request):
        """Update time spent on a module"""
        module_id = request.data.get('module_id')
        seconds = request.data.get('seconds', 0)
        enrollment_id = request.data.get('enrollment_id')

        if not module_id:
            return Response({'error': 'module_id is required'}, status=400)

        try:
            module = LearningModule.objects.get(id=module_id)
        except LearningModule.DoesNotExist:
            return Response({'error': 'Module not found'}, status=404)

        progress, created = UserProgress.objects.get_or_create(
            user=request.user,
            module=module,
            enrollment_id=enrollment_id,
            defaults={
                'status': 'not_started',
                'progress_percent': 0,
                'time_spent_seconds': 0
            }
        )

        progress.time_spent_seconds += seconds

        # Auto-update progress based on time (if duration available)
        if module.duration_minutes and module.duration_minutes > 0:
            expected_seconds = module.duration_minutes * 60
            if expected_seconds > 0:
                calculated_progress = min(95, (progress.time_spent_seconds / expected_seconds) * 100)
                if calculated_progress > progress.progress_percent:
                    progress.progress_percent = calculated_progress
                    if progress.progress_percent > 0 and progress.status == 'not_started':
                        progress.status = 'in_progress'

        progress.save()

        return Response({
            'module_id': str(module.id),
            'module_title': module.title,
            'time_spent_seconds': progress.time_spent_seconds,
            'progress_percent': float(progress.progress_percent),
            'status': progress.status
        })

    @action(detail=False, methods=['post'], url_path='update-progress')
    def update_progress_percent(self, request):
        """Update progress percentage for a module"""
        module_id = request.data.get('module_id')
        progress_percent = request.data.get('progress_percent', 0)
        enrollment_id = request.data.get('enrollment_id')

        if not module_id:
            return Response(
                {'error': 'module_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            module = LearningModule.objects.get(id=module_id)
        except LearningModule.DoesNotExist:
            return Response(
                {'error': 'Module not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        progress, created = UserProgress.objects.get_or_create(
            user=request.user,
            module=module,
            enrollment_id=enrollment_id,
            defaults={
                'status': 'not_started',
                'progress_percent': 0,
                'time_spent_seconds': 0
            }
        )

        progress.progress_percent = min(100, max(0, progress_percent))

        # Update status based on progress
        if progress.progress_percent >= 100:
            progress.status = 'completed'
            progress.progress_percent = 100
        elif progress.progress_percent > 0:
            progress.status = 'in_progress'

        progress.save()

        # Update enrollment progress if enrollment exists
        if enrollment_id and progress.status == 'completed':
            ProgressService.update_enrollment_progress(request.user, enrollment_id)

        serializer = self.get_serializer(progress)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='check-prerequisites')
    def check_prerequisites(self, request, id=None):
        """Check if prerequisites are completed for a module"""
        progress = self.get_object()
        module = progress.module

        prerequisites = Prerequisite.objects.filter(module=module).select_related('prerequisite')

        missing = []
        for prereq in prerequisites:
            prereq_progress = UserProgress.objects.filter(
                user=request.user,
                module=prereq.prerequisite
            ).first()

            if not prereq_progress or prereq_progress.status != 'completed':
                missing.append({
                    'id': str(prereq.prerequisite.id),
                    'title': prereq.prerequisite.title,
                    'is_completed': False
                })
            else:
                missing.append({
                    'id': str(prereq.prerequisite.id),
                    'title': prereq.prerequisite.title,
                    'is_completed': True
                })

        return Response({
            'module_id': str(module.id),
            'module_title': module.title,
            'all_prerequisites_completed': len([m for m in missing if not m['is_completed']]) == 0,
            'prerequisites': missing})


class DashboardView(APIView):
    """View for user dashboard data"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        # Get enrollments
        enrollments = UserEnrollment.objects.filter(
            user=user
        ).select_related('career_path')

        # Get in-progress modules
        in_progress = UserProgress.objects.filter(
            user=user,
            status='in_progress'
        ).select_related('module')[:5]

        # Get completed modules count
        completed_modules = UserProgress.objects.filter(
            user=user,
            status='completed'
        ).count()

        # Calculate total XP
        total_xp = user.total_xp

        # Calculate level based on XP
        level = (total_xp // 100) + 1
        next_level_xp = (level * 100) - total_xp

        # Get user skills
        skills = UserSkill.objects.filter(user=user).select_related('skill')[:5]

        # Get recommendations
        recommendations = Recommendation.objects.filter(
            user=user
        ).select_related('career_path').order_by('-score')[:5]

        # Calculate weekly activity based on completed_at dates
        weekly_activity = []
        today = timezone.now().date()

        for i in range(6, -1, -1):
            date = today - timedelta(days=i)
            # Count completions on this specific date
            completions = UserProgress.objects.filter(
                user=user,
                status='completed',
                completed_at__date=date  # Use completed_at, not created_at
            ).count()

            weekly_activity.append({
                'day': date.strftime('%a'),
                'date': date.isoformat(),
                'completions': completions
            })


        # Calculate total time spent
        total_time_seconds = UserProgress.objects.filter(user=user).aggregate(
            total=Sum('time_spent_seconds')
        )['total'] or 0
        total_hours = total_time_seconds // 3600
        total_minutes = (total_time_seconds % 3600) // 60

        # Calculate streak based on completion dates
        streak = self._calculate_streak(user)

        return Response({
            'enrollments': UserEnrollmentSerializer(enrollments, many=True).data,
            'statistics': {
                'total_enrollments': enrollments.count(),
                'active_enrollments': enrollments.filter(status__in=['enrolled', 'in_progress']).count(),
                'completed_enrollments': enrollments.filter(status='completed').count(),
                'completed_modules': completed_modules,
                'total_xp': total_xp,
                'level': level,
                'next_level_xp': next_level_xp,
                'current_streak': streak,
                'total_time_spent': {
                    'seconds': total_time_seconds,
                    'minutes': total_minutes,
                    'hours': total_hours,
                    'display': f"{total_hours}h {total_minutes}m" if total_hours > 0 else f"{total_minutes}m"
                }
            },
            'in_progress_modules': UserProgressSerializer(in_progress, many=True).data,
            'recent_activity': self._get_recent_activity(user),
            'top_skills': [
                {'id': str(us.skill.id), 'name': us.skill.name, 'level': us.level}
                for us in skills
            ],
            'recommendations': [
                {
                    'id': str(r.id),
                    'career_path_id': str(r.career_path.id),
                    'title': r.career_path.title,
                    'slug': getattr(r.career_path, 'slug', ''),
                    'score': float(r.score)
                }
                for r in recommendations
            ],
            'weekly_activity': weekly_activity
        })

    def _get_recent_activity(self, user):
        """Get recent activity for the user"""
        recent = UserProgress.objects.filter(
            user=user
        ).select_related('module', 'enrollment__career_path').order_by('-updated_at')[:10]

        return UserProgressSerializer(recent, many=True).data

    def _calculate_streak(self, user):
        """Calculate current learning streak based on completion dates"""
        # Get all completion dates
        completion_dates = UserProgress.objects.filter(
            user=user,
            status='completed',
            completed_at__isnull=False
        ).dates('completed_at', 'day').distinct()

        if not completion_dates:
            return 0

        # Convert to list and sort
        dates = sorted(completion_dates, reverse=True)

        # Calculate streak
        streak = 1
        today = timezone.now().date()

        # Check if last activity was today or yesterday
        if dates[0] < today - timedelta(days=1):
            return 0

        for i in range(len(dates) - 1):
            if (dates[i] - dates[i + 1]).days == 1:
                streak += 1
            else:
                break

        return streak


class EnrollmentProgressView(APIView):
    """View for detailed enrollment progress"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, enrollment_id):
        try:
            enrollment = UserEnrollment.objects.get(
                id=enrollment_id,
                user=request.user
            )
        except UserEnrollment.DoesNotExist:
            return Response(
                {'error': 'Enrollment not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get module progress
        module_progress = UserProgress.objects.filter(
            enrollment=enrollment
        ).select_related('module')

        total_modules = module_progress.count()
        completed = module_progress.filter(status='completed').count()
        in_progress = module_progress.filter(status='in_progress').count()
        not_started = module_progress.filter(status='not_started').count()

        # Calculate total time spent
        total_time = module_progress.aggregate(total=Sum('time_spent_seconds'))['total'] or 0

        # Calculate average score
        avg_score = module_progress.filter(score__isnull=False).aggregate(avg=Avg('score'))['avg'] or 0

        # Module details with prerequisites
        modules_data = []
        for prog in module_progress:
            # Check prerequisites for this module
            prerequisites = Prerequisite.objects.filter(module=prog.module)
            prereq_status = []
            for prereq in prerequisites:
                prereq_prog = UserProgress.objects.filter(
                    user=request.user,
                    module=prereq.prerequisite
                ).first()
                prereq_status.append({
                    'id': str(prereq.prerequisite.id),
                    'title': prereq.prerequisite.title,
                    'is_completed': prereq_prog and prereq_prog.status == 'completed'
                })

            modules_data.append({
                'id': str(prog.id),
                'module_id': str(prog.module.id),
                'title': prog.module.title,
                'description': prog.module.description,
                'content_type': prog.module.content_type,
                'duration_minutes': prog.module.duration_minutes,
                'difficulty': prog.module.difficulty,
                'xp_points': prog.module.xp_points,
                'status': prog.status,
                'progress_percent': float(prog.progress_percent),
                'time_spent_seconds': prog.time_spent_seconds,
                'score': float(prog.score) if prog.score else None,
                'prerequisites': prereq_status,
                'is_locked': len([p for p in prereq_status if not p['is_completed']]) > 0,
                'completed_at': prog.updated_at if prog.status == 'completed' else None
            })

        return Response({
            'enrollment': {
                'id': str(enrollment.id),
                'career_path': {
                    'id': str(enrollment.career_path.id),
                    'title': enrollment.career_path.title,
                    'slug': enrollment.career_path.slug,
                    'description': enrollment.career_path.description,
                    'industry': enrollment.career_path.industry
                },
                'status': enrollment.status,
                'progress_percent': float(enrollment.progress_percent),
                'started_at': enrollment.started_at
            },
            'statistics': {
                'total_modules': total_modules,
                'completed_modules': completed,
                'in_progress_modules': in_progress,
                'not_started_modules': not_started,
                'completion_rate': round((completed / total_modules * 100) if total_modules > 0 else 0, 1),
                'total_time_spent_hours': round(total_time / 3600, 1),
                'average_score': round(float(avg_score), 1)
            },
            'modules': modules_data
        })


class ProgressAnalyticsView(APIView):
    """Get detailed progress analytics for dashboard"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        # Skill development over time (monthly)
        monthly_progress = UserProgress.objects.filter(
            user=user, status='completed'
        ).annotate(month=TruncMonth('created_at')).values('month').annotate(
            count=Count('id')
        ).order_by('month')

        # Career paths progress
        career_paths_progress = []
        enrollments = UserEnrollment.objects.filter(user=user).select_related('career_path')
        for enrollment in enrollments:
            total = CareerPathModule.objects.filter(career_path=enrollment.career_path).count()
            completed = UserProgress.objects.filter(
                enrollment=enrollment, status='completed'
            ).count()
            career_paths_progress.append({
                'id': str(enrollment.career_path.id),
                'title': enrollment.career_path.title,
                'progress_percent': float(enrollment.progress_percent),
                'completed_modules': completed,
                'total_modules': total
            })

        return Response({
            'monthly_progress': list(monthly_progress),
            'career_paths_progress': career_paths_progress,
            'skill_distribution': self._get_skill_distribution(user),
            'skill_development_rate': self._calculate_skill_development_rate(user)
        })

    def _get_skill_distribution(self, user):
        skills = UserSkill.objects.filter(user=user).select_related('skill')
        return [
            {'name': us.skill.name, 'level': us.level, 'category': self._get_skill_category(us.skill.name)}
            for us in skills
        ]

    def _get_skill_category(self, skill_name):
        categories = {
            'Programming': ['python', 'java', 'javascript', 'c++', 'c#', 'go', 'rust'],
            'Web': ['react', 'angular', 'vue', 'html', 'css', 'django', 'flask'],
            'Data': ['sql', 'mongodb', 'data', 'analytics', 'pandas', 'numpy'],
            'Cloud': ['aws', 'azure', 'gcp', 'docker', 'kubernetes']
        }
        name_lower = skill_name.lower()
        for cat, keywords in categories.items():
            if any(kw in name_lower for kw in keywords):
                return cat
        return 'Other'

    def _calculate_skill_development_rate(self, user):
        """Calculate skill development rate over time"""
        # Get skill additions over last 6 months
        six_months_ago = timezone.now() - timedelta(days=180)
        monthly_skill_growth = []

        for i in range(6, 0, -1):
            month_start = timezone.now() - timedelta(days=30 * i)
            month_end = timezone.now() - timedelta(days=30 * (i - 1))
            count = UserSkill.objects.filter(
                user=user, created_at__gte=month_start, created_at__lte=month_end
            ).count()
            monthly_skill_growth.append({
                'month': month_start.strftime('%B'),
                'new_skills': count
            })

        return monthly_skill_growth