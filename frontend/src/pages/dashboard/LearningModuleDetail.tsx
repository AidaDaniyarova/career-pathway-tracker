import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface ModuleDetail {
  id: string;
  title: string;
  description: string;
  content_type: string;
  content_url: string;
  duration_minutes: number;
  difficulty: string;
  xp_points: number;
  prerequisites: { id: string; title: string; is_completed?: boolean }[];
  status: string;
  progress_percent: number;
  is_available: boolean;
  user_status?: string;
  user_progress_percent?: number;
  enrollment_id?: string;
}

const LearningModuleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [module, setModule] = useState<ModuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const encId = params.get('enrollment_id') || location.state?.enrollment_id;
    if (encId) {
      setEnrollmentId(encId);
    }
  }, [location]);

  useEffect(() => {
    if (id && id !== 'undefined') {
      fetchModule();
    } else {
      console.error('Invalid module ID:', id);
      setLoading(false);
    }
  }, [id]);

  const fetchModule = async () => {
    try {
      setLoading(true);
      const config: any = {};
      if (token) {
        config.headers = { Authorization: `Bearer ${token}` };
      }
      const response = await axios.get(`/api/learning/modules/${id}/`, config);
      setModule(response.data);
    } catch (err: any) {
      console.error('Failed to fetch module:', err);
      setError(err.response?.data?.error || 'Failed to load module');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!token) {
      alert('Please login again');
      navigate('/login');
      return;
    }

    setStarting(true);
    try {
      const requestBody: any = { module_id: id };
      if (enrollmentId) {
        requestBody.enrollment_id = enrollmentId;
      }

      console.log('Starting module with data:', requestBody);
      console.log('Using token:', token.substring(0, 20) + '...');

      const response = await axios.post('/api/progress/progress/start/',
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Start module response:', response.data);
      await fetchModule();
      alert('Module started! Good luck with your learning!');
    } catch (err: any) {
      console.error('Failed to start module:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to start module';
      alert(errorMsg);
    } finally {
      setStarting(false);
    }
  };

  const handleComplete = async () => {
  if (!isAuthenticated || !token) {
    navigate('/login');
    return;
  }

  setCompleting(true);
  try {
    const finalEnrollmentId = enrollmentId || (module as any)?.enrollment_id;

    const requestBody: any = { module_id: id };
    if (finalEnrollmentId) {
      requestBody.enrollment_id = finalEnrollmentId;
    }

    console.log('Completing module with enrollment_id:', finalEnrollmentId);

    const response = await axios({
      method: 'post',
      url: '/api/progress/progress/complete/',
      data: requestBody,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Complete response:', response.data);
    alert(`✅ Module completed! You earned ${response.data.xp_earned} XP!`);

    sessionStorage.setItem('shouldRefreshDashboard', 'true');
    navigate('/dashboard/progress');
  } catch (err: any) {
    console.error('Failed to complete module:', err);
    alert(err.response?.data?.error || 'Failed to complete module');
  } finally {
    setCompleting(false);
  }
};

  const formatTime = (minutes: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
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
        <button onClick={fetchModule} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          Try Again
        </button>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Module not found.</p>
        <button onClick={() => navigate('/dashboard/learning')} className="mt-4 text-blue-600 hover:underline">
          ← Back to Learning Modules
        </button>
      </div>
    );
  }

  const userProgress = module.user_progress_percent !== undefined ? module.user_progress_percent : module.progress_percent;
  const userStatus = module.user_status || module.status;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">{module.title}</h1>
        <div className="flex gap-3 text-sm text-gray-500 mb-4">
          <span>📹 {module.content_type}</span>
          <span>⏱️ {formatTime(module.duration_minutes)}</span>
          <span>📊 {module.difficulty}</span>
          <span>⭐ {module.xp_points} XP</span>
        </div>
        <p className="text-gray-600">{module.description}</p>

        {!isAuthenticated && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 Tip: <Link to="/login" className="font-semibold underline">Login</Link> to track your progress and earn XP points!
            </p>
          </div>
        )}
      </div>

      {/* Prerequisites Warning */}
      {module.prerequisites && module.prerequisites.length > 0 && !module.is_available && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Prerequisites Required</h3>
          <ul className="list-disc list-inside text-sm text-yellow-700">
            {module.prerequisites.map((prereq) => (
              <li key={prereq.id} className={prereq.is_completed ? 'line-through opacity-50' : ''}>
                {prereq.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Content</h2>
        {module.content_type === 'video' && module.content_url && (
          <div className="aspect-video bg-gray-100 rounded-lg">
            <iframe
              src={module.content_url}
              title={module.title}
              className="w-full h-full rounded-lg"
              allowFullScreen
            />
          </div>
        )}
        {module.content_type === 'article' && (
          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: module.description }} />
          </div>
        )}
        {module.content_type === 'quiz' && (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">This module contains a quiz to test your knowledge.</p>
            {isAuthenticated ? (
              <Link to={`/dashboard/quizzes/take/${module.id}`} className="bg-blue-600 text-white px-6 py-2 rounded-lg">
                Take Quiz
              </Link>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="bg-gray-400 text-white px-6 py-2 rounded-lg cursor-not-allowed"
              >
                Login to Take Quiz
              </button>
            )}
          </div>
        )}
      </div>

      {/* Progress Section - Only for authenticated users */}
      {isAuthenticated && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Your Progress</div>
              <div className="text-3xl font-bold text-blue-600">{userProgress}%</div>
              <div className="w-48 bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${userProgress}%` }} />
              </div>
            </div>
            <div>
              {userStatus === 'completed' ? (
                <div className="text-green-600 font-medium text-lg">✓ Completed</div>
              ) : userStatus === 'in_progress' ? (
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  {completing ? 'Completing...' : '✓ Mark as Complete'}
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  disabled={starting || !module.is_available}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {starting ? 'Starting...' : '▶ Start Module'}
                </button>
              )}
            </div>
          </div>

          {userStatus === 'completed' && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-green-700 text-sm">
                🎉 You've completed this module and earned {module.xp_points} XP!
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-4">
        <button onClick={() => navigate('/dashboard/learning')} className="text-gray-600 hover:text-gray-800">
          ← Back to Learning Modules
        </button>
      </div>
    </div>
  );
};

export default LearningModuleDetail;