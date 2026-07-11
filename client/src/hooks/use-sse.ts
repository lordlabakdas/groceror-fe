import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { getAuthToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.VITE_API_URL || "";

/**
 * Opens a single SSE connection to /sse/stream for the logged-in user.
 * Handles:
 *   - order_status_update  → invalidate /order/history + toast (shopper)
 *   - new_order            → invalidate /order/store-orders + toast (store)
 *   - low_stock_alert      → invalidate /stock-alerts + toast (store)
 *   - back_in_stock        → invalidate /back-in-stock + toast (shopper)
 *
 * Reconnects automatically (browser EventSource behaviour) with up to 3 retries
 * before giving up to avoid hammering a down server.
 */
export function useSSE() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const esRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    if (!user) return;

    const token = getAuthToken();
    if (!token) return;

    function connect() {
      const es = new EventSource(`${BASE_URL}/sse/stream?token=${encodeURIComponent(token!)}`);
      esRef.current = es;

      es.onopen = () => {
        retriesRef.current = 0;
      };

      es.addEventListener("order_status_update", (e) => {
        const data = JSON.parse(e.data) as { order_id: string; status: string };
        queryClient.invalidateQueries({ queryKey: ["/order/history"] });
        toast({
          title: "Order updated",
          description: `Your order status changed to ${data.status.toLowerCase().replace(/_/g, " ")}.`,
        });
      });

      es.addEventListener("new_order", (e) => {
        const data = JSON.parse(e.data) as { order_id: string; total_price: number };
        queryClient.invalidateQueries({ queryKey: ["/order/store-orders"] });
        toast({
          title: "New order received",
          description: `$${data.total_price.toFixed(2)} order just came in.`,
        });
      });

      es.addEventListener("low_stock_alert", (e) => {
        const data = JSON.parse(e.data) as { inventory_id: string; quantity: number; threshold: number };
        queryClient.invalidateQueries({ queryKey: ["/stock-alerts"] });
        toast({
          title: "Low stock alert",
          description: `An item dropped to ${data.quantity} units (threshold: ${data.threshold}).`,
          variant: "destructive",
        });
      });

      es.addEventListener("back_in_stock", (e) => {
        const data = JSON.parse(e.data) as { inventory_id: string; inventory_name: string };
        queryClient.invalidateQueries({ queryKey: ["/back-in-stock"] });
        toast({
          title: "Back in stock",
          description: `${data.inventory_name} is available again!`,
        });
      });

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (retriesRef.current < MAX_RETRIES) {
          retriesRef.current += 1;
          // exponential back-off: 2s, 4s, 8s
          const delay = Math.pow(2, retriesRef.current) * 1000;
          setTimeout(connect, delay);
        }
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [user]);
}
