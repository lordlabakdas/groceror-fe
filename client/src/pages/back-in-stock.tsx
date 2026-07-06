import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BackInStockAlert {
  id: string;
  inventory_id: string;
  inventory_name: string;
  store_id: string;
  store_name: string;
  current_stock: number;
  is_triggered: boolean;
  triggered_at: string | null;
  created_at: string;
}

export default function BackInStock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: alerts = [], isLoading } = useQuery<BackInStockAlert[]>({
    queryKey: ["/back-in-stock"],
  });

  const removeMutation = useMutation({
    mutationFn: async (inventoryId: string) => {
      await apiRequest("DELETE", `/back-in-stock/${inventoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/back-in-stock"] });
      toast({ description: "Alert removed" });
    },
  });

  const triggered = alerts.filter((a) => a.is_triggered);
  const watching = alerts.filter((a) => !a.is_triggered);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-emerald-400" />
        <h1 className="text-2xl font-bold">Back-in-Stock Alerts</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center space-y-3">
          <Bell className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No alerts set. Browse a store and tap "Notify me when back" on out-of-stock items.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {triggered.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-widest mb-3">Back in stock</h2>
              <div className="space-y-3">
                {triggered.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} onRemove={removeMutation.mutate} />
                ))}
              </div>
            </section>
          )}
          {watching.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Watching</h2>
              <div className="space-y-3">
                {watching.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} onRemove={removeMutation.mutate} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function AlertRow({ alert, onRemove }: { alert: BackInStockAlert; onRemove: (id: string) => void }) {
  return (
    <div className={cn("flex items-center gap-4 p-4 rounded-xl border bg-card", alert.is_triggered && "border-emerald-500/40 bg-emerald-500/5")}>
      <div className="flex-shrink-0">
        {alert.is_triggered ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        ) : (
          <Clock className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{alert.inventory_name}</p>
          {alert.is_triggered && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Available</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {alert.store_name}
          {alert.is_triggered && alert.current_stock > 0 && ` · ${alert.current_stock} in stock`}
          {alert.is_triggered && alert.triggered_at && ` · Restocked ${new Date(alert.triggered_at).toLocaleDateString()}`}
        </p>
      </div>
      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => onRemove(alert.inventory_id)}>
        <BellOff className="h-4 w-4" />
      </Button>
    </div>
  );
}
