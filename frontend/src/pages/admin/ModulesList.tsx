import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import type { LearningModule } from '../../types';
import {showToast} from "../../components/Toast.tsx";
import axios from "axios";

const ModulesList: React.FC = () => {
  const [items, setItems] = useState<LearningModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<LearningModule | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scraping, setScraping] = useState(false);
  const token = localStorage.getItem('access_token');
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content_type: 'video',
    duration_minutes: 30,
    difficulty: 'beginner',
    xp_points: 10,
    is_required: true
  });

  const contentTypes = [
    { value: 'video', label: 'Video' },
    { value: 'article', label: 'Article' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'pdf', label: 'PDF' },
    { value: 'interactive', label: 'Interactive' }
  ];

  const difficultyLevels = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getModules();
      const data = Array.isArray(response.data)
        ? response.data
        : response.data.results || [];
      setItems(data);
    } catch (err: any) {
      console.error('Failed to fetch modules:', err);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load modules');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async () => {
  setScraping(true);
  try {
    const response = await axios.post('/api/scraper/scrape/',
      {
        search_terms: ['python', 'javascript', 'react', 'django', 'java', 'data science'],
        max_courses: 10
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    showToast(`Scraped ${response.data.result.created} new courses!`, 'success');
    fetchData();
  } catch (err: any) {
    console.error('Scrape error:', err);
    showToast(err.response?.data?.error || 'Scraping failed', 'error');
  } finally {
    setScraping(false);
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Module title is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const submitData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        content_type: formData.content_type,
        duration_minutes: formData.duration_minutes,
        difficulty: formData.difficulty,
        xp_points: formData.xp_points,
        is_required: formData.is_required
      };

      if (editingItem) {
        await adminAPI.updateModule(editingItem.id, submitData);
      } else {
        await adminAPI.createModule(submitData);
      }

      setShowModal(false);
      setEditingItem(null);
      resetForm();
      await fetchData();
    } catch (err: any) {
      console.error('Failed to save module:', err);
      if (err.response?.data?.title) {
        setError(`Title issue: ${err.response.data.title}`);
      } else {
        setError(err.response?.data?.message || 'Failed to save module');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: LearningModule) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      content_type: item.content_type || 'video',
      duration_minutes: item.duration_minutes || 30,
      difficulty: item.difficulty || 'beginner',
      xp_points: item.xp_points || 10,
      is_required: item.is_required !== undefined ? item.is_required : true
    });
    setError(null);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this module? This will also delete all associated progress and quiz data.')) {
      try {
        await adminAPI.deleteModule(id);
        await fetchData();
      } catch (err: any) {
        console.error('Failed to delete module:', err);
        alert(err.response?.data?.message || 'Failed to delete module');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      content_type: 'video',
      duration_minutes: 30,
      difficulty: 'beginner',
      xp_points: 10,
      is_required: true
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading modules...</div>
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
        <h2 className="text-2xl font-bold text-gray-800">Learning Modules</h2>
        <div className="flex gap-3">
          <button
            onClick={handleScrape}
            disabled={scraping}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {scraping ? 'Scraping...' : '🌐 Scrape from Coursera'}
          </button>
          <button
            onClick={() => navigate('/admin/scrape-courses')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Advanced Scraper
          </button>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            resetForm();
            setError(null);
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Module
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No learning modules found. Click "Add Module" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">XP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                  <th className="px-6 py-3 text-left textxs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="capitalize">{item.content_type}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.duration_minutes} min</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getDifficultyColor(item.difficulty)}`}>
                        {item.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.xp_points}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.is_required ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {item.is_required ? 'Required' : 'Optional'}
                      </span>
                    </td>
                    <td className="px-6 py-4 space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
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

      {/* Modal for Add/Edit Module */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingItem ? 'Edit Module' : 'Add Module'}</h3>

            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                  required
                  placeholder="e.g., Introduction to Python"
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                  placeholder="Describe what this module covers..."
                />
              </div>

              {/* Content Type & Duration */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
                  <select
                    value={formData.content_type}
                    onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  >
                    {contentTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                    min="1"
                    step="5"
                  />
                </div>
              </div>

              {/* Difficulty & XP Points */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  >
                    {difficultyLevels.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">XP Points</label>
                  <input
                    type="number"
                    value={formData.xp_points}
                    onChange={(e) => setFormData({ ...formData, xp_points: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                    min="0"
                    step="5"
                  />
                </div>
              </div>

              {/* Required Checkbox */}
              <div className="mb-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_required}
                    onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                    className="mr-2 w-4 h-4"
                    disabled={submitting}
                  />
                  <span className="text-sm text-gray-700">Required module (must be completed to progress)</span>
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.title.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (editingItem ? 'Update Module' : 'Create Module')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModulesList;