-- Routing graph schema for PostGIS-based building-to-building navigation
-- Required tables: nodes(building_id -> node id), edges(source/target graph links)

CREATE TABLE IF NOT EXISTS nodes (
  id SERIAL PRIMARY KEY,
  building_id TEXT UNIQUE,
  geom geometry(Point, 4326) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nodes_building_id
  ON nodes (building_id);

CREATE INDEX IF NOT EXISTS idx_nodes_geom
  ON nodes USING GiST (geom);

CREATE TABLE IF NOT EXISTS edges (
  id SERIAL PRIMARY KEY,
  source INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  geom geometry(LineString, 4326) NOT NULL,
  cost DOUBLE PRECISION,
  reverse_cost DOUBLE PRECISION,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT edges_no_self_loop CHECK (source <> target)
);

CREATE INDEX IF NOT EXISTS idx_edges_source
  ON edges (source);

CREATE INDEX IF NOT EXISTS idx_edges_target
  ON edges (target);

CREATE INDEX IF NOT EXISTS idx_edges_geom
  ON edges USING GiST (geom);

-- Fill missing edge costs from geometry length in meters
UPDATE edges
SET
  cost = COALESCE(cost, ST_Length(geom::geography)),
  reverse_cost = COALESCE(reverse_cost, COALESCE(cost, ST_Length(geom::geography)))
WHERE cost IS NULL OR reverse_cost IS NULL;
