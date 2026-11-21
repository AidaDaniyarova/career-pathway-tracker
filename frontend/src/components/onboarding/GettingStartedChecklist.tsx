import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth';
import { showToast } from '../toastStore';
import { FIRST_STEPS, openTour, useFirstStepsProgress, useOnboardingPrefs } from './onboarding';

/** Optional "Getting started" checklist for the dashboard home. Steps tick off from real activity. */
const GettingStartedChecklist: React.FC = () => {
  const { user } = useAuth();
  const [prefs, updatePrefs] = useOnboardingPrefs(user?.id);
  const progress = useFirstStepsProgress(!!user && !prefs.checklistHidden);

  if (!user || prefs.checklistHidden || !progress) return null;

  const allDone = progress.completed === progress.total;
  const nextStep = FIRST_STEPS.find((s) => !progress.done[s.id]);
  const percent = Math.round((progress.completed / progress.total) * 100);

  const hide = () => {
    updatePrefs({ checklistHidden: true });
    showToast('Checklist hidden. Use "Getting started" at the bottom of the page to bring it back.', 'info');
  };

  if (allDone) {
    return (
      <section className="bg-white rounded-lg shadow p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">🎉</span>
          <div>
            <h2 className="font-semibold text-gray-900">You're all set up!</h2>
            <p className="text-sm text-gray-600">You've completed every first step. Keep learning to level up.</p>
          </div>
        </div>
        <button type="button" onClick={hide} className="text-sm text-gray-500 hover:text-gray-800">
          Dismiss
        </button>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-lg shadow p-5" aria-labelledby="getting-started-title">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 id="getting-started-title" className="text-lg font-semibold text-gray-900">🚀 Getting started</h2>
          <p className="text-sm text-gray-600">
            Optional first steps to get the most out of the app. {progress.completed} of {progress.total} done.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <button type="button" onClick={openTour} className="text-blue-600 hover:underline">
            Take the quick tour
          </button>
          <button type="button" onClick={hide} className="text-gray-500 hover:text-gray-800">
            Hide
          </button>
        </div>
      </div>

      <div
        className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Getting started progress"
      >
        <div className="h-2 bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>

      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {FIRST_STEPS.map((step) => {
          const done = progress.done[step.id];
          const isNext = step.id === nextStep?.id;
          return (
            <li
              key={step.id}
              className={`rounded-lg border p-3 flex flex-col gap-2 ${
                done ? 'border-green-200 bg-green-50' : isNext ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    done ? 'bg-green-600 text-white' : 'bg-white border border-gray-300'
                  }`}
                  aria-hidden="true"
                >
                  {done ? '✓' : step.icon}
                </span>
                <span className={`text-sm font-medium ${done ? 'text-green-800 line-through' : 'text-gray-900'}`}>
                  {step.title}
                </span>
                <span className="sr-only">{done ? '(done)' : '(not done yet)'}</span>
              </div>
              {!done && (
                <>
                  <p className="text-xs text-gray-600">{step.description}</p>
                  <Link
                    to={step.to}
                    className={`mt-auto text-xs font-medium ${isNext ? 'text-blue-700' : 'text-blue-600'} hover:underline`}
                  >
                    {step.cta} →
                  </Link>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default GettingStartedChecklist;
