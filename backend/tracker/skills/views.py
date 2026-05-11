from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from skills.models import Skill, UserSkill
from skills.serializers import SkillSerializer, UserSkillSerializer
from users.services import UserService


class SkillViewSet(viewsets.ReadOnlyModelViewSet):
    """Skills management"""
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['name']

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search skills by name"""
        query = request.query_params.get('q', '')
        if query:
            skills = Skill.objects.filter(name__icontains=query)[:20]
            serializer = self.get_serializer(skills, many=True)
            return Response(serializer.data)
        return Response([])


class UserSkillViewSet(viewsets.ModelViewSet):
    """User skills management"""
    serializer_class = UserSkillSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserSkill.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='with-details')
    def with_details(self, request):
        """Get user skills with full skill details"""
        skills = UserSkill.objects.filter(user=request.user).select_related('skill')
        data = []
        for us in skills:
            data.append({
                'id': str(us.id),
                'skill_id': str(us.skill.id),
                'skill_name': us.skill.name,
                'level': us.level,
                'created_at': us.created_at
            })
        return Response(data)

    @action(detail=False, methods=['put'], url_path='bulk')
    def bulk_update(self, request):
        """Bulk update user skills"""
        skills_data = request.data.get('skills', [])
        UserService.update_user_skills(request.user, skills_data)

        # Return updated skills
        updated_skills = UserSkill.objects.filter(user=request.user).select_related('skill')
        serializer = UserSkillSerializer(updated_skills, many=True)
        return Response({
            'message': 'Skills updated successfully',
            'skills': serializer.data
        })

    @action(detail=False, methods=['delete'], url_path='clear')
    def clear_all(self, request):
        """Clear all user skills"""
        UserSkill.objects.filter(user=request.user).delete()
        return Response({'message': 'All skills cleared'})