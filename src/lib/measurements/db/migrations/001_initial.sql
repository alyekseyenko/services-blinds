-- Measurements bounded context (app-tecnicos)

CREATE TABLE IF NOT EXISTS measurement_sheet (
  id UUID PRIMARY KEY,
  opportunity_id UUID NOT NULL,
  task_id UUID NOT NULL,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  client_request_id TEXT,
  technician_name TEXT,
  technician_user_id TEXT,
  client_name TEXT NOT NULL,
  nsi TEXT,
  address TEXT NOT NULL DEFAULT '',
  service_label TEXT,
  visit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT measurement_sheet_opportunity_version_unique UNIQUE (opportunity_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS measurement_sheet_client_request_id_unique
  ON measurement_sheet (client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS measurement_sheet_opportunity_version_idx
  ON measurement_sheet (opportunity_id, version DESC);

CREATE TABLE IF NOT EXISTS measurement_group (
  id UUID PRIMARY KEY,
  sheet_id UUID NOT NULL REFERENCES measurement_sheet (id) ON DELETE CASCADE,
  sort_index INTEGER NOT NULL,
  product_type TEXT NOT NULL,
  material TEXT,
  other_material TEXT,
  model TEXT,
  ral TEXT,
  fabric TEXT,
  reference TEXT,
  activation TEXT,
  observations TEXT
);

CREATE INDEX IF NOT EXISTS measurement_group_sheet_idx ON measurement_group (sheet_id, sort_index);

CREATE TABLE IF NOT EXISTS measurement_line (
  id UUID PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES measurement_group (id) ON DELETE CASCADE,
  sort_index INTEGER NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 0,
  width_mm NUMERIC NOT NULL DEFAULT 0,
  height_mm NUMERIC NOT NULL DEFAULT 0,
  division TEXT,
  fixation TEXT,
  controls TEXT,
  notes TEXT,
  price TEXT,
  is_prepared BOOLEAN NOT NULL DEFAULT FALSE,
  warehouse_state TEXT NOT NULL DEFAULT 'EM_PREPARACAO',
  twenty_produto_id UUID
);

CREATE INDEX IF NOT EXISTS measurement_line_group_idx ON measurement_line (group_id, sort_index);
CREATE INDEX IF NOT EXISTS measurement_line_twenty_produto_idx ON measurement_line (twenty_produto_id);

CREATE TABLE IF NOT EXISTS measurements_outbox (
  id UUID PRIMARY KEY,
  sheet_id UUID NOT NULL REFERENCES measurement_sheet (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  client_request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  last_error TEXT,
  CONSTRAINT measurements_outbox_dedupe UNIQUE (event_type, sheet_id, client_request_id)
);

CREATE INDEX IF NOT EXISTS measurements_outbox_pending_idx
  ON measurements_outbox (created_at)
  WHERE processed_at IS NULL;
