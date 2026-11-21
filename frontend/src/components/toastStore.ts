export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

let addToastHandler: ((message: ToastMessage) => void) | null = null;

/** Registered by <ToastContainer/> when it mounts. */
export const registerToastHandler = (handler: ((message: ToastMessage) => void) | null) => {
  addToastHandler = handler;
};

export const showToast = (message: string, type: ToastType = 'success') => {
  addToastHandler?.({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    type,
  });
};
