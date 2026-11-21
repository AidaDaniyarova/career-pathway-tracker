import React, { useEffect, useRef, useState } from 'react';

export type AIConsentReason = 'first-visit' | 'feature' | 'settings';

interface AIConsentModalProps {
  isOpen: boolean;
  reason: AIConsentReason;
  /** Current saved answer (null = never answered). */
  currentConsent: boolean | null | undefined;
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
  /** Close without recording an answer. */
  onDismiss: () => void;
}

const USES = [
  { icon: '🎯', title: 'Career recommendations', text: 'Matches your skills, interests and quiz answers to career paths.' },
  { icon: '📄', title: 'CV & job matching', text: 'Compares your CV with job descriptions and produces an ATS-style score.' },
  { icon: '💬', title: 'Interview help & job summaries', text: 'Generates practice questions and summarises job descriptions you paste.' },
];

const AIConsentModal: React.FC<AIConsentModalProps> = ({
  isOpen,
  reason,
  currentConsent,
  onAccept,
  onDecline,
  onDismiss,
}) => {
  const [understood, setUnderstood] = useState(false);
  const [saving, setSaving] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape closes without recording; focus the dialog for screen readers / keyboard users
  useEffect(() => {
    if (!isOpen) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;

  const run = async (kind: 'accept' | 'decline') => {
    setSaving(kind);
    setError('');
    try {
      await (kind === 'accept' ? onAccept() : onDecline());
      setUnderstood(false);
    } catch {
      setError('Could not save your choice. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const intro =
    reason === 'feature'
      ? 'This feature uses artificial intelligence to process your data. Please review how it works before continuing.'
      : 'Career Pathway Tracker uses artificial intelligence (AI) in some features. Before you use them, here is what that means for you.';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-consent-title"
        aria-describedby="ai-consent-intro"
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden outline-none animate-slide-up"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl shrink-0" aria-hidden="true">
              ✨
            </div>
            <div>
              <h2 id="ai-consent-title" className="text-xl font-semibold text-gray-900">
                How we use AI
              </h2>
              <p className="text-xs text-gray-500">Your consent is required for AI-powered features</p>
            </div>
          </div>
          <p id="ai-consent-intro" className="text-gray-600 text-sm mt-4">{intro}</p>
        </div>

        {/* Body (scrolls on small screens) */}
        <div className="px-6 py-4 overflow-y-auto space-y-5 text-sm">
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">What AI is used for</h3>
            <ul className="space-y-2">
              {USES.map((u) => (
                <li key={u.title} className="flex gap-3 bg-gray-50 rounded-lg p-3">
                  <span className="text-lg leading-none" aria-hidden="true">{u.icon}</span>
                  <span>
                    <span className="font-medium text-gray-900">{u.title}</span>
                    <span className="block text-gray-600">{u.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">What data is processed</h3>
            <p className="text-gray-600">
              Your profile skills and experience, career quiz answers, the content of your CVs, and any job
              descriptions or messages you enter into AI features.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Where it is processed</h3>
            <p className="text-gray-600">
              Analysis runs on our servers. To generate some results, text such as job descriptions, CV
              excerpts or chat messages may be sent to <span className="font-medium">Hugging Face</span>, a
              third-party AI provider. We do not use your data to train AI models.
            </p>
          </section>

          <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <h3 className="font-semibold text-yellow-900 mb-1">⚠️ Please keep in mind</h3>
            <p className="text-yellow-900">
              AI output can be inaccurate, incomplete or biased. Treat it as guidance, not as professional
              career, legal or hiring advice, and always review it before relying on it.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Your choice</h3>
            <p className="text-gray-600">
              AI features stay off unless you agree. Everything else, including career paths, learning
              modules, quizzes and the CV builder, works without AI. You can change your decision at any
              time in <span className="font-medium">Profile → AI &amp; Privacy</span>.
            </p>
            {currentConsent !== null && currentConsent !== undefined && (
              <p className="mt-2 text-xs text-gray-500">
                Current status:{' '}
                <span className={currentConsent ? 'text-green-700 font-medium' : 'text-gray-700 font-medium'}>
                  {currentConsent ? 'AI features enabled' : 'AI features disabled'}
                </span>
              </p>
            )}
          </section>

          <label className="flex items-start gap-3 cursor-pointer select-none bg-blue-50 rounded-lg p-3">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-800">
              I have read this notice and understand how my data is processed by AI.
            </span>
          </label>

          {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={() => run('decline')}
            disabled={saving !== null}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {saving === 'decline' ? 'Saving…' : currentConsent ? 'Turn off AI features' : 'No thanks'}
          </button>
          <button
            type="button"
            onClick={() => run('accept')}
            disabled={!understood || saving !== null}
            className="px-4 py-2 text-white rounded-lg transition-colors bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {saving === 'accept' ? 'Saving…' : 'I agree, enable AI'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIConsentModal;
