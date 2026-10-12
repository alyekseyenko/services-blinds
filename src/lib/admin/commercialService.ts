import "server-only";

import type { CreateAdminCommercialServiceInput } from "@/lib/schemas/adminCommercialService";
import { getAdminCommercialServiceLabel } from "@/lib/adminCommercialServiceOptions";
import { serverGeocodeAddress } from "@/lib/geocodeAction";
import { createOpportunityNote } from "@/lib/crm/notes";
import {
  createAdminCommercialServiceOpportunity,
  type AdminCommercialServiceCreateActor,
} from "@/lib/crm/pipelineTransitions";
import type { AdminCommercialServiceType } from "@/lib/schemas/adminCommercialService";
import type { OpportunityServiceAddressInput } from "@/lib/crm/opportunities";
import { fetchPersonByIdForAdmin } from "@/lib/crm/people";

function formatAddressLine(morada: OpportunityServiceAddressInput): string {
  return [
    morada.addressStreet1,
    morada.addressStreet2,
    morada.addressCity,
    morada.addressPostcode,
    morada.addressCountry,
  ]
    .filter(Boolean)
    .join(", ");
}

async function resolveCoordinates(
  morada: OpportunityServiceAddressInput
): Promise<OpportunityServiceAddressInput> {
  if (morada.addressLat != null && morada.addressLng != null) {
    return morada;
  }
  const line = formatAddressLine(morada);
  if (!line.trim()) return morada;
  const coords = await serverGeocodeAddress(line);
  if (!coords?.[0] || !coords?.[1]) return morada;
  return {
    ...morada,
    addressLat: coords[0],
    addressLng: coords[1],
  };
}

export async function createAdminCommercialService(
  input: CreateAdminCommercialServiceInput,
  actor: AdminCommercialServiceCreateActor
): Promise<{ opportunityId: string }> {
  const operatorName = actor.name;
  const person = await fetchPersonByIdForAdmin(input.personId);
  if (!person) {
    throw new Error("Cliente não encontrado no CRM.");
  }

  const serviceLabel = getAdminCommercialServiceLabel(input.serviceType);
  const clientLabel = person.displayName;
  const suffix = input.titleSuffix?.trim();
  const name = suffix
    ? `${serviceLabel} — ${suffix}`
    : `${serviceLabel} — ${clientLabel}`;

  const morada = await resolveCoordinates({
    ...input.address,
    addressCountry: input.address.addressCountry || "Portugal",
  });

  const notesMarkdown = input.notes?.trim()
    ? input.notes.trim()
    : `Serviço criado no painel operacional por ${operatorName}.`;

  // Service address lives on Opportunity.moradaDeServico only — never update Person.morada.
  const createData: Record<string, unknown> = {
    name,
    pointOfContactId: input.personId,
    disponibilidadeDoCliente: new Date().toISOString(),
    moradaDeServico: {
      addressStreet1: morada.addressStreet1 ?? "",
      addressStreet2: morada.addressStreet2 ?? "",
      addressCity: morada.addressCity ?? "",
      addressState: morada.addressState ?? "",
      addressPostcode: morada.addressPostcode ?? "",
      addressCountry: morada.addressCountry ?? "Portugal",
      addressLat: morada.addressLat ?? null,
      addressLng: morada.addressLng ?? null,
    },
    notasImportantes: { markdown: notesMarkdown },
  };

  if (input.nsi != null) {
    createData.nsi = input.nsi;
  }

  const opportunityId = await createAdminCommercialServiceOpportunity(
    createData,
    input.serviceType as AdminCommercialServiceType,
    actor.workspaceMemberId ? actor : undefined
  );

  await createOpportunityNote(
    opportunityId,
    input.personId,
    "Criado no painel",
    `Serviço aberto no painel operacional por ${operatorName}.`,
    `${input.clientRequestId}-admin-service`,
    actor.workspaceMemberId ? actor : undefined
  );

  return { opportunityId };
}
