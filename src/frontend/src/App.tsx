import L from "leaflet";
import { useCallback, useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Loader2,
  MapPin,
  MapPinned,
  Navigation,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import type { LocationEntry, LocationId } from "./backend.d";
import { useActor } from "./hooks/useActor";

// Fix Leaflet default marker icons
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationWithId extends LocationEntry {
  id: LocationId;
}

function formatTimestamp(ts: bigint): string {
  const date = new Date(Number(ts / 1_000_000n));
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export default function App() {
  const { actor, isFetching } = useActor();
  const queryClient = useQueryClient();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const [label, setLabel] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);

  const { data: locations = [], isLoading } = useQuery<LocationWithId[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      if (!actor) return [];
      const entries = await actor.getLocations();
      return entries.map((entry, i) => ({ ...entry, id: BigInt(i) }));
    },
    enabled: !!actor && !isFetching,
  });

  const addMutation = useMutation({
    mutationFn: async ({
      latitude,
      longitude,
      locationLabel,
    }: {
      latitude: number;
      longitude: number;
      locationLabel: string | null;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addLocation(latitude, longitude, locationLabel);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setLabel("");
      toast.success("Location saved!");
    },
    onError: () => toast.error("Failed to save location"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (locationId: LocationId) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteLocation(locationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location deleted");
    },
    onError: () => toast.error("Failed to delete location"),
  });

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    const map = L.map(mapRef.current).setView([20, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    leafletMap.current = map;
    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  // Update markers + polyline when locations change
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    for (const m of markersRef.current) {
      m.remove();
    }
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (locations.length === 0) return;

    const latlngs: L.LatLngExpression[] = [];
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      const latlng: L.LatLngExpression = [loc.latitude, loc.longitude];
      latlngs.push(latlng);
      const marker = L.marker(latlng)
        .addTo(map)
        .bindPopup(
          `<strong>${loc.locationLabel ?? "Unnamed"}</strong><br/>${formatCoords(loc.latitude, loc.longitude)}<br/><small>#${i + 1}</small>`,
        );
      markersRef.current.push(marker);
    }

    if (latlngs.length > 1) {
      polylineRef.current = L.polyline(latlngs, {
        color: "#2563eb",
        weight: 2.5,
        opacity: 0.7,
        dashArray: "6 4",
      }).addTo(map);
    }

    const bounds = L.latLngBounds(latlngs);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [locations]);

  const handleTrackLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        addMutation.mutate({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          locationLabel: label.trim() || null,
        });
      },
      (err) => {
        setGeoLoading(false);
        toast.error(`Location error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [label, addMutation]);

  const isPending = geoLoading || addMutation.isPending;

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center gap-3 px-6 py-4 bg-sidebar text-sidebar-foreground shadow-md z-10 shrink-0">
        <MapPinned className="w-6 h-6 text-sidebar-primary" />
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Location Tracker
        </h1>
        <Badge
          variant="secondary"
          className="ml-auto bg-sidebar-accent text-sidebar-accent-foreground"
        >
          {locations.length} saved
        </Badge>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 shrink-0 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
          <div className="p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/50">
              Track New Location
            </p>
            <Input
              data-ocid="location.input"
              placeholder="Label (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !isPending && handleTrackLocation()
              }
              className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40"
            />
            <Button
              data-ocid="location.primary_button"
              type="button"
              className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:opacity-90 font-semibold"
              onClick={handleTrackLocation}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4 mr-2" />
              )}
              {isPending ? "Locating..." : "Track Current Location"}
            </Button>
          </div>

          <Separator className="bg-sidebar-border" />

          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/50">
              History
            </p>
          </div>

          <ScrollArea className="flex-1 px-2 pb-4">
            {isLoading ? (
              <div data-ocid="location.loading_state" className="space-y-2 p-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    className="h-16 w-full rounded-md bg-sidebar-accent"
                  />
                ))}
              </div>
            ) : locations.length === 0 ? (
              <div
                data-ocid="location.empty_state"
                className="flex flex-col items-center justify-center py-12 text-center text-sidebar-foreground/40"
              >
                <MapPin className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No locations tracked yet.</p>
                <p className="text-xs mt-1">Click the button above to start.</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {locations.map((loc, i) => (
                  <motion.div
                    key={String(loc.id)}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }}
                    data-ocid={`location.item.${i + 1}`}
                    className="group relative flex items-start gap-2 rounded-md p-2.5 mb-1.5 hover:bg-sidebar-accent transition-colors"
                  >
                    <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-sidebar-primary">
                        {i + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-sidebar-foreground">
                        {loc.locationLabel ?? "Unnamed"}
                      </p>
                      <p className="text-xs text-sidebar-foreground/50 font-mono">
                        {formatCoords(loc.latitude, loc.longitude)}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-sidebar-foreground/40 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(loc.timestamp)}
                      </p>
                    </div>
                    <button
                      type="button"
                      data-ocid={`location.delete_button.${i + 1}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/20 text-destructive"
                      onClick={() => deleteMutation.mutate(loc.id)}
                      disabled={deleteMutation.isPending}
                      title="Delete location"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </ScrollArea>

          <div className="px-4 py-3 border-t border-sidebar-border">
            <p className="text-[10px] text-sidebar-foreground/30 text-center">
              &copy; {new Date().getFullYear()}. Built with ♥ using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-sidebar-foreground/50"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </aside>

        <main className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />
          {locations.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            >
              <div className="bg-card/90 backdrop-blur-sm rounded-xl px-8 py-6 shadow-card text-center">
                <MapPinned className="w-10 h-10 mx-auto mb-3 text-primary" />
                <h2 className="font-display text-lg font-semibold text-foreground">
                  No locations yet
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Track your first location using the sidebar.
                </p>
              </div>
            </motion.div>
          )}
        </main>
      </div>

      <Toaster />
    </div>
  );
}
