import "server-only";
import { crmFetch } from "../client";
import { parseCrmClientRating, formatCrmClientRating } from "../contract";
import { invalidateAdminCrmCache } from "@/lib/crmCache";

export async function updateOpportunityClientAvailability(id: string, disponibilidadeIso: string) {
  const mutation = `
    mutation updateOppAvailability($id: UUID!, $disponibilidade: DateTime!) {
      updateOpportunity(id: $id, data: { disponibilidadeDoCliente: $disponibilidade }) {
        id
      }
    }
  `;
  const result = await crmFetch(mutation, { id, disponibilidade: disponibilidadeIso });
  await invalidateAdminCrmCache();
  return result;
}
export type OpportunityServiceAddressInput = {
  addressStreet1?: string;
  addressStreet2?: string;
  addressCity?: string;
  addressState?: string;
  addressPostcode?: string;
  addressCountry?: string;
  addressLat?: number | null;
  addressLng?: number | null;
};

/** Sync service address on the Opportunity (official field: moradaDeServico). */
export async function updateOpportunityServiceAddress(
  id: string,
  morada: OpportunityServiceAddressInput
) {
  const hasText =
    Boolean(morada.addressStreet1?.trim()) ||
    Boolean(morada.addressCity?.trim()) ||
    Boolean(morada.addressPostcode?.trim());
  if (!hasText && morada.addressLat == null && morada.addressLng == null) {
    return;
  }

  const mutation = `
    mutation updateOppServiceAddress($id: UUID!, $moradaDeServico: AddressObjectInput!) {
      updateOpportunity(id: $id, data: { moradaDeServico: $moradaDeServico }) {
        id
      }
    }
  `;
  const moradaDeServico = {
    addressStreet1: morada.addressStreet1 ?? "",
    addressStreet2: morada.addressStreet2 ?? "",
    addressCity: morada.addressCity ?? "",
    addressState: morada.addressState ?? "",
    addressPostcode: morada.addressPostcode ?? "",
    addressCountry: morada.addressCountry ?? "Portugal",
    addressLat: morada.addressLat ?? null,
    addressLng: morada.addressLng ?? null,
  };
  const result = await crmFetch(mutation, { id, moradaDeServico });
  await invalidateAdminCrmCache();
  return result;
}

export async function updateOpportunityCoordinates(id: string, lat: number, lng: number, existingAddress?: any) {
  const mutation = `
    mutation updateOppCoords($id: UUID!, $moradaDeServico: AddressObjectInput!) {
      updateOpportunity(id: $id, data: { moradaDeServico: $moradaDeServico }) {
        id
      }
    }
  `;
  const moradaInput: any = {
    addressLat: lat,
    addressLng: lng,
  };
  if (existingAddress) {
    if (existingAddress.addressStreet1) moradaInput.addressStreet1 = existingAddress.addressStreet1;
    if (existingAddress.addressStreet2) moradaInput.addressStreet2 = existingAddress.addressStreet2;
    if (existingAddress.addressCity) moradaInput.addressCity = existingAddress.addressCity;
    if (existingAddress.addressState) moradaInput.addressState = existingAddress.addressState;
    if (existingAddress.addressPostcode) moradaInput.addressPostcode = existingAddress.addressPostcode;
    if (existingAddress.addressCountry) moradaInput.addressCountry = existingAddress.addressCountry;
  }
  const result = await crmFetch(mutation, {
    id,
    moradaDeServico: moradaInput,
  });
  await invalidateAdminCrmCache();
  return result;
}

export async function getOpportunityClientRating(opportunityId: string): Promise<number | null> {
  const query = `
    query getOpportunityRating($id: UUID!) {
      opportunities(filter: { id: { eq: $id } }, first: 1) {
        edges {
          node {
            avaliacaoDoCliente
          }
        }
      }
    }
  `;

  const data = await crmFetch<{
    opportunities: { edges: Array<{ node: { avaliacaoDoCliente?: unknown } }> };
  }>(query, { id: opportunityId });

  return parseCrmClientRating(data.opportunities.edges[0]?.node?.avaliacaoDoCliente);
}

export async function submitServiceFeedback(opportunityId: string, rating: number, feedback: string) {
  const mutation = `
    mutation updateFeedback($id: UUID!, $rating: String, $feedback: String) {
      updateOpportunity(id: $id, data: { avaliacaoDoCliente: $rating, feedbackDoCliente: $feedback }) { 
        id 
      }
    }
  `;

  await crmFetch(mutation, {
    id: opportunityId,
    rating: formatCrmClientRating(rating),
    feedback,
  });

  return true;
}
