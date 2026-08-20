import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/currency";
import { BASE_URL } from "@/lib/queryClient";
import type { AdminSubscriptionListResponse } from "@/types/models";

// Deliberately separate from groceror_auth_token (queryClient.ts) — this is
// not the JWT auth system, it's the same shared-secret X-Admin-Token already
// used by POST /store/{id}/verify, just with a UI in front of it instead of
// curl. See SPEC_SUBSCRIPTION.md §5, §8.
const ADMIN_TOKEN_KEY = "groceror_admin_token";

class AdminApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function adminFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "x-admin-token": token,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new AdminApiError(res.status, text || res.statusText);
  }
  return res.json();
}

function TokenGate({ onSubmit, error }: { onSubmit: (token: string) => void; error?: string }) {
  const [value, setValue] = useState("");
  return (
    <div className="max-w-sm mx-auto mt-24 space-y-4">
      <div className="flex items-center gap-2 justify-center text-muted-foreground">
        <ShieldAlert className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Admin access</h1>
      </div>
      <Input
        type="password"
        placeholder="Admin token"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && value && onSubmit(value)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" onClick={() => value && onSubmit(value)} disabled={!value}>
        Continue
      </Button>
    </div>
  );
}

export default function AdminBilling() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [gateError, setGateError] = useState<string | undefined>();
  const [priceInput, setPriceInput] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  function handleTokenSubmit(candidate: string) {
    localStorage.setItem(ADMIN_TOKEN_KEY, candidate);
    setGateError(undefined);
    setToken(candidate);
  }

  function handleAuthFailure() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setGateError("Invalid admin token.");
    setToken(null);
  }

  const listQuery = useQuery<AdminSubscriptionListResponse>({
    queryKey: ["admin-billing-list", token],
    queryFn: () => adminFetch("/subscription/admin/list", token!),
    enabled: !!token,
    retry: false,
  });

  const priceQuery = useQuery<{ price_paise: number; effective_since: string }>({
    queryKey: ["admin-billing-price", token],
    queryFn: () => adminFetch("/subscription/admin/plan-price", token!),
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (listQuery.error instanceof AdminApiError && listQuery.error.status === 403 && token) {
      handleAuthFailure();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listQuery.error, token]);

  const unlockMutation = useMutation({
    mutationFn: (storeId: string) =>
      adminFetch(`/subscription/${storeId}/admin/unlock`, token!, { method: "POST" }),
    onSuccess: () => {
      toast({ title: "Store unlocked" });
      qc.invalidateQueries({ queryKey: ["admin-billing-list"] });
    },
    onError: (err: Error) => toast({ title: "Unlock failed", description: err.message, variant: "destructive" }),
  });

  const setPriceMutation = useMutation({
    mutationFn: (pricePaise: number) =>
      adminFetch("/subscription/admin/plan-price", token!, {
        method: "POST",
        body: JSON.stringify({ price_paise: pricePaise }),
      }),
    onSuccess: () => {
      toast({ title: "Plan price updated", description: "Applies to new checkouts only — existing subscribers keep their price." });
      setPriceInput("");
      qc.invalidateQueries({ queryKey: ["admin-billing-price"] });
    },
    onError: (err: Error) => toast({ title: "Price update failed", description: err.message, variant: "destructive" }),
  });

  if (!token) {
    return <TokenGate onSubmit={handleTokenSubmit} error={gateError} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Subscription billing (admin)</h1>

      <Card>
        <CardHeader>
          <CardTitle>Plan price</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Current: {priceQuery.data ? formatPrice(priceQuery.data.price_paise / 100) : "…"} / month
          </p>
          <div className="flex gap-2 max-w-xs">
            <Input
              type="number"
              min="1"
              step="0.01"
              placeholder="New price (₹)"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
            />
            <Button
              onClick={() => setPriceMutation.mutate(Math.round(parseFloat(priceInput) * 100))}
              disabled={!priceInput || setPriceMutation.isPending}
            >
              Update
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Not retroactive — only affects stores that check out after this change.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Subscriptions
            {listQuery.data && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                MRR: {formatPrice(listQuery.data.mrr_paise / 100)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {listQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Period end</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.data?.subscriptions.map((row) => (
                  <TableRow key={row.store_id}>
                    <TableCell>{row.store_name}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "locked" ? "destructive" : "outline"}>{row.status}</Badge>
                    </TableCell>
                    <TableCell>{row.plan_price_paise != null ? formatPrice(row.plan_price_paise / 100) : "—"}</TableCell>
                    <TableCell>
                      {row.current_period_end ? new Date(row.current_period_end).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      {row.status === "locked" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => unlockMutation.mutate(row.store_id)}
                          disabled={unlockMutation.isPending}
                        >
                          <Unlock className="h-3.5 w-3.5" />
                          Unlock
                        </Button>
                      )}
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
