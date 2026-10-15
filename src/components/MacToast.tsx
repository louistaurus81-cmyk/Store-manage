import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

interface MacToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const MacToastContainer: React.FC<MacToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none font-sans">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-xl transition-all transform animate-in slide-in-from-top-3 duration-200 ${
              isSuccess
                ? 'bg-white/95 border-emerald-200 text-slate-800 shadow-emerald-500/10'
                : isError
                ? 'bg-white/95 border-rose-200 text-slate-800 shadow-rose-500/10'
                : isWarning
                ? 'bg-white/95 border-amber-200 text-slate-800 shadow-amber-500/10'
                : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-500/10'
            }`}
          >
            {/* Status Icon */}
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                isSuccess
                  ? 'bg-emerald-50 text-emerald-600'
                  : isError
                  ? 'bg-rose-50 text-rose-600'
                  : isWarning
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              {isSuccess && <CheckCircle2 className="w-4 h-4" />}
              {isError && <AlertCircle className="w-4 h-4" />}
              {isWarning && <AlertTriangle className="w-4 h-4" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-1">
              {toast.title && (
                <div className="text-xs font-semibold text-slate-900 leading-snug">
                  {toast.title}
                </div>
              )}
              <div className="text-[11px] text-slate-600 leading-relaxed font-medium break-words mt-0.5">
                {toast.message}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
