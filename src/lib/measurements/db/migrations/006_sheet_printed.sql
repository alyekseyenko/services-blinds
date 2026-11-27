ALTER TABLE measurement_sheet
  ADD COLUMN IF NOT EXISTS printed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS printed_by_name TEXT;

CREATE INDEX IF NOT EXISTS measurement_sheet_printed_at_idx
  ON measurement_sheet (printed_at)
  WHERE printed_at IS NOT NULL;
