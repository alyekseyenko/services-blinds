import type { E2ECheckCategory } from "./e2eTypes";

export interface IntegrationSystem {
  id: string;
  label: string;
  category: E2ECheckCategory | "INFRA";
}

/** Sistemas que devem ter pelo menos uma verificação `system:<id>`. */
export const INTEGRATION_SYSTEMS: IntegrationSystem[] = [
  { id: "twenty-graphql", label: "Twenty CRM (GraphQL)", category: "CRM" },
  { id: "twenty-metadata", label: "Twenty metadata API", category: "CRM" },
  { id: "twenty-rest", label: "Twenty auth / REST", category: "CRM" },
  { id: "redis", label: "Redis (cache)", category: "INFRA" },
  { id: "app-data-dir", label: "Volume de dados da app", category: "INFRA" },
  { id: "outbox-drain", label: "Timer do outbox", category: "OUTBOX" },
  { id: "n8n-scheduling", label: "n8n — agendamentos", category: "N8N" },
  { id: "n8n-default", label: "n8n — notificações gerais", category: "N8N" },
  { id: "n8n-reports", label: "n8n — relatórios de serviço", category: "N8N" },
  { id: "geocoder", label: "Geocoding (Nominatim / Google)", category: "APP" },
  { id: "google-maps-key", label: "Chave Google Maps (cliente)", category: "APP" },
  { id: "app-version", label: "Versão / build da app", category: "APP" },
  { id: "public-portals", label: "Portais públicos (HMAC)", category: "PORTALS" },
  { id: "field-sync", label: "Sincronização dos técnicos", category: "APP" },
  { id: "location-store", label: "Localização da frota", category: "APP" },
];

export const INTEGRATION_SYSTEM_IDS = INTEGRATION_SYSTEMS.map((s) => s.id);
