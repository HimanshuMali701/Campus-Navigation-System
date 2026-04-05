-- PostGIS geometry support for enhanced spatial queries
-- Run this after 001_add_custom_map_fields.sql
-- Requires: PostGIS and pgRouting extensions

-- Add PostGIS Point geometry column to existing locations
ALTER TABLE IF EXISTS campus_locations
  ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

-- Populate geometry from existing lat/lng if available
UPDATE campus_locations
  SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  WHERE lat IS NOT NULL AND lng IS NOT NULL AND geom IS NULL;

-- Create spatial index for performance
CREATE INDEX IF NOT EXISTS idx_campus_locations_geom
  ON campus_locations USING GiST(geom);

-- Create buildings table for storing building footprints
CREATE TABLE IF NOT EXISTS campus_buildings (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  geom geometry(Polygon, 4326) NOT NULL,
  centroid geometry(Point, 4326) GENERATED ALWAYS AS (ST_Centroid(geom)) STORED,
  area_m2 NUMERIC GENERATED ALWAYS AS (ST_Area(geom::geography)) STORED,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campus_buildings_geom
  ON campus_buildings USING GiST(geom);

CREATE INDEX IF NOT EXISTS idx_campus_buildings_name
  ON campus_buildings (name);

-- Create pathways/roads table
CREATE TABLE IF NOT EXISTS campus_pathways (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  type VARCHAR(100) DEFAULT 'path',
  geom geometry(LineString, 4326) NOT NULL,
  length_m NUMERIC GENERATED ALWAYS AS (ST_Length(geom::geography)) STORED,
  wheelchair_accessible BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campus_pathways_geom
  ON campus_pathways USING GiST(geom);

CREATE INDEX IF NOT EXISTS idx_campus_pathways_type
  ON campus_pathways (type);

-- Create zones table for area-based queries (e.g., academic zone, residential zone)
CREATE TABLE IF NOT EXISTS campus_zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) DEFAULT 'general',
  geom geometry(Polygon, 4326) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campus_zones_geom
  ON campus_zones USING GiST(geom);

-- Create route/network table for pgRouting
CREATE TABLE IF NOT EXISTS campus_network (
  id SERIAL PRIMARY KEY,
  source INTEGER,
  target INTEGER,
  geom geometry(LineString, 4326),
  cost NUMERIC DEFAULT 1,
  reverse_cost NUMERIC DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_campus_network_geom
  ON campus_network USING GiST(geom);

-- Add pgRouting topology (if pgRouting is available)
-- This should be run separately after initial data load
-- SELECT pgr_createTopology('campus_network', 0.00001, 'geom', 'id');
