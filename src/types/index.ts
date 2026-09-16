export type Role = "technician" | "warehouse" | "admin" | "ceo";

export interface UserSession {
  id: string;
  userId?: string;
  name: string;
  email: string;
  role: Role;
  twentyRoleLabel?: string;
}

export type ProductType = "ESTORE_EXTERIOR" | "ESTORE_INTERIOR" | "TOLDO" | "MOSQUITEIRO";

export interface MeasurementRow {
  qty: number | string;
  width: string;
  height: string;
  fixation: string;
  controls: string;
  notes: string;
  price: string;
}

export interface ProductGroupDetails {
  material: string;
  otherMaterial: string;
  ral: string;
  activation: string;
  model: string;
  fabric: string;
  reference: string;
  observations: string;
}

export interface ProductGroup {
  id: number;
  type: ProductType;
  details: ProductGroupDetails;
  measurements: MeasurementRow[];
  isOpen?: boolean;
}

export interface Task {
  id: string;
  nsi: string;
  client: string;
  address: string;
  report?: string;
  opportunityId?: string;
  serviceType?: string;
  scheduledBy?: string;
}
