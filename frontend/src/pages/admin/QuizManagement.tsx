import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { showToast } from '../../components/Toast';

// Define proper types
type QuestionType = 'multiple_choice' | 'ranking' | 'text';

interface Quiz {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  order: number;
  questions_count: number;
  created_at: string;
}

interface Option {
  id: string;
  option_text: string;
  career_weights: Record<string, number>;
  order: number;
}

interface Question {
  id: string;
  question_text: string;
  question_type: QuestionType;
  ranking_items?: string[];
  order: number;
  options: Option[];
}

interface QuizFormData {
  title: string;
  description: string;
  is_active: boolean;
  order: number;
}

interface QuestionFormData {
  question_text: string;
  question_type: QuestionType;
  ranking_items: string[];
  order: number;
}

interface OptionFormData {
  option_text: string;
  career_weights: Record<string, number>;
  order: number;
}

// API Response type for paginated data
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const QuizManagement: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingOption, setEditingOption] = useState<Option | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  // Quiz form state
  const [quizForm, setQuizForm] = useState<QuizFormData>({
    title: '',
    description: '',
    is_active: true,
    order: 0
  });

  // Question form state
  const [questionForm, setQuestionForm] = useState<QuestionFormData>({
    question_text: '',
    question_type: 'multiple_choice',
    ranking_items: [],
    order: 0
  });

  // Option form state
  const [optionForm, setOptionForm] = useState<OptionFormData>({
    option_text: '',
    career_weights: {},
    order: 0
  });

  const [careerPaths, setCareerPaths] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    fetchQuizzes();
    fetchCareerPaths();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get<PaginatedResponse<Quiz> | Quiz[]>('/api/admin/quizzes/', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Handle both paginated and non-paginated responses
      let quizzesData: Quiz[];
      if (response.data && 'results' in response.data) {
        // Paginated response
        quizzesData = response.data.results;
      } else if (Array.isArray(response.data)) {
        // Direct array response
        quizzesData = response.data;
      } else {
        quizzesData = [];
      }

      setQuizzes(quizzesData);
    } catch (err) {
      console.error('Failed to fetch quizzes:', err);
      showToast('Failed to load quizzes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCareerPaths = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get('/api/admin/career-paths/', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Handle both paginated and non-paginated responses
      let careerPathsData: any[] = [];
      if (response.data && 'results' in response.data) {
        careerPathsData = response.data.results;
      } else if (Array.isArray(response.data)) {
        careerPathsData = response.data;
      }

      setCareerPaths(careerPathsData.map((cp: any) => ({ id: cp.id, title: cp.title })));
    } catch (err) {
      console.error('Failed to fetch career paths:', err);
    }
  };

  const fetchQuestions = async (quizId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`/api/admin/quizzes/${quizId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // The response might have questions directly or nested
      let questionsData: Question[] = [];
      if (response.data.questions) {
        questionsData = response.data.questions;
      } else if (response.data.results && response.data.results.questions) {
        questionsData = response.data.results.questions;
      } else if (Array.isArray(response.data)) {
        questionsData = response.data;
      }

      setQuestions(questionsData);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
      showToast('Failed to load questions', 'error');
      setQuestions([]);
    }
  };

  const handleCreateQuiz = async () => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.post('/api/admin/quizzes/', quizForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Quiz created successfully', 'success');
      setShowQuizModal(false);
      setQuizForm({ title: '', description: '', is_active: true, order: 0 });
      fetchQuizzes();
    } catch (err: any) {
      console.error('Failed to create quiz:', err);
      showToast(err.response?.data?.error || err.response?.data?.message || 'Failed to create quiz', 'error');
    }
  };

  const handleUpdateQuiz = async () => {
    if (!editingQuiz) return;
    try {
      const token = localStorage.getItem('access_token');
      await axios.put(`/api/admin/quizzes/${editingQuiz.id}/`, quizForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Quiz updated successfully', 'success');
      setShowQuizModal(false);
      setEditingQuiz(null);
      setQuizForm({ title: '', description: '', is_active: true, order: 0 });
      fetchQuizzes();
      if (selectedQuiz?.id === editingQuiz.id) {
        setSelectedQuiz(null);
        setQuestions([]);
      }
    } catch (err: any) {
      console.error('Failed to update quiz:', err);
      showToast(err.response?.data?.error || err.response?.data?.message || 'Failed to update quiz', 'error');
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm('Are you sure you want to delete this quiz? This will also delete all questions and options.')) return;
    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`/api/admin/quizzes/${quizId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Quiz deleted successfully', 'success');
      if (selectedQuiz?.id === quizId) {
        setSelectedQuiz(null);
        setQuestions([]);
      }
      fetchQuizzes();
    } catch (err: any) {
      console.error('Failed to delete quiz:', err);
      showToast(err.response?.data?.error || err.response?.data?.message || 'Failed to delete quiz', 'error');
    }
  };

  const handleCreateQuestion = async () => {
    if (!selectedQuiz) return;
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(`/api/admin/questions/`, {
        ...questionForm,
        quiz: selectedQuiz.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Question created successfully', 'success');
      setShowQuestionModal(false);
      setQuestionForm({ question_text: '', question_type: 'multiple_choice', ranking_items: [], order: 0 });
      fetchQuestions(selectedQuiz.id);
    } catch (err: any) {
      console.error('Failed to create question:', err);
      showToast(err.response?.data?.error || err.response?.data?.message || 'Failed to create question', 'error');
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;
    try {
      const token = localStorage.getItem('access_token');
      await axios.put(`/api/admin/questions/${editingQuestion.id}/`, questionForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Question updated successfully', 'success');
      setShowQuestionModal(false);
      setEditingQuestion(null);
      setQuestionForm({ question_text: '', question_type: 'multiple_choice', ranking_items: [], order: 0 });
      if (selectedQuiz) {
        fetchQuestions(selectedQuiz.id);
      }
    } catch (err: any) {
      console.error('Failed to update question:', err);
      showToast(err.response?.data?.error || err.response?.data?.message || 'Failed to update question', 'error');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm('Are you sure you want to delete this question? This will also delete all options.')) return;
    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`/api/admin/questions/${questionId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Question deleted successfully', 'success');
      if (selectedQuiz) {
        fetchQuestions(selectedQuiz.id);
      }
    } catch (err: any) {
      console.error('Failed to delete question:', err);
      showToast(err.response?.data?.error || err.response?.data?.message || 'Failed to delete question', 'error');
    }
  };

  const handleCreateOption = async () => {
    if (!selectedQuestionId) return;
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(`/api/admin/options/`, {
        ...optionForm,
        question: selectedQuestionId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Option created successfully', 'success');
      setShowOptionModal(false);
      setOptionForm({ option_text: '', career_weights: {}, order: 0 });
      if (selectedQuiz) {
        fetchQuestions(selectedQuiz.id);
      }
    } catch (err: any) {
      console.error('Failed to create option:', err);
      showToast(err.response?.data?.error || err.response?.data?.message || 'Failed to create option', 'error');
    }
  };

  const handleUpdateOption = async () => {
    if (!editingOption) return;
    try {
      const token = localStorage.getItem('access_token');
      await axios.put(`/api/admin/options/${editingOption.id}/`, optionForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Option updated successfully', 'success');
      setShowOptionModal(false);
      setEditingOption(null);
      setOptionForm({ option_text: '', career_weights: {}, order: 0 });
      if (selectedQuiz) {
        fetchQuestions(selectedQuiz.id);
      }
    } catch (err: any) {
      console.error('Failed to update option:', err);
      showToast(err.response?.data?.error || err.response?.data?.message || 'Failed to update option', 'error');
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    if (!window.confirm('Are you sure you want to delete this option?')) return;
    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`/api/admin/options/${optionId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Option deleted successfully', 'success');
      if (selectedQuiz) {
        fetchQuestions(selectedQuiz.id);
      }
    } catch (err: any) {
      console.error('Failed to delete option:', err);
      showToast(err.response?.data?.error || err.response?.data?.message || 'Failed to delete option', 'error');
    }
  };

  const toggleQuestionExpand = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const openQuizModal = (quiz?: Quiz) => {
    if (quiz) {
      setEditingQuiz(quiz);
      setQuizForm({
        title: quiz.title,
        description: quiz.description || '',
        is_active: quiz.is_active,
        order: quiz.order
      });
    } else {
      setEditingQuiz(null);
      setQuizForm({ title: '', description: '', is_active: true, order: 0 });
    }
    setShowQuizModal(true);
  };

  const openQuestionModal = (question?: Question) => {
    if (question) {
      setEditingQuestion(question);
      setQuestionForm({
        question_text: question.question_text,
        question_type: question.question_type,
        ranking_items: question.ranking_items || [],
        order: question.order
      });
    } else {
      setEditingQuestion(null);
      setQuestionForm({ question_text: '', question_type: 'multiple_choice', ranking_items: [], order: 0 });
    }
    setShowQuestionModal(true);
  };

  const openOptionModal = (questionId: string, option?: Option) => {
    setSelectedQuestionId(questionId);
    if (option) {
      setEditingOption(option);
      setOptionForm({
        option_text: option.option_text,
        career_weights: option.career_weights || {},
        order: option.order
      });
    } else {
      setEditingOption(null);
      setOptionForm({ option_text: '', career_weights: {}, order: 0 });
    }
    setShowOptionModal(true);
  };

  // Helper function to check if question type is ranking
  const isRankingType = (type: QuestionType): boolean => {
    return type === 'ranking';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Quiz Management</h1>
        <button
          onClick={() => openQuizModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <span>➕</span>
          New Quiz
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quiz List */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Quizzes</h2>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {quizzes.length > 0 ? (
              quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedQuiz?.id === quiz.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                  onClick={() => {
                    setSelectedQuiz(quiz);
                    fetchQuestions(quiz.id);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{quiz.title}</h3>
                        {!quiz.is_active && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Inactive</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{quiz.description || 'No description'}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>Order: {quiz.order}</span>
                        <span>{quiz.questions_count || 0} questions</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openQuizModal(quiz);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteQuiz(quiz.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                No quizzes created yet.
              </div>
            )}
          </div>
        </div>

        {/* Questions and Options */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          {selectedQuiz ? (
            <div>
              <div className="p-4 border-b flex justify-between items-center">
                <div>
                  <h2 className="font-semibold">{selectedQuiz.title}</h2>
                  <p className="text-sm text-gray-500">{selectedQuiz.description || 'No description'}</p>
                </div>
                <button
                  onClick={() => openQuestionModal()}
                  className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-green-700"
                >
                  <span>➕</span>
                  Add Question
                </button>
              </div>

              <div className="divide-y max-h-[600px] overflow-y-auto">
                {questions.length > 0 ? (
                  questions.map((question, index) => (
                    <div key={question.id} className="p-4">
                      <div
                        className="flex justify-between items-start cursor-pointer"
                        onClick={() => toggleQuestionExpand(question.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-sm">Q{index + 1}</span>
                            <span className="font-medium">{question.question_text}</span>
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                              {question.question_type}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">Order: {question.order}</div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openQuestionModal(question);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteQuestion(question.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Delete"
                          >
                            🗑️
                          </button>
                          <button className="p-1 text-gray-400">
                            {expandedQuestions.has(question.id) ? '▲' : '▼'}
                          </button>
                        </div>
                      </div>

                      {expandedQuestions.has(question.id) && (
                        <div className="mt-4 ml-6">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-medium text-gray-700">Options</h4>
                            <button
                              onClick={() => openOptionModal(question.id)}
                              className="text-blue-600 text-sm hover:underline flex items-center gap-1"
                            >
                              <span>➕</span>
                              Add Option
                            </button>
                          </div>

                          <div className="space-y-2">
                            {question.options && question.options.length > 0 ? (
                              question.options.map((option) => (
                                <div key={option.id} className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{option.option_text}</p>
                                      <div className="mt-2">
                                        <p className="text-xs text-gray-500 mb-1">Career Weights:</p>
                                        <div className="flex flex-wrap gap-2">
                                          {Object.entries(option.career_weights || {}).map(([careerId, weight]) => {
                                            const career = careerPaths.find(c => c.id === careerId);
                                            return (
                                              <span
                                                key={careerId}
                                                className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
                                              >
                                                {career?.title || careerId}: {weight}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => openOptionModal(question.id, option)}
                                        className="p-1 text-gray-400 hover:text-blue-600"
                                        title="Edit"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        onClick={() => handleDeleteOption(option.id)}
                                        className="p-1 text-gray-400 hover:text-red-600"
                                        title="Delete"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-400 text-center py-4">
                                No options yet. Click "Add Option" to create one.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    No questions added yet. Click "Add Question" to get started.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              Select a quiz from the left to manage its questions and options.
            </div>
          )}
        </div>
      </div>

      {/* Quiz Modal */}
      {showQuizModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">
              {editingQuiz ? 'Edit Quiz' : 'New Quiz'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={quizForm.description}
                  onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <input
                  type="number"
                  value={quizForm.order}
                  onChange={(e) => setQuizForm({ ...quizForm, order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={quizForm.is_active}
                  onChange={(e) => setQuizForm({ ...quizForm, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowQuizModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingQuiz ? handleUpdateQuiz : handleCreateQuiz}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingQuiz ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">
              {editingQuestion ? 'Edit Question' : 'New Question'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                <textarea
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                <select
                  value={questionForm.question_type}
                  onChange={(e) => setQuestionForm({
                    ...questionForm,
                    question_type: e.target.value as QuestionType
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="ranking">Ranking</option>
                  <option value="text">Text</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <input
                  type="number"
                  value={questionForm.order}
                  onChange={(e) => setQuestionForm({ ...questionForm, order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              {isRankingType(questionForm.question_type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ranking Items (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={questionForm.ranking_items.join(', ')}
                    onChange={(e) => setQuestionForm({
                      ...questionForm,
                      ranking_items: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Item 1, Item 2, Item 3"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowQuestionModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingQuestion ? handleUpdateQuestion : handleCreateQuestion}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingQuestion ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Option Modal */}
      {showOptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {editingOption ? 'Edit Option' : 'New Option'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Option Text</label>
                <textarea
                  value={optionForm.option_text}
                  onChange={(e) => setOptionForm({ ...optionForm, option_text: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <input
                  type="number"
                  value={optionForm.order}
                  onChange={(e) => setOptionForm({ ...optionForm, order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Career Weights</label>
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                  {careerPaths.length > 0 ? (
                    careerPaths.map((career) => (
                      <div key={career.id} className="flex items-center gap-3">
                        <div className="w-1/3">
                          <span className="text-sm text-gray-600">{career.title}</span>
                        </div>
                        <div className="w-2/3">
                          <input
                            type="number"
                            step="0.1"
                            value={optionForm.career_weights[career.id] || 0}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              setOptionForm({
                                ...optionForm,
                                career_weights: {
                                  ...optionForm.career_weights,
                                  [career.id]: isNaN(value) ? 0 : value
                                }
                              });
                            }}
                            className="w-full px-3 py-2 border rounded-lg"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">Loading career paths...</p>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Weights determine how this option contributes to career path recommendations.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowOptionModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingOption ? handleUpdateOption : handleCreateOption}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingOption ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizManagement;