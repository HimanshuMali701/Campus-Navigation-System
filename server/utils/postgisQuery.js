/**
 * PostGIS Spatial Query Utilities
 * Helper functions for PostGIS queries and GeoJSON serialization
 */

/**
 * Convert PostgreSQL geometry result to GeoJSON
 * @param {Object} geoJsonString - The ST_AsGeoJSON result from PostgreSQL
 * @returns {Object} GeoJSON object
 */
function parseGeoJsonFromPg(geoJsonString) {
  try {
    return typeof geoJsonString === "string"
      ? JSON.parse(geoJsonString)
      : geoJsonString;
  } catch {
    return null;
  }
}

/**
 * Convert database location row to include geometry
 * @param {Object} row - Database row
 * @returns {Object} Normalized location with geometry
 */
function normalizeLocationWithGeometry(row) {
  const rawId = row.id || row._id || row.location_id;
  const numericId = Number(rawId);
  return {
    id: Number.isInteger(numericId) ? numericId : String(rawId),
    name: row.name || "Unknown",
    description: row.description || "",
    category: row.category || "other",
    address: row.address || "",
    lat: row.lat != null ? Number(row.lat) : null,
    lng: row.lng != null ? Number(row.lng) : null,
    hours: row.hours || "",
    phone: row.phone || "",
    isEmergencyPoint: Boolean(row.is_emergency_point),
    geometry: parseGeoJsonFromPg(row.geom_geojson),
    distanceMeters: row.distance_m != null ? Math.round(Number(row.distance_m)) : null,
  };
}

/**
 * Convert building row to GeoJSON feature
 * @param {Object} row - Database row
 * @returns {Object} GeoJSON Feature
 */
function buildingToGeoJsonFeature(row) {
  const geometry = parseGeoJsonFromPg(row.geom_geojson);
  return {
    type: "Feature",
    id: row.id,
    properties: {
      id: row.id,
      name: row.name,
      category: row.category || "building",
      description: row.description || "",
      areaM2: row.area_m2 ? Math.round(Number(row.area_m2)) : null,
      metadata: row.metadata || {},
    },
    geometry: geometry,
  };
}

/**
 * Convert pathway row to GeoJSON feature
 * @param {Object} row - Database row
 * @returns {Object} GeoJSON Feature
 */
function pathwayToGeoJsonFeature(row) {
  const geometry = parseGeoJsonFromPg(row.geom_geojson);
  return {
    type: "Feature",
    id: row.id,
    properties: {
      id: row.id,
      name: row.name,
      type: row.type || "path",
      lengthM: row.length_m ? Math.round(Number(row.length_m)) : null,
      wheelchairAccessible: Boolean(row.wheelchair_accessible),
      metadata: row.metadata || {},
    },
    geometry: geometry,
  };
}

/**
 * Generate SQL for finding nearby locations using PostGIS
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusMeters - Search radius in meters
 * @param {string} tableName - Table name
 * @param {string} limit - Maximum results
 * @returns {string} SQL query
 */
function getNearbyLocationsQuery(lat, lng, radiusMeters = 500, tableName = "buildings", limit = 10) {
  return `
    SELECT 
      *,
      ST_AsGeoJSON(geom) as geom_geojson,
      ST_Distance(geom::geography, ST_MakePoint(${lng}, ${lat})::geography) as distance_m
    FROM ${tableName}
    WHERE geom IS NOT NULL
      AND ST_DWithin(geom::geography, ST_MakePoint(${lng}, ${lat})::geography, ${radiusMeters})
    ORDER BY distance_m ASC
    LIMIT ${limit}
  `;
}

/**
 * Generate SQL for buildings near a location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusMeters - Search radius in meters
 * @returns {string} SQL query
 */
function getNearbyBuildingsQuery(lat, lng, radiusMeters = 500) {
  return `
    SELECT 
      id,
      name,
      category,
      description,
      ST_AsGeoJSON(geom) as geom_geojson,
      area_m2,
      metadata,
      ST_DistanceSphere(centroid, ST_MakePoint(${lng}, ${lat})::geography) as distance_m
    FROM campus_buildings
    WHERE ST_DWithin(geom::geography, ST_MakePoint(${lng}, ${lat})::geography, ${radiusMeters})
    ORDER BY distance_m ASC
  `;
}

/**
 * Generate SQL for pathways near a location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusMeters - Search radius in meters
 * @returns {string} SQL query
 */
function getNearbyPathwaysQuery(lat, lng, radiusMeters = 500) {
  return `
    SELECT 
      id,
      name,
      type,
      ST_AsGeoJSON(geom) as geom_geojson,
      length_m,
      wheelchair_accessible,
      metadata,
      ST_DistanceSphere(ST_ClosestPoint(geom::geography, ST_MakePoint(${lng}, ${lat})::geography), ST_MakePoint(${lng}, ${lat})::geography) as distance_m
    FROM campus_pathways
    WHERE ST_DWithin(geom::geography, ST_MakePoint(${lng}, ${lat})::geography, ${radiusMeters})
    ORDER BY distance_m ASC
  `;
}

/**
 * Generate SQL for finding location within a zone
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} SQL query
 */
function getLocationZoneQuery(lat, lng) {
  return `
    SELECT z.id, z.name, z.type, z.description
    FROM campus_zones z
    WHERE ST_Contains(z.geom, ST_MakePoint(${lng}, ${lat}))
    LIMIT 1
  `;
}

/**
 * Generate SQL for finding nearest location by category
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} category - Location category
 * @returns {string} SQL query
 */
function getNearestByCategoryQuery(lat, lng, category, tableName = "buildings") {
  return `
    SELECT 
      *,
      ST_AsGeoJSON(geom) as geom_geojson,
      ST_Distance(geom::geography, ST_MakePoint(${lng}, ${lat})::geography) as distance_m
    FROM ${tableName}
    WHERE category = '${category.replace(/'/g, "''")}'
      AND geom IS NOT NULL
    ORDER BY distance_m ASC
    LIMIT 1
  `;
}

/**
 * Build GeoJSON FeatureCollection
 * @param {Array} features - Array of GeoJSON Feature objects
 * @param {Object} properties - Optional properties to add to FeatureCollection
 * @returns {Object} GeoJSON FeatureCollection
 */
function createGeoJsonFeatureCollection(features, properties = {}) {
  return {
    type: "FeatureCollection",
    features: features.filter(Boolean),
    properties: {
      count: features.filter(Boolean).length,
      ...properties,
    },
  };
}

module.exports = {
  parseGeoJsonFromPg,
  normalizeLocationWithGeometry,
  buildingToGeoJsonFeature,
  pathwayToGeoJsonFeature,
  getNearbyLocationsQuery,
  getNearbyBuildingsQuery,
  getNearbyPathwaysQuery,
  getLocationZoneQuery,
  getNearestByCategoryQuery,
  createGeoJsonFeatureCollection,
};
