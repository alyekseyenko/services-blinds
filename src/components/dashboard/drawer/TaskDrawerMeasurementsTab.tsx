"use client";

import type { RefObject } from "react";
import { getExtraServiceTypeLabel } from "@/lib/extraServiceTypeLabels";
import { isTaskActive } from "@/lib/crm/contract";
import { formatMeasurementsReport } from "@/lib/measurementsUtils";
import { toUserMessage } from "@/lib/userMessages";
import { TechnicianMeasurementFicha } from "@/components/features/measurements/TechnicianMeasurementFicha";
import MeasurementsForm, {
  MeasurementsSaveButton,
  type MeasurementsFormHandle,
} from "@/components/features/measurements/MeasurementsForm";
import type { VisitService } from "@/lib/schemas";
import type { MeasurementsFocusedStatus } from "@/components/features/measurements/MeasurementsFocusStatusBar";
import { Button } from "@/components/ui/button";

type QueueEnqueueResult = { success: boolean; queued: boolean; error?: string };

export function TaskDrawerMeasurementsTab(props: {
  selectedTask: Record<string, unknown> & { id: string; opportunityId: string; status: string };
  setSelectedTask: (t: unknown) => void;
  mutateTasks: () => void;
  measurementServices: VisitService[];
  measurementOppId?: string;
  setMeasurementOppId: (id: string) => void;
  measurementsFullscreen: boolean;
  showMeasurementsTab: boolean;
  showMeasurementsUi: boolean;
  activeTab: "info" | "measurements";
  measurementsFormRef: RefObject<MeasurementsFormHandle | null>;
  setMeasurementsDirty: (dirty: boolean) => void;
  setMeasurementsFocusedStatus: (status: MeasurementsFocusedStatus | null) => void;
  enqueueMeasurementsSave: (id: string, oppId: string, data: unknown) => Promise<QueueEnqueueResult>;
}) {
  const {
    selectedTask,
    setSelectedTask,
    mutateTasks,
    measurementServices,
    measurementOppId,
    setMeasurementOppId,
    measurementsFullscreen,
    measurementsFormRef,
    setMeasurementsDirty,
    setMeasurementsFocusedStatus,
    enqueueMeasurementsSave,
  } = props;

  if (props.activeTab !== "measurements" || !props.showMeasurementsUi) {
    return null;
  }

  return (
        <div className="animate-in fade-in duration-300">
          {!measurementsFullscreen && measurementServices.length > 1 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {measurementServices.map((svc) => (
                <button
                  key={svc.opportunityId}
                  type="button"
                  onClick={() => setMeasurementOppId(svc.opportunityId)}
                  className={`min-h-12 rounded-xl px-4 text-xs font-black uppercase ${
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
          {!isTaskActive(selectedTask.status) ? (
            <TechnicianMeasurementFicha
              taskId={selectedTask.id}
              opportunityId={measurementOppId || selectedTask.opportunityId}
            />
          ) : (
            <MeasurementsForm
              ref={measurementsFormRef}
              saveBarMode="external"
              focusedLayout={measurementsFullscreen}
              task={selectedTask as never}
              opportunityId={measurementOppId || selectedTask.opportunityId}
              isAdmin={false}
              readOnly={false}
              onDirtyChange={setMeasurementsDirty}
              onFocusedStatusChange={setMeasurementsFocusedStatus}
              onSave={async (data) => {
                const oppId = measurementOppId || selectedTask.opportunityId;
                if (!oppId) {
                  return { success: false, error: "Nenhum serviço selecionado para medições." };
                }
                const result = await enqueueMeasurementsSave(selectedTask.id, oppId, data);
                if (!result.success) {
                  return {
                    success: false,
                    error: toUserMessage(result.error, "Não foi possível guardar as medições."),
                  };
                }
                const updatedReport = formatMeasurementsReport(data);
                setSelectedTask({ ...selectedTask, report: updatedReport });
                mutateTasks();
                return { success: true, queued: result.queued };
              }}
            />
          )}
        </div>
  );
}

export function TaskDrawerMeasurementsSaveBar(props: {
  visible: boolean;
  measurementsFullscreen: boolean;
  loading: boolean;
  onSave: () => void;
}) {
  if (!props.visible) return null;
  return (
    <div
      className={`shrink-0 border-t border-border bg-card px-4 py-3 shadow-md ${
        props.measurementsFullscreen ? "" : "md:px-8 md:py-4"
      }`}
      data-tour="tech-drawer-measurements-save"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <MeasurementsSaveButton
        onClick={props.onSave}
        loading={props.loading}
        dataTour="tech-drawer-measurements-save-btn"
      />
    </div>
  );
}

export function TaskDrawerStatusSubmitBar(props: {
  visible: boolean;
  isUploading: boolean;
  repairPaymentMissing: boolean;
  onSubmit: () => void;
}) {
  if (!props.visible) return null;
  return (
    <div
      className="shrink-0 border-t border-border bg-card px-4 py-3 shadow-md"
      data-tour="tech-drawer-submit-report-bar"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <Button
        variant="inverse"
        data-tour="tech-drawer-submit-report"
        onClick={props.onSubmit}
        disabled={props.isUploading || props.repairPaymentMissing}
        className="w-full min-h-12 py-4 shadow-md"
        loading={props.isUploading}
      >
        Submeter Relatório de Serviço
      </Button>
    </div>
  );
}