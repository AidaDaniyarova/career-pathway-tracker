import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import type { DashboardStats } from '../../types';

const Overview: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getStats();
      setStats(response.data);
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 404) {
        setError('Dashboard stats endpoint not found. Please check backend configuration.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load dashboard statistics');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">Loading dashboard statistics...</div>
        <div className="text-xs text-gray-400 mt-2">Fetching data from server...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchStats}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Users', value: stats.users.total, color: 'blue' },
    { title: 'Active Users', value: stats.users.active, color: 'green' },
    { title: 'New Users (7d)', value: stats.users.new_last_7_days, color: 'purple' },
    { title: 'Career Paths', value: stats.content.career_paths, color: 'indigo' },
    { title: 'Learning Modules', value: stats.content.learning_modules, color: 'pink' },
    { title: 'Quizzes', value: stats.content.quizzes, color: 'yellow' },
    { title: 'Total Enrollments', value: stats.progress.total_enrollments, color: 'red' },
    { title: 'Completed Modules', value: stats.progress.completed_modules, color: 'teal' },
    { title: 'CVs Created', value: stats.ai.total_cvs, color: 'orange' },
    { title: 'Job Scans', value: stats.ai.total_job_scans, color: 'cyan' },
  ];

  const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      purple: 'from-purple-500 to-purple-600',
      indigo: 'from-indigo-500 to-indigo-600',
      pink: 'from-pink-500 to-pink-600',
      yellow: 'from-yellow-500 to-yellow-600',
      red: 'from-red-500 to-red-600',
      teal: 'from-teal-500 to-teal-600',
      orange: 'from-orange-500 to-orange-600',
      cyan: 'from-cyan-500 to-cyan-600',
    };
    return colors[color] || 'from-gray-500 to-gray-600';
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`bg-gradient-to-r ${getColorClass(card.color)} rounded-lg shadow-lg p-6 text-white`}
          >
            <div className="text-sm opacity-90 mb-2">{card.title}</div>
            <div className="text-3xl font-bold">{card.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Recent Users Section */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Users</h3>
        {stats.recent_users && stats.recent_users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Username</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Email</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Status</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.recent_users.slice(0, 5).map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 text-sm">{user.username}</td>
                    <td className="px-4 py-3 text-sm">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No recent users found.</div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Progress Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Module Completion Rate:</span>
              <span className="font-semibold">{stats.progress.module_completion_rate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Quiz Score:</span>
              <span className="font-semibold">{stats.ai.average_quiz_score}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average ATS Score:</span>
              <span className="font-semibold">{stats.ai.average_ats_score}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Content Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Questions:</span>
              <span className="font-semibold">{stats.content.questions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Skills:</span>
              <span className="font-semibold">{stats.content.skills}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Enrollments:</span>
              <span className="font-semibold">{stats.progress.active_enrollments}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;