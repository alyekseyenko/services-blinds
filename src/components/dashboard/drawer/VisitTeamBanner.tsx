"use client";

import { RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTeamDetailPt, parseTeamFromArrays } from "@/lib/visits/team";
import type { AppTask } from "@/lib/crm/schemas";

export function VisitTeamBanner(props: {
  task: AppTask;
  isAssistant: boolean;
  onRefresh?: () => void;
}) {
  const team = parseTeamFromArrays(
    props.task.assigneeId,
    props.task.technicianName,
    props.task.assistantTechnicianIds,
    props.task.assistantTechnicianNames
  );
  if (!team || (props.task.teamSize ?? 1) <= 1) return null;

  return (
    <div className="rounded-xl border border-border bg-muted p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {props.isAssistant ? "Equipa · Apoio" : "Equipa"}
          </p>
          <p className="text-sm font-bold text-foreground">{formatTeamDetailPt(team)}</p>
          {props.isAssistant ? (
            <p className="text-xs text-muted-foreground">
              Apenas o Master ({team.masterName}) inicia e fecha esta visita.
            </p>
          ) : null}
        </div>
        {props.onRefresh ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-12 shrink-0 gap-1 text-xs"
            onClick={props.onRefresh}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Atualizar
          </Button>
        ) : null}
      </div>
    </div>
  );
}