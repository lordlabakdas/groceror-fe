import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertTriangle,
  ShoppingBag,
  Calendar,
  TrendingUp,
  DollarSign,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

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

// ---------------------------------------------------------------------------
// Status colours (matches store-orders.tsx)
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  ready: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
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
    red: "border-red-200 bg-red-50 text-red-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
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
  icon: React.ReactNode;
  borderColor: string;
  children: React.ReactNode;
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
          value={`$${data.todays_summary.revenue.toFixed(2)}`}
          color="green"
        />
        <KpiCard label="Expiring Soon" value={data.expiring_soon.length} color="amber" />
      </div>

      {/* 2×2 panel grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Low Stock */}
        <Panel
          title="Low Stock"
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          borderColor="border-l-red-400"
        >
          {data.low_stock.length === 0 ? (
            <EmptyState message="All items are well stocked — nice work!" />
          ) : (
            data.low_stock.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm py-1">
                <Link href="/inventory">
                  <a className="font-medium hover:text-emerald-700 hover:underline underline-offset-2">
                    {item.name}
                  </a>
                </Link>
                <span className="text-red-600 font-semibold tabular-nums">
                  {item.quantity} / {item.threshold}
                </span>
              </div>
            ))
          )}
        </Panel>

        {/* Today's Orders */}
        <Panel
          title="Today's Orders"
          icon={<ShoppingBag className="h-4 w-4 text-emerald-600" />}
          borderColor="border-l-emerald-400"
        >
          {data.todays_summary.orders.length === 0 ? (
            <EmptyState message="No orders yet today." />
          ) : (
            data.todays_summary.orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between text-sm py-1">
                <div className="flex items-center gap-2">
                  <Badge
                    className={`text-xs border ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}
                    variant="outline"
                  >
                    {order.status}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {new Date(order.order_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <span className="font-semibold text-emerald-700">
                  ${order.total_price.toFixed(2)}
                </span>
              </div>
            ))
          )}
        </Panel>

        {/* Expiring Soon */}
        <Panel
          title="Expiring Soon"
          icon={<Calendar className="h-4 w-4 text-amber-500" />}
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
                    {format(new Date(item.expiry_date), "MMM d")}
                  </span>
                  <Badge
                    className={
                      item.days_remaining <= 2
                        ? "bg-red-100 text-red-700 border-red-200 text-xs"
                        : "bg-amber-100 text-amber-700 border-amber-200 text-xs"
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

        {/* Top Sellers */}
        <Panel
          title="Top Sellers — Last 7 Days"
          icon={<TrendingUp className="h-4 w-4 text-purple-500" />}
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
                <span className="font-semibold text-purple-700">
                  ${item.revenue.toFixed(2)}
                </span>
              </div>
            ))
          )}
        </Panel>

      </div>
    </div>
  );
}
