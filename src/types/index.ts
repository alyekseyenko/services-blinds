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
  /** Legado / export CRM — etiqueta da divisão. */
  fixation: string;
  controls: string;
  notes: string;
  price: string;
  divisionCode?: string;
  divisionCustom?: string;
  fixationCodes?: string;
  fixationCustom?: string;
  controlsCodes?: string;
  controlsCustom?: string;
  openingWidth?: string;
  openingHeight?: string;
  lineCollapsed?: string;
  /** Observações da linha (≠ divisão). */
  lineNotes?: string;
  skylightExteriorWidth?: string;
  skylightExteriorHeight?: string;
  depth?: string;
  storeChannel?: string;
  storeChannelOther?: string;
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
  compactPlacement?: string;
  compactMaterialType?: string;
  structureColor?: string;
  otherModel?: string;
  roloVariant?: string;
  otherRoloVariant?: string;
  manualType?: string;
  rtsCommandMode?: string;
  rtsChannelCount?: string;
  rtsMotorBrand?: string;
  otherRtsMotorBrand?: string;
  mosquitoOpening?: string;
  otherActivation?: string;
  exteriorInstallType?: string;
  partialPartCodes?: string;
  partialPartCustom?: string;
  customName?: string;
  remeasureNeeded?: string;
  remeasureNote?: string;
  esteiraMeasureTarget?: string;
}

export interface ProductGroup {
  id: number;
  type: ProductType;
  details: ProductGroupDetails;
  measurements: MeasurementRow[];
  isOpen?: boolean;
}

import type { VisitService } from "@/lib/schemas";

export interface Task {
  id: string;
  nsi: string;
  client: string;
  address: string;
  report?: string;
  opportunityId?: string;
  serviceType?: string;
  scheduledBy?: string;
  services?: VisitService[];
  stage?: string;
}
