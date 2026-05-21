import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

const QuizResults: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const results = location.state?.results;

  if (!results) {
    return <div className="text-center py-8">No results found.</div>;
  }

  const scoreColor = results.score >= 70 ? 'text-green-600' : results.score >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Quiz Results</h1>
        
        <div className="mb-6">
          <div className={`text-6xl font-bold ${scoreColor} mb-2`}>
            {Math.round(results.score)}%
          </div>
          <div className="text-gray-600">
            {results.passed ? (
              <span className="text-green-600">✓ Congratulations! You passed!</span>
            ) : (
              <span className="text-red-600">✗ You did not pass. Try again!</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-left">
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-sm text-gray-500">Total Points</div>
            <div className="font-semibold">{results.total_points}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-sm text-gray-500">Earned Points</div>
            <div className="font-semibold">{results.earned_points}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-sm text-gray-500">Time Spent</div>
            <div className="font-semibold">{Math.floor(results.time_spent / 60)}m {results.time_spent % 60}s</div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-sm text-gray-500">Questions</div>
            <div className="font-semibold">{results.responses?.length || 0}</div>
          </div>
        </div>

        {results.recommendations && results.recommendations.length > 0 && (
          <div className="mt-6 text-left border-t pt-6">
            <h2 className="text-lg font-semibold mb-3">Recommended Career Paths</h2>
            <div className="space-y-3">
              {results.recommendations.map((rec: any, idx: number) => (
                <Link key={idx} to={`/dashboard/career-paths/${rec.career_path_id}`} className="block border rounded-lg p-3 hover:bg-gray-50">
                  <div className="font-medium">{rec.title}</div>
                  <div className="text-sm text-gray-500">Match: {rec.match_percentage}%</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4 mt-8">
          <button onClick={() => navigate(`/dashboard/quizzes/take/${id}`)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
            Retake Quiz
          </button>
          <Link to="/dashboard/quizzes" className="flex-1 text-center border border-gray-300 py-2 rounded-lg hover:bg-gray-50">
            Back to Quizzes
          </Link>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;