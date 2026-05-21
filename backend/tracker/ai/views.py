from typing import List

from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Recommendation, JobScan, InterviewAnswer
from .services import AIRecommendationService, PersonalizedRecommendationService
from .huggingface_service import huggingface_service
from cv.models import CV
from learning.models import CareerPath
from learning.models import LearningModule
from skills.models import UserSkill
from progress.models import UserEnrollment
from quizzes.models import QuizResponse


class CareerRecommendationsView(APIView):
    """Get AI-powered career recommendations"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        refresh = request.query_params.get('refresh', 'false').lower() == 'true'

        # First, try to get existing recommendations from database
        existing_recommendations = Recommendation.objects.filter(
            user=request.user
        ).select_related('career_path').order_by('-score')

        if existing_recommendations.exists() and not refresh:
            result = []
            for rec in existing_recommendations[:10]:
                if rec.career_path:
                    result.append({
                        'career_path': {
                            'id': str(rec.career_path.id),
                            'title': rec.career_path.title,
                            'slug': rec.career_path.slug,
                            'description': rec.career_path.description or '',
                            'industry': rec.career_path.industry or '',
                            'avg_salary_min': float(
                                rec.career_path.avg_salary_min) if rec.career_path.avg_salary_min else None,
                            'avg_salary_max': float(
                                rec.career_path.avg_salary_max) if rec.career_path.avg_salary_max else None,
                            'growth_outlook': rec.career_path.growth_outlook,
                        },
                        'match_score': float(rec.score) if rec.score else 0,
                        'score_breakdown': rec.recommendation_data.get('score_breakdown',
                                                                       {}) if rec.recommendation_data else {},
                        'skill_analysis': rec.recommendation_data.get('skill_analysis',
                                                                      {}) if rec.recommendation_data else {},
                        'recommended_modules': [],
                        'sources': rec.recommendation_data.get('sources',
                                                               {'quiz': True}) if rec.recommendation_data else {
                            'quiz': True},
                        'created_at': rec.created_at
                    })

            if result:
                return Response(result)

        # If no recommendations in DB, try to get from quiz results
        quiz_response = QuizResponse.objects.filter(user=request.user).order_by('-completed_at').first()

        if quiz_response and quiz_response.career_scores:
            result = []
            sorted_careers = sorted(quiz_response.career_scores.items(), key=lambda x: x[1], reverse=True)

            for career_id, score in sorted_careers[:5]:
                try:
                    career = CareerPath.objects.get(id=career_id)

                    # Store this recommendation in the database for future
                    Recommendation.objects.update_or_create(
                        user=request.user,
                        career_path=career,
                        defaults={
                            'score': float(score),
                            'recommendation_data': {
                                'source': 'quiz',
                                'career_scores': quiz_response.career_scores,
                                'match_score': float(score),
                                'generated_at': timezone.now().isoformat(),
                                'sources': {'quiz': True, 'cv': False, 'skills': False, 'progress': False}
                            }
                        }
                    )

                    result.append({
                        'career_path': {
                            'id': str(career.id),
                            'title': career.title,
                            'slug': career.slug,
                            'description': career.description or '',
                            'industry': career.industry or '',
                            'avg_salary_min': float(career.avg_salary_min) if career.avg_salary_min else None,
                            'avg_salary_max': float(career.avg_salary_max) if career.avg_salary_max else None,
                            'growth_outlook': career.growth_outlook,
                        },
                        'match_score': float(score),
                        'score_breakdown': {'quiz': float(score), 'skills': 0, 'progress': 0, 'cv': 0},
                        'skill_analysis': {
                            'matched_skills': [],
                            'missing_skills': [],
                            'total_required': 0,
                            'total_matched': 0,
                            'completion_percentage': 0
                        },
                        'recommended_modules': [],
                        'sources': {'quiz': True, 'cv': False, 'skills': False, 'progress': False},
                        'created_at': quiz_response.completed_at
                    })
                except CareerPath.DoesNotExist:
                    continue

            return Response(result)

        return Response([])

class RecommendationDetailView(APIView):
    """Get detailed recommendation for a specific career path"""
    permission_classes = [IsAuthenticated]

    def get(self, request, career_path_id):
        career = get_object_or_404(CareerPath, id=career_path_id)

        service = AIRecommendationService(request.user)

        # Find or create recommendation for this career
        rec = Recommendation.objects.filter(
            user=request.user,
            career_path=career
        ).first()

        if not rec:
            # Generate all recommendations to include this one
            service.generate_recommendations()
            rec = Recommendation.objects.filter(
                user=request.user,
                career_path=career
            ).first()

        if rec:
            details = service.get_recommendation_details(rec)
            return Response(details)

        return Response(
            {'error': 'Recommendation not found'},
            status=status.HTTP_404_NOT_FOUND
        )

class DashboardRecommendationsView(APIView):
    """Get personalized recommendations for dashboard"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = int(request.query_params.get('limit', 10))
        service = PersonalizedRecommendationService(request.user)
        recommendations = service.get_dashboard_recommendations(limit)

        # Return array directly
        return Response(recommendations)


class SkillGapAnalysisView(APIView):
    """Analyze skill gaps for a career path"""
    permission_classes = [IsAuthenticated]

    def get(self, request, career_path_id):
        career = get_object_or_404(CareerPath, id=career_path_id)

        # Get user's skills
        user_skills = set(UserSkill.objects.filter(user=request.user).values_list('skill__name', flat=True))

        # Get required skills for career
        required_skills = set(career.required_skills.values_list('skill__name', flat=True))

        # Calculate gap
        missing_skills = list(required_skills - user_skills)
        matched_skills = list(required_skills & user_skills)

        # Get recommended learning modules for missing skills
        recommended_modules = []

        if missing_skills:
            modules = LearningModule.objects.filter(
                skills_covered__name__in=missing_skills
            ).distinct()[:5]

            for module in modules:
                recommended_modules.append({
                    'id': str(module.id),
                    'title': module.title,
                    'description': module.description,
                    'duration_minutes': module.duration_minutes,
                    'xp_points': module.xp_points
                })

        return Response({
            'career_path': {
                'id': str(career.id),
                'title': career.title,
            },
            'skill_analysis': {
                'matched_skills': matched_skills[:20],
                'missing_skills': missing_skills[:20],
                'total_required': len(required_skills),
                'total_matched': len(matched_skills),
                'completion_rate': round((len(matched_skills) / len(required_skills)) * 100,
                                         2) if required_skills else 0
            },
            'recommended_modules': recommended_modules
        })


class JobMatchView(APIView):
    """Analyze CV against job description using AI"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        cv_id = request.data.get('cv_id')
        job_description = request.data.get('description') or request.data.get('job_description')
        job_title = request.data.get('job_title', '')
        company = request.data.get('company', '')

        if not cv_id:
            return Response(
                {'error': 'cv_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not job_description:
            return Response(
                {'error': 'job_description is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            cv = CV.objects.get(id=cv_id, user=request.user)
        except CV.DoesNotExist:
            return Response(
                {'error': 'CV not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Extract CV text
        cv_text = self._extract_cv_text(cv.content)

        # Extract skills from job description
        extracted_skills = huggingface_service.extract_skills_from_job(job_description)

        # Extract skills from CV text directly
        cv_skills = self._extract_skills_from_cv(cv_text)

        # Calculate match score based on text similarity
        match_result = huggingface_service.calculate_match_score(cv_text, job_description)

        # Find matching skills between job description and CV TEXT (not user's saved skills)
        cv_skills_lower = set(s.lower() for s in cv_skills)
        matched_skills = [s for s in extracted_skills if s.lower() in cv_skills_lower]
        missing_skills = [s for s in extracted_skills if s.lower() not in cv_skills_lower]

        # Also check user's saved skills as additional data
        user_saved_skills = set(UserSkill.objects.filter(user=request.user).values_list('skill__name', flat=True))
        user_saved_skills_lower = set(s.lower() for s in user_saved_skills)

        # Skills from CV that are also in user's profile
        profile_matched = [s for s in matched_skills if s.lower() in user_saved_skills_lower]
        profile_missing = [s for s in matched_skills if s.lower() not in user_saved_skills_lower]

        # Generate improvement recommendations
        recommendations = self._generate_recommendations(missing_skills, match_result['score'], profile_missing)

        # Save scan record
        job_scan = JobScan.objects.create(
            user=request.user,
            cv=cv,
            job_title=job_title or "Job Scan",
            company=company or "",
            job_description=job_description,
            match_score=match_result['score'],
            extracted_keywords=extracted_skills[:30],
            required_skills=extracted_skills[:20],
            missing_skills=missing_skills[:20],
            matched_skills=matched_skills[:20],
            recommendations=recommendations,
            model_version=f"keyword_matching_{match_result['method']}"
        )

        # Add additional info to response
        return Response({
            'scan_id': str(job_scan.id),
            'match_score': match_result['score'],
            'match_method': match_result['method'],
            'matched_skills': matched_skills[:15],
            'missing_skills': missing_skills[:15],
            'extracted_skills': extracted_skills[:20],
            'cv_skills': cv_skills[:20],  # Skills found in CV
            'profile_matched_skills': profile_matched[:10],  # Skills in both CV and user profile
            'profile_missing_skills': profile_missing[:10],  # Skills in CV but not in profile
            'recommendations': recommendations,
            'cv_id': str(cv.id),
            'cv_title': cv.title,
            'job_title': job_title,
            'company': company,
            'created_at': job_scan.created_at
        })

    def _extract_cv_text(self, cv_content):
        """Extract text from CV content"""
        text_parts = []

        if isinstance(cv_content, str):
            return cv_content.lower()

        if isinstance(cv_content, dict):
            # Personal info
            if 'personal_info' in cv_content:
                for key, value in cv_content['personal_info'].items():
                    if isinstance(value, str):
                        text_parts.append(value)

            # Summary
            if 'summary' in cv_content and cv_content['summary']:
                text_parts.append(cv_content['summary'])

            # Work experience
            if 'work_experience' in cv_content:
                for exp in cv_content['work_experience']:
                    if isinstance(exp, dict):
                        text_parts.append(exp.get('title', ''))
                        text_parts.append(exp.get('company', ''))
                        text_parts.append(exp.get('description', ''))

            # Education
            if 'education' in cv_content:
                for edu in cv_content['education']:
                    if isinstance(edu, dict):
                        text_parts.append(edu.get('degree', ''))
                        text_parts.append(edu.get('institution', ''))

            # Skills section - most important
            if 'skills' in cv_content:
                if isinstance(cv_content['skills'], list):
                    for skill in cv_content['skills']:
                        if isinstance(skill, str):
                            text_parts.append(skill)
                        elif isinstance(skill, dict):
                            text_parts.append(skill.get('name', ''))
                            text_parts.append(skill.get('skill', ''))
                elif isinstance(cv_content['skills'], dict):
                    for skill_list in cv_content['skills'].values():
                        if isinstance(skill_list, list):
                            for skill in skill_list:
                                if isinstance(skill, str):
                                    text_parts.append(skill)
                                elif isinstance(skill, dict):
                                    text_parts.append(skill.get('name', ''))
                                    text_parts.append(skill.get('skill', ''))

        return ' '.join(text_parts).lower()

    def _extract_skills_from_cv(self, cv_text: str) -> List[str]:
        """Extract skills directly from CV text using keyword matching"""
        skills = []
        text_lower = cv_text.lower()

        # Comprehensive skill database
        skill_database = [
            # Programming Languages
            'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'go', 'rust',
            'ruby', 'php', 'swift', 'kotlin', 'scala', 'perl', 'r', 'matlab',

            # Frameworks & Libraries
            'react', 'angular', 'vue', 'django', 'flask', 'fastapi', 'spring', 'spring boot',
            'node.js', 'express', 'laravel', 'rails', 'asp.net', 'graphql', 'rest',
            'jquery', 'bootstrap', 'tailwind', 'sass', 'webpack', 'vite',

            # Databases
            'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb',
            'cassandra', 'oracle', 'sqlite', 'firebase', 'neo4j',

            # Cloud & DevOps
            'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'terraform',
            'jenkins', 'gitlab ci', 'github actions', 'ansible', 'prometheus', 'grafana',
            'ci/cd', 'devops', 'infrastructure as code', 'cloudformation',

            # Data Science & AI
            'pandas', 'numpy', 'tensorflow', 'pytorch', 'scikit-learn', 'spark', 'hadoop',
            'tableau', 'power bi', 'excel', 'machine learning', 'deep learning',
            'natural language processing', 'computer vision', 'data visualization',
            'data analysis', 'statistics', 'big data', 'llm', 'openai',

            # Soft Skills
            'leadership', 'communication', 'teamwork', 'problem solving', 'critical thinking',
            'time management', 'adaptability', 'creativity', 'project management', 'agile',
            'scrum', 'kanban', 'collaboration', 'mentoring', 'decision making',
            'presentation', 'negotiation', 'conflict resolution'
        ]

        for skill in skill_database:
            if skill in text_lower:
                skills.append(skill)

        # Also extract words that might be skills (capitalized words in skills section)
        # Look for patterns like "Skills: Python, Java, SQL"
        import re
        skill_section_match = re.search(r'skills?:?\s*([^\n]+)', text_lower)
        if skill_section_match:
            potential_skills = re.findall(r'\b([a-z][a-z\s]{2,20}[a-z])\b', skill_section_match.group(1))
            for skill in potential_skills:
                if len(skill) > 2 and skill not in skills and skill not in ['and', 'the', 'for', 'with']:
                    skills.append(skill)

        return list(set(skills))

    def _generate_recommendations(self, missing_skills, match_score, profile_missing=None):
        """Generate improvement recommendations"""
        recommendations = []

        if match_score < 50:
            recommendations.append(
                "Your CV needs significant improvement. Consider rewriting sections to better match the job requirements.")
        elif match_score < 70:
            recommendations.append(
                "Your CV is decent but could be better optimized. Add more relevant keywords and skills.")
        else:
            recommendations.append("Your CV looks good! Focus on highlighting your achievements in the interview.")

        if missing_skills:
            recommendations.append(
                f"Add these skills to your CV: {', '.join(missing_skills[:5])}")
            recommendations.append("Update your CV's skills section to include relevant technologies.")

        if profile_missing and len(profile_missing) > 0:
            recommendations.append(
                f"Add these skills to your profile to get better career matches: {', '.join(profile_missing[:3])}")

        recommendations.append(
            "Quantify your achievements with numbers and percentages (e.g., 'Increased efficiency by 25%').")
        recommendations.append("Use action verbs at the beginning of each bullet point.")
        recommendations.append(
            "Tailor your CV for each job application by including keywords from the job description.")

        return recommendations[:5]


class JobScanDetailView(APIView):
    """Get detailed information about a specific job scan"""
    permission_classes = [IsAuthenticated]

    def get(self, request, scan_id):
        try:
            scan = JobScan.objects.get(id=scan_id, user=request.user)
        except JobScan.DoesNotExist:
            return Response(
                {'error': 'Scan not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            'id': str(scan.id),
            'job_title': scan.job_title,
            'company': scan.company,
            'match_score': float(scan.match_score) if scan.match_score else None,
            'job_description': scan.job_description,
            'extracted_keywords': scan.extracted_keywords,
            'required_skills': scan.required_skills,
            'matched_skills': scan.matched_skills,
            'missing_skills': scan.missing_skills,
            'recommendations': scan.recommendations,
            'created_at': scan.created_at,
            'cv_title': scan.cv.title if scan.cv else None
        })

class JobScanHistoryView(APIView):
    """Get user's job scan history - GET only"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """GET method for history"""
        limit = int(request.query_params.get('limit', 10))
        scans = JobScan.objects.filter(user=request.user).order_by('-created_at')[:limit]

        result = []
        for scan in scans:
            result.append({
                'id': str(scan.id),
                'job_title': scan.job_title,
                'company': scan.company,
                'match_score': float(scan.match_score) if scan.match_score else None,
                'created_at': scan.created_at,
                'cv_title': scan.cv.title if scan.cv else None
            })

        return Response(result)


class AIChatView(APIView):
    """AI Chat endpoint using Hugging Face"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = request.data.get('message', '')

        if not message:
            return Response(
                {'error': 'Message is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Build user context
        user_skills = UserSkill.objects.filter(user=request.user).values_list('skill__name', flat=True)
        enrollments = UserEnrollment.objects.filter(user=request.user).select_related('career_path')

        context = {
            'skills': list(user_skills),
            'current_job_title': request.user.current_job_title or '',
            'years_experience': request.user.years_experience or 0,
            'enrolled_paths': [e.career_path.title for e in enrollments]
        }

        # Get AI response
        response = huggingface_service.get_career_advice(message, context)

        return Response({
            'response': response,
            'message': message
        })


class JobDescriptionSummarizeView(APIView):
    """Summarize job description using Hugging Face"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        job_description = request.data.get('job_description', '')

        if not job_description:
            return Response(
                {'error': 'job_description is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        summary = huggingface_service.summarize_job_description(job_description)

        return Response({
            'summary': summary,
            'original_length': len(job_description),
            'summary_length': len(summary)
        })


class InterviewQuestionsView(APIView):
    """Generate interview questions using Hugging Face"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        job_title = request.data.get('job_title', '')
        job_description = request.data.get('job_description', '')
        cv_id = request.data.get('cv_id')

        cv_content = None
        if cv_id:
            try:
                cv = CV.objects.get(id=cv_id, user=request.user)
                cv_content = cv.content
            except CV.DoesNotExist:
                pass

        # Generate questions using the service
        questions_data = huggingface_service.generate_interview_questions(
            job_title, job_description, cv_content
        )

        # Format questions to match frontend expected structure
        formatted_questions = []
        for idx, q in enumerate(questions_data):
            formatted_questions.append({
                'id': str(idx + 1),
                'question_text': q.get('question', q.get('question_text', '')),
                'category': q.get('category', 'technical'),
                'difficulty': q.get('difficulty', 'medium'),
                'suggested_answer': q.get('suggested_answer',
                                          'Use the STAR method: Situation, Task, Action, Result. Be specific about your role and the outcome.'),
                'answer_tips': q.get('answer_tips',
                                     'Be honest, provide specific examples, and quantify your achievements where possible.'),
                'related_skills': q.get('related_skills', [])
            })

        return Response({
            'questions': formatted_questions,
            'total': len(formatted_questions)
        })


class InterviewAnswerSaveView(APIView):
    """Save user's practice answer to an interview question"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        question_text = request.data.get('question_text', '')
        question_category = request.data.get('question_category', '')
        answer_text = request.data.get('answer_text', '')
        job_title = request.data.get('job_title', '')

        if not question_text or not answer_text:
            return Response(
                {'error': 'question_text and answer_text are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        answer, created = InterviewAnswer.objects.update_or_create(
            user=request.user,
            question_text=question_text,
            defaults={
                'question_category': question_category,
                'answer_text': answer_text,
                'job_title': job_title
            }
        )

        return Response({
            'message': 'Answer saved successfully',
            'answer_id': str(answer.id),
            'created': created
        })


class InterviewAnswerListView(APIView):
    """Get user's saved interview answers"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        answers = InterviewAnswer.objects.filter(user=request.user).order_by('-updated_at')

        result = []
        for answer in answers:
            result.append({
                'id': str(answer.id),
                'question_text': answer.question_text,
                'question_category': answer.question_category,
                'answer_text': answer.answer_text,
                'job_title': answer.job_title,
                'created_at': answer.created_at,
                'updated_at': answer.updated_at
            })

        return Response(result)


class InterviewAnswerDeleteView(APIView):
    """Delete a saved interview answer"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, answer_id):
        try:
            answer = InterviewAnswer.objects.get(id=answer_id, user=request.user)
            answer.delete()
            return Response({'message': 'Answer deleted successfully'})
        except InterviewAnswer.DoesNotExist:
            return Response(
                {'error': 'Answer not found'},
                status=status.HTTP_404_NOT_FOUND
            )