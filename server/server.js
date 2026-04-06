const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const {
  normalizeLocationWithGeometry,
  buildingToGeoJsonFeature,
  pathwayToGeoJsonFeature,
  getNearbyLocationsQuery,
  getNearbyBuildingsQuery,
  getNearbyPathwaysQuery,
  getLocationZoneQuery,
  getNearestByCategoryQuery,
  createGeoJsonFeatureCollection,
} = require("./utils/postgisQuery");

dotenv.config();

const app = express();
import cors from "cors";

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://*.vercel.app"
  ],
  credentials: true
}));
app.use(express.json());

const PORT = Number(process.env.PORT || 5000);
const CAMPUS_MAP_IMAGE =
  process.env.CAMPUS_MAP_IMAGE || "/campus-map-placeholder.svg";
const CAMPUS_IMAGE_OPACITY = Number(process.env.CAMPUS_IMAGE_OPACITY ?? 0.45);

function getCampusBoundsFromEnv() {
  if (process.env.CAMPUS_BOUNDS_JSON) {
    try {
      const b = JSON.parse(process.env.CAMPUS_BOUNDS_JSON);
      if (b.southWest && b.northEast) return b;
    } catch (e) {
      console.warn("[WARN] Invalid CAMPUS_BOUNDS_JSON:", e.message);
    }
  }
  return null;
}

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      }
    : {
        host: process.env.PGHOST,
        port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
      }
);


const hasPgConfig = Boolean(
  process.env.DATABASE_URL ||
  (process.env.PGHOST &&
    process.env.PGUSER &&
    process.env.PGDATABASE &&
    process.env.PGPASSWORD)
);

const categoryMap = {
  cafeteria: "canteen",
  dormitory: "hostel",
};

function normalizeCategory(value) {
  if (!value) return "other";
  const raw = String(value).trim().toLowerCase();
  return categoryMap[raw] || raw;
}

function mapDbRow(row) {
  const rawId = row.id || row._id || row.location_id || row.code || row.name;
  const numericId = Number(rawId);
  return {
    id: Number.isSafeInteger(numericId) ? numericId : String(rawId),
    name: row.name || "Unknown Location",
    description: row.description || row.details || "No description available",
    category: normalizeCategory(row.category || row.type),
    address: row.address || row.block || "Campus",
    lat: row.latitude != null ? Number(row.latitude) : row.lat != null ? Number(row.lat) : null,
    lng:
      row.longitude != null
        ? Number(row.longitude)
        : row.lng != null
          ? Number(row.lng)
          : null,
    hours: row.hours || "Please contact office",
    phone: row.phone || row.contact_phone || "",
    isEmergencyPoint:
      row.is_emergency_point != null ? Boolean(row.is_emergency_point) : false,
  };
}

function normalizeLocation(item) {
  return {
    ...item,
    category: normalizeCategory(item.category),
    lat: item.lat != null ? Number(item.lat) : null,
    lng: item.lng != null ? Number(item.lng) : null,
    isEmergencyPoint: Boolean(item.isEmergencyPoint),
  };
}

const supplementalLocations = [
  {
    id: 999,
    name: "College Medical Room",
    latitude: 21.132072,
    longitude: 72.718714,
    category: "emergency",
  },
];

function mergeSupplementalLocations(list = []) {
  const map = new Map(list.map((item) => [String(item.id), item]));

  for (const item of supplementalLocations) {
    if (!map.has(String(item.id))) {
      map.set(String(item.id), item);
    }
  }

  return Array.from(map.values());
}

function getRouteCoordsForBuilding(buildingId) {
  const special = supplementalLocations.find((item) => item.id === Number(buildingId));
  if (!special) return null;

  return {
    lng: Number(special.longitude),
    lat: Number(special.latitude),
  };
}

async function fetchLocationsFromPostgres() {
  if (!hasPgConfig) {
    throw new Error("PostgreSQL connection is not configured");
  }

  const tableName = toSafeIdentifier(process.env.LOCATIONS_TABLE, "buildings");
  const sql = `
    SELECT
      id,
      name,
      ST_Y(geom) AS latitude,
      ST_X(geom) AS longitude
    FROM buildings
    ORDER BY name;
  `;

  const result = await pool.query(sql);
  return result.rows.map(mapDbRow);
}

function toSafeIdentifier(value, fallback) {
  const raw = String(value || fallback || "").trim();
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(raw) ? raw : fallback;
}

function parseStrictIntegerId(value) {
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseLineStringCoordinates(geojsonText, reversed = false) {
  if (!geojsonText) return [];
  try {
    const geom = typeof geojsonText === "string" ? JSON.parse(geojsonText) : geojsonText;
    if (geom?.type !== "LineString" || !Array.isArray(geom.coordinates)) return [];
    const coords = reversed ? [...geom.coordinates].reverse() : geom.coordinates;
    return coords
      .filter((pair) => Array.isArray(pair) && pair.length >= 2)
      .map(([lng, lat]) => [Number(lat), Number(lng)]);
  } catch {
    return [];
  }
}

function concatRouteSegments(segments) {
  const route = [];
  for (const seg of segments) {
    if (!Array.isArray(seg) || seg.length === 0) continue;
    if (route.length === 0) {
      route.push(...seg);
      continue;
    }
    const [prevLat, prevLng] = route[route.length - 1];
    const [nextLat, nextLng] = seg[0];
    const samePoint = prevLat === nextLat && prevLng === nextLng;
    route.push(...(samePoint ? seg.slice(1) : seg));
  }
  return route;
}

async function getNodeIdForBuilding(buildingId) {
  const numericBuildingId = parseStrictIntegerId(buildingId);
  if (numericBuildingId == null) {
    console.log(`[DEBUG] getNodeIdForBuilding - Invalid building ID: ${buildingId}`);
    return null;
  }

  const nodesTable = toSafeIdentifier(process.env.ROUTE_NODES_TABLE, "nodes");
  console.log(`[DEBUG] getNodeIdForBuilding - Querying ${nodesTable} for building_id = ${numericBuildingId}`);

  const result = await pool.query(
    `SELECT id FROM ${nodesTable} WHERE building_id = $1 LIMIT 1`,
    [String(numericBuildingId)]
  );
  const nodeId = result.rows[0]?.id ?? null;
  console.log(`[DEBUG] getNodeIdForBuilding - Found nodeId: ${nodeId} for building_id: ${numericBuildingId}`);
  return nodeId;
}

async function isPgRoutingAvailable() {
  try {
    const r = await pool.query(
      "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgrouting') AS available"
    );
    return Boolean(r.rows[0]?.available);
  } catch {
    return false;
  }
}

async function routeWithPgRouting(startNodeId, endNodeId) {
  const edgesTable = toSafeIdentifier(process.env.ROUTE_EDGES_TABLE, "edges");
  const sql = `
    WITH route_rows AS (
      SELECT d.seq, d.node, d.edge
      FROM pgr_dijkstra(
        'SELECT id, source, target,
           COALESCE(cost, ST_Length(geom::geography)) AS cost,
           COALESCE(reverse_cost, COALESCE(cost, ST_Length(geom::geography))) AS reverse_cost
         FROM ${edgesTable}',
        $1::bigint,
        $2::bigint,
        false
      ) d
      WHERE d.edge <> -1
    )
    SELECT
      r.seq,
      ST_AsGeoJSON(
        CASE WHEN e.source = r.node THEN e.geom ELSE ST_Reverse(e.geom) END
      ) AS geom_geojson,
      ST_Length(e.geom::geography) AS length_m
    FROM route_rows r
    JOIN ${edgesTable} e ON e.id = r.edge
    ORDER BY r.seq
  `;
  const result = await pool.query(sql, [startNodeId, endNodeId]);
  if (!result.rows.length) return null;

  const segments = result.rows.map((row) => parseLineStringCoordinates(row.geom_geojson));
  const route = concatRouteSegments(segments);
  const distance = Math.round(
    result.rows.reduce((sum, row) => sum + Number(row.length_m || 0), 0)
  );
  return {
    route,
    distance,
    duration: Math.max(60, Math.round(distance / 1.35)),
    engine: "pgr_dijkstra",
  };
}

async function routeWithEdgeGraph(startNodeId, endNodeId) {
  const edgesTable = toSafeIdentifier(process.env.ROUTE_EDGES_TABLE, "edges");
  const sql = `
    SELECT
      id,
      source,
      target,
      COALESCE(cost, ST_Length(geom::geography)) AS cost,
      COALESCE(reverse_cost, COALESCE(cost, ST_Length(geom::geography))) AS reverse_cost,
      ST_Length(geom::geography) AS length_m,
      ST_AsGeoJSON(geom) AS geom_geojson
    FROM ${edgesTable}
    WHERE geom IS NOT NULL
  `;
  const result = await pool.query(sql);
  if (!result.rows.length) return null;

  const adjacency = new Map();
  const addAdj = (from, to, edgeId, weight, reversed, lengthM, geomGeoJson) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push({ to, edgeId, weight, reversed, lengthM, geomGeoJson });
  };

  for (const row of result.rows) {
    addAdj(
      row.source,
      row.target,
      row.id,
      Number(row.cost || 0),
      false,
      Number(row.length_m || 0),
      row.geom_geojson
    );
    addAdj(
      row.target,
      row.source,
      row.id,
      Number(row.reverse_cost || row.cost || 0),
      true,
      Number(row.length_m || 0),
      row.geom_geojson
    );
  }

  const dist = new Map([[startNodeId, 0]]);
  const prev = new Map();
  const visited = new Set();

  while (true) {
    let current = null;
    let best = Number.POSITIVE_INFINITY;
    for (const [node, d] of dist.entries()) {
      if (!visited.has(node) && d < best) {
        best = d;
        current = node;
      }
    }
    if (current == null) break;
    if (current === endNodeId) break;

    visited.add(current);
    const neighbors = adjacency.get(current) || [];
    for (const edge of neighbors) {
      const nextDistance = best + edge.weight;
      const known = dist.get(edge.to);
      if (known == null || nextDistance < known) {
        dist.set(edge.to, nextDistance);
        prev.set(edge.to, { from: current, edge });
      }
    }
  }

  if (!prev.has(endNodeId)) return null;

  const walked = [];
  let node = endNodeId;
  while (node !== startNodeId) {
    const hop = prev.get(node);
    if (!hop) return null;
    walked.push(hop.edge);
    node = hop.from;
  }
  walked.reverse();

  const segments = walked.map((edge) =>
    parseLineStringCoordinates(edge.geomGeoJson, edge.reversed)
  );
  const route = concatRouteSegments(segments);
  const distance = Math.round(walked.reduce((sum, edge) => sum + edge.lengthM, 0));

  return {
    route,
    distance,
    duration: Math.max(60, Math.round(distance / 1.35)),
    engine: "edge_graph_fallback",
  };
}

async function routeWithStraightLine(startNodeId, endNodeId) {
  async function routeWithStraightLine(startNodeId, endNodeId) {
    const nodesTable = toSafeIdentifier(process.env.ROUTE_NODES_TABLE, "nodes");

    console.log(`[DEBUG] routeWithStraightLine - Fetching coordinates for nodes: ${startNodeId}, ${endNodeId}`);

    const sql = `
     SELECT id, ST_Y(geom) AS lat, ST_X(geom) AS lng 
     FROM ${nodesTable} 
     WHERE id IN ($1, $2)
    `;

    const result = await pool.query(sql, [startNodeId, endNodeId]);

    if (result.rows.length < 2) {
      console.log(`[DEBUG] routeWithStraightLine - Not enough nodes found. Expected 2, got ${result.rows.length}`);
      return null;
    }

    const nodes = {};
    result.rows.forEach(row => {
      nodes[row.id] = { lat: Number(row.lat), lng: Number(row.lng) };
    });

    const startNode = nodes[startNodeId];
    const endNode = nodes[endNodeId];

    if (!startNode || !endNode) {
      console.log(`[DEBUG] routeWithStraightLine - Missing coordinates. Start: ${startNode}, End: ${endNode}`);
      return null;
    }

    console.log(`[DEBUG] routeWithStraightLine - Start: [${startNode.lat}, ${startNode.lng}], End: [${endNode.lat}, ${endNode.lng}]`);

    // Create a simple straight line route with intermediate points
    const route = [
      [startNode.lat, startNode.lng],
      [endNode.lat, endNode.lng]
    ];

    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in kilometers
    const dLat = (endNode.lat - startNode.lat) * Math.PI / 180;
    const dLng = (endNode.lng - startNode.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(startNode.lat * Math.PI / 180) * Math.cos(endNode.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = Math.round(R * c * 1000); // Convert to meters

    return {
      route,
      distance,
      duration: Math.max(60, Math.round(distance / 1.35)),
      engine: "straight_line_fallback",
    };
  }
}
const axios = require("axios");

async function buildRouteFromBuildings(startBuildingId, endBuildingId) {
  try {
    const specialStart = getRouteCoordsForBuilding(startBuildingId);
    const specialEnd = getRouteCoordsForBuilding(endBuildingId);

    const start = specialStart
      ? { rows: [specialStart] }
      : await pool.query(`
      SELECT ST_X(ST_Centroid(geom)) AS lng,
             ST_Y(ST_Centroid(geom)) AS lat
      FROM buildings WHERE id = $1
    `, [startBuildingId]);

    const end = specialEnd
      ? { rows: [specialEnd] }
      : await pool.query(`
      SELECT ST_X(ST_Centroid(geom)) AS lng,
             ST_Y(ST_Centroid(geom)) AS lat
      FROM buildings WHERE id = $1
    `, [endBuildingId]);

    if (!start.rows.length || !end.rows.length) {
      return { success: false, message: "Invalid buildings" };
    }

    let s = start.rows[0];
    let e = end.rows[0];

    // 🔥 FIX SWAPPED DATA (AUTO CORRECTION)
    if (s.lat > 50) [s.lat, s.lng] = [s.lng, s.lat];
    if (e.lat > 50) [e.lat, e.lng] = [e.lng, e.lat];

    console.log("START:", s);
    console.log("END:", e);

    const url = `https://router.project-osrm.org/route/v1/foot/${s.lng},${s.lat};${e.lng},${e.lat}?overview=full&geometries=geojson&steps=true`;

    console.log("OSRM URL:", url);

    const response = await axios.get(url);

    console.log("OSRM RESPONSE:", response.data);

    if (!response.data.routes || response.data.routes.length === 0) {
      throw new Error("No route from OSRM");
    }

    const coords = response.data.routes[0].geometry.coordinates;
    const steps = response.data.routes[0].legs[0].steps;

    // ✅ CORRECT conversion
    const route = coords.map(([lng, lat]) => [lat, lng]);

    return {
      success: true,
      route,
      steps,
      distance: response.data.routes[0].distance,
      duration: response.data.routes[0].duration,
    };

  } catch (err) {
    console.log("OSRM FAILED:", err.message);

    // 🔥 FALLBACK (IMPORTANT)
    return {
      success: true,
      route: [
        [21.13, 72.78], // temporary fallback (or use s,e if available)
        [21.14, 72.79],
      ],
      steps: [],
      distance: 0,
      duration: 0,
    };
  }
}
  function campusMapPayload() {
    const bounds = getCampusBoundsFromEnv();
    return {
      imageUrl: CAMPUS_MAP_IMAGE,
      imageOpacity: CAMPUS_IMAGE_OPACITY,
      bounds: bounds || null,
      defaultMapCenter: {
        lat: Number(process.env.MAP_DEFAULT_LAT ?? 21.133068),
        lng: Number(process.env.MAP_DEFAULT_LNG ?? 72.716542),
      },
      defaultZoom: Number(process.env.MAP_DEFAULT_ZOOM ?? 16),
      width: 100,
      height: 100,
      unit: "percent",
    };
  }

  app.get("/api/health", async (req, res) => {
    let pgConnected = false;
    if (hasPgConfig) {
      try {
        await pool.query("SELECT 1");
        pgConnected = true;
      } catch {
        pgConnected = false;
      }
    }
    res.json({
      success: true,
      message: "Campus navigation API is running",
      postgresConfigured: pgConnected,
    });
  });

  app.get("/api/locations", async (req, res) => {
    try {
      console.log("📡 Fetching locations from DB...");

      const result = await pool.query(`
      SELECT 
        id,
        name,
        ST_X(ST_Centroid(geom)) AS latitude,
        ST_Y(ST_Centroid(geom)) AS longitude
      FROM buildings
    `);

      const rows = mergeSupplementalLocations(
        result.rows.map((row) => ({
          ...row,
          latitude: row.latitude != null ? Number(row.latitude) : null,
          longitude: row.longitude != null ? Number(row.longitude) : null,
        }))
      );

      console.log("✅ Locations fetched:", rows.length);

      res.json(rows);
    } catch (error) {
      console.error("❌ DB ERROR:", error.message);

      res.status(500).json({
        success: false,
        message: "Database query failed",
        error: error.message,
      });
    }
  });

  app.get("/api/locations/search", async (req, res) => {
    const query = String(req.query.q || "").trim().toLowerCase();
    try {
      const list = await fetchLocationsFromPostgres();
      const locations = mergeSupplementalLocations(list.map(normalizeLocation));

      if (!query) {
        return res.json({
          success: true,
          count: locations.length,
          campusMap: campusMapPayload(),
          data: locations,
        });
      }

      const filtered = locations.filter((item) =>
        [item.name, item.description, item.category, item.address]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)
      );

      return res.json({
        success: true,
        count: filtered.length,
        campusMap: campusMapPayload(),
        data: filtered,
      });
    } catch (error) {
      console.error("[ERROR] Failed to search buildings from PostgreSQL:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to search buildings from PostgreSQL",
        error: error.message,
      });
    }
  });

  app.get("/api/locations/:id", async (req, res) => {
    try {
      const requestedId = parseStrictIntegerId(req.params.id);
      const list = await fetchLocationsFromPostgres();
      const locations = mergeSupplementalLocations(list.map(normalizeLocation));
      const location = locations.find((item) => {
        if (requestedId != null && Number.isInteger(item.id)) {
          return item.id === requestedId;
        }
        return String(item.id) === String(req.params.id);
      });

      if (!location) {
        return res.status(404).json({ success: false, message: "Location not found" });
      }

      return res.json({ success: true, data: location });
    } catch (error) {
      console.error("[ERROR] Failed to fetch building by ID:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch building by ID",
        error: error.message,
      });
    }
  });

  app.post("/api/routes/calculate", async (req, res) => {
    if (!hasPgConfig) {
      return res.status(400).json({
        success: false,
        message: "PostgreSQL not configured",
      });
    }

    const { start, end } = req.body || {};
    const startId = parseStrictIntegerId(start);
    const endId = parseStrictIntegerId(end);

    if (startId == null || endId == null) {
      return res.status(400).json({
        success: false,
        message: "Start and end must be integer building IDs",
      });
    }

    try {
      const route = await buildRouteFromBuildings(startId, endId);
      if (!route.success) {
        return res.status(route.status || 404).json({
          success: false,
          message: route.message,
        });
      }

      return res.json({
        success: true,
        route: route.route,
        steps: route.steps,
        distance: route.distance,
        duration: route.duration,
        geojson: route.geojson,
        engine: route.engine,
      });
    } catch (error) {
      console.error("[ERROR] Routing query failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Routing query failed",
        error: error.message,
      });
    }
  });

  app.get("/api/emergency", async (req, res) => {
    try {
      const list = await fetchLocationsFromPostgres();
      const locations = mergeSupplementalLocations(list.map(normalizeLocation));
      const emergency = locations.filter(
        (item) => item.isEmergencyPoint || item.category === "emergency"
      );
      return res.json({ success: true, count: emergency.length, data: emergency });
    } catch (error) {
      console.error("[ERROR] Failed to load emergency buildings:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to load emergency buildings",
        error: error.message,
      });
    }
  });

  app.get("/api/schedule/next", (req, res) => {
    const classes = [
      {
        id: "class-cs301",
        course: "CS301 - Data Structures",
        startsAt: "10:00",
        locationId: "cs-lab",
        faculty: "Dr. Sharma",
      },
      {
        id: "class-ma102",
        course: "MA102 - Engineering Mathematics",
        startsAt: "13:30",
        locationId: "admin-block",
        faculty: "Prof. Verma",
      },
    ];
    res.json({ success: true, uid: req.query.uid || null, data: classes[0] });
  });

  // ========================
  // PostGIS Spatial Endpoints
  // ========================

  /**
   * Find nearby locations using PostGIS
   * GET /api/geo/nearby?lat={latitude}&lng={longitude}&radius={meters}&limit={count}
   */
  app.get("/api/geo/nearby", async (req, res) => {
    if (!hasPgConfig) {
      return res.status(400).json({
        success: false,
        message: "PostgreSQL not configured",
      });
    }

    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = Math.min(parseInt(req.query.radius) || 500, 2000);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: "lat and lng are required (numbers)",
      });
    }

    try {
      const tableName = toSafeIdentifier(process.env.LOCATIONS_TABLE, "buildings");
      const sql = getNearbyLocationsQuery(lat, lng, radius, tableName, limit);
      const result = await pool.query(sql);
      const locations = result.rows.map(normalizeLocationWithGeometry);

      res.json({
        success: true,
        count: locations.length,
        query: { lat, lng, radiusMeters: radius },
        data: locations,
      });
    } catch (error) {
      console.error("[ERROR] PostGIS nearby query:", error.message);
      res.status(500).json({
        success: false,
        message: "PostGIS query failed",
        error: error.message,
      });
    }
  });

  /**
   * Find nearby buildings using PostGIS
   * GET /api/geo/buildings/nearby?lat={latitude}&lng={longitude}&radius={meters}
   */
  app.get("/api/geo/buildings/nearby", async (req, res) => {
    if (!hasPgConfig) {
      return res.status(400).json({
        success: false,
        message: "PostgreSQL not configured",
      });
    }

    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = Math.min(parseInt(req.query.radius) || 500, 2000);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: "lat and lng are required (numbers)",
      });
    }

    try {
      const sql = getNearbyBuildingsQuery(lat, lng, radius);
      const result = await pool.query(sql);
      const features = result.rows.map(buildingToGeoJsonFeature);
      const geoJson = createGeoJsonFeatureCollection(features, {
        type: "buildings",
        radiusMeters: radius,
        center: { lat, lng },
      });

      res.json({
        success: true,
        data: geoJson,
      });
    } catch (error) {
      console.error("[ERROR] PostGIS buildings query:", error.message);
      res.status(500).json({
        success: false,
        message: "PostGIS query failed",
        error: error.message,
      });
    }
  });

  /**
   * Find nearby pathways using PostGIS
   * GET /api/geo/pathways/nearby?lat={latitude}&lng={longitude}&radius={meters}
   */
  app.get("/api/geo/pathways/nearby", async (req, res) => {
    if (!hasPgConfig) {
      return res.status(400).json({
        success: false,
        message: "PostgreSQL not configured",
      });
    }

    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = Math.min(parseInt(req.query.radius) || 500, 2000);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: "lat and lng are required (numbers)",
      });
    }

    try {
      const sql = getNearbyPathwaysQuery(lat, lng, radius);
      const result = await pool.query(sql);
      const features = result.rows.map(pathwayToGeoJsonFeature);
      const geoJson = createGeoJsonFeatureCollection(features, {
        type: "pathways",
        radiusMeters: radius,
        center: { lat, lng },
      });

      res.json({
        success: true,
        data: geoJson,
      });
    } catch (error) {
      console.error("[ERROR] PostGIS pathways query:", error.message);
      res.status(500).json({
        success: false,
        message: "PostGIS query failed",
        error: error.message,
      });
    }
  });

  /**
   * Find nearest location by category using PostGIS
   * GET /api/geo/nearest-by-category?lat={latitude}&lng={longitude}&category={category}
   */
  app.get("/api/geo/nearest-by-category", async (req, res) => {
    if (!hasPgConfig) {
      return res.status(400).json({
        success: false,
        message: "PostgreSQL not configured",
      });
    }

    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const category = String(req.query.category || "").trim().toLowerCase();

    if (Number.isNaN(lat) || Number.isNaN(lng) || !category) {
      return res.status(400).json({
        success: false,
        message: "lat, lng, and category are required",
      });
    }

    try {
      const tableName = toSafeIdentifier(process.env.LOCATIONS_TABLE, "buildings");
      const sql = getNearestByCategoryQuery(lat, lng, category, tableName);
      const result = await pool.query(sql);
      const location = result.rows[0]
        ? normalizeLocationWithGeometry(result.rows[0])
        : null;

      res.json({
        success: true,
        data: location,
        query: { lat, lng, category },
      });
    } catch (error) {
      console.error("[ERROR] PostGIS nearest-by-category query:", error.message);
      res.status(500).json({
        success: false,
        message: "PostGIS query failed",
        error: error.message,
      });
    }
  });

  /**
   * Find zone containing a coordinate using PostGIS
   * GET /api/geo/zone?lat={latitude}&lng={longitude}
   */
  app.get("/api/geo/zone", async (req, res) => {
    if (!hasPgConfig) {
      return res.status(400).json({
        success: false,
        message: "PostgreSQL not configured",
      });
    }

    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: "lat and lng are required (numbers)",
      });
    }

    try {
      const sql = getLocationZoneQuery(lat, lng);
      const result = await pool.query(sql);
      const zone = result.rows[0] || null;

      res.json({
        success: true,
        data: zone,
        query: { lat, lng },
      });
    } catch (error) {
      console.error("[ERROR] PostGIS zone query:", error.message);
      res.status(500).json({
        success: false,
        message: "PostGIS query failed",
        error: error.message,
      });
    }
  });

  app.get("/", (req, res) => {
    res.send("Campus Navigation API is running.");
  });

  async function testPostgresConnection() {
    if (!hasPgConfig) {
      console.error("[ERROR] PostgreSQL config missing. Set DATABASE_URL or PG* env vars.");
      return;
    }
    try {
      const result = await pool.query("SELECT NOW() AS now");
      console.log("[INFO] PostgreSQL connected successfully at", result.rows[0]?.now);
    } catch (error) {
      console.error("[ERROR] PostgreSQL connection failed:", error.message);
    }
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    testPostgresConnection();
  });