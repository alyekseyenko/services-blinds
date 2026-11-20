"use client";

import { AlertCircle } from "lucide-react";

type Props = {
  title: string;
  messages: string[];
};

/** Aviso de validação dentro do formulário, visível mesmo com um painel por cima dos toasts. */
export function FormAlert({ title, messages }: Props) {
  if (messages.length === 0) return null;

  return (
    <div
      className="rounded-xl border-2 border-danger-border bg-danger-surface px-3 py-2.5"
      role="alert"
      aria-live="assertive"
    >
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-danger-fg">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
        {title}
      </p>
      {messages.length === 1 ? (
        <p className="mt-1 text-sm font-semibold text-danger-fg">{messages[0]}</p>
      ) : (
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm font-semibold text-danger-fg">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
