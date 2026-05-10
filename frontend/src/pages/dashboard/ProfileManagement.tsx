import React, { useState, useEffect } from 'react';
import api from '../../services/api'; // Use your configured api instance
import { useAuth } from '../../context/AuthContext';

interface Skill {
  id: string;  // This should be UUID from backend
  name: string;
  level: number;
}

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  bio: string;
  skills: Skill[];
  interests: string[];
  education_level: string;
  years_experience: number;
  current_job_title: string;
}

const ProfileManagement: React.FC = () => {
  useAuth();
  const [profile, setProfile] = useState<Profile>({
    first_name: '',
    last_name: '',
    email: '',
    bio: '',
    skills: [],
    interests: [],
    education_level: '',
    years_experience: 0,
    current_job_title: '',
  });
  const [newSkill, setNewSkill] = useState('');
  const [skillLevel, setSkillLevel] = useState(3);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [showSkillSearch, setShowSkillSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // Fixed: was useState('') but never updated
  const [newInterest, setNewInterest] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchAvailableSkills();
  }, []);

  const fetchProfile = async () => {
    try {
      console.log("Fetching profile...");
      const response = await api.get('/users/profile/');
      console.log("PROFILE RESPONSE:", response.data);

      setProfile({
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        email: response.data.email || '',
        bio: response.data.bio || '',
        skills: response.data.skills || [],
        interests: response.data.interests || [],
        education_level: response.data.education_level || '',
        years_experience: response.data.years_experience || 0,
        current_job_title: response.data.current_job_title || '',
      });
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setMessage({ type: 'error', text: 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSkills = async () => {
    try {
      const response = await api.get('/skills/skills/');
      console.log('Available skills:', response.data);

      // Handle different response formats
      let skillsArray = [];
      if (Array.isArray(response.data)) {
        skillsArray = response.data;
      } else if (response.data.results && Array.isArray(response.data.results)) {
        skillsArray = response.data.results;
      } else {
        skillsArray = [];
      }

      setAvailableSkills(skillsArray);
    } catch (err) {
      console.error('Failed to fetch skills:', err);
      setAvailableSkills([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Prepare skills data for API - USE THE UUID, NOT THE NAME
      const skillsData = profile.skills.map(skill => ({
        id: skill.id,  // This must be the UUID from the backend
        level: skill.level
      }));

      const updateData = {
        first_name: profile.first_name,
        last_name: profile.last_name,
        bio: profile.bio,
        interests: profile.interests,
        education_level: profile.education_level,
        years_experience: profile.years_experience,
        current_job_title: profile.current_job_title,
        skills: skillsData
      };

      console.log('Sending update data:', updateData); // Debug log

      const response = await api.put('/users/profile/', updateData);
      console.log('Update response:', response.data);

      setMessage({ type: 'success', text: 'Profile updated successfully!' });

      // Refresh profile data after update
      setTimeout(() => {
        fetchProfile();
      }, 1000);
    } catch (err: any) {
      console.error('Update error:', err);
      console.error('Error response:', err.response?.data);

      // Show detailed error message
      const errorMessage = err.response?.data?.message ||
                          err.response?.data?.detail ||
                          'Failed to update profile.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (!newSkill.trim()) return;

    // Try to find the skill in availableSkills by name
    const matchedSkill = availableSkills.find(s =>
      s.name.toLowerCase() === newSkill.toLowerCase() ||
      s.name.toLowerCase().includes(newSkill.toLowerCase())
    );

    if (matchedSkill) {
      // Check if skill already exists in profile
      if (!profile.skills.some(s => s.id === matchedSkill.id)) {
        setProfile({
          ...profile,
          skills: [...profile.skills, {
            id: matchedSkill.id,  // Use the UUID from available skills
            name: matchedSkill.name,
            level: skillLevel
          }]
        });
      } else {
        setMessage({ type: 'error', text: 'Skill already added!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } else {
      // Skill not found in available skills
      setMessage({ type: 'error', text: `"${newSkill}" is not in the skills list. Please select from the dropdown.` });
      setTimeout(() => setMessage(null), 3000);
    }

    setNewSkill('');
    setSkillLevel(3);
    setShowSkillSearch(false);
  };

  const removeSkill = (skillId: string) => {
    setProfile({ ...profile, skills: profile.skills.filter(s => s.id !== skillId) });
  };

  const updateSkillLevel = (skillId: string, level: number) => {
    setProfile({
      ...profile,
      skills: profile.skills.map(s => s.id === skillId ? { ...s, level } : s)
    });
  };

  const addInterest = () => {
    if (newInterest.trim() && !profile.interests.includes(newInterest.trim())) {
      setProfile({ ...profile, interests: [...profile.interests, newInterest.trim()] });
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setProfile({ ...profile, interests: profile.interests.filter(i => i !== interest) });
  };

  // Update search term to filter skills
  const filteredSkills = Array.isArray(availableSkills) && searchTerm
    ? availableSkills.filter(skill =>
        skill.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  if (loading) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Profile Management</h1>

      {message && (
        <div className={`p-4 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={profile.first_name}
                onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={profile.last_name}
                onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={profile.email}
                className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Job Title</label>
              <input
                type="text"
                value={profile.current_job_title}
                onChange={(e) => setProfile({ ...profile, current_job_title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Tell us about yourself..."
            />
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Skills</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {profile.skills.map((skill) => (
              <div key={skill.id} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                <span>{skill.name}</span>
                <select
                  value={skill.level}
                  onChange={(e) => updateSkillLevel(skill.id, parseInt(e.target.value))}
                  className="bg-blue-200 text-blue-800 rounded px-1 text-xs"
                >
                  {[1, 2, 3, 4, 5].map(l => (
                    <option key={l} value={l}>Level {l}</option>
                  ))}
                </select>
                <button type="button" onClick={() => removeSkill(skill.id)} className="text-blue-600 hover:text-blue-800">×</button>
              </div>
            ))}
          </div>

          <div className="relative">
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => {
                  setNewSkill(e.target.value);
                  setSearchTerm(e.target.value);
                  setShowSkillSearch(true);
                }}
                onFocus={() => setShowSkillSearch(true)}
                placeholder="Search for a skill"
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(parseInt(e.target.value))}
                className="px-3 py-2 border rounded-lg"
              >
                {[1, 2, 3, 4, 5].map(l => (
                  <option key={l} value={l}>Level {l}</option>
                ))}
              </select>
              <button type="button" onClick={addSkill} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Add
              </button>
            </div>

            {showSkillSearch && searchTerm && filteredSkills.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredSkills.slice(0, 10).map(skill => (
                  <div
                    key={skill.id}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setNewSkill(skill.name);
                      setSearchTerm(skill.name);
                      setShowSkillSearch(false);
                    }}
                  >
                    {skill.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">Rate your proficiency from 1 (Beginner) to 5 (Expert)</p>
        </div>

        {/* Interests */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Interests</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {profile.interests.map((interest) => (
              <span key={interest} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center">
                {interest}
                <button type="button" onClick={() => removeInterest(interest)} className="ml-2 text-green-600 hover:text-green-800">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addInterest()}
              placeholder="Add an interest (e.g., AI, Web Development)"
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button type="button" onClick={addInterest} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              Add
            </button>
          </div>
        </div>

        {/* Professional Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Professional Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Education Level</label>
              <select
                value={profile.education_level}
                onChange={(e) => setProfile({ ...profile, education_level: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select</option>
                <option value="high_school">High School</option>
                <option value="associate">Associate Degree</option>
                <option value="bachelor">Bachelor's Degree</option>
                <option value="master">Master's Degree</option>
                <option value="phd">PhD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
              <input
                type="number"
                value={profile.years_experience}
                onChange={(e) => setProfile({ ...profile, years_experience: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileManagement;