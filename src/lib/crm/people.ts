import "server-only";

import { crmFetch } from "./client";
import { CRM_ADDRESS_GRAPHQL_FIELDS, CRM_FIELDS } from "./contract";
import type { OpportunityServiceAddressInput } from "./opportunities";
import type {
  AdminClientSearchHit,
  CreateAdminClientInput,
} from "@/lib/schemas/adminCommercialService";
import { normalizePhoneDigits } from "@/lib/crm/phones";
import { invalidateAdminCrmCache } from "@/lib/crmCache";
import { getTwentyPhoneCountry, formatTwentyPhoneNationalDigits } from "@/lib/twentyPhoneCountries";
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

function buildPeopleSearchOrFilters(trimmed: string, pattern: string): Record<string, unknown>[] {
  const or: Record<string, unknown>[] = [
    { emails: { primaryEmail: { ilike: pattern } } },
    { name: { firstName: { ilike: pattern } } },
    { name: { lastName: { ilike: pattern } } },
  ];
  const digits = normalizePhoneDigits(trimmed);
  if (digits.length >= 3) {
    const tail = digits.length > 9 ? digits.slice(-9) : digits;
    or.push({ phones: { primaryPhoneNumber: { ilike: `%${tail}%` } } });
  }
  return or;
}

function nodeToAdminClientHit(node: {
  id: string;
  name?: { firstName?: string | null; lastName?: string | null };
  emails?: { primaryEmail?: string | null };
  phones?: { primaryPhoneNumber?: string | null; primaryPhoneCallingCode?: string | null };
}): AdminClientSearchHit {
  const calling = node.phones?.primaryPhoneCallingCode?.trim() || "";
  const number = node.phones?.primaryPhoneNumber?.trim() || "";
  const phone =
    number && calling ? `${calling} ${number}`.trim() : number || undefined;
  return {
    id: node.id,
    displayName: formatPersonName(node.name),
    email: node.emails?.primaryEmail || undefined,
    phone,
  };
}

export async function findPersonByEmailForAdmin(
  email: string
): Promise<AdminClientSearchHit | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const data = await crmFetch<{
    people: { edges: Array<{ node?: { id: string; name?: unknown; emails?: unknown; phones?: unknown } }> };
  }>(
    `query findPersonByEmail($filter: PersonFilterInput!) {
      people(filter: $filter, first: 1) {
        edges {
          node {
            id
            name { firstName lastName }
            emails { primaryEmail }
            phones { primaryPhoneNumber primaryPhoneCallingCode }
          }
        }
      }
    }`,
    { filter: { emails: { primaryEmail: { ilike: normalized } } } },
    { timeoutMs: 10000, maxRetries: 0 }
  );

  const node = data.people.edges[0]?.node;
  if (!node?.id) return null;
  return nodeToAdminClientHit(node as Parameters<typeof nodeToAdminClientHit>[0]);
}

export async function findPersonByPhoneForAdmin(
  phoneRaw: string
): Promise<AdminClientSearchHit | null> {
  const digits = normalizePhoneDigits(phoneRaw);
  if (digits.length < 9) return null;
  const tail = digits.slice(-9);

  const data = await crmFetch<{
    people: { edges: Array<{ node?: { id: string; name?: unknown; emails?: unknown; phones?: unknown } }> };
  }>(
    `query findPersonByPhone($filter: PersonFilterInput!) {
      people(filter: $filter, first: 5) {
        edges {
          node {
            id
            name { firstName lastName }
            emails { primaryEmail }
            phones { primaryPhoneNumber primaryPhoneCallingCode }
          }
        }
      }
    }`,
    { filter: { phones: { primaryPhoneNumber: { ilike: `%${tail}%` } } } },
    { timeoutMs: 10000, maxRetries: 0 }
  );

  for (const edge of data.people.edges) {
    const node = edge.node;
    if (!node?.id) continue;
    const nodeDigits = normalizePhoneDigits(
      (node as { phones?: { primaryPhoneNumber?: string } }).phones?.primaryPhoneNumber || ""
    );
    if (nodeDigits.endsWith(tail)) {
      return nodeToAdminClientHit(node as Parameters<typeof nodeToAdminClientHit>[0]);
    }
  }
  return null;
}

function buildPersonMoradaPayload(morada: CreateAdminClientInput["morada"]) {
  const payload: Record<string, unknown> = {
    addressStreet1: morada.addressStreet1.trim(),
    addressStreet2: morada.addressStreet2?.trim() || "",
    addressCity: morada.addressCity.trim(),
    addressState: morada.addressState?.trim() || "",
    addressPostcode: morada.addressPostcode?.trim() || "",
    addressCountry: morada.addressCountry?.trim() || "Portugal",
  };
  if (morada.addressLat != null && morada.addressLng != null) {
    payload.addressLat = morada.addressLat;
    payload.addressLng = morada.addressLng;
  }
  return payload;
}

export async function createPersonForAdmin(
  input: CreateAdminClientInput
): Promise<AdminClientSearchHit> {
  const email = input.email?.trim().toLowerCase();
  const phoneCountry = getTwentyPhoneCountry(input.phoneCountryCode || "PT");
  const national = formatTwentyPhoneNationalDigits(input.phoneNational);

  if (email) {
    const existingEmail = await findPersonByEmailForAdmin(email);
    if (existingEmail) {
      throw new Error("Já existe um cliente com este e-mail no CRM.");
    }
  }
  if (national) {
    const existingPhone = await findPersonByPhoneForAdmin(national);
    if (existingPhone) {
      throw new Error("Já existe um cliente com este telefone no CRM.");
    }
  }

  const nifValue = input.nif.trim();
  if (!/^\d{9}$/.test(nifValue)) {
    throw new Error("NIF inválido.");
  }

  const createData: Record<string, unknown> = {
    name: {
      firstName: input.firstName.trim(),
      lastName: input.lastName?.trim() || "",
    },
    [CRM_FIELDS.person.nif]: nifValue,
    [CRM_FIELDS.person.morada]: buildPersonMoradaPayload(input.morada),
    [CRM_FIELDS.person.clientType]: [input.clientType],
    phones: {
      primaryPhoneCountryCode: phoneCountry.countryCode,
      primaryPhoneCallingCode: phoneCountry.callingCode,
      primaryPhoneNumber: national,
    },
  };
  if (email) {
    createData.emails = { primaryEmail: email };
  }

  const data = await crmFetch<{ createPerson: { id: string } }>(
    `mutation createAdminPerson($data: PersonCreateInput!) {
      createPerson(data: $data) { id }
    }`,
    { data: createData },
    { timeoutMs: 15000, maxRetries: 0 }
  );

  const personId = data.createPerson?.id;
  if (!personId) {
    throw new Error("Não foi possível criar o cliente no CRM.");
  }

  await invalidateAdminCrmCache();

  const created = await fetchPersonByIdForAdmin(personId);
  if (!created) {
    return {
      id: personId,
      displayName: `${input.firstName.trim()} ${input.lastName?.trim() || ""}`.trim(),
      email: email || undefined,
      phone: national ? `${phoneCountry.callingCode} ${national}` : undefined,
    };
  }
  return created;
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
        or: buildPeopleSearchOrFilters(trimmed, pattern),
      },
    },
    { timeoutMs: 12000, maxRetries: 1 }
  );

  const hits: AdminClientSearchHit[] = [];
  for (const edge of data.people.edges) {
    const node = edge.node;
    if (!node?.id) continue;
    hits.push(nodeToAdminClientHit(node));
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
