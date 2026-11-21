import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { showToast } from '../../components/toastStore';
import AIDisclaimer from '../../components/AIDisclaimer';

interface CVContent {
  personal_info: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
  };
  summary: string;
  work_experience: {
    id?: string;
    title: string;
    company: string;
    dates: string;
    description: string;
  }[];
  education: {
    id?: string;
    degree: string;
    institution: string;
    dates: string;
    grade?: string;
  }[];
  skills: string[];
  certifications: string[];
}

const defaultContent: CVContent = {
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

const CVEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cv, setCv] = useState<{ id: string; title: string; ats_score?: number | null } | null>(null);
  const [content, setContent] = useState<CVContent>(defaultContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    total_score?: number;
    breakdown?: { formatting?: number; structure?: number; keywords?: number; achievements?: number };
    matched_keywords?: string[];
    missing_keywords?: string[];
    feedback?: string[];
  } | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newCert, setNewCert] = useState('');
  const token = localStorage.getItem('access_token');

  const fetchCV = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/cv/cvs/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCv(response.data);

      // Safely merge content with defaults
      const fetchedContent = response.data.content || {};
      setContent({
        personal_info: {
          ...defaultContent.personal_info,
          ...(fetchedContent.personal_info || {})
        },
        summary: fetchedContent.summary || '',
        work_experience: Array.isArray(fetchedContent.work_experience) ? fetchedContent.work_experience : [],
        education: Array.isArray(fetchedContent.education) ? fetchedContent.education : [],
        skills: Array.isArray(fetchedContent.skills) ? fetchedContent.skills : [],
        certifications: Array.isArray(fetchedContent.certifications) ? fetchedContent.certifications : []
      });
    } catch (err) {
      console.error('Failed to fetch CV:', err);
      showToast('Failed to load CV', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    // Loads run asynchronously; state is updated once each request resolves.
    const run = async () => {
      if (id) {
        fetchCV();
      }
    };
    run();
  }, [id, fetchCV]);

  const saveCV = async () => {
    setSaving(true);
    try {
      await axios.put(`/api/cv/cvs/${id}/`,
        { content: content, title: cv?.title },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('CV saved successfully!', 'success');
    } catch (err) {
      console.error('Failed to save CV:', err);
      showToast('Failed to load CV', 'error');
    } finally {
      setSaving(false);
    }
  };

  const analyzeCV = async () => {
    if (!jobDescription.trim()) {
      showToast('Please enter a job description to analyze against', 'warning');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await axios.post(`/api/cv/cvs/${id}/analyze/`,
        { job_description: jobDescription },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnalysis(response.data);
      showToast(`ATS Score: ${response.data.total_score}%`, 'info');
    } catch (err) {
      console.error('Failed to analyze CV:', err);
      showToast('Failed to analyze CV', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const exportPDF = async () => {
    try {
      const response = await axios.post(`/api/cv/cvs/${id}/export-pdf/`, {},
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${cv?.title || 'cv'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export PDF:', err);
      showToast('Failed to export PDF', 'error');
    }
  };

  const exportWord = async () => {
    try {
      const response = await axios.post(`/api/cv/cvs/${id}/export-word/`, {},
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${cv?.title || 'cv'}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export Word:', err);
      showToast('Failed to export Word', 'error');
    }
  };

  const addWorkExperience = () => {
    setContent({
      ...content,
      work_experience: [...content.work_experience, {
        title: '',
        company: '',
        dates: '',
        description: ''
      }]
    });
  };

  const updateWorkExperience = (index: number, field: string, value: string) => {
    const updated = [...content.work_experience];
    updated[index] = { ...updated[index], [field]: value };
    setContent({ ...content, work_experience: updated });
  };

  const removeWorkExperience = (index: number) => {
    const updated = content.work_experience.filter((_, i) => i !== index);
    setContent({ ...content, work_experience: updated });
  };

  const addEducation = () => {
    setContent({
      ...content,
      education: [...content.education, {
        degree: '',
        institution: '',
        dates: '',
        grade: ''
      }]
    });
  };

  const updateEducation = (index: number, field: string, value: string) => {
    const updated = [...content.education];
    updated[index] = { ...updated[index], [field]: value };
    setContent({ ...content, education: updated });
  };

  const removeEducation = (index: number) => {
    const updated = content.education.filter((_, i) => i !== index);
    setContent({ ...content, education: updated });
  };

  const addSkill = () => {
    if (newSkill.trim() && !content.skills.includes(newSkill.trim())) {
      setContent({
        ...content,
        skills: [...content.skills, newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setContent({
      ...content,
      skills: content.skills.filter(s => s !== skill)
    });
  };

  const addCertification = () => {
    if (newCert.trim() && !content.certifications.includes(newCert.trim())) {
      setContent({
        ...content,
        certifications: [...content.certifications, newCert.trim()]
      });
      setNewCert('');
    }
  };

  const removeCertification = (cert: string) => {
    setContent({
      ...content,
      certifications: content.certifications.filter(c => c !== cert)
    });
  };

  const updatePersonalInfo = (field: string, value: string) => {
    setContent({
      ...content,
      personal_info: { ...content.personal_info, [field]: value }
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-6xl mx-auto">
      <AIDisclaimer feature="ATS scores and CV feedback" />
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Edit CV: {cv?.title || 'Untitled'}</h1>
          {cv?.ats_score && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">ATS Score:</span>
              <span className={`font-bold ${getScoreColor(cv.ats_score)}`}>
                {Math.round(cv.ats_score)}%
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAnalyzer(!showAnalyzer)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            🔍 ATS Analyzer
          </button>
          <button
            onClick={exportPDF}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            📄 Export PDF
          </button>
          <button
            onClick={exportWord}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            📝 Export Word
          </button>
          <button
            onClick={saveCV}
            disabled={saving}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save CV'}
          </button>
        </div>
      </div>

      {/* ATS Analyzer Panel */}
      {showAnalyzer && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">ATS Score Analyzer</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Description
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Paste the job description here to analyze your CV against it..."
            />
          </div>
          <button
            onClick={analyzeCV}
            disabled={analyzing}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {analyzing ? 'Analyzing...' : 'Analyze CV'}
          </button>

          {analysis && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Score Breakdown</h3>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Formatting</span>
                      <span>{analysis.breakdown?.formatting}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${analysis.breakdown?.formatting || 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Structure</span>
                      <span>{analysis.breakdown?.structure}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${analysis.breakdown?.structure || 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Keywords</span>
                      <span>{analysis.breakdown?.keywords}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${analysis.breakdown?.keywords || 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Achievements</span>
                      <span>{analysis.breakdown?.achievements}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${analysis.breakdown?.achievements || 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {(analysis.matched_keywords?.length ?? 0) > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">✅ Matched Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {(analysis.matched_keywords ?? []).map((kw: string, idx: number) => (
                      <span key={idx} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(analysis.missing_keywords?.length ?? 0) > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">⚠️ Missing Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {(analysis.missing_keywords ?? []).map((kw: string, idx: number) => (
                      <span key={idx} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold mb-2">💡 Feedback & Suggestions</h3>
                <ul className="list-disc list-inside space-y-1">
                  {analysis.feedback?.map((fb: string, idx: number) => (
                    <li key={idx} className="text-sm">{fb}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CV Editor Form */}
      <div className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Full Name"
              value={content.personal_info?.name || ''}
              onChange={(e) => updatePersonalInfo('name', e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="email"
              placeholder="Email"
              value={content.personal_info?.email || ''}
              onChange={(e) => updatePersonalInfo('email', e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={content.personal_info?.phone || ''}
              onChange={(e) => updatePersonalInfo('phone', e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Location"
              value={content.personal_info?.location || ''}
              onChange={(e) => updatePersonalInfo('location', e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="url"
              placeholder="LinkedIn URL"
              value={content.personal_info?.linkedin || ''}
              onChange={(e) => updatePersonalInfo('linkedin', e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="url"
              placeholder="GitHub URL"
              value={content.personal_info?.github || ''}
              onChange={(e) => updatePersonalInfo('github', e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Professional Summary</h2>
          <textarea
            value={content.summary || ''}
            onChange={(e) => setContent({ ...content, summary: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Write a brief professional summary highlighting your key skills and experience..."
          />
        </div>

        {/* Work Experience */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Work Experience</h2>
            <button
              onClick={addWorkExperience}
              className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700"
            >
              + Add Experience
            </button>
          </div>
          <div className="space-y-4">
            {content.work_experience.map((exp, idx) => (
              <div key={idx} className="border rounded-lg p-4 relative">
                <button
                  onClick={() => removeWorkExperience(idx)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Job Title"
                    value={exp.title}
                    onChange={(e) => updateWorkExperience(idx, 'title', e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Company"
                    value={exp.company}
                    onChange={(e) => updateWorkExperience(idx, 'company', e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Dates (e.g., Jan 2020 - Present)"
                    value={exp.dates}
                    onChange={(e) => updateWorkExperience(idx, 'dates', e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  />
                </div>
                <textarea
                  placeholder="Description (use bullet points and include achievements)"
                  value={exp.description}
                  onChange={(e) => updateWorkExperience(idx, 'description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Education */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Education</h2>
            <button
              onClick={addEducation}
              className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700"
            >
              + Add Education
            </button>
          </div>
          <div className="space-y-4">
            {content.education.map((edu, idx) => (
              <div key={idx} className="border rounded-lg p-4 relative">
                <button
                  onClick={() => removeEducation(idx)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Degree"
                    value={edu.degree}
                    onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Institution"
                    value={edu.institution}
                    onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Dates"
                    value={edu.dates}
                    onChange={(e) => updateEducation(idx, 'dates', e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Grade (Optional)"
                    value={edu.grade || ''}
                    onChange={(e) => updateEducation(idx, 'grade', e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Skills</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {content.skills.map((skill, idx) => (
              <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
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
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSkill()}
              placeholder="Add a skill (e.g., Python, Project Management)"
              className="flex-1 px-3 py-2 border rounded-lg"
            />
            <button
              onClick={addSkill}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>

        {/* Certifications */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Certifications</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {content.certifications.map((cert, idx) => (
              <span key={idx} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center">
                {cert}
                <button
                  type="button"
                  onClick={() => removeCertification(cert)}
                  className="ml-2 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCert}
              onChange={(e) => setNewCert(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCertification()}
              placeholder="Add a certification (e.g., AWS Certified Developer)"
              className="flex-1 px-3 py-2 border rounded-lg"
            />
            <button
              onClick={addCertification}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={() => navigate('/dashboard/cv-builder')}
          className="text-gray-600 hover:text-gray-800"
        >
          ← Back to CVs
        </button>
        <button
          onClick={saveCV}
          disabled={saving}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
};

export default CVEdit;