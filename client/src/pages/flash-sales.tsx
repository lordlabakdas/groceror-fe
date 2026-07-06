import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Zap, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FlashSale {
  id: string;
  inventory_id: string;
  inventory_name: string;
  store_id: string;
  sale_price: number;
  original_price: number;
  start_at: string;
  end_at: string;
  is_active: boolean;
  is_live: boolean;
  seconds_remaining: number | null;
}

interface InventoryItem {
  id: string;
  name: string;
  price: number;
}

function Countdown({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="font-mono text-amber-400 font-semibold">
      {h > 0 && `${pad(h)}:`}{pad(m)}:{pad(s)}
    </span>
  );
}

export default function FlashSales() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [inventoryId, setInventoryId] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [duration, setDuration] = useState("2");

  const { data: sales = [], isLoading } = useQuery<FlashSale[]>({
    queryKey: ["/flash-sales/store"],
  });

  const { data: inventory } = useQuery<{ inventory: InventoryItem[] }>({
    queryKey: ["/inventory/get-store-inventory"],
  });
  const items: InventoryItem[] = inventory?.inventory ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const end = new Date(now.getTime() + Number(duration) * 3600 * 1000);
      await apiRequest("POST", "/flash-sales", {
        inventory_id: inventoryId,
        sale_price: parseFloat(salePrice),
        start_at: now.toISOString(),
        end_at: end.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/flash-sales/store"] });
      setShowCreate(false);
      setSalePrice(""); setInventoryId(""); setDuration("2");
      toast({ description: "Flash sale started" });
    },
    onError: () => toast({ description: "Failed to create flash sale", variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/flash-sales/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/flash-sales/store"] });
      toast({ description: "Flash sale cancelled" });
    },
  });

  const selectedItem = items.find((i) => i.id === inventoryId);
  const canCreate = inventoryId && salePrice && parseFloat(salePrice) > 0 && (!selectedItem || parseFloat(salePrice) < selectedItem.price);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" />
          <h1 className="text-2xl font-bold">Flash Sales</h1>
        </div>
        <Button onClick={() => setShowCreate(true)}>New Flash Sale</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : sales.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center space-y-3">
          <Zap className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No flash sales yet. Create a time-limited deal to drive sales.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => (
            <div key={sale.id} className={cn("flex items-center gap-4 p-4 rounded-xl border bg-card", sale.is_live && "border-amber-500/40 bg-amber-500/5")}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{sale.inventory_name}</p>
                  {sale.is_live && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Live</Badge>}
                  {!sale.is_active && <Badge variant="outline" className="text-xs text-muted-foreground">Cancelled</Badge>}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-base font-bold text-amber-400">${sale.sale_price.toFixed(2)}</span>
                  <span className="text-xs line-through text-muted-foreground">${sale.original_price.toFixed(2)}</span>
                  <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">
                    {Math.round((1 - sale.sale_price / sale.original_price) * 100)}% off
                  </Badge>
                </div>
                {sale.is_live && sale.seconds_remaining !== null && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <Countdown seconds={sale.seconds_remaining} />
                    <span>remaining</span>
                  </div>
                )}
                {!sale.is_live && sale.is_active && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Starts {new Date(sale.start_at).toLocaleString()}
                  </p>
                )}
              </div>
              {sale.is_active && (
                <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => cancelMutation.mutate(sale.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Flash Sale</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Item</label>
              <Select value={inventoryId} onValueChange={setInventoryId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select an item…" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name} (${item.price?.toFixed(2)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Flash sale price ($)</label>
              {selectedItem && <p className="text-xs text-muted-foreground">Regular price: ${selectedItem.price?.toFixed(2)}</p>}
              <Input className="mt-1" type="number" step="0.01" min="0.01" placeholder="e.g. 1.99" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Duration</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="8">8 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={!canCreate || createMutation.isPending} onClick={() => createMutation.mutate()}>
              Start Flash Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
