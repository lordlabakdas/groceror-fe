import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Sparkles, Trash2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DeliveryZone {
  id: string;
  store_id: string;
  latitude: number;
  longitude: number;
  radius_km: number;
}

interface FeaturedStatus {
  store_id: string;
  store_name: string;
  tagline: string | null;
  priority: number;
  is_active: boolean;
}

function FeaturedStoreCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tagline, setTagline] = useState("");
  const [priority, setPriority] = useState("0");

  const { data: current, isLoading } = useQuery<FeaturedStatus | null>({
    queryKey: ["/stores/feature/me"],
    retry: false,
  });

  useEffect(() => {
    if (current) {
      setTagline(current.tagline ?? "");
      setPriority(String(current.priority));
    }
  }, [current]);

  const upsertM = useMutation({
    mutationFn: () =>
      apiRequest("PUT", "/stores/feature", {
        tagline: tagline.trim() || null,
        priority: parseInt(priority) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/stores/feature/me"] });
      qc.invalidateQueries({ queryKey: ["/stores/featured"] });
      toast({ title: "Featured listing saved" });
    },
    onError: () => toast({ title: "Error saving featured listing", variant: "destructive" }),
  });

  const removeM = useMutation({
    mutationFn: () => apiRequest("DELETE", "/stores/feature"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/stores/feature/me"] });
      qc.invalidateQueries({ queryKey: ["/stores/featured"] });
      toast({ title: "Removed from featured" });
    },
  });

  if (isLoading) return <div className="h-40 rounded-xl bg-muted animate-pulse" />;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <p className="font-semibold text-sm">Featured store listing</p>
        </div>
        {current?.is_active && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1"
            onClick={() => removeM.mutate()}
            disabled={removeM.isPending}
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Featured stores appear at the top of the browse page with a highlighted badge.
        {current?.is_active && " Your store is currently featured."}
      </p>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Tagline (optional)</Label>
          <Input
            placeholder="e.g. Fresh organic produce daily"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Priority (higher = shown first)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            placeholder="0"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          />
        </div>
      </div>
      <Button
        className="w-full"
        onClick={() => upsertM.mutate()}
        disabled={upsertM.isPending}
      >
        {upsertM.isPending ? "Saving…" : current?.is_active ? "Update listing" : "Feature my store"}
      </Button>
    </div>
  );
}

// Infer the store_id from the zone response — used to fetch it for the current store.
// The endpoint GET /delivery-zones/store/{store_id} requires knowing your own store_id.
// We get it from the zone response after PUT (which always belongs to the current store).

export default function DeliveryZonePage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  // We don't have a "my store id" endpoint directly, so we use the PUT to upsert
  // and list the zone. For the initial fetch, we rely on the PUT response to seed the state.
  const [form, setForm] = useState({ latitude: "", longitude: "", radius_km: "" });
  const [locating, setLocating] = useState(false);

  // We query the zone by posting PUT and reflecting — but for display we store locally.
  // Better: fetch via a store-profile endpoint. For now we store the zone in a local state
  // seeded from the upsert response.
  const [zone, setZone] = useState<DeliveryZone | null>(null);
  const [fetched, setFetched] = useState(false);

  // Try to load the zone by hitting the /user-profile or detecting store_id from previous queries.
  // Simplest: call PUT with empty to check — but that would overwrite. Instead, expose a fetch
  // from the store profile available in the auth context. For now use a dedicated fetch via
  // /delivery-zones/store/{store_id} — but we need the store_id.
  // We'll load via a side-effect that fetches the current user's store profile then fetches zone.
  useEffect(() => {
    // Fetch current store profile to get store_id, then fetch zone
    apiRequest("GET", "/user/profile")
      .then((r) => r.json())
      .then((profile: { store_id?: string }) => {
        if (!profile.store_id) { setFetched(true); return; }
        return apiRequest("GET", `/delivery-zones/store/${profile.store_id}`)
          .then((r) => r.json())
          .then((z: DeliveryZone | null) => {
            if (z && z.id) {
              setZone(z);
              setForm({
                latitude: String(z.latitude),
                longitude: String(z.longitude),
                radius_km: String(z.radius_km),
              });
            }
            setFetched(true);
          });
      })
      .catch(() => setFetched(true));
  }, []);

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/delivery-zones", {
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radius_km: parseFloat(form.radius_km),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Failed to save zone");
      }
      return res.json();
    },
    onSuccess: (data: DeliveryZone) => {
      setZone(data);
      toast({ title: "Delivery zone saved" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/delivery-zones");
    },
    onSuccess: () => {
      setZone(null);
      setForm({ latitude: "", longitude: "", radius_km: "" });
      toast({ title: "Delivery zone removed" });
    },
    onError: () => toast({ title: "Error removing zone", variant: "destructive" }),
  });

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => {
        toast({ title: "Could not detect location", variant: "destructive" });
        setLocating(false);
      }
    );
  }

  const canSave = form.latitude && form.longitude && form.radius_km &&
    !isNaN(parseFloat(form.latitude)) && !isNaN(parseFloat(form.longitude)) && !isNaN(parseFloat(form.radius_km));

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Delivery Zone</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Set the area your store can deliver to. Shoppers can filter stores by their location.
        </p>
      </div>

      {!fetched && <div className="h-48 rounded-xl bg-muted animate-pulse" />}

      {fetched && zone && (
        <div className="rounded-xl border bg-card p-4 flex items-start gap-4">
          <div className="bg-primary/10 rounded-lg p-3 shrink-0">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Zone configured</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)} · {zone.radius_km} km radius
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {fetched && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <p className="text-sm font-semibold">{zone ? "Update zone" : "Configure zone"}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Latitude</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 37.7749"
                value={form.latitude}
                onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Longitude</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. -122.4194"
                value={form.longitude}
                onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Radius (km)</label>
            <Input
              type="number"
              step="0.5"
              min="0.1"
              placeholder="e.g. 5"
              value={form.radius_km}
              onChange={(e) => setForm((f) => ({ ...f, radius_km: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Shoppers within this radius will see your store when they filter by location.</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={useMyLocation}
              disabled={locating}
            >
              <Navigation className="h-3.5 w-3.5" />
              {locating ? "Detecting…" : "Use my location"}
            </Button>
            <Button
              className="flex-1"
              onClick={() => upsertMutation.mutate()}
              disabled={!canSave || upsertMutation.isPending}
            >
              {upsertMutation.isPending ? "Saving…" : "Save zone"}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Tip</p>
        <p>Use the "Use my location" button to auto-fill your store's coordinates, then set a radius that covers your delivery range.</p>
      </div>

      <FeaturedStoreCard />
    </div>
  );
}
