import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/auth';
import { AI_CONSENT_REQUIRED_EVENT } from '../services/api';
import { showToast } from './toastStore';
import AIConsentModal, { type AIConsentReason } from './AIConsentModal';
import { OPEN_AI_CONSENT_EVENT } from './aiConsentEvents';
import { AI_CONSENT_CLOSED_EVENT } from './onboarding/onboarding';

/**
 * Shows the AI usage notice:
 *  - automatically on the first visit after login if the user hasn't answered yet,
 *  - whenever the backend rejects an AI request for missing consent,
 *  - on demand (Profile → AI & Privacy, footer link).
 */
const AIConsentManager: React.FC = () => {
  const { user, isAuthenticated, setAIConsent } = useAuth();
  const [requested, setRequested] = useState<AIConsentReason | null>(null);
  const [dismissedFirstVisit, setDismissedFirstVisit] = useState(false);

  useEffect(() => {
    const onRequired = () => setRequested('feature');
    const onOpen = () => setRequested('settings');
    window.addEventListener(AI_CONSENT_REQUIRED_EVENT, onRequired);
    window.addEventListener(OPEN_AI_CONSENT_EVENT, onOpen);
    return () => {
      window.removeEventListener(AI_CONSENT_REQUIRED_EVENT, onRequired);
      window.removeEventListener(OPEN_AI_CONSENT_EVENT, onOpen);
    };
  }, []);

  const firstVisit = isAuthenticated && !!user?.ai_consent_required && !dismissedFirstVisit;
  const reason: AIConsentReason = requested ?? 'first-visit';
  const isOpen = isAuthenticated && (requested !== null || firstVisit);

  const close = useCallback(() => {
    setRequested(null);
    setDismissedFirstVisit(true);
    // Lets the optional welcome tour open next without stacking dialogs
    window.dispatchEvent(new CustomEvent(AI_CONSENT_CLOSED_EVENT));
  }, []);

  const accept = async () => {
    await setAIConsent(true);
    showToast(
      reason === 'feature' ? 'AI features enabled. Please try that again.' : 'AI features enabled',
      'success'
    );
    close();
  };

  const decline = async () => {
    await setAIConsent(false);
    showToast('AI features are turned off. You can enable them any time in your profile.', 'info');
    close();
  };

  return (
    <AIConsentModal
      isOpen={isOpen}
      reason={reason}
      currentConsent={user?.ai_consent}
      onAccept={accept}
      onDecline={decline}
      onDismiss={close}
    />
  );
};

export default AIConsentManager;
