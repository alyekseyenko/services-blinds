"use server";

import { getAppSession, canAccessAdminPanel } from "@/lib/auth/session";
import { ActionResponse } from "@/lib/types/action-response";
import {
  cancelAppointment,
  createTechnicalVisit,
  getNextStageOnSchedule,
  updateOpportunityCoordinates,
  updateOpportunityStage,
} from "@/lib/crm";
import { serverGeocodeAddress } from "@/lib/geocodeAction";
import { createOpportunityNoteAction } from "@/actions/notes-actions";
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
}

export async function scheduleTechnicalVisitAction(
  input: ScheduleVisitInput
): Promise<ActionResponse<void>> {
  try {
    const auth = await requireAdminPanel();
    if (!auth) return { success: false, error: "Unauthorized" };

    if (!input.technicianId) {
      return {
        success: false,
        error: "Select a valid Twenty CRM technician (Técnicos role).",
      };
    }

    await createTechnicalVisit({
      title: input.title,
      dueAt: new Date(input.dueAtIso),
      body: input.notes,
      assigneeId: input.technicianId,
      morada: input.morada,
      opportunityId: input.opportunityId,
      personId: input.personId,
      pointOfContactEmail: input.pointOfContactEmail,
      taskId: input.taskId,
      scheduledByName: auth.userName,
      scheduledByMemberId: auth.userId,
      technicianName: input.technicianName,
    });

    if (input.notes?.trim()) {
      await createOpportunityNoteAction(
        input.opportunityId,
        input.personId || null,
        "Instruções do Agendamento",
        input.notes
      ).catch((err) => console.error("[scheduleTechnicalVisitAction] note error:", err));
    }

    const nextStage = getNextStageOnSchedule(input.currentStage);
    if (nextStage !== input.currentStage) {
      await updateOpportunityStage(input.opportunityId, nextStage);
    }

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to schedule visit.";
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
  taskId?: string;
}

export async function scheduleMassVisitsAction(
  stops: MassScheduleStop[],
  technicianId: string,
  technicianName: string,
  dateIso: string
): Promise<ActionResponse<{ scheduledCount: number }>> {
  try {
    const auth = await requireAdminPanel();
    if (!auth) return { success: false, error: "Unauthorized" };

    if (!technicianId) {
      return {
        success: false,
        error: "Select a valid Twenty CRM technician (Técnicos role).",
      };
    }

    const [year, month, day] = dateIso.split("-").map(Number);
    let currentHour = 8;
    let currentMinute = 30;
    let scheduledCount = 0;

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      if (stop.isReturn) continue;
      if (currentHour >= 13 && currentHour < 14) {
        currentHour = 14;
        currentMinute = 0;
      }

      const dueAt = new Date(year, month - 1, day, currentHour, currentMinute);

      await createTechnicalVisit({
        title: stop.title,
        dueAt,
        body: `Roteiro Automático Paragem #${i + 1}`,
        assigneeId: technicianId,
        morada: stop.rawAddress || {},
        opportunityId: stop.twentyId,
        personId: stop.pointOfContactId,
        pointOfContactEmail: stop.pointOfContactEmail,
        taskId: stop.taskId,
        scheduledByName: auth.userName,
        scheduledByMemberId: auth.userId,
        technicianName,
      });

      if (stop.stage) {
        const nextStage = getNextStageOnSchedule(stop.stage);
        if (nextStage !== stop.stage) {
          await updateOpportunityStage(stop.twentyId, nextStage);
        }
      }

      scheduledCount += 1;
      currentMinute += 105;
      while (currentMinute >= 60) {
        currentMinute -= 60;
        currentHour += 1;
      }
    }

    return { success: true, data: { scheduledCount } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to schedule route.";
    console.error("[scheduleMassVisitsAction]", error);
    return { success: false, error: message };
  }
}
