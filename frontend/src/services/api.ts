import axios, { type InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '../utils/errors';

/** Generic JSON payload sent to the API. */
export type Payload = Record<string, unknown>;

/** Fired on window when the backend says AI consent is needed. */
export const AI_CONSENT_REQUIRED_EVENT = 'ai-consent-required';

const TOKEN_KEYS = ['access_token', 'refresh_token', 'user'] as const;
export const clearStoredAuth = () => TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));

const isConsentError = (error: ApiError) =>
  error.response?.status === 403 && error.response.data?.code === 'ai_consent_required';

// Some pages call the global axios instance directly; surface consent errors from those too.
axios.interceptors.response.use(
  (response) => response,
  (error: ApiError) => {
    if (isConsentError(error)) {
      window.dispatchEvent(new CustomEvent(AI_CONSENT_REQUIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single in-flight refresh shared by concurrent 401s
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) throw new Error('No refresh token');
  const response = await axios.post('/api/users/token/refresh/', { refresh: refreshToken });
  localStorage.setItem('access_token', response.data.access);
  // ROTATE_REFRESH_TOKENS is on, so a new refresh token is returned
  if (response.data.refresh) {
    localStorage.setItem('refresh_token', response.data.refresh);
  }
  return response.data.access;
};

api.interceptors.response.use(
  (response) => response,
  async (error: ApiError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // AI consent missing -> ask the UI to show the consent dialog
    if (isConsentError(error)) {
      window.dispatchEvent(new CustomEvent(AI_CONSENT_REQUIRED_EVENT));
      return Promise.reject(error);
    }

    const isAuthCall = originalRequest?.url?.includes('/users/login/') || originalRequest?.url?.includes('/users/token/');
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthCall
        && localStorage.getItem('refresh_token')) {
      originalRequest._retry = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken();
        const access = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearStoredAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        refreshPromise = null;
      }
    }
    return Promise.reject(error);
  }
);

export interface RegisterPayload {
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
}

export interface AIConsentState {
  ai_consent: boolean | null;
  ai_consent_at: string | null;
  ai_consent_version: string;
  current_version: string;
  ai_consent_required: boolean;
}

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/users/login/', { email, password }),
  register: (data: RegisterPayload) =>
    api.post('/users/register/', data),
  logout: (refresh: string | null) =>
    api.post('/users/logout/', { refresh }),
  getProfile: () => api.get('/users/profile/'),
  updateProfile: (data: Payload) =>
    api.put('/users/profile/', data),
  getAIConsent: () => api.get<AIConsentState>('/users/ai-consent/'),
  setAIConsent: (accepted: boolean) =>
    api.post<AIConsentState>('/users/ai-consent/', { accepted }),
};

// Admin API
export const adminAPI = {
  // Dashboard
  getStats: () => api.get('/admin/dashboard-stats/'),

  // Users
  getUsers: () => api.get('/admin/users/'),
  createUser: (data: Payload) => api.post('/admin/users/', data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}/`),
  toggleUserActive: (id: string) => api.post(`/admin/users/${id}/toggle_active/`),
  toggleUserStaff: (id: string) => api.post(`/admin/users/${id}/toggle_staff/`),

  // Career Paths
  getCareerPaths: () => api.get('/admin/career-paths/'),
  createCareerPath: (data: Payload) => api.post('/admin/career-paths/', data),
  updateCareerPath: (id: string, data: Payload) => api.put(`/admin/career-paths/${id}/`, data),
  deleteCareerPath: (id: string) => api.delete(`/admin/career-paths/${id}/`),

  // Learning Modules
  getModules: () => api.get('/admin/modules/'),
  createModule: (data: Payload) => api.post('/admin/modules/', data),
  updateModule: (id: string, data: Payload) => api.put(`/admin/modules/${id}/`, data),
  deleteModule: (id: string) => api.delete(`/admin/modules/${id}/`),

  // Quizzes (previously sent without the auth header)
  getQuizzes: () => api.get('/admin/quizzes/'),
  createQuiz: (data: Payload) => api.post('/admin/quizzes/', data),
  updateQuiz: (id: string, data: Payload) => api.put(`/admin/quizzes/${id}/`, data),
  deleteQuiz: (id: string) => api.delete(`/admin/quizzes/${id}/`),

  // Skills
  getSkills: () => api.get('/admin/skills/'),
  createSkill: (data: Payload) => api.post('/admin/skills/', data),
  updateSkill: (id: string, data: Payload) => api.put(`/admin/skills/${id}/`, data),
  deleteSkill: (id: string) => api.delete(`/admin/skills/${id}/`),

  // CVs
  getCVs: () => api.get('/admin/cvs/'),
  updateCV: (id: string, data: Payload) => api.patch(`/admin/cvs/${id}/`, data),
  deleteCV: (id: string) => api.delete(`/admin/cvs/${id}/`),
};


// Quizzes API
export const quizAPI = {
  start: (id: string) => api.post(`/quizzes/quizzes/${id}/start/`),
  submit: (id: string, attemptId: string, responses: Payload[]) =>
    api.post(`/quizzes/quizzes/${id}/submit/`, { attempt_id: attemptId, responses }),
};

// Progress API
export const progressAPI = {
  getDashboard: () => api.get('/progress/dashboard/'),
};

// AI API
export const aiAPI = {
  // Career recommendations
  getRecommendations: (refresh?: boolean) =>
    api.get(`/ai/recommendations/${refresh ? '?refresh=true' : ''}`),

  // Job matching - Use job-match endpoint (POST)
  analyzeJobMatch: (cvId: string, description: string, jobTitle?: string, company?: string) =>
    api.post('/ai/job-match/', {
      cv_id: cvId,
      description: description,
      job_title: jobTitle,
      company: company
    }),

  getJobScanHistory: (limit?: number) =>
    api.get(`/ai/job-scans/${limit ? `?limit=${limit}` : ''}`),
};

// CV API
export const cvAPI = {
  getUserCVs: () => api.get('/cv/cvs/'),
  create: (data: Payload) => api.post('/cv/cvs/', data),
  update: (id: string, data: Payload) => api.put(`/cv/cvs/${id}/`, data),
  delete: (id: string) => api.delete(`/cv/cvs/${id}/`),
  analyze: (id: string, jobDescription: string) =>
    api.post(`/cv/cvs/${id}/analyze/`, { job_description: jobDescription }),
};

export default api;
