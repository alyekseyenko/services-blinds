import React, { useMemo } from "react";
import { Calendar as CalendarIcon, Clock, AlertCircle } from "lucide-react";
import { WorkspaceMember, Opportunity } from "@/types/admin";
import type { OptimizedRouteStop } from "@/lib/admin/routeOptimization";
import { computeRouteSlots, findScheduleConflicts } from "@/lib/admin/routeScheduleSlots";
import {
  ADMIN_SCHEDULE_HOURS_LABEL,
  validateRouteSlotsBusinessHours,
} from "@/lib/admin/schedulingHours";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/button";

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

  const routeHoursError = useMemo(
    () => validateRouteSlotsBusinessHours(slots),
    [slots]
  );

  const updateStopNote = (twentyId: string, value: string) => {
    setMassScheduleForm({
      ...massScheduleForm,
      stopNotes: {
        ...massScheduleForm.stopNotes,
        [twentyId]: value,
      },
    });
  };

  return (
    <Dialog
      open={showMassScheduleModal}
      onClose={() => setShowMassScheduleModal(false)}
      title="Schedule Full Route"
      description={`Schedule ${visitStops.length} services with the same flow as single visits.`}
      className="max-w-2xl"
    >
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-blue-50 p-4 text-blue-800">
        <div className="rounded-xl bg-blue-100 p-2">
          <CalendarIcon className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold">
          {massScheduleForm.urgent
            ? "Cada paragem cria a visita já em AGENDADO no CRM, sem notificar o cliente nem disparar automações n8n."
            : "Cada paragem cria tarefa no CRM, nota de agendamento e notificação ao cliente com pedido de confirmação."}
        </p>
      </div>

      <div className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700">
              Assigned Technician
            </label>
            <select
              value={massScheduleForm.technicianId}
              onChange={(e) =>
                setMassScheduleForm({ ...massScheduleForm, technicianId: e.target.value })
              }
              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="">Select technician...</option>
              {workspaceMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700">
              Route Date
            </label>
            <input
              type="date"
              min={new Date().toISOString().split("T")[0]}
              value={massScheduleForm.date}
              onChange={(e) =>
                setMassScheduleForm({ ...massScheduleForm, date: e.target.value })
              }
              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700">
            Shared Team Instructions
          </label>
          <textarea
            value={massScheduleForm.globalNotes}
            onChange={(e) =>
              setMassScheduleForm({ ...massScheduleForm, globalNotes: e.target.value })
            }
            placeholder="Access codes, parking notes, or instructions sent to every client on this route..."
            className="h-24 w-full resize-none rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
          />
        </div>

        {routeHoursError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
            <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-red-900">
              <AlertCircle className="h-4 w-4" />
              Horário não permitido
            </div>
            {routeHoursError}
            <p className="mt-2 text-red-700">
              Reduza paragens ou escolha outro dia. Janela: {ADMIN_SCHEDULE_HOURS_LABEL}.
            </p>
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-800">
              <AlertCircle className="h-4 w-4" />
              {massScheduleForm.urgent ? "Sobreposição (pode continuar)" : "Conflitos de agenda"}
            </div>
            <div className="space-y-2 text-xs font-medium text-amber-800">
              {conflicts.slice(0, 3).map((conflict, index) => (
                <p key={`${conflict.stopTitle}-${index}`}>
                  «{conflict.stopTitle}» sobrepõe-se a «{conflict.conflictingTitle}» às{" "}
                  {conflict.conflictingTime.toLocaleTimeString("pt-PT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  .
                </p>
              ))}
              {massScheduleForm.urgent && (
                <p className="pt-1 font-semibold text-amber-900">
                  No modo urgente pode agendar na mesma; confirme no diálogo seguinte.
                </p>
              )}
            </div>
          </div>
        )}

        <label
          className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
            massScheduleForm.urgent
              ? "border-amber-300 bg-amber-50"
              : "border-slate-200 bg-slate-50"
          }`}
        >
          <input
            type="checkbox"
            checked={massScheduleForm.urgent}
            onChange={(e) =>
              setMassScheduleForm({ ...massScheduleForm, urgent: e.target.checked })
            }
            className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 accent-amber-600"
          />
          <span className="text-sm font-semibold text-slate-800">
            <span className="block text-xs font-black uppercase tracking-wide text-amber-900">
              Agendamento urgente — ignorar confirmação do cliente
            </span>
            <span className="mt-1 block text-xs font-medium leading-snug text-slate-600">
              Marca todas as visitas como agendadas de imediato. O cliente não recebe pedido de
              confirmação e nenhuma automação é executada.
            </span>
          </span>
        </label>

        <div className="rounded-2xl border border-slate-200 bg-slate-50">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
              <Clock className="h-4 w-4" />
              Route Stops Preview
            </div>
          </div>
          <div className="max-h-72 space-y-3 overflow-y-auto p-4">
            {visitStops.map((stop, index) => {
              const slot = slots[index];
              return (
                <div
                  key={stop.twentyId}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Stop #{index + 1}
                        {slot ? ` · ${slot.hourLabel}` : ""}
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-900">{stop.title}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{stop.client}</p>
                    </div>
                  </div>
                  <textarea
                    value={massScheduleForm.stopNotes[stop.twentyId] || ""}
                    onChange={(e) => updateStopNote(stop.twentyId, e.target.value)}
                    placeholder="Optional stop-specific instructions..."
                    className="mt-3 h-16 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => setShowMassScheduleModal(false)}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          disabled={
            isScheduling ||
            !massScheduleForm.date ||
            !massScheduleForm.technicianId ||
            isPastDate ||
            visitStops.length === 0 ||
            Boolean(routeHoursError) ||
            (conflicts.length > 0 && !massScheduleForm.urgent)
          }
          loading={isScheduling}
          loadingText={massScheduleForm.urgent ? "A agendar..." : "A enviar propostas..."}
          onClick={handleMassSchedule}
        >
          {massScheduleForm.urgent ? "Agendar rota imediatamente" : "Enviar propostas ao cliente"}
        </Button>
      </div>
    </Dialog>
  );
}
