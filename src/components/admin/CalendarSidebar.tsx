import React from "react";
import { Calendar as CalendarIcon, Clock, Trash2 } from "lucide-react";
import { Opportunity } from "@/types/admin";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/IconButton";

interface CalendarSidebarProps {
  calendarOpportunities: Opportunity[];
  setSelectedOpportunity: (opp: Opportunity) => void;
  handleCancelAppointment: (opp: Opportunity) => Promise<void> | void;
  embedded?: boolean;
}

export default function CalendarSidebar({
  calendarOpportunities,
  setSelectedOpportunity,
  handleCancelAppointment,
  embedded = false,
}: CalendarSidebarProps) {
  const sorted = [...calendarOpportunities].sort((a, b) => {
    const startA = a.start ? a.start.getTime() : 0;
    const startB = b.start ? b.start.getTime() : 0;
    return startA - startB;
  });

  return (
    <div
      className={
        embedded
          ? "p-4"
          : "hidden w-80 overflow-y-auto border-l border-slate-200 bg-slate-50 p-4 lg:block"
      }
    >
      {!embedded && (
        <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800">
          <CalendarIcon className="h-5 w-5 text-blue-600" />
          Agendamentos
        </h3>
      )}

      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Clock className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-xs font-medium text-slate-600">
              Nenhum serviço agendado para os filtros selecionados.
            </p>
          </div>
        ) : (
          sorted.map((opp) => (
            <div
              key={opp.id}
              className="group rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-blue-300"
            >
              <div className="mb-2 flex items-start justify-between">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="info">
                    {opp.start
                      ? opp.start.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </Badge>
                  {opp.nsi && <Badge variant="muted">#{opp.nsi}</Badge>}
                </div>
                <IconButton
                  aria-label="Cancelar agendamento"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelAppointment(opp);
                  }}
                  className="text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
              <h4
                className="mb-1 line-clamp-2 cursor-pointer text-sm font-bold text-slate-800"
                onClick={() => setSelectedOpportunity(opp)}
              >
                {opp.title}
              </h4>
              <p className="mb-2 truncate text-xs font-semibold text-slate-600">{opp.client}</p>
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-50 pt-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-slate-300" />
                  <span className="text-xs font-bold uppercase text-slate-600">
                    {opp.technician || "Sem técnico"}
                  </span>
                </div>
                {opp.scheduledBy && opp.scheduledBy !== "N/A" && (
                  <span className="text-xs font-medium italic text-slate-500">Por: {opp.scheduledBy}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
