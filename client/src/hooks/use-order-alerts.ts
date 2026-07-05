import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface StoreOrder {
  id: string;
  total_price: number;
  status: string;
  order_date: string;
}

interface StoreOrdersResponse {
  orders: StoreOrder[];
}

const POLL_INTERVAL = 20_000;

/** Two-tone "new order" chime via Web Audio — no asset file needed. */
function playChime() {
  try {
    const ctx = new AudioContext();
    const play = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    play(880, 0, 0.25);
    play(1174.66, 0.18, 0.35); // D6 — rising interval reads as "good news"
    setTimeout(() => ctx.close(), 1000);
  } catch {
    // Audio blocked (no user gesture yet) — toast still shows.
  }
}

/**
 * Polls the store's orders and alerts (toast + chime + browser notification)
 * when a new order arrives. Mount once, in Layout, for store users only.
 */
export function useOrderAlerts(enabled: boolean) {
  const { toast } = useToast();
  const knownIds = useRef<Set<string> | null>(null);

  const { data } = useQuery<StoreOrdersResponse>({
    queryKey: ["/order/store-orders"],
    enabled,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: true,
  });

  // Ask for notification permission once, when alerts become active.
  useEffect(() => {
    if (enabled && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !data) return;

    const currentIds = new Set(data.orders.map((o) => o.id));

    // First fetch: baseline only, never alert on pre-existing orders.
    if (knownIds.current === null) {
      knownIds.current = currentIds;
      return;
    }

    const newOrders = data.orders.filter((o) => !knownIds.current!.has(o.id));
    knownIds.current = currentIds;

    if (newOrders.length === 0) return;

    playChime();

    const total = newOrders.reduce((s, o) => s + o.total_price, 0);
    const title =
      newOrders.length === 1
        ? "New order received"
        : `${newOrders.length} new orders received`;
    const description = `$${total.toFixed(2)} — open Orders to accept.`;

    toast({ title, description });

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(`Groceror — ${title}`, { body: description });
    }
  }, [data, enabled, toast]);
}
