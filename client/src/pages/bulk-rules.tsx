import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BulkRule {
  id: string;
  store_id: string;
  name: string;
  rule_type: string;
  is_active: boolean;
  bxgf_inventory_id: string | null;
  bxgf_inventory_name: string | null;
  buy_quantity: number | null;
  free_quantity: number | null;
  discount_type: string | null;
  discount_value: number | null;
  bundle_items: { inventory_id: string; name: string }[];
  created_at: string;
}

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

function RuleCard({ rule, onDelete }: { rule: BulkRule; onDelete: () => void }) {
  const isBxgf = rule.rule_type === "bxgf";

  return (
    <div className="rounded-xl border bg-card p-4 flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        {isBxgf ? <Package className="h-5 w-5 text-primary" /> : <Tag className="h-5 w-5 text-primary" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-sm">{rule.name}</p>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            {isBxgf ? "BXGF" : "Bundle"}
          </Badge>
        </div>

        {isBxgf && (
          <p className="text-xs text-muted-foreground">
            Buy <span className="font-medium text-foreground">{rule.buy_quantity}</span>, get{" "}
            <span className="font-medium text-foreground">{rule.free_quantity}</span> free
            {rule.bxgf_inventory_name && (
              <> · <span className="font-medium text-foreground">{rule.bxgf_inventory_name}</span></>
            )}
          </p>
        )}

        {!isBxgf && (
          <p className="text-xs text-muted-foreground">
            Buy bundle → {rule.discount_type === "percent"
              ? `${rule.discount_value}% off`
              : `$${rule.discount_value?.toFixed(2)} off`}
            <br />
            <span className="text-foreground font-medium">
              {rule.bundle_items.map((b) => b.name).join(", ")}
            </span>
          </p>
        )}
      </div>

      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function BXGFForm({
  inventory,
  onSuccess,
}: {
  inventory: InventoryItem[];
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [inventoryId, setInventoryId] = useState("");
  const [buyQty, setBuyQty] = useState("2");
  const [freeQty, setFreeQty] = useState("1");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/bulk-rules/bxgf", {
        name: name.trim(),
        inventory_id: inventoryId,
        buy_quantity: parseInt(buyQty),
        free_quantity: parseInt(freeQty),
      }),
    onSuccess: () => {
      setName(""); setInventoryId(""); setBuyQty("2"); setFreeQty("1");
      onSuccess();
      toast({ title: "Rule created" });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err?.message ?? "Could not create rule", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Rule name</Label>
        <Input placeholder="e.g. Buy 2 Get 1 Free on Apples" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Item</Label>
        <Select value={inventoryId} onValueChange={setInventoryId}>
          <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
          <SelectContent>
            {inventory.map((i) => (
              <SelectItem key={i.id} value={i.id}>{i.name} (${i.price.toFixed(2)})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Buy quantity</Label>
          <Input type="number" min="1" value={buyQty} onChange={(e) => setBuyQty(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Free quantity</Label>
          <Input type="number" min="1" value={freeQty} onChange={(e) => setFreeQty(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Preview: every {parseInt(buyQty) + parseInt(freeQty) || "?"} units, {freeQty} unit{parseInt(freeQty) !== 1 ? "s" : ""} are free.
      </p>
      <Button
        className="w-full"
        disabled={!name || !inventoryId || !buyQty || !freeQty || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? "Creating…" : "Create rule"}
      </Button>
    </div>
  );
}

function BundleForm({
  inventory,
  onSuccess,
}: {
  inventory: InventoryItem[];
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState("");
  const { toast } = useToast();

  function toggleItem(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/bulk-rules/bundle", {
        name: name.trim(),
        inventory_ids: selectedIds,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
      }),
    onSuccess: () => {
      setName(""); setSelectedIds([]); setDiscountType("percent"); setDiscountValue("");
      onSuccess();
      toast({ title: "Bundle rule created" });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err?.message ?? "Could not create rule", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Rule name</Label>
        <Input placeholder="e.g. Breakfast Bundle" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Bundle items (select 2+)</Label>
        <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
          {inventory.map((item) => (
            <label key={item.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40">
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => toggleItem(item.id)}
                className="accent-primary"
              />
              <span className="text-sm flex-1">{item.name}</span>
              <span className="text-xs text-muted-foreground">${item.price.toFixed(2)}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{selectedIds.length} item{selectedIds.length !== 1 ? "s" : ""} selected</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Discount type</Label>
          <Select value={discountType} onValueChange={setDiscountType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Percent (%)</SelectItem>
              <SelectItem value="fixed">Fixed ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Discount value</Label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder={discountType === "percent" ? "e.g. 10" : "e.g. 2.00"}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
          />
        </div>
      </div>
      <Button
        className="w-full"
        disabled={!name || selectedIds.length < 2 || !discountValue || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? "Creating…" : "Create bundle rule"}
      </Button>
    </div>
  );
}

export default function BulkRulesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: rules = [], isLoading } = useQuery<BulkRule[]>({
    queryKey: ["/bulk-rules"],
  });

  const { data: inventory = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/inventory/"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/bulk-rules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/bulk-rules"] });
      toast({ title: "Rule removed" });
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bulk Pricing Rules</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set up BXGF deals and bundle discounts — applied automatically at checkout
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New rule
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl border bg-muted animate-pulse" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No bulk pricing rules yet.</p>
          <p className="text-sm mt-1 text-muted-foreground/70">Create a BXGF deal or bundle discount to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onDelete={() => deleteMutation.mutate(rule.id)}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create pricing rule</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="bxgf">
            <TabsList className="w-full">
              <TabsTrigger value="bxgf" className="flex-1">Buy X Get Y Free</TabsTrigger>
              <TabsTrigger value="bundle" className="flex-1">Bundle discount</TabsTrigger>
            </TabsList>
            <TabsContent value="bxgf" className="pt-4">
              <BXGFForm
                inventory={inventory}
                onSuccess={() => {
                  setDialogOpen(false);
                  qc.invalidateQueries({ queryKey: ["/bulk-rules"] });
                }}
              />
            </TabsContent>
            <TabsContent value="bundle" className="pt-4">
              <BundleForm
                inventory={inventory}
                onSuccess={() => {
                  setDialogOpen(false);
                  qc.invalidateQueries({ queryKey: ["/bulk-rules"] });
                }}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
