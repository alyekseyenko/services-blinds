"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { hapticError, hapticSuccess } from "@/lib/haptics";
import { cn } from "@/lib/cn";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextValue {
  toast: {
    success: (title: string, description?: string, action?: ToastAction) => void;
    error: (title: string, description?: string, action?: ToastAction) => void;
    info: (title: string, description?: string, action?: ToastAction) => void;
    warning: (title: string, description?: string, action?: ToastAction) => void;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pausedRef = useRef<Set<string>>(new Set());

  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const removeToast = useCallback(
    (id: string) => {
      clearTimer(id);
      pausedRef.current.delete(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    },
    [clearTimer]
  );

  const scheduleDismiss = useCallback(
    (id: string, duration: number) => {
      clearTimer(id);
      const timer = setTimeout(() => removeToast(id), duration);
      timersRef.current.set(id, timer);
    },
    [clearTimer, removeToast]
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, description?: string, duration = 4000, action?: ToastAction) => {
      if (type === "success") hapticSuccess();
      else if (type === "error") hapticError();

      const id = `${Date.now()}-${Math.random()}`;
      const newToast: ToastMessage = { id, type, title, description, duration, action };

      setToasts((prev) => [...prev.slice(-3), newToast]);
      scheduleDismiss(id, duration);
    },
    [scheduleDismiss]
  );

  const toast = {
    success: (title: string, description?: string, action?: ToastAction) =>
      addToast("success", title, description, 4000, action),
    error: (title: string, description?: string, action?: ToastAction) =>
      addToast("error", title, description, 5000, action),
    info: (title: string, description?: string, action?: ToastAction) =>
      addToast("info", title, description, 4000, action),
    warning: (title: string, description?: string, action?: ToastAction) =>
      addToast("warning", title, description, 4500, action),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      <div
        className="pointer-events-none fixed left-4 right-4 top-[max(1rem,env(safe-area-inset-top))] z-[9999] flex flex-col gap-2.5 sm:left-auto sm:w-96"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === "error" ? "alert" : "status"}
            aria-live={t.type === "error" ? "assertive" : "polite"}
            onMouseEnter={() => {
              pausedRef.current.add(t.id);
              clearTimer(t.id);
            }}
            onMouseLeave={() => {
              if (pausedRef.current.has(t.id)) {
                pausedRef.current.delete(t.id);
                scheduleDismiss(t.id, t.duration || 4000);
              }
            }}
            onFocus={() => {
              pausedRef.current.add(t.id);
              clearTimer(t.id);
            }}
            onBlur={() => {
              if (pausedRef.current.has(t.id)) {
                pausedRef.current.delete(t.id);
                scheduleDismiss(t.id, t.duration || 4000);
              }
            }}
            className={cn(
              "pointer-events-auto flex items-start gap-3.5 rounded-2xl border p-4 shadow-[0_20px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl transition-all",
              t.type === "success" && "border-[#84cc16]/40 bg-[#090d16]/95 text-white",
              t.type === "error" && "border-red-500/40 bg-[#180909]/95 text-white",
              t.type === "warning" && "border-amber-500/40 bg-[#1c1407]/95 text-white",
              t.type === "info" && "border-blue-500/40 bg-[#0c1322]/95 text-white"
            )}
          >
            <div className="mt-0.5 shrink-0">
              {t.type === "success" && (
                <div className="rounded-lg bg-[#84cc16]/10 p-1 text-[#84cc16] shadow-[0_0_12px_rgba(132,204,22,0.4)]">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </div>
              )}
              {t.type === "error" && (
                <div className="rounded-lg bg-red-500/10 p-1 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.4)]">
                  <AlertCircle className="h-5 w-5" aria-hidden="true" />
                </div>
              )}
              {t.type === "warning" && (
                <div className="rounded-lg bg-amber-500/10 p-1 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                  <AlertCircle className="h-5 w-5" aria-hidden="true" />
                </div>
              )}
              {t.type === "info" && (
                <div className="rounded-lg bg-blue-500/10 p-1 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.4)]">
                  <Info className="h-5 w-5" aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 pr-1">
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-100">{t.title}</h4>
              {t.description && (
                <p className="mt-1 line-clamp-2 text-xs font-semibold leading-relaxed text-slate-400">
                  {t.description}
                </p>
              )}
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onClick();
                    removeToast(t.id);
                  }}
                  className="mt-2 text-xs font-black uppercase tracking-wider text-[#84cc16] hover:underline"
                >
                  {t.action.label}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              aria-label="Fechar notificação"
              className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context.toast;
}
