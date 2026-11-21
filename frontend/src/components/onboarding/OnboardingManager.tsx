import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/auth';
import WelcomeTour from './WelcomeTour';
import {
  AI_CONSENT_CLOSED_EVENT,
  OPEN_TOUR_EVENT,
  useFirstStepsProgress,
  useOnboardingPrefs,
} from './onboarding';

/**
 * Shows the optional welcome tour:
 *  - automatically, once, for brand-new users (no activity yet) after the AI consent dialog is settled,
 *  - on demand via the "Getting started" link / checklist.
 */
const OnboardingManager: React.FC = () => {
  const { user } = useAuth();
  const [prefs, updatePrefs] = useOnboardingPrefs(user?.id);
  const [requested, setRequested] = useState(false);
  const [consentClosed, setConsentClosed] = useState(false);
  const progress = useFirstStepsProgress(!!user && !prefs.tourSeen);

  useEffect(() => {
    const onOpen = () => {
      setRequested(true);
      updatePrefs({ checklistHidden: false });
    };
    const onConsentClosed = () => setConsentClosed(true);
    window.addEventListener(OPEN_TOUR_EVENT, onOpen);
    window.addEventListener(AI_CONSENT_CLOSED_EVENT, onConsentClosed);
    return () => {
      window.removeEventListener(OPEN_TOUR_EVENT, onOpen);
      window.removeEventListener(AI_CONSENT_CLOSED_EVENT, onConsentClosed);
    };
  }, [updatePrefs]);

  const isNewUser = progress !== null && progress.completed === 0;
  const consentSettled = !user?.ai_consent_required || consentClosed;
  const autoOpen = !!user && !prefs.tourSeen && isNewUser && consentSettled;

  const close = useCallback(() => {
    setRequested(false);
    updatePrefs({ tourSeen: true });
  }, [updatePrefs]);

  return <WelcomeTour isOpen={requested || autoOpen} firstName={user?.first_name} onClose={close} />;
};

export default OnboardingManager;
