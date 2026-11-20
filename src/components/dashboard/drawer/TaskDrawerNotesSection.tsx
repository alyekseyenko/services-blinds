"use client";

import { Loader2, MessageSquare, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceTextarea } from "@/components/ui/VoiceTextarea";
import { formatNoteBodyForDisplay, formatNoteTitleForDisplay } from "@/lib/noteDisplay";
import { isUrgentSchedulingNote } from "@/lib/crm/urgentSchedulingUi";
import {
  TECH_DRAWER_KICKER,
  TECH_DRAWER_NOTE_BODY,
  TECH_DRAWER_SECTION_TITLE,
  TECH_DRAWER_TEXTAREA,
} from "./drawerStyles";

type CrmNote = {
  id: string;
  title?: string | null;
  body: string;
  createdAt: string;
};

export function TaskDrawerNotesSection(props: {
  notes: CrmNote[];
  loadingNotes: boolean;
  isOnline: boolean;
  newNoteText: string;
  setNewNoteText: (v: string) => void;
  isCreatingNote: boolean;
  onAddNote: () => void;
}) {
  const {
    notes,
    loadingNotes,
    isOnline,
    newNoteText,
    setNewNoteText,
    isCreatingNote,
    onAddNote,
  } = props;

  return (
    <div className="space-y-4" data-tour="tech-drawer-notes">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <MessageSquare className="h-4 w-4 shrink-0 text-primary-ink" />
          <h3 className={TECH_DRAWER_SECTION_TITLE}>Notas técnicas (CRM)</h3>
        </div>
        <span className="shrink-0 rounded-full border border-border-strong bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
          {notes.length}
        </span>
      </div>

      {loadingNotes ? (
        <div className="flex items-center gap-2 py-4 text-muted-foreground text-xs font-bold uppercase justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-primary-ink" /> A carregar do Twenty...
        </div>
      ) : !isOnline ? (
        <p className="rounded-xl border border-border-strong bg-card p-4 text-center text-sm font-medium leading-snug text-muted-foreground">
          Notas indisponíveis offline. Ligação necessária para ver o histórico do CRM.
        </p>
      ) : notes.length === 0 ? (
        <p className="rounded-xl border border-border-strong bg-muted/40 p-4 text-center text-sm font-medium text-muted-foreground">
          Sem notas no CRM.
        </p>
      ) : (
        <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1.5 custom-scrollbar">
          {notes.map((note) => {
            const urgentNote = isUrgentSchedulingNote(note);
            return (
              <div
                key={note.id}
                className={`flex flex-col gap-1.5 rounded-xl border-2 p-3 ${
                  urgentNote
                    ? "border-danger-solid bg-danger-surface/70"
                    : "border-border-strong bg-card"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`${TECH_DRAWER_KICKER} flex min-w-0 items-center gap-1.5`}>
                    <User
                      className={`h-3.5 w-3.5 shrink-0 ${urgentNote ? "text-danger-solid" : "text-primary-ink"}`}
                    />
                    {note.title?.trim() ? formatNoteTitleForDisplay(note.title) : "Técnico"}
                    {urgentNote && (
                      <span className="rounded-md border border-danger-border bg-danger-surface px-1.5 py-0.5 text-xs font-bold text-danger-fg">
                        Urgente
                      </span>
                    )}
                  </span>
                  <span className="ds-num shrink-0 text-xs font-semibold text-muted-foreground">
                    {new Date(note.createdAt).toLocaleDateString("pt-PT", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p
                  className={`${TECH_DRAWER_NOTE_BODY} ${
                    urgentNote ? "text-danger-fg" : "text-foreground"
                  }`}
                >
                  {formatNoteBodyForDisplay(note.body)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-end gap-2">
        <VoiceTextarea
          value={newNoteText}
          onChange={setNewNoteText}
          placeholder="Nota para o CRM…"
          rows={2}
          dataTour="tech-voice-note"
          className="min-h-12 flex-1"
          textareaClassName={`${TECH_DRAWER_TEXTAREA} min-h-12 flex-1`}
        />
        <Button
          variant="inverse"
          onClick={onAddNote}
          disabled={isCreatingNote || !newNoteText.trim()}
          className="h-12 min-w-12 shrink-0 rounded-xl px-3"
          aria-label="Adicionar nota ao CRM"
        >
          {isCreatingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}