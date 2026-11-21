import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { showToast } from '../../components/toastStore';
import ConfirmationModal from "../../components/ConfirmationModal.tsx";
import { useAuth } from "../../context/auth";
import { Link } from 'react-router-dom';
import AIDisclaimer from '../../components/AIDisclaimer';
import type { ApiError } from '../../utils/errors';

interface Question {
  id: string;
  question_text: string;
  category: string;
  difficulty: string;
  suggested_answer: string;
  answer_tips: string;
  related_skills: string[];
}

interface SavedAnswer {
  id: string;
  question_text: string;
  question_category: string;
  answer_text: string;
  job_title: string;
  created_at: string;
  updated_at: string;
}

interface CVSummary {
  id: string;
  title: string;
  is_default?: boolean;
}

const InterviewGenerator: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCV, setSelectedCV] = useState<string>('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [cvs, setCvs] = useState<CVSummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswer[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [showSavedAnswerModal, setShowSavedAnswerModal] = useState(false);
  const [selectedSavedAnswer, setSelectedSavedAnswer] = useState<SavedAnswer | null>(null);
   const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [answerToDelete, setAnswerToDelete] = useState<SavedAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const token = localStorage.getItem('access_token');
   const confirmDeleteAnswer = (answer: SavedAnswer, e: React.MouseEvent) => {
    e.stopPropagation();
    setAnswerToDelete(answer);
    setShowDeleteModal(true);
  };

  const handleDeleteAnswer = async () => {
    if (!answerToDelete) return;

    try {
      await axios.delete(`/api/ai/interview-answers/${answerToDelete.id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchSavedAnswers();
      showToast('Answer deleted successfully', 'success');
    } catch (err) {
      console.error('Failed to delete answer:', err);
      showToast('Failed to delete answer', 'error');
    } finally {
      setShowDeleteModal(false);
      setAnswerToDelete(null);
    }
  };

  const cancelDeleteAnswer = () => {
    setShowDeleteModal(false);
    setAnswerToDelete(null);
  };

  const fetchCVs = useCallback(async () => {
    try {
      const response = await axios.get('/api/cv/cvs/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      let cvsData = [];
      if (Array.isArray(response.data)) {
        cvsData = response.data;
      } else if (response.data.results) {
        cvsData = response.data.results;
      } else {
        cvsData = [];
      }
      setCvs(cvsData);
      if (cvsData.length > 0) {
        const defaultCV = cvsData.find((cv: CVSummary) => cv.is_default);
        setSelectedCV(defaultCV?.id || cvsData[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch CVs:', err);
    }
  }, [token]);

  const fetchSavedAnswers = useCallback(async () => {
    setLoadingAnswers(true);
    try {
      const response = await axios.get('/api/ai/interview-answers/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSavedAnswers(response.data);
    } catch (err) {
      console.error('Failed to fetch saved answers:', err);
    } finally {
      setLoadingAnswers(false);
    }
  }, [token]);

  useEffect(() => {
    // Loads run asynchronously; state is updated once each request resolves.
    const run = async () => {
      fetchCVs();
      fetchSavedAnswers();
    };
    run();
  }, [fetchCVs, fetchSavedAnswers]);

  const generateQuestions = async () => {
    if (!jobDescription.trim()) {
      showToast('Please enter a job description', 'warning');
      return;
    }

    setLoading(true);
    setQuestions([]);
    setUserAnswers({});
    setError(null);

    try {
      const response = await axios.post('/api/ai/interview-questions/',
        {
          cv_id: selectedCV,
          job_title: jobTitle || 'Job Position',
          job_description: jobDescription
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let questionsData = [];
      if (response.data.questions && Array.isArray(response.data.questions)) {
        questionsData = response.data.questions;
      } else if (Array.isArray(response.data)) {
        questionsData = response.data;
      } else {
        questionsData = [];
      }

      setQuestions(questionsData);

      if (questionsData.length === 0) {
        setError('No questions generated. Please try a different job description.');
      }
    } catch (caught) {
      const err = caught as ApiError;
      console.error('Failed to generate questions:', err);
      setError(err.response?.data?.error || 'Failed to generate questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveAnswer = async (question: Question, answer: string) => {
    if (!answer.trim()) {
      showToast('Please write an answer before saving', 'warning');
      return;
    }

    setUserAnswers(prev => ({ ...prev, [question.id]: answer }));

    try {
      await axios.post('/api/ai/interview-answers/save/',
        {
          question_text: question.question_text,
          question_category: question.category,
          answer_text: answer,
          job_title: jobTitle || 'General'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh saved answers list
      await fetchSavedAnswers();

      // Show success indicator
      const saveIndicator = document.getElementById(`save-${question.id}`);
      if (saveIndicator) {
        saveIndicator.textContent = '✓ Saved!';
        saveIndicator.classList.add('text-green-600');
        setTimeout(() => {
          saveIndicator.textContent = 'Save Answer';
          saveIndicator.classList.remove('text-green-600');
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to save answer:', err);
      showToast('Failed to save answer. Please try again.', 'error');
    }
  };

  const viewSavedAnswer = (answer: SavedAnswer) => {
    setSelectedSavedAnswer(answer);
    setShowSavedAnswerModal(true);
  };

  const filteredQuestions = selectedCategory === 'all'
    ? questions
    : questions.filter(q => q.category === selectedCategory);

  const categories = ['all', 'technical', 'behavioral', 'situational', 'experience'];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Panel - Input and Generated Questions */}
      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-2xl font-bold">Interview Question Generator</h1>
        <AIDisclaimer feature="Interview questions" />

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Generate Interview Questions</h2>

        {/* Show login prompt if not authenticated */}
        {!isAuthenticated && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-yellow-700 text-sm">
              🔒 Please <Link to="/login" className="font-semibold underline">login</Link> to generate interview questions.
            </p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select CV</label>
          <select
            value={selectedCV}
            onChange={(e) => setSelectedCV(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            disabled={!isAuthenticated}
          >
            <option value="">Select a CV</option>
            {cvs.map((cv) => (
              <option key={cv.id} value={cv.id}>{cv.title}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g., Senior Software Engineer"
            className="w-full px-3 py-2 border rounded-lg"
            disabled={!isAuthenticated}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={6}
            placeholder="Paste the job description here to generate relevant interview questions..."
            className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            disabled={!isAuthenticated}
          />
        </div>

        <button
          onClick={generateQuestions}
          disabled={loading || !isAuthenticated}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!isAuthenticated ? 'Login to Generate Questions' : (loading ? 'Generating Questions...' : 'Generate Interview Questions')}
        </button>
      </div>

        {/* Generated Questions Section */}
        {questions.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Generated Questions ({filteredQuestions.length})</h2>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1 border rounded-lg text-sm"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              {filteredQuestions.map((question) => (
                <div key={question.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 flex justify-between items-center"
                    onClick={() => setExpandedQuestion(expandedQuestion === question.id ? null : question.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          question.category === 'technical' ? 'bg-blue-100 text-blue-800' :
                          question.category === 'behavioral' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {question.category}
                        </span>
                        <span className="text-xs text-gray-500">{question.difficulty}</span>
                      </div>
                      <p className="font-medium">{question.question_text}</p>
                    </div>
                    <span className="text-gray-400">{expandedQuestion === question.id ? '▲' : '▼'}</span>
                  </div>

                  {expandedQuestion === question.id && (
                    <div className="p-4 space-y-4">
                      {/* Suggested Answer */}
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="font-medium text-green-800 mb-1">💡 Suggested Answer Structure</div>
                        <p className="text-sm text-green-700">{question.suggested_answer}</p>
                      </div>

                      {/* Answer Tips */}
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="font-medium text-blue-800 mb-1">📝 Tips</div>
                        <p className="text-sm text-blue-700">{question.answer_tips}</p>
                      </div>

                      {/* Related Skills */}
                      {question.related_skills && question.related_skills.length > 0 && (
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Related Skills</div>
                          <div className="flex flex-wrap gap-1">
                            {question.related_skills.map((skill) => (
                              <span key={skill} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Practice Answer */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-sm font-medium text-gray-700">Practice Your Answer</label>
                          <button
                            onClick={() => saveAnswer(question, userAnswers[question.id] || '')}
                            className="text-xs text-blue-600 hover:text-blue-800"
                            id={`save-${question.id}`}
                          >
                            Save Answer
                          </button>
                        </div>
                        <textarea
                          value={userAnswers[question.id] || ''}
                          onChange={(e) => setUserAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                          rows={4}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="Write your answer here to practice..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && questions.length === 0 && !error && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-medium mb-2">No Questions Yet</h3>
            <p className="text-gray-500">Enter a job description and click "Generate Interview Questions" to get started.</p>
          </div>
        )}
      </div>

      {/* Right Panel - Saved Answers History */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow p-6 sticky top-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            📝 Saved Answers
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {savedAnswers.length}
            </span>
          </h2>

          {loadingAnswers ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : savedAnswers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm">No saved answers yet.</p>
              <p className="text-xs mt-1">Generate questions and save your practice answers.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {savedAnswers.map((answer) => (
                <div
                  key={answer.id}
                  className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => viewSavedAnswer(answer)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          answer.question_category === 'technical' ? 'bg-blue-100 text-blue-800' :
                          answer.question_category === 'behavioral' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {answer.question_category || 'General'}
                        </span>
                        {answer.job_title && (
                          <span className="text-xs text-gray-500">{answer.job_title}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium line-clamp-2">
                        {answer.question_text.length > 80
                          ? answer.question_text.substring(0, 80) + '...'
                          : answer.question_text}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Saved: {new Date(answer.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => confirmDeleteAnswer(answer, e)}
                      className="text-red-500 hover:text-red-700 text-sm px-2"
                    >
                      ×
                    </button>
                  </div>
                  {/* Answer Preview */}
                  <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    {answer.answer_text.length > 100
                      ? answer.answer_text.substring(0, 100) + '...'
                      : answer.answer_text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Saved Answer Detail Modal */}
      {showSavedAnswerModal && selectedSavedAnswer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Saved Answer Details</h2>
                <button
                  onClick={() => setShowSavedAnswerModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* Question */}
              <div>
                <div className="text-sm text-gray-500 mb-1">Question</div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{selectedSavedAnswer.question_text}</p>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Category</div>
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedSavedAnswer.question_category === 'technical' ? 'bg-blue-100 text-blue-800' :
                      selectedSavedAnswer.question_category === 'behavioral' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {selectedSavedAnswer.question_category || 'General'}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Job Title</div>
                  <div className="font-medium">{selectedSavedAnswer.job_title || 'General'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Last Updated</div>
                  <div className="text-sm">{new Date(selectedSavedAnswer.updated_at).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Created</div>
                  <div className="text-sm">{new Date(selectedSavedAnswer.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Answer */}
              <div>
                <div className="text-sm text-gray-500 mb-1">Your Answer</div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="whitespace-pre-wrap">{selectedSavedAnswer.answer_text}</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  // Copy answer to clipboard
                  navigator.clipboard.writeText(selectedSavedAnswer.answer_text);
                  showToast(`Answer copied to clipboard!`, 'success');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                📋 Copy Answer
              </button>
              <button
                onClick={() => setShowSavedAnswerModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Delete Saved Answer"
        message={`Are you sure you want to delete this saved answer? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={handleDeleteAnswer}
        onCancel={cancelDeleteAnswer}
      />
    </div>
  );
};

export default InterviewGenerator;