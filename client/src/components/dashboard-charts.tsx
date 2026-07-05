import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, LineChart, PieChart as PieChartIcon } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface TopSellerItem {
  id: string;
  name: string;
  units_sold: number;
  revenue: number;
}

interface TodaysOrder {
  id: string;
  total_price: number;
  status: string;
  order_date: string;
}

interface RevenueTrendPoint {
  date: string; // "YYYY-MM-DD"
  revenue: number;
  order_count: number;
}

interface RevenueTrendResponse {
  trend: RevenueTrendPoint[];
}

// ---------------------------------------------------------------------------
// 30-day revenue trend — area chart
// ---------------------------------------------------------------------------

const revenueTrendConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function RevenueTrendChart() {
  const { data, isLoading } = useQuery<RevenueTrendResponse>({
    queryKey: ["/dashboard/revenue-trend?days=30"],
    refetchInterval: 300_000,
  });

  if (isLoading || !data) return null;

  const points = data.trend.map((p) => {
    const [, m, d] = p.date.split("-").map(Number);
    return { ...p, label: `${m}/${d}` };
  });
  const total = points.reduce((s, p) => s + p.revenue, 0);
  const totalOrders = points.reduce((s, p) => s + p.order_count, 0);

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LineChart className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">Revenue — Last 30 Days</h2>
        </div>
        <span className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">${total.toFixed(2)}</span>
          {" · "}
          {totalOrders} order{totalOrders !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="p-4">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            No revenue recorded in the last 30 days.
          </p>
        ) : (
          <ChartContainer config={revenueTrendConfig} className="h-56 w-full">
            <AreaChart data={points} margin={{ left: 8, right: 8 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeOpacity={0.15} />
              <XAxis
                dataKey="label"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(v) => `$${v}`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, " revenue"]}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                strokeWidth={2}
                fill="url(#revenueFill)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top sellers — horizontal revenue bars
// ---------------------------------------------------------------------------

const topSellersConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function TopSellersChart({ items }: { items: TopSellerItem[] }) {
  if (items.length === 0) return null;

  const data = items.slice(0, 6).map((i) => ({
    name: i.name.length > 14 ? i.name.slice(0, 13) + "…" : i.name,
    revenue: i.revenue,
    units: i.units_sold,
  }));

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-sm">Revenue by Product — Last 7 Days</h2>
      </div>
      <div className="p-4">
        <ChartContainer config={topSellersConfig} className="h-56 w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} strokeOpacity={0.15} />
            <XAxis type="number" tickFormatter={(v) => `$${v}`} fontSize={11} />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, " revenue"]}
                />
              }
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Today's orders by status — donut
// ---------------------------------------------------------------------------

const STATUS_CHART_COLORS: Record<string, string> = {
  placed: "hsl(var(--chart-1))",
  accepted: "hsl(var(--chart-2))",
  preparing: "hsl(var(--chart-4))",
  ready: "hsl(var(--chart-3))",
  delivered: "hsl(var(--chart-2))",
  rejected: "hsl(var(--chart-5))",
};

const ordersConfig = {
  count: { label: "Orders" },
} satisfies ChartConfig;

export function OrdersByStatusChart({ orders }: { orders: TodaysOrder[] }) {
  if (orders.length === 0) return null;

  const counts: Record<string, number> = {};
  for (const o of orders) {
    counts[o.status] = (counts[o.status] ?? 0) + 1;
  }
  const data = Object.entries(counts).map(([status, count]) => ({ status, count }));

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <PieChartIcon className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-sm">Today's Orders by Status</h2>
      </div>
      <div className="p-4 flex items-center gap-6">
        <ChartContainer config={ordersConfig} className="h-56 flex-1">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={STATUS_CHART_COLORS[entry.status] ?? "hsl(var(--muted-foreground))"}
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="space-y-2 pr-2">
          {data.map((entry) => (
            <div key={entry.status} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{
                  background: STATUS_CHART_COLORS[entry.status] ?? "hsl(var(--muted-foreground))",
                }}
              />
              <span className="capitalize text-muted-foreground">{entry.status}</span>
              <span className="font-semibold tabular-nums ml-auto">{entry.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
