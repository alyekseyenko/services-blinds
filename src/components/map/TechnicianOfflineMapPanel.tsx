"use client";

import { MapPin, Phone, WifiOff } from "lucide-react";
import NavigationChooser from "@/components/dashboard/NavigationChooser";

interface TechnicianOfflineMapPanelProps {
  tasks: Array<{
    id: string;
    title?: string;
    client?: string;
    address?: string;
    coordinates?: [number, number] | null;
    clientPhone?: string;
    clientPhones?: string[];
  }>;
  onTaskSelect: (task: unknown) => void;
}

export function TechnicianOfflineMapPanel({ tasks, onTaskSelect }: TechnicianOfflineMapPanelProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 pb-8 text-center">
        <WifiOff className="h-9 w-9 text-muted-foreground/50" aria-hidden />
        <p className="text-sm font-semibold text-foreground">Sem visitas neste dia</p>
        <p className="max-w-xs text-xs font-medium leading-relaxed text-muted-foreground">
          Mude o dia nas setas acima ou abra a vista Lista. O mapa Google só aparece com internet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-b from-muted/40 to-muted/60 p-4 pb-6">
      <p className="mb-3 text-center text-xs font-medium text-muted-foreground">
        Sem mapa offline — use GPS ou telefone em cada visita abaixo.
      </p>

      <ul className="custom-scrollbar flex-1 space-y-3 overflow-y-auto">
        {tasks.map((task) => {
          const phones =
            task.clientPhones?.length ? task.clientPhones : task.clientPhone ? [task.clientPhone] : [];
          const phone = phones[0]?.replace(/\s/g, "") || "";

          return (
            <li key={task.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <button
                type="button"
                onClick={() => onTaskSelect(task)}
                className="mb-3 w-full text-left"
              >
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  {task.client || "Cliente"}
                </p>
                <p className="ds-title text-sm tracking-tight text-foreground">
                  {task.title}
                </p>
              </button>
              {task.address && (
                <p className="mb-3 flex items-start gap-2 text-sm font-semibold text-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" aria-hidden />
                  <span>{task.address}</span>
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border bg-background px-4 text-xs font-black uppercase text-foreground"
                  >
                    <Phone className="h-4 w-4 text-primary-ink" aria-hidden />
                    Ligar
                  </a>
                )}
                {task.address && (
                  <NavigationChooser address={task.address} coordinates={task.coordinates} />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
