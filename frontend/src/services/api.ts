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
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/users/login/', { username, password }),
  register: (data: any) =>
    api.post('/users/register/', data),
  logout: () =>
    api.post('/users/logout/'),
  getProfile: () =>
    api.get('/users/profile/'),
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



export default api;