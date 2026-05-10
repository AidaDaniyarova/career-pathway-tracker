from django.db.models import Count

from learning.models import CareerPath, CareerPathModule, LearningModule, Prerequisite
from progress.models import UserProgress


class CareerPathService:
    """Career path business logic"""

    @staticmethod
    def get_all_paths(filters=None):
        queryset = CareerPath.objects.annotate(
            enrollment_count=Count('enrollments'),
            module_count=Count('modules')
        )
        if filters:
            if filters.get('industry'):
                queryset = queryset.filter(industry__icontains=filters['industry'])
            if filters.get('search'):
                queryset = queryset.filter(
                    Q(title__icontains=filters['search']) |
                    Q(description__icontains=filters['search'])
                )
        return queryset

    @staticmethod
    def get_path_detail(path_id):
        return CareerPath.objects.prefetch_related(
            'modules__module',
            'required_skills__skill'
        ).get(id=path_id)

    @staticmethod
    def get_path_modules(path_id):
        return CareerPathModule.objects.filter(
            career_path_id=path_id
        ).select_related('module').order_by('order_index')


class LearningModuleService:
    """Learning module business logic"""

    @staticmethod
    def get_module_with_prerequisites(module_id):
        module = LearningModule.objects.get(id=module_id)
        prerequisites = Prerequisite.objects.filter(
            module=module
        ).select_related('prerequisite')
        return module, prerequisites

    @staticmethod
    def check_prerequisites_completed(user, module):
        """Check if user has completed all prerequisites for a module"""
        prerequisites = Prerequisite.objects.filter(module=module)
        for prereq in prerequisites:
            try:
                progress = UserProgress.objects.get(user=user, module=prereq.prerequisite)
                if progress.status != 'completed':
                    return False, prereq.prerequisite.title
            except UserProgress.DoesNotExist:
                return False, prereq.prerequisite.title
        return True, None