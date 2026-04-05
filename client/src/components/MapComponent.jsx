import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { MapPin, Navigation, Clock, Phone, Mail, Globe } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { routesAPI } from '../services/api';

// Fix for default markers in React-Leaflet
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different POI categories
const createCustomIcon = (category, color = '#3b82f6') => {
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0z" fill="${color}"/>
        <circle cx="12.5" cy="12.5" r="6" fill="white"/>
      </svg>
    `)}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

// User location icon
const userLocationIcon = new Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8" fill="#3b82f6" stroke="white" stroke-width="2"/>
      <circle cx="10" cy="10" r="3" fill="white"/>
    </svg>
  `)}`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Category colors
const categoryColors = {
  library: '#8b5cf6',
  lab: '#06b6d4',
  cafeteria: '#f59e0b',
  parking: '#10b981',
  building: '#6b7280',
  dormitory: '#ec4899',
  sports: '#ef4444',
  admin: '#3b82f6',
  other: '#64748b',
};

// Component to handle map events and updates
const MapController = ({ center, zoom, selectedPOI }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedPOI) {
      map.setView([selectedPOI.coordinates.latitude, selectedPOI.coordinates.longitude], 17);
    }
  }, [selectedPOI, map]);

  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);

  return null;
};

const MapComponent = ({ 
  pois = [], 
  userLocation, 
  selectedPOI, 
  onPOISelect, 
  route,
  className = '',
  height = '500px' 
}) => {
  const [currentRoute, setCurrentRoute] = useState(route);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const mapRef = useRef();

  // Default center (New York area for demo)
  const defaultCenter = [40.7589, -73.9851];
  const mapCenter = selectedPOI 
    ? [selectedPOI.coordinates.latitude, selectedPOI.coordinates.longitude]
    : userLocation 
    ? [userLocation.latitude, userLocation.longitude]
    : defaultCenter;

  // Calculate route to selected POI
  const calculateRoute = async (poi) => {
    const parseIntId = (value) => {
      const raw = String(value ?? '').trim();
      if (!/^\d+$/.test(raw)) return null;
      const parsed = Number(raw);
      return Number.isSafeInteger(parsed) ? parsed : null;
    };

    const destinationId = parseIntId(poi?.id);
    const startCandidate = selectedPOI?.id ?? userLocation?.buildingId;
    const startId = parseIntId(startCandidate);

    if (startId == null || destinationId == null) {
      alert('Routing requires valid numeric building IDs for start and destination.');
      return;
    }

    setIsCalculatingRoute(true);
    try {
      const routeData = await routesAPI.calculate(startId, destinationId);
      
      if (routeData.success) {
        setCurrentRoute(routeData);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      alert('Failed to calculate route. Please try again.');
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Clear current route
  const clearRoute = () => {
    setCurrentRoute(null);
  };

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController 
          center={mapCenter} 
          selectedPOI={selectedPOI}
        />

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={userLocationIcon}
          >
            <Popup>
              <div className="text-center">
                <strong>Your Location</strong>
                <br />
                <small>Accuracy: ±{userLocation.accuracy}m</small>
              </div>
            </Popup>
          </Marker>
        )}

        {/* POI markers */}
        {pois.map((poi) => (
          <Marker
            key={poi._id}
            position={[poi.coordinates.latitude, poi.coordinates.longitude]}
            icon={createCustomIcon(poi.category, categoryColors[poi.category])}
            eventHandlers={{
              click: () => onPOISelect && onPOISelect(poi),
            }}
          >
            <Popup maxWidth={300}>
              <Card className="border-0 shadow-none">
                <CardContent className="p-0">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg">{poi.name}</h3>
                      <Badge variant="secondary" className="mt-1">
                        {poi.category}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600">{poi.description}</p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>{poi.address}</span>
                      </div>
                      
                      {poi.hours && (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>{poi.hours}</span>
                        </div>
                      )}
                      
                      {poi.contact?.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span>{poi.contact.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <Button 
                        size="sm" 
                        onClick={() => calculateRoute(poi)}
                        disabled={isCalculatingRoute}
                      >
                        <Navigation className="h-3 w-3 mr-1" />
                        {isCalculatingRoute ? 'Calculating...' : 'Directions'}
                      </Button>
                      
                      {onPOISelect && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onPOISelect(poi)}
                        >
                          Details
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Popup>
          </Marker>
        ))}

        {/* Route polyline */}
        {currentRoute && currentRoute.route && (
          <Polyline
            positions={currentRoute.route}
            color="#3b82f6"
            weight={4}
            opacity={0.8}
          />
        )}
      </MapContainer>

      {/* Route info panel */}
      {currentRoute && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-[1000]">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold">Route Information</h4>
            <Button size="sm" variant="ghost" onClick={clearRoute}>
              ×
            </Button>
          </div>
          <div className="space-y-1 text-sm">
            <p><strong>Distance:</strong> {currentRoute.distance}m</p>
            <p><strong>Duration:</strong> ~{Math.round(currentRoute.duration / 60)} min walk</p>
            <p><strong>Type:</strong> {currentRoute.type}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;

