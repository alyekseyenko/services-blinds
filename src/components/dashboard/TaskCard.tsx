"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Info, Phone, ChevronRight, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import NavigationChooser from "@/components/dashboard/NavigationChooser";
import { hapticLight } from "@/lib/haptics";
import { isOnboardingDemoEntity } from "@/lib/onboarding/demoMapPin";

interface TaskCardProps {
  task: any;
  setSelectedTask: (t: any) => void;
}

function TaskCard({ task, setSelectedTask }: TaskCardProps) {
  const handleHapticClick = () => {
    hapticLight(30);
    setSelectedTask(task);
  };

  const phones =
    task.clientPhones?.length > 0
      ? task.clientPhones
      : task.clientPhone
        ? [task.clientPhone]
        : [];
  const phone = phones[0]?.replace(/\s/g, "") || "";
  const extraPhoneCount = Math.max(phones.length - 1, 0);

  return (
    <Card
      variant="light"
      onClick={handleHapticClick}
      data-tour={isOnboardingDemoEntity(task) ? "tech-demo-task-card" : undefined}
      className="group cursor-pointer touch-manipulation rounded-2xl border-2 border-border-strong p-5 transition-all hover:border-primary active:scale-[0.99]"
    >
      <CardContent className="space-y-4 p-0">
        <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-border-strong bg-ink text-neon sm:h-16 sm:w-16">
              <span className="mb-0.5 text-xs font-black uppercase tracking-wider text-ink-foreground/80">
                Hora
              </span>
              <span className="ds-title ds-num text-lg leading-none text-neon sm:text-xl">
                {task.dueDate.toLocaleTimeString("pt-PT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                <p className="min-w-0 truncate text-xs font-black uppercase tracking-wider text-muted-foreground">
                  {task.client || "Cliente"}
                  {task.nsi && task.nsi !== "N/A" ? ` · NSI ${task.nsi}` : ""}
                </p>
              </div>
              <div className="flex min-w-0 items-start gap-2">
                <h3 className="ds-title line-clamp-2 min-w-0 flex-1 break-words text-base leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary-ink sm:text-lg">
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

          <div className="shrink-0 rounded-xl border-2 border-border-strong bg-muted p-2.5 transition-colors group-hover:bg-neon group-hover:text-neon-foreground">
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-neon-foreground" />
          </div>
        </div>

        <hr className="ticket-divider" aria-hidden />

        <div className="flex items-center gap-2.5 rounded-xl border-2 border-border-strong bg-muted p-3.5 text-sm font-semibold text-foreground">
          <MapPin className="h-5 w-5 shrink-0 text-primary-ink" />
          <span className="truncate">{task.address}</span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          {phone && (
            <a
              href={`tel:${phone}`}
              onClick={(e) => e.stopPropagation()}
              className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-border-strong bg-card transition-all hover:border-primary"
              aria-label="Ligar ao cliente"
            >
              <Phone className="h-6 w-6 text-primary-ink" strokeWidth={2} />
              {extraPhoneCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full border border-border-strong bg-ink px-1 text-xs font-black leading-5 text-ink-foreground">
                  +{extraPhoneCount}
                </span>
              )}
            </a>
          )}

          <NavigationChooser
            address={task.address || ""}
            coordinates={task.coordinates}
            label="Navegar"
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-border-strong bg-ink text-xs font-black uppercase tracking-wider text-ink-foreground transition-all hover:bg-ink/90"
          />

          <button
            type="button"
            onClick={handleHapticClick}
            className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-border-strong bg-primary px-5 text-xs font-black uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary-hover"
          >
            <Info className="h-5 w-5" strokeWidth={2} />
            <span>Abrir</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default React.memo(TaskCard);
