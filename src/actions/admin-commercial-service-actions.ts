"use server";

import { canAccessAdminPanel, resolveWorkspaceMemberId } from "@/lib/auth/session";
import { getAppSession } from "@/lib/auth/session.server";
import {
  normalizeOpportunityDates,
  type RawOpportunity,
} from "@/lib/admin/opportunityNormalizers";
import { createAdminCommercialService } from "@/lib/crm/adminCommercialService";
import { fetchPersonDefaultServiceAddress, searchPeopleForAdmin } from "@/lib/crm/people";
import type { AdminClientSearchHit } from "@/lib/schemas/adminCommercialService";
import { fetchAdminOpportunityById } from "@/lib/crm/opportunities";
import {
  CreateAdminCommercialServiceSchema,
  type AdminServiceAddress,
} from "@/lib/schemas/adminCommercialService";
import type { ActionResponse } from "@/lib/types/action-response";
import type { Opportunity } from "@/types/admin";
import { toUserMessage } from "@/lib/userMessages";

async function requireAdminPanel(): Promise<
  { userName: string; workspaceMemberId: string } | null
> {
  const ctx = await getAppSession();
  if (!ctx?.user?.role || !canAccessAdminPanel(ctx.user.role)) {
    return null;
  }
  const userName =
    ctx.user.name ||
    (ctx.user.role === "ceo"
      ? "CEO Executivo"
      : ctx.user.role === "member"
        ? "Membro"
        : "Administrador");
  const workspaceMemberId = resolveWorkspaceMemberId(ctx.user);
  return { userName, workspaceMemberId };
}

export async function searchAdminClientsAction(
  query: string
): Promise<ActionResponse<AdminClientSearchHit[]>> {
  try {
    const auth = await requireAdminPanel();
    if (!auth) return { success: false, error: "Não autorizado." };

    const hits = await searchPeopleForAdmin(query);
    return { success: true, data: hits };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Não foi possível pesquisar clientes.");
    console.error("[searchAdminClientsAction]", error);
    return { success: false, error: message };
  }
}

export async function getAdminClientServiceAddressAction(
  personId: string
): Promise<ActionResponse<AdminServiceAddress | null>> {
  try {
    const auth = await requireAdminPanel();
    if (!auth) return { success: false, error: "Não autorizado." };

    if (!personId?.trim()) {
      return { success: false, error: "Cliente inválido." };
    }

    const morada = await fetchPersonDefaultServiceAddress(personId);
    if (!morada) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        addressStreet1: morada.addressStreet1 ?? "",
        addressStreet2: morada.addressStreet2 ?? "",
        addressCity: morada.addressCity ?? "",
        addressState: morada.addressState ?? "",
        addressPostcode: morada.addressPostcode ?? "",
        addressCountry: morada.addressCountry ?? "Portugal",
        addressLat: morada.addressLat ?? null,
        addressLng: morada.addressLng ?? null,
      },
    };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Não foi possível carregar a morada do cliente.");
    console.error("[getAdminClientServiceAddressAction]", error);
    return { success: false, error: message };
  }
}

export async function createAdminCommercialServiceAction(
  raw: unknown
): Promise<ActionResponse<{ opportunity: Opportunity }>> {
  try {
    const auth = await requireAdminPanel();
    if (!auth) return { success: false, error: "Não autorizado." };

    const parsed = CreateAdminCommercialServiceSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message;
      return { success: false, error: first || "Dados inválidos." };
    }

    const { opportunityId } = await createAdminCommercialService(parsed.data, {
      name: auth.userName,
      workspaceMemberId: auth.workspaceMemberId,
    });
    const mapped = await fetchAdminOpportunityById(opportunityId);
    if (!mapped) {
      return { success: false, error: "Serviço criado, mas não foi possível carregar os detalhes." };
    }

    return {
      success: true,
      data: {
        opportunity: normalizeOpportunityDates(mapped as RawOpportunity),
      },
    };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Não foi possível criar o serviço.");
    console.error("[createAdminCommercialServiceAction]", error);
    return { success: false, error: message };
  }
}
