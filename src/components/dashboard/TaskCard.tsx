"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Info, Phone, ChevronRight } from "lucide-react";
import NavigationChooser from "@/components/dashboard/NavigationChooser";

interface TaskCardProps {
  task: any;
  setSelectedTask: (t: any) => void;
}

export default function TaskCard({ task, setSelectedTask }: TaskCardProps) {
  const handleHapticClick = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(30);
    }
    setSelectedTask(task);
  };

  const phone = task.clientPhone?.replace(/\s/g, "") || "";

  return (
    <Card
      onClick={handleHapticClick}
      className="group p-5 bg-white border border-slate-200 hover:border-[#84cc16] hover:shadow-[0_15px_35px_rgba(15,23,42,0.08)] transition-all cursor-pointer relative overflow-hidden rounded-[2rem] shadow-sm text-slate-900 active:scale-[0.99]"
    >
      <CardContent className="p-0 space-y-4">
        {/* Top: Hora e Informação Principal */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            {/* Bloco da Hora */}
            <div className="w-18 h-18 bg-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-900 border border-slate-200 group-hover:bg-[#090d16] group-hover:border-transparent group-hover:text-[#84cc16] transition-all duration-200 shrink-0">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 group-hover:text-[#84cc16]/90 mb-0.5">
                Hora
              </span>
              <span className="text-xl font-black leading-none">
                {task.dueDate.toLocaleTimeString("pt-PT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {/* Título & Estado */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#84cc16] animate-pulse shadow-[0_0_8px_#84cc16]"></div>
                <p className="text-xs font-black text-slate-600 uppercase tracking-wider">
                  {task.client || "Cliente"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-[#090d16] group-hover:text-[#84cc16] transition-colors uppercase tracking-tight leading-snug italic truncate">
                  {task.title}
                </h3>
                {task.isOverdue && (
                  <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-md shrink-0">
                    Atrasada
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Seta de Acesso */}
          <div className="bg-slate-100 p-2.5 rounded-xl group-hover:bg-[#84cc16] group-hover:text-[#090d16] transition-colors border border-slate-200 shrink-0">
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-[#090d16]" />
          </div>
        </div>

        {/* Morada com Alto Contraste */}
        <div className="flex items-center gap-2.5 text-slate-700 text-sm font-semibold bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          <MapPin className="w-4 h-4 text-[#84cc16] shrink-0" />
          <span className="truncate">{task.address}</span>
        </div>

        {/* Barra de Ações Rápidas de 1-Toque (Touch Target >= 48px) */}
        <div className="flex items-center gap-2 pt-1">
          {phone && (
            <a
              href={`tel:${phone}`}
              onClick={(e) => e.stopPropagation()}
              className="h-12 w-12 bg-white border border-slate-200 hover:border-[#84cc16] text-[#090d16] rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0"
              title="Ligar ao cliente"
            >
              <Phone className="w-5 h-5 text-[#84cc16]" />
            </a>
          )}

          <NavigationChooser
            address={task.address || ""}
            coordinates={task.coordinates}
            label="Navegar"
            className="flex-1 h-12 bg-slate-900 hover:bg-black active:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
          />

          {/* Botão Ver Detalhe / Concluir */}
          <button
            onClick={handleHapticClick}
            className="h-12 px-5 bg-[#84cc16] hover:bg-[#9ae62e] active:bg-[#76b813] text-[#090d16] rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm shadow-[#84cc16]/20 shrink-0"
          >
            <Info className="w-4 h-4" />
            <span>Abrir</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
