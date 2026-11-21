import React from 'react';
import { openAIConsent } from './aiConsentEvents';

/** Slim notice shown on pages whose results are produced by AI. */
const AIDisclaimer: React.FC<{ feature?: string }> = ({ feature = 'These results' }) => (
  <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-900">
    <span aria-hidden="true">✨</span>
    <p>
      <span className="font-medium">AI-generated.</span> {feature} are produced by AI and may be inaccurate.
      Review them before relying on them.{' '}
      <button type="button" onClick={openAIConsent} className="underline hover:text-blue-700">
        How we use AI
      </button>
    </p>
  </div>
);

export default AIDisclaimer;
