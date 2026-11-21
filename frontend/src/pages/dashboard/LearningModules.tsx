import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/auth';
import type { ApiError } from '../../utils/errors';

interface Module {
  id: string;
  title: string;
  description: string;
  content_type: string;
  duration_minutes: number;
  difficulty: string;
  xp_points: number;
  status?: string;
  progress_percent?: number;
}

const LearningModules: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/learning/modules/');

      // Extract modules array from paginated response
      let modulesData = [];
      if (response.data && response.data.results) {
        modulesData = response.data.results;
      } else if (Array.isArray(response.data)) {
        modulesData = response.data;
      } else {
        console.error('Unexpected response format:', response.data);
        modulesData = [];
      }

      // If authenticated, try to fetch progress
      if (isAuthenticated && modulesData.length > 0) {
        try {
          const progressResponse = await api.get('/progress/user-progress/');

          let progressData = [];
          if (progressResponse.data && progressResponse.data.results) {
            progressData = progressResponse.data.results;
          } else if (Array.isArray(progressResponse.data)) {
            progressData = progressResponse.data;
          }

          // Create progress map
          const progressMap = new Map();
          progressData.forEach((p: { module_id: string; status: string; progress_percent: number }) => {
            progressMap.set(p.module_id, p);
          });

          // Merge progress with modules
          const modulesWithProgress = modulesData.map((module: Module) => ({
            ...module,
            status: progressMap.get(module.id)?.status || 'not_started',
            progress_percent: progressMap.get(module.id)?.progress_percent || 0
          }));

          setModules(modulesWithProgress);
        } catch {
          setModules(modulesData.map((m: Module) => ({
            ...m,
            status: 'not_started',
            progress_percent: 0
          })));
        }
      } else {
        setModules(modulesData.map((m: Module) => ({
          ...m,
          status: 'preview',
          progress_percent: 0
        })));
      }
    } catch (caught) {
      const err = caught as ApiError;
      console.error('Failed to fetch modules:', err);
      setError(err.message || 'Failed to load modules');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Loads run asynchronously; state is updated once each request resolves.
    const run = async () => {
      fetchModules();
    };
    run();
  }, [fetchModules]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading modules...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          <p>Error loading modules: {error}</p>
          <button
            onClick={fetchModules}
            className="mt-2 bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Learning Modules</h1>
        {!isAuthenticated && (
          <div className="text-sm text-gray-500">
            <Link to="/login" className="text-blue-600 hover:underline">Login</Link> to track your progress
          </div>
        )}
      </div>

      {modules.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No modules available at the moment.</p>
          <Link to="/career-paths" className="text-blue-600 mt-2 inline-block">
            Browse Career Paths →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((module) => (
            <div key={module.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-xl font-semibold text-gray-800">{module.title}</h2>
                  {module.status === 'completed' && isAuthenticated && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">✓ Completed</span>
                  )}
                  {module.status === 'in_progress' && isAuthenticated && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">In Progress</span>
                  )}
                </div>

                <p className="text-gray-600 text-sm mb-4">{module.description?.substring(0, 120)}...</p>

                <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">📹 {module.content_type}</span>
                  <span className="flex items-center gap-1">⏱️ {module.duration_minutes} min</span>
                  <span className="flex items-center gap-1">📊 {module.difficulty}</span>
                  <span className="flex items-center gap-1">⭐ {module.xp_points} XP</span>
                </div>

                {isAuthenticated && module.status === 'in_progress' && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-1">Progress: {module.progress_percent}%</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 rounded-full h-2 transition-all duration-300"
                        style={{ width: `${module.progress_percent}%` }}
                      />
                    </div>
                  </div>
                )}

                <Link
                  to={`${module.id}`}
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center w-full"
                >
                  {!isAuthenticated ? 'View Module' :
                   module.status === 'completed' ? 'Review Module' :
                   module.status === 'in_progress' ? 'Continue Learning' : 'Start Module'}

                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LearningModules;