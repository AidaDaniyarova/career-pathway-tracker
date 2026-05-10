import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { careerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface Module {
  id: string;
  title: string;
  description: string;
  content_type: string;
  duration_minutes: number;
  difficulty: string;
  xp_points: number;
  is_required: boolean;
}

interface CareerPathDetail {
  id: string;
  title: string;
  description: string;
  industry: string;
  required_skills: { id: string; skill: string; skill_name: string; importance: string }[];
  modules: { module: Module; order_index: number }[];
  avg_salary_min: number;
  avg_salary_max: number;
  growth_outlook: string;
}

const CareerPathDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [path, setPath] = useState<CareerPathDetail | null>(null);
  const [userProgress, setUserProgress] = useState<Record<string, any>>({});
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    console.log('CareerPathDetail - ID from params:', id);
    if (id && id !== 'undefined') {
      fetchData();
    } else {
      console.error('Invalid career path ID:', id);
      setMessage({ type: 'error', text: 'Invalid career path ID' });
      setLoading(false);
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching career path with ID:', id);

      // Fetch career path details
      const pathRes = await careerAPI.getById(id!);
      console.log('Career path response:', pathRes.data);
      setPath(pathRes.data);

      // Try to fetch user progress if authenticated
      if (isAuthenticated) {
        try {
          const progressRes = await careerAPI.getProgress(id!);
          console.log('Progress response:', progressRes.data);
          setIsEnrolled(progressRes.data.enrolled);

          const progressMap: Record<string, any> = {};
          if (progressRes.data.modules_progress) {
            progressRes.data.modules_progress.forEach((p: any) => {
              progressMap[p.module_id] = p;
            });
          }
          setUserProgress(progressMap);
        } catch (err) {
          console.log('User not enrolled or progress fetch failed');
          setIsEnrolled(false);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch career path:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to load career path details'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      setMessage({ type: 'error', text: 'Please login to enroll in this career path' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setEnrolling(true);
    try {
      await careerAPI.enroll(id!);
      setIsEnrolled(true);
      setMessage({ type: 'success', text: 'Successfully enrolled! Start learning now!' });
      // Refresh progress data
      await fetchData();
    } catch (err: any) {
      if (err.response?.status === 401) {
        setMessage({ type: 'error', text: 'Please login to enroll' });
      } else if (err.response?.data?.message === 'Already enrolled') {
        setIsEnrolled(true);
        setMessage({ type: 'success', text: 'You are already enrolled!' });
      } else {
        setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to enroll' });
      }
    } finally {
      setEnrolling(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const getModuleStatus = (moduleId: string) => {
    const progress = userProgress[moduleId];
    if (progress?.status === 'completed') return 'completed';
    if (progress?.status === 'in_progress') return 'in_progress';
    return 'not_started';
  };

  if (loading) {
    return <div className="text-center py-8">Loading career path details...</div>;
  }

  if (!path) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Career path not found.</p>
        <button onClick={() => navigate('/user/dashboard/career-paths')} className="text-gray-600 hover:text-gray-800">
          ← Back to Career Paths
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {message && (
        <div className={`p-4 rounded-lg mb-4 ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{path.title}</h1>
        <p className="text-gray-600 mb-4">{path.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div>
            <div className="text-sm text-gray-500">Industry</div>
            <div className="font-medium">{path.industry}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Salary Range</div>
            <div className="font-medium">
              {path.avg_salary_min && path.avg_salary_max
                ? `$${Number(path.avg_salary_min).toLocaleString()} - $${Number(path.avg_salary_max).toLocaleString()}`
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

        {/* Enrollment Button */}
        <div className="mt-6 pt-4 border-t">
          {!isEnrolled ? (
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {enrolling ? 'Enrolling...' : (isAuthenticated ? 'Enroll Now' : 'Login to Enroll')}
            </button>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <span className="text-green-700">✓ You are enrolled in this career path</span>
            </div>
          )}

          {!isAuthenticated && !isEnrolled && (
            <p className="text-sm text-gray-500 text-center mt-2">
              <Link to="/login" className="text-blue-600 hover:underline">Login</Link> to enroll and track your progress
            </p>
          )}
        </div>
      </div>

      {/* Required Skills */}
      {path.required_skills && path.required_skills.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Required Skills</h2>
          <div className="flex flex-wrap gap-2">
            {path.required_skills.map((skill) => (
              <div key={skill.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="font-medium text-blue-800">{skill.skill_name}</div>
                <div className="text-sm text-blue-600">Importance: {skill.importance}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning Modules */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">
          Learning Modules
          {!isEnrolled && isAuthenticated && (
            <span className="text-sm text-gray-500 ml-2">(Enroll to track progress)</span>
          )}
          {!isAuthenticated && (
            <span className="text-sm text-gray-500 ml-2">(Login to enroll and track progress)</span>
          )}
        </h2>

        <div className="space-y-3">
          {path.modules?.map((item, index) => {
            const module = item.module;
            const status = isEnrolled ? getModuleStatus(module.id) : 'not_started';

            return (
              <div key={module.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-400 text-sm">#{index + 1}</span>
                      <span className="font-medium">{module.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200">{module.content_type}</span>
                      <span className="text-xs text-gray-500">{module.duration_minutes} min</span>
                    </div>
                    <p className="text-sm text-gray-600">{module.description?.substring(0, 100)}</p>

                    {status === 'completed' && (
                      <span className="text-xs text-green-600 mt-1 inline-block">✓ Completed</span>
                    )}
                    {status === 'in_progress' && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500">Progress: {userProgress[module.id]?.progress_percent || 0}%</div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${userProgress[module.id]?.progress_percent || 0}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    {!isEnrolled || !isAuthenticated ? (
                      <button
                        onClick={handleEnroll}
                        disabled={enrolling}
                        className="bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        {!isAuthenticated ? 'Login to Enroll' : 'Enroll to Start'}
                      </button>
                    ) : status === 'completed' ? (
                      <Link
                        to={`/learning/${module.id}`}
                        className="text-green-600 text-sm hover:underline"
                      >
                        Review
                      </Link>
                    ) : (
                      <Link
                        to={`/learning/${module.id}`}
                        className="bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        {status === 'in_progress' ? 'Continue' : 'Start'}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <button onClick={() => navigate('/career-paths')} className="text-gray-600 hover:text-gray-800">
          ← Back to Career Paths
        </button>
      </div>
    </div>
  );
};

export default CareerPathDetail;