import "server-only";

import { getAdminCommercialServiceLabel } from "@/lib/adminCommercialServiceOptions";
import { fetchAdminOpportunities } from "@/lib/crm/opportunities";
import { createAdminCommercialServiceOpportunity } from "@/lib/crm/pipelineTransitions";
import { searchPeopleForAdmin } from "@/lib/crm/people";
import type { AdminClientSearchHit } from "@/lib/schemas/adminCommercialService";
import {
  MAP_TRAINING_SEED_ENTRIES,
  mapTrainingSeedTitleToken,
  opportunityTitleHasMapTrainingSeed,
} from "@/lib/demo/mapTrainingSeedSpec";

export type SeedMapTrainingResult = {
  created: string[];
  skipped: string[];
  clientsUsed: { id: string; displayName: string }[];
  error?: string;
};

function isTestClientHit(hit: AdminClientSearchHit): boolean {
  const name = hit.displayName.trim();
  if (!name) return false;
  if (/cliente demo/i.test(name)) return true;
  if (/\bteste\b/i.test(name) || /\btest\b/i.test(name)) return true;
  if (hit.email && /\bdemo\b/i.test(hit.email)) return true;
  return false;
}

async function resolveTestClients(): Promise<AdminClientSearchHit[]> {
  const queries = ["demo", "teste", "test"];
  const byId = new Map<string, AdminClientSearchHit>();
  for (const q of queries) {
    const hits = await searchPeopleForAdmin(q, 40);
    for (const hit of hits) {
      if (!isTestClientHit(hit)) continue;
      byId.set(hit.id, hit);
    }
  }
  return [...byId.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, "pt"));
}

export async function seedMapTrainingOpportunitiesInCrm(): Promise<SeedMapTrainingResult> {
  const clients = await resolveTestClients();
  if (clients.length === 0) {
    return {
      created: [],
      skipped: [],
      clientsUsed: [],
      error:
        "Não foram encontrados clientes de teste no CRM (ex.: «Cliente Demo», email com «demo», ou nome com «teste»). Crie clientes antes de correr o seed.",
    };
  }

  const existing = await fetchAdminOpportunities();
  const existingTitles = new Set(
    existing
      .map((o) => o.title)
      .filter((t): t is string => Boolean(t) && opportunityTitleHasMapTrainingSeed(t))
  );

  const created: string[] = [];
  const skipped: string[] = [];

  for (let i = 0; i < MAP_TRAINING_SEED_ENTRIES.length; i++) {
    const entry = MAP_TRAINING_SEED_ENTRIES[i];
    const token = mapTrainingSeedTitleToken(entry.id);
    const already = [...existingTitles].some((title) => title.includes(token));
    if (already) {
      skipped.push(entry.id);
      continue;
    }

    const client = clients[i % clients.length];
    const serviceLabel = getAdminCommercialServiceLabel(entry.serviceType);
    const name = `${serviceLabel} — ${client.displayName} (${entry.city}) ${token}`;

    const createData: Record<string, unknown> = {
      name,
      pointOfContactId: client.id,
      disponibilidadeDoCliente: new Date().toISOString(),
      moradaDeServico: {
        addressStreet1: entry.street,
        addressStreet2: "",
        addressCity: entry.city,
        addressState: "",
        addressPostcode: entry.postcode,
        addressCountry: "Portugal",
        addressLat: entry.lat,
        addressLng: entry.lng,
      },
      notasImportantes: {
        markdown:
          "Serviço de formação no mapa (por agendar). Criado automaticamente — pode agendar ou apagar quando já não for necessário.",
      },
    };

    const opportunityId = await createAdminCommercialServiceOpportunity(
      createData,
      entry.serviceType
    );
    created.push(opportunityId);
    existingTitles.add(name);
  }

  return {
    created,
    skipped,
    clientsUsed: clients.map((c) => ({ id: c.id, displayName: c.displayName })),
  };
}
