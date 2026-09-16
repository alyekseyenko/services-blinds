import React from 'react';
import { Calendar as CalendarIcon, Clock, Trash2 } from "lucide-react";
import { Opportunity } from '@/types/admin';

interface CalendarSidebarProps {
  calendarOpportunities: Opportunity[];
  setSelectedOpportunity: (opp: Opportunity) => void;
  handleCancelAppointment: (opp: Opportunity) => Promise<void> | void;
}

export default function CalendarSidebar({
  calendarOpportunities,
  setSelectedOpportunity,
  handleCancelAppointment
}: CalendarSidebarProps) {
  return (
    <div className="w-80 border-l border-slate-200 bg-slate-50 overflow-y-auto p-4 hidden lg:block">
      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
        <CalendarIcon className="w-5 h-5 text-blue-600" />
        Agendamentos
      </h3>
      
      <div className="space-y-3">
        {calendarOpportunities.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">Nenhum serviço agendado para os filtros selecionados.</p>
          </div>
        ) : (
          calendarOpportunities
            .sort((a, b) => {
              const startA = a.start ? a.start.getTime() : 0;
              const startB = b.start ? b.start.getTime() : 0;
              return startA - startB;
            })
            .map(opp => (
              <div key={opp.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-blue-300 transition-all group">
                <div className="flex justify-between items-start mb-2">
                   <div className="flex gap-2">
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">
                        {opp.start ? opp.start.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                      <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase">
                        #{opp.nsi}
                      </span>
                   </div>
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       handleCancelAppointment(opp);
                     }}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                    title="Cancelar Agendamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="text-xs font-bold text-slate-800 line-clamp-2 mb-1 cursor-pointer" onClick={() => setSelectedOpportunity(opp)}>
                  {opp.title}
                </h4>
                <p className="text-[10px] text-slate-500 truncate mb-2">{opp.client}</p>
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-50">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-300" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{opp.technician || 'Sem técnico'}</span>
                   </div>
                   {opp.scheduledBy && opp.scheduledBy !== 'N/A' && (
                     <span className="text-[8px] font-medium text-slate-300 italic">Por: {opp.scheduledBy}</span>
                   )}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
