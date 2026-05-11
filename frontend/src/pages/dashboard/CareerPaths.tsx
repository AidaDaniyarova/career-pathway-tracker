import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface CareerPath {
  id: string;
  title: string;
  slug: string;
  description: string;
  industry: string;
  avg_salary_min: number;
  avg_salary_max: number;
  growth_outlook: string;
  modules_count: number;
  enrollment_count: number;
}

const CareerPaths: React.FC = () => {
  const [paths, setPaths] = useState<CareerPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);

  useEffect(() => {
    fetchCareerPaths();
    fetchIndustries();
  }, []);

  useEffect(() => {
    fetchCareerPaths();
  }, [searchTerm, selectedIndustry]);

  const fetchCareerPaths = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/learning/career-paths/';
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedIndustry) params.append('industry', selectedIndustry);
      if (params.toString()) url += `?${params.toString()}`;

      // No token needed for public viewing
      const response = await axios.get(url);

      // Handle both array and paginated response formats
      let pathsData = response.data;
      if (response.data && Array.isArray(response.data.results)) {
        pathsData = response.data.results;
      } else if (response.data && !Array.isArray(response.data)) {
        pathsData = response.data.data || response.data.results || [];
      }

      setPaths(Array.isArray(pathsData) ? pathsData : []);
    } catch (err) {
      console.error('Failed to fetch career paths:', err);
      setError('Failed to load career paths. Please try again.');
      setPaths([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchIndustries = async () => {
    try {
      const response = await axios.get('/api/learning/career-paths/industries/');
      setIndustries(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to fetch industries:', err);
      setIndustries([]);
    }
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
          onClick={() => fetchCareerPaths()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Career Paths</h1>
        <div className="flex gap-3">
          {industries.length > 0 && (
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">All Industries</option>
              {industries.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          )}
          <input
            type="text"
            placeholder="Search career paths..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border rounded-lg w-64"
          />
        </div>
      </div>

      {paths.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-4xl mb-4">🎯</div>
          <p className="text-gray-500">No career paths found.</p>
          {(searchTerm || selectedIndustry) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedIndustry('');
              }}
              className="mt-4 text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paths.map((path) => (
            <div key={path.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{path.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {path.description?.substring(0, 120)}...
                </p>
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-gray-500">{path.industry || 'Various Industries'}</span>
                  <span className="text-green-600">
                    {path.avg_salary_min && path.avg_salary_max
                      ? `$${path.avg_salary_min.toLocaleString()} - $${path.avg_salary_max.toLocaleString()}`
                      : 'Salary Varies'}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 mb-4">
                  <span>📚 {path.modules_count || 0} modules</span>
                  <span>👥 {path.enrollment_count || 0} enrolled</span>
                </div>
                <Link
                  to={`${path.id}`}
                  className="block text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CareerPaths;