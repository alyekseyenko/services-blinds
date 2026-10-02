import React, { useMemo } from "react";
import { useMediaMinWidth } from "@/hooks/useMediaMinWidth";
import { Calendar as CalendarIcon, Clock, AlertCircle, MapPin, User } from "lucide-react";
import { WorkspaceMember, Opportunity } from "@/types/admin";
import type { OptimizedRouteStop } from "@/lib/admin/routeOptimization";
import { computeRouteSlots, findScheduleConflicts } from "@/lib/admin/routeScheduleSlots";
import {
  ADMIN_SCHEDULE_HOURS_LABEL,
  validateRouteSlotsBusinessHours,
} from "@/lib/admin/schedulingHours";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export interface MassScheduleForm {
  date: string;
  technicianId: string;
  globalNotes: string;
  stopNotes: Record<string, string>;
  urgent: boolean;
}

interface MassScheduleModalProps {
  showMassScheduleModal: boolean;
  setShowMassScheduleModal: (show: boolean) => void;
  optimizedRoute: OptimizedRouteStop[] | null;
  opportunities: Opportunity[];
  massScheduleForm: MassScheduleForm;
  setMassScheduleForm: (form: MassScheduleForm) => void;
  workspaceMembers: WorkspaceMember[];
  isScheduling: boolean;
  handleMassSchedule: () => Promise<void> | void;
}

const fieldClass =
  "w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm font-bold text-foreground transition-all focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20";

const labelClass = "text-xs font-black uppercase tracking-widest text-muted-foreground";

export default function MassScheduleModal({
  showMassScheduleModal,
  setShowMassScheduleModal,
  optimizedRoute,
  opportunities,
  massScheduleForm,
  setMassScheduleForm,
  workspaceMembers,
  isScheduling,
  handleMassSchedule,
}: MassScheduleModalProps) {
  const isDesktopLg = useMediaMinWidth(1024);
  const visitStops = useMemo(
    () => (optimizedRoute || []).filter((stop) => !stop.isReturn),
    [optimizedRoute]
  );

  const slots = useMemo(
    () => computeRouteSlots(massScheduleForm.date, visitStops.length),
    [massScheduleForm.date, visitStops.length]
  );

  const selectedTechnician = workspaceMembers.find(
    (member) => member.id === massScheduleForm.technicianId
  );

  const conflicts = useMemo(() => {
    if (!massScheduleForm.date || !selectedTechnician?.name || slots.length === 0) return [];

    return findScheduleConflicts(
      visitStops.map((stop, index) => ({
        title: stop.title,
        dueAt: slots[index]?.dueAt || new Date(),
        opportunityId: stop.twentyId,
      })),
      opportunities,
      selectedTechnician.name,
      { excludeOpportunityIds: visitStops.map((stop) => stop.twentyId) }
    );
  }, [massScheduleForm.date, selectedTechnician?.name, slots, visitStops, opportunities]);

  const isPastDate = massScheduleForm.date
    ? new Date(`${massScheduleForm.date}T23:59:59`) < new Date()
    : false;

  const routeHoursWarning = useMemo(
    () => validateRouteSlotsBusinessHours(slots),
    [slots]
  );

  const cannotConfirm =
    isScheduling ||
    !massScheduleForm.date ||
    !massScheduleForm.technicianId ||
    isPastDate ||
    visitStops.length === 0 ||
    (conflicts.length > 0 && !massScheduleForm.urgent);

  const updateStopNote = (twentyId: string, value: string) => {
    setMassScheduleForm({
      ...massScheduleForm,
      stopNotes: { ...massScheduleForm.stopNotes, [twentyId]: value },
    });
  };

  const stopWord = visitStops.length === 1 ? "paragem" : "paragens";

  const alerts = (
    <>
      {routeHoursWarning && (
        <p className="rounded-lg border border-warning-border bg-warning-surface px-2.5 py-2 text-xs font-medium text-warning-fg">
          <AlertCircle className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          {routeHoursWarning} Horário habitual: {ADMIN_SCHEDULE_HOURS_LABEL}.
        </p>
      )}
      {conflicts.length > 0 && (
        <div className="rounded-lg border border-warning-border bg-warning-surface px-2.5 py-2 text-xs font-medium text-warning-fg">
          {conflicts.slice(0, 2).map((conflict, index) => (
            <p key={`${conflict.stopTitle}-${index}`}>
              «{conflict.stopTitle}» ↔ «{conflict.conflictingTitle}» (
              {conflict.conflictingTime.toLocaleTimeString("pt-PT", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              )
            </p>
          ))}
          {massScheduleForm.urgent && <p className="mt-1 font-semibold">Urgente: pode agendar na mesma.</p>}
        </div>
      )}
    </>
  );

  return (
    <Dialog
      open={showMassScheduleModal}
      onClose={() => setShowMassScheduleModal(false)}
      size="wide"
      scrollBody={!isDesktopLg}
      panelDataTour="admin-mass-schedule-modal"
      title="Agendar rota completa"
      description={`${visitStops.length} ${stopWord} · confirmadas no CRM de imediato`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">
            Ordem do roteiro · início ~8h30, ~105 min/visita
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setShowMassScheduleModal(false)}>
              Cancelar
            </Button>
            <Button
              disabled={cannotConfirm}
              loading={isScheduling}
              loadingText="A agendar..."
              onClick={handleMassSchedule}
              className="min-w-[10rem] bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              Agendar rota
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,17.5rem)_1fr] lg:gap-6">
        <section className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="space-y-1.5">
              <label className={cn(labelClass, "flex items-center gap-1")}>
                <User className="h-3 w-3" aria-hidden />
                Técnico
              </label>
              <select
                value={massScheduleForm.technicianId}
                onChange={(e) =>
                  setMassScheduleForm({ ...massScheduleForm, technicianId: e.target.value })
                }
                className={fieldClass}
              >
                <option value="">Selecionar...</option>
                {workspaceMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={cn(labelClass, "flex items-center gap-1")}>
                <CalendarIcon className="h-3 w-3" aria-hidden />
                Data
              </label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={massScheduleForm.date}
                onChange={(e) =>
                  setMassScheduleForm({ ...massScheduleForm, date: e.target.value })
                }
                className={fieldClass}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Notas para toda a rota</label>
            <textarea
              value={massScheduleForm.globalNotes}
              onChange={(e) =>
                setMassScheduleForm({ ...massScheduleForm, globalNotes: e.target.value })
              }
              placeholder="Opcional — códigos, estacionamento..."
              className={cn(fieldClass, "h-16 resize-none text-xs font-medium")}
            />
          </div>

          <label
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2",
              massScheduleForm.urgent ? "border-warning-border bg-warning-surface" : "border-border bg-muted"
            )}
          >
            <input
              type="checkbox"
              checked={massScheduleForm.urgent}
              onChange={(e) =>
                setMassScheduleForm({ ...massScheduleForm, urgent: e.target.checked })
              }
              className="h-4 w-4 accent-amber-600"
            />
            <span className="text-xs font-semibold text-foreground">Visita urgente (sobreposição)</span>
          </label>

          {alerts}
        </section>

        <section className="flex min-h-[12rem] flex-col overflow-hidden rounded-xl border border-border bg-muted/50 lg:min-h-[20rem]">
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-3 py-2">
            <span className={cn(labelClass, "flex items-center gap-1 text-muted-foreground")}>
              <Clock className="h-3.5 w-3.5 text-neon" aria-hidden />
              Paragens ({visitStops.length})
            </span>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2 custom-scrollbar">
            {visitStops.map((stop, index) => {
              const slot = slots[index];
              return (
                <div
                  key={stop.twentyId}
                  className="rounded-lg border border-border bg-card p-2.5 shadow-sm"
                >
                  <div className="flex gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink text-xs font-black text-neon">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-muted-foreground">
                        {slot ? slot.hourLabel : "—"}
                      </p>
                      <p className="truncate text-xs font-black text-foreground">{stop.title}</p>
                      <p className="flex items-center gap-0.5 truncate text-xs text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5 shrink-0" aria-hidden />
                        {stop.client}
                      </p>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={massScheduleForm.stopNotes[stop.twentyId] || ""}
                    onChange={(e) => updateStopNote(stop.twentyId, e.target.value)}
                    placeholder="Nota desta paragem (opcional)"
                    className="mt-2 w-full rounded-lg border border-border bg-muted px-2 py-1.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </Dialog>
  );
}
