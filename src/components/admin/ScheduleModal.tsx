import React, { useMemo } from "react";
import { useMediaMinWidth } from "@/hooks/useMediaMinWidth";
import { ChevronDown, AlertCircle, Calendar, Clock, User, MapPin } from "lucide-react";
import { WorkspaceMember, Opportunity } from "@/types/admin";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/button";
import {
  ADMIN_SCHEDULE_HOURS_LABEL,
  getAdminSchedulingHoursWarning,
  isAdminScheduleTimeStringValid,
} from "@/lib/admin/schedulingHours";
import { cn } from "@/lib/cn";
import type { ScheduleForm } from "@/lib/admin/scheduleForm";
import {
  dueAtFromScheduleDateAndTime,
  findScheduleConflicts,
} from "@/lib/admin/routeScheduleSlots";
import {
  isScheduleEndAfterStart,
  resolveCalendarEventEnd,
  SCHEDULE_DAY_PRESETS,
  type ScheduleDayPresetKey,
} from "@/lib/visits/calendarVisitSpan";
import type { FairServiceTypeDuration } from "@/lib/schemas/ceoMetrics";
import { fairDurationForOpportunity } from "@/lib/admin/fairDurationDisplay";
import { FairOnSiteDurationHelpButton } from "@/components/admin/FairOnSiteDurationHelpButton";
import { TeamMemberPicker } from "@/components/admin/TeamMemberPicker";
import { ScheduleConflictAlert } from "@/components/admin/ScheduleConflictAlert";

export type { ScheduleForm } from "@/lib/admin/scheduleForm";

interface ScheduleModalProps {
  showScheduleModal: boolean;
  setShowScheduleModal: (show: boolean) => void;
  scheduleForm: ScheduleForm;
  setScheduleForm: (form: ScheduleForm) => void;
  workspaceMembers: WorkspaceMember[];
  opportunities?: Opportunity[];
  schedulingOpportunityId?: string;
  isScheduling: boolean;
  handleScheduleVisit: () => Promise<void> | void;
  isOnboardingDemoSchedule?: boolean;
  isRescheduleMode?: boolean;
  fairServiceTypeDurations?: FairServiceTypeDuration[];
  fairBenchmarksReady?: boolean;
}

const fieldClass =
  "w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm font-bold text-foreground transition-all focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20";

const labelClass = "text-xs font-black uppercase tracking-widest text-muted-foreground";

export default function ScheduleModal({
  showScheduleModal,
  setShowScheduleModal,
  scheduleForm,
  setScheduleForm,
  workspaceMembers,
  opportunities = [],
  schedulingOpportunityId,
  isScheduling,
  handleScheduleVisit,
  isOnboardingDemoSchedule = false,
  isRescheduleMode = false,
  fairServiceTypeDurations = [],
  fairBenchmarksReady = false,
}: ScheduleModalProps) {
  const isDesktopLg = useMediaMinWidth(1024);
  const scheduleConflicts = useMemo(() => {
    if (!scheduleForm.date || !scheduleForm.technicianId || !scheduleForm.time) return [];
    const dueAt = dueAtFromScheduleDateAndTime(scheduleForm.date, scheduleForm.time);
    if (!dueAt) return [];
    const endTime = scheduleForm.endTime?.trim();
    const proposedEnd = endTime
      ? dueAtFromScheduleDateAndTime(scheduleForm.date, endTime)
      : null;
    const endAt = resolveCalendarEventEnd(
      dueAt,
      proposedEnd && isScheduleEndAfterStart(dueAt, proposedEnd) ? proposedEnd : null
    );
    const technicianName =
      workspaceMembers.find((member) => member.id === scheduleForm.technicianId)?.name || "";
    return findScheduleConflicts(
      [{ title: scheduleForm.title, dueAt, endAt, opportunityId: schedulingOpportunityId }],
      opportunities,
      technicianName,
      {
        excludeOpportunityIds: schedulingOpportunityId ? [schedulingOpportunityId] : [],
        technicianId: scheduleForm.technicianId,
        assistantTechnicianIds: scheduleForm.assistantTechnicianIds,
        assistantTechnicianNames: scheduleForm.assistantTechnicianNames,
      }
    );
  }, [
    scheduleForm.date,
    scheduleForm.technicianId,
    scheduleForm.assistantTechnicianIds,
    scheduleForm.assistantTechnicianNames,
    scheduleForm.time,
    scheduleForm.endTime,
    scheduleForm.title,
    opportunities,
    workspaceMembers,
    schedulingOpportunityId,
  ]);

  const schedulingOpportunity = useMemo(
    () =>
      schedulingOpportunityId
        ? opportunities.find((row) => row.twentyId === schedulingOpportunityId)
        : undefined,
    [opportunities, schedulingOpportunityId]
  );

  const fairTypeDuration = useMemo(() => {
    if (!fairBenchmarksReady) return undefined;
    const input = schedulingOpportunity ?? {
      title: scheduleForm.title,
      serviceType: undefined,
      stage: undefined,
    };
    const isTeam = scheduleForm.assistantTechnicianIds.length > 0;
    return fairDurationForOpportunity(fairServiceTypeDurations, input, { isTeam });
  }, [
    fairBenchmarksReady,
    fairServiceTypeDurations,
    schedulingOpportunity,
    scheduleForm.title,
    scheduleForm.assistantTechnicianIds.length,
  ]);

  const selectedDateTime =
    scheduleForm.date && scheduleForm.time
      ? new Date(`${scheduleForm.date.replace(/-/g, "/")} ${scheduleForm.time}`).getTime()
      : 0;
  const isPastTime = selectedDateTime ? selectedDateTime < Date.now() : false;

  const businessHoursWarning = useMemo(() => {
    if (!scheduleForm.date || !scheduleForm.time) return null;
    const [year, month, day] = scheduleForm.date.split("-").map(Number);
    const [hour, minute] = scheduleForm.time.split(":").map(Number);
    return getAdminSchedulingHoursWarning(new Date(year, month - 1, day, hour, minute));
  }, [scheduleForm.date, scheduleForm.time]);

  const isInvalidTime = scheduleForm.time ? !isAdminScheduleTimeStringValid(scheduleForm.time) : false;

  const visitStart = useMemo(() => {
    if (!scheduleForm.date || !scheduleForm.time) return null;
    return dueAtFromScheduleDateAndTime(scheduleForm.date, scheduleForm.time);
  }, [scheduleForm.date, scheduleForm.time]);

  const visitEnd = useMemo(() => {
    const endTime = scheduleForm.endTime?.trim();
    if (!scheduleForm.date || !endTime) return null;
    return dueAtFromScheduleDateAndTime(scheduleForm.date, endTime);
  }, [scheduleForm.date, scheduleForm.endTime]);

  const invalidEndTime = Boolean(
    scheduleForm.endTime?.trim() &&
      visitStart &&
      visitEnd &&
      !isScheduleEndAfterStart(visitStart, visitEnd)
  );

  const applyPreset = (key: ScheduleDayPresetKey) => {
    const preset = SCHEDULE_DAY_PRESETS[key];
    setScheduleForm({
      ...scheduleForm,
      time: preset.start,
      endTime: preset.end,
    });
  };

  const cannotConfirm =
    isScheduling ||
    !scheduleForm.date ||
    !scheduleForm.technicianId ||
    isPastTime ||
    isInvalidTime;

  return (
    <Dialog
      open={showScheduleModal}
      onClose={() => setShowScheduleModal(false)}
      size="wide"
      scrollBody={!isDesktopLg}
      panelDataTour="admin-schedule-modal"
      title={isRescheduleMode ? "Reagendar / Trocar técnico" : "Agendar visita"}
      description={
        isOnboardingDemoSchedule
          ? "Modo formação — preencha como num agendamento real; nada é enviado ao CRM."
          : isRescheduleMode
            ? "Actualiza hora e técnico na mesma tarefa do CRM, sem cancelar a visita."
            : "Visita confirmada no CRM de imediato (sem confirmação ao cliente)."
      }
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3" data-tour="admin-schedule-submit">
          <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
            Cancelar
          </Button>
          <Button
            disabled={cannotConfirm}
            loading={isScheduling}
            loadingText={isRescheduleMode ? "A guardar..." : "A agendar..."}
            onClick={handleScheduleVisit}
            className="min-w-[10rem] bg-primary text-primary-foreground hover:bg-primary-hover"
          >
            {isRescheduleMode ? "Guardar alterações" : "Agendar visita"}
          </Button>
        </div>
      }
    >
      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-2 lg:gap-6">
        <section className="space-y-4" data-tour="admin-schedule-title-datetime">
          <p className="text-xs font-semibold text-muted-foreground lg:hidden">
            Data, técnico e prioridade
          </p>

          <div className="space-y-1.5">
            <label className={labelClass}>Título do serviço</label>
            <input
              type="text"
              value={scheduleForm.title}
              onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
              className={fieldClass}
              placeholder="Ex.: Instalação de estores"
            />
          </div>

          {fairBenchmarksReady ? (
            <p className="flex items-center gap-2 rounded-lg border border-info-border bg-info-surface px-2.5 py-2 text-xs font-medium text-info-fg">
              <Clock className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">
                {fairTypeDuration ? (
                  <>
                    {fairTypeDuration.serviceLabel} · tempo médio na equipa:{" "}
                    <span className="ds-num font-black text-foreground">
                      {fairTypeDuration.formattedRecommended}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    Tempo médio indisponível para este tipo (menos de 5 visitas concluídas com tempo
                    registado na app).
                  </span>
                )}
              </span>
              <FairOnSiteDurationHelpButton compact />
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-1">
              <label className={cn(labelClass, "flex items-center gap-1")}>
                <Calendar className="h-3 w-3" aria-hidden />
                Data
              </label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={scheduleForm.date}
                onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={cn(labelClass, "flex items-center gap-1")}>
                <Clock className="h-3 w-3" aria-hidden />
                Hora de início
              </label>
              <input
                type="time"
                value={scheduleForm.time}
                onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={cn(labelClass, "flex items-center gap-1")}>
                <Clock className="h-3 w-3" aria-hidden />
                Hora de fim
                <span className="font-medium normal-case tracking-normal text-muted-foreground">
                  (opcional)
                </span>
              </label>
              <input
                type="time"
                value={scheduleForm.endTime}
                onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(SCHEDULE_DAY_PRESETS) as ScheduleDayPresetKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className="min-h-12 rounded-lg border border-border bg-muted px-3 text-xs font-black uppercase text-foreground transition-colors hover:border-primary hover:bg-card"
              >
                {SCHEDULE_DAY_PRESETS[key].label}
              </button>
            ))}
          </div>

          {invalidEndTime && (
            <p className="rounded-lg border border-warning-border bg-warning-surface px-2.5 py-2 text-xs font-semibold text-warning-fg">
              A hora de fim tem de ser posterior ao início, no mesmo dia. Ao confirmar, o
              calendário mantém o bloco de 1 hora.
            </p>
          )}

          {(isInvalidTime || businessHoursWarning) && scheduleForm.time && (
            <p
              className={cn(
                "rounded-lg px-2.5 py-2 text-xs font-semibold",
                isInvalidTime
                  ? "border border-danger-border bg-danger-surface text-danger-fg"
                  : "border border-warning-border bg-warning-surface text-warning-fg"
              )}
            >
              {isInvalidTime
                ? "Hora inválida (HH:MM)."
                : `${businessHoursWarning} Confirmação ao agendar.`}
            </p>
          )}
          {!isInvalidTime && !businessHoursWarning && scheduleForm.time && (
            <p className="text-xs font-medium text-muted-foreground">
              Horário habitual: {ADMIN_SCHEDULE_HOURS_LABEL}
            </p>
          )}

          <div className="space-y-1.5" data-tour="admin-schedule-technician">
            <label className={cn(labelClass, "flex items-center gap-1")}>
              <User className="h-3 w-3" aria-hidden />
              Técnico
            </label>
            <div className="relative">
              <select
                value={scheduleForm.technicianId}
                onChange={(e) => setScheduleForm({ ...scheduleForm, technicianId: e.target.value })}
                className={cn(fieldClass, "appearance-none pr-9")}
              >
                <option value="">Selecionar...</option>
                {workspaceMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
            </div>
          </div>

          {scheduleForm.technicianId ? (
            <TeamMemberPicker
              members={workspaceMembers}
              masterId={scheduleForm.technicianId}
              assistantIds={scheduleForm.assistantTechnicianIds}
              assistantNames={scheduleForm.assistantTechnicianNames}
              conflictMemberIds={scheduleConflicts.map((c) => c.memberId)}
              onChange={(assistantTechnicianIds, assistantTechnicianNames) =>
                setScheduleForm({
                  ...scheduleForm,
                  assistantTechnicianIds,
                  assistantTechnicianNames,
                })
              }
            />
          ) : null}

          <ScheduleConflictAlert conflicts={scheduleConflicts} />

          <label
            data-tour="admin-schedule-urgent"
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5",
              scheduleForm.urgent ? "border-warning-border bg-warning-surface" : "border-border bg-muted"
            )}
          >
            <input
              type="checkbox"
              checked={scheduleForm.urgent}
              onChange={(e) => setScheduleForm({ ...scheduleForm, urgent: e.target.checked })}
              className="h-4 w-4 rounded accent-amber-600"
            />
            <span className="text-xs font-semibold text-foreground">
              <span className="font-black uppercase tracking-wide text-warning-fg">Urgente</span>
              <span className="mt-0.5 block font-medium text-muted-foreground">
                A visita fica marcada como prioritária.
              </span>
            </span>
          </label>
        </section>

        <section className="flex min-h-0 flex-col gap-4 lg:border-l lg:border-border lg:pl-6">
          <p className="text-xs font-semibold text-muted-foreground">Morada e notas</p>

          <div className="space-y-3 rounded-xl border border-border bg-muted/60 p-3" data-tour="admin-schedule-address">
            <h4 className={cn(labelClass, "flex items-center gap-1 text-muted-foreground")}>
              <MapPin className="h-3.5 w-3.5 text-neon" aria-hidden />
              Morada
            </h4>
            <input
              type="text"
              value={scheduleForm.addressStreet1}
              onChange={(e) => setScheduleForm({ ...scheduleForm, addressStreet1: e.target.value })}
              className={cn(fieldClass, "bg-card")}
              placeholder="Rua e número"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={scheduleForm.addressCity}
                onChange={(e) => setScheduleForm({ ...scheduleForm, addressCity: e.target.value })}
                className={cn(fieldClass, "bg-card")}
                placeholder="Cidade"
              />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                value={scheduleForm.addressPostcode}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, addressPostcode: e.target.value })
                }
                className={cn(fieldClass, "bg-card")}
                placeholder="Cód. postal"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-1.5" data-tour="admin-schedule-notes">
            <label className={labelClass}>Instruções para a equipa</label>
            <textarea
              value={scheduleForm.notes}
              onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
              placeholder="Acesso, estacionamento, etc."
              className={cn(fieldClass, "min-h-[7rem] flex-1 resize-none font-medium lg:min-h-[10rem]")}
            />
          </div>
        </section>
      </div>
    </Dialog>
  );
}
