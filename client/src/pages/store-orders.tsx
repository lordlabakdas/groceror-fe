import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ClipboardList, RefreshCw } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StoreOrder {
  id: string;
  total_price: number;
  status: string;
  item_names: string[];
  order_date: string;
}

interface StoreOrdersResponse {
  orders: StoreOrder[];
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  ready: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

const NEXT_STATUSES: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const FILTER_TABS = ["all", "pending", "confirmed", "ready", "delivered", "cancelled"] as const;
type FilterTab = (typeof FILTER_TABS)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupItems(names: string[]): { name: string; qty: number }[] {
  const counts: Record<string, number> = {};
  for (const n of names) counts[n] = (counts[n] ?? 0) + 1;
  return Object.entries(counts).map(([name, qty]) => ({ name, qty }));
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Order card
// ---------------------------------------------------------------------------

interface OrderCardProps {
  order: StoreOrder;
  onStatusChange: (id: string, status: string) => void;
  isPending: boolean;
}

function OrderCard({ order, onStatusChange, isPending }: OrderCardProps) {
  const items = groupItems(order.item_names);
  const badgeCls = STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600";
  const nextStatuses = NEXT_STATUSES[order.status] ?? [];

  return (
    <div className="rounded-xl border bg-card shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">#{shortId(order.id)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(order.order_date)}</p>
        </div>
        <Badge className={`${badgeCls} border text-xs font-semibold`}>
          {STATUS_LABELS[order.status] ?? order.status}
        </Badge>
      </div>

      <div className="space-y-1">
        {items.map(({ name, qty }) => (
          <div key={name} className="flex justify-between text-sm">
            <span className="text-foreground">{name}</span>
            <span className="text-muted-foreground tabular-nums">× {qty}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1 border-t">
        <span className="font-semibold text-base">${order.total_price.toFixed(2)}</span>

        {nextStatuses.length > 0 && (
          <Select
            value=""
            onValueChange={(val) => onStatusChange(order.id, val)}
            disabled={isPending}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Update status" />
            </SelectTrigger>
            <SelectContent>
              {nextStatuses.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  Mark as {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {nextStatuses.length === 0 && (
          <span className="text-xs text-muted-foreground italic">
            {order.status === "delivered" ? "Complete" : "Cancelled"}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StoreOrders() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterTab>("all");

  const { data, isLoading, refetch, isFetching } = useQuery<StoreOrdersResponse>({
    queryKey: ["/order/store-orders"],
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PUT", `/order/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/order/store-orders"] });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const orders = data?.orders ?? [];
  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const countFor = (tab: FilterTab) =>
    tab === "all" ? orders.length : orders.filter((o) => o.status === tab).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Incoming Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {orders.length} {orders.length === 1 ? "order" : "orders"} total
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => {
          const count = countFor(tab);
          if (tab !== "all" && count === 0) return null;
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                filter === tab
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-background text-muted-foreground border-border hover:border-emerald-400 hover:text-emerald-700"
              }`}
            >
              {tab === "all" ? "All" : STATUS_LABELS[tab]}
              <span className={`ml-1.5 text-xs ${filter === tab ? "opacity-80" : "opacity-60"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* orders grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3 text-center">
          <ClipboardList className="h-14 w-14 text-muted-foreground/30" />
          <p className="text-lg font-medium text-muted-foreground">
            {orders.length === 0 ? "No orders yet" : "No orders in this category"}
          </p>
          {orders.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Orders will appear here when shoppers checkout from your store.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={(id, s) => statusMutation.mutate({ id, status: s })}
              isPending={statusMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
