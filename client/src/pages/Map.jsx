import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  Crosshair,
  MapPinned,
  Navigation,
  Phone,
  Search,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../hooks/use-mobile";
import {
  emergencyAPI,
  locationAPI,
  routesAPI,
  scheduleAPI,
} from "../services/api";
import {
  findNearestWithGps,
  hasGpsCoordinates,
} from "../utils/campusGeo";
import { getCurrentPosition, isGeolocationAvailable } from "../utils/geolocation";
import { normalizeCampusLocationName } from "../utils/locationNaming";
import { toast } from "sonner";

const CampusLeafletMap = lazy(() => import("../components/CampusLeafletMap"));

function parseBuildingId(value) {
  if (!value) return null;
  return Number(value);
}

function MapSkeleton() {
  return (
    <div className="flex min-h-[320px] h-[50vh] md:h-[calc(100vh-12rem)] items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-100">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="text-sm text-slate-600">Loading OpenStreetMap…</p>
      </div>
    </div>
  );
}

const Map = () => {
  const [params] = useSearchParams();
  const routerLocation = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const pendingAutoRouteRef = useRef(null);

  const [allLocations, setAllLocations] = useState([]);
  const [campusMap, setCampusMap] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [routeFromId, setRouteFromId] = useState(null);
  const [routeToId, setRouteToId] = useState(null);
  const [emergencyToggle, setEmergencyToggle] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(params.get("category") || "all");
  const [routeLatLng, setRouteLatLng] = useState(null);
  const [loading, setLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);
  const [nextClass, setNextClass] = useState(null);
  const [emergencyList, setEmergencyList] = useState([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [userGeo, setUserGeo] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const selectPlace = useCallback((id) => {
    const parsedId = parseBuildingId(id);
    if (parsedId == null) return;
    setSelectedId(parsedId);
    setRouteToId(parsedId);
  }, []);

  const load = useCallback(async () => {
  setLoading(true);
  try {
    const locRes = await locationAPI.getAll();

    console.log("RAW RESPONSE:", locRes);

    // 🔥 FIX: handle axios or fetch both
    const locations = locRes?.data || locRes || [];

    console.log("PARSED LOCATIONS:", locations);

    const list = locations.map((item) => ({
      ...item,
      id: parseBuildingId(item.id),
      name: normalizeCampusLocationName(item.name, item.id),
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
    }));

    console.log("FINAL LIST:", list);

    setAllLocations(list);

    // OPTIONAL (avoid crash)
    // setCampusMap(null);

  } catch (error) {
    console.error("LOAD ERROR:", error);
    toast.error("Could not load campus data. Check API and database.");
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    console.log("[Map] locations state:", allLocations);
  }, [allLocations]);

  useEffect(() => {
    const cat = params.get("category");
    if (cat) setCategory(cat);
  }, [params]);

  useEffect(() => {
    const autoRouteTo = parseBuildingId(routerLocation.state?.autoRouteTo);
    if (autoRouteTo == null || !allLocations.length) return;

    const hasTarget = allLocations.some((loc) => loc.id === autoRouteTo);
    if (!hasTarget) return;

    setSelectedId(autoRouteTo);
    setRouteToId(autoRouteTo);
    pendingAutoRouteRef.current = autoRouteTo;
  }, [routerLocation.state, allLocations]);

  const firstGpsLocation = useMemo(
    () => allLocations.find((l) => hasGpsCoordinates(l)),
    [allLocations]
  );

  useEffect(() => {
    if (!allLocations.length || routeFromId != null) return;

    const gate = allLocations.find(
      (loc) => loc.name === "College Gate Entrance"
    );

    if (gate) {
      setRouteFromId(gate.id);
    }
  }, [allLocations, routeFromId]);

  const filtered = useMemo(() => {
    return allLocations.filter((item) => {
      const categoryMatch = category === "all" || item.category === category;
      const q = query.trim().toLowerCase();
      const text =
        `${item.name} ${item.category} ${item.description} ${item.address}`.toLowerCase();
      const queryMatch = !q || text.includes(q);
      return categoryMatch && queryMatch;
    });
  }, [allLocations, category, query]);

  const selectedLocation = useMemo(() => {
    return (
      allLocations.find((item) => item.id === selectedId) ||
      filtered[0] ||
      null
    );
  }, [allLocations, filtered, selectedId]);

  const categories = useMemo(
    () => ["all", ...new Set(allLocations.map((item) => item.category))],
    [allLocations]
  );

  const nearestEmergency = useMemo(() => {
    if (!userGeo) return null;
    return findNearestWithGps(
      { latitude: userGeo.latitude, longitude: userGeo.longitude },
      emergencyList
    );
  }, [userGeo, emergencyList]);

  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;

        console.log("USER LOCATION:", latitude, longitude);
        setUserGeo({ latitude, longitude });
        setGeoLoading(false);
      },
      (err) => {
        console.error(err);
        toast.error("Location access denied");
        setGeoLoading(false);
      }
    );
  };

const calculateRoute = useCallback(async (nextRouteToId = null, nextRouteFromId = null) => {
  const startId = Number(nextRouteFromId ?? routeFromId);
  const endId = Number(nextRouteToId ?? routeToId);

  console.log("FINAL IDS:", { startId, endId });

  if (!startId || !endId || isNaN(startId) || isNaN(endId)) {
    toast.message("Choose both start and end for routing.");
    return;
  }

  setRouteLoading(true);
  setRouteLatLng(null);

  try {
    const routeData = await routesAPI.calculate(startId, endId);

    if (!routeData?.route?.length) {
      toast.error(routeData?.message || "Could not build route.");
      return;
    }

    setRouteLatLng(routeData.route);
    toast.success("Route updated");
  } catch {
    toast.error("Route request failed");
  } finally {
    setRouteLoading(false);
  }
}, [routeFromId, routeToId]);

  useEffect(() => {
    if (routeFromId == null || pendingAutoRouteRef.current == null) return;
    const targetId = pendingAutoRouteRef.current;
    pendingAutoRouteRef.current = null;
    calculateRoute(targetId);
  }, [routeFromId, calculateRoute]);

  const focusEmergency = () => {
    setCategory("emergency");
    const gpsEmerg = emergencyList.find((e) => hasGpsCoordinates(e));
    const pick = gpsEmerg || emergencyList[0] ||
      allLocations.find((l) => l.isEmergencyPoint || l.category === "emergency");
    if (pick) {
      selectPlace(pick.id);
      if (isMobile) setSheetOpen(true);
    } else {
      toast.message("No emergency points in database yet.");
    }
  };

  const handleEmergency = () => {
    const emergencyNames = ["Admin Block", "College Medical Room"];

    const targetName = emergencyToggle
      ? emergencyNames[0]
      : emergencyNames[1];

    setEmergencyToggle(!emergencyToggle);

    const target = allLocations.find((loc) => loc.name === targetName);

    console.log("EMERGENCY TARGET:", target);

    if (!target) {
      alert("Emergency location not found");
      return;
    }

    setSelectedId(target.id);
    setRouteToId(target.id);

    const startId = routeFromId || allLocations[0]?.id;

    setRouteFromId(startId);

    calculateRoute(target.id, startId);
  };

  const goToNearestEmergency = () => {
    if (!nearestEmergency) {
      requestUserLocation();
      return;
    }
    selectPlace(nearestEmergency.location.id);
    if (isMobile) setSheetOpen(true);
    toast.message(`Nearest: ${nearestEmergency.location.name}`);
  };

  const nextClassLocation = useMemo(
    () => allLocations.find((l) => l.id === nextClass?.locationId),
    [allLocations, nextClass]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-50 to-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="text-sm text-slate-600">Loading campus map…</p>
      </div>
    );
  }

  const DetailBody = ({ compact }) => (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {selectedLocation ? (
        <>
          <div>
            <h2
              className={`font-bold text-slate-900 ${compact ? "text-lg" : "text-xl"}`}
            >
              {selectedLocation.name}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary" className="capitalize">
                {selectedLocation.category}
              </Badge>
              {(selectedLocation.isEmergencyPoint ||
                selectedLocation.category === "emergency") && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Emergency
                </Badge>
              )}
              {hasGpsCoordinates(selectedLocation) ? (
                <Badge variant="outline" className="text-emerald-700">
                  On OSM map
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-800">
                  Campus plan only
                </Badge>
              )}
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-600">
            {selectedLocation.description}
          </p>
          <div className="space-y-1 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-800">Where: </span>
              {selectedLocation.address}
            </p>
            <p>
              <span className="font-medium text-slate-800">Hours: </span>
              {selectedLocation.hours}
            </p>
            {selectedLocation.phone && (
              <a
                href={`tel:${selectedLocation.phone}`}
                className="inline-flex items-center gap-1 text-blue-700"
              >
                <Phone className="h-3.5 w-3.5" />
                {selectedLocation.phone}
              </a>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-600">
          Search or tap a pin to see details.
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 via-white to-slate-50/80 pb-24 lg:pb-6">
      <div className="mx-auto max-w-[1600px] px-3 py-4 md:px-6 md:py-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              <MapPinned className="h-8 w-8 text-blue-600" />
              Campus map
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              <strong>OpenStreetMap</strong> route guidance powered by
              PostgreSQL/PostGIS network geometry.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="shadow-sm"
              disabled={geoLoading}
              onClick={requestUserLocation}
            >
              <Crosshair className="mr-2 h-4 w-4" />
              {geoLoading ? "Locating…" : "My location"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="shadow-sm"
              onClick={handleEmergency}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Emergency
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-4">
            <Card className="border-slate-200/80 shadow-sm">
              <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="h-11 border-slate-200 pl-10"
                    placeholder="Search buildings, labs, hostels, gates…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-11 w-full border-slate-200 sm:w-[200px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c === "all" ? "All categories" : c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <div>
              <Suspense fallback={<MapSkeleton />}>
                <CampusLeafletMap
                  locations={filtered.map((loc) => {
                    if (loc.name === "College Medical Room") {
                      console.log("Medical Location:", loc);
                    }

                    const isEmergencyTarget =
                      loc.name === "Admin Block" || loc.name === "College Medical Room";

                    if (!isEmergencyTarget) return loc;

                    return {
                      ...loc,
                      category: "emergency",
                      isEmergencyPoint: true,
                    };
                  })}
                  campusMap={campusMap}
                  selectedId={selectedLocation?.id}
                  userLocation={userGeo}
                  onSelectLocation={(loc) => {
                    selectPlace(loc.id);
                    if (isMobile) setSheetOpen(true);
                  }}
                  routeLatLngs={routeLatLng}
                  onRequestRoute={(loc) => {
                    selectPlace(loc.id);
                    calculateRoute(loc.id);
                  }}
                />
              </Suspense>
            </div>
          </div>

          <div className="hidden min-w-0 flex-col gap-4 lg:flex">
            <Card className="border-slate-200/80 shadow-md ring-1 ring-slate-900/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="h-4 w-4 text-blue-600" />
                  Next class
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {nextClass ? (
                  <>
                    <p className="font-semibold text-slate-900">
                      {nextClass.course}
                    </p>
                    <p className="text-slate-600">{nextClass.startsAt}</p>
                    <p className="text-slate-600">
                      {nextClassLocation?.name || nextClass.locationId}
                    </p>
                    <Button variant="secondary" size="sm" className="w-full" asChild>
                      <Link
                        to={`/map?to=${encodeURIComponent(nextClass.locationId)}`}
                      >
                        Open map & navigate
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </>
                ) : (
                  <p className="text-slate-600">No upcoming class.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-red-100 bg-red-50/40 shadow-sm ring-1 ring-red-900/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-red-900">
                  <AlertTriangle className="h-4 w-4" />
                  Nearest emergency
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {!userGeo && (
                  <p className="text-slate-600">
                    Use your location to find the closest emergency point with GPS.
                  </p>
                )}
                {userGeo && nearestEmergency && (
                  <div>
                    <p className="font-medium text-slate-900">
                      {nearestEmergency.location.name}
                    </p>
                    <p className="text-slate-600">
                      ~{nearestEmergency.distanceM} m away
                    </p>
                  </div>
                )}
                {userGeo && !nearestEmergency && (
                  <p className="text-slate-600">
                    No emergency points have coordinates yet.
                  </p>
                )}
                <Button
                  size="sm"
                  variant={nearestEmergency ? "default" : "outline"}
                  className="w-full"
                  onClick={goToNearestEmergency}
                >
                  {nearestEmergency ? "Show on map" : "Use my location"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 shadow-md ring-1 ring-slate-900/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Route between two places</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="route-from" className="text-xs">
                    From
                  </Label>
                  <Select
                    value={routeFromId ? String(routeFromId) : ""}
                    onValueChange={(value) => {
                      console.log("FROM RAW:", value);
                      setRouteFromId(Number(value));
                    }}
                  >
                    <SelectTrigger id="route-from" className="h-10">
                      <SelectValue placeholder="Start" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {allLocations.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="route-to" className="text-xs">
                    To
                  </Label>
                  <Select
                    value={routeToId != null ? String(routeToId) : ""}
                    onValueChange={(value) => {
                      console.log("TO RAW:", value);
                      setRouteToId(Number(value));
                    }}
                  >
                    <SelectTrigger id="route-to" className="h-10">
                      <SelectValue placeholder="Destination" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {allLocations.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={routeLoading}
                    onClick={() => calculateRoute()}
                  >
                    <Navigation className="mr-2 h-4 w-4" />
                    {routeLoading ? "…" : "Draw route"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setRouteLatLng(null);
                      toast.message("Route cleared");
                    }}
                  >
                    Clear
                  </Button>
                </div>
                <p className="text-[11px] leading-snug text-slate-500">
                  Route uses PostGIS node/edge geometry from the database.
                </p>
              </CardContent>
            </Card>

            <Card className="flex flex-1 flex-col border-slate-200/80 shadow-md ring-1 ring-slate-900/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Place details</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                <DetailBody />
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-slate-700">
                  Results ({filtered.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-64 space-y-1 overflow-y-auto pt-0">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`flex w-full flex-col rounded-lg border px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
                      item.id === selectedLocation?.id
                        ? "border-blue-300 bg-blue-50/50 ring-1 ring-blue-200"
                        : "border-transparent"
                    }`}
                    onClick={() => selectPlace(item.id)}
                  >
                    <span className="font-medium text-slate-900">
                      {item.name}
                    </span>
                    <span className="text-xs capitalize text-slate-500">
                      {item.category}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {isMobile && (
        <>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent side="bottom" className="h-[58vh] rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Location</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 overflow-y-auto pb-8">
                <DetailBody compact />
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <p className="text-xs font-medium text-slate-700">Quick route</p>
                  <Select
                    value={routeFromId ? String(routeFromId) : ""}
                    onValueChange={(value) => {
                      console.log("FROM RAW:", value);
                      setRouteFromId(Number(value));
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="From" />
                    </SelectTrigger>
                    <SelectContent>
                      {allLocations.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={routeToId != null ? String(routeToId) : ""}
                    onValueChange={(value) => {
                      console.log("TO RAW:", value);
                      setRouteToId(Number(value));
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="To" />
                    </SelectTrigger>
                    <SelectContent>
                      {allLocations.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={routeLoading}
                    onClick={() => calculateRoute()}
                  >
                    <Navigation className="mr-2 h-3 w-3" />
                    Draw route
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="fixed bottom-28 right-4 z-[500] flex flex-col gap-2">
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg"
              aria-label="Open details"
              onClick={() => setSheetOpen(true)}
            >
              {selectedLocation ? (
                <MapPinned className="h-6 w-6" />
              ) : (
                <Search className="h-6 w-6" />
              )}
            </Button>
            {nextClass && (
              <Button size="sm" variant="secondary" className="shadow-md" asChild>
                <Link
                  to={`/map?to=${encodeURIComponent(nextClass.locationId)}`}
                >
                  Class
                </Link>
              </Button>
            )}
          </div>
        </>
      )}

      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-[450] border-t border-slate-200 bg-white/95 p-2 backdrop-blur-md lg:hidden">
          <div className="flex max-h-24 gap-2 overflow-x-auto pb-1">
            {filtered.slice(0, 12).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  selectPlace(item.id);
                  setSheetOpen(true);
                }}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  item.id === selectedLocation?.id
                    ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {item.name}
              </button>
            ))}
            {filtered.length > 12 && (
              <span className="flex items-center px-2 text-xs text-slate-400">
                +{filtered.length - 12} more — search
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;
