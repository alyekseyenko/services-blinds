import {
  resolveCalendarEventEnd,
  schedulingIntervalsOverlap,
} from "@/lib/visits/calendarVisitSpan";
import { canonicalTechnicianName } from "@/lib/technicianIdentity";
import type { VisitTeamRole } from "@/lib/visits/team";

export interface ConflictCheckOpportunity {
  title: string;
  twentyId?: string;
  scheduledAt?: string | Date | null;
  scheduledEndAt?: string | Date | null;
  status?: string;
  technician?: string;
  technicianId?: string | null;
  assistantTechnicianIds?: string[];
  assistantTechnicianNames?: string[];
}

export interface ScheduleConflictOptions {
  excludeOpportunityIds?: string[];
  technicianId?: string;
  assistantTechnicianIds?: string[];
  assistantTechnicianNames?: string[];
}

export type ScheduleConflictSeverity = "overlap" | "same_day_team_open_end";

export interface ScheduleConflict {
  stopTitle: string;
  stopTime: Date;
  conflictingTitle: string;
  conflictingTime: Date;
  conflictingEndTime?: Date | null;
  memberId: string;
  memberName: string;
  memberRole: VisitTeamRole;
  existingMasterName: string;
  existingMemberRole: VisitTeamRole;
  severity: ScheduleConflictSeverity;
}

function resolveSlotInterval(
  start: Date,
  explicitEnd?: Date | string | null
): { start: Date; end: Date } | null {
  if (Number.isNaN(start.getTime())) return null;
  const end = explicitEnd
    ? resolveCalendarEventEnd(start, explicitEnd)
    : resolveCalendarEventEnd(start, null);
  if (!end) return null;
  return { start, end };
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function oppMemberIds(opp: ConflictCheckOpportunity): string[] {
  const ids: string[] = [];
  if (opp.technicianId?.trim()) ids.push(opp.technicianId.trim());
  for (const id of opp.assistantTechnicianIds ?? []) {
    const trimmed = id.trim();
    if (trimmed) ids.push(trimmed);
  }
  return ids;
}

function nameForMemberId(
  memberId: string,
  masterId: string | null | undefined,
  masterName: string | undefined,
  assistantIds: string[],
  assistantNames: string[]
): string {
  if (masterId && memberId === masterId) {
    return canonicalTechnicianName(masterName) || "Master";
  }
  const idx = assistantIds.findIndex((id) => id === memberId);
  if (idx >= 0 && assistantNames[idx]?.trim()) {
    return canonicalTechnicianName(assistantNames[idx]);
  }
  return "Técnico";
}

function roleOnOpp(memberId: string, opp: ConflictCheckOpportunity): VisitTeamRole {
  if (opp.technicianId === memberId) return "master";
  return "assistant";
}

function proposedMembers(
  options: ScheduleConflictOptions,
  masterDisplayName: string
): Array<{ id: string; name: string; role: VisitTeamRole }> {
  const members: Array<{ id: string; name: string; role: VisitTeamRole }> = [];
  const masterId = options.technicianId?.trim();
  if (!masterId) return members;
  const assistantIds = options.assistantTechnicianIds ?? [];
  const assistantNames = options.assistantTechnicianNames ?? [];
  members.push({
    id: masterId,
    name: masterDisplayName || "Master",
    role: "master",
  });
  assistantIds.forEach((id, idx) => {
    const trimmed = id.trim();
    if (!trimmed || trimmed === masterId) return;
    members.push({
      id: trimmed,
      name: assistantNames[idx]?.trim() || "Técnico",
      role: "assistant",
    });
  });
  return members;
}

function formatClockRange(start: Date, end?: Date | null): string {
  const startLabel = start.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  if (!end) return startLabel;
  const endLabel = end.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  return `${startLabel}–${endLabel}`;
}

export function formatScheduleConflictPt(conflict: ScheduleConflict): string {
  const master = canonicalTechnicianName(conflict.existingMasterName) || conflict.existingMasterName;
  const member = canonicalTechnicianName(conflict.memberName) || conflict.memberName;
  const timeRange = formatClockRange(conflict.conflictingTime, conflict.conflictingEndTime);

  if (conflict.severity === "same_day_team_open_end") {
    const roleLabel =
      conflict.existingMemberRole === "assistant"
        ? `vai em equipa (Master: ${master})`
        : "tem visita marcada";
    return `${member} também ${roleLabel} neste dia às ${timeRange} em «${conflict.conflictingTitle}» — sem hora de fim definida.`;
  }

  if (conflict.existingMemberRole === "assistant") {
    return `${member} já vai em equipa (Master: ${master}) em «${conflict.conflictingTitle}» (${timeRange}).`;
  }

  return `${member} já tem visita marcada em «${conflict.conflictingTitle}» às ${timeRange}.`;
}

export function aggregateScheduleConflictWarning(conflicts: ScheduleConflict[]): string | undefined {
  if (conflicts.length === 0) return undefined;
  const lines = conflicts.map((c) => formatScheduleConflictPt(c));
  return `Aviso: ${lines.join(" ")}`;
}

export function findScheduleConflicts(
  slots: Array<{ title: string; dueAt: Date; endAt?: Date | null; opportunityId?: string }>,
  opportunities: ConflictCheckOpportunity[],
  technicianName: string,
  options: ScheduleConflictOptions = {}
): ScheduleConflict[] {
  if (!technicianName && !options.technicianId) return [];

  const excludedIds = new Set(options.excludeOpportunityIds || []);
  const conflicts: ScheduleConflict[] = [];
  const seen = new Set<string>();

  const proposed = proposedMembers(options, technicianName);
  const proposedIds =
    proposed.length > 0
      ? proposed.map((m) => m.id)
      : options.technicianId
        ? [options.technicianId]
        : [];

  for (const slot of slots) {
    if (slot.opportunityId) {
      excludedIds.add(slot.opportunityId);
    }

    const slotInterval = resolveSlotInterval(slot.dueAt, slot.endAt);
    if (!slotInterval) continue;

    for (const opp of opportunities) {
      if (!opp.scheduledAt || opp.status === "Cancelado" || opp.status === "Concluído") continue;
      if (opp.twentyId && excludedIds.has(opp.twentyId)) continue;
      if (slot.opportunityId && opp.twentyId === slot.opportunityId) continue;

      const oppMemberIdList = oppMemberIds(opp);
      const sharedMemberIds = proposedIds.filter((id) => oppMemberIdList.includes(id));
      if (sharedMemberIds.length === 0) continue;

      const oppStart = new Date(opp.scheduledAt);
      const oppInterval = resolveSlotInterval(oppStart, opp.scheduledEndAt ?? null);
      const hasExplicitEnd =
        opp.scheduledEndAt != null &&
        opp.scheduledEndAt !== "" &&
        (opp.scheduledEndAt instanceof Date
          ? !Number.isNaN(opp.scheduledEndAt.getTime())
          : !Number.isNaN(new Date(opp.scheduledEndAt).getTime()));

      const masterName = canonicalTechnicianName(opp.technician) || opp.technician || "Master";
      const assistantIds = opp.assistantTechnicianIds ?? [];
      const assistantNames = opp.assistantTechnicianNames ?? [];

      for (const memberId of sharedMemberIds) {
        const memberName = nameForMemberId(
          memberId,
          opp.technicianId,
          opp.technician,
          assistantIds,
          assistantNames
        );
        const proposedMember = proposed.find((m) => m.id === memberId);
        const displayName =
          proposedMember && proposedMember.role === "master"
            ? canonicalTechnicianName(technicianName) || technicianName
            : canonicalTechnicianName(proposedMember?.name) || memberName;

        const existingRole = roleOnOpp(memberId, opp);
        const memberRole = proposedMember?.role ?? (memberId === options.technicianId ? "master" : "assistant");

        const pushConflict = (severity: ScheduleConflictSeverity, endTime?: Date | null) => {
          const key = `${slot.title}|${memberId}|${opp.twentyId ?? opp.title}|${severity}`;
          if (seen.has(key)) return;
          seen.add(key);
          conflicts.push({
            stopTitle: slot.title,
            stopTime: slot.dueAt,
            conflictingTitle: opp.title,
            conflictingTime: oppStart,
            conflictingEndTime: endTime ?? (oppInterval?.end ?? null),
            memberId,
            memberName: displayName,
            memberRole,
            existingMasterName: masterName,
            existingMemberRole: existingRole,
            severity,
          });
        };

        if (
          !hasExplicitEnd &&
          assistantIds.length > 0 &&
          sameCalendarDay(slot.dueAt, oppStart)
        ) {
          pushConflict("same_day_team_open_end", null);
        }

        if (!oppInterval) continue;

        if (
          schedulingIntervalsOverlap(
            slotInterval.start,
            slotInterval.end,
            oppInterval.start,
            oppInterval.end
          )
        ) {
          pushConflict("overlap", oppInterval.end);
        }
      }
    }
  }

  return conflicts;
}