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

export interface ScheduleForm {
  title: string;
  date: string;
  time: string;
  technicianId: string;
  urgent: boolean;
  notes: string;
  addressStreet1: string;
  addressStreet2: string;
  addressCity: string;
  addressState: string;
  addressPostcode: string;
  addressCountry: string;
  addressLat: number | null;
  addressLng: number | null;
}

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
}: ScheduleModalProps) {
  const isDesktopLg = useMediaMinWidth(1024);
  const conflict = useMemo(() => {
    if (!scheduleForm.date || !scheduleForm.technicianId || !scheduleForm.time) return null;

    const selectedTime = new Date(
      `${scheduleForm.date.replace(/-/g, "/")} ${scheduleForm.time}`
    ).getTime();

    return opportunities.find((opp) => {
      if (!opp.scheduledAt || opp.status === "Cancelado" || opp.status === "Concluído")
        return false;
      if (schedulingOpportunityId && opp.twentyId === schedulingOpportunityId) return false;

      const isSameTech =
        opp.technician === workspaceMembers.find((m) => m.id === scheduleForm.technicianId)?.name;
      if (!isSameTech) return false;

      const oppTime = new Date(opp.scheduledAt).getTime();
      const diffHours = Math.abs(selectedTime - oppTime) / (1000 * 60 * 60);
      return diffHours < 2;
    });
  }, [
    scheduleForm.date,
    scheduleForm.technicianId,
    scheduleForm.time,
    opportunities,
    workspaceMembers,
    schedulingOpportunityId,
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
      title="Agendar visita"
      description={
        isOnboardingDemoSchedule
          ? "Modo formação — preencha como num agendamento real; nada é enviado ao CRM."
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
            loadingText="A agendar..."
            onClick={handleScheduleVisit}
            className="min-w-[10rem] bg-primary text-primary-foreground hover:bg-primary-hover"
          >
            Agendar visita
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
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
                Hora
              </label>
              <input
                type="time"
                value={scheduleForm.time}
                onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                className={fieldClass}
              />
            </div>
          </div>

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

          {conflict?.scheduledAt && (
            <p className="flex gap-2 rounded-lg border border-warning-border bg-warning-surface px-2.5 py-2 text-xs font-medium text-warning-fg">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              <span>
                Sobreposição com «{conflict.title}» às{" "}
                {new Date(conflict.scheduledAt).toLocaleTimeString("pt-PT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                .
                {scheduleForm.urgent ? " Modo urgente: pode continuar." : ""}
              </span>
            </p>
          )}

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
                Permite sobreposição na agenda do técnico.
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
