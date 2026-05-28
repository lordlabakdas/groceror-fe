import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Globe, Store, Map, List } from "lucide-react";

// Fix default Leaflet marker icons broken by Vite's asset pipeline.
// Must run before any map renders.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface StoreItem {
  id: string;
  name: string;
  email: string;
  location: string | null;
  website: string | null;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
}

type ViewMode = "map" | "list";

export default function Stores() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("map");

  const { data: stores = [], isLoading } = useQuery<StoreItem[]>({
    queryKey: ["/stores/"],
  });

  const filtered = stores.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.location ?? "").toLowerCase().includes(q)
    );
  });

  const mappable = filtered.filter((s) => s.latitude != null && s.longitude != null);

  // Default map centre: average of all mappable stores, or world centre.
  const centre = mappable.length > 0
    ? [
        mappable.reduce((sum, s) => sum + s.latitude!, 0) / mappable.length,
        mappable.reduce((sum, s) => sum + s.longitude!, 0) / mappable.length,
      ] as [number, number]
    : [20, 0] as [number, number];

  const zoom = mappable.length > 0 ? 5 : 2;

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Browse Stores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Find a store and start shopping
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stores..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex rounded-md border overflow-hidden flex-shrink-0">
            <Button
              variant={view === "map" ? "default" : "ghost"}
              size="sm"
              className="rounded-none gap-1.5"
              onClick={() => setView("map")}
            >
              <Map className="h-4 w-4" />
              Map
            </Button>
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-none gap-1.5 border-l"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
              List
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[520px] rounded-xl border bg-muted animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {search ? "No stores match your search." : "No stores available yet."}
        </div>
      ) : view === "map" ? (
        <MapView stores={filtered} mappable={mappable} centre={centre} zoom={zoom} />
      ) : (
        <ListView stores={filtered} />
      )}
    </div>
  );
}

// ── Map view ──────────────────────────────────────────────────────────────────

interface MapViewProps {
  stores: StoreItem[];
  mappable: StoreItem[];
  centre: [number, number];
  zoom: number;
}

function MapView({ stores, mappable, centre, zoom }: MapViewProps) {
  const unmappable = stores.filter((s) => s.latitude == null || s.longitude == null);

  return (
    <div className="space-y-3">
      <div style={{ isolation: "isolate" }}>
      <MapContainer
        center={centre}
        zoom={zoom}
        style={{ height: "520px", borderRadius: "0.75rem", border: "1px solid hsl(var(--border))" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mappable.map((store) => (
          <Marker key={store.id} position={[store.latitude!, store.longitude!]}>
            <Popup>
              <div className="space-y-1 min-w-[160px]">
                <p className="font-semibold text-sm">{store.name}</p>
                {store.location && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3 inline" />
                    {store.location}
                  </p>
                )}
                {store.website && (
                  <p className="text-xs text-muted-foreground truncate">{store.website}</p>
                )}
                <Link href={`/stores/${store.id}`}>
                  <a className="block mt-2 text-xs font-medium text-primary hover:underline">
                    Browse store →
                  </a>
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      </div>

      {unmappable.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {unmappable.length} store{unmappable.length > 1 ? "s" : ""} without a map location
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unmappable.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── List view ─────────────────────────────────────────────────────────────────

function ListView({ stores }: { stores: StoreItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {stores.map((store) => (
        <StoreCard key={store.id} store={store} />
      ))}
    </div>
  );
}

// ── Shared card ───────────────────────────────────────────────────────────────

function StoreCard({ store }: { store: StoreItem }) {
  return (
    <Link href={`/stores/${store.id}`}>
      <a className="block rounded-xl border bg-card shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary/50 border border-border flex items-center justify-center flex-shrink-0 group-hover:bg-secondary/70 transition-colors">
            <Store className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">
              {store.name}
            </p>
            {store.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{store.location}</span>
              </p>
            )}
            {store.website && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Globe className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{store.website}</span>
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Badge
            variant="secondary"
            className="text-xs bg-primary/15 text-primary border border-primary/25"
          >
            {store.is_active ? "Open" : "Closed"}
          </Badge>
          <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
            Browse →
          </span>
        </div>
      </a>
    </Link>
  );
}
