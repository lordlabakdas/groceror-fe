import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/currency";
import { useSubscriptionStatus } from "@/hooks/use-subscription-status";
import type { SubscriptionInvoice, SubscriptionStatusValue } from "@/types/models";

const STATUS_STYLES: Record<
  SubscriptionStatusValue,
  { label: string; badge: string; icon: typeof CheckCircle2 }
> = {
  trialing: { label: "Trial", badge: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Clock },
  active: { label: "Active", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  grace: { label: "No payment required", badge: "bg-muted text-muted-foreground border-border", icon: CheckCircle2 },
  locked: { label: "No payment required", badge: "bg-muted text-muted-foreground border-border", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", badge: "bg-muted text-muted-foreground border-border", icon: XCircle },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function Billing() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: status, isLoading } = useSubscriptionStatus(true);
  const { data: invoicesData } = useQuery<{ invoices: SubscriptionInvoice[] }>({
    queryKey: ["/subscription/invoices"],
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/subscription/cancel");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Subscription cancelled" });
      qc.invalidateQueries({ queryKey: ["/subscription/status"] });
    },
  });

  if (isLoading || !status) {
    return <div className="text-muted-foreground">Loading billing details…</div>;
  }

  const style = STATUS_STYLES[status.status];
  const StatusIcon = style.icon;
  const invoices = invoicesData?.invoices ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Billing</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Subscription</span>
            <Badge variant="outline" className={`gap-1.5 ${style.badge}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {style.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-1">
            {status.razorpay_subscription_id && <div>Plan: {formatPrice(status.plan_price_paise / 100)} / month</div>}
            {status.status === "active" && status.current_period_end && (
              <div>Renews {formatDate(status.current_period_end)}</div>
            )}
            <div>No subscription payment is required to keep your store online.</div>
          </div>

          <div className="flex gap-2">
            {status.razorpay_subscription_id && status.status !== "cancelled" && (
              <Button
                variant="outline"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? "Cancelling…" : "Cancel subscription"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      {formatDate(inv.period_start)} – {formatDate(inv.period_end)}
                    </TableCell>
                    <TableCell>{formatPrice(inv.amount_paise / 100)}</TableCell>
                    <TableCell>
                      <Badge variant={inv.status === "paid" ? "outline" : "destructive"}>{inv.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
