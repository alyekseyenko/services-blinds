"use client";
import React, { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Info, Phone, ChevronRight, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import NavigationChooser from "@/components/dashboard/NavigationChooser";
import { hapticLight } from "@/lib/haptics";
import { isOnboardingDemoEntity } from "@/lib/demo/demoIds";
import { isUrgentVisitMarkdown } from "@/lib/crm/urgentSchedulingUi";
import { formatTeamSummaryPt } from "@/lib/visits/team";

interface TaskCardProps {
  task: any;
  setSelectedTask: (t: any) => void;
}

function TaskCard({ task, setSelectedTask }: TaskCardProps) {
  const handleHapticClick = useCallback(() => {
    hapticLight(30);
    setSelectedTask(task);
  }, [setSelectedTask, task]);

  const phones =
    task.clientPhones?.length > 0
      ? task.clientPhones
      : task.clientPhone
        ? [task.clientPhone]
        : [];
  const phone = phones[0]?.replace(/\s/g, "") || "";
  const extraPhoneCount = Math.max(phones.length - 1, 0);

  const urgent = isUrgentVisitMarkdown(task.report);
  const visitTime = task.dueDate.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const clientName = task.client || "Cliente";
  const visitTitle = task.title || "Visita";
  const openVisitLabel = `Abrir visita: ${clientName}, ${visitTime}, ${visitTitle}`;

  const phoneAriaLabel =
    extraPhoneCount > 0
      ? `Ligar ao cliente; mais ${extraPhoneCount} número${extraPhoneCount > 1 ? "s" : ""} de contacto`
      : "Ligar ao cliente";

  const handleOpenKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleHapticClick();
    }
  };

  return (
    <Card
      variant="light"
      data-tour={isOnboardingDemoEntity(task) ? "tech-demo-task-card" : undefined}
      className={`group touch-manipulation rounded-2xl border-2 p-5 transition-all hover:border-primary ${
        urgent ? "border-danger-solid bg-danger-surface" : "border-border-strong"
      }`}
    >
      <CardContent className="space-y-4 p-0">
        <div
          role="button"
          tabIndex={0}
          onClick={handleHapticClick}
          onKeyDown={handleOpenKeyDown}
          aria-label={openVisitLabel}
          className="cursor-pointer space-y-4 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-[0.99] transition-transform"
        >
          <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-border-strong bg-ink text-neon sm:h-16 sm:w-16">
                <span className="mb-0.5 text-xs font-black uppercase tracking-wider text-ink-foreground/80">
                  Hora
                </span>
                <span className="ds-title ds-num text-lg leading-none text-neon sm:text-xl">
                  {visitTime}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-base font-bold leading-snug text-foreground">
                  {clientName}
                  {task.serviceNumber ? (
                    <span className="ds-num font-semibold text-muted-foreground">
                      {" "}
                      · N.º {task.serviceNumber}
                    </span>
                  ) : null}
                  {task.nsi && task.nsi !== "N/A" ? (
                    <span className="ds-num font-semibold text-muted-foreground"> · NSI {task.nsi}</span>
                  ) : null}
                </p>
                {(task.teamSize ?? 1) > 1 ? (
                  <p className="text-xs font-bold text-muted-foreground">
                    {formatTeamSummaryPt(task.technicianName || "Técnico", (task.teamSize ?? 1) - 1)}
                  </p>
                ) : null}
                <div className="flex min-w-0 items-start gap-2">
                  <h3 className="line-clamp-2 min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-muted-foreground">
                    {visitTitle}
                  </h3>
                  {urgent && (
                    <Badge variant="error" className="shrink-0">
                      <AlertTriangle className="mr-1 h-3 w-3" aria-hidden />
                      Urgente
                    </Badge>
                  )}
                  {task.isOverdue && (
                    <Badge variant="warning" className="shrink-0">
                      <AlertTriangle className="mr-1 h-3 w-3" aria-hidden />
                      Atrasada
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 rounded-xl border-2 border-border-strong bg-muted p-2.5 transition-colors group-hover:bg-neon group-hover:text-neon-foreground">
              <ChevronRight
                className="h-5 w-5 text-muted-foreground group-hover:text-neon-foreground"
                aria-hidden
              />
            </div>
          </div>

          <hr className="ticket-divider" aria-hidden />

          <div className="flex items-start gap-2.5 rounded-xl border-2 border-border-strong bg-muted p-3.5 text-sm font-semibold text-foreground">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary-ink" aria-hidden />
            <span className="line-clamp-3 min-w-0 leading-snug">{task.address}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          {phone && (
            <a
              href={`tel:${phone}`}
              onClick={(e) => e.stopPropagation()}
              className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-border-strong bg-card transition-all hover:border-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              aria-label={phoneAriaLabel}
            >
              <Phone className="h-6 w-6 text-primary-ink" strokeWidth={2} aria-hidden />
              {extraPhoneCount > 0 ? (
                <span
                  className="absolute -right-1 -top-1 min-w-5 rounded-full border border-border-strong bg-ink px-1 text-xs font-black leading-5 text-ink-foreground"
                  aria-hidden
                >
                  +{extraPhoneCount}
                </span>
              ) : null}
            </a>
          )}

          <NavigationChooser
            address={task.navigationAddress || task.address || ""}
            coordinates={task.coordinates}
            label="Navegar"
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-border-strong bg-ink text-xs font-black uppercase tracking-wider text-ink-foreground transition-all hover:bg-ink/90 outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          />

          <button
            type="button"
            onClick={handleHapticClick}
            className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-border-strong bg-primary px-5 text-xs font-black uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary-hover outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            <Info className="h-5 w-5" strokeWidth={2} aria-hidden />
            <span>Abrir</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default React.memo(TaskCard);
