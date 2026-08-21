import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Check, Plus, Search, Store, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/currency";

interface SearchResultItem {
  id: string;
  name: string;
  price: number;
  store_name: string;
}

interface SearchResponse {
  query: string;
  results: SearchResultItem[];
}

interface PriceAlert {
  id: string;
  inventory_id: string;
  inventory_name: string;
  current_price: number;
  target_price: number;
  is_triggered: boolean;
  is_active: boolean;
  created_at: string;
}

function AlertRow({ alert, onDelete }: { alert: PriceAlert; onDelete: (id: string) => void }) {
  const savings = Math.max(0, alert.current_price - alert.target_price);
  return (
    <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          alert.is_triggered ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"
        }`}
      >
        {alert.is_triggered ? <Check className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{alert.inventory_name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Target: <span className="font-semibold text-foreground">{formatPrice(alert.target_price)}</span>
          <span className="mx-1.5">·</span>
          Now: <span className="font-semibold text-foreground">{formatPrice(alert.current_price)}</span>
          {savings > 0 && (
            <span className="ml-1.5 text-green-500 font-medium">
              (save {formatPrice(savings)})
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {alert.is_triggered ? (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
            Price met!
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">Watching</Badge>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(alert.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CreateAlertDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null);
  const [targetPrice, setTargetPrice] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const searchUrl = useMemo(() => {
    if (selectedItem || debouncedQuery.length < 2) return null;
    return `/inventory/search?q=${encodeURIComponent(debouncedQuery)}`;
  }, [debouncedQuery, selectedItem]);

  const { data, isFetching } = useQuery<SearchResponse>({
    queryKey: [searchUrl],
    enabled: searchUrl !== null,
  });
  const results = data?.results ?? [];

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/price-alerts", {
        inventory_id: selectedItem!.id,
        target_price: parseFloat(targetPrice),
      }),
    onSuccess: () => {
      reset();
      onCreated();
      toast({ title: "Alert created", description: "We'll track this item's price for you." });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message ?? "Could not create alert",
        variant: "destructive",
      });
    },
  });

  function reset() {
    setOpen(false);
    setQuery("");
    setDebouncedQuery("");
    setSelectedItem(null);
    setTargetPrice("");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : reset())}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New alert
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Set price alert</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          You can also set alerts directly from a store's product page by clicking the bell icon on any item.
        </p>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Item</Label>
            {selectedItem ? (
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedItem.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Store className="h-3 w-3" />
                    {selectedItem.store_name} · {formatPrice(selectedItem.price)}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => setSelectedItem(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Search for an item, e.g. bananas"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {debouncedQuery.length >= 2 && (
                  <div className="mt-1.5 max-h-52 overflow-y-auto rounded-md border divide-y">
                    {isFetching ? (
                      <p className="px-3 py-2.5 text-sm text-muted-foreground">Searching…</p>
                    ) : results.length === 0 ? (
                      <p className="px-3 py-2.5 text-sm text-muted-foreground">
                        No items found for &ldquo;{debouncedQuery}&rdquo;.
                      </p>
                    ) : (
                      results.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center justify-between gap-2"
                          onClick={() => {
                            setSelectedItem(item);
                            setQuery("");
                          }}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Store className="h-3 w-3" />
                              {item.store_name}
                            </p>
                          </div>
                          <span className="text-sm font-semibold flex-shrink-0">{formatPrice(item.price)}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Target price (₹)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 2.49"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={!selectedItem || !targetPrice || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Creating…" : "Create alert"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: alerts = [], isLoading } = useQuery<PriceAlert[]>({
    queryKey: ["/price-alerts"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/price-alerts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/price-alerts"] });
      toast({ title: "Alert removed" });
    },
  });

  const triggered = alerts.filter((a) => a.is_triggered);
  const watching = alerts.filter((a) => !a.is_triggered);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Price Alerts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Get notified when an item drops to your target price
          </p>
        </div>
        <CreateAlertDialog onCreated={() => queryClient.invalidateQueries({ queryKey: ["/price-alerts"] })} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl border bg-muted animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <BellOff className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No price alerts yet.</p>
          <p className="text-sm text-muted-foreground/70">
            Browse a store and tap the bell icon on any product to set a target price.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {triggered.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-500">
                Price reached ({triggered.length})
              </p>
              {triggered.map((a) => (
                <AlertRow key={a.id} alert={a} onDelete={(id) => deleteMutation.mutate(id)} />
              ))}
            </div>
          )}
          {watching.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Watching ({watching.length})
              </p>
              {watching.map((a) => (
                <AlertRow key={a.id} alert={a} onDelete={(id) => deleteMutation.mutate(id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
