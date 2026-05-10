import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import type { CareerPath } from '../../types';

const CareerPathsList: React.FC = () => {
  const [items, setItems] = useState<CareerPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CareerPath | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    industry: '',
    avg_salary_min: '',
    avg_salary_max: '',
    growth_outlook: 'stable'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getCareerPaths();
      const data = Array.isArray(response.data)
        ? response.data
        : response.data.results || [];
      setItems(data);
    } catch (err: any) {
      console.error('Failed to fetch career paths:', err);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load career paths');
      }
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-generate slug when title changes
    if (name === 'title' && !editingItem) {
      setFormData(prev => ({ ...prev, slug: generateSlug(value) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Career path title is required');
      return;
    }

    if (!formData.slug.trim()) {
      setFormData(prev => ({ ...prev, slug: generateSlug(formData.title) }));
    }

    setSubmitting(true);
    setError(null);

    try {
      const submitData = {
        title: formData.title.trim(),
        slug: formData.slug.trim() || generateSlug(formData.title),
        description: formData.description.trim(),
        industry: formData.industry || null,
        avg_salary_min: formData.avg_salary_min ? parseFloat(formData.avg_salary_min) : null,
        avg_salary_max: formData.avg_salary_max ? parseFloat(formData.avg_salary_max) : null,
        growth_outlook: formData.growth_outlook
      };

      if (editingItem) {
        await adminAPI.updateCareerPath(editingItem.id, submitData);
      } else {
        await adminAPI.createCareerPath(submitData);
      }

      setShowModal(false);
      setEditingItem(null);
      resetForm();
      await fetchData();
    } catch (err: any) {
      console.error('Failed to save career path:', err);
      if (err.response?.data?.slug) {
        setError(`Slug issue: ${err.response.data.slug}`);
      } else if (err.response?.data?.title) {
        setError(`Title issue: ${err.response.data.title}`);
      } else {
        setError(err.response?.data?.message || 'Failed to save career path');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: CareerPath) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      slug: item.slug,
      description: item.description || '',
      industry: item.industry || '',
      avg_salary_min: item.avg_salary_min?.toString() || '',
      avg_salary_max: item.avg_salary_max?.toString() || '',
      growth_outlook: item.growth_outlook || 'stable'
    });
    setError(null);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this career path? This will also delete all enrollments and recommendations associated with it.')) {
      try {
        await adminAPI.deleteCareerPath(id);
        await fetchData();
      } catch (err: any) {
        console.error('Failed to delete career path:', err);
        alert(err.response?.data?.message || 'Failed to delete career path');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      description: '',
      industry: '',
      avg_salary_min: '',
      avg_salary_max: '',
      growth_outlook: 'stable'
    });
  };

  const growthOutlookOptions = [
    { value: 'declining', label: 'Declining' },
    { value: 'stable', label: 'Stable' },
    { value: 'growing', label: 'Growing' },
    { value: 'rapid', label: 'Rapid Growth' }
  ];

  const industryOptions = [
    { value: 'technology', label: 'Technology' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'finance', label: 'Finance' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'education', label: 'Education' },
    { value: 'engineering', label: 'Engineering' }
  ];

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading career paths...</div>
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
        <h2 className="text-2xl font-bold text-gray-800">Career Paths</h2>
        <button
          onClick={() => {
            setEditingItem(null);
            resetForm();
            setError(null);
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Career Path
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No career paths found. Click "Add Career Path" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Title</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Slug</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Industry</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Salary Range</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Growth</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Modules</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Enrollments</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{item.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.slug}</td>
                    <td className="px-6 py-4">
                      <span className="capitalize">{item.industry || '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {item.avg_salary_min && item.avg_salary_max
                        ? `$${item.avg_salary_min.toLocaleString()} - $${item.avg_salary_max.toLocaleString()}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.growth_outlook === 'rapid' ? 'bg-green-100 text-green-800' :
                        item.growth_outlook === 'growing' ? 'bg-blue-100 text-blue-800' :
                        item.growth_outlook === 'stable' ? 'bg-gray-100 text-gray-600' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.growth_outlook || 'stable'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{item.modules_count || 0}</td>
                    <td className="px-6 py-4 text-sm">{item.enrollments_count || 0}</td>
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

      {/* Modal for Add/Edit Career Path */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingItem ? 'Edit Career Path' : 'Add Career Path'}</h3>

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
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                  required
                  placeholder="e.g., Frontend Developer"
                />
              </div>

              {/* Slug */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL identifier)</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  disabled={submitting}
                  placeholder="auto-generated-from-title"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used in URLs. Auto-generated from title if left empty.
                </p>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                  placeholder="Describe this career path..."
                />
              </div>

              {/* Industry */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select Industry</option>
                  {industryOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Salary Range */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Salary ($)</label>
                  <input
                    type="number"
                    name="avg_salary_min"
                    value={formData.avg_salary_min}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                    placeholder="e.g., 60000"
                    min="0"
                    step="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Salary ($)</label>
                  <input                     type="number"
                    name="avg_salary_max"
                    value={formData.avg_salary_max}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                    placeholder="e.g., 120000"
                    min="0"
                    step="1000"
                  />
                </div>
              </div>

              {/* Growth Outlook */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Growth Outlook</label>
                <select
                  name="growth_outlook"
                  value={formData.growth_outlook}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                >
                  {growthOutlookOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError(null);
                    resetForm();
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

export default CareerPathsList;