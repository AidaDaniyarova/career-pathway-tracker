from django.db import transaction
from django.utils import timezone
from learning.models import CareerPath, CareerPathSkill
from progress.models import UserEnrollment, UserProgress
from skills.models import UserSkill, Skill
from quizzes.models import QuizResponse
from cv.models import CV
from learning.models import CareerPathModule, Prerequisite
from quizzes.scoring import scores_for_response
from .models import Recommendation, JobScan
from .skill_matching import mentions_skill


SCORING_VERSION = 2


class AIRecommendationService:
    """Career recommendations combined from the quiz, skills, CV and learning progress.

    A career's match is the weighted average of the sources the user actually has
    (quiz 35%, skills 25%, CV 20%, rescaled over the available ones), so a source
    with no data doesn't count as zero. Progress on an enrolled path then adds a
    bonus of up to 20% of the remaining gap to 100; it never lowers a score.
    """

    def __init__(self, user):
        self.user = user
        self.weight_quiz = 0.35     # Quiz responses weight
        self.weight_skills = 0.25   # User skills weight
        self.weight_cv = 0.20       # CV content weight
        self.progress_bonus = 0.20  # Max share of the remaining gap closed by learning progress

    def get_all_recommendations(self, refresh=False):
        """Current recommendations. Recalculated on every call: it's cheap, and the
        user's skills, CV, quiz and progress may have changed since last time."""
        return self.generate_recommendations()

    def generate_recommendations(self):
        """Score every career path, save the results and return the top 10."""
        careers = list(CareerPath.objects.prefetch_related('required_skills__skill'))

        quiz_scores = self._calculate_quiz_scores()
        skill_scores = self._calculate_skill_scores(careers)
        cv_scores = self._calculate_cv_scores(careers)
        progress_scores = self._calculate_progress_scores()

        saved = []
        with transaction.atomic():
            for career in careers:
                career_id = str(career.id)
                parts = {}
                if career_id in quiz_scores:
                    parts['quiz'] = (quiz_scores[career_id], self.weight_quiz)
                if career_id in skill_scores:
                    parts['skills'] = (skill_scores[career_id], self.weight_skills)
                if career_id in cv_scores:
                    parts['cv'] = (cv_scores[career_id], self.weight_cv)
                progress = progress_scores.get(career_id)

                if not parts and progress is None:
                    continue

                if parts:
                    total_weight = sum(weight for _, weight in parts.values())
                    score = sum(value * weight for value, weight in parts.values()) / total_weight
                    if progress is not None:
                        score += self.progress_bonus * (progress / 100) * (100 - score)
                else:
                    score = progress  # Only progress is known for this path

                breakdown = {name: round(value, 2) for name, (value, _) in parts.items()}
                if progress is not None:
                    breakdown['progress'] = round(progress, 2)
                sources = {
                    'quiz': 'quiz' in parts,
                    'skills': 'skills' in parts,
                    'cv': 'cv' in parts,
                    'progress': progress is not None,
                }

                recommendation, _ = Recommendation.objects.update_or_create(
                    user=self.user,
                    career_path=career,
                    defaults={
                        'score': round(min(100.0, max(0.0, score)), 2),
                        'recommendation_data': {
                            'scores': breakdown,
                            'sources': sources,
                            'scoring_version': SCORING_VERSION,
                            'generated_at': timezone.now().isoformat(),
                        },
                        'source_quiz': sources['quiz'],
                        'source_skills': sources['skills'],
                        'source_cv': sources['cv'],
                        'source_progress': sources['progress'],
                    },
                )
                saved.append(recommendation)

            # Paths that no longer have any data behind them
            Recommendation.objects.filter(user=self.user).exclude(id__in=[r.id for r in saved]).delete()

        saved.sort(key=lambda r: r.score, reverse=True)
        return saved[:10]

    def _calculate_quiz_scores(self):
        """Scores from the user's latest quiz, recalculated with the current quiz scoring"""
        quiz_response = QuizResponse.objects.filter(user=self.user).select_related('quiz') \
            .order_by('-completed_at').first()
        if not quiz_response:
            return {}
        scores = scores_for_response(quiz_response)
        return {str(career_id): float(score or 0) for career_id, score in scores.items()}

    @staticmethod
    def _skill_weight(career_skill):
        return 2 if career_skill.importance == 'required' else 1

    def _calculate_skill_scores(self, careers):
        """Share of each path's skills the user has, weighted by importance and level (1-5)"""
        levels = {us.skill.name.lower(): us.level
                  for us in UserSkill.objects.filter(user=self.user).select_related('skill')}
        if not levels:
            return {}

        scores = {}
        for career in careers:
            career_skills = list(career.required_skills.all())
            if not career_skills:
                continue  # Nothing to compare against
            total = sum(self._skill_weight(cs) for cs in career_skills)
            matched = sum(self._skill_weight(cs) * min(levels.get(cs.skill.name.lower(), 0), 5) / 5
                          for cs in career_skills)
            scores[str(career.id)] = round(matched / total * 100, 2)
        return scores

    def _calculate_progress_scores(self):
        """Progress (0-100) on each path the user is enrolled in"""
        return {
            str(enrollment.career_path_id): float(enrollment.progress_percent or 0)
            for enrollment in UserEnrollment.objects.filter(user=self.user)
        }

    def _calculate_cv_scores(self, careers):
        """Share of each path's skills mentioned in the user's CV, weighted by importance"""
        cv = CV.objects.filter(user=self.user).order_by('-is_default', '-updated_at').first()
        cv_text = self._extract_cv_text(cv.content) if cv and cv.content else ''
        if not cv_text.strip():
            return {}

        scores = {}
        for career in careers:
            career_skills = list(career.required_skills.all())
            if not career_skills:
                continue
            total = sum(self._skill_weight(cs) for cs in career_skills)
            mentioned = sum(self._skill_weight(cs) for cs in career_skills if mentions_skill(cv_text, cs.skill.name))
            scores[str(career.id)] = round(mentioned / total * 100, 2)
        return scores

    def _extract_cv_text(self, cv_content):
        """Extract all text from CV JSON content"""
        text_parts = []

        # Handle different CV content structures
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
                        text_parts.append(exp.get('dates', ''))

            # Education
            if 'education' in cv_content:
                for edu in cv_content['education']:
                    if isinstance(edu, dict):
                        text_parts.append(edu.get('degree', ''))
                        text_parts.append(edu.get('institution', ''))

            # Skills
            if 'skills' in cv_content:
                if isinstance(cv_content['skills'], list):
                    for skill in cv_content['skills']:
                        if isinstance(skill, str):
                            text_parts.append(skill)
                        elif isinstance(skill, dict):
                            text_parts.append(skill.get('name', ''))
                elif isinstance(cv_content['skills'], dict):
                    for skill_list in cv_content['skills'].values():
                        if isinstance(skill_list, list):
                            text_parts.extend([str(s) for s in skill_list if s])

        return ', '.join(p for p in text_parts if p).lower()

    def get_recommendation_details(self, recommendation):
        """Get detailed information about a recommendation"""
        career = recommendation.career_path

        # Ensure career exists
        if not career:
            return None

        # Get skill gaps
        user_skills = set(UserSkill.objects.filter(user=self.user).values_list('skill__name', flat=True))
        required_skills = set(career.required_skills.values_list('skill__name', flat=True))
        missing_skills = list(required_skills - user_skills)
        matched_skills = list(required_skills & user_skills)

        # Get related learning modules
        modules = CareerPathModule.objects.filter(
            career_path=career
        ).select_related('module')[:5]

        recommended_modules = [{
            'id': str(m.module.id),
            'title': m.module.title,
            'description': m.module.description or '',
            'duration_minutes': m.module.duration_minutes,
            'xp_points': m.module.xp_points
        } for m in modules]

        # Get score breakdown from recommendation_data
        score_breakdown = recommendation.recommendation_data.get('scores',
                                                                 {}) if recommendation.recommendation_data else {}

        return {
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
            'match_score': float(recommendation.score),
            'score_breakdown': {
                'quiz': score_breakdown.get('quiz', 0),
                'skills': score_breakdown.get('skills', 0),
                'progress': score_breakdown.get('progress', 0),
                'cv': score_breakdown.get('cv', 0),
            },
            'skill_analysis': {
                'matched_skills': matched_skills[:10],
                'missing_skills': missing_skills[:10],
                'total_required': len(required_skills),
                'total_matched': len(matched_skills),
                'completion_percentage': round((len(matched_skills) / len(required_skills)) * 100,
                                               2) if required_skills else 0
            },
            'recommended_modules': recommended_modules,
            'created_at': recommendation.created_at,
            'sources': {
                'quiz': recommendation.source_quiz,
                'cv': recommendation.source_cv,
                'skills': recommendation.source_skills,
                'progress': recommendation.source_progress,
            }
        }


class JobMatchService:
    """Service for matching CVs with job descriptions"""

    def __init__(self, user):
        self.user = user

    def analyze_job_match(self, cv_id, job_description, job_title=None, company=None):
        """Analyze how well a CV matches a job description"""
        try:
            cv = CV.objects.get(id=cv_id, user=self.user)
        except CV.DoesNotExist:
            return None

        # Extract CV text
        cv_text = self._extract_cv_text(cv.content)

        # Extract keywords from job description
        job_keywords = self._extract_keywords(job_description)

        # Find matching keywords
        cv_lower = cv_text.lower()
        matched_keywords = []
        missing_keywords = []

        for keyword in job_keywords:
            if keyword.lower() in cv_lower:
                matched_keywords.append(keyword)
            else:
                missing_keywords.append(keyword)

        # Calculate match score
        match_percentage = (len(matched_keywords) / len(job_keywords)) * 100 if job_keywords else 0

        # Extract required skills from job description
        required_skills = self._extract_skills_from_text(job_description)

        # Get user's skills
        user_skills = set(UserSkill.objects.filter(user=self.user).values_list('skill__name', flat=True))
        user_skills_lower = set(s.lower() for s in user_skills)

        # Identify missing skills
        missing_skills = [s for s in required_skills if s.lower() not in user_skills_lower]
        matched_skills = [s for s in required_skills if s.lower() in user_skills_lower]

        # Calculate skill match percentage
        skill_match = (len(matched_skills) / len(required_skills)) * 100 if required_skills else 0

        # Overall score (weighted: 60% keyword match, 40% skill match)
        total_score = (match_percentage * 0.6) + (skill_match * 0.4)

        # Save scan record
        job_scan = JobScan.objects.create(
            user=self.user,
            cv=cv,
            job_title=job_title or "Job Scan",
            company=company or "",
            job_description=job_description,
            match_score=round(total_score, 2),
            extracted_keywords=job_keywords[:30],
            required_skills=required_skills[:20],
            missing_skills=missing_skills[:20]
        )

        # Generate recommendations for improvement
        recommendations = self._generate_improvement_recommendations(missing_keywords, missing_skills)

        return {
            'scan_id': str(job_scan.id),
            'match_score': round(total_score, 2),
            'keyword_match': round(match_percentage, 2),
            'skill_match': round(skill_match, 2),
            'matched_keywords': matched_keywords[:15],
            'missing_keywords': missing_keywords[:15],
            'matched_skills': matched_skills[:10],
            'missing_skills': missing_skills[:10],
            'recommendations': recommendations,
            'cv_id': str(cv.id),
            'cv_title': cv.title
        }

    def _extract_cv_text(self, cv_content):
        """Extract text from CV content"""
        text_parts = []

        if 'personal_info' in cv_content:
            for value in cv_content['personal_info'].values():
                if isinstance(value, str):
                    text_parts.append(value)

        if 'summary' in cv_content:
            text_parts.append(cv_content['summary'])

        if 'work_experience' in cv_content:
            for exp in cv_content['work_experience']:
                text_parts.append(exp.get('title', ''))
                text_parts.append(exp.get('company', ''))
                text_parts.append(exp.get('description', ''))
                text_parts.append(exp.get('dates', ''))

        if 'education' in cv_content:
            for edu in cv_content['education']:
                text_parts.append(edu.get('degree', ''))
                text_parts.append(edu.get('institution', ''))

        if 'skills' in cv_content:
            if isinstance(cv_content['skills'], list):
                text_parts.extend(cv_content['skills'])

        return ' '.join(text_parts)

    def _extract_keywords(self, text):
        """Extract important keywords from text"""
        # Common tech keywords
        tech_keywords = [
            'python', 'java', 'javascript', 'react', 'angular', 'vue', 'django',
            'flask', 'spring', 'node', 'express', 'sql', 'mongodb', 'postgresql',
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'agile', 'scrum',
            'machine learning', 'data science', 'ai', 'deep learning', 'tensorflow',
            'pytorch', 'pandas', 'numpy', 'tableau', 'power bi', 'excel', 'project management',
            'leadership', 'communication', 'teamwork', 'problem solving'
        ]

        text_lower = text.lower()
        found_keywords = [kw for kw in tech_keywords if kw in text_lower]

        # Add 2-3 word phrases
        return list(set(found_keywords))

    def _extract_skills_from_text(self, text):
        """Extract skill mentions from text"""
        skills = Skill.objects.values_list('name', flat=True)
        text_lower = text.lower()
        found_skills = [s for s in skills if s.lower() in text_lower]
        return found_skills[:20]

    def _generate_improvement_recommendations(self, missing_keywords, missing_skills):
        """Generate recommendations for improving CV"""
        recommendations = []

        if missing_keywords:
            recommendations.append(f"Add these keywords to your CV: {', '.join(missing_keywords[:5])}")

        if missing_skills:
            recommendations.append(f"Develop these skills: {', '.join(missing_skills[:5])}")
            recommendations.append("Consider taking relevant courses or certifications")

        recommendations.append("Quantify your achievements with numbers and percentages")
        recommendations.append("Use action verbs at the beginning of bullet points")

        return recommendations[:5]

    def get_scan_history(self, limit=10):
        """Get user's job scan history"""
        return JobScan.objects.filter(user=self.user).order_by('-created_at')[:limit]


class PersonalizedRecommendationService:
    """Service for generating personalized recommendations based on user activity"""

    def __init__(self, user):
        self.user = user

    def get_dashboard_recommendations(self, limit=5):
        """Get recommendations for dashboard display"""
        # Get career recommendations
        career_service = AIRecommendationService(self.user)
        career_recs = career_service.generate_recommendations()

        # Format for dashboard
        recommendations = []
        for rec in career_recs[:limit]:
            recommendations.append({
                'id': str(rec.id),
                'career_path_id': str(rec.career_path.id),
                'title': rec.career_path.title,
                'slug': rec.career_path.slug,
                'description': rec.career_path.description,
                'match_score': float(rec.score),
                'type': 'career'
            })

        # Add next learning module recommendations
        next_modules = self._get_next_learning_modules(limit)
        for module in next_modules:
            recommendations.append({
                'id': module['id'],
                'title': module['title'],
                'description': module['description'],
                'type': 'module',
                'career_path_id': module.get('career_path_id')
            })

        return recommendations

    def _get_next_learning_modules(self, limit=3):
        """Get recommended next modules based on user's progress"""
        # Get user's active enrollments
        enrollments = UserEnrollment.objects.filter(
            user=self.user,
            status__in=['enrolled', 'in_progress']
        ).select_related('career_path')

        recommended_modules = []

        for enrollment in enrollments:
            # Get modules in this career path
            path_modules = CareerPathModule.objects.filter(
                career_path=enrollment.career_path
            ).select_related('module').order_by('order_index')

            # Get user's completed modules in this path
            completed_modules = UserProgress.objects.filter(
                user=self.user,
                enrollment=enrollment,
                status='completed'
            ).values_list('module_id', flat=True)

            # Find the first incomplete module
            for pm in path_modules:
                if pm.module.id not in completed_modules:
                    # Check if prerequisites are met
                    prerequisites = Prerequisite.objects.filter(module=pm.module)
                    prereq_completed = True

                    for prereq in prerequisites:
                        if prereq.prerequisite.id not in completed_modules:
                            prereq_completed = False
                            break

                    if prereq_completed:
                        recommended_modules.append({
                            'id': str(pm.module.id),
                            'title': pm.module.title,
                            'description': pm.module.description,
                            'duration_minutes': pm.module.duration_minutes,
                            'xp_points': pm.module.xp_points,
                            'career_path_id': str(enrollment.career_path.id),
                            'career_path_title': enrollment.career_path.title
                        })
                        break

        return recommended_modules[:limit]