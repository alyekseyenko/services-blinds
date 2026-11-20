"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/button";
import MeasurementsForm from "@/components/features/measurements/MeasurementsForm";
import {
  getAdminMeasurementSeedPayloadAction,
  saveAdminManualMeasurementsAction,
  searchPipelineServicesForMeasurementsAction,
  type MeasurementPipelineServiceHit,
} from "@/actions/measurements-actions";
import { useToast } from "@/components/ui/ToastContext";
import type { MeasurementsPayload } from "@/lib/schemas";
import type { Task } from "@/types";

type Step = "pick" | "form";

interface AdminManualMeasurementsDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AdminManualMeasurementsDialog({
  open,
  onClose,
  onSaved,
}: AdminManualMeasurementsDialogProps) {
  const toast = useToast();
  const [step, setStep] = useState<Step>("pick");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<MeasurementPipelineServiceHit[]>([]);
  const [loadingHits, setLoadingHits] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MeasurementPipelineServiceHit | null>(null);
  const [payload, setPayload] = useState<MeasurementsPayload | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingForm, setLoadingForm] = useState(false);

  const reset = useCallback(() => {
    setStep("pick");
    setSearch("");
    setQuery("");
    setHits([]);
    setPickError(null);
    setSelected(null);
    setPayload(null);
    setFormError(null);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setQuery(search), 300);
    return () => window.clearTimeout(t);
  }, [search, open]);

  useEffect(() => {
    if (!open || step !== "pick") return;
    let cancelled = false;
    setLoadingHits(true);
    setPickError(null);
    void searchPipelineServicesForMeasurementsAction(query).then((result) => {
      if (cancelled) return;
      setLoadingHits(false);
      if (!result.success) {
        setPickError(result.error || "Não foi possível pesquisar.");
        setHits([]);
        return;
      }
      setHits(result.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [open, step, query]);

  const openForm = (hit: MeasurementPipelineServiceHit) => {
    if (!hit.taskId) {
      toast.warning(
        "Sem visita no CRM",
        "Agende uma visita para este serviço antes de inserir medições."
      );
      return;
    }
    setSelected(hit);
    setLoadingForm(true);
    setFormError(null);
    void getAdminMeasurementSeedPayloadAction(hit.opportunityId).then((result) => {
      setLoadingForm(false);
      if (!result.success || !result.data) {
        setFormError(result.error || "Não foi possível abrir o formulário.");
        return;
      }
      setPayload(result.data);
      setStep("form");
    });
  };

  const task: Task | undefined = selected
    ? {
        id: selected.taskId || selected.opportunityId,
        nsi: selected.nsi || "—",
        client: selected.client,
        address: selected.address,
        opportunityId: selected.opportunityId,
      }
    : undefined;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="wide"
      scrollBody={step === "pick"}
      title="Inserir medidas (SOS)"
      description="Ligar medições a um serviço do pipeline, como no terreno — sem criar visita nova."
      footer={
        step === "pick" ? (
          <Button variant="outline" onClick={onClose} className="min-h-12">
            Fechar
          </Button>
        ) : (
          <Button
            variant="outline"
            className="min-h-12"
            onClick={() => {
              setStep("pick");
              setPayload(null);
            }}
          >
            Escolher outro serviço
          </Button>
        )
      }
    >
      {step === "pick" ? (
        <div className="space-y-4">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cliente, NSI, morada ou título do serviço…"
              className="min-h-12 w-full rounded-xl border-2 border-border bg-card pl-10 pr-3 text-sm font-medium"
            />
          </label>
          {loadingHits ? (
            <div className="flex min-h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />A pesquisar…
            </div>
          ) : null}
          {pickError ? <p className="text-sm font-semibold text-danger-fg">{pickError}</p> : null}
          {!loadingHits && !pickError ? (
            <ul className="max-h-[min(24rem,50vh)] space-y-2 overflow-y-auto custom-scrollbar">
              {hits.length === 0 ? (
                <li className="rounded-xl border border-border bg-muted px-3 py-4 text-sm font-medium text-muted-foreground">
                  Nenhum serviço encontrado no pipeline.
                </li>
              ) : (
                hits.map((hit) => (
                  <li key={hit.opportunityId}>
                    <button
                      type="button"
                      disabled={!hit.taskId || loadingForm}
                      onClick={() => openForm(hit)}
                      className="flex min-h-12 w-full flex-col items-start gap-1 rounded-xl border-2 border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="text-sm font-black text-foreground">{hit.title}</span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {hit.client}
                        {hit.nsi ? ` · NSI ${hit.nsi}` : ""} · {hit.address}
                      </span>
                      {!hit.taskId ? (
                        <span className="text-xs font-semibold text-warning-fg">
                          Sem visita no CRM — agendar primeiro
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      ) : null}

      {step === "form" && selected ? (
        <div className="space-y-3">
          <p className="text-sm font-bold text-foreground">{selected.title}</p>
          <p className="text-xs font-medium text-muted-foreground">
            Ao guardar cria uma versão nova marcada com o seu nome. O fluxo do técnico não muda.
          </p>
          {formError ? (
            <p className="text-sm font-semibold text-danger-fg">{formError}</p>
          ) : loadingForm || !payload ? (
            <div className="flex min-h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary-ink" aria-label="A carregar" />
            </div>
          ) : (
            <MeasurementsForm
              task={task}
              opportunityId={selected.opportunityId}
              isAdmin
              seedPayload={payload}
              saveBarMode="inline"
              onSave={async (data) => {
                const result = await saveAdminManualMeasurementsAction(selected.opportunityId, data);
                if (!result.success || !result.data) {
                  return { success: false, error: result.error || "Não foi possível guardar." };
                }
                toast.success(
                  `Versão v${result.data.version} gravada`,
                  result.data.noteSaved
                    ? "Medições associadas ao serviço e nota no CRM."
                    : "Medições gravadas. A nota no CRM não ficou registada."
                );
                onSaved();
                onClose();
                return { success: true };
              }}
            />
          )}
        </div>
      ) : null}
    </Dialog>
  );
}

export function AdminManualMeasurementsTrigger({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-12 gap-2 bg-primary text-primary-foreground hover:bg-primary-hover"
    >
      <Plus className="h-4 w-4" aria-hidden />
      Inserir medidas
    </Button>
  );
}