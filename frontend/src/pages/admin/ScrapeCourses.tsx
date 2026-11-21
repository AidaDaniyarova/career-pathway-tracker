import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { showToast } from '../../components/toastStore';
import type { ApiError } from '../../utils/errors';

interface ScrapeResult {
  created: number;
  updated: number;
  skipped: number;
  total: number;
  courses_sample: Array<{
    title: string;
    difficulty: string;
    duration: number;
  }>;
}

interface CareerPath {
  id: string;
  title: string;
}

const ScrapeCourses: React.FC = () => {
  const [searchTerms, setSearchTerms] = useState<string[]>(['python', 'javascript', 'react', 'django', 'java']);
  const [newTerm, setNewTerm] = useState('');
  const [maxCourses, setMaxCourses] = useState(20);
  const [selectedCareerPath, setSelectedCareerPath] = useState<string>('');
  const [careerPaths, setCareerPaths] = useState<CareerPath[]>([]);
  const [scraping, setScraping] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [loadingPaths, setLoadingPaths] = useState(false);
  const token = localStorage.getItem('access_token');

  const fetchCareerPaths = useCallback(async () => {
    setLoadingPaths(true);
    try {
      const response = await axios.get('/api/learning/career-paths/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCareerPaths(response.data);
    } catch (err) {
      console.error('Failed to fetch career paths:', err);
    } finally {
      setLoadingPaths(false);
    }
  }, [token]);

  React.useEffect(() => {
    // Loads run asynchronously; state is updated once each request resolves.
    const run = async () => {
      fetchCareerPaths();
    };
    run();
  }, [fetchCareerPaths]);

  const addSearchTerm = () => {
    if (newTerm.trim() && !searchTerms.includes(newTerm.trim())) {
      setSearchTerms([...searchTerms, newTerm.trim()]);
      setNewTerm('');
    }
  };

  const removeSearchTerm = (term: string) => {
    setSearchTerms(searchTerms.filter(t => t !== term));
  };

  const handleScrape = async () => {
  if (searchTerms.length === 0) {
    showToast('Please add at least one search term', 'warning');
    return;
  }

  setScraping(true);
  setResult(null);

  try {
    const response = await axios.post('/api/scraper/scrape/',
      {
        search_terms: searchTerms,
        career_path_id: selectedCareerPath || null,
        max_courses: maxCourses
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setResult(response.data.result);
    showToast(`Successfully scraped ${response.data.result.created} new courses!`, 'success');
  } catch (caught) {
    const err = caught as ApiError;
    console.error('Scraping failed:', err);
    showToast(err.response?.data?.error || 'Scraping failed', 'error');
  } finally {
    setScraping(false);
  }
};

const scrapeForCareerPath = async (careerPathId: string, careerPathTitle: string) => {
  setScraping(true);
  try {
    const response = await axios.post(`/api/scraper/scrape/career-path/${careerPathId}/`,
      { max_courses: maxCourses },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    showToast(`Scraped ${response.data.result.created} courses for ${careerPathTitle}`, 'success');
    setResult(response.data.result);
  } catch {
    showToast(`Failed to scrape for ${careerPathTitle}`, 'error');
  } finally {
    setScraping(false);
  }
};

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Coursera Course Scraper</h1>
      </div>

      {/* Search Terms Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Search Terms</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {searchTerms.map((term) => (
            <span key={term} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
              {term}
              <button
                onClick={() => removeSearchTerm(term)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addSearchTerm()}
            placeholder="Add search term (e.g., 'python', 'data science')"
            className="flex-1 px-3 py-2 border rounded-lg"
          />
          <button
            onClick={addSearchTerm}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Add
          </button>
        </div>
      </div>

      {/* Settings Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Courses per Search Term
            </label>
            <input
              type="number"
              value={maxCourses}
              onChange={(e) => setMaxCourses(Math.min(50, Math.max(1, parseInt(e.target.value) || 10)))}
              min={1}
              max={50}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum 50 courses per term</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link to Career Path (Optional)
            </label>
            <select
              value={selectedCareerPath}
              onChange={(e) => setSelectedCareerPath(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              disabled={loadingPaths}
            >
              <option value="">-- None --</option>
              {careerPaths.map((path) => (
                <option key={path.id} value={path.id}>{path.title}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Courses will be linked to this career path</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleScrape}
            disabled={scraping || searchTerms.length === 0}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {scraping ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Scraping...
              </>
            ) : (
              '🔍 Start Scraping'
            )}
          </button>
        </div>

        {/* Quick Scrape for Career Paths */}
        {careerPaths.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-md font-medium mb-3">Quick Scrape for Career Paths</h3>
            <div className="flex flex-wrap gap-2">
              {careerPaths.slice(0, 6).map((path) => (
                <button
                  key={path.id}
                  onClick={() => scrapeForCareerPath(path.id, path.title)}
                  disabled={scraping}
                  className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm hover:bg-purple-200 disabled:opacity-50"
                >
                  {path.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Scraping Results</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{result.created}</div>
              <div className="text-sm text-gray-600">New Courses</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{result.updated}</div>
              <div className="text-sm text-gray-600">Updated</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{result.skipped}</div>
              <div className="text-sm text-gray-600">Skipped</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{result.total}</div>
              <div className="text-sm text-gray-600">Total Found</div>
            </div>
          </div>

          {result.courses_sample && result.courses_sample.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-800 mb-2">Sample Courses Imported</h3>
              <div className="space-y-2">
                {result.courses_sample.map((course, idx) => (
                  <div key={idx} className="border-b pb-2">
                    <p className="font-medium">{course.title}</p>
                    <div className="flex gap-3 text-sm text-gray-500">
                      <span>📊 {course.difficulty}</span>
                      <span>⏱️ {course.duration} min</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">ℹ️ About Coursera Scraping</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Courses are scraped from Coursera's public search API</li>
          <li>Imported courses are marked as "External Course" type</li>
          <li>Students will be redirected to the original Coursera page when starting the module</li>
          <li>XP points are calculated based on course duration and difficulty</li>
          <li>Skills are automatically extracted from course descriptions</li>
        </ul>
      </div>
    </div>
  );
};

export default ScrapeCourses;