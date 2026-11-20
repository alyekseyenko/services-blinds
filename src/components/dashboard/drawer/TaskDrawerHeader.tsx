"use client";

import type { RefObject } from "react";
import { ChevronLeft, FileText, Plus, Ruler, X } from "lucide-react";
import { isTaskActive } from "@/lib/crm/contract";
import { isUrgentVisitMarkdown } from "@/lib/crm/urgentSchedulingUi";
import type { VisitService } from "@/lib/schemas";
import { getExtraServiceTypeLabel } from "@/lib/extraServiceTypeLabels";
import {
  MeasurementsFocusStatusBar,
  type MeasurementsFocusedStatus,
} from "@/components/features/measurements/MeasurementsFocusStatusBar";
import type { MeasurementsFormHandle } from "@/components/features/measurements/MeasurementsForm";

export function TaskDrawerHeader(props: {
  measurementsFullscreen: boolean;
  mobileDrawerExpanded: boolean;
  drawerLocked: boolean;
  selectedTask: {
    serviceNumber?: string;
    nsi?: string;
    report?: string;
    status: string;
  };
  visitDrawerHeader: { heading: string; detail: string };
  primaryServiceLabel?: string;
  primaryServiceColors: { bg: string; text: string } | null;
  hasUrgentNote: boolean;
  showMeasurementsUi: boolean;
  activeTab: "info" | "measurements";
  measurementsDirty: boolean;
  measurementServices: VisitService[];
  measurementOppId?: string;
  setMeasurementOppId: (id: string) => void;
  measurementsFocusedStatus: MeasurementsFocusedStatus | null;
  measurementsFormRef: RefObject<MeasurementsFormHandle | null>;
  onClose: () => void;
  onLeaveMeasurementsTab: () => void;
  setActiveTab: (tab: "info" | "measurements") => void;
  drawerHandleRef: RefObject<HTMLButtonElement | null>;
}) {
  const {
    measurementsFullscreen,
    mobileDrawerExpanded,
    drawerLocked,
    selectedTask,
    visitDrawerHeader,
    primaryServiceLabel,
    primaryServiceColors,
    hasUrgentNote,
    showMeasurementsUi,
    activeTab,
    measurementsDirty,
    measurementServices,
    measurementOppId,
    setMeasurementOppId,
    measurementsFocusedStatus,
    measurementsFormRef,
    onClose,
    onLeaveMeasurementsTab,
    setActiveTab,
    drawerHandleRef,
  } = props;

  return (
    <>
      {!measurementsFullscreen && mobileDrawerExpanded ? (
        <button
          ref={drawerHandleRef}
          type="button"
          aria-label="Fechar visita — arraste para baixo"
          className="mx-auto flex min-h-12 w-full max-w-[12rem] shrink-0 touch-manipulation items-center justify-center rounded-full active:opacity-80 outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          onClick={() => void onClose()}
        >
          <span className="h-1.5 w-16 rounded-full bg-border" aria-hidden />
        </button>
      ) : null}

      {measurementsFullscreen ? (
        <div
          className="shrink-0 border-b border-border/90 bg-card px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]"
          data-tour="tech-drawer-measurements-focus"
        >
          <h2 id="task-drawer-title" className="sr-only">
            Medições da visita
          </h2>
          <div className="relative flex items-center gap-1">
            <button
              type="button"
              data-tour="tech-drawer-tab-info"
              onClick={() => void onLeaveMeasurementsTab()}
              className="flex min-h-12 shrink-0 items-center gap-0.5 rounded-xl px-2 text-xs font-black uppercase tracking-wide text-foreground active:bg-muted"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
              Detalhes
            </button>
            <p
              className="pointer-events-none absolute inset-x-12 top-1/2 -translate-y-1/2 truncate text-center text-xs font-black uppercase tracking-wide text-foreground"
              aria-hidden
            >
              Medições
            </p>
            <div className="min-w-0 flex-1" aria-hidden />
            {isTaskActive(selectedTask.status) ? (
              <button
                type="button"
                data-tour="tech-measurements-add-product"
                onClick={() => measurementsFormRef.current?.addGroup()}
                className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl bg-ink text-ink-foreground active:scale-95"
                aria-label="Novo produto"
              >
                <Plus className="h-5 w-5 text-primary" aria-hidden />
              </button>
            ) : (
              <span className="min-w-12" aria-hidden />
            )}
            <button
              type="button"
              onClick={() => void onClose()}
              disabled={drawerLocked}
              className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl text-muted-foreground active:bg-muted disabled:opacity-50"
              aria-label="Fechar medições"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {measurementsFocusedStatus ? (
            <MeasurementsFocusStatusBar className="mt-2" {...measurementsFocusedStatus} />
          ) : null}
          {measurementServices.length > 1 ? (
            <div className="-mx-1 mt-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 custom-scrollbar">
              {measurementServices.map((svc) => (
                <button
                  key={svc.opportunityId}
                  type="button"
                  onClick={() => setMeasurementOppId(svc.opportunityId)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-black uppercase ${
                    measurementOppId === svc.opportunityId
                      ? "bg-primary text-primary-foreground border-2 border-border-strong"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {getExtraServiceTypeLabel(svc.serviceType) || svc.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {!measurementsFullscreen ? (
        <div
          className={`shrink-0 px-4 pb-2 md:px-5 ${mobileDrawerExpanded ? "border-b border-border bg-card pt-[max(0.25rem,env(safe-area-inset-top))]" : "pt-1"}`}
        >
          <div className="mb-2 flex items-start justify-between gap-2" data-tour="tech-drawer-header">
            <div className="min-w-0">
              <h2
                id="task-drawer-title"
                className="text-lg font-bold leading-snug text-foreground md:text-xl"
              >
                {visitDrawerHeader.heading}
              </h2>
              {visitDrawerHeader.detail ? (
                <p className="mt-1 text-sm font-medium leading-snug text-muted-foreground">
                  {visitDrawerHeader.detail}
                </p>
              ) : null}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {primaryServiceLabel && primaryServiceColors ? (
                  <span
                    className="rounded-md border px-2.5 py-1 text-xs font-black uppercase tracking-wider"
                    style={{
                      backgroundColor: primaryServiceColors.bg,
                      color: primaryServiceColors.text,
                      borderColor: `${primaryServiceColors.text}20`,
                    }}
                  >
                    {primaryServiceLabel}
                  </span>
                ) : null}
                {selectedTask.serviceNumber ? (
                  <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                    N.º <span className="ds-num text-foreground">{selectedTask.serviceNumber}</span>
                  </span>
                ) : null}
                {selectedTask.nsi && selectedTask.nsi !== "N/A" ? (
                  <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                    NSI <span className="ds-num text-foreground">#{selectedTask.nsi}</span>
                  </span>
                ) : null}
                {(isUrgentVisitMarkdown(selectedTask.report) || hasUrgentNote) && (
                  <span className="rounded-xl border-2 border-danger-solid bg-danger-surface px-3 py-1 text-xs font-black uppercase tracking-wider text-danger-fg">
                    Visita urgente
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void onClose()}
              disabled={drawerLocked}
              className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.97] disabled:opacity-50"
              aria-label="Fechar detalhes da visita"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {showMeasurementsUi && (
            <div
              className={`bg-muted p-1.5 rounded-2xl border border-border shadow-inner flex w-full max-w-lg mx-auto gap-1.5 ${mobileDrawerExpanded ? "mb-4" : "mb-8"}`}
              data-tour="tech-drawer-tabs"
            >
              <button
                type="button"
                data-tour="tech-drawer-tab-info"
                onClick={() => {
                  if (activeTab === "measurements") {
                    void onLeaveMeasurementsTab();
                  } else {
                    setActiveTab("info");
                  }
                }}
                className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === "info"
                    ? "bg-primary text-primary-foreground border-2 border-border-strong"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <FileText className="w-4 h-4" /> Detalhes & Visita
              </button>
              <button
                type="button"
                data-tour="tech-drawer-tab-measurements"
                onClick={() => setActiveTab("measurements")}
                className={`relative flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === "measurements"
                    ? "bg-primary text-primary-foreground border-2 border-border-strong"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Ruler className="w-4 h-4" /> Medições
                {measurementsDirty && activeTab !== "measurements" ? (
                  <span
                    className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-warning-solid"
                    aria-label="Medições por guardar"
                  />
                ) : null}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}