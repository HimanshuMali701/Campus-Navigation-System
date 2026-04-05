import { GeoJSON, Popup } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import L from 'leaflet';

/**
 * GeoJSON Layer Component for displaying PostGIS geometries
 * Supports Points, LineStrings, and Polygons
 */
export default function GeoJSONLayer({ 
  data, 
  layerType = 'buildings', 
  onEachFeature,
  style,
  pointToLayer,
  className = ''
}) {
  const geoJsonRef = useRef();

  // Default styles for different geometry types
  const defaultStyles = {
    buildings: {
      color: '#8b5cf6',
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.3,
      fillColor: '#a78bfa',
    },
    pathways: {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.9,
      dashArray: '5, 5',
    },
    zones: {
      color: '#10b981',
      weight: 2,
      opacity: 0.7,
      fillOpacity: 0.15,
      fillColor: '#6ee7b7',
    },
  };

  // Default point styling
  const defaultPointToLayer = (feature, latlng) => {
    const props = feature.properties || {};
    return L.circleMarker(latlng, {
      radius: 6,
      fillColor: '#ec4899',
      color: '#fff',
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0.8,
      title: props.name || 'Location',
    });
  };

  // Default feature interaction
  const defaultOnEachFeature = (feature, layer) => {
    const props = feature.properties || {};
    const popupContent = `
      <div class="text-sm">
        <p class="font-semibold">${props.name || 'Feature'}</p>
        ${props.description ? `<p class="text-xs text-slate-600">${props.description}</p>` : ''}
        ${props.category ? `<p class="text-xs"><span class="font-medium">Category:</span> ${props.category}</p>` : ''}
        ${props.lengthM ? `<p class="text-xs"><span class="font-medium">Length:</span> ${props.lengthM}m</p>` : ''}
        ${props.areaM2 ? `<p class="text-xs"><span class="font-medium">Area:</span> ${props.areaM2}m²</p>` : ''}
      </div>
    `;
    layer.bindPopup(popupContent);
  };

  if (!data || (data.type === 'FeatureCollection' && (!data.features || data.features.length === 0))) {
    return null;
  }

  return (
    <GeoJSON
      ref={geoJsonRef}
      data={data}
      style={style || defaultStyles[layerType] || defaultStyles.buildings}
      pointToLayer={pointToLayer || defaultPointToLayer}
      onEachFeature={onEachFeature || defaultOnEachFeature}
      className={className}
    />
  );
}

/**
 * Create a circle marker layer for radius visualization
 * @param {L.Map} map - Leaflet map instance
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {number} radius - Radius in meters
 * @param {string} color - Circle color
 */
export function createRadiusCircle(map, lat, lng, radius = 500, color = '#3b82f6') {
  if (!map) return null;
  
  return L.circle([lat, lng], {
    color: color,
    fillColor: color,
    fillOpacity: 0.1,
    weight: 2,
    radius: radius,
    dashArray: '5, 5',
  }).addTo(map);
}

/**
 * Create a marker at the center of search
 * @param {L.Map} map - Leaflet map instance
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 */
export function createCenterMarker(map, lat, lng) {
  if (!map) return null;

  return L.marker([lat, lng], {
    icon: L.icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      `)}`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      className: 'text-blue-500',
    }),
  }).addTo(map);
}

/**
 * Highlight a feature on the map
 * @param {Object} feature - GeoJSON feature
 * @param {L.GeoJSON} geoJsonLayer - GeoJSON layer
 */
export function highlightFeature(feature, geoJsonLayer) {
  if (!geoJsonLayer || !feature) return;

  geoJsonLayer.eachLayer((layer) => {
    if (layer.feature === feature) {
      layer.setStyle({
        weight: 4,
        opacity: 1,
        fillOpacity: 0.6,
      });
      if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
      }
    } else {
      layer.setStyle({
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.3,
      });
    }
  });
}

/**
 * Clear highlight from GeoJSON layer
 * @param {L.GeoJSON} geoJsonLayer - GeoJSON layer
 */
export function resetHighlight(geoJsonLayer) {
  if (!geoJsonLayer) return;

  geoJsonLayer.eachLayer((layer) => {
    layer.setStyle({
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.3,
    });
  });
}
