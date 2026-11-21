import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizAPI } from '../../services/api';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: { id: string; text: string; is_correct?: boolean }[];
  points: number;
}

const QuizTake: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const startQuiz = useCallback(async () => {
    try {
      const response = await quizAPI.start(id!);
      setAttemptId(response.data.attempt_id);
      setQuestions(response.data.questions);
    } catch (err) {
      console.error('Failed to start quiz:', err);
      navigate('/dashboard/quizzes');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    // Loads run asynchronously; state is updated once each request resolves.
    const run = async () => {
      startQuiz();
    };
    run();
  }, [id, startQuiz]);

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const responses = Object.entries(answers).map(([questionId, answer]) => ({
        question_id: parseInt(questionId),
        answer
      }));
      const response = await quizAPI.submit(id!, attemptId!, responses);
      navigate(`/dashboard/quizzes/results/${id}`, { state: { results: response.data } });
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading quiz...</div>;
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Quiz</h1>
          <div className="text-sm text-gray-500">
            Question {currentIndex + 1} of {questions.length}
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h2 className="text-lg font-medium mb-4">{currentQuestion?.question_text}</h2>
        <div className="space-y-3">
          {currentQuestion?.options?.map((option) => (
            <label key={option.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="question"
                value={option.id}
                checked={answers[currentQuestion.id] === option.id}
                onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                className="mr-3"
              />
              {option.text}
            </label>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentIndex(prev => prev - 1)}
          disabled={currentIndex === 0}
          className="px-6 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
        >
          Previous
        </button>
        {currentIndex === questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex(prev => prev + 1)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizTake;