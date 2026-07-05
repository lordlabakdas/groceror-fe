import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tag, Plus, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Coupon {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  uses_count: number;
  store_id: string;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

function couponStatus(c: Coupon): { label: string; color: string } {
  if (!c.is_active) return { label: "Deactivated", color: "text-muted-foreground" };
  const today = new Date().toISOString().slice(0, 10);
  if (c.valid_from && today < c.valid_from) return { label: "Scheduled", color: "text-blue-400" };
  if (c.valid_until && today > c.valid_until) return { label: "Expired", color: "text-destructive" };
  if (c.max_uses !== null && c.uses_count >= c.max_uses) return { label: "Used up", color: "text-orange-400" };
  return { label: "Active", color: "text-emerald-400" };
}

export default function CouponsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ["/coupons"],
  });

  const [form, setForm] = useState({
    code: "",
    discount_type: "percent" as "percent" | "fixed",
    discount_value: "",
    min_order_amount: "",
    max_uses: "",
    valid_from: "",
    valid_until: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/coupons", {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : null,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Failed to create coupon");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/coupons"] });
      setOpen(false);
      setForm({ code: "", discount_type: "percent", discount_value: "", min_order_amount: "", max_uses: "", valid_from: "", valid_until: "" });
      toast({ title: "Coupon created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (code: string) => {
      await apiRequest("DELETE", `/coupons/${code}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/coupons"] });
      toast({ title: "Coupon deactivated" });
    },
    onError: () => toast({ title: "Error deactivating coupon", variant: "destructive" }),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Coupons</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create discount codes for your shoppers</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> New coupon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create coupon</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Code</label>
                <Input
                  placeholder="e.g. SAVE10"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Type</label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm((f) => ({ ...f, discount_type: v as "percent" | "fixed" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent (%)</SelectItem>
                      <SelectItem value="fixed">Fixed ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Value</label>
                  <Input
                    type="number"
                    placeholder={form.discount_type === "percent" ? "e.g. 10" : "e.g. 5.00"}
                    value={form.discount_value}
                    onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Min order ($) optional</label>
                  <Input type="number" placeholder="e.g. 20" value={form.min_order_amount} onChange={(e) => setForm((f) => ({ ...f, min_order_amount: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Max uses optional</label>
                  <Input type="number" placeholder="e.g. 100" value={form.max_uses} onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Valid from optional</label>
                  <Input type="date" value={form.valid_from} onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Valid until optional</label>
                  <Input type="date" value={form.valid_until} onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))} />
                </div>
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.code || !form.discount_value}>
                {createMutation.isPending ? "Creating…" : "Create coupon"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl border bg-muted animate-pulse" />)}
        </div>
      )}

      {!isLoading && coupons.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Tag className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p>No coupons yet. Create one to attract more shoppers.</p>
        </div>
      )}

      {coupons.length > 0 && (
        <div className="space-y-3">
          {coupons.map((c) => {
            const { label, color } = couponStatus(c);
            const isEditable = c.is_active && label !== "Deactivated";
            return (
              <div key={c.id} className="rounded-xl border bg-card p-4 flex items-start gap-4">
                <div className="bg-muted rounded-lg px-3 py-2 shrink-0 text-center min-w-[80px]">
                  <p className="font-mono font-bold text-sm text-primary">{c.code}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.discount_type === "percent" ? `${c.discount_value}% off` : `$${c.discount_value} off`}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium ${color}`}>{label}</span>
                    {c.min_order_amount && (
                      <Badge variant="secondary" className="text-xs">Min ${c.min_order_amount}</Badge>
                    )}
                    {c.max_uses !== null && (
                      <Badge variant="secondary" className="text-xs">{c.uses_count}/{c.max_uses} uses</Badge>
                    )}
                    {c.max_uses === null && c.uses_count > 0 && (
                      <Badge variant="secondary" className="text-xs">{c.uses_count} uses</Badge>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {c.valid_from && <span><Clock className="h-3 w-3 inline mr-0.5" />From {c.valid_from}</span>}
                    {c.valid_until && <span>Until {c.valid_until}</span>}
                  </div>
                </div>
                {isEditable && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deactivateMutation.mutate(c.code)}
                    disabled={deactivateMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {!isEditable && (
                  label === "Active"
                    ? <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    : <XCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
