import React from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth';
import QuizManagement from "./admin/QuizManagement.tsx";

// Lazy load components for better performance
const Overview = React.lazy(() => import('./admin/Overview'));
const UsersList = React.lazy(() => import('./admin/UsersList'));
const CareerPathsList = React.lazy(() => import('./admin/CareerPathsList'));
const ModulesList = React.lazy(() => import('./admin/ModulesList'));
const SkillsList = React.lazy(() => import('./admin/SkillsList'));
const CVsList = React.lazy(() => import('./admin/CVsList'));
const ScrapeCourses = React.lazy(() => import('./admin/ScrapeCourses'));

// Loading fallback
const LoadingFallback = () => (
  <div className="flex justify-center items-center h-64">
    <div className="text-gray-500">Loading...</div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/admin', label: '📊 Overview' },
    { path: '/admin/users', label: '👥 Users' },
    { path: '/admin/career-paths', label: '🎯 Career Paths' },
    { path: '/admin/modules', label: '📚 Learning Modules' },
    { path: '/admin/scrape-courses', label: '🌐 Scrape Courses' },
    { path: '/admin/quizzes', label: '📝 Quizzes' },
    { path: '/admin/skills', label: '🔧 Skills' },
    { path: '/admin/cvs', label: '📄 CVs' },
  ];

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gray-900 text-white sticky top-0 z-10">
        <div className="px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Career Pathway Tracker</h1>
            <p className="text-gray-400 text-sm">Admin Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">{user?.first_name}</span>
            <Link to="/dashboard" className="text-gray-300 hover:text-white text-sm">
              Back to Site
            </Link>
            <button
              onClick={handleLogout}
              className="bg-red-600 px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-lg min-h-screen">
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-4 py-2 rounded-lg transition-colors ${
                  currentPath === item.path || (item.path === '/admin' && currentPath === '/admin')
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6">
          <React.Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route index element={<Overview />} />
              <Route path="users" element={<UsersList />} />
              <Route path="career-paths" element={<CareerPathsList />} />
              <Route path="modules" element={<ModulesList />} />
              <Route path="scrape-courses" element={<ScrapeCourses />} />
              <Route path="quizzes" element={<QuizManagement />} />
              <Route path="skills" element={<SkillsList />} />
              <Route path="cvs" element={<CVsList />} />
            </Routes>
          </React.Suspense>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;