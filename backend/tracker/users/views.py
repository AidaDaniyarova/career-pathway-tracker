from datetime import timedelta
from django.db.models import Sum, Avg
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from users.models import User
from .serializers import (UserSerializer, UserDetailSerializer, ChangePasswordSerializer,
                          UserProfileUpdateSerializer, UserProfileSerializer,
                          UserAvatarSerializer, UserRegisterSerializer)
from progress.models import UserEnrollment, UserProgress
from skills.models import UserSkill
from ai.models import Recommendation
from cv.models import CV
from quizzes.models import QuizResponse


class UserViewSet(viewsets.ModelViewSet):
    """User management viewset"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=['get', 'put', 'patch'], url_path='me')
    def me(self, request):
        """Get or update current user profile"""
        if request.method == 'GET':
            serializer = UserDetailSerializer(request.user)
            return Response(serializer.data)
        else:
            serializer = UserSerializer(request.user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterView(generics.CreateAPIView):
    """User registration with JWT token response"""
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserRegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()
        refresh = RefreshToken.for_user(user)

        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': str(user.id),
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """JWT Login View - returns access and refresh tokens using email"""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({
                'error': 'Email and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Authenticate using email
        user = authenticate(request=request, username=email, password=password)

        if user is not None:
            if not user.is_active:
                return Response({
                    'error': 'This account is disabled'
                }, status=status.HTTP_403_FORBIDDEN)

            refresh = RefreshToken.for_user(user)

            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_staff': user.is_staff,
                    'is_active': user.is_active,
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Invalid credentials',
                'detail': 'Unable to log in with provided credentials.'
            }, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    """User logout - blacklist the refresh token"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(generics.UpdateAPIView):
    """Change user password"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'old_password': 'Wrong password'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({'message': 'Password changed successfully'})


class ProfileView(generics.RetrieveUpdateAPIView):
    """Get/Update User Profile"""
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserProfileUpdateSerializer
        return UserProfileSerializer

    def retrieve(self, request, *args, **kwargs):
        """Get user profile with additional stats"""
        user = self.get_object()

        # Get user stats
        stats = self._get_user_stats(user)

        # Get user skills
        skills = UserSkill.objects.filter(user=user).select_related('skill')

        # Get recent enrollments
        recent_enrollments = UserEnrollment.objects.filter(
            user=user
        ).select_related('career_path').order_by('-started_at')[:3]

        # Get recommendations
        recommendations = Recommendation.objects.filter(
            user=user
        ).select_related('career_path').order_by('-score')[:3]

        serializer = self.get_serializer(user)
        data = serializer.data
        data['stats'] = stats
        data['skills'] = [
            {
                'id': str(us.skill.id),
                'name': us.skill.name,
                'level': us.level
            }
            for us in skills
        ]
        data['recent_enrollments'] = [
            {
                'id': str(e.id),
                'career_path_id': str(e.career_path.id),
                'title': e.career_path.title,
                'slug': e.career_path.slug,
                'status': e.status,
                'progress': float(e.progress_percent)
            }
            for e in recent_enrollments
        ]
        data['recommendations'] = [
            {
                'career_path_id': str(r.career_path.id),
                'title': r.career_path.title,
                'slug': r.career_path.slug,
                'score': float(r.score)
            }
            for r in recommendations
        ]

        return Response(data)

    def _get_user_stats(self, user):
        """Calculate user statistics"""
        total_enrollments = UserEnrollment.objects.filter(user=user).count()
        completed_paths = UserEnrollment.objects.filter(
            user=user,
            status='completed'
        ).count()
        completed_modules = UserProgress.objects.filter(
            user=user,
            status='completed'
        ).count()
        total_modules_started = UserProgress.objects.filter(
            user=user
        ).exclude(status='not_started').count()
        total_xp = user.total_xp
        quiz_attempts = QuizResponse.objects.filter(user=user)
        avg_quiz_score = quiz_attempts.aggregate(Avg('score'))['score__avg'] or 0
        total_quizzes = quiz_attempts.count()
        cv_count = CV.objects.filter(user=user).count()
        skill_count = UserSkill.objects.filter(user=user).count()
        avg_skill_level = UserSkill.objects.filter(user=user).aggregate(
            avg=Avg('level')
        )['avg'] or 0
        total_time_spent = UserProgress.objects.filter(
            user=user
        ).aggregate(total=Sum('time_spent_seconds'))['total'] or 0
        total_hours = total_time_spent // 3600
        total_minutes = (total_time_spent % 3600) // 60
        current_streak = self._calculate_streak(user)

        return {
            'enrollments': {
                'total': total_enrollments,
                'completed': completed_paths,
                'completion_rate': round((completed_paths / total_enrollments * 100) if total_enrollments > 0 else 0, 1)
            },
            'modules': {
                'completed': completed_modules,
                'started': total_modules_started,
                'completion_rate': round(
                    (completed_modules / total_modules_started * 100) if total_modules_started > 0 else 0, 1)
            },
            'xp': {
                'total': total_xp,
                'level': (total_xp // 100) + 1,
                'next_level_xp': ((total_xp // 100) + 1) * 100 - total_xp
            },
            'quizzes': {
                'taken': total_quizzes,
                'average_score': round(float(avg_quiz_score), 1) if avg_quiz_score else 0
            },
            'skills': {
                'total': skill_count,
                'average_level': round(float(avg_skill_level), 1) if avg_skill_level else 0
            },
            'cvs': {
                'total': cv_count
            },
            'time_spent': {
                'seconds': total_time_spent,
                'minutes': total_minutes,
                'hours': total_hours,
                'display': f"{total_hours}h {total_minutes}m" if total_hours > 0 else f"{total_minutes}m"
            },
            'streak': {
                'current': current_streak,
                'longest': self._get_longest_streak(user)
            }
        }

    def _calculate_streak(self, user):
        """Calculate current daily activity streak"""
        completed_exists = UserProgress.objects.filter(
            user=user,
            status='completed'
        ).exists()
        if completed_exists:
            return 1
        return 0

    def _get_longest_streak(self, user):
        """Calculate longest streak ever"""
        completed_count = UserProgress.objects.filter(
            user=user,
            status='completed'
        ).count()
        if completed_count > 0:
            return min(completed_count, 30)
        return 0


class ProfileAvatarView(generics.UpdateAPIView):
    """View for updating profile picture"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserAvatarSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'message': 'Profile picture updated successfully',
            'profile_picture': user.profile_picture
        })


class ProfileStatsView(generics.GenericAPIView):
    """View for getting user statistics only"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        skills = UserSkill.objects.filter(user=user).select_related('skill')

        monthly_progress = []
        for i in range(5, -1, -1):
            month_date = timezone.now().date() - timedelta(days=30 * i)
            month_start = month_date.replace(day=1)
            if i == 0:
                month_end = timezone.now().date()
            else:
                next_month = month_date.replace(day=28) + timedelta(days=4)
                month_end = next_month - timedelta(days=next_month.day)
            completions = UserProgress.objects.filter(
                user=user,
                status='completed',
                created_at__date__gte=month_start,
                created_at__date__lte=month_end
            ).count()
            monthly_progress.append({
                'month': month_start.strftime('%B %Y'),
                'completions': completions
            })

        skill_distribution = {
            'beginner': skills.filter(level__in=[1, 2]).count(),
            'intermediate': skills.filter(level__in=[3, 4]).count(),
            'advanced': skills.filter(level=5).count()
        }

        categories = {}
        for us in skills:
            skill_name = us.skill.name.lower()
            if 'python' in skill_name or 'java' in skill_name or 'javascript' in skill_name:
                cat = 'Programming'
            elif 'data' in skill_name or 'analytics' in skill_name or 'sql' in skill_name:
                cat = 'Data Science'
            elif 'design' in skill_name or 'ux' in skill_name or 'ui' in skill_name:
                cat = 'Design'
            elif 'management' in skill_name or 'leadership' in skill_name:
                cat = 'Management'
            else:
                cat = 'Other'
            categories[cat] = categories.get(cat, 0) + us.level

        return Response({
            'skill_distribution': skill_distribution,
            'skill_categories': categories,
            'monthly_progress': monthly_progress,
            'total_skills': skills.count(),
            'average_skill_level': round(skills.aggregate(avg=Avg('level'))['avg'] or 0, 1)
        })


class PublicProfileView(generics.RetrieveAPIView):
    """View for public user profiles (read-only)"""
    permission_classes = [permissions.AllowAny]
    serializer_class = UserProfileSerializer
    lookup_field = 'username'
    lookup_url_kwarg = 'username'

    def get_queryset(self):
        return User.objects.filter(is_active=True)

    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        completed_paths = UserEnrollment.objects.filter(
            user=user,
            status='completed'
        ).select_related('career_path')
        public_skills = UserSkill.objects.filter(
            user=user
        ).select_related('skill')[:10]
        total_xp = user.total_xp
        serializer = self.get_serializer(user)
        data = serializer.data
        data['completed_paths'] = [
            {'title': cp.career_path.title, 'slug': cp.career_path.slug, 'completed_at': cp.started_at}
            for cp in completed_paths
        ]
        data['public_skills'] = [
            {'name': us.skill.name, 'level': us.level}
            for us in public_skills
        ]
        data['total_xp'] = total_xp
        data['member_since'] = user.created_at
        return Response(data)


class ProfileManagementView(generics.RetrieveUpdateAPIView):
    """Simplified profile endpoint for the profile management page"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserProfileUpdateSerializer

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = UserProfileUpdateSerializer(user)
        data = serializer.data
        # Add email separately since it's read-only in the update serializer
        data['email'] = user.email

        # Add skills
        skills = UserSkill.objects.filter(user=user).select_related('skill')
        data['skills'] = [
            {
                'id': str(us.skill.id),
                'name': us.skill.name,
                'level': us.level
            }
            for us in skills
        ]

        return Response(data)