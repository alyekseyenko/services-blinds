"use client";

import { Loader2, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatNoteBodyForDisplay, formatNoteTitleForDisplay } from "@/lib/noteDisplay";
import { Button } from "@/components/ui/button";
import type { Opportunity } from "@/types/admin";
import type { AdminOpportunityNote } from "@/hooks/admin/useAdminOpportunityNotes";
import { AdminOppSection } from "@/components/admin/drawer/AdminOppSection";

export function OpportunityNotesSection(props: {
  selectedOpportunity: Opportunity;
  notes: AdminOpportunityNote[];
  loadingNotes: boolean;
  noteDraft: string;
  setNoteDraft: (value: string) => void;
  savingNote: boolean;
  onSubmitNote: () => void;
}) {
  const {
    selectedOpportunity,
    notes,
    loadingNotes,
    noteDraft,
    setNoteDraft,
    savingNote,
    onSubmitNote,
  } = props;

  return (
    <AdminOppSection
      title="Notas do CRM"
      data-tour="admin-opp-notes"
      action={
        <span className="ds-chip ds-chip-neutral">{loadingNotes ? "…" : `${notes.length} notas`}</span>
      }
    >
      {selectedOpportunity.report && (
        <div className="prose prose-sm max-w-none text-foreground pb-4 border-b border-border/60">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ ...tableProps }) => (
                <div className="overflow-x-auto my-4 rounded-xl border border-border shadow-sm">
                  <table className="min-w-full divide-y divide-border" {...tableProps} />
                </div>
              ),
              thead: ({ ...theadProps }) => <thead className="bg-muted" {...theadProps} />,
              th: ({ ...thProps }) => (
                <th
                  className="px-3 py-2 text-left text-xs font-black text-muted-foreground uppercase tracking-wider"
                  {...thProps}
                />
              ),
              td: ({ ...tdProps }) => (
                <td
                  className="px-3 py-2 text-sm text-muted-foreground border-t border-border font-medium"
                  {...tdProps}
                />
              ),
              h2: ({ ...h2Props }) => (
                <h2
                  className="text-lg font-bold text-foreground mt-6 mb-2 flex items-center gap-2 border-b border-border pb-2"
                  {...h2Props}
                />
              ),
              h3: ({ ...h3Props }) => (
                <h3 className="text-base font-bold text-foreground mt-4 mb-2" {...h3Props} />
              ),
              ul: ({ ...ulProps }) => <ul className="list-disc pl-5 space-y-1 my-2" {...ulProps} />,
              li: ({ ...liProps }) => (
                <li className="text-sm text-muted-foreground font-medium" {...liProps} />
              ),
              hr: ({ ...hrProps }) => <hr className="my-6 border-border" {...hrProps} />,
            }}
          >
            {selectedOpportunity.report}
          </ReactMarkdown>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Linha do tempo</p>
        {loadingNotes ? (
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary-ink" aria-hidden />
            A carregar notas do CRM…
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm font-medium text-muted-foreground">
            Nenhuma nota ou instrução no histórico.
          </p>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {notes.map((note) => (
              <div key={note.id} className="rounded-xl border-2 border-border bg-muted p-3">
                <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <User className="h-3.5 w-3.5 shrink-0 text-primary-ink" aria-hidden />
                    <span className="truncate">{formatNoteTitleForDisplay(note.title)}</span>
                  </span>
                  <span className="ds-num shrink-0">
                    {new Date(note.createdAt).toLocaleDateString("pt-PT", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-line text-sm font-medium leading-relaxed text-foreground">
                  {formatNoteBodyForDisplay(note.body)}
                </p>
              </div>
            ))}
          </div>
        )}
        <form
          className="space-y-2 border-t border-border pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmitNote();
          }}
        >
          <label
            className="block text-xs font-bold uppercase tracking-wider text-muted-foreground"
            htmlFor="admin-opp-note"
          >
            Nova nota neste serviço
          </label>
          <textarea
            id="admin-opp-note"
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            rows={3}
            placeholder="Nota para o CRM…"
            className="min-h-12 w-full rounded-xl border-2 border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={savingNote || !noteDraft.trim()}
            className="min-h-12 w-full"
          >
            {savingNote ? "A guardar…" : "Adicionar nota"}
          </Button>
        </form>
      </div>
    </AdminOppSection>
  );
}