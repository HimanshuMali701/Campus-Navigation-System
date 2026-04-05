# PostGIS Integration Guide

This document describes the PostGIS spatial query features added to the Campus Navigation System.

## Overview

The system now includes advanced PostGIS spatial capabilities for:
- Proximity searches (find locations/buildings/pathways nearby)
- Category-based nearest facility queries
- Zone/area detection
- GeoJSON geometry visualization on Leaflet maps

## Architecture

### Backend

#### New Database Tables (Migration 002)

1. **campus_locations** (enhanced)
   - Added: `geom geometry(Point, 4326)` - WGS84 point geometry
   - Added spatial index on `geom`
   - Automatically populated from existing `lat`/`lng` fields

2. **campus_buildings**
   - Stores building footprints as polygons
   - Includes: centroid, area calculation
   - Fields: id, name, category, description, geom, area_m2, metadata

3. **campus_pathways**
   - Stores walkways, roads, stairs as linestrings
   - Includes: wheelchair accessibility
   - Fields: id, name, type, geom, length_m, wheelchair_accessible

4. **campus_zones**
   - Defines campus areas/regions as polygons
   - Used for location containment queries
   - Fields: id, name, type, geom, description

5. **campus_network** (for pgRouting)
   - Graph structure for routing algorithms
   - Fields: id, source, target, geom, cost

#### Server Utilities

**File:** `server/utils/postgisQuery.js`

Provides PostGIS SQL query builders:
- `getNearbyLocationsQuery()` - Find locations within radius
- `getNearbyBuildingsQuery()` - Find nearby buildings
- `getNearbyPathwaysQuery()` - Find nearby pathways
- `getNearestByCategoryQuery()` - Find closest facility by type
- `getLocationZoneQuery()` - Find zone containing a point
- GeoJSON serialization helpers

#### API Endpoints

**Base URL:** `/api/geo`

1. **GET /geo/nearby**
   ```
   Query: lat, lng, radius (default 500m), limit (default 10)
   Returns: Array of nearby locations with distance
   ```

2. **GET /geo/buildings/nearby**
   ```
   Query: lat, lng, radius (default 500m)
   Returns: GeoJSON FeatureCollection of buildings
   ```

3. **GET /geo/pathways/nearby**
   ```
   Query: lat, lng, radius (default 500m)
   Returns: GeoJSON FeatureCollection of pathways
   ```

4. **GET /geo/nearest-by-category**
   ```
   Query: lat, lng, category
   Returns: Single nearest facility matching category
   ```

5. **GET /geo/zone**
   ```
   Query: lat, lng
   Returns: Zone/area containing the coordinate
   ```

### Frontend

#### New API Service Methods

**File:** `client/src/services/api.js`

Export: `geoAPI` object with methods:
- `getNearby(lat, lng, radius, limit)` - Get nearby locations
- `getNearbyBuildings(lat, lng, radius)` - Get nearby buildings GeoJSON
- `getNearbyPathways(lat, lng, radius)` - Get nearby pathways GeoJSON
- `getNearestByCategory(lat, lng, category)` - Get nearest facility
- `getZone(lat, lng)` - Get containing zone

#### New Components

1. **GeoJSONLayer Component**
   - File: `client/src/components/GeoJSONLayer.jsx`
   - Renders PostGIS geometries on Leaflet map
   - Supports automatic styling for buildings/pathways/zones
   - Interactive feature properties in popups

2. **NearbyFacilities Component**
   - File: `client/src/components/NearbyFacilities.jsx`
   - Displays nearby locations, buildings, pathways in tabbed interface
   - Shows distance and metadata for each feature
   - Integrates with map selection/highlighting

3. **RadiusSearch Component**
   - File: `client/src/components/RadiusSearch.jsx`
   - Interactive radius slider (100m - 2km)
   - Category filter buttons
   - Triggers spatial searches

## Usage Examples

### Backend SQL

```sql
-- Find locations within 500m
SELECT *,
  ST_DistanceSphere(geom, ST_MakePoint(72.716, 21.133)) as distance_m
FROM campus_locations
WHERE ST_DWithin(geom::geography, ST_MakePoint(72.716, 21.133)::geography, 500)
ORDER BY distance_m;

-- Find buildings intersecting a zone
SELECT b.* FROM campus_buildings b
WHERE ST_Intersects(b.geom, z.geom)
AND z.name = 'Academic Zone';

-- Find pathways near a point
SELECT * FROM campus_pathways
WHERE ST_DWithin(geom::geography, ST_MakePoint(72.716, 21.133)::geography, 200);
```

### Frontend Usage

```javascript
import { geoAPI } from '../services/api';

// Find nearby facilities
const result = await geoAPI.getNearby(21.133, 72.716, 500, 10);
console.log(result.data); // Array of locations with distances

// Find nearest library
const library = await geoAPI.getNearestByCategory(21.133, 72.716, 'library');
console.log(library.data); // Single location or null

// Get buildings as GeoJSON for map display
const buildings = await geoAPI.getNearbyBuildings(21.133, 72.716, 1000);
// Use with <GeoJSONLayer data={buildings.data} layerType="buildings" />

// Determine if point is in a zone
const zone = await geoAPI.getZone(21.133, 72.716);
console.log(zone.data?.name); // e.g., "Academic Zone"
```

## Integration with Map Component

To integrate PostGIS features into the Map page:

```jsx
import NearbyFacilities from '../components/NearbyFacilities';
import RadiusSearch from '../components/RadiusSearch';
import GeoJSONLayer from '../components/GeoJSONLayer';

// In Map component render:
<NearbyFacilities
  userLocation={userLocation}
  radiusMeters={searchRadius}
  onSelectLocation={selectPlace}
  onShowBuildings={setVisibleBuildings}
  onShowPathways={setVisiblePathways}
/>

<RadiusSearch
  userLocation={userLocation}
  onSearch={handleRadiusSearch}
  defaultRadius={500}
  maxRadius={2000}
/>

// Display buildings on map
{visibleBuildings && (
  <GeoJSONLayer
    data={visibleBuildings}
    layerType="buildings"
    onEachFeature={onBuildingFeature}
  />
)}
```

## Database Setup

### Run Migrations

```bash
# Apply PostGIS geometry enhancements
psql -U username -d campus_db -f migrations/002_add_postgis_geometry.sql
```

### Populate Sample Data

```sql
-- Add some test buildings
INSERT INTO campus_buildings (name, category, description, geom) VALUES
('Computer Science Building', 'academic', 'CS Department', 
  ST_Polygon(ST_GeomFromText('LINESTRING(72.7160 21.1330, 72.7162 21.1330, 72.7162 21.1332, 72.7160 21.1332, 72.7160 21.1330)', 4326)));

-- Create a zone
INSERT INTO campus_zones (name, type, geom) VALUES
('Academic Campus', 'academic',
  ST_Buffer(ST_MakePoint(72.7161, 21.1331)::geography, 500)::geometry);
```

## Performance Optimization

1. **Spatial Indexes**: Already created on all geometry columns (GiST)
2. **Query Optimization**:
   - Use `ST_DWithin()` with geography type for accurate distances
   - Always include `LIMIT` in result queries
   - Filter by category before spatial queries when possible

3. **Caching**: Consider caching commonly accessed zones and buildings

## Troubleshooting

### PostGIS Not Available
- Ensure PostgreSQL extension is installed: `CREATE EXTENSION IF NOT EXISTS postgis;`
- Verify migration ran successfully: `SELECT version();` in psql

### No Results from Spatial Queries
- Check that `geom` column is populated: `SELECT COUNT(*) FROM campus_locations WHERE geom IS NOT NULL;`
- Verify SRIDs match (should be 4326 WGS84): `SELECT ST_SRID(geom) FROM campus_locations;`
- Test with larger radius first: `SELECT * FROM campus_locations WHERE ST_DWithin(..., 2000);`

### Performance Issues
- Run `ANALYZE campus_locations;` after bulk inserts
- Check index usage: `EXPLAIN ANALYZE SELECT ...`
- Consider partial indexes for frequently filtered queries

## Next Steps

1. **Populate campus data**: Add real building footprints and pathways
2. **pgRouting integration**: Enable road network routing
3. **Advanced features**:
   - Isochrone maps (areas reachable in N minutes)
   - Shortest paths between locations
   - Accessibility routing (wheelchair-friendly paths)
4. **Real-time data**: Stream location updates using WebSockets
