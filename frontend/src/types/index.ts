export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface CareerPath {
  id: string;
  title: string;
  slug: string;
  description: string;
  industry: string;
  avg_salary_min: number;
  avg_salary_max: number;
  growth_outlook: string;
  modules_count?: number;
  enrollments_count?: number;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  content_type: string;
  duration_minutes: number;
  difficulty: string;
  xp_points: number;
  is_required: boolean;
  status?: 'not_started' | 'in_progress' | 'completed';
  progress_percent: number;
  is_completed?: boolean;
}

export interface Quiz {
  id: string;
  title: string;
  module_id: string;
  passing_score: number;
  questions_count?: number;
  attempts_count?: number;
}

export interface Skill {
  id: string;
  name: string;
}

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    new_last_7_days: number;
  };
  content: {
    career_paths: number;
    learning_modules: number;
    quizzes: number;
    questions: number;
    skills: number;
  };
  progress: {
    total_enrollments: number;
    active_enrollments: number;
    completed_enrollments: number;
    completed_modules: number;
    module_completion_rate: number;
  };
  ai: {
    total_cvs: number;
    total_job_scans: number;
    total_recommendations: number;
    average_quiz_score: number;
    average_ats_score: number;
  };
  recent_users: User[];
}