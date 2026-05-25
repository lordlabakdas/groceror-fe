import { useQuery } from "@tanstack/react-query";
import { Package, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface OrderItem {
  id: string;
  total_price: number;
  status: string;
  items: string[];
  order_date: string;
}

interface OrderHistoryResponse {
  orders: OrderItem[];
}

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "completed") return "default";
  if (status === "cancelled") return "destructive";
  return "secondary";
}

function OrderRow({ order }: { order: OrderItem }) {
  const [expanded, setExpanded] = useState(false);
  const uniqueItems = Array.from(new Set(order.items));
  const date = new Date(order.order_date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <button
        className="w-full text-left p-5 flex items-center gap-4 hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">
            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-bold text-sm">${order.total_price.toFixed(2)}</span>
          <Badge variant={statusVariant(order.status)} className="capitalize text-xs">
            {order.status}
          </Badge>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-5 py-4 bg-muted/20 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Items
          </p>
          {uniqueItems.map((itemId) => {
            const qty = order.items.filter((i) => i === itemId).length;
            return (
              <div key={itemId} className="flex justify-between text-sm">
                <span className="text-muted-foreground font-mono text-xs truncate max-w-[260px]">
                  {itemId}
                </span>
                {qty > 1 && (
                  <span className="text-muted-foreground text-xs ml-2">×{qty}</span>
                )}
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground pt-2">
            Order ID: <span className="font-mono">{order.id}</span>
          </p>
        </div>
      )}
    </div>
  );
}

export default function Orders() {
  const { data, isLoading } = useQuery<OrderHistoryResponse>({
    queryKey: ["/order/history"],
  });

  const orders = data?.orders ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Order History</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your past orders</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl border bg-muted animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No orders yet. Start shopping to see your history here.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
