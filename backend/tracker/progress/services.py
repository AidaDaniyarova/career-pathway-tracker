from django.db.models import Sum, Q
from progress.models import UserEnrollment, UserProgress
from learning.models import CareerPathModule
from ai.models import Recommendation


class ProgressService:
    @staticmethod
    def recalculate_enrollment(enrollment):
        """
        DYNAMIC SOURCE OF TRUTH:
        - TOTAL modules = Count of UserProgress records tied to this enrollment
        - COMPLETED = Count of those records marked 'completed'
        """
        total_modules = UserProgress.objects.filter(enrollment=enrollment).count()

        completed_modules = UserProgress.objects.filter(
            enrollment=enrollment,
            status="completed"
        ).count()

        if total_modules == 0:
            enrollment.progress_percent = 0
            enrollment.status = "enrolled"
            enrollment.save(update_fields=["progress_percent", "status"])
            return

        progress_percent = (completed_modules / total_modules) * 100

        if completed_modules == total_modules:
            enrollment.status = "completed"
            progress_percent = 100
        elif completed_modules > 0:
            enrollment.status = "in_progress"
        else:
            enrollment.status = "enrolled"

        enrollment.progress_percent = round(progress_percent, 2)
        enrollment.save(update_fields=["progress_percent", "status"])

    @staticmethod
    def update_enrollment_progress(user, enrollment_id):
        enrollment = UserEnrollment.objects.filter(
            id=enrollment_id,
            user=user
        ).first()

        if enrollment:
            ProgressService.recalculate_enrollment(enrollment)

    @staticmethod
    def is_module_completed_globally(user, module):
        return UserProgress.objects.filter(
            user=user,
            module=module,
            status="completed"
        ).exists()

    @staticmethod
    def recalculate_all_user_enrollments(user):
        """Recalculate progress for all user enrollments"""
        enrollments = UserEnrollment.objects.filter(user=user)
        for enrollment in enrollments:
            ProgressService.recalculate_enrollment(enrollment)

    @staticmethod
    def enroll_user(user, career_path_id):
        """Enroll user in a career path and create progress records for ALL modules"""
        enrollment, created = UserEnrollment.objects.get_or_create(
            user=user,
            career_path_id=career_path_id,
            defaults={'status': 'enrolled', 'progress_percent': 0}
        )

        if created:
            # Create progress records for ALL modules in this path
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
        """Update progress for a specific module and recalculate enrollment progress"""
        progress, created = UserProgress.objects.update_or_create(
            user=user,
            module_id=module_id,
            enrollment_id=enrollment_id,
            defaults=progress_data
        )

        # Update overall enrollment progress
        if enrollment_id:
            ProgressService.update_enrollment_progress(user, enrollment_id)

        return progress

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