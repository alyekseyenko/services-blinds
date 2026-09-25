"use server";

import { canAccessAdminPanel } from "@/lib/auth/session";
import { getAppSession } from "@/lib/auth/session.server";
import { ActionResponse } from "@/lib/types/action-response";
import { fetchAdminOpportunities, updateOpportunityCoordinates } from "@/lib/crm/opportunities";
import { cancelAppointment } from "@/lib/crm/tasks";
import { findScheduleConflicts } from "@/lib/admin/routeScheduleSlots";
import { scheduleVisitCore } from "@/lib/crm/scheduleVisit";
import { getAdminSchedulingHoursError } from "@/lib/admin/schedulingHours";
import { getReusableTaskId } from "@/lib/crm/contract";
import { serverGeocodeAddress } from "@/lib/geocodeAction";
import type { RawAddress } from "@/types/admin";

type AdminAuthContext = { userName: string; userId: string };

async function requireAdminPanel(): Promise<AdminAuthContext | null> {
  const ctx = await getAppSession();
  if (!ctx || !ctx.user.role || !canAccessAdminPanel(ctx.user.role)) {
    return null;
  }

  const role = ctx.user.role;
  const userName =
    ctx.user.name ||
    (role === "ceo" ? "CEO Executivo" : role === "member" ? "Membro" : "Administrador");

  return { userName, userId: ctx.user.id };
}

export async function cancelAppointmentAction(
  taskId: string,
  opportunityId: string
): Promise<ActionResponse<void>> {
  try {
    const auth = await requireAdminPanel();
    if (!auth) return { success: false, error: "Unauthorized" };

    if (!taskId) {
      return { success: false, error: "No active task found to cancel." };
    }

    await cancelAppointment(taskId, opportunityId);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to cancel appointment.";
    console.error("[cancelAppointmentAction]", error);
    return { success: false, error: message };
  }
}

export async function runOpportunityMaintenanceAction(
  regeocodeAll = false
): Promise<ActionResponse<void>> {
  try {
    const auth = await requireAdminPanel();
    if (!auth) return { success: false, error: "Unauthorized" };

    const { runOpportunityMaintenance } = await import("@/lib/crm/opportunityMaintenance");
    await runOpportunityMaintenance(regeocodeAll ? "all" : null);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Maintenance sync failed.";
    console.error("[runOpportunityMaintenanceAction]", error);
    return { success: false, error: message };
  }
}

export async function geocodeAndUpdateOpportunityAction(
  opportunityId: string,
  address: string,
  existingAddress?: RawAddress
): Promise<ActionResponse<[number, number]>> {
  try {
    const auth = await requireAdminPanel();
    if (!auth) return { success: false, error: "Unauthorized" };

    const coords = await serverGeocodeAddress(address);
    if (!coords || !coords[0] || !coords[1]) {
      return { success: false, error: "Could not resolve GPS coordinates for this address." };
    }

    await updateOpportunityCoordinates(opportunityId, coords[0], coords[1], existingAddress);
    return { success: true, data: [coords[0], coords[1]] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "GPS update failed.";
    console.error("[geocodeAndUpdateOpportunityAction]", error);
    return { success: false, error: message };
  }
}

export async function updateOpportunityCoordinatesAction(
  opportunityId: string,
  lat: number,
  lng: number
): Promise<ActionResponse<[number, number]>> {
  try {
    const auth = await requireAdminPanel();
    if (!auth) return { success: false, error: "Unauthorized" };

    await updateOpportunityCoordinates(opportunityId, lat, lng);
    return { success: true, data: [lat, lng] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update coordinates.";
    console.error("[updateOpportunityCoordinatesAction]", error);
    return { success: false, error: message };
  }
}

export interface ScheduleVisitInput {
  title: string;
  dueAtIso: string;
  notes: string;
  technicianId: string;
  technicianName: string;
  morada: RawAddress & { addressLat?: number | null; addressLng?: number | null };
  opportunityId: string;
  personId?: string;
  pointOfContactEmail?: string;
  taskId?: string;
  currentStage: string;
  urgent?: boolean;
}

export interface ScheduleVisitActionData {
  conflictWarning?: string;
}

export async function scheduleTechnicalVisitAction(
  input: ScheduleVisitInput
): Promise<ActionResponse<ScheduleVisitActionData>> {
  try {
    const auth = await requireAdminPanel();
    if (!auth) return { success: false, error: "Unauthorized" };

    if (!input.technicianId) {
      return {
        success: false,
        error: "Select a valid Twenty CRM technician (Técnicos role).",
      };
    }

    const dueAt = new Date(input.dueAtIso);
    const hoursError = getAdminSchedulingHoursError(dueAt);
    if (hoursError) {
      return { success: false, error: hoursError };
    }

    const opportunities = await fetchAdminOpportunities();
    const conflicts = findScheduleConflicts(
      [{ title: input.title, dueAt, opportunityId: input.opportunityId }],
      opportunities,
      input.technicianName,
      { excludeOpportunityIds: [input.opportunityId] }
    );

    let conflictWarning: string | undefined;
    if (conflicts.length > 0) {
      const first = conflicts[0];
      const timeLabel = first.conflictingTime.toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      });
      if (!input.urgent) {
        return {
          success: false,
          error: `Conflito de agenda: «${first.conflictingTitle}» já está marcado às ${timeLabel} para este técnico.`,
        };
      }
      conflictWarning = `Aviso: «${first.conflictingTitle}» está marcado às ${timeLabel} para o mesmo técnico.`;
    }

    const existingOpp = opportunities.find((opp) => opp.twentyId === input.opportunityId);
    const reusableTaskId =
      getReusableTaskId(existingOpp?.taskId, existingOpp?.taskStatus) ||
      getReusableTaskId(input.taskId, existingOpp?.taskStatus);

    await scheduleVisitCore({
      title: input.title,
      dueAt,
      notes: input.notes,
      assigneeId: input.technicianId,
      technicianName: input.technicianName,
      morada: input.morada,
      opportunityId: input.opportunityId,
      personId: input.personId,
      pointOfContactEmail: input.pointOfContactEmail,
      taskId: reusableTaskId,
      currentStage: input.currentStage,
      scheduledByName: auth.userName,
      scheduledByMemberId: auth.userId,
      noteTitle: "Scheduling Instructions",
      urgent: input.urgent,
    });

    return {
      success: true,
      data: conflictWarning ? { conflictWarning } : undefined,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Não foi possível agendar a visita.";
    console.error("[scheduleTechnicalVisitAction]", error);
    return { success: false, error: message };
  }
}

export interface MassScheduleStop {
  title: string;
  twentyId: string;
  stage?: string;
  isReturn?: boolean;
  rawAddress?: RawAddress;
  pointOfContactId?: string;
  pointOfContactEmail?: string;
  clientName?: string;
  taskId?: string;
  dueAtIso: string;
  notes?: string;
}

export async function scheduleMassVisitsAction(
  stops: MassScheduleStop[],
  technicianId: string,
  technicianName: string,
  globalNotes?: string,
  urgent?: boolean
): Promise<
  ActionResponse<{
    scheduledCount: number;
    skippedCount?: number;
    skippedTitles?: string[];
    conflictWarning?: string;
  }>
> {
  try {
    const auth = await requireAdminPanel();
    if (!auth) return { success: false, error: "Unauthorized" };

    if (!technicianId) {
      return {
        success: false,
        error: "Select a valid Twenty CRM technician (Técnicos role).",
      };
    }

    const visitStops = stops.filter((stop) => !stop.isReturn);
    if (visitStops.length === 0) {
      return { success: false, error: "No route stops selected for scheduling." };
    }

    for (const stop of visitStops) {
      const hoursError = getAdminSchedulingHoursError(new Date(stop.dueAtIso));
      if (hoursError) {
        return { success: false, error: `${hoursError} («${stop.title}»)` };
      }
    }

    const opportunities = await fetchAdminOpportunities();
    const batchOpportunityIds = visitStops.map((stop) => stop.twentyId);
    const conflicts = findScheduleConflicts(
      visitStops.map((stop) => ({
        title: stop.title,
        dueAt: new Date(stop.dueAtIso),
        opportunityId: stop.twentyId,
      })),
      opportunities,
      technicianName,
      { excludeOpportunityIds: batchOpportunityIds }
    );

    let conflictWarning: string | undefined;
    if (conflicts.length > 0) {
      const first = conflicts[0];
      const timeLabel = first.conflictingTime.toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      });
      if (!urgent) {
        return {
          success: false,
          error: `Conflito de agenda: «${first.stopTitle}» sobrepõe-se a «${first.conflictingTitle}» às ${timeLabel}.`,
        };
      }
      conflictWarning = `Aviso: «${first.stopTitle}» sobrepõe-se a «${first.conflictingTitle}» às ${timeLabel}.`;
    }

    let scheduledCount = 0;
    const skippedTitles: string[] = [];

    for (let i = 0; i < visitStops.length; i++) {
      const stop = visitStops[i];
      const existingOpp = opportunities.find((opp) => opp.twentyId === stop.twentyId);

      if (existingOpp?.hasScheduledTask) {
        skippedTitles.push(stop.title);
        continue;
      }

      const mergedNotes = [globalNotes?.trim(), stop.notes?.trim()].filter(Boolean).join("\n\n");
      const routeStopLabel = `Route stop #${i + 1}`;
      const taskId = getReusableTaskId(existingOpp?.taskId, existingOpp?.taskStatus);

      await scheduleVisitCore({
        title: stop.title,
        dueAt: new Date(stop.dueAtIso),
        notes: mergedNotes || undefined,
        assigneeId: technicianId,
        technicianName,
        morada: stop.rawAddress || {},
        opportunityId: stop.twentyId,
        personId: stop.pointOfContactId,
        pointOfContactEmail: stop.pointOfContactEmail,
        clientName: stop.clientName,
        taskId,
        currentStage: stop.stage || existingOpp?.stage || "ENTRADA",
        scheduledByName: auth.userName,
        scheduledByMemberId: auth.userId,
        noteTitle: urgent ? "Agendamento urgente" : "Route Scheduling Instructions",
        routeStopLabel,
        urgent,
      });

      scheduledCount += 1;
    }

    if (scheduledCount === 0) {
      const detail =
        skippedTitles.length > 0
          ? `All selected stops are already confirmed: ${skippedTitles.join(", ")}.`
          : "No stops were eligible for scheduling.";
      return { success: false, error: detail };
    }

    return {
      success: true,
      data: {
        scheduledCount,
        skippedCount: skippedTitles.length,
        skippedTitles,
        conflictWarning,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Não foi possível agendar a rota.";
    console.error("[scheduleMassVisitsAction]", error);
    return { success: false, error: message };
  }
}
