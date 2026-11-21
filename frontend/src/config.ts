import axios from 'axios';

/**
 * Origin of the Django API, e.g. https://career-pathway-tracker-api.onrender.com
 * Set VITE_API_URL at build time (Vercel project env). When empty, requests go to
 * the same origin: the Vite dev proxy locally, nginx in docker-compose.
 */
export const API_ORIGIN: string = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');

/** Base URL for API clients created with axios.create(). */
export const API_BASE_URL = `${API_ORIGIN}/api`;

// Many pages call the global axios with paths like '/api/...'. Axios prefixes
// such relative paths with baseURL, so this sends them to the API origin too.
if (API_ORIGIN) {
  axios.defaults.baseURL = API_ORIGIN;
}
