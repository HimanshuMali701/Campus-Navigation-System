import { useState, useEffect } from 'react';
import { MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { geoAPI } from '../services/api';

/**
 * Nearby Facilities Component
 * Displays nearby locations, buildings, and pathways based on user location
 */
export default function NearbyFacilities({
  userLocation,
  selectedCategory = null,
  radiusMeters = 500,
  onSelectLocation = null,
  onShowBuildings = null,
  onShowPathways = null,
}) {
  const [nearbyLocations, setNearbyLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('locations'); // 'locations', 'buildings', 'pathways'
  const [buildingsData, setBuildingsData] = useState(null);
  const [pathwaysData, setPathwaysData] = useState(null);

  // Fetch nearby data when location or radius changes
  useEffect(() => {
    if (!userLocation?.latitude || !userLocation?.longitude) return;

    const fetchNearby = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch nearby locations
        const locResult = await geoAPI.getNearby(
          userLocation.latitude,
          userLocation.longitude,
          radiusMeters,
          10
        );

        if (locResult.success) {
          const filtered = selectedCategory
            ? locResult.data.filter(l => l.category === selectedCategory)
            : locResult.data;
          setNearbyLocations(filtered);
        }

        // Fetch nearby buildings
        const buildResult = await geoAPI.getNearbyBuildings(
          userLocation.latitude,
          userLocation.longitude,
          radiusMeters
        );
        if (buildResult.success) {
          setBuildingsData(buildResult.data);
        }

        // Fetch nearby pathways
        const pathResult = await geoAPI.getNearbyPathways(
          userLocation.latitude,
          userLocation.longitude,
          radiusMeters
        );
        if (pathResult.success) {
          setPathwaysData(pathResult.data);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch nearby facilities');
      } finally {
        setLoading(false);
      }
    };

    fetchNearby();
  }, [userLocation, radiusMeters, selectedCategory]);

  const renderLocations = () => {
    if (nearbyLocations.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No nearby locations found</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-2">
        {nearbyLocations.map(loc => (
          <div
            key={loc.id}
            className="rounded-lg border border-slate-200/80 p-3 hover:bg-slate-50 transition-colors cursor-pointer"
            onClick={() => onSelectLocation?.(loc)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900 truncate">{loc.name}</p>
                <p className="text-xs text-slate-500 capitalize">{loc.category}</p>
                {loc.distanceMeters != null && (
                  <p className="text-xs text-slate-600 mt-1">
                    📍 {loc.distanceMeters < 1000 
                      ? `${loc.distanceMeters}m away`
                      : `${(loc.distanceMeters / 1000).toFixed(1)}km away`}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="whitespace-nowrap">
                {(loc.distanceMeters ?? 0).toLocaleString()}m
              </Badge>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderBuildings = () => {
    if (!buildingsData?.features || buildingsData.features.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No nearby buildings found</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-2">
        {buildingsData.features.map((feature, idx) => (
          <div
            key={feature.id || idx}
            className="rounded-lg border border-slate-200/80 p-3 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900 truncate">
                  {feature.properties?.name || 'Building'}
                </p>
                {feature.properties?.category && (
                  <p className="text-xs text-slate-500 capitalize">
                    {feature.properties.category}
                  </p>
                )}
                {feature.properties?.areaM2 && (
                  <p className="text-xs text-slate-600 mt-1">
                    Area: {feature.properties.areaM2.toLocaleString()}m²
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => onShowBuildings?.(buildingsData)}
              >
                View Map
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPathways = () => {
    if (!pathwaysData?.features || pathwaysData.features.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No nearby pathways found</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-2">
        {pathwaysData.features.map((feature, idx) => (
          <div
            key={feature.id || idx}
            className="rounded-lg border border-slate-200/80 p-3 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900 truncate">
                  {feature.properties?.name || 'Pathway'}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge
                    variant="outline"
                    className="text-xs capitalize"
                  >
                    {feature.properties?.type || 'path'}
                  </Badge>
                  {feature.properties?.wheelchairAccessible && (
                    <Badge variant="secondary" className="text-xs">
                      ♿ Accessible
                    </Badge>
                  )}
                </div>
                {feature.properties?.lengthM && (
                  <p className="text-xs text-slate-600 mt-1">
                    Length: {feature.properties.lengthM.toLocaleString()}m
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => onShowPathways?.(pathwaysData)}
              >
                View Map
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const tabs = [
    { id: 'locations', label: 'Locations', count: nearbyLocations.length },
    { id: 'buildings', label: 'Buildings', count: buildingsData?.features?.length || 0 },
    { id: 'pathways', label: 'Pathways', count: pathwaysData?.features?.length || 0 },
  ];

  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Nearby Facilities</CardTitle>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
        </div>
        {radiusMeters && (
          <p className="text-xs text-slate-600 mt-1">
            Within {radiusMeters < 1000 ? `${radiusMeters}m` : `${(radiusMeters / 1000).toFixed(1)}km`}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-3 border-b border-slate-200/80">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading...
            </div>
          )}

          {!loading && (
            <>
              {activeTab === 'locations' && renderLocations()}
              {activeTab === 'buildings' && renderBuildings()}
              {activeTab === 'pathways' && renderPathways()}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
