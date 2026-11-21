import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/auth';
import { aiAPI, cvAPI } from '../../services/api';
import axios from 'axios';
import { showToast } from '../../components/toastStore';
import AIDisclaimer from '../../components/AIDisclaimer';
import type { ApiError } from '../../utils/errors';

interface ScanResult {
  scan_id: string;
  match_score: number;
  match_method: string;
  matched_skills: string[];
  missing_skills: string[];
  extracted_skills: string[];
  recommendations: string[];
  cv_id: string;
  cv_title: string;
  job_title: string;
  company: string;
  created_at: string;
}

interface ScanHistory {
  id: string;
  job_title: string;
  company: string;
  match_score: number;
  created_at: string;
  cv_title: string;
}

interface ScanDetail extends ScanHistory {
  job_description: string;
  extracted_keywords: string[];
  required_skills: string[];
  matched_skills: string[];
  missing_skills: string[];
  recommendations: string[];
}

interface CVSummary {
  id: string;
  title: string;
  is_default?: boolean;
}

const JobScanner: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [cvs, setCvs] = useState<CVSummary[]>([]);
  const [selectedCV, setSelectedCV] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchCVs = useCallback(async () => {
    try {
      const response = await cvAPI.getUserCVs();
      let cvsData = [];
      if (Array.isArray(response.data)) {
        cvsData = response.data;
      } else if (response.data.results) {
        cvsData = response.data.results;
      } else {
        cvsData = [];
      }
      setCvs(cvsData);
      if (cvsData.length > 0) {
        const defaultCV = cvsData.find((cv: CVSummary) => cv.is_default);
        setSelectedCV(defaultCV?.id || cvsData[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch CVs:', err);
    }
  }, []);

  const fetchScanHistory = useCallback(async () => {
    try {
      const response = await aiAPI.getJobScanHistory();
      setScanHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch scan history:', err);
    }
  }, []);

  useEffect(() => {
    // Loads run asynchronously; state is updated once each request resolves.
    const run = async () => {
      if (isAuthenticated) {
        fetchCVs();
        fetchScanHistory();
      }
    };
    run();
  }, [isAuthenticated, fetchCVs, fetchScanHistory]);

  const fetchScanDetail = async (scanId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`/api/ai/job-scans/${scanId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedScan(response.data);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Failed to fetch scan detail:', err);
      showToast('Failed to load scan details', 'error');
    }
  };

  const handleScan = async () => {
    if (!selectedCV) {
      showToast('Please select a CV', 'warning');
      return;
    }
    if (!jobDescription.trim()) {
      showToast('Please enter a job description', 'warning');
      return;
    }

    setScanning(true);
    setResult(null);
    try {
      const response = await aiAPI.analyzeJobMatch(
        selectedCV,
        jobDescription,
        jobTitle,
        company
      );
      setResult(response.data);
      fetchScanHistory();
    } catch (caught) {
      const err = caught as ApiError;
      console.error('Failed to scan:', err);
      showToast('Failed to analyze job match', 'error');
    } finally {
      setScanning(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };
  return (
    <>
    <AIDisclaimer feature="Match scores and suggestions" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Panel - Input */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">AI Job Description Scanner</h2>
          <p className="text-gray-600 text-sm mb-6">
            Paste a job description and our AI will analyze how well your CV matches the requirements.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select CV
              </label>
              <select
                value={selectedCV}
                onChange={(e) => setSelectedCV(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select a CV</option>
                {cvs.map((cv) => (
                  <option key={cv.id} value={cv.id}>{cv.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title (Optional)
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Senior Software Engineer"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company (Optional)
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company name"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Description *
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                placeholder="Paste the job description here..."
              />
            </div>

            <button
              onClick={handleScan}
              disabled={scanning}
              className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
            >
              {scanning ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  AI Analyzing...
                </span>
              ) : (
                '🔍 Analyze with AI'
              )}
            </button>
          </div>
        </div>

        {/* Scan History - Clickable */}
        {scanHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Recent Scans</h3>
            <div className="space-y-2">
              {scanHistory.map((scan) => (
                <div
                  key={scan.id}
                  onClick={() => fetchScanDetail(scan.id)}
                  className="flex justify-between items-center border-b pb-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {scan.job_title || 'Job Scan'}
                      {scan.company && <span className="text-gray-500 text-xs ml-1">at {scan.company}</span>}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(scan.created_at).toLocaleDateString()} • CV: {scan.cv_title || 'Unknown'}
                    </div>
                  </div>
                  <div className={`font-semibold ${getScoreColor(scan.match_score)}`}>
                    {Math.round(scan.match_score)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Results */}
      {result && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">AI Analysis Results</h2>

            {/* Match Score */}
            <div className="text-center mb-6">
              <div className={`text-5xl font-bold ${getScoreColor(result.match_score)} mb-2`}>
                {Math.round(result.match_score)}%
              </div>
              <div className="text-gray-600">Overall Match Score</div>
              <div className="text-xs text-gray-400 mt-1">Method: {result.match_method}</div>
            </div>

            {/* Score Progress Bar */}
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-purple-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${result.match_score}%` }}
                />
              </div>
            </div>

            {/* Extracted Skills */}
            {result.extracted_skills && result.extracted_skills.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">🤖 AI Extracted Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {result.extracted_skills.slice(0, 15).map((skill) => (
                    <span key={skill} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Matched Skills */}
            {result.matched_skills && result.matched_skills.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-green-800 mb-2">✅ Skills Found in Your CV</h3>
                <div className="flex flex-wrap gap-2">
                  {result.matched_skills.map((skill) => (
                    <span key={skill} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Skills */}
            {result.missing_skills && result.missing_skills.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Missing Skills to Add</h3>
                <div className="flex flex-wrap gap-2">
                  {result.missing_skills.map((skill) => (
                    <span key={skill} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* AI Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">💡 AI Recommendations</h3>
                <ul className="list-disc list-inside space-y-1">
                  {result.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-blue-700">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scan Detail Modal */}
      {showDetailModal && selectedScan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Scan Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Job Title</div>
                  <div className="font-medium">{selectedScan.job_title || 'Not specified'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Company</div>
                  <div className="font-medium">{selectedScan.company || 'Not specified'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Match Score</div>
                  <div className={`font-bold text-lg ${getScoreColor(selectedScan.match_score)}`}>
                    {Math.round(selectedScan.match_score)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Scanned On</div>
                  <div className="font-medium">{new Date(selectedScan.created_at).toLocaleString()}</div>
                </div>
              </div>

              {/* Job Description Preview */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Job Description</h3>
                <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedScan.job_description?.substring(0, 500)}...</p>
                </div>
              </div>

              {/* Extracted Keywords */}
              {selectedScan.extracted_keywords && selectedScan.extracted_keywords.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Extracted Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedScan.extracted_keywords.map((kw, idx) => (
                      <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Skills */}
              {selectedScan.required_skills && selectedScan.required_skills.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedScan.required_skills.map((skill, idx) => (
                      <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Skills */}
              {selectedScan.matched_skills && selectedScan.matched_skills.length > 0 && (
                <div>
                  <h3 className="font-semibold text-green-800 mb-2">✅ Skills You Have</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedScan.matched_skills.map((skill, idx) => (
                      <span key={idx} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Skills */}
              {selectedScan.missing_skills && selectedScan.missing_skills.length > 0 && (
                <div>
                  <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Skills to Develop</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedScan.missing_skills.map((skill, idx) => (
                      <span key={idx} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {selectedScan.recommendations && selectedScan.recommendations.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">💡 Recommendations</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedScan.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm text-blue-700">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default JobScanner;