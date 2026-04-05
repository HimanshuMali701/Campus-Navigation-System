-- Non-destructive schema improvement for custom campus map support
-- Run manually on PostgreSQL if your locations table already exists.

ALTER TABLE IF EXISTS campus_locations
  ADD COLUMN IF NOT EXISTS x NUMERIC,
  ADD COLUMN IF NOT EXISTS y NUMERIC,
  ADD COLUMN IF NOT EXISTS is_emergency_point BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS image_floor TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_campus_locations_name
  ON campus_locations (name);

CREATE INDEX IF NOT EXISTS idx_campus_locations_category
  ON campus_locations (category);
