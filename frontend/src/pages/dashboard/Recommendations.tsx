import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface Recommendation {
  id: string;
  career_path_id: string;
  career_path_title: string;
  description: string;
  match_score: number;
  skill_gaps: string[];
  recommended_modules: { id: string; title: string }[];
  explanation: string;
}

const Recommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const response = await axios.get('/api/ai/recommendations/top/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecommendations(response.data);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return <div className="text-center py-8">Loading recommendations...</div>;
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <div className="text-4xl mb-4">🎯</div>
        <h2 className="text-xl font-semibold mb-2">No Recommendations Yet</h2>
        <p className="text-gray-500 mb-4">
          Complete the diagnostic quiz to get personalized career recommendations!
        </p>
        <Link
          to="/dashboard/quizzes"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Take Diagnostic Quiz
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">AI-Powered Career Recommendations</h1>
      
      <div className="space-y-6">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`bg-white rounded-lg shadow p-6 border-l-4 transition-all ${
              selectedPath === rec.id ? 'border-blue-500' : 'border-transparent hover:shadow-lg'
            }`}
            onClick={() => setSelectedPath(selectedPath === rec.id ? null : rec.id)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-semibold text-gray-800">{rec.career_path_title}</h2>
                  <span className={`text-lg font-bold ${getScoreColor(rec.match_score)}`}>
                    {Math.round(rec.match_score)}% Match
                  </span>
                </div>
                <p className="text-gray-600 mb-4">{rec.description}</p>
                
                {/* Explanation */}
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-600">🤖 AI Analysis</span>
                  </div>
                  <p className="text-gray-700 text-sm">{rec.explanation}</p>
                </div>

                {/* Expanded Details */}
                {selectedPath === rec.id && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    {/* Skill Gaps */}
                    {rec.skill_gaps && rec.skill_gaps.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-800 mb-2">📊 Skill Gaps to Address</h3>
                        <div className="flex flex-wrap gap-2">
                          {rec.skill_gaps.map((skill) => (
                            <span key={skill} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Modules */}
                    {rec.recommended_modules && rec.recommended_modules.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-800 mb-2">📚 Recommended Learning Modules</h3>
                        <div className="space-y-2">
                          {rec.recommended_modules.map((module) => (
                            <Link
                              key={module.id}
                              to={`/dashboard/learning/${module.id}`}
                              className="block border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                            >
                              {module.title}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <Link
                        to={`/dashboard/career-paths/${rec.career_path_id}`}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        View Career Path
                      </Link>
                      <button
                        onClick={() => {
                          // Generate CV with AI suggestions
                          window.location.href = `/dashboard/cv-builder?recommendation=${rec.id}`;
                        }}
                        className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50"
                      >
                        Generate AI CV Suggestions
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Expand/Collapse Icon */}
              <button className="text-gray-400 hover:text-gray-600">
                {selectedPath === rec.id ? '▲' : '▼'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Recommendations;