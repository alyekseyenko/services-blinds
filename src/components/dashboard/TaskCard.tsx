"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Info, Phone, ChevronRight, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import NavigationChooser from "@/components/dashboard/NavigationChooser";
import { hapticLight } from "@/lib/haptics";

interface TaskCardProps {
  task: any;
  setSelectedTask: (t: any) => void;
}

export default function TaskCard({ task, setSelectedTask }: TaskCardProps) {
  const handleHapticClick = () => {
    hapticLight(30);
    setSelectedTask(task);
  };

  const phone = task.clientPhone?.replace(/\s/g, "") || "";

  return (
    <Card
      variant="light"
      onClick={handleHapticClick}
      className="group cursor-pointer rounded-[2rem] border-slate-200 p-5 shadow-sm transition-all hover:border-[#84cc16] hover:shadow-[0_15px_35px_rgba(15,23,42,0.08)] active:scale-[0.99]"
    >
      <CardContent className="space-y-4 p-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-900 transition-all duration-200 group-hover:border-transparent group-hover:bg-[#090d16] group-hover:text-[#84cc16]">
              <span className="mb-0.5 text-xs font-black uppercase tracking-wider text-slate-600 group-hover:text-[#84cc16]/90">
                Hora
              </span>
              <span className="text-xl font-black leading-none">
                {task.dueDate.toLocaleTimeString("pt-PT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#84cc16] shadow-[0_0_8px_#84cc16]" />
                <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                  {task.client || "Cliente"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <h3 className="truncate text-lg font-black uppercase italic leading-snug tracking-tight text-[#090d16] transition-colors group-hover:text-[#84cc16]">
                  {task.title}
                </h3>
                {task.isOverdue && (
                  <Badge variant="warning" className="shrink-0">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Atrasada
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-100 p-2.5 transition-colors group-hover:bg-[#84cc16] group-hover:text-[#090d16]">
            <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-[#090d16]" />
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-sm font-semibold text-slate-700">
          <MapPin className="h-5 w-5 shrink-0 text-[#84cc16]" />
          <span className="truncate">{task.address}</span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          {phone && (
            <a
              href={`tel:${phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#090d16] shadow-sm transition-all hover:border-[#84cc16]"
              aria-label="Ligar ao cliente"
            >
              <Phone className="h-6 w-6 text-[#84cc16]" strokeWidth={2} />
            </a>
          )}

          <NavigationChooser
            address={task.address || ""}
            coordinates={task.coordinates}
            label="Navegar"
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 text-xs font-black uppercase tracking-wider text-white shadow-sm transition-all hover:bg-black active:bg-slate-800"
          />

          <button
            type="button"
            onClick={handleHapticClick}
            className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#84cc16] px-5 text-xs font-black uppercase tracking-wider text-[#090d16] shadow-sm shadow-[#84cc16]/20 transition-all hover:bg-[#9ae62e] active:bg-[#76b813]"
          >
            <Info className="h-5 w-5" strokeWidth={2} />
            <span>Abrir</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
