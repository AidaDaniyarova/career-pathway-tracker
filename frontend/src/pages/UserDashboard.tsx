import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

// Import all dashboard sections
import DashboardHome from './dashboard/DashboardHome';
import ProfileManagement from './dashboard/ProfileManagement';
import CareerPaths from './dashboard/CareerPaths';
import CareerPathDetail from './dashboard/CareerPathDetail';
import LearningModules from './dashboard/LearningModules';
import LearningModuleDetail from './dashboard/LearningModuleDetail';
import QuizEngine from './dashboard/QuizEngine';
import QuizTake from './dashboard/QuizTake';
import QuizResults from './dashboard/QuizResults';
import CVBuilder from './dashboard/CVBuilder';
import CVEdit from './dashboard/CVEdit';
import JobScanner from './dashboard/JobScanner';
import InterviewGenerator from './dashboard/InterviewGenerator';
import ChatAssistant from './dashboard/ChatAssistant';
import ProgressDashboard from './dashboard/ProgressDashboard';
import Recommendations from './dashboard/Recommendations';

const UserDashboard: React.FC = () => {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [notifications, setNotifications] = useState<string[]>([]);
    const isAuthenticated = !!user;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { path: '/dashboard', label: '🏠 Home', icon: '🏠', public: true },
        { path: '/dashboard/profile', label: '👤 Profile', icon: '👤', public: false },
        { path: '/dashboard/progress', label: '📊 Progress', icon: '📊', public: false },
        { path: '/dashboard/career-paths', label: '🎯 Career Paths', icon: '🎯', public: true },
        { path: '/dashboard/learning', label: '📚 Learning', icon: '📚', public: true },
        { path: '/dashboard/quizzes', label: '📝 Quizzes', icon: '📝', public: true },
        { path: '/dashboard/recommendations', label: '✨ Recommendations', icon: '✨', public: false },
        { path: '/dashboard/cv-builder', label: '📄 CV Builder', icon: '📄', public: false },
        { path: '/dashboard/job-scanner', label: '🔍 Job Scanner', icon: '🔍', public: false },
        { path: '/dashboard/interview', label: '💬 Interview Help', icon: '💬', public: true },
        { path: '/dashboard/chat', label: '🤖 AI Assistant', icon: '🤖', public: true },
    ];

    const currentPath = location.pathname;

    // Filter menu items based on authentication
    const visibleMenuItems = menuItems.filter(item => item.public || isAuthenticated);

    // Fetch notifications only if authenticated
    useEffect(() => {
        if (isAuthenticated) {
            const fetchNotifications = async () => {
                try {
                    const token = localStorage.getItem('access_token');
                    const response = await axios.get('/api/notifications/', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setNotifications(response.data);
                } catch (err) {
                    console.error('Failed to fetch notifications:', err);
                }
            };
            fetchNotifications();
        }
    }, [isAuthenticated]);

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-md sticky top-0 z-20">
                <div className="px-6 py-3 flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-bold text-blue-600">Career Pathway Tracker</h1>
                        <div className="hidden md:flex space-x-1">
                            {visibleMenuItems.slice(0, 5).map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                                        currentPath === item.path
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                            {visibleMenuItems.length > 5 && (
                                <div className="relative group">
                                    <button className="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
                                        More ▼
                                    </button>
                                    <div className="absolute hidden group-hover:block bg-white shadow-lg rounded-lg mt-1 w-48 z-10">
                                        {visibleMenuItems.slice(5).map((item) => (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                                {item.label}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        {/* Notifications - only for authenticated users */}
                        {isAuthenticated && (
                            <div className="relative">
                                <button className="text-gray-600 hover:text-gray-800">
                                    🔔
                                    {notifications.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                            {notifications.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        )}

                        {isAdmin && isAuthenticated && (
                            <Link
                                to="/admin"
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Admin Panel
                            </Link>
                        )}

                        {isAuthenticated ? (
                            <div className="flex items-center space-x-3">
                                <span className="text-sm text-gray-600">{user?.first_name}</span>
                                <button
                                    onClick={handleLogout}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-3">
                                <Link
                                    to="/login"
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
                                >
                                    Register
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-6">
                <Routes>
                    <Route index element={<DashboardHome />} />
                    <Route path="profile" element={<ProfileManagement />} />
                    <Route path="progress" element={<ProgressDashboard />} />
                    <Route path="career-paths" element={<CareerPaths />} />
                    <Route path="career-paths/:id" element={<CareerPathDetail />} />
                    <Route path="learning" element={<LearningModules />} />
                    <Route path="learning/:id" element={<LearningModuleDetail />} />
                    <Route path="quizzes" element={<QuizEngine />} />
                    <Route path="quizzes/take/:id" element={<QuizTake />} />
                    <Route path="quizzes/results/:id" element={<QuizResults />} />
                    <Route path="recommendations" element={<Recommendations />} />
                    <Route path="cv-builder" element={<CVBuilder />} />
                    <Route path="cv-builder/edit/:id" element={<CVEdit />} />
                    <Route path="job-scanner" element={<JobScanner />} />
                    <Route path="interview" element={<InterviewGenerator />} />
                    <Route path="chat" element={<ChatAssistant />} />
                </Routes>
            </main>
        </div>
    );
};

export default UserDashboard;