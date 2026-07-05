import { useQuery } from "@tanstack/react-query";
import { Check, CheckCircle2, Clock, Package, RotateCcw, ShoppingBag, Truck, XCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import { getProductImage } from "@/lib/catalog";

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
  store_id?: string | null;
  store_name?: string | null;
}

interface OrderHistoryResponse {
  orders: OrderItem[];
}

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "completed") return "default";
  if (status === "cancelled") return "destructive";
  return "secondary";
}

// ---------------------------------------------------------------------------
// Status timeline — pending → confirmed → ready → delivered
// ---------------------------------------------------------------------------

const TIMELINE_STEPS = [
  { key: "pending", label: "Placed", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "ready", label: "Ready", icon: Package },
  { key: "delivered", label: "Delivered", icon: Truck },
] as const;

function OrderTimeline({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive px-3 py-2 text-sm">
        <XCircle className="h-4 w-4 flex-shrink-0" />
        This order was cancelled.
      </div>
    );
  }

  const currentIdx = TIMELINE_STEPS.findIndex((s) => s.key === status);
  if (currentIdx === -1) return null;

  return (
    <div className="flex items-center" aria-label={`Order status: ${status}`}>
      {TIMELINE_STEPS.map((step, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        const Icon = done ? Check : step.icon;
        return (
          <div key={step.key} className={cn("flex items-center", i > 0 && "flex-1")}>
            {i > 0 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-1 rounded-full",
                  i <= currentIdx ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                  done && "bg-primary border-primary text-primary-foreground",
                  current && "border-primary text-primary bg-primary/10",
                  !done && !current && "border-border text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium whitespace-nowrap",
                  current ? "text-primary" : done ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrderRow({ order }: { order: OrderItem }) {
  const [open, setOpen] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const { state, dispatch, openCart } = useCart();
  const { toast } = useToast();

  const totalQty = order.items.reduce((acc, i) => acc + i.quantity, 0);
  const date = new Date(order.order_date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  function doReorder() {
    dispatch({ type: "CLEAR_CART" });
    for (const item of order.items) {
      dispatch({
        type: "ADD_ITEM",
        payload: {
          id: item.inventory_id,
          quantity: item.quantity,
          name: item.name,
          price: item.price,
          storeId: order.store_id ?? "",
          storeName: order.store_name ?? "",
          imageUrl: getProductImage(item.name, "OTHER"),
          stock: 999,
        },
      });
    }
    setConfirmReplace(false);
    openCart();
    toast({
      title: "Cart ready",
      description: `${order.items.length} item${order.items.length !== 1 ? "s" : ""} added from your past order.`,
    });
  }

  function handleReorder(e: React.MouseEvent) {
    e.stopPropagation();
    const existingStoreId = state.items[0]?.storeId;
    if (existingStoreId && existingStoreId !== order.store_id) {
      setConfirmReplace(true);
    } else {
      doReorder();
    }
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <button
        className="w-full text-left p-5 flex items-center gap-4 hover:bg-muted/40 transition-colors"
        onClick={() => { setOpen((v) => !v); setConfirmReplace(false); }}
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <ShoppingBag className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{date}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalQty} item{totalQty !== 1 ? "s" : ""}
            {order.store_name && (
              <span className="ml-1.5 text-muted-foreground/70">· {order.store_name}</span>
            )}
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
          <div className="pb-4 pt-1">
            <OrderTimeline status={order.status} />
          </div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Items
            </p>
            {/* Reorder button / confirm */}
            {order.store_id && (
              confirmReplace ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Replace current cart?</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-6 text-xs px-2"
                    onClick={(e) => { e.stopPropagation(); doReorder(); }}
                  >
                    Yes, replace
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2"
                    onClick={(e) => { e.stopPropagation(); setConfirmReplace(false); }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs px-2 gap-1"
                  onClick={handleReorder}
                >
                  <RotateCcw className="h-3 w-3" />
                  Reorder
                </Button>
              )
            )}
          </div>
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
