import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import type { ApiError } from '../../utils/errors';

interface CV {
  id: string;
  user: string;
  username: string;
  title: string;
  content?: Record<string, unknown> | null;
  ats_score: number;
  created_at: string;
}

const CVsList: React.FC = () => {
  const [items, setItems] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CV | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getCVs();
      const data = Array.isArray(response.data)
        ? response.data
        : response.data.results || [];
      setItems(data);
    } catch (caught) {
      const err = caught as ApiError;
      console.error('Failed to fetch CVs:', err);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load CVs');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Loads run asynchronously; state is updated once each request resolves.
    const run = async () => {
      fetchData();
    };
    run();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this CV? This action cannot be undone.')) {
      try {
        await adminAPI.deleteCV(id);
        await fetchData();
      } catch (caught) {
        const err = caught as ApiError;
        console.error('Failed to delete CV:', err);
        alert(err.response?.data?.message || 'Failed to delete CV');
      }
    }
  };

  const handleEdit = (cv: CV) => {
    setEditingItem(cv);
    setFormData({
      title: cv.title || '',
      content: cv.content ? JSON.stringify(cv.content, null, 2) : ''
    });
    setError(null);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('CV title is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let contentData = {};
      if (formData.content.trim()) {
        try {
          contentData = JSON.parse(formData.content);
        } catch {
          setError('Invalid JSON format for CV content');
          setSubmitting(false);
          return;
        }
      }

      const updateData = {
        title: formData.title.trim(),
        content: contentData
      };

      await adminAPI.updateCV(editingItem!.id, updateData);
      setShowEditModal(false);
      setEditingItem(null);
      await fetchData();
    } catch (caught) {
      const err = caught as ApiError;
      console.error('Failed to update CV:', err);
      setError(err.response?.data?.message || 'Failed to update CV');
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading CVs...</div>
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
        <h2 className="text-2xl font-bold text-gray-800">CV Management</h2>
        <div className="text-sm text-gray-500">
          Total CVs: {items.length}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No CVs found. Users haven't created any CVs yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ATS Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.username}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.title || 'Untitled CV'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-16 h-2 rounded-full ${getScoreBackground(item.ats_score)}`}>
                          <div
                            className={`h-full rounded-full ${getScoreBackground(item.ats_score)}`}
                            style={{ width: `${Math.min(100, item.ats_score || 0)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-semibold ${getScoreColor(item.ats_score)}`}>
                          {item.ats_score ? `${item.ats_score}%` : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 space-x-2">
                      <button
                        onClick={() => setSelectedCV(item)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-green-600 hover:text-green-800 text-sm"
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

      {/* View CV Modal */}
      {selectedCV && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{selectedCV.title || 'CV Details'}</h3>
              <button
                onClick={() => setSelectedCV(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="border-b pb-2">
                <strong>User:</strong> {selectedCV.username}
              </div>
              <div className="border-b pb-2">
                <strong>Title:</strong> {selectedCV.title || 'Untitled CV'}
              </div>
              <div className="border-b pb-2">
                <strong>ATS Score:</strong>{' '}
                <span className={getScoreColor(selectedCV.ats_score)}>
                  {selectedCV.ats_score ? `${selectedCV.ats_score}%` : 'Not scored'}
                </span>
              </div>
              <div className="border-b pb-2">
                <strong>Created:</strong> {new Date(selectedCV.created_at).toLocaleString()}
              </div>
              {selectedCV.content && (
                <div className="border-b pb-2">
                  <strong>Content Preview:</strong>
                  <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedCV.content, null, 2).slice(0, 500)}
                    {JSON.stringify(selectedCV.content, null, 2).length > 500 && '...'}
                  </pre>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedCV(null)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit CV Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Edit CV</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                  setError(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User <span className="text-gray-400">(read-only)</span>
                </label>
                <input
                  type="text"
                  value={editingItem.username}
                  disabled
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                  required
                  placeholder="CV Title"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content (JSON format)
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={10}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                  placeholder='{"personal_info": {"name": "John Doe"}, "skills": ["Python", "React"]}'
                />
                <p className="text-xs text-gray-500 mt-1">
                  CV content in JSON format. Leave empty to keep existing content.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
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
                  {submitting ? 'Saving...' : 'Update CV'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CVsList;