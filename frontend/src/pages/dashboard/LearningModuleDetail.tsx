import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { moduleAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ModuleDetail {
  id: string;
  title: string;
  description: string;
  content_type: string;
  content_url: string;
  content_data: any;
  text_content: string;
  duration_minutes: number;
  difficulty: string;
  xp_points: number;
  prerequisites: { id: string; title: string; is_completed?: boolean }[];
  status: string;
  progress_percent: number;
  is_available: boolean;
}

const LearningModuleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [module, setModule] = useState<ModuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeSpent, setTimeSpent] = useState(0);
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    console.log('LearningModuleDetail - ID from params:', id);
    if (id && id !== 'undefined') {
      fetchModule();
    } else {
      console.error('Invalid module ID:', id);
      setLoading(false);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [id]);

  const fetchModule = async () => {
    try {
      setLoading(true);
      console.log('Fetching module with ID:', id);
      const response = await moduleAPI.getById(id!);
      console.log('Module response:', response.data);
      setModule(response.data);

      // Only track time if authenticated and module is in progress
      if (isAuthenticated && response.data.status === 'in_progress' && response.data.time_spent_seconds) {
        setTimeSpent(response.data.time_spent_seconds);
      }
    } catch (err: any) {
      console.error('Failed to fetch module:', err);
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    if (!isAuthenticated) return;
    if (timerInterval) return;
    const interval = setInterval(async () => {
      setTimeSpent(prev => {
        const newTime = prev + 60;
        if (isAuthenticated) {
          moduleAPI.updateTime(id!, 60).catch(console.error);
        }
        return newTime;
      });
    }, 60000);
    setTimerInterval(interval);
  };

  const handleStart = async () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      setTimeout(() => setShowAuthPrompt(false), 3000);
      return;
    }

    try {
      await moduleAPI.start(id!);
      startTimer();
      fetchModule();
    } catch (err) {
      console.error('Failed to start module:', err);
    }
  };

  const handleComplete = async () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    try {
      await moduleAPI.complete(id!);
      if (timerInterval) clearInterval(timerInterval);
      navigate('/learning');
    } catch (err) {
      console.error('Failed to complete module:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (loading) {
    return <div className="text-center py-8">Loading module...</div>;
  }

  if (!module) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Module not found.</p>
        <button onClick={() => navigate('/learning')} className="mt-4 text-blue-600 hover:underline">
          ← Back to Learning Modules
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Auth Prompt */}
      {showAuthPrompt && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-800">
            Please <Link to="/login" className="font-semibold underline">login</Link> to track your progress and earn XP!
          </p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">{module.title}</h1>
        <div className="flex gap-3 text-sm text-gray-500 mb-4">
          <span>📹 {module.content_type}</span>
          <span>⏱️ {module.duration_minutes} min</span>
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
      {!module.is_available && module.prerequisites && module.prerequisites.length > 0 && (
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
            <div dangerouslySetInnerHTML={{ __html: module.text_content || module.description }} />
          </div>
        )}
        {module.content_type === 'quiz' && (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">This module contains a quiz to test your knowledge.</p>
            {isAuthenticated ? (
              <Link to={`/quizzes/take/${module.id}`} className="bg-blue-600 text-white px-6 py-2 rounded-lg">
                Take Quiz
              </Link>
            ) : (
              <button
                onClick={() => setShowAuthPrompt(true)}
                className="bg-gray-400 text-white px-6 py-2 rounded-lg cursor-not-allowed"
              >
                Login to Take Quiz
              </button>
            )}
          </div>
        )}
      </div>

      {/* Progress Section */}
      {isAuthenticated && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-500 mb-1">Your Progress</div>
              <div className="text-2xl font-bold">{module.progress_percent}%</div>
              <div className="w-48 bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${module.progress_percent}%` }} />
              </div>
              {module.status === 'in_progress' && (
                <div className="text-sm text-gray-500 mt-2">Time spent: {formatTime(timeSpent)}</div>
              )}
            </div>
            {module.status === 'completed' ? (
              <div className="text-green-600 font-medium">✓ Completed</div>
            ) : module.status === 'in_progress' ? (
              <button
                onClick={handleComplete}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                Mark as Complete
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={!module.is_available}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Start Module
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-6">
        <button onClick={() => navigate('/learning')} className="text-gray-600 hover:text-gray-800">
          ← Back to Learning Modules
        </button>
      </div>
    </div>
  );
};

export default LearningModuleDetail;