import { useMemo } from "react";
import { Navigation, Siren } from "lucide-react";

const CampusMapOverlay = ({
  locations,
  selectedId,
  routePoints,
  onSelectLocation,
  mapImageUrl,
}) => {
  const selected = useMemo(
    () => locations.find((item) => item.id === selectedId) || null,
    [locations, selectedId]
  );

  const isEmergency = (loc) =>
    Boolean(loc.isEmergencyPoint || loc.category === "emergency");

  return (
    <div className="relative h-[min(68vh,520px)] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-inner">
      <img
        src={mapImageUrl || "/campus-map-placeholder.svg"}
        alt="Campus plan"
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />

      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        {routePoints?.length > 1 && (
          <polyline
            points={routePoints.map(([x, y]) => `${x}%,${y}%`).join(" ")}
            fill="none"
            stroke="#2563eb"
            strokeWidth="0.85"
            strokeDasharray="3 2"
          />
        )}
      </svg>

      {locations.map((loc) => {
        if (loc.x == null || loc.y == null) return null;
        const active = loc.id === selectedId;
        const em = isEmergency(loc);
        return (
          <button
            key={loc.id}
            type="button"
            className={`absolute z-10 flex max-w-[140px] -translate-x-1/2 -translate-y-full items-center gap-1 rounded-full border-2 px-2 py-1 text-left text-xs font-semibold shadow-md transition-transform active:scale-[0.96] ${
              em
                ? active
                  ? "border-red-800 bg-red-600 text-white ring-2 ring-red-300"
                  : "border-white bg-red-500/95 text-white"
                : active
                  ? "border-blue-700 bg-blue-600 text-white"
                  : "border-white bg-slate-900/85 text-white"
            }`}
            style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
            onClick={() => onSelectLocation(loc)}
          >
            {em && <Siren className="h-3 w-3 shrink-0" aria-hidden />}
            <span className="truncate">{loc.name}</span>
          </button>
        );
      })}

      {selected && (
        <div className="absolute bottom-3 left-3 z-20 max-w-[min(100%,280px)] rounded-lg border border-slate-200/80 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
          <p className="text-sm font-semibold text-slate-900">{selected.name}</p>
          <p className="text-xs capitalize text-slate-600">{selected.category}</p>
        </div>
      )}

      {routePoints?.length > 1 && (
        <div className="absolute right-3 top-3 z-20 rounded-md bg-white/95 px-3 py-2 text-xs text-slate-700 shadow backdrop-blur-sm">
          <span className="inline-flex items-center gap-1">
            <Navigation className="h-3 w-3" />
            Route on campus plan
          </span>
        </div>
      )}
    </div>
  );
};

export default CampusMapOverlay;
