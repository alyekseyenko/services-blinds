export interface WarehouseMeasurement {
  id: string;
  qty: number;
  width: number;
  height: number;
  notes?: string;
  fixation?: string;
  controls?: string;
  isPrepared: boolean;
  estadoDoArmazem?: string;
}

export interface WarehouseGroup {
  id: string;
  type: string;
  sheetId?: string;
  details?: {
    material?: string;
    model?: string;
    ral?: string;
    activation?: string;
    fabric?: string;
    reference?: string;
    observations?: string;
  };
  measurements: WarehouseMeasurement[];
}

export interface WarehouseService {
  id: string;
  title: string;
  nsi: string;
  serviceNumber?: string;
  client: string;
  createdAt: string;
  measurements?: {
    groups: WarehouseGroup[];
  };
}

export interface WarehouseStats {
  pending: number;
  fullyPrepared: number;
  withProblems: number;
}
