import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface StockAlert {
  id: string;
  inventory_id: string;
  inventory_name: string;
  current_stock: number;
  threshold: number;
  is_triggered: boolean;
  triggered_at: string | null;
  acknowledged_at: string | null;
}

export default function StockAlerts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: alerts = [], isLoading } = useQuery<StockAlert[]>({
    queryKey: ["/stock-alerts"],
  });

  const ackMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/stock-alerts/${id}/acknowledge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/stock-alerts"] });
      toast({ description: "Alert acknowledged" });
    },
  });

  const triggered = alerts.filter((a) => a.is_triggered);
  const watching = alerts.filter((a) => !a.is_triggered);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-44" />
        {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-400" />
        <h1 className="text-2xl font-bold">Stock Alerts</h1>
        {triggered.length > 0 && (
          <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/30">
            {triggered.length} triggered
          </Badge>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Package className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No stock thresholds set.</p>
          <p className="text-sm text-muted-foreground">
            Set a threshold on any inventory item to be alerted when stock runs low.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {triggered.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-rose-400 uppercase tracking-wide">Triggered</h2>
              {triggered.map((alert) => (
                <AlertRow key={alert.id} alert={alert} onAck={() => ackMutation.mutate(alert.id)} loading={ackMutation.isPending} />
              ))}
            </div>
          )}
          {watching.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Watching</h2>
              {watching.map((alert) => (
                <AlertRow key={alert.id} alert={alert} onAck={() => {}} loading={false} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AlertRow({ alert, onAck, loading }: { alert: StockAlert; onAck: () => void; loading: boolean }) {
  const pct = Math.min(100, Math.round((alert.current_stock / Math.max(alert.threshold, 1)) * 100));

  return (
    <div className={cn(
      "flex items-center gap-4 p-4 rounded-xl border bg-card",
      alert.is_triggered && "border-rose-500/40 bg-rose-500/5"
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{alert.inventory_name}</p>
          {alert.is_triggered && <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {alert.current_stock} in stock · threshold {alert.threshold}
          {alert.triggered_at && ` · triggered ${new Date(alert.triggered_at).toLocaleDateString()}`}
        </p>
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden w-full max-w-xs">
          <div
            className={cn("h-full rounded-full transition-all", alert.is_triggered ? "bg-rose-400" : "bg-emerald-400")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {alert.is_triggered && (
        <Button size="sm" variant="outline" onClick={onAck} disabled={loading}>
          <CheckCircle className="h-4 w-4 mr-1" />
          Acknowledge
        </Button>
      )}
    </div>
  );
}
