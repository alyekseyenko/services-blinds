"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { hapticConfirmAfterAsync, hapticError, hapticLight, hapticTap } from "@/lib/haptics";
import { cn } from "@/lib/cn";
import { DS_TOAST_CLASS, toastTypeToTone } from "@/lib/design/tones";

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
  /** Toque no corpo do toast (ex.: aviso da agenda). */
  onClick?: () => void;
}

interface ToastContextValue {
  toast: {
    success: (
      title: string,
      description?: string,
      action?: ToastAction,
      onClick?: () => void
    ) => void;
    error: (
      title: string,
      description?: string,
      action?: ToastAction,
      onClick?: () => void
    ) => void;
    info: (
      title: string,
      description?: string,
      action?: ToastAction,
      onClick?: () => void
    ) => void;
    warning: (
      title: string,
      description?: string,
      action?: ToastAction,
      onClick?: () => void
    ) => void;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function ToastBodyIcon({ type }: { type: ToastType }) {
  return (
    <div className="mt-0.5 shrink-0">
      {type === "success" && (
        <div className="rounded-lg bg-neon p-1 text-neon-foreground">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      {type === "error" && (
        <div className="rounded-lg bg-danger-surface p-1 text-danger-solid">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      {type === "warning" && (
        <div className="rounded-lg bg-warning-surface p-1 text-warning-solid">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      {type === "info" && (
        <div className="rounded-lg bg-info-surface p-1 text-info-solid">
          <Info className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function ToastBodyText({
  toast: t,
  onAction,
}: {
  toast: ToastMessage;
  onAction?: () => void;
}) {
  return (
    <div className="min-w-0 flex-1 pr-1">
      <h4 className="text-sm font-black uppercase tracking-wider text-inherit">{t.title}</h4>
      {t.description && (
        <p
          className={cn(
            "mt-1 text-xs font-semibold leading-relaxed opacity-80",
            t.type === "error" || t.type === "warning" ? "line-clamp-4" : "line-clamp-2"
          )}
        >
          {t.description}
        </p>
      )}
      {t.action && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            t.action?.onClick();
            onAction?.();
          }}
          className="mt-2 text-xs font-black uppercase tracking-wider text-neon hover:underline"
        >
          {t.action.label}
        </button>
      )}
    </div>
  );
}

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
    (
      type: ToastType,
      title: string,
      description?: string,
      duration = 4000,
      action?: ToastAction,
      onClick?: () => void
    ) => {
      if (type === "success") hapticConfirmAfterAsync("success");
      else if (type === "error") hapticConfirmAfterAsync("error");
      else if (type === "info" || type === "warning") hapticTap(12);

      const id = `${Date.now()}-${Math.random()}`;
      const newToast: ToastMessage = { id, type, title, description, duration, action, onClick };

      setToasts((prev) => [...prev.slice(-3), newToast]);
      scheduleDismiss(id, duration);
    },
    [scheduleDismiss]
  );

  const toast = useMemo(
    () => ({
      success: (
        title: string,
        description?: string,
        action?: ToastAction,
        onClick?: () => void
      ) => addToast("success", title, description, 4000, action, onClick),
      error: (
        title: string,
        description?: string,
        action?: ToastAction,
        onClick?: () => void
      ) => addToast("error", title, description, 5000, action, onClick),
      info: (
        title: string,
        description?: string,
        action?: ToastAction,
        onClick?: () => void
      ) => addToast("info", title, description, 4000, action, onClick),
      warning: (
        title: string,
        description?: string,
        action?: ToastAction,
        onClick?: () => void
      ) => addToast("warning", title, description, 4500, action, onClick),
    }),
    [addToast]
  );

  const contextValue = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      <div
        className="pointer-events-none fixed left-4 right-4 top-[max(1rem,env(safe-area-inset-top))] z-[10050] flex flex-col gap-2.5 sm:left-auto sm:w-96"
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
              "pointer-events-auto flex transition-all",
              DS_TOAST_CLASS[toastTypeToTone(t.type)]
            )}
          >
            {t.onClick ? (
              <button
                type="button"
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
                aria-label="Abrir aviso"
                onClick={() => {
                  hapticTap(10);
                  t.onClick?.();
                  removeToast(t.id);
                }}
              >
                <ToastBodyIcon type={t.type} />
                <ToastBodyText toast={t} />
              </button>
            ) : (
              <>
                <ToastBodyIcon type={t.type} />
                <ToastBodyText toast={t} onAction={() => removeToast(t.id)} />
              </>
            )}

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              aria-label="Fechar notificação"
              className="shrink-0 rounded-lg p-1 opacity-70 transition-colors hover:bg-ink-foreground/10 hover:opacity-100"
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
