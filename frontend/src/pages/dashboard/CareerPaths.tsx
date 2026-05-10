import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { careerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface CareerPath {
  id: string;
  title: string;
  description: string;
  industry: string;
  avg_salary_min: number;
  avg_salary_max: number;
  growth_outlook: string;
  enrollment_count?: number;
  modules?: any[];
}

const CareerPaths: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [paths, setPaths] = useState<CareerPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchIndustries();
    fetchPaths();
  }, []);

  useEffect(() => {
    fetchPaths();
  }, [searchTerm, selectedIndustry]);

  const fetchIndustries = async () => {
    try {
      const response = await careerAPI.getIndustries();
      setIndustries(response.data);
    } catch (err) {
      console.error('Failed to fetch industries:', err);
    }
  };

  const fetchPaths = async () => {
  try {
    setLoading(true);
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (selectedIndustry) params.industry = selectedIndustry;

    const response = await careerAPI.getAll(params);

    // Handle paginated response
    let pathsArray: CareerPath[] = [];
    if (response.data.results && Array.isArray(response.data.results)) {
      pathsArray = response.data.results;
    } else if (Array.isArray(response.data)) {
      pathsArray = response.data;
    } else {
      pathsArray = [];
    }

    setPaths(pathsArray);
  } catch (err) {
    console.error('Failed to fetch career paths:', err);
  } finally {
    setLoading(false);
  }
};

  const handleEnroll = async (pathId: string) => {
    if (!isAuthenticated) {
      setMessage({
        type: 'error',
        text: 'Please login to enroll in career paths'
      });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setEnrolling(pathId);
    try {
      await careerAPI.enroll(pathId);
      setMessage({ type: 'success', text: 'Successfully enrolled!' });
      // Refresh paths to update enrollment count
      fetchPaths();
    } catch (err: any) {
      if (err.response?.status === 401) {
        setMessage({ type: 'error', text: 'Please login to enroll' });
      } else {
        setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to enroll' });
      }
    } finally {
      setEnrolling(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading career paths...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Career Paths</h1>
        {!isAuthenticated && (
          <div className="text-sm text-gray-500">
            <Link to="/login" className="text-blue-600 hover:underline">Login</Link> to enroll
          </div>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-4 ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Search career paths..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Industries</option>
            {industries.map(industry => (
              <option key={industry} value={industry}>{industry}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Career Paths Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {paths.map((path) => (
          <div key={path.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-2">
                <Link to={`/dashboard/career-paths/${path.id}`} className="hover:text-blue-600">
                  {path.title}
                </Link>
              </h2>
              <p className="text-gray-600 text-sm mb-4">{path.description?.substring(0, 150)}...</p>

              <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-4">
                <span>🏭 {path.industry}</span>
                {path.avg_salary_min && path.avg_salary_max && (
                  <span>💰 ${path.avg_salary_min.toLocaleString()} - ${path.avg_salary_max.toLocaleString()}</span>
                )}
                {path.growth_outlook && (
                  <span>📈 {path.growth_outlook}</span>
                )}
                {path.enrollment_count !== undefined && (
                  <span>👥 {path.enrollment_count} enrolled</span>
                )}
              </div>

              <div className="flex justify-between items-center">
                <Link
                  to={`${path.id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Details →
                </Link>
                <button
                  onClick={() => handleEnroll(path.id)}
                  disabled={enrolling === path.id}
                  className="bg-green-600 text-white px-4 py-1 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {enrolling === path.id ? 'Enrolling...' : 'Enroll'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {paths.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No career paths found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default CareerPaths;