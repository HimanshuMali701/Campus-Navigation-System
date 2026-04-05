/**
 * Campus geo helpers — OSM markers use real GPS only.
 * Normalized x/y is for the image overlay only (no projection onto the map).
 */

/** Default map view when no GPS pins / bounds (campus area). */
export const DEFAULT_MAP_CENTER = Object.freeze({
  lat: 21.133068,
  lng: 72.716542,
});
export const DEFAULT_MAP_ZOOM = 16;

export function hasGpsCoordinates(location) {
  if (!location) return false;
  const lat =
    location.latitude != null ? Number(location.latitude) : null;
  const lng =
    location.longitude != null ? Number(location.longitude) : null;
  return (
    lat != null &&
    lng != null &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng)
  );
}

/** Lat/lng for Leaflet markers — only when PostgreSQL has coordinates. */
export function resolveOsmMarkerPosition(location) {
  if (!hasGpsCoordinates(location)) return null;
  return {
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    source: "gps",
  };
}

export function boundsCenter(bounds) {
  if (!bounds?.southWest || !bounds?.northEast) return null;
  return {
    lat: (bounds.southWest.lat + bounds.northEast.lat) / 2,
    lng: (bounds.southWest.lng + bounds.northEast.lng) / 2,
  };
}

/** Haversine distance in meters (for “nearest emergency”, etc.) */
export function haversineDistanceMeters(a, b) {
  if (!hasGpsCoordinates(a) || !hasGpsCoordinates(b)) return Infinity;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

export function findNearestWithGps(origin, candidates) {
  if (!hasGpsCoordinates(origin) || !candidates?.length) return null;
  let best = null;
  let bestD = Infinity;
  for (const c of candidates) {
    if (!hasGpsCoordinates(c)) continue;
    const d = haversineDistanceMeters(origin, c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best ? { location: best, distanceM: Math.round(bestD) } : null;
}
