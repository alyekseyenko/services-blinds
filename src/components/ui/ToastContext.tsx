"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
    warning: (title: string, description?: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, description?: string, duration = 4000) => {
    // Haptic feedback em dispositivos móveis
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        if (type === "success") {
          navigator.vibrate(40);
        } else if (type === "error") {
          navigator.vibrate([60, 40, 60]);
        }
      } catch (e) {
        // Ignorar em browsers sem suporte
      }
    }

    const id = `${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = { id, type, title, description, duration };

    setToasts((prev) => [...prev.slice(-3), newToast]); // Manter no máximo 4 toasts no ecrã

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const toast = {
    success: (title: string, description?: string) => addToast("success", title, description),
    error: (title: string, description?: string) => addToast("error", title, description, 5000),
    info: (title: string, description?: string) => addToast("info", title, description),
    warning: (title: string, description?: string) => addToast("warning", title, description, 4500),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Container de Toasts Flutuantes iDraft */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[9999] pointer-events-none flex flex-col gap-2.5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] border backdrop-blur-xl animate-in slide-in-from-top-4 fade-in duration-300 transition-all ${
              t.type === "success"
                ? "bg-[#090d16]/95 border-[#84cc16]/40 text-white"
                : t.type === "error"
                ? "bg-[#180909]/95 border-red-500/40 text-white"
                : t.type === "warning"
                ? "bg-[#1c1407]/95 border-amber-500/40 text-white"
                : "bg-[#0c1322]/95 border-blue-500/40 text-white"
            }`}
          >
            {/* Ícone com Glow */}
            <div className="shrink-0 mt-0.5">
              {t.type === "success" && (
                <div className="p-1 rounded-lg bg-[#84cc16]/10 text-[#84cc16] shadow-[0_0_12px_rgba(132,204,22,0.4)]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              )}
              {t.type === "error" && (
                <div className="p-1 rounded-lg bg-red-500/10 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.4)]">
                  <AlertCircle className="w-5 h-5" />
                </div>
              )}
              {t.type === "warning" && (
                <div className="p-1 rounded-lg bg-amber-500/10 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                  <AlertCircle className="w-5 h-5" />
                </div>
              )}
              {t.type === "info" && (
                <div className="p-1 rounded-lg bg-blue-500/10 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.4)]">
                  <Info className="w-5 h-5" />
                </div>
              )}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-100">{t.title}</h4>
              {t.description && (
                <p className="text-[11px] font-semibold text-slate-400 mt-1 leading-relaxed line-clamp-2">
                  {t.description}
                </p>
              )}
            </div>

            {/* Botão Fechar */}
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <X className="w-4 h-4" />
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
