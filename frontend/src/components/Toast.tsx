import React, { useState, useEffect } from 'react';
import { registerToastHandler, type ToastMessage } from './toastStore';

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    registerToastHandler((toast: ToastMessage) => {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 3000);
    });
    return () => registerToastHandler(null);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60] space-y-2" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${getBgColor(toast.type)} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up min-w-[250px]`}
        >
          <span>{getIcon(toast.type)}</span>
          <span className="text-sm">{toast.message}</span>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
