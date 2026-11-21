/** Dispatch on window to open the AI usage notice from anywhere (e.g. settings, footer). */
export const OPEN_AI_CONSENT_EVENT = 'open-ai-consent';

export const openAIConsent = () => window.dispatchEvent(new CustomEvent(OPEN_AI_CONSENT_EVENT));
