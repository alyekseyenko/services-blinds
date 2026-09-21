"use client";

import { useState } from "react";
import { List } from "lucide-react";
import CalendarSidebar from "@/components/admin/CalendarSidebar";
import { Sheet } from "@/components/ui/Sheet";
import { adminCalendarLocalizer, Calendar, type View } from "@/lib/admin/calendarLocalizer";
import { getServiceTypeColor } from "@/lib/techniciansConfig";
import type { Opportunity } from "@/types/admin";

import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = adminCalendarLocalizer;

export interface AdminCalendarViewProps {
  technicians: string[];
  selectedTechnician: string;
  setSelectedTechnician: (technician: string) => void;
  calendarOpportunities: Opportunity[];
  calendarDate: Date;
  setCalendarDate: (date: Date) => void;
  calendarView: View;
  setCalendarView: (view: View) => void;
  onSelectOpportunity: (opp: Opportunity) => void;
  onCancelAppointment: (opp: Opportunity) => Promise<void> | void;
}

export default function AdminCalendarView({
  technicians,
  selectedTechnician,
  setSelectedTechnician,
  calendarOpportunities,
  calendarDate,
  setCalendarDate,
  calendarView,
  setCalendarView,
  onSelectOpportunity,
  onCancelAppointment,
}: AdminCalendarViewProps) {
  const [showAgendaSheet, setShowAgendaSheet] = useState(false);

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white p-4">
        <select
          value={selectedTechnician}
          onChange={(e) => setSelectedTechnician(e.target.value)}
          className="min-h-12 flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todos os Técnicos</option>
          {technicians.map((tech) => (
            <option key={tech} value={tech}>
              {tech}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowAgendaSheet(true)}
          className="flex min-h-12 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-black uppercase tracking-wider text-slate-700 lg:hidden"
        >
          <List className="h-4 w-4 text-[#84cc16]" />
          Agenda ({calendarOpportunities.length})
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto">
          <Calendar
            localizer={localizer}
            events={calendarOpportunities}
            startAccessor="start"
            endAccessor="end"
            titleAccessor={(event: Opportunity) =>
              `${event.title} (${event.technician}) ${event.scheduledBy !== "N/A" ? `| Admin: ${event.scheduledBy}` : ""}`
            }
            min={new Date(0, 0, 0, 8, 0, 0)}
            max={new Date(0, 0, 0, 19, 0, 0)}
            style={{ height: "calc(100dvh - 280px)" }}
            onSelectEvent={(opp: Opportunity) => onSelectOpportunity(opp)}
            date={calendarDate}
            view={calendarView}
            onNavigate={(date: Date) => setCalendarDate(date)}
            onView={(v: View) => setCalendarView(v)}
            messages={{
              next: "Próximo",
              previous: "Anterior",
              today: "Hoje",
              month: "Mês",
              week: "Semana",
              day: "Dia",
              agenda: "Agenda",
            }}
            dayPropGetter={(date: Date) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              if (date < today) {
                return {
                  className: "bg-slate-50 opacity-60 pointer-events-none grayscale",
                };
              }
              return {};
            }}
            eventPropGetter={(event: Opportunity) => {
              const serviceType = Array.isArray(event.serviceType)
                ? event.serviceType[0]
                : event.serviceType;
              const colors = getServiceTypeColor(serviceType);
              return {
                style: {
                  backgroundColor: colors.bg,
                  color: colors.text,
                  borderLeft: `4px solid ${colors.pin}`,
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  padding: "2px 6px",
                },
              };
            }}
          />
        </div>
        <CalendarSidebar
          calendarOpportunities={calendarOpportunities}
          setSelectedOpportunity={onSelectOpportunity}
          handleCancelAppointment={onCancelAppointment}
        />
      </div>

      <Sheet
        open={showAgendaSheet}
        onClose={() => setShowAgendaSheet(false)}
        title="Agendamentos"
        description={`${calendarOpportunities.length} serviços no filtro atual`}
      >
        <CalendarSidebar
          embedded
          calendarOpportunities={calendarOpportunities}
          setSelectedOpportunity={(opp) => {
            onSelectOpportunity(opp);
            setShowAgendaSheet(false);
          }}
          handleCancelAppointment={onCancelAppointment}
        />
      </Sheet>
    </div>
  );
}
