import { useQuery } from "@tanstack/react-query";
import { Star, TrendingUp, TrendingDown, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LoyaltyBalance {
  points_balance: number;
  total_earned: number;
  total_redeemed: number;
  dollar_value: number;
}

interface LoyaltyTransaction {
  id: string;
  order_id: string | null;
  points: number;
  transaction_type: "earned" | "redeemed" | "adjusted";
  description: string;
  created_at: string;
}

interface LoyaltyHistory {
  transactions: LoyaltyTransaction[];
}

function TxnRow({ t }: { t: LoyaltyTransaction }) {
  const isEarned = t.points > 0;
  const Icon = isEarned ? TrendingUp : TrendingDown;
  const color = isEarned ? "text-emerald-400" : "text-amber-400";
  const sign = isEarned ? "+" : "";
  const date = new Date(t.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <div className={`rounded-full p-2 bg-muted ${color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{t.description}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
      </div>
      <span className={`text-sm font-semibold ${color} shrink-0`}>
        {sign}{t.points} pts
      </span>
    </div>
  );
}

export default function LoyaltyPage() {
  const { data: balance, isLoading: balLoading } = useQuery<LoyaltyBalance>({
    queryKey: ["/loyalty/balance"],
  });

  const { data: history, isLoading: histLoading } = useQuery<LoyaltyHistory>({
    queryKey: ["/loyalty/history"],
  });

  const txns = history?.transactions ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Loyalty Points</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Earn 1 point per $1 spent — redeem at checkout (100 pts = $1)</p>
      </div>

      {/* Balance card */}
      {balLoading ? (
        <div className="h-36 rounded-2xl bg-muted animate-pulse" />
      ) : (
        <div className="rounded-2xl border bg-gradient-to-br from-primary/10 to-primary/5 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current balance</p>
              <p className="text-4xl font-bold text-primary mt-1">{balance?.points_balance ?? 0}</p>
              <p className="text-sm text-muted-foreground mt-0.5">≈ ${balance?.dollar_value.toFixed(2) ?? "0.00"} in savings</p>
            </div>
            <div className="bg-primary/20 rounded-2xl p-3">
              <Star className="h-7 w-7 text-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Total earned</p>
              <p className="text-base font-semibold text-emerald-400">{balance?.total_earned ?? 0} pts</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total redeemed</p>
              <p className="text-base font-semibold text-amber-400">{balance?.total_redeemed ?? 0} pts</p>
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How it works</p>
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> Earn 1 point for every $1 you spend</p>
          <p className="flex items-center gap-2"><Gift className="h-3.5 w-3.5 text-amber-400 shrink-0" /> Redeem points at checkout — 100 points = $1 off</p>
          <p className="flex items-center gap-2"><Star className="h-3.5 w-3.5 text-primary shrink-0" /> Points never expire</p>
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <h2 className="text-base font-semibold mb-3">Transaction history</h2>
        {histLoading && <div className="h-40 rounded-xl bg-muted animate-pulse" />}
        {!histLoading && txns.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Star className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p>No transactions yet. Place an order to start earning!</p>
          </div>
        )}
        {txns.length > 0 && (
          <div className="rounded-xl border bg-card px-4">
            {txns.map((t) => <TxnRow key={t.id} t={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}
