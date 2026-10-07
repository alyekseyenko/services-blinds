import "server-only";

import { crmFetch } from "./client";
import { CRM_ADDRESS_GRAPHQL_FIELDS } from "./contract";
import type { OpportunityServiceAddressInput } from "./opportunities";
import type { AdminClientSearchHit } from "@/lib/schemas/adminCommercialService";
import {
  normalizeCrmAddressInput,
  resolveServiceAddressPrefill,
} from "./personServiceAddressPrefill";

function formatPersonName(name?: { firstName?: string | null; lastName?: string | null }): string {
  const full = `${name?.firstName || ""} ${name?.lastName || ""}`.trim();
  return full || "Cliente";
}

function escapeIlikeFragment(raw: string): string {
  return raw.replace(/[%_\\]/g, "\\$&");
}

export async function searchPeopleForAdmin(
  query: string,
  limit = 12
): Promise<AdminClientSearchHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const pattern = `%${escapeIlikeFragment(trimmed)}%`;
  const first = Math.min(20, Math.max(1, limit));

  const data = await crmFetch<{
    people: {
      edges: Array<{
        node?: {
          id: string;
          name?: { firstName?: string | null; lastName?: string | null };
          emails?: { primaryEmail?: string | null };
          phones?: { primaryPhoneNumber?: string | null };
        };
      }>;
    };
  }>(
    `query searchPeopleForAdmin($filter: PersonFilterInput!, $first: Int!) {
      people(filter: $filter, first: $first, orderBy: { updatedAt: DescNullsLast }) {
        edges {
          node {
            id
            name { firstName lastName }
            emails { primaryEmail }
            phones { primaryPhoneNumber }
          }
        }
      }
    }`,
    {
      first,
      filter: {
        or: [
          { emails: { primaryEmail: { ilike: pattern } } },
          { name: { firstName: { ilike: pattern } } },
          { name: { lastName: { ilike: pattern } } },
        ],
      },
    },
    { timeoutMs: 12000, maxRetries: 1 }
  );

  const hits: AdminClientSearchHit[] = [];
  for (const edge of data.people.edges) {
    const node = edge.node;
    if (!node?.id) continue;
    hits.push({
      id: node.id,
      displayName: formatPersonName(node.name),
      email: node.emails?.primaryEmail || undefined,
      phone: node.phones?.primaryPhoneNumber || undefined,
    });
  }
  return hits;
}

export async function fetchPersonByIdForAdmin(personId: string): Promise<AdminClientSearchHit | null> {
  const data = await crmFetch<{
    people: {
      edges: Array<{
        node?: {
          id: string;
          name?: { firstName?: string | null; lastName?: string | null };
          emails?: { primaryEmail?: string | null };
          phones?: { primaryPhoneNumber?: string | null };
        };
      }>;
    };
  }>(
    `query personById($filter: PersonFilterInput!) {
      people(filter: $filter, first: 1) {
        edges {
          node {
            id
            name { firstName lastName }
            emails { primaryEmail }
            phones { primaryPhoneNumber }
          }
        }
      }
    }`,
    { filter: { id: { eq: personId } } }
  );

  const node = data.people.edges[0]?.node;
  if (!node?.id) return null;
  return {
    id: node.id,
    displayName: formatPersonName(node.name),
    email: node.emails?.primaryEmail || undefined,
    phone: node.phones?.primaryPhoneNumber || undefined,
  };
}

export async function fetchPersonClientAddress(
  personId: string
): Promise<OpportunityServiceAddressInput | null> {
  const data = await crmFetch<{
    people: {
      edges: Array<{
        node?: { morada?: OpportunityServiceAddressInput | null };
      }>;
    };
  }>(
    `query personClientAddress($filter: PersonFilterInput!) {
      people(filter: $filter, first: 1) {
        edges {
          node {
            morada {
              ${CRM_ADDRESS_GRAPHQL_FIELDS}
            }
          }
        }
      }
    }`,
    { filter: { id: { eq: personId } } }
  );

  const morada = data.people.edges[0]?.node?.morada;
  return normalizeCrmAddressInput(morada);
}

/** Latest moradaDeServico on a prior opportunity for this contact (fallback only). */
export async function fetchPersonLastOpportunityServiceAddress(
  personId: string
): Promise<OpportunityServiceAddressInput | null> {
  const data = await crmFetch<{
    opportunities: {
      edges: Array<{
        node?: {
          moradaDeServico?: OpportunityServiceAddressInput | null;
        };
      }>;
    };
  }>(
    `query personLastServiceAddress($filter: OpportunityFilterInput!) {
      opportunities(filter: $filter, first: 1, orderBy: { updatedAt: DescNullsLast }) {
        edges {
          node {
            moradaDeServico {
              ${CRM_ADDRESS_GRAPHQL_FIELDS}
            }
          }
        }
      }
    }`,
    { filter: { pointOfContactId: { eq: personId } } }
  );

  const morada = data.opportunities.edges[0]?.node?.moradaDeServico;
  return normalizeCrmAddressInput(morada);
}

/** Prefill for new admin service: Person.morada, else last opportunity service address. */
export async function fetchPersonDefaultServiceAddress(
  personId: string
): Promise<OpportunityServiceAddressInput | null> {
  const [clientMorada, lastServiceMorada] = await Promise.all([
    fetchPersonClientAddress(personId),
    fetchPersonLastOpportunityServiceAddress(personId),
  ]);
  return resolveServiceAddressPrefill(clientMorada, lastServiceMorada);
}
