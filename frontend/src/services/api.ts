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
  createUser: (data: any) => api.post('/admin/users/', data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}/`),
  toggleUserActive: (id: string) => api.post(`/admin/users/${id}/toggle_active/`),
  toggleUserStaff: (id: string) => api.post(`/admin/users/${id}/toggle_staff/`),

  // Career Paths
  getCareerPaths: () => api.get('/admin/career-paths/'),
  createCareerPath: (data: any) => api.post('/admin/career-paths/', data),
  updateCareerPath: (id: string, data: any) => api.put(`/admin/career-paths/${id}/`, data),
  deleteCareerPath: (id: string) => api.delete(`/admin/career-paths/${id}/`),

  // Learning Modules
  getModules: () => api.get('/admin/modules/'),
  createModule: (data: any) => api.post('/admin/modules/', data),
  updateModule: (id: string, data: any) => api.put(`/admin/modules/${id}/`, data),
  deleteModule: (id: string) => api.delete(`/admin/modules/${id}/`),

  // Quizzes
  getQuizzes: () => axios.get('/api/admin/quizzes/'),
  createQuiz: (data: any) => axios.post('/api/admin/quizzes/', data),
  updateQuiz: (id: string, data: any) => axios.put(`/api/admin/quizzes/${id}/`, data),
  deleteQuiz: (id: string) => axios.delete(`/api/admin/quizzes/${id}/`),

  // Skills
  getSkills: () => api.get('/admin/skills/'),
  createSkill: (data: any) => api.post('/admin/skills/', data),
  updateSkill: (id: string, data: any) => api.put(`/admin/skills/${id}/`, data),
  deleteSkill: (id: string) => api.delete(`/admin/skills/${id}/`),

  // CVs
  getCVs: () => api.get('/admin/cvs/'),
  updateCV: (id: string, data: any) => api.patch(`/admin/cvs/${id}/`, data),
  deleteCV: (id: string) => api.delete(`/admin/cvs/${id}/`),
};


// Quizzes API
export const quizAPI = {
  start: (id: string) => api.post(`/quizzes/quizzes/${id}/start/`),
  submit: (id: string, attemptId: string, responses: any[]) =>
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
      description: description,  // Use 'description' field name
      job_title: jobTitle,
      company: company
    }),

  getJobScanHistory: (limit?: number) =>
    api.get(`/ai/job-scans/${limit ? `?limit=${limit}` : ''}`),
};

// CV API
export const cvAPI = {
  getUserCVs: () => api.get('/cv/cvs/'),
  create: (data: any) => api.post('/cv/cvs/', data),
  update: (id: string, data: any) => api.put(`/cv/cvs/${id}/`, data),
  delete: (id: string) => api.delete(`/cv/cvs/${id}/`),
  analyze: (id: string, jobDescription: string) =>
    api.post(`/cv/cvs/${id}/analyze/`, { job_description: jobDescription }),
};

export default api;