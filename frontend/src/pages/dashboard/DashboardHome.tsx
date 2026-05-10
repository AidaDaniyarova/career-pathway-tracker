import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { progressAPI } from '../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardData {
  enrollments: any[];
  recent_activity: any[];
  total_xp: number;
  level: number;
  completed_modules: number;
  weekly_progress: { day: string; completions: number }[];
  skill_distribution: Record<string, number>;
  recommendations: any[];
}

const DashboardHome: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await progressAPI.getDashboard();
      setData(response.data);
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
  const skillData = data?.skill_distribution ? Object.entries(data.skill_distribution).map(([name, value]) => ({ name, value })) : [];

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
          <div className="text-gray-500 text-sm">Total XP</div>
          <div className="text-2xl font-bold">{data?.total_xp || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">Current Level</div>
          <div className="text-2xl font-bold">Level {data?.level || 1}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">Completed Modules</div>
          <div className="text-2xl font-bold">{data?.completed_modules || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">Enrolled Paths</div>
          <div className="text-2xl font-bold">{data?.enrollments?.length || 0}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/dashboard/quizzes" className="bg-blue-500 text-white rounded-lg p-4 text-center hover:opacity-90">
          <div className="text-2xl mb-1">📝</div>
          <div className="text-sm font-medium">Take Quiz</div>
        </Link>
        <Link to="/dashboard/learning" className="bg-green-500 text-white rounded-lg p-4 text-center hover:opacity-90">
          <div className="text-2xl mb-1">📚</div>
          <div className="text-sm font-medium">Continue Learning</div>
        </Link>
        <Link to="/dashboard/cv-builder" className="bg-purple-500 text-white rounded-lg p-4 text-center hover:opacity-90">
          <div className="text-2xl mb-1">📄</div>
          <div className="text-sm font-medium">Build CV</div>
        </Link>
        <Link to="/dashboard/chat" className="bg-orange-500 text-white rounded-lg p-4 text-center hover:opacity-90">
          <div className="text-2xl mb-1">🤖</div>
          <div className="text-sm font-medium">AI Assistant</div>
        </Link>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Progress Chart */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Weekly Progress</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data?.weekly_progress || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="completions" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Skill Distribution */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Skill Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={skillData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label
              >
                {skillData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Enrolled Paths */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-800">My Career Paths</h3>
          <Link to="/dashboard/career-paths" className="text-blue-600 text-sm hover:underline">
            Browse More →
          </Link>
        </div>
        <div className="space-y-3">
          {data?.enrollments?.map((enrollment) => (
            <div key={enrollment.id} className="border rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{enrollment.career_path?.title}</span>
                <span className="text-sm text-gray-500">{enrollment.progress_percent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${enrollment.progress_percent}%` }} />
              </div>
              <Link to={`/dashboard/career-paths/${enrollment.career_path?.id}`} className="text-sm text-blue-600 mt-2 inline-block">
                Continue →
              </Link>
            </div>
          ))}
          {(!data?.enrollments || data.enrollments.length === 0) && (
            <p className="text-gray-500 text-center py-4">No career paths enrolled. <Link to="/dashboard/career-paths" className="text-blue-600">Browse paths</Link></p>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-gray-800 mb-4">Recommended for You</h3>
        <div className="space-y-2">
          {data?.recommendations?.slice(0, 3).map((rec, idx) => (
            <Link key={idx} to={`/dashboard/career-paths/${rec.id}`} className="block border rounded-lg p-3 hover:bg-gray-50">
              <div className="flex justify-between items-center">
                <span className="font-medium">{rec.title}</span>
                <span className="text-sm text-green-600">{rec.match_score}% match</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{rec.description?.substring(0, 100)}...</p>
            </Link>
          ))}
          {(!data?.recommendations || data.recommendations.length === 0) && (
            <p className="text-gray-500 text-center py-4">Take a quiz to get personalized recommendations!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;