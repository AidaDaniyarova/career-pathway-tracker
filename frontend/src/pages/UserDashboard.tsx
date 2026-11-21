import React, { Suspense, useEffect } from "react";
import {Routes, Route, Link, useNavigate, useLocation} from 'react-router-dom';
import { useAuth } from '../context/auth';
import ProtectedRoute from '../components/ProtectedRoute';
import AIConsentManager from '../components/AIConsentManager';
import { openAIConsent } from '../components/aiConsentEvents';
import OnboardingManager from '../components/onboarding/OnboardingManager';
import { openTour } from '../components/onboarding/onboarding';

const DashboardHome = React.lazy(() => import('./dashboard/DashboardHome'));
const ProfileManagement = React.lazy(() => import('./dashboard/ProfileManagement'));
const CareerPaths = React.lazy(() => import('./dashboard/CareerPaths'));
const CareerPathDetail = React.lazy(() => import('./dashboard/CareerPathDetail'));
const LearningModules = React.lazy(() => import('./dashboard/LearningModules'));
const LearningModuleDetail = React.lazy(() => import('./dashboard/LearningModuleDetail'));
const QuizEngine = React.lazy(() => import('./dashboard/QuizEngine'));
const QuizTake = React.lazy(() => import('./dashboard/QuizTake'));
const QuizResults = React.lazy(() => import('./dashboard/QuizResults'));
const CVBuilder = React.lazy(() => import('./dashboard/CVBuilder'));
const CVEdit = React.lazy(() => import('./dashboard/CVEdit'));
const JobScanner = React.lazy(() => import('./dashboard/JobScanner'));
const InterviewGenerator = React.lazy(() => import('./dashboard/InterviewGenerator'));
const ProgressDashboard = React.lazy(() => import('./dashboard/ProgressDashboard'));
const Recommendations = React.lazy(() => import('./dashboard/Recommendations'));

/** Wraps pages that need a logged-in user. */
const Private: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ProtectedRoute>{children}</ProtectedRoute>
);

const UserDashboard: React.FC = () => {
    const {user, logout, isAdmin} = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isAuthenticated = !!user;

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const menuItems = [
        {path: '/dashboard', label: '🏠 Home', icon: '🏠', public: true},
        {path: '/dashboard/profile', label: '👤 Profile', icon: '👤', public: false},
        {path: '/dashboard/progress', label: '📊 Progress', icon: '📊', public: false},
        {path: '/dashboard/career-paths', label: '🎯 Career Paths', icon: '🎯', public: true},
        {path: '/dashboard/learning', label: '📚 Learning', icon: '📚', public: true},
        {path: '/dashboard/quizzes', label: '📝 Quizzes', icon: '📝', public: false},
        {path: '/dashboard/recommendations', label: '✨ Recommendations', icon: '✨', public: false},
        {path: '/dashboard/cv-builder', label: '📄 CV Builder', icon: '📄', public: false},
        {path: '/dashboard/job-scanner', label: '🔍 Job Scanner', icon: '🔍', public: false},
        {path: '/dashboard/interview', label: '💬 Interview Help', icon: '💬', public: true},
    ];

    const currentPath = location.pathname;

    // Filter menu items based on authentication
    const visibleMenuItems = menuItems.filter(item => item.public || isAuthenticated);

    useEffect(() => {
      // Check if user just completed a quiz
      const quizCompleted = sessionStorage.getItem('quiz_completed');
      if (quizCompleted === 'true' && window.location.pathname === '/dashboard/recommendations') {
        sessionStorage.removeItem('quiz_completed');
        // Force refresh of recommendations
        const event = new Event('quiz-completed');
        window.dispatchEvent(event);
      }
    }, []);

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

                                    <div className="absolute left-0 top-full invisible opacity-0 group-hover:visible group-hover:opacity-100
                                            transition-all duration-150 bg-white shadow-lg rounded-lg w-48 z-50 border border-gray-200">
                                        {visibleMenuItems.slice(5).map((item) => (
                                            <Link key={item.path} to={item.path}
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                {item.label}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
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
                <Suspense fallback={<div className="flex justify-center items-center h-64 text-gray-500">Loading…</div>}>
                <Routes>
                    <Route index element={<DashboardHome/>}/>
                    <Route path="profile" element={<Private><ProfileManagement/></Private>}/>
                    <Route path="progress" element={<Private><ProgressDashboard/></Private>}/>
                    <Route path="career-paths" element={<CareerPaths/>}/>
                    <Route path="career-paths/:id" element={<CareerPathDetail/>}/>
                    <Route path="learning" element={<LearningModules/>}/>
                    <Route path="learning/:id" element={<LearningModuleDetail/>}/>
                    <Route path="quizzes" element={<Private><QuizEngine/></Private>}/>
                    <Route path="quizzes/take/:id" element={<Private><QuizTake/></Private>}/>
                    <Route path="quizzes/results/:id" element={<Private><QuizResults/></Private>}/>
                    <Route path="recommendations" element={<Private><Recommendations/></Private>}/>
                    <Route path="cv-builder" element={<Private><CVBuilder/></Private>}/>
                    <Route path="cv-builder/edit/:id" element={<Private><CVEdit/></Private>}/>
                    <Route path="job-scanner" element={<Private><JobScanner/></Private>}/>
                    <Route path="interview" element={<InterviewGenerator/>}/>
                </Routes>
                </Suspense>
            </main>

            <footer className="container mx-auto px-4 pb-6 text-center text-xs text-gray-500">
                Some features use AI and may produce inaccurate results.{' '}
                {isAuthenticated && (
                    <>
                        <button type="button" onClick={openAIConsent} className="underline hover:text-gray-700">
                            AI &amp; privacy settings
                        </button>
                        {' · '}
                        <button type="button" onClick={openTour} className="underline hover:text-gray-700">
                            Getting started
                        </button>
                    </>
                )}
            </footer>

            {isAuthenticated && <AIConsentManager/>}
            {isAuthenticated && user && <OnboardingManager key={user.id}/>}
        </div>
    );
};

export default UserDashboard;