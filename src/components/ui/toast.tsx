"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (payload: Omit<Toast, "id">) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((payload: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...payload, id }]);

    const duration = payload.duration || 5000;
    if (duration !== Infinity) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastMethods = React.useMemo(() => ({
    toast: addToast,
    success: (message: string, title?: string) => addToast({ type: "success", message, title }),
    error: (message: string, title?: string) => addToast({ type: "error", message, title }),
    info: (message: string, title?: string) => addToast({ type: "info", message, title }),
    warning: (message: string, title?: string) => addToast({ type: "warning", message, title }),
  }), [addToast]);

  return (
    <ToastContext.Provider value={toastMethods}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    error: <XCircle className="h-5 w-5 text-rose-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
    warning: <AlertCircle className="h-5 w-5 text-amber-500" />,
  };

  const bgColors = {
    success: "border-emerald-100 bg-emerald-50/90",
    error: "border-rose-100 bg-rose-50/90",
    info: "border-blue-100 bg-blue-50/90",
    warning: "border-amber-100 bg-amber-50/90",
  };

  return (
    <div 
      className={cn(
        "pointer-events-auto flex w-full items-start gap-4 rounded-2xl border p-4 shadow-lg backdrop-blur-md transition-all animate-toast-in",
        bgColors[toast.type]
      )}
    >
      <div className="mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 space-y-1">
        {toast.title && <h4 className="font-bold text-sm text-slate-900">{toast.title}</h4>}
        <p className="text-sm text-slate-700 leading-relaxed">{toast.message}</p>
      </div>
      <button 
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
