export type ZonePriority = "Critical" | "High" | "Medium" | "Low";
export type ZoneImpact = ZonePriority;

export interface ZoneInsight {
  name: string;
  key: string;
  priority: ZonePriority;
  impact: ZoneImpact;
  count: number;
  distance: number;
  logisticsCost: number;
  score: number;
}

/** Twenty-aligned service marker keys (+ all). */
export type MapCategoryFilter =
  | "all"
  | "INSTALACAO"
  | "MANUTENCAO"
  | "REPARACAO"
  | "TIRAR_MEDIDAS"
  | "REMEDICAO";

export type MapStallFilter = "all" | "idle14" | "idle30";

export type { MapHistoryOutcome } from "@/lib/admin/mapHistoryStatus";

export interface RawAddress {
  addressStreet1?: string;
  addressStreet2?: string;
  addressCity?: string;
  addressState?: string;
  addressPostcode?: string;
  addressCountry?: string;
}

export interface Opportunity {
  id: string;
  twentyId: string;
  title: string;
  client: string;
  address: string;
  /** Rua, cidade e código postal, sem andar. O pin e o GPS usam esta linha. */
  navigationAddress?: string;
  coordinates: [number, number] | null;
  stage: string;
  status: string;
  scheduledAt: string | Date | null;
  /** Fim opcional da visita no Twenty (`horaDeFim` da task). */
  scheduledEndAt?: string | Date | null;
  /** Data da visita para o histórico. dueDate no mapa admin continua a ser a criação do serviço. */
  historyAt?: string | Date | null;
  dueDate: Date | null;
  hasScheduledTask: boolean;
  hasPendingProposal?: boolean;
  taskStatus: string;
  taskId: string;
  pointOfContactId?: string;
  pointOfContactEmail?: string;
  rawAddress?: RawAddress;
  addressCity?: string;
  report?: string;
  nsi?: string;
  /** Número de serviço automático do Twenty. O NSI continua manual. */
  serviceNumber?: string;
  serviceType?: string | string[];
  createdOnSite?: boolean;
  technician?: string;
  technicianId?: string | null;
  scheduledBy?: string;
  start?: Date;
  end?: Date;
  delayAlert?: 'red' | 'orange' | null;
  delayDays?: number;
  pointOfContactPhone?: string;
  pointOfContactPhones?: string[];
  /** NIF da pessoa de contacto (Twenty `nif`). */
  clientNif?: string | null;
  amount?: number;
  technicianReport?: string;
  clientRating?: number;
  clientFeedback?: string;
  /** ISO — «Cheguei ao local» na app. */
  visitArrivedAt?: string | null;
  /** ISO — encerramento (concluída / incompleta / cancelada). */
  visitClosedAt?: string | null;
  visitOnSiteDurationMs?: number | null;
  visitOnSiteDurationLabel?: string | null;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  isWorkspaceMember: boolean;
}

export interface RouteStop {
  id: string;
  twentyId: string;
  title: string;
  coordinates: [number, number];
  address: string;
  client: string;
  pointOfContactId?: string;
  pointOfContactEmail?: string;
  taskId?: string;
  rawAddress?: RawAddress;
  isReturn?: boolean;
}

export interface RouteData {
  distanceKm: number;
  durationMin: number;
  hasTolls: boolean;
}
