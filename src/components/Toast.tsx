import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-lg border backdrop-blur-md transition-all animate-in slide-in-from-right duration-200 ${
            toast.type === 'success'
              ? 'bg-blue-900/95 text-white border-blue-500/30'
              : toast.type === 'error'
              ? 'bg-rose-900/95 text-white border-rose-500/30'
              : 'bg-slate-900/95 text-white border-slate-700/50'
          }`}
        >
          <div className="flex items-center gap-2.5 text-sm">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-blue-300 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-sky-300 shrink-0" />}
            <span className="font-medium text-xs md:text-sm">{toast.message}</span>
          </div>
          <button
            onClick={() => onRemove(toast.id)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors ml-2"
          >
            <X className="w-4 h-4 opacity-70 hover:opacity-100" />
          </button>
        </div>
      ))}
    </div>
  );
};
