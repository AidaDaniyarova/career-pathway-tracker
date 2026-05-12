from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from .models import CareerPath, LearningModule, CareerPathModule
from .serializers import (
    CareerPathSerializer, CareerPathListSerializer, CareerPathDetailSerializer,
    LearningModuleSerializer, LearningModuleSimpleSerializer,
    CareerPathModuleSerializer
)
from progress.models import UserEnrollment, UserProgress
from progress.serializers import UserEnrollmentSerializer
from skills.models import UserSkill


class CareerPathViewSet(viewsets.ModelViewSet):
    """ViewSet for managing career paths"""
    serializer_class = CareerPathSerializer
    lookup_field = 'id'
    lookup_value_regex = '[0-9a-f-]+'

    def get_queryset(self):
        """Filter career paths based on query parameters"""
        queryset = CareerPath.objects.all()

        # Filter by industry
        industry = self.request.query_params.get('industry')
        if industry:
            queryset = queryset.filter(industry__icontains=industry)

        # Filter by search term
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )

        # Annotate with counts
        queryset = queryset.annotate(
            modules_count=Count('modules', distinct=True),
            enrollment_count=Count('enrollments', distinct=True)
        )

        return queryset

    def get_serializer_class(self):
        """Use appropriate serializer based on action"""
        if self.action == 'retrieve':
            return CareerPathDetailSerializer
        elif self.action == 'list':
            return CareerPathListSerializer
        return CareerPathSerializer

    def get_permissions(self):
        """
        - Anyone can view (GET, HEAD, OPTIONS) - AllowAny
        - Only authenticated users can enroll, edit_modules, get_selected_modules - IsAuthenticated
        - Only admins can create/update/delete - IsAdminUser
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [permissions.IsAdminUser]
        elif self.action in ['enroll', 'edit_modules', 'get_selected_modules']:
            self.permission_classes = [permissions.IsAuthenticated]
        else:
            # List and retrieve - allow anyone (no authentication required)
            self.permission_classes = [permissions.AllowAny]
        return super().get_permissions()

    def list(self, request, *args, **kwargs):
        """List career paths - public access"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        """Get career path details - public access with optional user progress"""
        instance = self.get_object()

        # Check if user is authenticated (handle case when request.user is None)
        user = request.user
        is_authenticated = user is not None and user.is_authenticated

        # Get user enrollment info if authenticated
        is_enrolled = False
        enrollment_status = None
        enrollment_progress = 0
        enrollment_id = None
        user_modules_selected = set()

        if is_authenticated:
            enrollment = UserEnrollment.objects.filter(
                user=user,
                career_path=instance
            ).first()

            if enrollment:
                is_enrolled = True
                enrollment_status = enrollment.status
                enrollment_progress = float(enrollment.progress_percent)
                enrollment_id = enrollment.id

                # Get user's selected modules for this enrollment
                user_modules = UserProgress.objects.filter(
                    enrollment=enrollment
                ).values_list('module_id', flat=True)
                user_modules_selected = set(str(mid) for mid in user_modules)

        # Serialize with user-specific data
        serializer = self.get_serializer(instance)
        data = serializer.data

        # Add enrollment info (only if authenticated, otherwise false)
        data['is_enrolled'] = is_enrolled if is_authenticated else False
        data['enrollment_status'] = enrollment_status if is_authenticated else None
        data['enrollment_progress'] = enrollment_progress if is_authenticated else 0
        data['enrollment_id'] = str(enrollment_id) if enrollment_id and is_authenticated else None

        # Add user selection status to modules (only if authenticated)
        for module_data in data.get('modules', []):
            module_id = module_data.get('module', {}).get('id')
            if module_id:
                if is_authenticated and str(module_id) in user_modules_selected:
                    module_data['is_selected'] = True
                    # Get user progress for this module
                    progress = UserProgress.objects.filter(
                        user=user,
                        module_id=module_id,
                        enrollment_id=enrollment_id
                    ).first()
                    if progress:
                        module_data['is_completed'] = progress.status == 'completed'
                        module_data['progress_percent'] = float(progress.progress_percent)
                    else:
                        module_data['is_completed'] = False
                        module_data['progress_percent'] = 0
                else:
                    module_data['is_selected'] = False
                    module_data['is_completed'] = False
                    module_data['progress_percent'] = 0

        return Response(data)

    @action(detail=True, methods=['post'], url_path='enroll')
    def enroll(self, request, id=None):
        """Enroll current user in this career path - Requires Authentication"""
        career_path = self.get_object()
        user = request.user

        if not user or not user.is_authenticated:
            return Response(
                {'error': 'Authentication required to enroll'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Check if already enrolled
        enrollment = UserEnrollment.objects.filter(
            user=user,
            career_path=career_path
        ).first()

        if enrollment:
            return Response({
                'message': 'Already enrolled',
                'enrollment_id': str(enrollment.id),
                'status': enrollment.status,
                'progress_percent': float(enrollment.progress_percent)
            })

        # Create new enrollment
        enrollment = UserEnrollment.objects.create(
            user=user,
            career_path=career_path,
            status='enrolled',
            progress_percent=0
        )

        # By default, select all required modules
        all_modules = CareerPathModule.objects.filter(
            career_path=career_path
        ).select_related('module')

        for cp_module in all_modules:
            UserProgress.objects.create(
                user=user,
                module=cp_module.module,
                enrollment=enrollment,
                status='not_started',
                progress_percent=0,
                time_spent_seconds=0
            )

        serializer = UserEnrollmentSerializer(enrollment)
        return Response({
            'message': 'Successfully enrolled',
            'enrollment': serializer.data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='modules')
    def get_modules(self, request, id=None):
        career_path = self.get_object()
        modules = CareerPathModule.objects.filter(
            career_path=career_path
        ).select_related('module').order_by('order_index')

        user = request.user
        is_authenticated = user is not None and user.is_authenticated

        result = []
        for cp_module in modules:
            module_data = {
                'id': str(cp_module.module.id),
                'title': cp_module.module.title,
                'description': cp_module.module.description,
                'content_type': cp_module.module.content_type,
                'duration_minutes': cp_module.module.duration_minutes,
                'difficulty': cp_module.module.difficulty,
                'xp_points': cp_module.module.xp_points,
                'is_required': cp_module.module.is_required,
                'is_selected': False,
                'is_completed': False,
                'progress_percent': 0
            }

            if is_authenticated:
                enrollment = UserEnrollment.objects.filter(
                    user=user,
                    career_path=career_path
                ).first()
                if enrollment:
                    progress = UserProgress.objects.filter(
                        user=user,
                        module=cp_module.module,
                        enrollment=enrollment
                    ).first()
                    if progress:
                        module_data['is_selected'] = True
                        module_data['is_completed'] = progress.status == 'completed'
                        module_data['progress_percent'] = float(progress.progress_percent)

            result.append(module_data)

        return Response(result)

    @action(detail=True, methods=['post'], url_path='add-module')
    def add_module(self, request, id=None):
        """Add a module to the user's enrollment"""

        career_path = self.get_object()
        user = request.user

        if not user or not user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        module_id = request.data.get('module_id')

        if not module_id:
            return Response(
                {'error': 'module_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get enrollment
        enrollment = UserEnrollment.objects.filter(
            user=user,
            career_path=career_path
        ).first()

        if not enrollment:
            return Response(
                {'error': 'You are not enrolled in this career path'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get module
        try:
            module = LearningModule.objects.get(id=module_id)
        except LearningModule.DoesNotExist:
            return Response(
                {'error': 'Module not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify module belongs to this career path
        if not CareerPathModule.objects.filter(
                career_path=career_path,
                module=module
        ).exists():
            return Response(
                {'error': 'Module does not belong to this career path'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Add module
        progress, created = UserProgress.objects.get_or_create(
            user=user,
            module=module,
            enrollment=enrollment,
            defaults={
                'status': 'not_started',
                'progress_percent': 0,
                'time_spent_seconds': 0
            }
        )

        # Update enrollment progress
        enrollment.update_progress()

        if created:
            return Response({
                'message': 'Module added successfully',
                'module_id': str(module.id),
                'module_title': module.title
            })

        return Response({
            'message': 'Module already exists in your learning path',
            'module_id': str(module.id),
            'module_title': module.title
        })

    @action(detail=True, methods=['post'], url_path='edit-modules')
    def edit_modules(self, request, id=None):
        """Edit selected modules for the user's enrollment (add/remove courses)"""
        career_path = self.get_object()
        user = request.user
        selected_module_ids = request.data.get('selected_modules', [])

        if not user or not user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Get user's enrollment
        enrollment = UserEnrollment.objects.filter(
            user=user,
            career_path=career_path
        ).first()

        if not enrollment:
            return Response(
                {'error': 'You are not enrolled in this career path'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get all modules in this career path
        all_modules = CareerPathModule.objects.filter(
            career_path=career_path
        ).values_list('module_id', flat=True)

        # Convert selected IDs to strings for comparison
        selected_set = set(str(mid) for mid in selected_module_ids)

        # Track changes
        removed_count = 0
        added_count = 0

        # Remove modules not selected by user (skip required modules)
        for module_id in all_modules:
            module_id_str = str(module_id)
            if module_id_str not in selected_set:
                # Don't remove required modules
                try:
                    module = LearningModule.objects.get(id=module_id)
                    if not module.is_required:
                        deleted, _ = UserProgress.objects.filter(
                            user=user,
                            module_id=module_id,
                            enrollment=enrollment
                        ).delete()
                        if deleted:
                            removed_count += 1
                except LearningModule.DoesNotExist:
                    pass

        # Add newly selected modules
        for module_id in selected_set:
            # Check if module exists and is part of this career path
            try:
                module = LearningModule.objects.get(id=module_id)
                # Verify module belongs to this career path
                if CareerPathModule.objects.filter(career_path=career_path, module=module).exists():
                    obj, created = UserProgress.objects.get_or_create(
                        user=user,
                        module=module,
                        enrollment=enrollment,
                        defaults={
                            'status': 'not_started',
                            'progress_percent': 0,
                            'time_spent_seconds': 0
                        }
                    )
                    if created:
                        added_count += 1
            except LearningModule.DoesNotExist:
                pass

        # Update enrollment progress
        enrollment.update_progress()

        return Response({
            'message': 'Learning path updated successfully',
            'enrollment_id': str(enrollment.id),
            'progress_percent': float(enrollment.progress_percent),
            'status': enrollment.status,
            'removed_count': removed_count,
            'added_count': added_count,
            'selected_modules_count': len(selected_set)
        })

    @action(detail=True, methods=['get'], url_path='available-modules')
    def available_modules(self, request, id=None):
        """Get modules not yet added to user's enrollment"""
        career_path = self.get_object()
        enrollment_id = request.query_params.get('enrollment_id')

        if not enrollment_id:
            return Response({'error': 'enrollment_id is required'}, status=400)

        # Get user's existing modules (already added)
        existing_module_ids = set()
        if enrollment_id and request.user.is_authenticated:
            existing = UserProgress.objects.filter(
                enrollment_id=enrollment_id
            ).values_list('module_id', flat=True)
            existing_module_ids = set(str(mid) for mid in existing)

        # Also exclude completed modules? (Optional - decide if completed modules should be re-addable)
        # For now, we exclude completed modules as well
        completed_module_ids = set()
        if enrollment_id and request.user.is_authenticated:
            completed = UserProgress.objects.filter(
                enrollment_id=enrollment_id,
                status='completed'
            ).values_list('module_id', flat=True)
            completed_module_ids = set(str(mid) for mid in completed)

        # Get all modules in this career path
        all_modules = CareerPathModule.objects.filter(
            career_path=career_path
        ).select_related('module').order_by('order_index')

        # Get search and filters from query params
        search = request.query_params.get('search', '').lower()
        content_type = request.query_params.get('content_type', '')
        difficulty = request.query_params.get('difficulty', '')

        result = []
        for cp_module in all_modules:
            module = cp_module.module
            module_id_str = str(module.id)

            # Skip already added modules AND completed modules
            if module_id_str in existing_module_ids or module_id_str in completed_module_ids:
                continue

            # Apply search filter
            if search and search not in module.title.lower() and search not in (module.description or '').lower():
                continue

            # Apply content type filter
            if content_type and content_type != (module.content_type or ''):
                continue

            # Apply difficulty filter
            if difficulty and difficulty != (module.difficulty or ''):
                continue

            result.append({
                'id': module_id_str,
                'title': module.title,
                'description': module.description,
                'content_type': module.content_type,
                'duration_minutes': module.duration_minutes,
                'difficulty': module.difficulty,
                'xp_points': module.xp_points,
                'is_required': module.is_required,
                'order_index': cp_module.order_index
            })

        return Response(result)

    @action(detail=True, methods=['get'], url_path='selected-modules')
    def get_selected_modules(self, request, id=None):
        """Get user's selected modules for this career path - Requires Authentication"""
        career_path = self.get_object()
        user = request.user

        if not user or not user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        enrollment = UserEnrollment.objects.filter(
            user=user,
            career_path=career_path
        ).first()

        if not enrollment:
            return Response({
                'selected_modules': [],
                'message': 'Not enrolled'
            })

        user_modules = UserProgress.objects.filter(
            enrollment=enrollment
        ).select_related('module')

        result = []
        for progress in user_modules:
            result.append({
                'id': str(progress.module.id),
                'title': progress.module.title,
                'status': progress.status,
                'progress_percent': float(progress.progress_percent),
                'is_completed': progress.status == 'completed'
            })

        return Response({
            'enrollment_id': str(enrollment.id),
            'selected_modules': result,
            'total_selected': len(result),
            'completed_count': sum(1 for m in result if m['is_completed'])
        })

    @action(detail=False, methods=['get'], url_path='industries')
    def list_industries(self, request):
        """Get list of all industries - Public access"""
        industries = CareerPath.objects.exclude(
            industry__isnull=True
        ).exclude(
            industry=''
        ).values_list('industry', flat=True).distinct()

        return Response(list(industries))

    @action(detail=False, methods=['get'], url_path='recommended')
    def recommended(self, request):
        """Get recommended career paths based on user's skills or popular paths"""
        user = request.user
        is_authenticated = user is not None and user.is_authenticated

        if is_authenticated:
            user_skills = UserSkill.objects.filter(user=user).values_list('skill_id', flat=True)

            if user_skills:
                queryset = CareerPath.objects.annotate(
                    matching_skills=Count(
                        'required_skills',
                        filter=Q(required_skills__skill_id__in=user_skills)
                    ),
                    total_skills=Count('required_skills')
                ).filter(
                    total_skills__gt=0
                ).order_by('-matching_skills')[:10]
            else:
                queryset = CareerPath.objects.annotate(
                    enrollment_count=Count('enrollments')
                ).order_by('-enrollment_count')[:10]
        else:
            # For non-authenticated users, return popular paths
            queryset = CareerPath.objects.annotate(
                enrollment_count=Count('enrollments')
            ).order_by('-enrollment_count')[:10]

        serializer = CareerPathListSerializer(queryset, many=True)
        return Response(serializer.data)


class LearningModuleViewSet(viewsets.ModelViewSet):
    """ViewSet for managing learning modules"""
    serializer_class = LearningModuleSerializer
    lookup_field = 'id'
    lookup_value_regex = '[0-9a-f-]+'

    @action(detail=True, methods=['get'], url_path='modules')
    def get_modules(self, request, id=None):
        """Get all modules for a specific career path (for enrolled users)"""
        career_path = self.get_object()
        modules = CareerPathModule.objects.filter(
            career_path=career_path
        ).select_related('module').order_by('order_index')

        user = request.user
        is_authenticated = user is not None and user.is_authenticated

        result = []
        for cp_module in modules:
            module_data = {
                'id': str(cp_module.module.id),
                'title': cp_module.module.title,
                'description': cp_module.module.description,
                'content_type': cp_module.module.content_type,
                'duration_minutes': cp_module.module.duration_minutes,
                'difficulty': cp_module.module.difficulty,
                'xp_points': cp_module.module.xp_points,
                'is_required': cp_module.module.is_required,
                'order_index': cp_module.order_index,
                'is_selected': True,
                'is_completed': False,
                'progress_percent': 0
            }

            # Add user progress if authenticated and enrolled
            if is_authenticated:
                enrollment = UserEnrollment.objects.filter(
                    user=user,
                    career_path=career_path
                ).first()
                if enrollment:
                    progress = UserProgress.objects.filter(
                        user=user,
                        module=cp_module.module,
                        enrollment=enrollment
                    ).first()
                    if progress:
                        module_data['is_completed'] = progress.status == 'completed'
                        module_data['progress_percent'] = float(progress.progress_percent)
                        module_data['is_selected'] = True
                    else:
                        module_data['is_selected'] = False

            result.append(module_data)

        return Response(result)

    def get_queryset(self):
        """Filter modules based on query parameters"""
        queryset = LearningModule.objects.all()

        # Filter by content type
        content_type = self.request.query_params.get('content_type')
        if content_type:
            queryset = queryset.filter(content_type=content_type)

        # Filter by difficulty
        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)

        # Filter by required
        is_required = self.request.query_params.get('is_required')
        if is_required is not None:
            queryset = queryset.filter(is_required=is_required.lower() == 'true')

        # Search by title
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)

        return queryset

    def get_permissions(self):
        """Allow write operations only for staff, view for anyone"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [permissions.IsAdminUser]
        else:
            # List and retrieve - allow anyone
            self.permission_classes = [permissions.AllowAny]
        return super().get_permissions()

    def retrieve(self, request, *args, **kwargs):
        """Get module details - public access"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data

        # Add user-specific progress if authenticated
        user = request.user
        is_authenticated = user is not None and user.is_authenticated

        if is_authenticated:
            progress = UserProgress.objects.filter(
                user=user,
                module=instance
            ).first()

            if progress:
                data['user_status'] = progress.status
                data['user_progress_percent'] = float(progress.progress_percent)
                data['user_time_spent'] = progress.time_spent_seconds
            else:
                data['user_status'] = 'not_started'
                data['user_progress_percent'] = 0
                data['user_time_spent'] = 0
        else:
            data['user_status'] = None
            data['user_progress_percent'] = 0
            data['user_time_spent'] = 0

        return Response(data)