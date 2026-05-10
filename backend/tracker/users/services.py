from skills.models import UserSkill
from users.models import User
from django.db import transaction


class UserService:
    """User-related business logic"""

    @staticmethod
    def get_user_profile(user_id):
        try:
            return User.objects.prefetch_related('skills__skill', 'enrollments__career_path').get(id=user_id)
        except User.DoesNotExist:
            return None

    @staticmethod
    def update_user_skills(user, skills_data):
        """Bulk update user skills"""
        with transaction.atomic():
            # Remove existing skills not in the new list
            new_skill_ids = [s.get('skill_id') for s in skills_data if s.get('skill_id')]
            UserSkill.objects.filter(user=user).exclude(skill_id__in=new_skill_ids).delete()

            # Update or create skills
            for skill_data in skills_data:
                UserSkill.objects.update_or_create(
                    user=user,
                    skill_id=skill_data['skill_id'],
                    defaults={'level': skill_data.get('level', 1)}
                )
        return UserSkill.objects.filter(user=user)

    @staticmethod
    def get_user_skills_with_details(user):
        """Get user skills with skill details"""
        return UserSkill.objects.filter(user=user).select_related('skill')