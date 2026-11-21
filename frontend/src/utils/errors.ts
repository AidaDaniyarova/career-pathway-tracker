import type { AxiosError } from 'axios';

/**
 * Shape of DRF error bodies. Field errors arrive as `{ field: "msg" }` or
 * `{ field: ["msg"] }`; generic ones use `error`, `message` or `detail`.
 */
export type ApiErrorData = Record<string, string> & {
  error?: string;
  message?: string;
  detail?: string;
  code?: string;
};

export type ApiError = AxiosError<ApiErrorData>;

/** Best human-readable message from an unknown thrown value. */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const e = err as ApiError;
  const data = e?.response?.data;
  const msg = data?.error || data?.message || data?.detail;
  if (typeof msg === 'string' && msg) return msg;
  if (Array.isArray(msg) && msg.length) return String(msg[0]);
  return fallback;
}
