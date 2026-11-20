"use client";

import { Loader2, MessageSquare, Plus, User } from "lucide-react";

import type { AppNote } from "@/lib/crm/appTypes";
import { formatNoteBodyForDisplay, formatNoteTitleForDisplay } from "@/lib/noteDisplay";

type Props = {
  notes: AppNote[];
  loadingNotes: boolean;
  newNoteText: string;
  isCreatingNote: boolean;
  onNewNoteTextChange: (value: string) => void;
  onAddNote: () => void;
};

export function PreparationNotesSection({
  notes,
  loadingNotes,
  newNoteText,
  isCreatingNote,
  onNewNoteTextChange,
  onAddNote,
}: Props) {
  return (
    <div className="pt-8 border-t border-border-strong space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-info-solid/10 border border-info-solid/20 text-info-fg rounded-xl">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-ink-foreground font-black text-lg uppercase tracking-tight">
              Histórico & Notas de Serviço
            </h4>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
              Sincronização em tempo real com o CRM
            </p>
          </div>
        </div>
        <span className="text-xs bg-secondary text-muted-foreground px-3 py-1 rounded-full font-black uppercase">
          {loadingNotes ? "A carregar..." : `${notes.length} Notas`}
        </span>
      </div>

      {loadingNotes ? (
        <div className="flex items-center gap-3 py-6 justify-center bg-ink/50 rounded-2xl border border-border-strong">
          <Loader2 className="w-5 h-5 text-info-solid animate-spin" />
          <p className="text-muted-foreground text-sm font-semibold">A carregar notas…</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="p-6 text-center bg-ink/40 rounded-3xl border-2 border-dashed border-border-strong/80">
          <MessageSquare className="w-8 h-8 text-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-xs font-black uppercase tracking-wider">
            Nenhuma instrução ou nota registada para este serviço.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`p-5 rounded-2xl border flex flex-col gap-2 transition-all ${
                note.title?.includes("Armazém")
                  ? "bg-info-solid/5 border-info-solid/10"
                  : note.title?.includes("Mestre") || note.title?.includes("Técnico")
                    ? "bg-success-solid/5 border-success-solid/10"
                    : "bg-ink/60 border-border-strong"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User
                    className={`w-3.5 h-3.5 ${
                      note.title?.includes("Armazém")
                        ? "text-info-fg"
                        : note.title?.includes("Mestre") || note.title?.includes("Técnico")
                          ? "text-success-solid"
                          : "text-warning-solid"
                    }`}
                  />
                  <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                    {formatNoteTitleForDisplay(note.title)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-bold">
                  {new Date(note.createdAt).toLocaleDateString("pt-PT", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap font-medium">
                {formatNoteBodyForDisplay(note.body)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 bg-ink/40 p-2.5 border border-border-strong rounded-3xl group focus-within:border-info-solid/30 focus-within:ring-4 focus-within:ring-info-solid/5 transition-all">
        <input
          type="text"
          value={newNoteText}
          onChange={(e) => onNewNoteTextChange(e.target.value)}
          placeholder="Escreva uma nota de fabrico ou preparação para o CRM..."
          className="flex-1 bg-transparent border-none outline-none pl-4 pr-2 text-ink-foreground placeholder:text-muted-foreground text-sm font-semibold min-h-12"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isCreatingNote && newNoteText.trim()) {
              onAddNote();
            }
          }}
        />
        <button
          type="button"
          onClick={onAddNote}
          disabled={isCreatingNote || !newNoteText.trim()}
          className={`px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all min-h-12 ${
            !newNoteText.trim() || isCreatingNote
              ? "bg-secondary text-muted-foreground cursor-not-allowed"
              : "bg-info-solid hover:bg-info-solid text-ink-foreground shadow-lg shadow-info-solid/20/10 hover:-translate-y-0.5 active:translate-y-0"
          }`}
        >
          {isCreatingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Enviar Nota
        </button>
      </div>
    </div>
  );
}