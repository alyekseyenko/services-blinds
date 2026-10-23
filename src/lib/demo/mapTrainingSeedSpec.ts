import type { AdminCommercialServiceType } from "@/lib/schemas/adminCommercialService";

/** Stable marker in opportunity titles — used for idempotent CRM seeding. */
export const MAP_TRAINING_SEED_MARKER = "map-form";

export type MapTrainingSeedEntry = {
  id: string;
  city: string;
  postcode: string;
  street: string;
  lat: number;
  lng: number;
  serviceType: AdminCommercialServiceType;
};

/** ~20 unscheduled pins between Lourinhã and Nazaré (3–4 per locality). */
export const MAP_TRAINING_SEED_ENTRIES: MapTrainingSeedEntry[] = [
  {
    id: "lourinha-1",
    city: "Lourinhã",
    postcode: "2530-100",
    street: "Rua 5 de Outubro, 12",
    lat: 39.2418,
    lng: -9.3124,
    serviceType: "TIRAR_MEDIDAS",
  },
  {
    id: "lourinha-2",
    city: "Lourinhã",
    postcode: "2530-158",
    street: "Avenida Marquês de Pombal, 45",
    lat: 39.2451,
    lng: -9.3089,
    serviceType: "REPARACAO",
  },
  {
    id: "lourinha-3",
    city: "Lourinhã",
    postcode: "2530-193",
    street: "Rua da República, 8",
    lat: 39.2392,
    lng: -9.3167,
    serviceType: "MANUTENCAO",
  },
  {
    id: "lourinha-4",
    city: "Lourinhã",
    postcode: "2530-220",
    street: "Largo Mouzinho de Albuquerque, 3",
    lat: 39.2436,
    lng: -9.3201,
    serviceType: "TIRAR_MEDIDAS",
  },
  {
    id: "torres-1",
    city: "Torres Vedras",
    postcode: "2560-302",
    street: "Rua do Castelo, 14",
    lat: 39.0912,
    lng: -9.2584,
    serviceType: "INSTALACAO",
  },
  {
    id: "torres-2",
    city: "Torres Vedras",
    postcode: "2560-346",
    street: "Avenida 25 de Abril, 102",
    lat: 39.0887,
    lng: -9.2619,
    serviceType: "TIRAR_MEDIDAS",
  },
  {
    id: "torres-3",
    city: "Torres Vedras",
    postcode: "2560-389",
    street: "Rua Serpa Pinto, 27",
    lat: 39.0935,
    lng: -9.2541,
    serviceType: "REPARACAO",
  },
  {
    id: "peniche-1",
    city: "Peniche",
    postcode: "2520-193",
    street: "Rua Alexandre Herculano, 6",
    lat: 39.3558,
    lng: -9.3812,
    serviceType: "TIRAR_MEDIDAS",
  },
  {
    id: "peniche-2",
    city: "Peniche",
    postcode: "2520-206",
    street: "Avenida do Mar, 88",
    lat: 39.3589,
    lng: -9.3764,
    serviceType: "MANUTENCAO",
  },
  {
    id: "peniche-3",
    city: "Peniche",
    postcode: "2520-241",
    street: "Rua da Praça, 11",
    lat: 39.3531,
    lng: -9.3847,
    serviceType: "REMEDICAO",
  },
  {
    id: "caldas-1",
    city: "Caldas da Rainha",
    postcode: "2500-123",
    street: "Rua Heróis da Grande Guerra, 19",
    lat: 39.4028,
    lng: -9.1395,
    serviceType: "TIRAR_MEDIDAS",
  },
  {
    id: "caldas-2",
    city: "Caldas da Rainha",
    postcode: "2500-187",
    street: "Rua Rodrigues Lapa, 54",
    lat: 39.4056,
    lng: -9.1342,
    serviceType: "INSTALACAO",
  },
  {
    id: "caldas-3",
    city: "Caldas da Rainha",
    postcode: "2500-248",
    street: "Avenida 5 de Outubro, 210",
    lat: 39.3991,
    lng: -9.1418,
    serviceType: "REPARACAO",
  },
  {
    id: "caldas-4",
    city: "Caldas da Rainha",
    postcode: "2500-312",
    street: "Rua António Sérgio, 7",
    lat: 39.4073,
    lng: -9.1286,
    serviceType: "TIRAR_MEDIDAS",
  },
  {
    id: "obidos-1",
    city: "Óbidos",
    postcode: "2510-001",
    street: "Rua Direita, 42",
    lat: 39.3624,
    lng: -9.1568,
    serviceType: "TIRAR_MEDIDAS",
  },
  {
    id: "obidos-2",
    city: "Óbidos",
    postcode: "2510-086",
    street: "Rua da Porta da Vila, 5",
    lat: 39.3609,
    lng: -9.1594,
    serviceType: "MANUTENCAO",
  },
  {
    id: "nazare-1",
    city: "Nazaré",
    postcode: "2450-065",
    street: "Rua Mouzinho de Albuquerque, 16",
    lat: 39.6018,
    lng: -9.0712,
    serviceType: "TIRAR_MEDIDAS",
  },
  {
    id: "nazare-2",
    city: "Nazaré",
    postcode: "2450-106",
    street: "Avenida Manuel Remígio, 73",
    lat: 39.6045,
    lng: -9.0678,
    serviceType: "INSTALACAO",
  },
  {
    id: "nazare-3",
    city: "Nazaré",
    postcode: "2450-152",
    street: "Rua Adelaide Cabete, 9",
    lat: 39.5987,
    lng: -9.0741,
    serviceType: "REPARACAO",
  },
  {
    id: "nazare-4",
    city: "Nazaré",
    postcode: "2450-198",
    street: "Bairro dos Pescadores, Lote 4",
    lat: 39.6062,
    lng: -9.0635,
    serviceType: "TIRAR_MEDIDAS",
  },
];

export function mapTrainingSeedTitleToken(entryId: string): string {
  return `[${MAP_TRAINING_SEED_MARKER}-${entryId}]`;
}

export function opportunityTitleHasMapTrainingSeed(title: string | null | undefined): boolean {
  if (!title) return false;
  return title.includes(`[${MAP_TRAINING_SEED_MARKER}-`);
}
