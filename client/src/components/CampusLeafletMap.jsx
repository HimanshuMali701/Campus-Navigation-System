import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  ImageOverlay,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "./ui/button";
import {
  resolveOsmMarkerPosition,
  boundsCenter,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from "../utils/campusGeo";

delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const categoryColors = {
  library: "#7c3aed",
  lab: "#0891b2",
  canteen: "#d97706",
  cafeteria: "#d97706",
  parking: "#059669",
  building: "#64748b",
  hostel: "#db2777",
  dormitory: "#db2777",
  sports: "#dc2626",
  admin: "#2563eb",
  gate: "#0f172a",
  washroom: "#475569",
  emergency: "#dc2626",
  other: "#64748b",
};

const iconCache = new Map();

function makePinIcon(color, emphasized, isEmergency) {
  const key = `${color}-${emphasized ? "1" : "0"}-${isEmergency ? "e" : "n"}`;
  if (iconCache.has(key)) return iconCache.get(key);

  const pulse = isEmergency
    ? `<circle cx="14" cy="11" r="10" fill="none" stroke="#fecaca" stroke-width="2" opacity="0.9"/>`
    : "";
  const icon = new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
        ${pulse}
        <path fill="${color}" stroke="${emphasized ? "#1e3a8a" : "#ffffff"}" stroke-width="2"
          d="M14 0C6.8 0 1 5.4 1 12.1c0 8.2 13 23.9 13 23.9s13-15.7 13-23.9C27 5.4 21.2 0 14 0z"/>
        <circle cx="14" cy="12" r="4.5" fill="white"/>
      </svg>
    `)}`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -32],
  });
  iconCache.set(key, icon);
  return icon;
}

function isEmergencyLoc(loc) {
  return Boolean(loc.isEmergencyPoint || loc.category === "emergency");
}

function MapViewController({ selectedLatLng, bounds, locationsWithGps }) {
  const map = useMap();
  const didFit = useRef(false);

  useEffect(() => {
    if (selectedLatLng) {
      map.flyTo([selectedLatLng.latitude, selectedLatLng.longitude], 18, { duration: 0.55 });
      return;
    }
    if (!didFit.current && locationsWithGps.length > 0) {
      didFit.current = true;
      const latlngs = locationsWithGps.map((l) => [l.latitude, l.longitude]);
      map.fitBounds(latlngs, { padding: [48, 48], maxZoom: 17 });
    }
  }, [selectedLatLng, locationsWithGps, map]);

  useEffect(() => {
    if (
      locationsWithGps.length === 0 &&
      bounds?.southWest &&
      bounds?.northEast
    ) {
      map.fitBounds(
        [
          [bounds.southWest.lat, bounds.southWest.lng],
          [bounds.northEast.lat, bounds.northEast.lng],
        ],
        { padding: [24, 24], maxZoom: 17 }
      );
    }
  }, [bounds, locationsWithGps.length, map]);

  return null;
}

function FitBounds({ locations }) {
  const map = useMap();

  useEffect(() => {
    if (locations && locations.length > 0) {
      const bounds = locations.map(loc => [
        Number(loc.latitude),
        Number(loc.longitude)
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
    }
  }, [locations, map]);

  return null;
}

/**
 * OpenStreetMap (Leaflet) - markers only for rows with lat/lng from PostgreSQL.
 * Optional campus image overlay when bounds + imageUrl are configured.
 */
export default function CampusLeafletMap({
  locations = [],
  campusMap,
  selectedId,
  userLocation,
  onSelectLocation,
  routeLatLngs = null,
  onRequestRoute,
  className = "",
  heightClass = "min-h-[320px] h-[50vh] md:h-[calc(100vh-12rem)]",
}) {
  const bounds = campusMap?.bounds || null;
  const imageUrl = campusMap?.imageUrl || null;
  const imageOpacity = campusMap?.imageOpacity ?? 0.45;

  const mapCenterFromApi = campusMap?.defaultMapCenter;
  const apiZoom = campusMap?.defaultZoom;

  const withGps = useMemo(() => {
    return locations
      .map((loc) => {
        const pos = resolveOsmMarkerPosition(loc);
        if (!pos) return null;
        return {
          ...loc,
          latitude: pos.latitude,
          longitude: pos.longitude,
        };
      })
      .filter(Boolean);
  }, [locations]);

  const defaultCenter = useMemo(() => {
    if (mapCenterFromApi?.lat != null && mapCenterFromApi?.lng != null) {
      return [Number(mapCenterFromApi.lat), Number(mapCenterFromApi.lng)];
    }
    const c = boundsCenter(bounds);
    if (c) return [c.lat, c.lng];
    if (withGps[0]) return [withGps[0].latitude, withGps[0].longitude];
    return [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng];
  }, [mapCenterFromApi, bounds, withGps]);

  const initialZoom =
    typeof apiZoom === "number" && !Number.isNaN(apiZoom)
      ? apiZoom
      : DEFAULT_MAP_ZOOM;

  const selectedLatLng = useMemo(() => {
    const s = withGps.find((l) => l.id === selectedId);
    return s ? { latitude: s.latitude, longitude: s.longitude } : null;
  }, [withGps, selectedId]);

  const normalizedRouteLatLng = useMemo(() => {
    if (!Array.isArray(routeLatLngs)) return [];
    return routeLatLngs
      .map((point) => {
        if (!Array.isArray(point) || point.length < 2) return null;

        let lat = Number(point[0]);
        let lng = Number(point[1]);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        // Auto-correct accidental [lng, lat] points from GeoJSON-like sources.
        if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
          [lat, lng] = [lng, lat];
        }

        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

        return [lat, lng];
      })
      .filter(Boolean);
  }, [routeLatLngs]);

  const overlayBounds =
    bounds?.southWest && bounds?.northEast
      ? [
          [bounds.southWest.lat, bounds.southWest.lng],
          [bounds.northEast.lat, bounds.northEast.lng],
        ]
      : null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-sm ring-1 ring-slate-900/5 ${heightClass} ${className}`}
    >
      <MapContainer
        center={defaultCenter || [21.133, 72.717]}
        zoom={initialZoom || 15}
        className="z-0 h-full w-full"
        scrollWheelZoom
        zoomControl
        worldCopyJump
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {imageUrl && overlayBounds && (
          <ImageOverlay
            url={imageUrl}
            bounds={overlayBounds}
            opacity={imageOpacity}
          />
        )}

        <MapViewController
          selectedLatLng={selectedLatLng}
          bounds={bounds}
          locationsWithGps={withGps}
        />
        <FitBounds locations={withGps} />

        {withGps.map((loc) => {
          const em = isEmergencyLoc(loc);
          const baseColor = em
            ? categoryColors.emergency
            : categoryColors[loc.category] || categoryColors.other;
          const active = loc.id === selectedId;
          const icon = makePinIcon(baseColor, active, em);
          const lat = Number(loc.latitude);
          const lng = Number(loc.longitude);

          console.log("MARKER:", loc.name, lat, lng);

          return (
            <Marker
              key={loc.id}
              position={[lat, lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectLocation?.(loc),
              }}
            >
              <Popup>
                <div className="min-w-[200px] space-y-2">
                  <div>
                    <p className="font-semibold text-slate-900">{loc.name}</p>
                    <p className="text-xs capitalize text-slate-500">
                      {loc.category}
                      {em ? " · emergency" : ""}
                    </p>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-3">
                    {loc.description}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={() => onSelectLocation?.(loc)}
                    >
                      Details
                    </Button>
                    {onRequestRoute && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => onRequestRoute(loc)}
                      >
                        <Navigation className="mr-1 h-3 w-3" />
                        Route to
                      </Button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {normalizedRouteLatLng.length > 1 && (
          <>
            <Polyline
              positions={normalizedRouteLatLng}
              pathOptions={{
                color: "#2563eb",
                weight: 6,
              }}
            />
            <Polyline
              positions={normalizedRouteLatLng}
              pathOptions={{
                color: "#93c5fd",
                weight: 10,
                opacity: 0.3,
              }}
            />
          </>
        )}

        {userLocation?.latitude != null && userLocation?.longitude != null && (
          <CircleMarker
            center={[Number(userLocation.latitude), Number(userLocation.longitude)]}
            radius={8}
            pathOptions={{ color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.9, weight: 2 }}
          >
            <Popup>You are here</Popup>
          </CircleMarker>
        )}
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-3 z-[400] rounded-lg bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur-sm">
        <span className="inline-flex items-center gap-1 font-medium text-slate-800">
          <MapPin className="h-3.5 w-3.5 text-blue-600" />
          OpenStreetMap
        </span>
        {withGps.length > 0 && (
          <p className="mt-0.5 text-[10px] text-slate-500">
            {withGps.length} GPS pin{withGps.length !== 1 ? "s" : ""}
          </p>
        )}
        {imageUrl && overlayBounds && (
          <p className="mt-0.5 text-[10px] text-slate-500">+ campus plan</p>
        )}
      </div>
    </div>
  );
}
