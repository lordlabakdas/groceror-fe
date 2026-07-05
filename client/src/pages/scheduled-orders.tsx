import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Play, Pause, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ScheduledItem {
  inventory_id: string;
  item_name: string;
  quantity: number;
}

interface ScheduledOrder {
  id: string;
  store_id: string;
  store_name: string;
  frequency: string;
  next_run_date: string;
  is_active: boolean;
  last_run_at: string | null;
  created_at: string;
  items: ScheduledItem[];
}

const FREQ_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
};

export default function ScheduledOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery<ScheduledOrder[]>({
    queryKey: ["/scheduled-orders"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { frequency?: string; is_active?: boolean } }) => {
      return apiRequest("PUT", `/scheduled-orders/${id}`, payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/scheduled-orders"] }),
    onError: () => toast({ description: "Update failed", variant: "destructive" }),
  });

  const runNowMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/scheduled-orders/${id}/run-now`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/scheduled-orders"] });
      toast({ description: "Order placed successfully" });
    },
    onError: () => toast({ description: "Failed to place order", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/scheduled-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/scheduled-orders"] });
      toast({ description: "Recurring order cancelled" });
    },
  });

  const isPast = (dateStr: string) => new Date(dateStr) <= new Date();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-48" />
        {[1, 2].map((i) => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Recurring Orders</h1>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <CalendarClock className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No recurring orders set up yet.</p>
          <p className="text-sm text-muted-foreground">
            Go to your cart and choose "Schedule recurring" to repeat an order automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className={cn("rounded-xl border bg-card p-4 space-y-3", !order.is_active && "opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{order.store_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs">{FREQ_LABELS[order.frequency] ?? order.frequency}</Badge>
                    {order.is_active ? (
                      <Badge className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Paused</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    title={order.is_active ? "Pause" : "Resume"}
                    onClick={() => updateMutation.mutate({ id: order.id, payload: { is_active: !order.is_active } })}
                    disabled={updateMutation.isPending}
                  >
                    {order.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    title="Run now"
                    onClick={() => runNowMutation.mutate(order.id)}
                    disabled={runNowMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    title="Cancel"
                    onClick={() => deleteMutation.mutate(order.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-0.5">
                {order.items.map((item, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {item.quantity}× {item.item_name}
                  </p>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Next: <span className={cn("font-medium", isPast(order.next_run_date) && "text-amber-400")}>
                    {new Date(order.next_run_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  {order.last_run_at && (
                    <> · Last run: {new Date(order.last_run_at).toLocaleDateString()}</>
                  )}
                </div>
                <Select
                  value={order.frequency}
                  onValueChange={(val) => updateMutation.mutate({ id: order.id, payload: { frequency: val } })}
                >
                  <SelectTrigger className="h-7 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
