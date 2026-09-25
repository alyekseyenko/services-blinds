import React, { useMemo } from 'react';
import { ChevronDown, Loader2, AlertCircle } from "lucide-react";
import { WorkspaceMember, Opportunity } from '@/types/admin';
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/button";
import {
  ADMIN_SCHEDULE_HOURS_LABEL,
  ADMIN_SCHEDULE_TIME_INPUT_MAX,
  ADMIN_SCHEDULE_TIME_INPUT_MIN,
  getAdminSchedulingHoursError,
  isAdminScheduleTimeStringValid,
} from "@/lib/admin/schedulingHours";

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
}

export default function ScheduleModal({
  showScheduleModal,
  setShowScheduleModal,
  scheduleForm,
  setScheduleForm,
  workspaceMembers,
  opportunities = [],
  schedulingOpportunityId,
  isScheduling,
  handleScheduleVisit
}: ScheduleModalProps) {
  const conflict = useMemo(() => {
    if (!scheduleForm.date || !scheduleForm.technicianId || !scheduleForm.time) return null;
    
    const selectedTime = new Date(`${scheduleForm.date.replace(/-/g, '/')} ${scheduleForm.time}`).getTime();
    
    return opportunities.find(opp => {
      if (!opp.scheduledAt || opp.status === 'Cancelado' || opp.status === 'Concluído') return false;
      if (schedulingOpportunityId && opp.twentyId === schedulingOpportunityId) return false;
      
      const isSameTech = opp.technician === workspaceMembers.find(m => m.id === scheduleForm.technicianId)?.name;
      if (!isSameTech) return false;

      const oppTime = new Date(opp.scheduledAt).getTime();
      const diffMs = Math.abs(selectedTime - oppTime);
      const diffHours = diffMs / (1000 * 60 * 60);
      
      return diffHours < 2; // Warning if within 2 hours
    });
  }, [scheduleForm.date, scheduleForm.technicianId, scheduleForm.time, opportunities, workspaceMembers, schedulingOpportunityId]);

  const selectedDateTime = scheduleForm.date && scheduleForm.time 
    ? new Date(`${scheduleForm.date.replace(/-/g, '/')} ${scheduleForm.time}`).getTime() 
    : 0;
  const isPastTime = selectedDateTime ? selectedDateTime < new Date().getTime() : false;

  const businessHoursError = useMemo(() => {
    if (!scheduleForm.date || !scheduleForm.time) return null;
    const [year, month, day] = scheduleForm.date.split("-").map(Number);
    const [hour, minute] = scheduleForm.time.split(":").map(Number);
    const dueAt = new Date(year, month - 1, day, hour, minute);
    return getAdminSchedulingHoursError(dueAt);
  }, [scheduleForm.date, scheduleForm.time]);

  const isOutsideBusinessHours =
    Boolean(businessHoursError) ||
    (scheduleForm.time ? !isAdminScheduleTimeStringValid(scheduleForm.time) : false);

  const cannotConfirm =
    isScheduling ||
    !scheduleForm.date ||
    !scheduleForm.technicianId ||
    isPastTime ||
    isOutsideBusinessHours;

  return (
    <Dialog
      open={showScheduleModal}
      onClose={() => setShowScheduleModal(false)}
      title="Agendar Visita"
      description="Configuração logística CRM"
      className="max-w-lg rounded-[2rem]"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
            Cancelar
          </Button>
          <Button
            disabled={cannotConfirm}
            loading={isScheduling}
            loadingText="A agendar..."
            onClick={handleScheduleVisit}
          >
            {scheduleForm.urgent ? "Agendar imediatamente" : "Confirmar visita"}
          </Button>
        </div>
      }
    >
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="px-1 text-xs font-black uppercase tracking-widest text-slate-600">Título do Serviço</label>
              <input
                type="text"
                value={scheduleForm.title}
                onChange={(e) => setScheduleForm({...scheduleForm, title: e.target.value})}
                className="w-full px-6 py-4.5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:border-emerald-500 focus:bg-white focus:outline-none text-slate-900 font-bold transition-all shadow-inner"
                placeholder="Ex: Instalação de Estores"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="px-1 text-xs font-black uppercase tracking-widest text-slate-600">Data Agendada</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm({...scheduleForm, date: e.target.value})}
                  className="w-full px-6 py-4.5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:border-emerald-500 focus:bg-white focus:outline-none text-slate-900 font-bold transition-all shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="px-1 text-xs font-black uppercase tracking-widest text-slate-600">Hora de Início</label>
                <input
                  type="time"
                  min={ADMIN_SCHEDULE_TIME_INPUT_MIN}
                  max={ADMIN_SCHEDULE_TIME_INPUT_MAX}
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm({...scheduleForm, time: e.target.value})}
                  className="w-full px-6 py-4.5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:border-emerald-500 focus:bg-white focus:outline-none text-slate-900 font-bold transition-all shadow-inner"
                />
                <p className="px-1 text-[10px] font-semibold text-slate-500">
                  Horário permitido: {ADMIN_SCHEDULE_HOURS_LABEL}
                </p>
                {isOutsideBusinessHours && scheduleForm.time && (
                  <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {businessHoursError ||
                      `O agendamento só é permitido entre ${ADMIN_SCHEDULE_HOURS_LABEL}.`}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="px-1 text-xs font-black uppercase tracking-widest text-slate-600">Técnico Responsável</label>
              <div className="relative">
                <select
                  value={scheduleForm.technicianId}
                  onChange={(e) => setScheduleForm({...scheduleForm, technicianId: e.target.value})}
                  className="w-full px-6 py-4.5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:border-emerald-500 focus:bg-white focus:outline-none text-slate-900 font-bold transition-all shadow-inner appearance-none"
                >
                  <option value="">Selecionar técnico...</option>
                  {workspaceMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 pointer-events-none" />
              </div>
              
              {conflict && conflict.scheduledAt && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight text-amber-800">
                      {scheduleForm.urgent ? "Sobreposição (pode continuar)" : "Aviso de Sobreposição"}
                    </p>
                    <p className="mt-1 text-xs font-medium leading-tight text-amber-700">
                      O técnico já tem o serviço <span className="font-bold">"{conflict.title}"</span> agendado para as <span className="font-bold">{new Date(conflict.scheduledAt).toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'})}</span>.
                      {scheduleForm.urgent && (
                        <span className="mt-1 block">
                          No modo urgente pode agendar na mesma; confirme no diálogo seguinte.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner">
              <h4 className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-600">Morada do Cliente</h4>
              <div className="space-y-5">
                <input
                  type="text"
                  value={scheduleForm.addressStreet1}
                  onChange={(e) => setScheduleForm({...scheduleForm, addressStreet1: e.target.value})}
                  className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-950 font-bold transition-all placeholder:text-slate-400"
                  placeholder="Rua e Número"
                />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <input
                    type="text"
                    value={scheduleForm.addressCity}
                    onChange={(e) => setScheduleForm({...scheduleForm, addressCity: e.target.value})}
                    className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-950 font-bold transition-all placeholder:text-slate-400"
                    placeholder="Cidade"
                  />
                  <input
                    type="text"
                    value={scheduleForm.addressPostcode}
                    onChange={(e) => setScheduleForm({...scheduleForm, addressPostcode: e.target.value})}
                    className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-950 font-bold transition-all placeholder:text-slate-400"
                    placeholder="Código Postal"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="px-1 text-xs font-black uppercase tracking-widest text-slate-600">Instruções para a Equipa</label>
              <textarea
                value={scheduleForm.notes}
                onChange={(e) => setScheduleForm({...scheduleForm, notes: e.target.value})}
                placeholder="Notas especiais, códigos de acesso, etc..."
                className="w-full px-6 py-4.5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:border-emerald-500 focus:bg-white focus:outline-none text-slate-900 font-bold transition-all h-28 resize-none shadow-inner"
              />
            </div>

            <label
              className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
                scheduleForm.urgent
                  ? "border-amber-300 bg-amber-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={scheduleForm.urgent}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, urgent: e.target.checked })
                }
                className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 accent-amber-600"
              />
              <span className="text-sm font-semibold text-slate-800">
                <span className="block text-xs font-black uppercase tracking-wide text-amber-900">
                  Agendamento urgente — ignorar confirmação do cliente
                </span>
                <span className="mt-1 block text-xs font-medium leading-snug text-slate-600">
                  Marca a visita como agendada de imediato. O cliente não recebe pedido de
                  confirmação e nenhuma automação é executada.
                </span>
              </span>
            </label>
          </div>
    </Dialog>
  );
}
