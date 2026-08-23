import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  ShoppingBag,
  Calendar,
  TrendingUp,
  Package,
  PackagePlus,
  Megaphone,
  Trash2,
  Rocket,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  TopSellersChart,
  OrdersByStatusChart,
  RevenueTrendChart,
} from "@/components/dashboard-charts";
import { formatPrice } from "@/lib/currency";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  threshold: number;
}

interface TodaysOrder {
  id: string;
  total_price: number;
  status: string;
  order_date: string;
}

interface TodaysSummary {
  order_count: number;
  revenue: number;
  orders: TodaysOrder[];
}

interface ExpiringItem {
  id: string;
  name: string;
  quantity: number;
  expiry_date: string;
  days_remaining: number;
}

interface TopSellerItem {
  id: string;
  name: string;
  units_sold: number;
  revenue: number;
}

interface DashboardData {
  low_stock: LowStockItem[];
  todays_summary: TodaysSummary;
  expiring_soon: ExpiringItem[];
  top_sellers: TopSellerItem[];
}

interface FeedPost {
  id: string;
  update_type: "coupon" | "promotion" | "flash_sale" | "announcement" | "sponsored";
  message: string;
  created_at: string;
}

interface SponsoredPost {
  id: string;
  message: string;
  amount_paise: number;
  status: "pending" | "paid" | "failed";
  created_at: string;
  paid_at: string | null;
}

// Loaded via a <script> tag in client/index.html — Razorpay's Checkout
// widget isn't an npm package, it's expected to be a global. Same
// declaration as billing.tsx's (TS merges repeated `declare global` blocks
// for the same interface as long as the shapes agree).
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

// ---------------------------------------------------------------------------
// Status colours (matches store-orders.tsx)
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-900/30 text-amber-300 border border-amber-700/40",
  confirmed: "bg-blue-900/30 text-blue-300 border border-blue-700/40",
  ready: "bg-purple-900/30 text-purple-300 border border-purple-700/40",
  delivered: "bg-amber-900/30 text-amber-300 border border-amber-700/40",
  cancelled: "bg-muted text-muted-foreground border border-border",
};

// ---------------------------------------------------------------------------
// KPI strip card
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: "red" | "green" | "amber";
}) {
  const colorCls = {
    red: "bg-red-900/20 border-red-800/40 text-red-400",
    green: "bg-primary/15 border-primary/25 text-primary",
    amber: "bg-amber-900/20 border-amber-800/40 text-amber-400",
  }[color];

  return (
    <div className={`rounded-xl border px-4 py-3 ${colorCls}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-0.5">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel wrapper
// ---------------------------------------------------------------------------

function Panel({
  title,
  icon,
  borderColor,
  children,
}: {
  title: string;
  icon: ReactNode;
  borderColor: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border bg-card shadow-sm overflow-hidden border-l-4 ${borderColor}`}>
      <div className="px-4 py-3 border-b flex items-center gap-2">
        {icon}
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <div className="px-4 py-3 space-y-2 max-h-64 overflow-y-auto">{children}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted-foreground text-center py-6">{message}</p>
  );
}

// ---------------------------------------------------------------------------
// Followers feed panel — post an announcement, see own recent activity
// ---------------------------------------------------------------------------

function StoreUpdatesPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [message, setMessage] = useState("");

  const { data: myStores } = useQuery<{ id: string }[]>({ queryKey: ["/stores/my-stores"] });
  const storeId = myStores?.[0]?.id;
  const updatesKey = `/stores/${storeId}/updates`;

  const { data: updates } = useQuery<{ items: FeedPost[] }>({
    queryKey: [updatesKey],
    enabled: !!storeId,
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/stores/updates", { message });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [updatesKey] });
      toast({ description: "Posted to your followers' feed" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/stores/updates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [updatesKey] });
    },
  });

  return (
    <Panel
      title="Followers Feed"
      icon={<Megaphone className="h-4 w-4 text-primary" />}
      borderColor="border-l-primary"
    >
      <form
        className="flex gap-2 pb-2 mb-2 border-b"
        onSubmit={(e) => {
          e.preventDefault();
          if (message.trim()) postMutation.mutate();
        }}
      >
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Post an update to your followers…"
          maxLength={1000}
          className="h-8 text-sm"
        />
        <Button type="submit" size="sm" disabled={!message.trim() || postMutation.isPending}>
          Post
        </Button>
      </form>

      {!updates || updates.items.length === 0 ? (
        <EmptyState message="Coupons, promotions, and flash sales you create show up here automatically — or post an announcement above." />
      ) : (
        updates.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 text-sm py-1">
            <div className="min-w-0 flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs flex-shrink-0 capitalize">
                {item.update_type.replace("_", " ")}
              </Badge>
              <span className="truncate">{item.message}</span>
            </div>
            {item.update_type === "announcement" && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 flex-shrink-0 text-muted-foreground"
                onClick={() => deleteMutation.mutate(item.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Sponsored posts panel — pay a one-time fee to reach every shopper's feed,
// not just followers (SPEC_SPONSORED_POSTS.md)
// ---------------------------------------------------------------------------

const SPONSORED_STATUS_STYLES: Record<SponsoredPost["status"], string> = {
  paid: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
};

function SponsoredPostsPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [message, setMessage] = useState("");

  const { data: history } = useQuery<{ items: SponsoredPost[] }>({
    queryKey: ["/stores/sponsored-posts"],
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/stores/sponsored-posts", { message });
      return res.json() as Promise<{
        sponsored_post_id: string;
        razorpay_order_id: string;
        amount_paise: number;
        razorpay_key_id: string;
      }>;
    },
    onSuccess: ({ sponsored_post_id, razorpay_order_id, amount_paise, razorpay_key_id }) => {
      // The pending row exists now — show it even before checkout finishes.
      queryClient.invalidateQueries({ queryKey: ["/stores/sponsored-posts"] });

      if (typeof window.Razorpay !== "function") {
        toast({
          title: "Couldn't load payment widget",
          description: "Refresh the page and try again.",
          variant: "destructive",
        });
        return;
      }

      const rzp = new window.Razorpay({
        key: razorpay_key_id,
        order_id: razorpay_order_id,
        amount: amount_paise,
        currency: "INR",
        name: "Groceror",
        description: "Sponsored post",
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await apiRequest("POST", `/stores/sponsored-posts/${sponsored_post_id}/confirm`, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            setMessage("");
            queryClient.invalidateQueries({ queryKey: ["/stores/sponsored-posts"] });
            toast({ description: "Sponsored post is live — every shopper on Groceror can now see it." });
          } catch {
            toast({
              title: "Payment succeeded but the post couldn't be confirmed",
              description: "Contact support with your payment ID — you won't be charged again.",
              variant: "destructive",
            });
          }
        },
        theme: { color: "#f59e0b" },
      });
      rzp.open();
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't start checkout", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Panel
      title="Sponsored Posts"
      icon={<Rocket className="h-4 w-4 text-amber-400" />}
      borderColor="border-l-amber-400"
    >
      <form
        className="flex gap-2 pb-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (message.trim()) postMutation.mutate();
        }}
      >
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Reach every shopper on Groceror…"
          maxLength={1000}
          className="h-8 text-sm"
        />
        <Button type="submit" size="sm" disabled={!message.trim() || postMutation.isPending}>
          {postMutation.isPending ? "Starting…" : "Post & Pay"}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground pb-2 mb-2 border-b">
        Reaches every shopper, not just your followers. You'll see the price before you pay — no refunds once it's live.
      </p>

      {!history || history.items.length === 0 ? (
        <EmptyState message="Sponsored posts you buy show up here." />
      ) : (
        history.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 text-sm py-1">
            <div className="min-w-0 flex items-center gap-1.5">
              <Badge variant="outline" className={`text-xs flex-shrink-0 capitalize ${SPONSORED_STATUS_STYLES[item.status]}`}>
                {item.status}
              </Badge>
              <span className="truncate">{item.message}</span>
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">
              {formatPrice(item.amount_paise / 100)}
            </span>
          </div>
        ))
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48 rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { data, isLoading, isError, dataUpdatedAt } = useQuery<DashboardData>({
    queryKey: ["/dashboard/"],
    refetchInterval: 60_000,
  });

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-center">
        <Package className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-lg font-medium">Could not load dashboard</p>
        <p className="text-sm text-muted-foreground">Check your connection and try refreshing.</p>
      </div>
    );
  }

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

  // Restock suggestions: low-stock items ranked by how fast they sell.
  // Items that are both low and top sellers are the most urgent reorders.
  const unitsSoldById = new Map(data.top_sellers.map((t) => [t.id, t.units_sold]));
  const restockSuggestions = [...data.low_stock]
    .map((item) => ({ ...item, units_sold: unitsSoldById.get(item.id) ?? 0 }))
    .sort((a, b) => b.units_sold - a.units_sold || a.quantity - b.quantity);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Last updated {lastUpdated} · auto-refreshes every 60s
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Low Stock" value={data.low_stock.length} color="red" />
        <KpiCard label="Orders Today" value={data.todays_summary.order_count} color="green" />
        <KpiCard
          label="Revenue Today"
          value={formatPrice(data.todays_summary.revenue)}
          color="green"
        />
        <KpiCard label="Expiring Soon" value={data.expiring_soon.length} color="amber" />
      </div>

      {/* Revenue trend */}
      <RevenueTrendChart />

      {/* Charts row */}
      {(data.top_sellers.length > 0 || data.todays_summary.orders.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TopSellersChart items={data.top_sellers} />
          <OrdersByStatusChart orders={data.todays_summary.orders} />
        </div>
      )}

      {/* 2×2 panel grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Low Stock */}
        <Panel
          title="Low Stock"
          icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
          borderColor="border-l-red-400"
        >
          {data.low_stock.length === 0 ? (
            <EmptyState message="All items are well stocked — nice work!" />
          ) : (
            data.low_stock.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm py-1">
                <Link href="/inventory">
                  <a className="font-medium hover:text-primary hover:underline underline-offset-2">
                    {item.name}
                  </a>
                </Link>
                <span className="text-red-400 font-semibold tabular-nums">
                  {item.quantity} / {item.threshold}
                </span>
              </div>
            ))
          )}
        </Panel>

        {/* Today's Orders */}
        <Panel
          title="Today's Orders"
          icon={<ShoppingBag className="h-4 w-4 text-primary" />}
          borderColor="border-l-primary"
        >
          {data.todays_summary.orders.length === 0 ? (
            <EmptyState message="No orders yet today." />
          ) : (
            data.todays_summary.orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between text-sm py-1">
                <div className="flex items-center gap-2">
                  <Badge
                    className={`text-xs border ${STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground border-border"}`}
                    variant="outline"
                  >
                    {order.status}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {new Date(order.order_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <span className="font-semibold text-primary">
                  {formatPrice(order.total_price)}
                </span>
              </div>
            ))
          )}
        </Panel>

        {/* Expiring Soon */}
        <Panel
          title="Expiring Soon"
          icon={<Calendar className="h-4 w-4 text-amber-400" />}
          borderColor="border-l-amber-400"
        >
          {data.expiring_soon.length === 0 ? (
            <EmptyState message="No items expiring in the next 7 days." />
          ) : (
            data.expiring_soon.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm py-1">
                <span className="font-medium">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {(() => {
                      const [y, m, d] = item.expiry_date.split("-").map(Number);
                      return format(new Date(y, m - 1, d), "MMM d");
                    })()}
                  </span>
                  <Badge
                    className={
                      item.days_remaining <= 2
                        ? "bg-red-900/30 text-red-300 border-red-700/40 text-xs"
                        : "bg-amber-900/30 text-amber-300 border-amber-700/40 text-xs"
                    }
                    variant="outline"
                  >
                    {item.days_remaining}d
                  </Badge>
                </div>
              </div>
            ))
          )}
        </Panel>

        {/* Restock Suggestions */}
        <Panel
          title="Restock Suggestions"
          icon={<PackagePlus className="h-4 w-4 text-primary" />}
          borderColor="border-l-primary"
        >
          {restockSuggestions.length === 0 ? (
            <EmptyState message="Nothing needs restocking right now." />
          ) : (
            restockSuggestions.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm py-1">
                <div className="flex items-center gap-2 min-w-0">
                  <Link href="/inventory">
                    <a className="font-medium truncate hover:text-primary hover:underline underline-offset-2">
                      {item.name}
                    </a>
                  </Link>
                  {item.units_sold > 0 && (
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary border-primary/25 text-xs flex-shrink-0"
                    >
                      ×{item.units_sold} this week
                    </Badge>
                  )}
                </div>
                <span
                  className={`font-semibold tabular-nums flex-shrink-0 ${
                    item.quantity === 0 ? "text-red-400" : "text-amber-400"
                  }`}
                >
                  {item.quantity} left
                </span>
              </div>
            ))
          )}
        </Panel>

        {/* Top Sellers */}
        <Panel
          title="Top Sellers — Last 7 Days"
          icon={<TrendingUp className="h-4 w-4 text-purple-400" />}
          borderColor="border-l-purple-400"
        >
          {data.top_sellers.length === 0 ? (
            <EmptyState message="No order data yet for this week." />
          ) : (
            data.top_sellers.map((item, i) => (
              <div key={item.id} className="flex items-center justify-between text-sm py-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs w-4 tabular-nums">{i + 1}.</span>
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground text-xs">×{item.units_sold}</span>
                </div>
                <span className="font-semibold text-purple-400">
                  {formatPrice(item.revenue)}
                </span>
              </div>
            ))
          )}
        </Panel>

        {/* Followers Feed */}
        <StoreUpdatesPanel />

        {/* Sponsored Posts */}
        <SponsoredPostsPanel />

      </div>
    </div>
  );
}
