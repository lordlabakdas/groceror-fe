import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
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
