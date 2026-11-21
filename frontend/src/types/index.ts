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
  description?: string;
  module_id: string;
  module?: {
    id: string;
    title: string;
  };
  passing_score: number;
  is_active: boolean;
  order: number;
  questions_count?: number;
  attempts_count?: number;
  created_at?: string;
}

export interface QuizQuestion {
  id: string;
  quiz: string;
  question_text: string;
  question_type: 'multiple_choice' | 'ranking' | 'text';
  ranking_items?: string[];
  order: number;
  options: QuizOption[];
}

export interface QuizOption {
  id: string;
  option_text: string;
  career_weights: Record<string, number>; // career_path_id -> weight
  order: number;
}

export interface QuizResponse {
  id: string;
  user: string;
  username: string;
  quiz: string;
  quiz_title: string;
  responses: Record<string, unknown>;
  career_scores: Record<string, number>;
  recommended_career_path_id: string | null;
  recommended_career_path?: {
    id: string;
    title: string;
    slug: string;
  };
  completed_at: string;
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
    career_quizzes: number;
    quiz_questions: number;
    skills: number;
  };
  progress: {
    total_enrollments: number;
    active_enrollments: number;
    completed_enrollments: number;
    total_module_progress: number;
    completed_modules: number;
    module_completion_rate: number;
  };
  ai: {
    total_cvs: number;
    total_job_scans: number;
    total_recommendations: number;
    average_ats_score: number;
  };
  quiz_analytics: {
    total_responses: number;
  };
  recent_users: Array<{
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    is_active: boolean;
    is_staff: boolean;
    education_level: string | null;
    years_experience: number;
    created_at: string;
    updated_at: string;
  }>;
  recent_enrollments: Array<{
    id: string;
    user: string;
    username: string;
    career_path: string;
    career_path_title: string;
    status: string;
    progress_percent: string;
    started_at: string;
  }>;
}