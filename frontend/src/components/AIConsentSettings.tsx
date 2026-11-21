import React, { useState } from 'react';
import { useAuth } from '../context/auth';
import { openAIConsent } from './aiConsentEvents';
import { showToast } from './toastStore';

/** "AI & Privacy" card for the profile page. */
const AIConsentSettings: React.FC = () => {
  const { user, setAIConsent } = useAuth();
  const [saving, setSaving] = useState(false);

  const enabled = user?.ai_consent === true && !user?.ai_consent_required;

  const withdraw = async () => {
    setSaving(true);
    try {
      await setAIConsent(false);
      showToast('AI features turned off', 'info');
    } catch {
      showToast('Could not update your AI preference', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">✨ AI &amp; Privacy</h2>
          <p className="text-sm text-gray-600 mt-1 max-w-xl">
            Recommendations, CV/job matching and interview help use AI to process your profile, CVs and the
            job descriptions you enter.
          </p>
        </div>
        <span
          className={`text-xs font-medium px-3 py-1 rounded-full ${
            enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {enabled ? 'AI features enabled' : user?.ai_consent === false ? 'AI features disabled' : 'Not decided'}
        </span>
      </div>
      <div className="mt-4 flex gap-3 flex-wrap">
        <button
          type="button"
          onClick={openAIConsent}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          {enabled ? 'Review AI notice' : 'Review & enable AI'}
        </button>
        {enabled && (
          <button
            type="button"
            onClick={withdraw}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Withdraw consent'}
          </button>
        )}
      </div>
    </div>
  );
};

export default AIConsentSettings;
