import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { showToast } from "../../components/Toast.tsx";

interface Recommendation {
  career_path: {
    id: string;
    title: string;
    slug: string;
    description: string;
    industry: string;
    avg_salary_min: number;
    avg_salary_max: number;
    growth_outlook: string;
  };
  match_score: number;
  score_breakdown?: {
    quiz?: number;
    skills?: number;
    progress?: number;
    cv?: number;
  };
  skill_analysis?: {
    matched_skills: string[];
    missing_skills: string[];
    total_required: number;
    total_matched: number;
    completion_percentage: number;
  };
  sources?: {
    quiz?: boolean;
    cv?: boolean;
    skills?: boolean;
    progress?: boolean;
  };
  created_at: string;
}

const Recommendations: React.FC = () => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async (refresh = false) => {
    try {
      const token = localStorage.getItem('access_token');
      const url = refresh ? '/api/ai/recommendations/?refresh=true' : '/api/ai/recommendations/';
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Handle both array response and object with results
      let data = response.data;
      if (data && data.results) {
        data = data.results;
      }

      // Ensure data is an array and filter out any invalid entries
      const validData = Array.isArray(data) ? data.filter(item => item && item.career_path) : [];

      console.log('Loaded recommendations:', validData.length);
      setRecommendations(validData);

      if (refresh) {
        showToast('Recommendations refreshed!', 'success');
      }
    } catch (err: any) {
      console.error('Failed to fetch recommendations:', err);
      showToast('Failed to load recommendations', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRecommendations(true);
  };

  const getMatchLevel = (score: number) => {
    if (score >= 70) return { text: 'High Match', color: 'bg-green-100 text-green-800' };
    if (score >= 50) return { text: 'Medium Match', color: 'bg-yellow-100 text-yellow-800' };
    if (score >= 30) return { text: 'Potential Match', color: 'bg-blue-100 text-blue-800' };
    return { text: 'Explore', color: 'bg-gray-100 text-gray-800' };
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    if (score >= 30) return 'text-blue-600';
    return 'text-gray-600';
  };

  const formatSalary = (salary: number) => {
    if (!salary) return 'N/A';
    return salary.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Career Recommendations</h1>
          <p className="text-gray-500 mt-1">
            Based on your quiz results, skills, and progress
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <span>🔄</span>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Quiz Reminder */}
      {recommendations.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">📝</div>
          <h3 className="text-lg font-semibold text-blue-800 mb-2">No Recommendations Yet</h3>
          <p className="text-blue-600 mb-4">
            Take the career assessment quiz to get personalized career recommendations.
          </p>
          <button
            onClick={() => navigate('/quiz')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Take the Quiz →
          </button>
        </div>
      )}

      {/* Recommendations List */}
      <div className="space-y-4">
        {recommendations.map((rec, index) => {
          const matchLevel = getMatchLevel(rec.match_score);
          const sources = rec.sources || { quiz: false, cv: false, skills: false, progress: false };
          const scoreBreakdown = rec.score_breakdown || {};
          const skillAnalysis = rec.skill_analysis || {
            matched_skills: [],
            missing_skills: [],
            total_required: 0,
            total_matched: 0,
            completion_percentage: 0
          };

          return (
            <div
              key={rec.career_path.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
            >
              {/* Header with rank and score */}
              <div className={`p-4 ${index === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50' : 'bg-gray-50'} border-b`}>
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-gray-400">#{index + 1}</div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">{rec.career_path.title}</h2>
                      {rec.career_path.industry && (
                        <p className="text-sm text-gray-500">{rec.career_path.industry}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${matchLevel.color}`}>
                      {matchLevel.text}
                    </span>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getScoreColor(rec.match_score)}`}>
                        {Math.round(rec.match_score)}%
                      </div>
                      <div className="text-xs text-gray-500">Match Score</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-4">
                {/* Description */}
                <p className="text-gray-600 mb-4">{rec.career_path.description}</p>

                {/* Salary Info */}
                {(rec.career_path.avg_salary_min || rec.career_path.avg_salary_max) && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-700 flex-wrap">
                      <span>💰</span>
                      <span className="font-medium">Salary Range:</span>
                      <span>
                        ${formatSalary(rec.career_path.avg_salary_min)} - ${formatSalary(rec.career_path.avg_salary_max)}
                      </span>
                      {rec.career_path.growth_outlook && (
                        <span className="text-green-600 text-sm">
                          • {rec.career_path.growth_outlook} growth outlook
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Sources Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {sources.quiz && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">📊 Quiz Results</span>
                  )}
                  {sources.skills && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">🔧 Skills Match</span>
                  )}
                  {sources.cv && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">📄 CV Analysis</span>
                  )}
                  {sources.progress && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">📈 Learning Progress</span>
                  )}
                </div>

                {/* Score Breakdown */}
                {Object.keys(scoreBreakdown).length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Score Breakdown:</p>
                    <div className="flex flex-wrap gap-3">
                      {scoreBreakdown.quiz !== undefined && scoreBreakdown.quiz > 0 && (
                        <div className="text-sm">
                          <span className="text-gray-500">Quiz:</span>
                          <span className="ml-1 font-medium">{Math.round(scoreBreakdown.quiz)}%</span>
                        </div>
                      )}
                      {scoreBreakdown.skills !== undefined && scoreBreakdown.skills > 0 && (
                        <div className="text-sm">
                          <span className="text-gray-500">Skills:</span>
                          <span className="ml-1 font-medium">{Math.round(scoreBreakdown.skills)}%</span>
                        </div>
                      )}
                      {scoreBreakdown.progress !== undefined && scoreBreakdown.progress > 0 && (
                        <div className="text-sm">
                          <span className="text-gray-500">Progress:</span>
                          <span className="ml-1 font-medium">{Math.round(scoreBreakdown.progress)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Skill Analysis */}
                {skillAnalysis.total_required > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700">Skill Match</span>
                      <span className="text-sm">
                        {skillAnalysis.total_matched} / {skillAnalysis.total_required} skills
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${skillAnalysis.completion_percentage || 0}%` }}
                      />
                    </div>
                    {skillAnalysis.matched_skills && skillAnalysis.matched_skills.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs text-gray-500">✓ Your skills:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {skillAnalysis.matched_skills.slice(0, 5).map((skill, i) => (
                            <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              {skill}
                            </span>
                          ))}
                          {skillAnalysis.matched_skills.length > 5 && (
                            <span className="text-xs text-gray-400">+{skillAnalysis.matched_skills.length - 5} more</span>
                          )}
                        </div>
                      </div>
                    )}
                    {skillAnalysis.missing_skills && skillAnalysis.missing_skills.length > 0 && (
                      <div>
                        <span className="text-xs text-gray-500">⚠️ Skills to develop:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {skillAnalysis.missing_skills.slice(0, 5).map((skill, i) => (
                            <span key={i} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                              {skill}
                            </span>
                          ))}
                          {skillAnalysis.missing_skills.length > 5 && (
                            <span className="text-xs text-gray-400">+{skillAnalysis.missing_skills.length - 5} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/dashboard/career-paths/${rec.career_path.id}`)}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Career Path →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-blue-700">
            💡 These recommendations are based on your quiz answers. Take the quiz again to update your recommendations!
          </p>
          <button
            onClick={() => navigate('/quiz')}
            className="mt-2 text-blue-600 hover:underline text-sm"
          >
            Retake Quiz →
          </button>
        </div>
      )}
    </div>
  );
};

export default Recommendations;