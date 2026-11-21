import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import type { DashboardStats } from '../../types';
import type { ApiError } from '../../utils/errors';

const Overview: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getStats();
      console.log('Stats response:', response.data); // Debug log
      setStats(response.data);
    } catch (caught) {
      const err = caught as ApiError;
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
  }, []);

  useEffect(() => {
    // Loads run asynchronously; state is updated once each request resolves.
    const run = async () => {
      fetchStats();
    };
    run();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="ml-3 text-gray-500">Loading dashboard statistics...</div>
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
    { title: 'Total Users', value: stats.users?.total || 0, color: 'blue' },
    { title: 'Active Users', value: stats.users?.active || 0, color: 'green' },
    { title: 'New Users (7d)', value: stats.users?.new_last_7_days || 0, color: 'purple' },
    { title: 'Career Paths', value: stats.content?.career_paths || 0, color: 'indigo' },
    { title: 'Learning Modules', value: stats.content?.learning_modules || 0, color: 'pink' },
    { title: 'Quizzes', value: stats.content?.career_quizzes || 0, color: 'yellow' },
    { title: 'Total Enrollments', value: stats.progress?.total_enrollments || 0, color: 'red' },
    { title: 'Completed Modules', value: stats.progress?.completed_modules || 0, color: 'teal' },
    { title: 'CVs Created', value: stats.ai?.total_cvs || 0, color: 'orange' },
    { title: 'Job Scans', value: stats.ai?.total_job_scans || 0, color: 'cyan' },
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

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`bg-gradient-to-r ${getColorClass(card.color)} rounded-lg shadow-lg p-4 text-white`}
          >
            <div className="text-xs opacity-90 mb-1">{card.title}</div>
            <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Progress Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Progress Metrics</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Module Completion Rate</span>
                <span className="font-semibold">{stats.progress?.module_completion_rate || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${stats.progress?.module_completion_rate || 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Average ATS Score</span>
                <span className="font-semibold">{stats.ai?.average_ats_score || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${stats.ai?.average_ats_score || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Content Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Quiz Questions:</span>
              <span className="font-semibold">{stats.content?.quiz_questions || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Skills:</span>
              <span className="font-semibold">{stats.content?.skills || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Enrollments:</span>
              <span className="font-semibold">{stats.progress?.active_enrollments || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completed Enrollments:</span>
              <span className="font-semibold">{stats.progress?.completed_enrollments || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quiz Analytics</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Responses:</span>
              <span className="font-semibold">{stats.quiz_analytics?.total_responses || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Recommendations:</span>
              <span className="font-semibold">{stats.ai?.total_recommendations || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Users Section */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Recent Users</h3>
        </div>
        <div className="p-6">
          {stats.recent_users && stats.recent_users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Username</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.recent_users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{user.username}</td>
                      <td className="px-4 py-3 text-sm">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
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
      </div>

      {/* Recent Enrollments Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Recent Enrollments</h3>
        </div>
        <div className="p-6">
          {stats.recent_enrollments && stats.recent_enrollments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">User</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Career Path</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Progress</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.recent_enrollments.map((enrollment) => (
                    <tr key={enrollment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{enrollment.username}</td>
                      <td className="px-4 py-3 text-sm">{enrollment.career_path_title}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          enrollment.status === 'completed' ? 'bg-green-100 text-green-800' :
                          enrollment.status === 'dropped' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {enrollment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{parseFloat(enrollment.progress_percent)}%</span>
                          <div className="flex-1 w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${enrollment.progress_percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{new Date(enrollment.started_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No recent enrollments found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Overview;