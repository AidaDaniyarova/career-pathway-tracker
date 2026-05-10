import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import type { Quiz } from '../../types';

const QuizzesList: React.FC = () => {
  const [items, setItems] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Quiz | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    module_id: '',
    passing_score: 70
  });
  const [modules, setModules] = useState<any[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);

  useEffect(() => {
    fetchData();
    fetchModules();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getQuizzes();
      const data = Array.isArray(response.data)
        ? response.data
        : response.data.results || [];
      setItems(data);
    } catch (err: any) {
      console.error('Failed to fetch quizzes:', err);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load quizzes');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async () => {
    setModulesLoading(true);
    try {
      const response = await adminAPI.getModules();
      const data = Array.isArray(response.data)
        ? response.data
        : response.data.results || [];
      setModules(data);
    } catch (err) {
      console.error('Failed to fetch modules:', err);
    } finally {
      setModulesLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Quiz title is required');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (editingItem) {
        await adminAPI.updateQuiz(editingItem.id, formData);
      } else {
        await adminAPI.createQuiz(formData);
      }
      setShowModal(false);
      setEditingItem(null);
      setFormData({ title: '', module_id: '', passing_score: 70 });
      await fetchData();
    } catch (err: any) {
      console.error('Failed to save quiz:', err);
      setError(err.response?.data?.message || 'Failed to save quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this quiz? All questions will also be deleted.')) {
      try {
        await adminAPI.deleteQuiz(id);
        await fetchData();
      } catch (err: any) {
        console.error('Failed to delete quiz:', err);
        alert(err.response?.data?.message || 'Failed to delete quiz');
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading quizzes...</div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Quiz Management</h2>
        <button
          onClick={() => {
            setEditingItem(null);
            setFormData({ title: '', module_id: '', passing_score: 70 });
            setError(null);
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Quiz
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No quizzes found. Click "Add Quiz" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Questions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passing Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.module_id || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.questions_count || 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.attempts_count || 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.passing_score}%</td>
                    <td className="px-6 py-4 space-x-2">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setFormData({
                            title: item.title,
                            module_id: item.module_id || '',
                            passing_score: item.passing_score
                          });
                          setError(null);
                          setShowModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingItem ? 'Edit Quiz' : 'Add Quiz'}</h3>
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
                <select
                  value={formData.module_id}
                  onChange={(e) => setFormData({ ...formData, module_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting || modulesLoading}
                >
                  <option value="">Select Module (Optional)</option>
                  {modules.map((module) => (
                    <option key={module.id} value={module.id}>{module.title}</option>
                  ))}
                </select>
                {modulesLoading && <p className="text-xs text-gray-500 mt-1">Loading modules...</p>}
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Passing Score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.passing_score}
                  onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError(null);
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.title.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizzesList;