"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchOpportunityNotesAction } from "@/actions/notes-actions";
import { isUrgentSchedulingNote } from "@/lib/crm/urgentSchedulingUi";
import { isOnboardingDemoEntity } from "@/lib/demo/demoIds";
import { db } from "@/lib/db";
import { toUserMessage } from "@/lib/userMessages";
import {
  appendPendingOpportunityNote,
  getCachedOpportunityNotes,
  mergeCachedOpportunityNotes,
  type CachedCrmNote,
} from "@/lib/visits/offlineNotesCache";
import { useToast } from "@/components/ui/ToastContext";

type QueueEnqueueResult = { success: boolean; queued: boolean; error?: string };

export type OpportunityDrawerNote = CachedCrmNote;

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
  const [notes, setNotes] = useState<OpportunityDrawerNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [notesFromCache, setNotesFromCache] = useState(false);

  const loadPendingFromQueue = useCallback(async (opportunityId: string) => {
    try {
      const rows = await db.syncQueue
        .where("status")
        .anyOf("pending", "failed")
        .toArray();
      return rows
        .filter(
          (item) =>
            item.action === "ADD_NOTE" &&
            item.payload?.opportunityId === opportunityId &&
            typeof item.payload?.body === "string"
        )
        .map((item, index) => ({
          id: `queue-${item.id ?? index}-${item.timestamp}`,
          title: typeof item.payload?.title === "string" ? item.payload.title : "Nota",
          body: item.payload.body as string,
          createdAt: new Date(item.timestamp).toISOString(),
          pendingSync: true,
        }));
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (!selectedTask?.opportunityId) {
      setNotes([]);
      setNotesFromCache(false);
      return;
    }
    if (isOnboardingDemoEntity(selectedTask)) {
      setNotes([]);
      setLoadingNotes(false);
      setNotesFromCache(false);
      return;
    }
    let cancelled = false;
    async function loadNotes() {
      const task = selectedTask;
      if (!task?.opportunityId) return;

      if (!isOnline) {
        const cached = getCachedOpportunityNotes(task.opportunityId);
        const queued = await loadPendingFromQueue(task.opportunityId);
        const byBody = new Set(cached.filter((n) => !n.pendingSync).map((n) => n.body));
        const merged = [
          ...queued.filter((q) => !byBody.has(q.body)),
          ...cached,
        ];
        if (!cancelled) {
          setNotes(merged);
          setNotesFromCache(cached.length > 0 || queued.length > 0);
          setLoadingNotes(false);
        }
        return;
      }

      setLoadingNotes(true);
      try {
        const result = await fetchOpportunityNotesAction(task.opportunityId, task.id);
        if (cancelled) return;
        if (result.success) {
          const serverNotes = (result.data || []).map((n) => ({ ...n, pendingSync: false }));
          const merged = mergeCachedOpportunityNotes(task.opportunityId, serverNotes);
          const queued = await loadPendingFromQueue(task.opportunityId);
          const serverBodies = new Set(merged.map((n) => n.body));
          const withQueue = [
            ...queued.filter((q) => !serverBodies.has(q.body)),
            ...merged,
          ];
          setNotes(withQueue);
          setNotesFromCache(false);
        }
      } catch {
        if (!cancelled) {
          const cached = getCachedOpportunityNotes(task.opportunityId);
          setNotes(cached);
          setNotesFromCache(cached.length > 0);
        }
      } finally {
        if (!cancelled) setLoadingNotes(false);
      }
    }
    void loadNotes();
    return () => {
      cancelled = true;
    };
  }, [selectedTask?.id, selectedTask?.opportunityId, isOnline, loadPendingFromQueue]);

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
        const optimistic: OpportunityDrawerNote = {
          id: `pending-${Date.now()}`,
          title,
          body,
          createdAt: new Date().toISOString(),
          pendingSync: true,
        };
        setNotes(appendPendingOpportunityNote(selectedTask.opportunityId, optimistic));
      } else {
        toast.success("Nota registada", "Nota adicionada ao histórico do CRM.");
      }

      setNewNoteText("");
      if (isOnline && !result.queued) {
        try {
          const updated = await fetchOpportunityNotesAction(selectedTask.opportunityId);
          if (updated.success) {
            const serverNotes = (updated.data || []).map((n) => ({ ...n, pendingSync: false }));
            const merged = mergeCachedOpportunityNotes(selectedTask.opportunityId, serverNotes);
            setNotes(merged);
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
    notesFromCache,
    newNoteText,
    setNewNoteText,
    isCreatingNote,
    hasUrgentNote,
    handleAddNote,
  };
}