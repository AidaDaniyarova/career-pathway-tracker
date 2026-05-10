import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  enrollments_count: number;
  completed_modules: number;
  total_xp: number;
  current_streak: number;
  weekly_progress: { day: string; completions: number }[];
  skill_distribution: { name: string; value: number }[];
  recent_activity: { title: string; completed_at: string }[];
  recommendations: { title: string; match_score: number }[];
}

const DashboardHome: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/progress/dashboard/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
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

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const quickActions = [
    { title: 'Take a Quiz', icon: '📝', link: '/dashboard/quizzes', color: 'bg-blue-500' },
    { title: 'Continue Learning', icon: '📚', link: '/dashboard/learning', color: 'bg-green-500' },
    { title: 'Build CV', icon: '📄', link: '/dashboard/cv-builder', color: 'bg-purple-500' },
    { title: 'Chat with AI', icon: '🤖', link: '/dashboard/chat', color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back! 👋</h1>
        <p className="opacity-90">Continue your learning journey and track your progress.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">Enrolled Paths</div>
          <div className="text-2xl font-bold">{stats?.enrollments_count || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">Completed Modules</div>
          <div className="text-2xl font-bold">{stats?.completed_modules || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">Total XP</div>
          <div className="text-2xl font-bold">{stats?.total_xp || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">Current Streak</div>
          <div className="text-2xl font-bold flex items-center">
            {stats?.current_streak || 0} 🔥
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            to={action.link}
            className={`${action.color} text-white rounded-lg p-4 text-center hover:opacity-90 transition-opacity`}
          >
            <div className="text-2xl mb-1">{action.icon}</div>
            <div className="text-sm font-medium">{action.title}</div>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Progress Chart */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Weekly Progress</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stats?.weekly_progress || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="completions" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Skill Distribution Chart */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Skill Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={stats?.skill_distribution || []}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label
              >
                {(stats?.skill_distribution || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {stats?.recent_activity?.map((activity, idx) => (
              <div key={idx} className="flex justify-between items-center border-b pb-2">
                <span className="text-gray-700">{activity.title}</span>
                <span className="text-sm text-gray-400">
                  {new Date(activity.completed_at).toLocaleDateString()}
                </span>
              </div>
            ))}
            {(!stats?.recent_activity || stats.recent_activity.length === 0) && (
              <div className="text-center text-gray-500 py-4">
                No recent activity. Start learning!
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Recommended for You</h3>
          <div className="space-y-3">
            {stats?.recommendations?.map((rec, idx) => (
              <Link
                key={idx}
                to={`/dashboard/career-paths/${rec.id}`}
                className="flex justify-between items-center border-b pb-2 hover:bg-gray-50 p-2 rounded"
              >
                <span className="text-gray-700">{rec.title}</span>
                <span className="text-sm text-green-600">{rec.match_score}% match</span>
              </Link>
            ))}
            {(!stats?.recommendations || stats.recommendations.length === 0) && (
              <div className="text-center text-gray-500 py-4">
                Take a quiz to get personalized recommendations!
                <Link to="/dashboard/quizzes" className="block text-blue-600 mt-2">
                  Take Quiz →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;