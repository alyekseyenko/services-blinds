import React, { useMemo } from "react";
import { useMediaMinWidth } from "@/hooks/useMediaMinWidth";
import { Calendar as CalendarIcon, Clock, AlertCircle, MapPin, User, StickyNote } from "lucide-react";
import { WorkspaceMember, Opportunity } from "@/types/admin";
import type { OptimizedRouteStop } from "@/lib/admin/routeOptimization";
import {
  autoDistributedStopTimes,
  duplicateMassStopTimeMessage,
  findScheduleConflicts,
  massStopDueAt,
  massStopEndAt,
  massStopEndTime,
  massStopTime,
} from "@/lib/admin/routeScheduleSlots";
import { isScheduleEndAfterStart } from "@/lib/visits/calendarVisitSpan";
import {
  ADMIN_SCHEDULE_HOURS_LABEL,
  validateRouteSlotsBusinessHours,
} from "@/lib/admin/schedulingHours";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { FairServiceTypeDuration } from "@/lib/schemas/ceoMetrics";
import { fairDurationForOpportunity } from "@/lib/admin/fairDurationDisplay";
import { FairOnSiteDurationHelpButton } from "@/components/admin/FairOnSiteDurationHelpButton";

export interface MassScheduleForm {
  date: string;
  technicianId: string;
  globalNotes: string;
  stopNotes: Record<string, string>;
  stopTimes: Record<string, string>;
  stopEndTimes: Record<string, string>;
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
  fairServiceTypeDurations?: FairServiceTypeDuration[];
  fairBenchmarksReady?: boolean;
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
  fairServiceTypeDurations = [],
  fairBenchmarksReady = false,
}: MassScheduleModalProps) {
  const isDesktopLg = useMediaMinWidth(1024);
  const visitStops = useMemo(
    () => (optimizedRoute || []).filter((stop) => !stop.isReturn),
    [optimizedRoute]
  );

  const slots = useMemo(
    () =>
      visitStops.map((stop) => {
        const time = massStopTime(massScheduleForm.stopTimes, stop.twentyId);
        const dueAt = massStopDueAt(massScheduleForm.date, massScheduleForm.stopTimes, stop.twentyId);
        const endTime = massStopEndTime(massScheduleForm.stopEndTimes, stop.twentyId);
        const endAt = massStopEndAt(
          massScheduleForm.date,
          dueAt,
          massScheduleForm.stopEndTimes,
          stop.twentyId
        );
        const invalidEnd =
          Boolean(endTime) &&
          Boolean(dueAt) &&
          (!endAt || !isScheduleEndAfterStart(dueAt as Date, endAt));
        return { stop, time, endTime, dueAt, endAt, invalidEnd };
      }),
    [massScheduleForm.date, massScheduleForm.stopTimes, massScheduleForm.stopEndTimes, visitStops]
  );

  const selectedTechnician = workspaceMembers.find(
    (member) => member.id === massScheduleForm.technicianId
  );

  const conflicts = useMemo(() => {
    if (!massScheduleForm.date || !selectedTechnician?.name || slots.some((slot) => !slot.dueAt)) {
      return [];
    }

    return findScheduleConflicts(
      slots.map((slot) => ({
        title: slot.stop.title,
        dueAt: slot.dueAt as Date,
        endAt: slot.endAt ?? undefined,
        opportunityId: slot.stop.twentyId,
      })),
      opportunities,
      selectedTechnician.name,
      {
        excludeOpportunityIds: visitStops.map((stop) => stop.twentyId),
        technicianId: massScheduleForm.technicianId,
      }
    );
  }, [
    massScheduleForm.date,
    massScheduleForm.technicianId,
    selectedTechnician?.name,
    slots,
    visitStops,
    opportunities,
  ]);

  const isPastDate = massScheduleForm.date
    ? new Date(`${massScheduleForm.date}T23:59:59`) < new Date()
    : false;

  const routeHoursWarning = useMemo(
    () => validateRouteSlotsBusinessHours(slots.flatMap((slot) => (slot.dueAt ? [{ dueAt: slot.dueAt }] : []))),
    [slots]
  );

  const sameTimeWarning = useMemo(
    () =>
      duplicateMassStopTimeMessage(
        slots.map((slot) => ({ title: slot.stop.title, time: slot.time }))
      ),
    [slots]
  );

  const cannotConfirm =
    isScheduling ||
    !massScheduleForm.date ||
    !massScheduleForm.technicianId ||
    isPastDate ||
    visitStops.length === 0 ||
    slots.some((slot) => !slot.dueAt);

  const updateStopNote = (twentyId: string, value: string) => {
    setMassScheduleForm({
      ...massScheduleForm,
      stopNotes: { ...massScheduleForm.stopNotes, [twentyId]: value },
    });
  };

  const updateStopTime = (twentyId: string, value: string) => {
    setMassScheduleForm({
      ...massScheduleForm,
      stopTimes: { ...massScheduleForm.stopTimes, [twentyId]: value },
    });
  };

  const updateStopEndTime = (twentyId: string, value: string) => {
    setMassScheduleForm({
      ...massScheduleForm,
      stopEndTimes: { ...massScheduleForm.stopEndTimes, [twentyId]: value },
    });
  };

  const distributeHours = () => {
    if (!massScheduleForm.date) return;
    setMassScheduleForm({
      ...massScheduleForm,
      stopTimes: {
        ...massScheduleForm.stopTimes,
        ...autoDistributedStopTimes(
          massScheduleForm.date,
          visitStops.map((stop) => stop.twentyId)
        ),
      },
    });
  };

  const stopWord = visitStops.length === 1 ? "paragem" : "paragens";
  const routeNote = massScheduleForm.globalNotes.trim();

  const alerts = (
    <>
      {routeHoursWarning && (
        <p className="rounded-lg border border-warning-border bg-warning-surface px-2.5 py-2 text-xs font-medium text-warning-fg">
          <AlertCircle className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          {routeHoursWarning} Horário habitual: {ADMIN_SCHEDULE_HOURS_LABEL}.
        </p>
      )}
      {sameTimeWarning && (
        <p className="rounded-lg border border-warning-border bg-warning-surface px-2.5 py-2 text-xs font-medium text-warning-fg">
          <AlertCircle className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          {sameTimeWarning} Pode agendar na mesma.
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
          <p className="mt-1 font-semibold">Sobreposição na agenda deste técnico. Pode agendar na mesma.</p>
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
            Cada paragem começa às 09:00. Repartir horas só se carregar no botão.
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
            <label htmlFor="mass-route-note" className={cn(labelClass, "flex items-center gap-1")}>
              <StickyNote className="h-3 w-3" aria-hidden />
              Nota igual em todas as paragens
            </label>
            <textarea
              id="mass-route-note"
              value={massScheduleForm.globalNotes}
              onChange={(e) =>
                setMassScheduleForm({ ...massScheduleForm, globalNotes: e.target.value })
              }
              placeholder="Opcional — códigos, estacionamento..."
              aria-describedby="mass-route-note-help"
              className={cn(fieldClass, "min-h-24 resize-none text-sm font-medium")}
            />
            <p id="mass-route-note-help" className="text-xs font-medium leading-snug text-muted-foreground">
              {routeNote
                ? `A mesma mensagem fica na nota de cada uma das ${visitStops.length} ${stopWord}. A nota de uma paragem, se a escrever, junta-se a seguir.`
                : "Se escrever aqui, a mesma mensagem é copiada para a nota de cada visita. A nota de uma paragem junta-se a seguir e não a substitui."}
            </p>
          </div>

          <label
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5",
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
            <span className="text-xs font-semibold text-foreground">
              <span className="font-black uppercase tracking-wide text-warning-fg">Urgente</span>
              <span className="mt-0.5 block font-medium text-muted-foreground">
                Permite a mesma hora e sobreposição na agenda do técnico.
              </span>
            </span>
          </label>

          {alerts}
        </section>

        <section className="flex min-h-[12rem] flex-col overflow-hidden rounded-xl border border-border bg-muted/50 lg:min-h-[20rem]">
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-3 py-2">
            <span className="min-w-0">
              <span className={cn(labelClass, "flex items-center gap-1 text-muted-foreground")}>
                <Clock className="h-3.5 w-3.5 text-neon" aria-hidden />
                Paragens ({visitStops.length})
              </span>
              <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                Hora e nota só desta visita.
              </span>
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <FairOnSiteDurationHelpButton className="min-h-12 min-w-12" />
              <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
                Tempo médio
              </span>
              <button
                type="button"
                onClick={distributeHours}
                disabled={!massScheduleForm.date || visitStops.length === 0}
                className="min-h-12 rounded-lg border border-border bg-muted px-3 text-xs font-black uppercase text-foreground disabled:opacity-50"
              >
                Repartir horas
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2 custom-scrollbar">
            {visitStops.map((stop, index) => {
              const slot = slots[index];
              const opp = opportunities.find((row) => row.twentyId === stop.twentyId);
              const fairRow = opp ? fairDurationForOpportunity(fairServiceTypeDurations, opp) : undefined;
              return (
                <div
                  key={stop.twentyId}
                  className="rounded-lg border border-border bg-card p-2.5 shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink text-xs font-black text-neon">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="truncate text-xs font-black text-foreground">{stop.title}</p>
                      <p className="flex items-center gap-0.5 truncate text-xs text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5 shrink-0" aria-hidden />
                        {stop.client}
                      </p>
                      {fairRow ? (
                        <p className="mt-0.5 text-xs font-medium text-info-fg">
                          {fairRow.serviceLabel} · tempo médio{" "}
                          <span className="ds-num font-black">{fairRow.formattedRecommended}</span>
                        </p>
                      ) : fairBenchmarksReady && opp ? (
                        <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                          Tempo médio indisponível para este tipo (histórico insuficiente).
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <label className="space-y-1">
                        <span className="block text-xs font-black uppercase text-muted-foreground">
                          Início
                        </span>
                        <input
                          type="time"
                          aria-label={`Hora de início da paragem ${index + 1}`}
                          value={slot?.time || "09:00"}
                          onChange={(e) => updateStopTime(stop.twentyId, e.target.value)}
                          className="min-h-12 rounded-lg border border-border bg-muted px-2 text-sm font-bold text-foreground focus:border-primary focus:outline-none"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="block text-xs font-black uppercase text-muted-foreground">
                          Fim
                        </span>
                        <input
                          type="time"
                          aria-label={`Hora de fim da paragem ${index + 1}`}
                          value={slot?.endTime || ""}
                          onChange={(e) => updateStopEndTime(stop.twentyId, e.target.value)}
                          className="min-h-12 rounded-lg border border-border bg-muted px-2 text-sm font-bold text-foreground focus:border-primary focus:outline-none"
                        />
                      </label>
                    </div>
                  </div>
                  {slot?.invalidEnd ? (
                    <p className="mt-2 text-xs font-medium text-warning-fg">
                      Hora de fim inválida para esta paragem — ao agendar fica só o bloco de 1 hora.
                    </p>
                  ) : null}
                  {routeNote ? (
                    <p className="mt-2 line-clamp-2 rounded-lg border border-border bg-muted px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      <span className="font-black uppercase tracking-wide text-foreground">Nota da rota · </span>
                      {routeNote}
                    </p>
                  ) : null}
                  <input
                    type="text"
                    value={massScheduleForm.stopNotes[stop.twentyId] || ""}
                    onChange={(e) => updateStopNote(stop.twentyId, e.target.value)}
                    aria-label={`Nota só da paragem ${index + 1}`}
                    placeholder="Nota só desta paragem (opcional)"
                    className="mt-2 min-h-12 w-full rounded-lg border border-border bg-muted px-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
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
