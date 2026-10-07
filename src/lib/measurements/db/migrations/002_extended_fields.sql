ALTER TABLE measurement_group
  ADD COLUMN IF NOT EXISTS group_extra JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE measurement_line
  ADD COLUMN IF NOT EXISTS line_extra JSONB NOT NULL DEFAULT '{}'::jsonb;
