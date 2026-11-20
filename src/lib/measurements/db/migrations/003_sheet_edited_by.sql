ALTER TABLE measurement_sheet
  ADD COLUMN IF NOT EXISTS edited_by_name TEXT;
