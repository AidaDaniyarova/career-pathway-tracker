import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import type { Skill } from '../../types';

const SkillsList: React.FC = () => {
  const [items, setItems] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Skill | null>(null);
  const [skillName, setSkillName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getSkills();
      const data = Array.isArray(response.data)
        ? response.data
        : response.data.results || [];
      setItems(data);
    } catch (err: any) {
      console.error('Failed to fetch skills:', err);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 404) {
        setError('API endpoint not found. Please check if the backend is running.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load skills');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) {
      setError('Skill name is required');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await adminAPI.createSkill({ name: skillName.trim() });
      setSkillName('');
      setShowModal(false);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to create skill:', err);
      if (err.response?.status === 400 && err.response?.data?.name) {
        setError(err.response.data.name);
      } else {
        setError(err.response?.data?.message || 'Failed to create skill');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) {
      setError('Skill name is required');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await adminAPI.updateSkill(editingItem!.id, { name: skillName.trim() });
      setSkillName('');
      setShowModal(false);
      setEditingItem(null);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to update skill:', err);
      if (err.response?.status === 400 && err.response?.data?.name) {
        setError(err.response.data.name);
      } else {
        setError(err.response?.data?.message || 'Failed to update skill');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (skill: Skill) => {
    setEditingItem(skill);
    setSkillName(skill.name);
    setError(null);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this skill? It will be removed from all career paths and user profiles.')) {
      try {
        await adminAPI.deleteSkill(id);
        await fetchData();
      } catch (err: any) {
        console.error('Failed to delete skill:', err);
        alert(err.response?.data?.message || 'Failed to delete skill');
      }
    }
  };

  const resetModal = () => {
    setSkillName('');
    setEditingItem(null);
    setError(null);
    setShowModal(false);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading skills...</div>
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
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Skills Management</h2>
        <button
          onClick={() => {
            resetModal();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Skill
        </button>
      </div>

      {/* Skills count display */}
      <div className="mb-4 text-sm text-gray-500">
        Showing {items.length} skill{items.length !== 1 ? 's' : ''}
      </div>

      {/* Scrollable skills container */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No skills found. Click "Add Skill" to create one.
          </div>
        ) : (
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {items.map((skill) => (
                <div
                  key={skill.id}
                  className="flex justify-between items-center p-4 border rounded-lg hover:shadow-md transition-shadow group"
                >
                  <span className="text-gray-800 font-medium">{skill.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(skill)}
                      className="text-blue-600 hover:text-blue-800 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(skill.id)}
                      className="text-red-600 hover:text-red-800 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal for Add/Edit Skill */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">
              {editingItem ? 'Edit Skill' : 'Add New Skill'}
            </h3>

            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={editingItem ? handleUpdate : handleCreate}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skill Name *
                </label>
                <input
                  type="text"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  placeholder="e.g., Python, Project Management, Data Analysis"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  disabled={submitting}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetModal}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !skillName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting
                    ? (editingItem ? 'Updating...' : 'Adding...')
                    : (editingItem ? 'Update Skill' : 'Add Skill')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsList;