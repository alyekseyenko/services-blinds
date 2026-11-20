"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createOpportunityNoteAction, fetchOpportunityNotesAction } from "@/actions/notes-actions";
import { useToast } from "@/components/ui/ToastContext";
import { toUserMessage } from "@/lib/userMessages";
import { isOnboardingDemoEntity } from "@/lib/demo/demoIds";
import {
  countSchedulingNotes,
  formatScheduleStatsLabel,
} from "@/lib/opportunityScheduleStats";
import type { Opportunity } from "@/types/admin";

export interface AdminOpportunityNote {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export function useAdminOpportunityNotes(selectedOpportunity: Opportunity | null) {
  const [notes, setNotes] = useState<AdminOpportunityNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!selectedOpportunity?.twentyId) {
      setNotes([]);
      setNoteDraft("");
      return;
    }
    setNoteDraft("");
    const opportunity = selectedOpportunity;
    const twentyId = opportunity.twentyId;
    let cancelled = false;
    async function loadNotes() {
      if (isOnboardingDemoEntity(opportunity)) {
        setNotes([]);
        setLoadingNotes(false);
        return;
      }
      setLoadingNotes(true);
      try {
        const result = await fetchOpportunityNotesAction(twentyId);
        if (cancelled) return;
        if (result.success) {
          setNotes((result.data as AdminOpportunityNote[]) || []);
        } else {
          console.error("Erro ao carregar notas no Admin:", result.error);
        }
      } finally {
        if (!cancelled) setLoadingNotes(false);
      }
    }
    void loadNotes();
    return () => {
      cancelled = true;
    };
  }, [selectedOpportunity?.twentyId, selectedOpportunity?.id]);

  const scheduleNoteStats = useMemo(() => countSchedulingNotes(notes), [notes]);
  const scheduleNoteLabel = useMemo(
    () => formatScheduleStatsLabel(scheduleNoteStats),
    [scheduleNoteStats]
  );

  const submitNote = useCallback(async () => {
    const body = noteDraft.trim();
    const opportunityId = selectedOpportunity?.twentyId;
    if (!body || !opportunityId || savingNote || !selectedOpportunity) return;
    setSavingNote(true);
    const result = await createOpportunityNoteAction(
      opportunityId,
      selectedOpportunity.pointOfContactId || null,
      "Nota do painel",
      body
    );
    setSavingNote(false);
    if (!result.success) {
      toast.error(
        "Não foi possível guardar a nota",
        toUserMessage(result.error, "A nota não ficou ligada ao serviço.")
      );
      return;
    }
    setNoteDraft("");
    const refreshed = await fetchOpportunityNotesAction(opportunityId);
    if (refreshed.success) setNotes((refreshed.data as AdminOpportunityNote[]) || []);
    toast.success("Nota registada", "Ficou na linha do tempo deste serviço no Twenty.");
  }, [noteDraft, savingNote, selectedOpportunity, toast]);

  return {
    notes,
    loadingNotes,
    noteDraft,
    setNoteDraft,
    savingNote,
    scheduleNoteStats,
    scheduleNoteLabel,
    submitNote,
  };
}