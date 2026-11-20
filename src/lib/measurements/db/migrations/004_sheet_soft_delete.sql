ALTER TABLE measurement_sheet
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by_name TEXT;

CREATE INDEX IF NOT EXISTS measurement_sheet_active_opportunity_idx
  ON measurement_sheet (opportunity_id, version DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS measurement_sheet_deleted_at_idx
  ON measurement_sheet (deleted_at)
  WHERE deleted_at IS NOT NULL;
