import React, {useState, useEffect} from 'react';
import {Routes, Route, Link, useNavigate, useLocation} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
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

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        {path: '/user/dashboard', label: '🏠 Home', icon: '🏠'},
        {path: '/user/dashboard/profile', label: '👤 Profile', icon: '👤'},
        {path: '/user/dashboard/progress', label: '📊 Progress', icon: '📊'},
        {path: '/user/dashboard/career-paths', label: '🎯 Career Paths', icon: '🎯'},
        {path: '/user/dashboard/learning', label: '📚 Learning', icon: '📚'},
        {path: '/user/dashboard/quizzes', label: '📝 Quizzes', icon: '📝'},
        {path: '/user/dashboard/recommendations', label: '✨ Recommendations', icon: '✨'},
        {path: '/user/dashboard/cv-builder', label: '📄 CV Builder', icon: '📄'},
        {path: '/user/dashboard/job-scanner', label: '🔍 Job Scanner', icon: '🔍'},
        {path: '/user/dashboard/interview', label: '💬 Interview Help', icon: '💬'},
        {path: '/user/dashboard/chat', label: '🤖 AI Assistant', icon: '🤖'},
    ];

    const currentPath = location.pathname;

    // Fetch notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const response = await axios.get('/api/notifications/', {
                    headers: {Authorization: `Bearer ${token}`}
                });
                setNotifications(response.data);
            } catch (err) {
                console.error('Failed to fetch notifications:', err);
            }
        };
        fetchNotifications();
    }, []);

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-md sticky top-0 z-20">
                <div className="px-6 py-3 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-bold text-blue-600">Career Pathway Tracker</h1>
                        <div className="hidden md:flex space-x-1">
                            {menuItems.slice(0, 5).map((item) => (
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
                            <div className="relative group">
                                <button className="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
                                    More ▼
                                </button>
                                <div
                                    className="absolute hidden group-hover:block bg-white shadow-lg rounded-lg mt-1 w-48 z-10">
                                    {menuItems.slice(5).map((item) => (
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
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        {/* Notifications */}
                        <div className="relative">
                            <button className="text-gray-600 hover:text-gray-800">
                                🔔
                                {notifications.length > 0 && (
                                    <span
                                        className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {notifications.length}
                  </span>
                                )}
                            </button>
                        </div>
                        <div className="flex items-center gap-4">
                            {/*<span className="text-gray-600">Welcome, {user.username}!</span>*/}
                            {isAdmin && (
                                <Link
                                    to="/admin"
                                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    Admin Panel
                                </Link>
                            )}
                            {/*<button*/}
                            {/*    onClick={handleLogout}*/}
                            {/*    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"*/}
                            {/*>*/}
                            {/*    Logout*/}
                            {/*</button>*/}
                        </div>
                        <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-600">{user?.username}</span>
                            <button
                                onClick={handleLogout}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-6">
                <Routes>
                    <Route index element={<DashboardHome/>}/>
                    <Route path="profile" element={<ProfileManagement/>}/>
                    <Route path="progress" element={<ProgressDashboard/>}/>
                    <Route path="career-paths" element={<CareerPaths/>}/>
                    <Route path="career-paths/:id" element={<CareerPathDetail/>}/>
                    <Route path="learning" element={<LearningModules/>}/>
                    <Route path="learning/:id" element={<LearningModuleDetail/>}/>
                    <Route path="quizzes" element={<QuizEngine/>}/>
                    <Route path="quizzes/take/:id" element={<QuizTake/>}/>
                    <Route path="quizzes/results/:id" element={<QuizResults/>}/>
                    <Route path="recommendations" element={<Recommendations/>}/>
                    <Route path="cv-builder" element={<CVBuilder/>}/>
                    <Route path="cv-builder/edit/:id" element={<CVEdit/>}/>
                    <Route path="job-scanner" element={<JobScanner/>}/>
                    <Route path="interview" element={<InterviewGenerator/>}/>
                    <Route path="chat" element={<ChatAssistant/>}/>
                </Routes>
            </main>
        </div>
    );
};

export default UserDashboard;