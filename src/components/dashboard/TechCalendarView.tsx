"use client";

import React from "react";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { pt } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { getServiceTypeColor } from "@/lib/techniciansConfig";

const BigCalendar = Calendar as React.ComponentType<Record<string, unknown>>;

const locales = { "pt-PT": pt };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

interface TechCalendarViewProps {
  tasks: Array<Record<string, unknown> & { dueDate: Date; title: string; serviceType?: unknown; stage?: unknown }>;
  calendarDate: Date;
  calendarView: View;
  onNavigate: (date: Date) => void;
  onViewChange: (view: View) => void;
  onSelectEvent: (task: unknown) => void;
  scrollRef?: (node: HTMLDivElement | null) => void;
}

export default function TechCalendarView({
  tasks,
  calendarDate,
  calendarView,
  onNavigate,
  onViewChange,
  onSelectEvent,
  scrollRef,
}: TechCalendarViewProps) {
  return (
    <div
      ref={scrollRef}
      data-tour="tech-calendar"
      className="flex h-full min-h-0 flex-col overflow-hidden overscroll-contain bg-background p-4 pb-8 custom-scrollbar touch-manipulation md:p-6"
    >
      <div className="tech-calendar-shell mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col rounded-2xl border-2 border-border-strong bg-card p-4 md:p-6">
        <BigCalendar
          localizer={localizer}
          events={tasks}
          startAccessor="dueDate"
          endAccessor="dueDate"
          titleAccessor="title"
          step={30}
          timeslots={2}
          min={new Date(0, 0, 0, 8, 0, 0)}
          max={new Date(0, 0, 0, 19, 0, 0)}
          className="text-foreground"
          style={{ height: "100%", minHeight: 360, flex: 1 }}
          onSelectEvent={onSelectEvent}
          date={calendarDate}
          view={calendarView}
          onNavigate={onNavigate}
          onView={onViewChange}
          messages={{
            next: "Próximo",
            previous: "Anterior",
            today: "Hoje",
            month: "Mês",
            week: "Semana",
            day: "Dia",
            agenda: "Agenda",
          }}
          eventPropGetter={(event: { serviceType?: unknown; stage?: unknown }) => {
            const raw = event.serviceType ?? event.stage;
            const tipo = Array.isArray(raw) ? raw[0] : raw;
            const colors = getServiceTypeColor(tipo as string | undefined);
            return {
              style: {
                backgroundColor: colors.bg,
                color: colors.text,
                borderLeft: `4px solid ${colors.pin}`,
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "900",
                padding: "4px 8px",
                border: "none",
              },
            };
          }}
        />
      </div>
    </div>
  );
}
