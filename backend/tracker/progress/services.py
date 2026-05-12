from ai.models import Recommendation
from learning.models import CareerPathModule
from progress.models import UserEnrollment, UserProgress


class ProgressService:
    """User progress business logic"""

    @staticmethod
    def enroll_user(user, career_path_id):
        """Enroll user in a career path"""
        enrollment, created = UserEnrollment.objects.get_or_create(
            user=user,
            career_path_id=career_path_id,
            defaults={'status': 'enrolled', 'progress_percent': 0}
        )

        if created:
            # Create progress records for all modules in this path
            modules = CareerPathModule.objects.filter(
                career_path_id=career_path_id
            ).select_related('module')

            for cp_module in modules:
                UserProgress.objects.get_or_create(
                    user=user,
                    module=cp_module.module,
                    enrollment=enrollment,
                    defaults={'status': 'not_started', 'progress_percent': 0}
                )

        return enrollment

    @staticmethod
    def update_module_progress(user, module_id, enrollment_id, progress_data):
        """Update progress for a specific module"""
        progress, created = UserProgress.objects.update_or_create(
            user=user,
            module_id=module_id,
            enrollment_id=enrollment_id,
            defaults=progress_data
        )

        # Update overall enrollment progress
        if progress_data.get('status') == 'completed':
            ProgressService.update_enrollment_progress(user, enrollment_id)

        return progress

    @staticmethod
    def update_enrollment_progress(user, enrollment_id):
        """Calculate and update overall progress for an enrollment"""
        enrollment = UserEnrollment.objects.get(id=enrollment_id, user=user)

        # Get all modules in this career path
        total_modules = CareerPathModule.objects.filter(
            career_path=enrollment.career_path
        ).count()

        # Get completed modules
        completed_modules = UserProgress.objects.filter(
            user=user,
            enrollment=enrollment,
            status='completed'
        ).count()

        if total_modules > 0:
            progress = (completed_modules / total_modules) * 100
            enrollment.progress_percent = progress

            if progress == 100:
                enrollment.status = 'completed'

            enrollment.save()

        return enrollment

    @staticmethod
    def get_user_dashboard(user):
        """Get dashboard data for a user"""
        enrollments = UserEnrollment.objects.filter(
            user=user
        ).select_related('career_path')

        recent_progress = UserProgress.objects.filter(
            user=user
        ).select_related('module').order_by('-id')[:10]

        recommendations = Recommendation.objects.filter(
            user=user
        ).select_related('career_path').order_by('-score')

        return {
            'enrollments': enrollments,
            'recent_progress': recent_progress,
            'recommendations': recommendations,
            'total_xp': UserProgress.objects.filter(user=user).aggregate(
                total=Sum('module__xp_points', filter=Q(status='completed'))
            )['total'] or 0,
            'completed_modules': UserProgress.objects.filter(
                user=user, status='completed'
            ).count(),
        }