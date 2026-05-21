import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { showToast } from "../../components/Toast.tsx";

interface Question {
  id: string;
  text: string;
  type: string;
  order: number;
  options: { id: string; text: string }[];
}

interface QuizData {
  id: string;
  title: string;
  description: string;
  total_questions: number;
  questions: Question[];
}

interface Recommendation {
  career_path_id: string;
  title: string;
  slug: string;
  description: string;
  industry: string;
  match_score: number;
  avg_salary_min: number;
  avg_salary_max: number;
  growth_outlook: string;
}

// Create axios instance with auth header
const api = axios.create({
  baseURL: '/api',
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const QuizEngine: React.FC = () => {
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [previousResults, setPreviousResults] = useState<any>(null);

  useEffect(() => {
    fetchQuiz();
  }, []);

  const fetchQuiz = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        showToast('Please log in to take the quiz', 'error');
        navigate('/login');
        return;
      }

      const response = await api.get('/quizzes/start/');
      setQuiz(response.data.quiz);
      setPreviousResults(response.data.previous_results);
    } catch (err: any) {
      console.error('Failed to fetch quiz:', err);
      if (err.response?.status === 401) {
        showToast('Please log in to take the quiz', 'error');
        navigate('/login');
      } else {
        showToast('Failed to load quiz. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleNext = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!quiz) return;

    // Check if all questions are answered
    if (Object.keys(answers).length < quiz.questions.length) {
      showToast(`Please answer all ${quiz.questions.length} questions before submitting.`, 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/quizzes/submit/', {
        quiz_id: quiz.id,
        responses: answers
      });

      // Store recommendations and show results inline
      setRecommendations(response.data.recommendations);
      setShowResults(true);

      // Also store in localStorage for AI recommendations page
      localStorage.setItem('quiz_recommendations', JSON.stringify(response.data.recommendations));
      localStorage.setItem('quiz_completed', 'true');
      localStorage.setItem('quiz_career_scores', JSON.stringify(response.data.career_scores));

    } catch (err: any) {
      console.error('Failed to submit quiz:', err);
      showToast(err.response?.data?.error || 'Failed to submit quiz. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setRecommendations([]);
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-blue-600';
  };

  const getMatchLevel = (score: number) => {
    if (score >= 70) return 'High Match';
    if (score >= 50) return 'Medium Match';
    if (score >= 30) return 'Potential Match';
    return 'Explore';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!quiz && !showResults) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No quiz available at the moment.</p>
      </div>
    );
  }

  // Show results page
  if (showResults) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8 mb-6">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold mb-2">Quiz Completed!</h1>
            <p className="text-gray-600">
              Based on your responses, here are the career paths that match your profile:
            </p>
          </div>

          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div
                key={rec.career_path_id}
                className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-3 flex-wrap gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-xl font-semibold text-gray-800">{rec.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rec.match_score >= 70 ? 'bg-green-100 text-green-700' :
                        rec.match_score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {getMatchLevel(rec.match_score)}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2">{rec.description}</p>
                    {rec.industry && (
                      <div className="text-sm text-gray-500 mb-1">Industry: {rec.industry}</div>
                    )}
                    {rec.avg_salary_min && rec.avg_salary_max && (
                      <div className="text-sm text-gray-500">
                        💰 Salary Range: ${rec.avg_salary_min.toLocaleString()} - ${rec.avg_salary_max.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${getScoreColor(rec.match_score)}`}>
                      {Math.round(rec.match_score)}%
                    </div>
                    <div className="text-sm text-gray-500">Match Score</div>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => navigate(`/dashboard/career-paths/${rec.career_path_id}`)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                  >
                    View Career Path →
                  </button>
                  <button
                    onClick={() => navigate('/dashboard/recommendations')}
                    className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 text-sm"
                  >
                    View All Recommendations
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={handleRestart}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              Take Quiz Again
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show quiz questions
  const currentQuestion = quiz!.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz!.questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === quiz!.questions.length - 1;
  const currentAnswer = answers[currentQuestion.id];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-2xl font-bold text-center mb-2">{quiz!.title}</h1>
        <p className="text-gray-600 text-center">{quiz!.description}</p>

        {previousResults && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center">
            <p className="text-sm text-blue-700">
              📊 You took this quiz before on {new Date(previousResults.completed_at).toLocaleDateString()}.
              Take it again to get updated recommendations!
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Question {currentQuestionIndex + 1} of {quiz!.questions.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-lg shadow p-8 mb-6">
        <h2 className="text-xl font-semibold mb-6">{currentQuestion.text}</h2>

        <div className="space-y-3">
          {currentQuestion.options.map((option) => (
            <label
              key={option.id}
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                currentAnswer === option.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name={`question_${currentQuestion.id}`}
                value={option.id}
                checked={currentAnswer === option.id}
                onChange={() => handleAnswer(currentQuestion.id, option.id)}
                className="w-4 h-4 text-blue-600 mr-3"
              />
              <span className="text-gray-700">{option.text}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            disabled={submitting || Object.keys(answers).length < quiz!.questions.length}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Analyzing...' : 'Get Recommendations'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizEngine;