"use server";

import { assertCanMutateTask } from "@/lib/auth/taskAccess";
import { getAppSession } from "@/lib/auth/session.server";
import { updateTaskCoordinates } from "@/lib/crm/tasks";
import { serverGeocodeAddress } from "@/lib/geocodeAction";
import type { ActionResponse } from "@/lib/types/action-response";

export async function geocodeTaskAddressAction(
  address: string
): Promise<ActionResponse<[number, number] | null>> {
  try {
    const ctx = await getAppSession();
    if (!ctx?.user.role || (ctx.user.role !== "technician" && ctx.user.role !== "admin")) {
      return { success: false, error: "Acesso não autorizado." };
    }
    if (!address?.trim()) {
      return { success: false, error: "Morada em falta." };
    }

    const coords = await serverGeocodeAddress(address);
    if (!coords) {
      return { success: true, data: null };
    }

    return { success: true, data: coords as [number, number] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao geolocalizar.";
    return { success: false, error: message };
  }
}

export async function updateTaskCoordinatesAction(
  taskId: string,
  lat: number,
  lng: number
): Promise<ActionResponse<void>> {
  try {
    const access = await assertCanMutateTask(taskId);
    if (!access.ok) {
      return { success: false, error: access.error };
    }

    await updateTaskCoordinates(taskId, lat, lng);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar coordenadas.";
    return { success: false, error: message };
  }
}
