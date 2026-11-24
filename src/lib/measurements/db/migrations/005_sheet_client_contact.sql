ALTER TABLE measurement_sheet
  ADD COLUMN IF NOT EXISTS client_nif TEXT,
  ADD COLUMN IF NOT EXISTS client_phone TEXT,
  ADD COLUMN IF NOT EXISTS client_email TEXT;