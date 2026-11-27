"use client";

import { Users } from "lucide-react";
import type { WorkspaceMember } from "@/types/admin";
import { cn } from "@/lib/cn";
import { canonicalTechnicianName } from "@/lib/technicianIdentity";

type Props = {
  members: WorkspaceMember[];
  masterId: string;
  assistantIds: string[];
  assistantNames: string[];
  conflictMemberIds?: string[];
  onChange: (assistantIds: string[], assistantNames: string[]) => void;
  className?: string;
};

export function TeamMemberPicker({
  members,
  masterId,
  assistantIds,
  assistantNames,
  conflictMemberIds = [],
  onChange,
  className,
}: Props) {
  const conflictSet = new Set(conflictMemberIds);
  const candidates = members.filter((m) => m.id && m.id !== masterId);

  const toggleAssistant = (member: WorkspaceMember) => {
    const id = member.id;
    const idx = assistantIds.indexOf(id);
    if (idx >= 0) {
      onChange(
        assistantIds.filter((value) => value !== id),
        assistantNames.filter((_, i) => i !== idx)
      );
      return;
    }
    onChange(
      [...assistantIds, id],
      [...assistantNames, canonicalTechnicianName(member.name) || member.name]
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Técnicos auxiliares (opcional)
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {candidates.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem outros técnicos disponíveis.</p>
        ) : (
          candidates.map((member) => {
            const selected = assistantIds.includes(member.id);
            const conflict = conflictSet.has(member.id);
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleAssistant(member)}
                className={cn(
                  "inline-flex min-h-12 items-center rounded-xl border px-3 text-xs font-bold transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-muted text-muted-foreground hover:border-primary",
                  conflict && "ring-2 ring-warning"
                )}
              >
                {member.name}
                {conflict ? " · conflito" : ""}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}