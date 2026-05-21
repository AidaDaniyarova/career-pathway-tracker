import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { progressAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Enrollment {
  id: string;
  career_path: string;
  career_path_title: string;
  career_path_slug: string;
  career_path_industry: string;
  status: string;
  progress_percent: string;
  started_at: string;
}

interface Statistics {
  total_enrollments: number;
  active_enrollments: number;
  completed_enrollments: number;
  completed_modules: number;
  started_modules: number;
  completion_rate: number;
  total_xp: number;
  level: number;
  next_level_xp: number;
  current_streak: number;
  longest_streak: number;
  total_time_spent: {
    seconds: number;
    minutes: number;
    hours: number;
    display: string;
  };
}

interface Module {
  id: string;
  module: string;
  module_title: string;
  module_description: string;
  module_content_type: string;
  module_duration_minutes: number;
  module_difficulty: string;
  module_xp_points: number;
  module_is_required: boolean;
  enrollment: string;
  career_path_title: string;
  status: string;
  progress_percent: string;
  time_spent_seconds: number;
  score: number | null;
}

interface Skill {
  id: string;
  name: string;
  level: number;
}

interface Recommendation {
  id: string;
  career_path_id: string;
  title: string;
  slug: string;
  score: number;
}

interface WeeklyActivity {
  day: string;
  date: string;
  completions: number;
}

interface DashboardData {
  enrollments: Enrollment[];
  statistics: Statistics;
  in_progress_modules: Module[];
  recent_activity: Module[];
  top_skills: Skill[];
  recommendations: Recommendation[];
  weekly_activity: WeeklyActivity[];
}

const DashboardHome: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchDashboardData = async () => {
    try {
      const response = await progressAPI.getDashboard();
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      setError('Unable to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Public view for non-authenticated users
  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome to Career Pathway Tracker! 🎯</h1>
          <p className="text-lg opacity-90 mb-6">Your personalized platform to discover career paths, learn new skills, and prepare for your dream job.</p>
          <div className="flex gap-4 justify-center">
            <Link to="/login" className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100">Login</Link>
            <Link to="/register" className="bg-transparent border-2 border-white text-white px-6 py-2 rounded-lg font-medium hover:bg-white/10">Get Started Free</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="text-lg font-semibold mb-2">Career Paths</h3>
            <p className="text-gray-600">Explore various career paths and find the one that matches your interests.</p>
            <Link to="/dashboard/career-paths" className="inline-block mt-4 text-blue-600 hover:underline">Browse Paths →</Link>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-4xl mb-3">📚</div>
            <h3 className="text-lg font-semibold mb-2">Learning Modules</h3>
            <p className="text-gray-600">Access structured learning modules with videos, articles, and exercises.</p>
            <Link to="/dashboard/learning" className="inline-block mt-4 text-blue-600 hover:underline">Start Learning →</Link>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-4xl mb-3">📝</div>
            <h3 className="text-lg font-semibold mb-2">Quizzes</h3>
            <p className="text-gray-600">Get career recommendations after taking a quiz.</p>
            <Link to="/dashboard/quizzes" className="inline-block mt-4 text-blue-600 hover:underline">Take a quiz →</Link>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated user view
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button onClick={fetchDashboardData} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Try Again</button>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-8">No dashboard data available.</div>;
  }

  // Prepare chart data - ensure it's always an array
  const weeklyData = data.weekly_activity || [];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.first_name}! 👋</h1>
        <p className="opacity-90">Continue your learning journey and track your progress.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{data.statistics.total_xp}</div>
          <div className="text-xs text-gray-500">Total XP</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">Level {data.statistics.level}</div>
          <div className="text-xs text-gray-500">Current Level</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{data.statistics.current_streak}</div>
          <div className="text-xs text-gray-500">Day Streak 🔥</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{data.statistics.completed_modules}</div>
          <div className="text-xs text-gray-500">Completed Modules</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{data.statistics.total_enrollments}</div>
          <div className="text-xs text-gray-500">Enrolled Paths</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-cyan-600">{data.statistics.total_time_spent.hours}</div>
          <div className="text-xs text-gray-500">Hours Spent</div>
        </div>
      </div>

      {/* Readiness Score Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-800 mb-4">🎯 Learning Progress</h3>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600">{data.statistics.completion_rate}%</div>
            <div className="text-sm text-gray-500">Completion Rate</div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full" style={{ width: `${data.statistics.completion_rate}%` }} />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-gray-600 text-sm">
              {data.statistics.completed_modules} of {data.statistics.started_modules} modules completed
            </p>
          </div>
        </div>
      </div>

      {/* Weekly Progress Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Weekly Activity</h3>
        {weeklyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="completions" fill="#3B82F6" name="Modules Completed" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-8">No activity data available yet. Start learning!</p>
        )}
      </div>

      {/* Enrolled Paths */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-800">My Career Paths</h3>
          <Link to="/dashboard/career-paths" className="text-blue-600 text-sm hover:underline">Browse More →</Link>
        </div>
        <div className="space-y-3">
          {data.enrollments && data.enrollments.length > 0 ? (
            data.enrollments.map((enrollment) => (
              <div key={enrollment.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{enrollment.career_path_title}</span>
                  <span className="text-sm text-gray-500">{parseFloat(enrollment.progress_percent)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${enrollment.progress_percent}%` }} />
                </div>
                <Link to={`/dashboard/career-paths/${enrollment.career_path}`} className="text-sm text-blue-600 mt-2 inline-block">
                  Continue →
                </Link>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">
              No career paths enrolled. <Link to="/dashboard/career-paths" className="text-blue-600">Browse paths</Link>
            </p>
          )}
        </div>
      </div>

      {/* In Progress Modules */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Continue Learning</h3>
        <div className="space-y-3">
          {data.in_progress_modules && data.in_progress_modules.length > 0 ? (
            data.in_progress_modules.map((module) => (
              <div key={module.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{module.module_title}</span>
                    <div className="text-sm text-gray-500 mt-1">{parseFloat(module.progress_percent)}% complete</div>
                  </div>
                  <Link to={`/dashboard/learning/${module.module}`} className="bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700">
                    Continue
                  </Link>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${module.progress_percent}%` }} />
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">
              No modules in progress. <Link to="/dashboard/learning" className="text-blue-600">Start learning</Link>
            </p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Recent Activity</h3>
        <div className="space-y-2">
          {data.recent_activity && data.recent_activity.length > 0 ? (
            data.recent_activity.slice(0, 5).map((activity) => (
              <div key={activity.id} className="border-b pb-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{activity.module_title}</span>
                  <span className="text-xs text-gray-400 capitalize">{activity.status}</span>
                </div>
                <div className="text-sm text-gray-500">{activity.career_path_title}</div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No recent activity. Start learning!</p>
          )}
        </div>
      </div>

      {/* Top Skills */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Your Skills</h3>
        <div className="flex flex-wrap gap-2">
          {data.top_skills && data.top_skills.length > 0 ? (
            data.top_skills.map((skill) => (
              <div key={skill.id} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                {skill.name} (Level {skill.level})
              </div>
            ))
          ) : (
            <p className="text-gray-500">No skills added yet. Update your profile to add skills!</p>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Recommended for You</h3>
        <div className="space-y-2">
          {data.recommendations && data.recommendations.length > 0 ? (
            data.recommendations.map((rec) => (
              <Link key={rec.id} to={`/dashboard/career-paths/${rec.career_path_id}`} className="block border rounded-lg p-3 hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{rec.title}</span>
                  <span className="text-sm text-green-600">{rec.score}% match</span>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">
              Take a quiz to get personalized recommendations!
              <Link to="/dashboard/quizzes" className="block text-blue-600 mt-2">Take Quiz →</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;