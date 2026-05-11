import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

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
  progress_percent: number;
  order_index: number;
}

interface RequiredSkill {
  skill: {
    id: string;
    name: string;
  };
  importance: string;
}

interface CareerPathDetail {
  id: string;
  title: string;
  description: string;
  industry: string;
  required_skills: RequiredSkill[];
  modules: Module[];
  avg_salary_min: number;
  avg_salary_max: number;
  growth_outlook: string;
  is_enrolled: boolean;
  enrollment_status: string;
  enrollment_progress: number;
  enrollment_id: string | null;
}

const CareerPathDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [path, setPath] = useState<CareerPathDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingModules, setEditingModules] = useState(false);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem('access_token');
  const isAuthenticated = !!token;

  useEffect(() => {
    fetchPathDetail();
  }, [id]);

  const fetchPathDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      // Don't send Authorization header if no token
      const config: any = {};
      if (token) {
        config.headers = { Authorization: `Bearer ${token}` };
      }

      const response = await axios.get(`/api/learning/career-paths/${id}/`, config);
      setPath(response.data);

      const selected = new Set<string>();
      response.data.modules?.forEach((module: Module) => {
        if (module.is_selected && module.is_selected === true) {
          selected.add(module.id);
        }
      });
      setSelectedModules(selected);
    } catch (err: any) {
      console.error('Failed to fetch career path:', err);
      if (err.response?.status === 404) {
        setError('Career path not found.');
      } else {
        setError('Failed to load career path details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!token) {
      // Redirect to login if not authenticated
      window.location.href = '/login';
      return;
    }

    try {
      await axios.post(`/api/learning/career-paths/${id}/enroll/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPathDetail();
    } catch (err) {
      console.error('Failed to enroll:', err);
      alert('Failed to enroll. Please try again.');
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

  const saveModuleSelection = async () => {
    if (!token) {
      window.location.href = '/login';
      return;
    }

    setSaving(true);
    try {
      await axios.post(`/api/learning/career-paths/${id}/edit-modules/`,
        { selected_modules: Array.from(selectedModules) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingModules(false);
      fetchPathDetail();
    } catch (err) {
      console.error('Failed to save module selection:', err);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const startModule = async (moduleId: string) => {
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      await axios.post('/api/progress/progress/start/',
        { module_id: moduleId, enrollment_id: path?.enrollment_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/dashboard/learning/${moduleId}`);
    } catch (err) {
      console.error('Failed to start module:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => fetchPathDetail()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!path) {
    return <div className="text-center py-8">Career path not found.</div>;
  }

  const requiredModules = path.modules?.filter(m => m.is_required) || [];
  const electiveModules = path.modules?.filter(m => !m.is_required) || [];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{path.title}</h1>
        <p className="text-gray-600 mb-4">{path.description}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div>
            <div className="text-sm text-gray-500">Industry</div>
            <div className="font-medium">{path.industry || 'Various'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Salary Range</div>
            <div className="font-medium">
              {path.avg_salary_min && path.avg_salary_max
                ? `$${path.avg_salary_min.toLocaleString()} - $${path.avg_salary_max.toLocaleString()}`
                : 'Not specified'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Growth Outlook</div>
            <div className="font-medium capitalize">{path.growth_outlook || 'Growing'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Total Modules</div>
            <div className="font-medium">{path.modules?.length || 0}</div>
          </div>
        </div>

        {isAuthenticated && path.is_enrolled ? (
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-green-800 font-medium">✓ Enrolled</span>
                <span className="text-green-600 text-sm ml-2 capitalize">({path.enrollment_status})</span>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Progress: {path.enrollment_progress}%</div>
                <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: `${path.enrollment_progress}%` }} />
                </div>
              </div>
            </div>
          </div>
        ) : isAuthenticated ? (
          <button
            onClick={handleEnroll}
            className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Enroll Now
          </button>
        ) : (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg text-center">
            <p className="text-gray-600 mb-2">📚 Login to enroll in this career path and track your progress!</p>
            <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
          </div>
        )}
      </div>

      {/* Required Skills */}
      {path.required_skills && path.required_skills.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Required Skills</h2>
          <div className="flex flex-wrap gap-2">
            {path.required_skills.map((rs) => (
              <div key={rs.skill.id} className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <span className="font-medium text-blue-800">{rs.skill.name}</span>
                <span className="text-xs text-blue-600 ml-2">({rs.importance})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning Modules Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Learning Modules</h2>
          {isAuthenticated && path.is_enrolled && (
            <div className="flex gap-2">
              {editingModules ? (
                <>
                  <button
                    onClick={() => setEditingModules(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveModuleSelection}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditingModules(true)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  ✏️ Edit Learning Path
                </button>
              )}
            </div>
          )}
        </div>

        {editingModules && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            💡 Select the modules you want to include in your learning path. Unchecked modules will be removed.
          </div>
        )}

        {/* Required Modules */}
        {requiredModules.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium text-gray-700 mb-2">Core Modules (Required)</h3>
            <div className="space-y-3">
              {requiredModules.map((module) => (
                <div
                  key={module.id}
                  className={`border rounded-lg p-4 ${editingModules ? 'bg-gray-50' : ''}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {editingModules && (
                          <input
                            type="checkbox"
                            checked={selectedModules.has(module.id)}
                            onChange={() => toggleModuleSelection(module.id)}
                            className="w-4 h-4 mr-2"
                            disabled={module.is_required}
                          />
                        )}
                        <span className="font-medium">{module.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200">{module.content_type}</span>
                        <span className="text-xs text-gray-500">{module.duration_minutes} min</span>
                        <span className="text-xs text-gray-500 capitalize">{module.difficulty}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500">⭐ {module.xp_points} XP</span>
                        {module.is_completed && (
                          <span className="text-xs text-green-600">✓ Completed</span>
                        )}
                      </div>
                    </div>
                    {!editingModules && isAuthenticated && module.progress_percent > 0 && module.progress_percent < 100 && (
                      <div className="ml-4">
                        <div className="text-sm text-gray-500">{module.progress_percent}%</div>
                        <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${module.progress_percent}%` }} />
                        </div>
                      </div>
                    )}
                    {!editingModules && isAuthenticated && !module.is_completed && module.is_selected && (
                      <button
                        onClick={() => startModule(module.id)}
                        className="ml-4 bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Start
                      </button>
                    )}
                    {!editingModules && module.is_completed && (
                      <span className="ml-4 text-green-600 text-sm">✓ Completed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Elective Modules */}
        {electiveModules.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Elective Modules</h3>
            <div className="space-y-3">
              {electiveModules.map((module) => (
                <div
                  key={module.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    editingModules && selectedModules.has(module.id) ? 'border-blue-400 bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {editingModules && (
                          <input
                            type="checkbox"
                            checked={selectedModules.has(module.id)}
                            onChange={() => toggleModuleSelection(module.id)}
                            className="w-4 h-4 mr-2"
                          />
                        )}
                        <span className="font-medium">{module.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200">{module.content_type}</span>
                        <span className="text-xs text-gray-500">{module.duration_minutes} min</span>
                        <span className="text-xs text-gray-500 capitalize">{module.difficulty}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500">⭐ {module.xp_points} XP</span>
                        {module.is_completed && (
                          <span className="text-xs text-green-600">✓ Completed</span>
                        )}
                      </div>
                    </div>
                    {!editingModules && isAuthenticated && module.progress_percent > 0 && module.progress_percent < 100 && (
                      <div className="ml-4">
                        <div className="text-sm text-gray-500">{module.progress_percent}%</div>
                        <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${module.progress_percent}%` }} />
                        </div>
                      </div>
                    )}
                    {!editingModules && isAuthenticated && module.is_selected && !module.is_completed && (
                      <button
                        onClick={() => startModule(module.id)}
                        className="ml-4 bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Start
                      </button>
                    )}
                    {!editingModules && module.is_completed && (
                      <span className="ml-4 text-green-600 text-sm">✓ Completed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!editingModules && !isAuthenticated && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg text-center">
            <p className="text-gray-600">Login to enroll and track your progress through these modules!</p>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-6">
        <button onClick={() => navigate('/career-paths')} className="text-gray-600 hover:text-gray-800">
          ← Back to Career Paths
        </button>
        {isAuthenticated && path.is_enrolled && (
          <Link to="/dashboard/learning" className="text-blue-600 hover:text-blue-800">
            Go to My Learning →
          </Link>
        )}
      </div>
    </div>
  );
};

export default CareerPathDetail;