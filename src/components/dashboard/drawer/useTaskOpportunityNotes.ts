"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchOpportunityNotesAction } from "@/actions/notes-actions";
import { isUrgentSchedulingNote } from "@/lib/crm/urgentSchedulingUi";
import { isOnboardingDemoEntity } from "@/lib/demo/demoIds";
import { toUserMessage } from "@/lib/userMessages";
import { useToast } from "@/components/ui/ToastContext";

type CrmNote = {
  id: string;
  title?: string | null;
  body: string;
  createdAt: string;
};

type QueueEnqueueResult = { success: boolean; queued: boolean; error?: string };

export function useTaskOpportunityNotes(params: {
  selectedTask: { id: string; opportunityId?: string } | null | undefined;
  isOnline: boolean;
  userName: string;
  enqueueNote: (
    oppId: string,
    personId: string | null,
    title: string,
    body: string,
    taskId?: string
  ) => Promise<QueueEnqueueResult>;
}) {
  const { selectedTask, isOnline, userName, enqueueNote } = params;
  const toast = useToast();
  const [notes, setNotes] = useState<CrmNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  useEffect(() => {
    if (!selectedTask?.opportunityId) {
      setNotes([]);
      return;
    }
    if (isOnboardingDemoEntity(selectedTask)) {
      setNotes([]);
      setLoadingNotes(false);
      return;
    }
    let cancelled = false;
    async function loadNotes() {
      const task = selectedTask;
      if (!task?.opportunityId) return;
      if (!isOnline) {
        setNotes([]);
        setLoadingNotes(false);
        return;
      }
      setLoadingNotes(true);
      try {
        const result = await fetchOpportunityNotesAction(task.opportunityId, task.id);
        if (cancelled) return;
        if (result.success) {
          setNotes(result.data || []);
        }
      } catch {
        if (!cancelled) setNotes([]);
      } finally {
        if (!cancelled) setLoadingNotes(false);
      }
    }
    void loadNotes();
    return () => {
      cancelled = true;
    };
  }, [selectedTask?.id, selectedTask?.opportunityId, isOnline]);

  const hasUrgentNote = useMemo(() => notes.some((n) => isUrgentSchedulingNote(n)), [notes]);

  const handleAddNote = useCallback(async () => {
    if (!newNoteText.trim() || !selectedTask?.opportunityId) return;
    if (isOnboardingDemoEntity(selectedTask)) {
      toast.info("Formação", "No guia as notas não são enviadas ao CRM.");
      setNewNoteText("");
      return;
    }
    try {
      setIsCreatingNote(true);
      const author = userName || "Técnico";
      const title = `Nota de ${author}`;
      const body = newNoteText.trim();

      const result = await enqueueNote(
        selectedTask.opportunityId,
        null,
        title,
        body,
        selectedTask.id
      );
      if (!result.success) {
        toast.error(
          "Erro ao criar nota",
          toUserMessage(result.error, "Não foi possível guardar a nota.")
        );
        return;
      }
      if (result.queued) {
        toast.info("Nota guardada offline", "Será sincronizada quando houver rede.");
      } else {
        toast.success("Nota registada", "Nota adicionada ao histórico do CRM.");
      }

      setNewNoteText("");
      if (isOnline && !result.queued) {
        try {
          const updated = await fetchOpportunityNotesAction(selectedTask.opportunityId);
          if (updated.success) {
            setNotes(updated.data || []);
          }
        } catch {
          /* rede instável — nota já foi criada */
        }
      }
    } catch (e: unknown) {
      toast.error("Erro ao criar nota", toUserMessage(e, "Erro ao criar nota."));
    } finally {
      setIsCreatingNote(false);
    }
  }, [enqueueNote, isOnline, newNoteText, selectedTask, toast, userName]);

  return {
    notes,
    loadingNotes,
    newNoteText,
    setNewNoteText,
    isCreatingNote,
    hasUrgentNote,
    handleAddNote,
  };
}