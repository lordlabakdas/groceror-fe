import { useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface OrderLineItem {
  inventory_id: string;
  name: string;
  quantity: number;
  price: number;
}

interface OrderItem {
  id: string;
  total_price: number;
  status: string;
  items: OrderLineItem[];
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
  const [open, setOpen] = useState(false);
  const totalQty = order.items.reduce((acc, i) => acc + i.quantity, 0);
  const date = new Date(order.order_date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <button
        className="w-full text-left p-5 flex items-center gap-4 hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <ShoppingBag className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{date}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalQty} item{totalQty !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-bold text-sm">${order.total_price.toFixed(2)}</span>
          <Badge variant={statusVariant(order.status)} className="capitalize text-xs">
            {order.status}
          </Badge>
        </div>
      </button>
      {open && (
        <div className="border-t px-5 py-4 bg-muted/20 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Items
          </p>
          {order.items.map((item) => (
            <div key={item.inventory_id} className="flex justify-between text-sm">
              <span>
                {item.name} <span className="text-muted-foreground">×{item.quantity}</span>
              </span>
              <span className="text-muted-foreground">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
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
