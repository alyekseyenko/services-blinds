"use server";

import { canAccessAdminPanel } from "@/lib/auth/session";
import { getAppSession } from "@/lib/auth/session.server";
import { ActionResponse } from "@/lib/types/action-response";
import { fetchAdminOpportunities, updateOpportunityCoordinates } from "@/lib/crm/opportunities";
import { cancelAppointment } from "@/lib/crm/tasks";
import { findScheduleConflicts } from "@/lib/admin/routeScheduleSlots";
import { scheduleVisitCore } from "@/lib/crm/scheduleVisit";
import { getReusableTaskId, isTaskInProgress } from "@/lib/crm/contract";
import { getTaskIdForReschedule } from "@/lib/admin/scheduleFormPrefill";
import { serverGeocodeAddress } from "@/lib/geocodeAction";
import type { RawAddress } from "@/types/admin";
import { toUserMessage } from "@/lib/userMessages";

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
    if (!auth) return { success: false, error: "Não autorizado." };

    if (!taskId) {
      return { success: false, error: "Não foi encontrada nenhuma tarefa ativa para cancelar." };
    }

    await cancelAppointment(taskId, opportunityId);
    return { success: true };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Não foi possível cancelar o agendamento.");
    console.error("[cancelAppointmentAction]", error);
    return { success: false, error: message };
  }
}

export async function runOpportunityMaintenanceAction(
  regeocodeAll = false
): Promise<
  ActionResponse<{
    geocoded: number;
    geocodePending: number;
    geocodeFailed: { title: string; address: string; reason: string }[];
    geocodeSkippedNoAddress: { title: string }[];
  }>
> {
  try {
    const auth = await requireAdminPanel();
    if (!auth) return { success: false, error: "Não autorizado." };

    const { runOpportunityMaintenance } = await import("@/lib/crm/opportunityMaintenance");
    const result = await runOpportunityMaintenance(regeocodeAll ? "all" : null);
    return {
      success: true,
      data: {
        geocoded: result.geocoded,
        geocodePending: result.geocodePending,
        geocodeFailed: result.geocodeFailed,
        geocodeSkippedNoAddress: result.geocodeSkippedNoAddress,
      },
    };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Falha na sincronização de manutenção.");
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
    if (!auth) return { success: false, error: "Não autorizado." };

    const coords = await serverGeocodeAddress(address);
    if (!coords || !coords[0] || !coords[1]) {
      return { success: false, error: "Não foi possível obter coordenadas GPS para esta morada." };
    }

    await updateOpportunityCoordinates(opportunityId, coords[0], coords[1], existingAddress);
    return { success: true, data: [coords[0], coords[1]] };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Falha ao atualizar o GPS.");
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
    if (!auth) return { success: false, error: "Não autorizado." };

    await updateOpportunityCoordinates(opportunityId, lat, lng);
    return { success: true, data: [lat, lng] };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Não foi possível atualizar as coordenadas.");
    console.error("[updateOpportunityCoordinatesAction]", error);
    return { success: false, error: message };
  }
}

export interface ScheduleVisitInput {
  title: string;
  dueAtIso: string;
  /** ISO end time, or omitted / null when the calendar should use the default one-hour block. */
  horaDeFimIso?: string | null;
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
  /** Actualiza a proposta/visita existente (AGENDADO/POR_AGENDAR) sem cancelar. */
  rescheduleExistingTask?: boolean;
}

export interface ScheduleVisitActionData {
  conflictWarning?: string;
}

export async function scheduleTechnicalVisitAction(
  input: ScheduleVisitInput
): Promise<ActionResponse<ScheduleVisitActionData>> {
  try {
    const auth = await requireAdminPanel();
    if (!auth) return { success: false, error: "Não autorizado." };

    if (!input.technicianId) {
      return {
        success: false,
        error: "Selecione um técnico válido no Twenty CRM (função Técnicos).",
      };
    }

    const dueAt = new Date(input.dueAtIso);
    const endAt = input.horaDeFimIso ? new Date(input.horaDeFimIso) : undefined;

    const opportunities = await fetchAdminOpportunities();
    const conflicts = findScheduleConflicts(
      [{ title: input.title, dueAt, endAt, opportunityId: input.opportunityId }],
      opportunities,
      input.technicianName,
      {
        excludeOpportunityIds: [input.opportunityId],
        technicianId: input.technicianId,
      }
    );

    let conflictWarning: string | undefined;
    if (conflicts.length > 0) {
      const first = conflicts[0];
      const timeLabel = first.conflictingTime.toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      });
      conflictWarning = `Aviso: sobreposição com «${first.conflictingTitle}» (início às ${timeLabel}). A visita foi agendada na mesma.`;
    }

    const existingOpp = opportunities.find((opp) => opp.twentyId === input.opportunityId);
    const taskStatus = existingOpp?.taskStatus;

    if (input.rescheduleExistingTask) {
      const inProgress =
        isTaskInProgress(existingOpp?.taskStatus) || isTaskInProgress(existingOpp?.status);
      if (inProgress) {
        return {
          success: false,
          error:
            "Não é possível reagendar: o técnico já marcou a visita como em curso no terreno.",
        };
      }
    }

    const reusableTaskId = input.rescheduleExistingTask
      ? getTaskIdForReschedule(existingOpp?.taskId ?? input.taskId, taskStatus ?? existingOpp?.status)
      : getReusableTaskId(existingOpp?.taskId, existingOpp?.taskStatus) ||
        getReusableTaskId(input.taskId, existingOpp?.taskStatus);

    const horaDeFim = input.horaDeFimIso ? new Date(input.horaDeFimIso) : null;

    await scheduleVisitCore({
      title: input.title,
      dueAt,
      horaDeFim,
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
      noteTitle: "Instruções de agendamento",
      urgent: input.urgent,
    });

    return {
      success: true,
      data: conflictWarning ? { conflictWarning } : undefined,
    };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Não foi possível agendar a visita.");
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
  horaDeFimIso?: string | null;
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
    failed?: { title: string; error: string }[];
  }>
> {
  try {
    const auth = await requireAdminPanel();
    if (!auth) return { success: false, error: "Não autorizado." };

    if (!technicianId) {
      return {
        success: false,
        error: "Selecione um técnico válido no Twenty CRM (função Técnicos).",
      };
    }

    const visitStops = stops.filter((stop) => !stop.isReturn);
    if (visitStops.length === 0) {
      return { success: false, error: "Nenhuma paragem da rota selecionada para agendar." };
    }

    const opportunities = await fetchAdminOpportunities();
    const batchOpportunityIds = visitStops.map((stop) => stop.twentyId);
    const conflicts = findScheduleConflicts(
      visitStops.map((stop) => ({
        title: stop.title,
        dueAt: new Date(stop.dueAtIso),
        endAt: stop.horaDeFimIso ? new Date(stop.horaDeFimIso) : undefined,
        opportunityId: stop.twentyId,
      })),
      opportunities,
      technicianName,
      { excludeOpportunityIds: batchOpportunityIds, technicianId }
    );

    let conflictWarning: string | undefined;
    if (conflicts.length > 0) {
      const first = conflicts[0];
      const timeLabel = first.conflictingTime.toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      });
      conflictWarning = `Aviso: sobreposição com «${first.conflictingTitle}» (início às ${timeLabel}). A rota foi agendada na mesma.`;
    }

    let scheduledCount = 0;
    const skippedTitles: string[] = [];
    const failed: { title: string; error: string }[] = [];

    for (let i = 0; i < visitStops.length; i++) {
      const stop = visitStops[i];
      const existingOpp = opportunities.find((opp) => opp.twentyId === stop.twentyId);

      if (existingOpp?.hasScheduledTask) {
        skippedTitles.push(stop.title);
        continue;
      }

      const mergedNotes = [globalNotes?.trim(), stop.notes?.trim()].filter(Boolean).join("\n\n");
      const routeStopLabel = `Paragem #${i + 1}`;
      const taskId = getReusableTaskId(existingOpp?.taskId, existingOpp?.taskStatus);

      try {
        const horaDeFim = stop.horaDeFimIso ? new Date(stop.horaDeFimIso) : null;

        await scheduleVisitCore({
          title: stop.title,
          dueAt: new Date(stop.dueAtIso),
          horaDeFim,
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
          noteTitle: urgent ? "Agendamento urgente" : "Instruções de agendamento",
          routeStopLabel,
          urgent,
        });
        scheduledCount += 1;
      } catch (error: unknown) {
        failed.push({
          title: stop.title,
          error: toUserMessage(error, "Não foi possível agendar esta paragem."),
        });
      }
    }

    if (scheduledCount === 0 && failed.length === 0) {
      const detail =
        skippedTitles.length > 0
          ? `Todas as paragens selecionadas já estão confirmadas: ${skippedTitles.join(", ")}.`
          : "Nenhuma paragem elegível para agendamento.";
      return { success: false, error: detail };
    }

    return {
      success: true,
      data: {
        scheduledCount,
        skippedCount: skippedTitles.length,
        skippedTitles,
        conflictWarning,
        failed: failed.length ? failed : undefined,
      },
    };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Não foi possível agendar a rota.");
    console.error("[scheduleMassVisitsAction]", error);
    return { success: false, error: message };
  }
}
