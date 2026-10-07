export type MeasurementSheetRow = {
  id: string;
  opportunity_id: string;
  task_id: string;
  version: number;
  status: string;
  client_request_id: string | null;
  technician_name: string | null;
  technician_user_id: string | null;
  client_name: string;
  nsi: string | null;
  address: string;
  service_label: string | null;
  visit_at: Date | null;
  created_at: Date;
};

export type MeasurementGroupRow = {
  id: string;
  sheet_id: string;
  sort_index: number;
  product_type: string;
  material: string | null;
  other_material: string | null;
  model: string | null;
  ral: string | null;
  fabric: string | null;
  reference: string | null;
  activation: string | null;
  observations: string | null;
  group_extra: Record<string, unknown> | null;
};

export type MeasurementLineRow = {
  id: string;
  group_id: string;
  sort_index: number;
  qty: string;
  width_mm: string;
  height_mm: string;
  division: string | null;
  fixation: string | null;
  controls: string | null;
  notes: string | null;
  price: string | null;
  is_prepared: boolean;
  warehouse_state: string;
  twenty_produto_id: string | null;
  line_extra: Record<string, unknown> | null;
};

export type PersistedMeasurementSheetMeta = {
  sheetId: string;
  version: number;
};

export type MeasurementSheetListEntry = {
  sheetId: string;
  opportunityId: string;
  version: number;
  clientName: string;
  nsi: string | null;
  address: string;
  technicianName: string | null;
  visitAt: string | null;
  createdAt: string;
  groupCount: number;
  unitCount: number;
  /** Soma das linhas quando todas têm preço válido; caso contrário `null`. */
  totalPriceEur: number | null;
};
