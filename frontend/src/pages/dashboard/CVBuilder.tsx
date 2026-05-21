import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ConfirmationModal from "../../components/ConfirmationModal";
import { showToast } from "../../components/Toast";

interface CV {
  id: string;
  title: string;
  is_default: boolean;
  ats_score: number | null;
  created_at: string;
  updated_at: string;
}

const CVBuilder: React.FC = () => {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const token = localStorage.getItem('access_token');
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cvToDelete, setCvToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchCVs();
  }, []);

  const fetchCVs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/cv/cvs/', {
        headers: { Authorization: `Bearer ${token}` }
      });


      let cvsData = [];
      if (Array.isArray(response.data)) {
        cvsData = response.data;
      } else if (response.data.results && Array.isArray(response.data.results)) {
        cvsData = response.data.results;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        cvsData = response.data.data;
      } else {
        cvsData = [];
      }

      setCvs(cvsData);
    } catch (err: any) {
      console.error('Failed to fetch CVs:', err);
      setError(err.response?.data?.message || 'Failed to load CVs');
      setCvs([]);
    } finally {
      setLoading(false);
    }
  };

  const createCV = async () => {
    if (!newTitle.trim()) {
      showToast('Please enter a title for your CV', 'warning');
      return;
    }

    try {
      const defaultContent = {
        personal_info: {
          name: '',
          email: '',
          phone: '',
          location: '',
          linkedin: '',
          github: ''
        },
        summary: '',
        work_experience: [],
        education: [],
        skills: [],
        certifications: []
      };

      const response = await axios.post('/api/cv/cvs/',
        { title: newTitle, content: defaultContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast('CV created successfully!', 'success');
      navigate(`/dashboard/cv-builder/edit/${response.data.id}`);
    } catch (err: any) {
      console.error('Failed to create CV:', err);
      showToast(err.response?.data?.message || 'Failed to create CV', 'error');
    }
  };

  const confirmDeleteCV = (id: string) => {
    setCvToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDeleteCV = async () => {
    if (!cvToDelete) return;

    try {
      await axios.delete(`/api/cv/cvs/${cvToDelete}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCVs();
      showToast('CV deleted successfully', 'success');
    } catch (err) {
      showToast('Failed to delete CV', 'error');
    } finally {
      setShowDeleteModal(false);
      setCvToDelete(null);
    }
  };

  const setDefaultCV = async (id: string) => {
    try {
      await axios.post(`/api/cv/cvs/${id}/set-default/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCVs();
      showToast('Default CV updated', 'success');
    } catch (err: any) {
      console.error('Failed to set default CV:', err);
      showToast(err.response?.data?.message || 'Failed to set default CV', 'error');
    }
  };

  const duplicateCV = async (id: string) => {
    try {
      await axios.post(`/api/cv/cvs/${id}/duplicate/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCVs();
      showToast('CV duplicated successfully!', 'success');
    } catch (err: any) {
      console.error('Failed to duplicate CV:', err);
      showToast(err.response?.data?.message || 'Failed to duplicate CV', 'error');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchCVs}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">CV Builder</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          + Create New CV
        </button>
      </div>

      {cvs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-4xl mb-4">📄</div>
          <h3 className="text-lg font-medium mb-2">No CVs yet</h3>
          <p className="text-gray-500 mb-4">Create your first CV to get started!</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Create CV
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cvs.map((cv) => (
            <div key={cv.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 truncate">{cv.title}</h3>
                  {cv.is_default && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                      Default
                    </span>
                  )}
                </div>

                {cv.ats_score !== null && cv.ats_score !== undefined && (
                  <div className="mb-3">
                    <div className="text-sm text-gray-500">ATS Score</div>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(cv.ats_score)}`}>
                      {Math.round(cv.ats_score)}%
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min(100, cv.ats_score)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-500 mb-4">
                  Last updated: {new Date(cv.updated_at).toLocaleDateString()}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/dashboard/cv-builder/edit/${cv.id}`}
                    className="flex-1 text-center bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => duplicateCV(cv.id)}
                    className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                  >
                    Duplicate
                  </button>
                  {!cv.is_default && (
                    <button
                      onClick={() => setDefaultCV(cv.id)}
                      className="text-blue-600 text-sm hover:underline px-2"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => confirmDeleteCV(cv.id)}
                    className="text-red-600 text-sm hover:underline px-2"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Create New CV</h3>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter CV title (e.g., Software Engineer CV)"
              className="w-full px-3 py-2 border rounded-lg mb-4"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && createCV()}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createCV}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Delete CV"
        message="Are you sure you want to delete this CV? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={handleDeleteCV}
        onCancel={() => {
          setShowDeleteModal(false);
          setCvToDelete(null);
        }}
      />
    </div>
  );
};

export default CVBuilder;