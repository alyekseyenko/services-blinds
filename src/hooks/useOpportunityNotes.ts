"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchOpportunityNotesAction } from "@/actions/notes-actions";
import type { AppNote } from "@/lib/crm/appTypes";

export function useOpportunityNotes(opportunityId: string | null | undefined, taskId?: string) {
  const [notes, setNotes] = useState<AppNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const reload = useCallback(async () => {
    if (!opportunityId) {
      setNotes([]);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchOpportunityNotesAction(opportunityId, taskId);
      if (requestId !== requestIdRef.current) return;
      if (!result.success) {
        setError(result.error || "Não foi possível carregar as notas.");
        setNotes([]);
        return;
      }
      setNotes(result.data ?? []);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError("Não foi possível carregar as notas.");
      setNotes([]);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [opportunityId, taskId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { notes, loading, error, reload, setNotes };
}
