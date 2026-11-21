import { useCallback, useEffect, useState } from 'react';
import { authAPI } from '../../services/api';

/* ------------------------------------------------------------------ */
/* Per-user display preferences (stored in this browser only)          */
/* ------------------------------------------------------------------ */

export interface OnboardingPrefs {
  /** The welcome tour was finished or skipped. */
  tourSeen: boolean;
  /** The "Getting started" checklist was hidden by the user. */
  checklistHidden: boolean;
}

const DEFAULT_PREFS: OnboardingPrefs = { tourSeen: false, checklistHidden: false };
const PREFS_CHANGED_EVENT = 'onboarding-prefs-changed';
/** Dispatch to open the welcome tour from anywhere (footer link, checklist). */
export const OPEN_TOUR_EVENT = 'open-onboarding-tour';
/** Fired by the AI consent dialog when it closes, so the tour never stacks on top of it. */
export const AI_CONSENT_CLOSED_EVENT = 'ai-consent-closed';

const storageKey = (userId: string) => `cpt:onboarding:${userId}`;

export function readPrefs(userId: string | undefined): OnboardingPrefs {
  if (!userId) return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writePrefs(userId: string | undefined, patch: Partial<OnboardingPrefs>) {
  if (!userId) return;
  const next = { ...readPrefs(userId), ...patch };
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode etc.) - preference just won't persist
  }
  window.dispatchEvent(new CustomEvent(PREFS_CHANGED_EVENT, { detail: { userId } }));
}

export const openTour = () => window.dispatchEvent(new CustomEvent(OPEN_TOUR_EVENT));

/** Live view of the user's onboarding prefs; updates when any component writes them. */
export function useOnboardingPrefs(userId: string | undefined) {
  const [prefs, setPrefs] = useState<OnboardingPrefs>(() => readPrefs(userId));

  useEffect(() => {
    const sync = () => setPrefs(readPrefs(userId));
    window.addEventListener(PREFS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(PREFS_CHANGED_EVENT, sync);
  }, [userId]);

  const update = useCallback((patch: Partial<OnboardingPrefs>) => writePrefs(userId, patch), [userId]);
  return [prefs, update] as const;
}

/* ------------------------------------------------------------------ */
/* First steps                                                         */
/* ------------------------------------------------------------------ */

interface ProfileStats {
  skills?: { total?: number };
  quizzes?: { taken?: number };
  enrollments?: { total?: number };
  modules?: { started?: number };
  cvs?: { total?: number };
}

export interface FirstStep {
  id: string;
  icon: string;
  title: string;
  description: string;
  to: string;
  cta: string;
  isDone: (stats: ProfileStats) => boolean;
}

export const FIRST_STEPS: FirstStep[] = [
  {
    id: 'skills',
    icon: '👤',
    title: 'Add your skills',
    description: 'Tell us what you already know so suggestions fit you.',
    to: '/dashboard/profile',
    cta: 'Open profile',
    isDone: (s) => (s.skills?.total ?? 0) > 0,
  },
  {
    id: 'quiz',
    icon: '📝',
    title: 'Take the career quiz',
    description: '5 quick questions that suggest careers matching your interests.',
    to: '/dashboard/quizzes',
    cta: 'Take quiz',
    isDone: (s) => (s.quizzes?.taken ?? 0) > 0,
  },
  {
    id: 'path',
    icon: '🎯',
    title: 'Choose a career path',
    description: 'Enroll in a path to get an ordered list of modules to learn.',
    to: '/dashboard/career-paths',
    cta: 'Browse paths',
    isDone: (s) => (s.enrollments?.total ?? 0) > 0,
  },
  {
    id: 'module',
    icon: '📚',
    title: 'Start your first module',
    description: 'Complete modules to earn XP and level up.',
    to: '/dashboard/learning',
    cta: 'Start learning',
    isDone: (s) => (s.modules?.started ?? 0) > 0,
  },
  {
    id: 'cv',
    icon: '📄',
    title: 'Create your CV',
    description: 'Build a CV, then check it against real job descriptions.',
    to: '/dashboard/cv-builder',
    cta: 'Build CV',
    isDone: (s) => (s.cvs?.total ?? 0) > 0,
  },
];

export interface FirstStepsProgress {
  done: Record<string, boolean>;
  completed: number;
  total: number;
}

/** Loads the user's activity counts and derives which first steps are done. */
export function useFirstStepsProgress(enabled: boolean) {
  const [progress, setProgress] = useState<FirstStepsProgress | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const run = async () => {
      try {
        const response = await authAPI.getProfile();
        const stats: ProfileStats = response.data?.stats ?? {};
        const done = Object.fromEntries(FIRST_STEPS.map((step) => [step.id, step.isDone(stats)]));
        const completed = Object.values(done).filter(Boolean).length;
        if (!cancelled) setProgress({ done, completed, total: FIRST_STEPS.length });
      } catch {
        // Onboarding is optional - fail silently
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return progress;
}
