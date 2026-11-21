/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Django API origin, e.g. https://my-api.onrender.com (no trailing /api) */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
