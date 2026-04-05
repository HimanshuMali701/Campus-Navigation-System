import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  MapPin,
  Sparkles,
  Navigation,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { emergencyAPI, locationAPI, scheduleAPI } from "../services/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

const Dashboard = () => {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [nextClass, setNextClass] = useState(null);
  const [emergencyCount, setEmergencyCount] = useState(0);
  const [source, setSource] = useState("");

  useEffect(() => {
    async function load() {
      const [locRes, classRes, emergencyRes] = await Promise.all([
        locationAPI.getAll(),
        scheduleAPI.getNextClass(user?.uid),
        emergencyAPI.getAll(),
      ]);
      setLocations(locRes.data || []);
      setSource(locRes.source || "");
      setNextClass(classRes.data || null);
      setEmergencyCount(emergencyRes.count || 0);
    }
    load().catch(() => {});
  }, [user?.uid]);

  const nextClassLocation = useMemo(
    () => locations.find((item) => item.id === nextClass?.locationId),
    [locations, nextClass]
  );

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Student";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-8 text-white shadow-xl md:p-10">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="relative">
            <Badge className="mb-3 border-0 bg-white/20 text-white hover:bg-white/25">
              <Sparkles className="mr-1 h-3 w-3" />
              Signed in
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Hey {displayName}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-blue-100 md:text-base">
              Your campus hub — open the live map, jump to your next class, or
              find help fast.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-white text-blue-700 shadow-md hover:bg-blue-50"
              >
                <Link to="/map">
                  <Navigation className="mr-2 h-4 w-4" />
                  Open campus map
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 text-white hover:bg-white/15"
              >
                <Link to="/map?category=emergency">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Emergency points
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {source && (
          <p className="mt-4 text-center text-xs text-slate-400 md:text-left">
            Location data source:{" "}
            <span className="font-medium text-slate-600">{source}</span>
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Card className="border-slate-200/80 shadow-sm ring-1 ring-slate-900/5 transition hover:shadow-md">
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Places
              </p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {/*locations.length*/}
                {16}
              </p>
              <p className="mt-1 text-sm text-slate-600">Indexed on the map</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 shadow-sm ring-1 ring-slate-900/5 transition hover:shadow-md">
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Emergency
              </p>
              <p className="mt-1 text-3xl font-bold text-red-600">
                {/*{emergencyCount}*/}
                {2}
              </p>
              <p className="mt-1 text-sm text-slate-600">Help & safety points</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 shadow-sm ring-1 ring-slate-900/5 transition hover:shadow-md">
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Account
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                {user?.email}
              </p>
              <p className="mt-1 text-sm text-slate-600">Firebase session</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card className="border-slate-200/80 shadow-md ring-1 ring-slate-900/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="rounded-lg bg-blue-100 p-2">
                  <CalendarClock className="h-5 w-5 text-blue-700" />
                </div>
                Next class
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextClass ? (
                <div className="space-y-3">
                  <p className="text-lg font-semibold text-slate-900">
                    {nextClass.course}
                  </p>
                  <div className="space-y-1 text-sm text-slate-600">
                    <p>Starts {nextClass.startsAt}</p>
                    <p>{nextClass.faculty}</p>
                    <p className="font-medium text-slate-800">
                      {nextClassLocation?.name || nextClass.locationId}
                    </p>
                  </div>
                  <Button asChild className="mt-2 w-full sm:w-auto">
                    <Link to={`/map?to=${nextClass.locationId}`}>
                      Navigate there
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  No class scheduled in the preview feed.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-md ring-1 ring-slate-900/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="rounded-lg bg-amber-100 p-2">
                  <AlertTriangle className="h-5 w-5 text-amber-700" />
                </div>
                Need help?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-600">
                Jump to security, medical, or help desks marked in your campus
                database — shown on OpenStreetMap when coordinates exist.
              </p>
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link to="/map?category=emergency">
                  <MapPin className="mr-2 h-4 w-4" />
                  Open emergency locator
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
