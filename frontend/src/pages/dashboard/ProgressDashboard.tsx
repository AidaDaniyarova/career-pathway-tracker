import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth';
import { progressAPI } from '../../services/api';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { showToast } from '../../components/toastStore';
import type { ApiError } from '../../utils/errors';

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

interface Module {
  id: string;
  title: string;
  description: string;
  content_type: string;
  duration_minutes: number;
  difficulty: string;
  xp_points: number;
  is_required: boolean;
  is_selected: boolean;
  is_completed: boolean;
  is_completed_globally?: boolean;
  progress_percent: number;
  order_index: number;
}

interface DashboardData {
  enrollments: Enrollment[];
  statistics: {
    total_xp?: number;
    level?: number;
    current_streak?: number;
    completed_modules?: number;
    total_enrollments?: number;
    total_time_spent?: { hours?: number };
  };
  in_progress_modules: unknown[];
  recent_activity: unknown[];
  top_skills: unknown[];
  recommendations: unknown[];
  weekly_activity: { day: string; completions: number }[];
}

const ProgressDashboard: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<Enrollment | null>(null);
  const [pathModules, setPathModules] = useState<Module[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pathToDelete, setPathToDelete] = useState<string | null>(null);
  const [editingModules, setEditingModules] = useState(false);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [savingModules, setSavingModules] = useState(false);

  // Add Module States
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [addingModule, setAddingModule] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await progressAPI.getDashboard();
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Loads run asynchronously; state is updated once each request resolves.
    const run = async () => {
    if (isAuthenticated) {
      fetchDashboardData();

      // Check if we need to refresh from module completion
      if (sessionStorage.getItem('shouldRefreshDashboard')) {
        sessionStorage.removeItem('shouldRefreshDashboard');
        // Force refresh
        fetchDashboardData();
      }
    }
    };
    run();
  }, [isAuthenticated, fetchDashboardData]);

  const fetchPathModules = async (careerPathId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`/api/learning/career-paths/${careerPathId}/selected-modules/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const modulesData = response.data.selected_modules || [];

      const normalizedModules = modulesData.map((m: Partial<Module> & { status?: string }) => ({
        id: m.id,
        title: m.title,
        description: m.description || 'Custom learning module',
        content_type: m.content_type || 'interactive',
        duration_minutes: m.duration_minutes || 0,
        difficulty: m.difficulty || 'intermediate',
        xp_points: m.xp_points || 10,
        is_required: m.is_required || false,
        is_selected: true,
        is_completed: m.is_completed || m.status === 'completed',
        progress_percent: m.progress_percent || 0,
        order_index: m.order_index || 999
      }));

      setPathModules(normalizedModules);

      // FIX: Add ALL active modules into the initial selected checkbox set
      const selected = new Set<string>();
      normalizedModules.forEach((module: Module) => {
        selected.add(module.id);
      });
      setSelectedModules(selected);
    } catch (err) {
      console.error('Failed to fetch modules:', err);
      setPathModules([]);
    }
  };

  const fetchAvailableModules = async (careerPathId: string, enrollmentId: string) => {
    setLoadingModules(true);
    try {
      const token = localStorage.getItem('access_token');
      let url = `/api/learning/career-paths/${careerPathId}/available-modules/?enrollment_id=${enrollmentId}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filterType) url += `&content_type=${filterType}`;
      if (filterDifficulty) url += `&difficulty=${filterDifficulty}`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableModules(response.data);
    } catch (err) {
      console.error('Failed to fetch available modules:', err);
      setAvailableModules([]);
    } finally {
      setLoadingModules(false);
    }
  };

  const handlePathClick = async (enrollment: Enrollment) => {
    setSelectedPath(enrollment);
    await fetchPathModules(enrollment.career_path);
    setEditingModules(false);
  };

  const handleDropPath = async () => {
    if (!pathToDelete) return;

    try {
      const token = localStorage.getItem('access_token');
      await axios.post(`/api/progress/enrollments/${pathToDelete}/drop/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowDeleteModal(false);
      setPathToDelete(null);
      await fetchDashboardData();
      if (selectedPath?.id === pathToDelete) {
        setSelectedPath(null);
        setPathModules([]);
      }
      showToast('Career path dropped successfully. You can re-enroll anytime.', 'success');
    } catch (err) {
      console.error('Failed to drop path:', err);
      showToast('Failed to drop path. Please try again.', 'error');
    } finally {
        await refreshAll();
    }
  };

  const toggleModuleSelection = (moduleId: string) => {
    setSelectedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const saveModuleChanges = async () => {
    if (!selectedPath) return;

    setSavingModules(true);
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(`/api/learning/career-paths/${selectedPath.career_path}/edit-modules/`, {
        selected_modules: Array.from(selectedModules),
        enrollment_id: selectedPath.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingModules(false);
      await fetchPathModules(selectedPath.career_path);
      await fetchDashboardData();
      showToast('Learning path updated successfully!', 'success');
    } catch (err) {
      console.error('Failed to save modules:', err);
      showToast('Failed to save changes. Please try again.', 'error');
    } finally {
      setSavingModules(false);
      await refreshAll();
    }
  };

  const addModuleToPath = async (moduleId: string) => {
  if (!selectedPath) return;

  setAddingModule(true);
  try {
    const token = localStorage.getItem('access_token');
    const response = await axios.post(
      `/api/learning/career-paths/${selectedPath.career_path}/add-module/`,
      {
        module_id: moduleId,
        enrollment_id: selectedPath.id
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Refresh modules list
    await fetchPathModules(selectedPath.career_path);
    await fetchDashboardData();

    // Also refresh available modules if modal is open
    if (showAddModal) {
      await fetchAvailableModules(selectedPath.career_path, selectedPath.id);
    }

    showToast(response.data.message, 'success');
    setShowAddModal(false);
  } catch (caught) {
    const err = caught as ApiError;
    console.error('Failed to add module:', err);
    showToast(err.response?.data?.error || 'Failed to add module', 'error');
  } finally {
    setAddingModule(false);
    await refreshAll();
  }
};

  const startModule = async (moduleId: string) => {
    try {
        const token = localStorage.getItem('access_token');
        const response = await axios.post('/api/progress/progress/start/', {
            module_id: moduleId,
            enrollment_id: selectedPath?.id
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // Store the enrollment_id if returned
        const enrollmentId = response.data.enrollment_id || selectedPath?.id;

        // Navigate with both module and enrollment info
        navigate(`/dashboard/learning/${moduleId}?enrollment_id=${enrollmentId}`);

        // Also store in sessionStorage for persistence
        sessionStorage.setItem('current_enrollment_id', enrollmentId);
        sessionStorage.setItem('current_module_id', moduleId);

    } catch (caught) {
      const err = caught as ApiError;
        console.error('Failed to start module:', err);
        showToast(err.response?.data?.error || 'Failed to start module', 'error');
    } finally {
      await refreshAll();
    }
};

  const openAddModuleModal = () => {
    if (selectedPath) {
      fetchAvailableModules(selectedPath.career_path, selectedPath.id);
      setShowAddModal(true);
    }
  };

  const refreshAll = async () => {
  await fetchDashboardData();
  if (selectedPath) {
    await fetchPathModules(selectedPath.career_path);
  }
};

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please login to view your progress dashboard.</p>
        <Link to="/login" className="inline-block mt-4 text-blue-600 hover:underline">Login</Link>
      </div>
    );
  }

  const weeklyData = data?.weekly_activity || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Learning Progress</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{data?.statistics?.total_xp || 0}</div>
          <div className="text-xs text-gray-500">Total XP</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">Level {data?.statistics?.level || 1}</div>
          <div className="text-xs text-gray-500">Current Level</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{data?.statistics?.current_streak || 0}</div>
          <div className="text-xs text-gray-500">Day Streak 🔥</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{data?.statistics?.completed_modules || 0}</div>
          <div className="text-xs text-gray-500">Completed Modules</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{data?.statistics?.total_enrollments || 0}</div>
          <div className="text-xs text-gray-500">Enrolled Paths</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-cyan-600">{data?.statistics?.total_time_spent?.hours || 0}</div>
          <div className="text-xs text-gray-500">Hours Spent</div>
        </div>
      </div>

      {/* Weekly Activity Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Weekly Activity</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="completions" fill="#3B82F6" name="Modules Completed" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* My Enrolled Paths Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">My Enrolled Career Paths</h2>
          <Link to="/dashboard/career-paths" className="text-blue-600 text-sm hover:underline">
            Browse More Paths →
          </Link>
        </div>
        <div className="space-y-4">
          {data?.enrollments && data.enrollments.length > 0 ? (
            data.enrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedPath?.id === enrollment.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => handlePathClick(enrollment)}
              >
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-800">{enrollment.career_path_title}</h3>
                    <p className="text-sm text-gray-500">{enrollment.career_path_industry}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-blue-600">{parseFloat(enrollment.progress_percent)}%</span>
                    <span className="text-sm text-gray-500 ml-2 capitalize">({enrollment.status})</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${enrollment.progress_percent}%` }} />
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPathToDelete(enrollment.id);
                      setShowDeleteModal(true);
                    }}
                    className="text-red-600 text-sm hover:text-red-800"
                  >
                    Drop Path
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">
              No career paths enrolled yet.
              <Link to="/dashboard/career-paths" className="block text-blue-600 mt-2">Browse Career Paths →</Link>
            </p>
          )}
        </div>
      </div>

      {/* Selected Path Details */}
      {selectedPath && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-semibold">
              {selectedPath.career_path_title} - Learning Modules ({pathModules.filter(m => m.is_selected && !m.is_completed).length} active)
            </h2>
            <div className="flex gap-2">
              <button
                onClick={openAddModuleModal}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                + Add Module
              </button>
              {editingModules ? (
                <>
                  <button
                    onClick={() => setEditingModules(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveModuleChanges}
                    disabled={savingModules}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingModules ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditingModules(true)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  ✏️ Remove Modules
                </button>
              )}
            </div>
          </div>

          {editingModules && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              💡 Uncheck the modules you want to remove from your learning path.
            </div>
          )}

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {pathModules.length > 0 ? (
              pathModules.filter(m => m.is_selected).map((module) => (
                <div
                  key={module.id}
                  className={`border rounded-lg p-4 ${editingModules && !module.is_completed ? 'hover:bg-gray-50' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {editingModules && (
                          <input
                            type="checkbox"
                            checked={selectedModules.has(module.id)}
                            onChange={() => toggleModuleSelection(module.id)}
                            className="w-4 h-4 mr-2"
                            // Disable if it's required (or add module.is_completed if you want to block removing finished ones)
                            disabled={module.is_required}
                          />
                        )}
                        <span className="font-medium">{module.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200">{module.content_type}</span>
                        <span className="text-xs text-gray-500">{module.duration_minutes} min</span>
                        <span className="text-xs text-gray-500 capitalize">{module.difficulty}</span>
                        {module.is_required && (
                          <span className="text-xs text-red-500">Required</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500">⭐ {module.xp_points} XP</span>
                        {module.progress_percent > 0 && module.progress_percent < 100 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">{module.progress_percent}%</span>
                            <div className="w-20 bg-gray-200 rounded-full h-1.5">
                              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${module.progress_percent}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {(module.is_completed || module.is_completed_globally) ? (
                      <span className="ml-4 text-green-600 text-sm">✓ Completed</span>
                    ) : (
                      <button
                        onClick={() => startModule(module.id)}
                        className="ml-4 bg-blue-600 text-white px-4 py-1 rounded text-sm"
                      >
                        {module.progress_percent > 0 ? 'Continue' : 'Start'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                No modules in your learning path. Click "Add Module" to add modules.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Add Module Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold">Add Modules to {selectedPath?.career_path_title}</h3>
            </div>

            {/* Search and Filters */}
            <div className="p-4 border-b bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Search modules..."
                  value={searchTerm}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchTerm(val);
                    if (selectedPath) {
                      fetchAvailableModules(selectedPath.career_path, selectedPath.id);
                    }
                  }}
                  className="px-3 py-2 border rounded-lg"
                />
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    if (selectedPath) {
                      fetchAvailableModules(selectedPath.career_path, selectedPath.id);
                    }
                  }}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="">All Types</option>
                  <option value="video">Video</option>
                  <option value="article">Article</option>
                  <option value="quiz">Quiz</option>
                  <option value="exercise">Exercise</option>
                </select>
                <select
                  value={filterDifficulty}
                  onChange={(e) => {
                    setFilterDifficulty(e.target.value);
                    if (selectedPath) {
                      fetchAvailableModules(selectedPath.career_path, selectedPath.id);
                    }
                  }}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="">All Difficulties</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            {/* Available Modules List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingModules ? (
                <div className="text-center py-8">Loading modules...</div>
              ) : availableModules.length > 0 ? (
                <div className="space-y-3">
                  {availableModules.map((module) => (
                    <div key={module.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{module.title}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200">{module.content_type}</span>
                            <span className="text-xs text-gray-500">{module.duration_minutes} min</span>
                            <span className="text-xs text-gray-500 capitalize">{module.difficulty}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{module.description?.substring(0, 150)}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-500">⭐ {module.xp_points} XP</span>
                          </div>
                        </div>
                        <button
                          onClick={() => addModuleToPath(module.id)}
                          disabled={addingModule}
                          className="ml-4 bg-green-600 text-white px-4 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No modules available to add. All modules may already be in your learning path.
                </div>
              )}
            </div>

            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSearchTerm('');
                  setFilterType('');
                  setFilterDifficulty('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Drop Career Path</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to drop this career path? All your progress will be lost.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDropPath}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Drop Path
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressDashboard;