import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    console.log('Making API request to:', config.url, 'Token:', token ? 'Present' : 'Missing');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => {
    console.log('API Response success:', response.config.url, response.status);
    return response;
  },
  async (error) => {
    console.error('API Response error:', error.config?.url, error.response?.status, error.response?.data);
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        console.log('Attempting token refresh...');
        const response = await axios.post('/api/users/token/refresh/', {
          refresh: refreshToken,
        });
        localStorage.setItem('access_token', response.data.access);
        console.log('Token refresh successful');
        originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    if (error.response?.status === 401) {
      console.warn('Authentication required for this action');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/users/login/', { email, password }),
  register: (data: any) =>
    api.post('/users/register/', data),
  logout: () =>
    api.post('/users/logout/'),
  getProfile: () => axios.get('/api/users/profile/', {
  headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
}),
  updateProfile: (data: any) =>
    api.put('/users/profile/', data),
};

// Admin API
export const adminAPI = {
  // Dashboard
  getStats: () => api.get('/admin/dashboard-stats/'),

  // Users
  getUsers: () => {
    console.log('Fetching users from /api/admin/users/');
    return api.get('/admin/users/');
  },
  getUser: (id: string) => api.get(`/admin/users/${id}/`),
  createUser: (data: any) => api.post('/admin/users/', data),
  updateUser: (id: string, data: any) => api.put(`/admin/users/${id}/`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}/`),
  toggleUserActive: (id: string) => api.post(`/admin/users/${id}/toggle_active/`),
  toggleUserStaff: (id: string) => api.post(`/admin/users/${id}/toggle_staff/`),

  // Career Paths
  getCareerPaths: () => api.get('/admin/career-paths/'),
  getCareerPath: (id: string) => api.get(`/admin/career-paths/${id}/`),
  createCareerPath: (data: any) => api.post('/admin/career-paths/', data),
  updateCareerPath: (id: string, data: any) => api.put(`/admin/career-paths/${id}/`, data),
  deleteCareerPath: (id: string) => api.delete(`/admin/career-paths/${id}/`),

  // Learning Modules
  getModules: () => api.get('/admin/modules/'),
  getModule: (id: string) => api.get(`/admin/modules/${id}/`),
  createModule: (data: any) => api.post('/admin/modules/', data),
  updateModule: (id: string, data: any) => api.put(`/admin/modules/${id}/`, data),
  deleteModule: (id: string) => api.delete(`/admin/modules/${id}/`),

  // Quizzes
  getQuizzes: () => api.get('/admin/quizzes/'),
  getQuiz: (id: string) => api.get(`/admin/quizzes/${id}/`),
  createQuiz: (data: any) => api.post('/admin/quizzes/', data),
  updateQuiz: (id: string, data: any) => api.put(`/admin/quizzes/${id}/`, data),
  deleteQuiz: (id: string) => api.delete(`/admin/quizzes/${id}/`),

  // Skills
  getSkills: () => api.get('/admin/skills/'),
  createSkill: (data: any) => api.post('/admin/skills/', data),
  updateSkill: (id: string, data: any) => api.put(`/admin/skills/${id}/`, data),
  deleteSkill: (id: string) => api.delete(`/admin/skills/${id}/`),

  // CVs
  getCVs: () => api.get('/admin/cvs/'),
  getCV: (id: string) => api.get(`/admin/cvs/${id}/`),
  updateCV: (id: string, data: any) => api.patch(`/admin/cvs/${id}/`, data),
  deleteCV: (id: string) => api.delete(`/admin/cvs/${id}/`),

  // Enrollments
  getEnrollments: () => api.get('/admin/enrollments/'),
};

// Career Paths API
export const careerAPI = {
  getAll: (params?: any) => api.get('/learning/career-paths/', { params }),
  getById: (id: string) => api.get(`/learning/career-paths/${id}/`),
  getIndustries: () => api.get('/learning/career-paths/industries/'),
  getRecommended: () => api.get('/learning/career-paths/recommended/'),
  enroll: (id: string) => api.post(`/learning/career-paths/${id}/enroll/`),
  getProgress: (id: string) => api.get(`/learning/career-paths/${id}/progress/`),
  getModules: (id: string) => api.get(`/learning/career-paths/${id}/modules/`),
};

// Learning Modules API
export const moduleAPI = {
  getAll: (params?: any) => api.get('/learning/modules/', { params }),
  getById: (id: string) => api.get(`/learning/modules/${id}/`),
  start: (id: string) => api.post(`/learning/modules/${id}/start/`),
  complete: (id: string) => api.post(`/learning/modules/${id}/complete/`),
  updateTime: (id: string, seconds: number) => api.post(`/learning/modules/${id}/update-time/`, { seconds }),
  getUserProgress: () => api.get('/progress/user-progress/'),
};

// Quizzes API
export const quizAPI = {
  getAll: () => api.get('/quizzes/quizzes/'),
  getById: (id: string) => api.get(`/quizzes/quizzes/${id}/`),
  start: (id: string) => api.post(`/quizzes/quizzes/${id}/start/`),
  submit: (id: string, attemptId: string, responses: any[]) =>
    api.post(`/quizzes/quizzes/${id}/submit/`, { attempt_id: attemptId, responses }),
};

// Progress API
export const progressAPI = {
  getDashboard: () => api.get('/progress/dashboard/'),  // Changed from /progress/dashboard/data/
  getAnalytics: () => api.get('/progress/analytics/'),
  getEnrollments: () => api.get('/progress/enrollments/'),
  getProgress: () => api.get('/progress/progress/'),
  startModule: (moduleId: string, enrollmentId?: string) =>
    api.post('/progress/progress/start/', { module_id: moduleId, enrollment_id: enrollmentId }),
  completeModule: (moduleId: string, enrollmentId?: string, score?: number) =>
    api.post('/progress/progress/complete/', { module_id: moduleId, enrollment_id: enrollmentId, score }),
  updateTime: (moduleId: string, seconds: number, enrollmentId?: string) =>
    api.post('/progress/progress/update-time/', { module_id: moduleId, seconds, enrollment_id: enrollmentId }),
};

// AI API
export const aiAPI = {
  getRecommendations: () => api.get('/ai/recommendations/'),
  generateInterviewQuestions: (data: any) => api.post('/ai/interview/', data),
  chat: (message: string) => api.post('/ai/chat/', { message }),
};

// CV API
export const cvAPI = {
  getTemplates: () => api.get('/cv/templates/'),
  getUserCVs: () => api.get('/cv/cvs/'),
  getCV: (id: string) => api.get(`/cv/cvs/${id}/`),
  create: (data: any) => api.post('/cv/cvs/', data),
  update: (id: string, data: any) => api.put(`/cv/cvs/${id}/`, data),
  delete: (id: string) => api.delete(`/cv/cvs/${id}/`),
  analyze: (id: string, jobDescription: string) =>
    api.post(`/cv/cvs/${id}/analyze/`, { job_description: jobDescription }),
  exportPDF: (id: string) => api.post(`/cv/cvs/${id}/export_pdf/`, {}, { responseType: 'blob' }),
};

// External Courses API
export const courseAPI = {
  // Get all external courses
  getAll: (params?: { difficulty?: string; partner?: string }) =>
    api.get('/external-courses/courses/', { params }),

  // Get course details
  getById: (id: string) =>
    api.get(`/external-courses/courses/${id}/`),

  // Search courses
  search: (query: string) =>
    api.get('/external-courses/courses/search/', { params: { q: query } }),

  // Get popular courses
  getPopular: (limit?: number) =>
    api.get('/external-courses/courses/popular/', { params: { limit } }),

  // Get courses by skills
  getBySkills: (skills: string[]) =>
    api.get('/external-courses/courses/by_skills/', { params: { skills: skills.join(',') } }),

  // Get personalized recommendations
  getRecommendations: () =>
    api.get('/external-courses/recommendations/'),
};

// Admin only - trigger scraping
export const adminCourseAPI = {
  triggerScrape: (searchTerms: string[], maxItemsPerTerm?: number) =>
    api.post('/external-courses/scrape/trigger/', { search_terms: searchTerms, max_items_per_term: maxItemsPerTerm }),

  getScrapeLogs: () =>
    api.get('/external-courses/logs/'),
};

export default api;