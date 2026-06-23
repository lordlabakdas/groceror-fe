import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Globe, Store, Map, List } from "lucide-react";
import { cn } from "@/lib/utils";

// Fix default Leaflet marker icons broken by Vite's asset pipeline.
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

// ── Custom emerald map marker ─────────────────────────────────────────────────

function createMarkerIcon(isActive: boolean): L.DivIcon {
  const size = isActive ? 16 : 11;
  const glow = isActive
    ? "box-shadow:0 0 0 4px rgba(34,197,94,0.25),0 0 14px rgba(34,197,94,0.65);"
    : "box-shadow:0 2px 6px rgba(0,0,0,0.6);";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;
      height:${size}px;
      background:#22c55e;
      border:2px solid rgba(255,255,255,0.9);
      border-radius:50%;
      ${glow}
      transition:all 0.15s ease;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 6)],
  });
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Stores() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("map");
  const [hoveredStoreId, setHoveredStoreId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  const centre =
    mappable.length > 0
      ? ([
          mappable.reduce((sum, s) => sum + s.latitude!, 0) / mappable.length,
          mappable.reduce((sum, s) => sum + s.longitude!, 0) / mappable.length,
        ] as [number, number])
      : ([20, 0] as [number, number]);

  const zoom = mappable.length > 0 ? 5 : 2;

  function handleMarkerClick(id: string) {
    setHoveredStoreId(id);
    const el = cardRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      el.classList.add("card-flash");
      setTimeout(() => el.classList.remove("card-flash"), 1500);
    }
  }

  const sharedMapProps = {
    stores: filtered,
    mappable,
    centre,
    zoom,
    activeStoreId: hoveredStoreId,
    onMarkerClick: handleMarkerClick,
  };

  const searchBar = (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search stores..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="pl-9"
      />
    </div>
  );

  return (
    <div>
      {/* ── Desktop split-pane (md+) ─────────────────────────── */}
      <div
        className="hidden md:flex rounded-xl overflow-hidden border border-border"
        style={{ height: "calc(100vh - 5rem)" }}
      >
        {/* Map pane — left 55% */}
        <div className="w-[55%] flex-shrink-0">
          {isLoading ? (
            <div className="h-full bg-muted animate-pulse" />
          ) : (
            <MapView {...sharedMapProps} hideUnmappableList />
          )}
        </div>

        {/* Card pane — right 45% */}
        <div className="flex-1 flex flex-col min-w-0 border-l border-border bg-background">
          {/* Search header */}
          <div className="p-3 border-b border-border flex-shrink-0 flex items-center gap-2 bg-background">
            {searchBar}
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {filtered.length} store{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Card list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {search ? "No stores match your search." : "No stores available yet."}
              </div>
            ) : (
              filtered.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  isHighlighted={hoveredStoreId === store.id}
                  onMouseEnter={() => setHoveredStoreId(store.id)}
                  onMouseLeave={() => setHoveredStoreId(null)}
                  cardRef={(el) => {
                    cardRefs.current[store.id] = el;
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile (below md) ────────────────────────────────── */}
      <div className="md:hidden space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-2xl font-bold">Browse Stores</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Find a store and start shopping
            </p>
          </div>
          <div className="flex items-center gap-2">
            {searchBar}
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
          <div
            className="rounded-xl overflow-hidden border border-border"
            style={{ height: "520px" }}
          >
            <MapView {...sharedMapProps} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Map view ──────────────────────────────────────────────────────────────────

interface MapViewProps {
  stores: StoreItem[];
  mappable: StoreItem[];
  centre: [number, number];
  zoom: number;
  activeStoreId: string | null;
  onMarkerClick: (id: string) => void;
  hideUnmappableList?: boolean;
}

function MapView({
  stores,
  mappable,
  centre,
  zoom,
  activeStoreId,
  onMarkerClick,
  hideUnmappableList = false,
}: MapViewProps) {
  const unmappable = stores.filter((s) => s.latitude == null || s.longitude == null);

  return (
    <div className="h-full flex flex-col" style={{ isolation: "isolate" }}>
      <MapContainer
        center={centre}
        zoom={zoom}
        style={{ flex: 1, minHeight: 0 }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {mappable.map((store) => (
          <Marker
            key={store.id}
            position={[store.latitude!, store.longitude!]}
            icon={createMarkerIcon(store.id === activeStoreId)}
            eventHandlers={{ click: () => onMarkerClick(store.id) }}
          >
            <Popup>
              <div className="space-y-1.5 min-w-[160px]">
                <p className="font-semibold text-sm text-emerald-400">{store.name}</p>
                {store.location && (
                  <p className="text-xs flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3 inline flex-shrink-0" />
                    {store.location}
                  </p>
                )}
                <span
                  className={cn(
                    "inline-block text-xs px-2 py-0.5 rounded-full",
                    store.is_active
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {store.is_active ? "Open" : "Closed"}
                </span>
                <Link href={`/stores/${store.id}`}>
                  <a className="block mt-1 text-xs font-medium text-primary hover:underline">
                    Browse store →
                  </a>
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {!hideUnmappableList && unmappable.length > 0 && (
        <div className="space-y-2 p-3 border-t border-border">
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

// ── Store card ────────────────────────────────────────────────────────────────

interface StoreCardProps {
  store: StoreItem;
  isHighlighted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  cardRef?: (el: HTMLDivElement | null) => void;
}

function StoreCard({
  store,
  isHighlighted,
  onMouseEnter,
  onMouseLeave,
  cardRef,
}: StoreCardProps) {
  const initial = store.name.charAt(0).toUpperCase();

  return (
    <div ref={cardRef} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <Link href={`/stores/${store.id}`}>
        <a
          className={cn(
            "block rounded-xl border bg-card shadow-md hover:shadow-lg transition-all cursor-pointer group p-4",
            "border-l-4",
            isHighlighted
              ? "border-l-emerald-500 shadow-emerald-500/10 shadow-lg"
              : "border-l-transparent hover:border-l-emerald-500/50"
          )}
        >
          <div className="flex items-center gap-3">
            {/* Store initial avatar */}
            <div
              className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)" }}
            >
              {initial}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">
                {store.name}
              </p>
              {store.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
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

            <Badge
              className={cn(
                "text-xs flex-shrink-0",
                store.is_active
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-muted text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {store.is_active ? "Open" : "Closed"}
            </Badge>
          </div>

          <div className="mt-2 flex justify-end">
            <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
              Browse →
            </span>
          </div>
        </a>
      </Link>
    </div>
  );
}
