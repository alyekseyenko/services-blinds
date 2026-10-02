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
          : "hidden w-64 shrink-0 overflow-y-auto border-l border-border bg-muted p-3 lg:block xl:w-72 xl:p-4"
      }
    >
      {!embedded && (
        <h3 className="mb-4 flex items-center gap-2 font-bold text-foreground">
          <CalendarIcon className="h-5 w-5 text-info-solid" />
          Agendamentos
        </h3>
      )}

      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">
              Nenhum serviço agendado para os filtros selecionados.
            </p>
          </div>
        ) : (
          sorted.map((opp) => (
            <div
              key={opp.id}
              className="group rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:border-info-border"
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
                  className="text-muted-foreground hover:text-danger-solid"
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
              <h4
                className="mb-1 line-clamp-2 cursor-pointer text-sm font-bold text-foreground"
                onClick={() => setSelectedOpportunity(opp)}
              >
                {opp.title}
              </h4>
              <p className="mb-2 truncate text-xs font-semibold text-muted-foreground">{opp.client}</p>
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-border" />
                  <span className="text-xs font-bold uppercase text-muted-foreground">
                    {opp.technician || "Sem técnico"}
                  </span>
                </div>
                {opp.scheduledBy && opp.scheduledBy !== "N/A" && (
                  <span className="text-xs font-medium italic text-muted-foreground">Por: {opp.scheduledBy}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
