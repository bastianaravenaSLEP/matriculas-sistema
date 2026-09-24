import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    warning: (msg: string) => void;
    info: (msg: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const toast = {
    success: (msg: string) => addToast('success', msg),
    error: (msg: string) => addToast('error', msg),
    warning: (msg: string) => addToast('warning', msg),
    info: (msg: string) => addToast('info', msg),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md pointer-events-none">
        {toasts.map(t => {
          let bg = 'bg-white border-gray-200 text-gray-800';
          let icon = <Info size={18} className="text-blue-500 shrink-0" />;

          if (t.type === 'success') {
            bg = 'bg-emerald-50 border-emerald-300 text-emerald-900';
            icon = <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />;
          } else if (t.type === 'error') {
            bg = 'bg-red-50 border-red-300 text-red-900';
            icon = <AlertCircle size={18} className="text-red-600 shrink-0" />;
          } else if (t.type === 'warning') {
            bg = 'bg-amber-50 border-amber-300 text-amber-900';
            icon = <AlertTriangle size={18} className="text-amber-600 shrink-0" />;
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all animate-in slide-in-from-bottom-2 duration-200 ${bg}`}
            >
              <div className="mt-0.5">{icon}</div>
              <p className="text-sm font-medium leading-relaxed flex-1">{t.message}</p>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-gray-400 hover:text-gray-700 p-0.5 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback amigable si se llama fuera del Provider
    return {
      toast: {
        success: (msg: string) => console.log('[TOAST SUCCESS]', msg),
        error: (msg: string) => console.error('[TOAST ERROR]', msg),
        warning: (msg: string) => console.warn('[TOAST WARN]', msg),
        info: (msg: string) => console.info('[TOAST INFO]', msg),
      }
    };
  }
  return context;
};
