import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type GetStoreInventoryResponse } from "@/types/models";
import { getProductImage } from "@/lib/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { InventoryCsvControls } from "@/components/inventory-csv";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Package,
  DollarSign,
  BarChart3,
  Trash2,
  Pencil,
  Search,
  RefreshCw,
  ShoppingBag,
  Calendar,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABEL: Record<string, string> = {
  GROCERY: "Grocery",
  PRODUCE: "Produce",
  MEAT: "Meat",
  DAIRY: "Dairy",
  BAKERY: "Bakery",
  OTHER: "Other",
};

const CATEGORY_COLOR: Record<string, string> = {
  GROCERY: "bg-amber-900/40 text-amber-300",
  PRODUCE: "bg-primary/15 text-primary",
  MEAT: "bg-red-900/40 text-red-300",
  DAIRY: "bg-sky-900/40 text-sky-300",
  BAKERY: "bg-orange-900/40 text-orange-300",
  OTHER: "bg-purple-900/40 text-purple-300",
};

function stockStatus(qty: number): { label: string; color: string } {
  if (qty === 0) return { label: "Out of Stock", color: "bg-red-900/30 text-red-400" };
  if (qty < 5) return { label: "Critical", color: "bg-red-900/30 text-red-400" };
  if (qty < 20) return { label: "Low Stock", color: "bg-amber-900/30 text-amber-400" };
  return { label: "In Stock", color: "bg-primary/15 text-primary" };
}

function expiryStatus(expiryDate?: string | null): { label: string; color: string } | null {
  if (!expiryDate) return null;
  const [y, m, d] = expiryDate.split("-").map(Number);
  const expiry = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return { label: "Expires today", color: "bg-red-900/30 text-red-400" };
  if (days <= 7) return { label: `Expires in ${days}d`, color: "bg-amber-900/30 text-amber-400" };
  return {
    label: `Expires ${expiry.toLocaleDateString([], { month: "short", day: "numeric" })}`,
    color: "bg-muted text-muted-foreground",
  };
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  gradient: string;
}

function StatCard({ icon, label, value, sub, gradient }: StatCardProps) {
  return (
    <div className={`rounded-2xl p-5 text-white ${gradient} shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/80 text-sm font-medium">{label}</span>
        <div className="bg-secondary rounded-lg p-1.5">{icon}</div>
      </div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-white/70 text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit dialog
// ---------------------------------------------------------------------------

type InventoryItem = GetStoreInventoryResponse["inventory"][number];

interface EditDialogProps {
  item: InventoryItem | null;
  onClose: () => void;
}

function EditQuantityDialog({ item, onClose }: EditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(item?.quantity ?? 0);
  const [threshold, setThreshold] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/inventory/${item!.id}`, { quantity });
      if (threshold !== "" && Number(threshold) >= 0) {
        await apiRequest("PUT", `/inventory/${item!.id}/threshold`, {
          threshold: Number(threshold),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/inventory/get-store-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/dashboard/"] });
      toast({ title: "Updated", description: `${item!.name} updated.` });
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: "Update failed",
        description: err.message ?? "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  if (!item) return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit quantity — {item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1">
            <Label htmlFor="edit-qty">Quantity</Label>
            <Input
              id="edit-qty"
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-threshold">Low stock alert below (optional)</Label>
            <Input
              id="edit-threshold"
              type="number"
              min={0}
              placeholder="e.g. 5"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditPriceDialog({ item, onClose }: EditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [price, setPrice] = useState(item?.price ?? 0);

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("PUT", `/inventory/${item!.id}`, { price }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/inventory/get-store-inventory"] });
      toast({ title: "Price updated", description: `${item!.name} is now $${price.toFixed(2)}.` });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message ?? "An unexpected error occurred.", variant: "destructive" });
    },
  });

  if (!item) return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Set price — {item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1">
            <Label htmlFor="edit-price">Price ($)</Label>
            <Input
              id="edit-price"
              type="number"
              min={0}
              step={0.01}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Update Price"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditExpiryDialog({ item, onClose }: EditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expiryDate, setExpiryDate] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("PUT", `/inventory/${item!.id}/expiry`, { expiry_date: expiryDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/dashboard/"] });
      toast({ title: "Expiry set", description: `${item!.name} expiry date saved.` });
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: "Update failed",
        description: err.message ?? "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  if (!item) return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Set expiry — {item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1">
            <Label htmlFor="edit-expiry">Expiry date</Label>
            <Input
              id="edit-expiry"
              type="date"
              min={new Date().toISOString().split("T")[0]}
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || expiryDate === ""}
            >
              {mutation.isPending ? "Saving…" : "Set Expiry"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Inventory card
// ---------------------------------------------------------------------------

interface InventoryCardProps {
  item: InventoryItem;
  onDelete: () => void;
  onEdit: () => void;
  onSetPrice: () => void;
  onSetExpiry: () => void;
}

function InventoryCard({ item, onDelete, onEdit, onSetPrice, onSetExpiry }: InventoryCardProps) {
  const imgUrl = getProductImage(item.name, item.category);
  const { label: stockLabel, color: stockColor } = stockStatus(item.quantity);
  const expiry = expiryStatus(item.expiry_date);
  const categoryLabel = CATEGORY_LABEL[item.category] ?? item.category;
  const categoryColor = CATEGORY_COLOR[item.category] ?? "bg-secondary text-muted-foreground";

  return (
    <div className="group relative rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
      {/* image */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={imgUrl}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* category pill */}
        <span
          className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColor} backdrop-blur-sm`}
        >
          {categoryLabel}
        </span>
        {/* action buttons — appear on hover */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="bg-card/90 hover:bg-blue-900/30 text-muted-foreground hover:text-blue-400 rounded-full p-1.5 shadow-sm"
            aria-label="Edit quantity"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSetPrice(); }}
            className="bg-card/90 hover:bg-primary/30 text-muted-foreground hover:text-primary rounded-full p-1.5 shadow-sm"
            aria-label="Set price"
          >
            <DollarSign className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSetExpiry(); }}
            className="bg-card/90 hover:bg-amber-900/30 text-muted-foreground hover:text-amber-400 rounded-full p-1.5 shadow-sm"
            aria-label="Set expiry date"
          >
            <Calendar className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="bg-card/90 hover:bg-red-900/30 text-muted-foreground hover:text-red-400 rounded-full p-1.5 shadow-sm"
            aria-label="Delete item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* body */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-base leading-tight">{item.name}</h3>
          {item.notes && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.notes}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">
            ${item.price.toFixed(2)}
          </span>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stockColor}`}>
              {stockLabel}
            </span>
            {expiry && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${expiry.color}`}>
                {expiry.label}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Qty</span>
          <span className="font-semibold tabular-nums">{item.quantity.toLocaleString()} units</span>
        </div>

        {/* quantity bar */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              item.quantity === 0
                ? "bg-red-500"
                : item.quantity < 5
                ? "bg-red-500"
                : item.quantity < 20
                ? "bg-amber-500"
                : "bg-primary"
            }`}
            style={{ width: `${Math.min(100, (item.quantity / 100) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Inventory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [priceEditTarget, setPriceEditTarget] = useState<InventoryItem | null>(null);
  const [expiryEditTarget, setExpiryEditTarget] = useState<InventoryItem | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery<GetStoreInventoryResponse>({
    queryKey: ["/inventory/get-store-inventory"],
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest("DELETE", `/inventory/delete-inventory?items=${encodeURIComponent(name)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/inventory/get-store-inventory"] });
      toast({ title: "Removed", description: `${deleteTarget} removed from Myventory.` });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const items = data?.inventory ?? [];

  // stats
  const totalValue = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);
  // Matches the "Low Stock" badge tier in stockStatus and the dashboard's
  // default threshold.
  const lowStockCount = items.filter((i) => i.quantity < 20).length;

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  // ---- loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // ---- auth / error
  if (error) {
    const msg = (error as Error).message ?? "";
    const isUnauth = msg.startsWith("401") || msg.startsWith("403");
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-3 text-center">
        <ShoppingBag className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-lg font-medium">
          {isUnauth ? "Please log in as a Grocer to view inventory" : "Could not load inventory"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Myventory</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {items.length} {items.length === 1 ? "item" : "items"} in your store
          </p>
        </div>
        <div className="flex items-center gap-2">
          <InventoryCsvControls items={items} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          icon={<Package className="h-4 w-4 text-white" />}
          label="Total SKUs"
          value={items.length}
          sub={`${lowStockCount} low stock`}
        />
        <StatCard
          gradient="bg-gradient-to-br from-teal-500 to-cyan-600"
          icon={<BarChart3 className="h-4 w-4 text-white" />}
          label="Total Units"
          value={totalUnits.toLocaleString()}
          sub="across all items"
        />
        <StatCard
          gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          icon={<DollarSign className="h-4 w-4 text-white" />}
          label="Inventory Value"
          value={`$${totalValue.toFixed(2)}`}
          sub="at current prices"
        />
      </div>

      {/* search */}
      <div className="relative w-full md:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search inventory..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3 text-center">
          <ShoppingBag className="h-14 w-14 text-muted-foreground/30" />
          <p className="text-lg font-medium text-muted-foreground">
            {items.length === 0
              ? "No inventory yet"
              : "No items match your search"}
          </p>
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Head to{" "}
              <a href="/products" className="text-primary underline underline-offset-2">
                Products
              </a>{" "}
              to add items to your store.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              onDelete={() => setDeleteTarget(item.name)}
              onEdit={() => setEditTarget(item)}
              onSetPrice={() => setPriceEditTarget(item)}
              onSetExpiry={() => setExpiryEditTarget(item)}
            />
          ))}
        </div>
      )}

      {/* quantity edit dialog */}
      <EditQuantityDialog
        key={editTarget?.id}
        item={editTarget}
        onClose={() => setEditTarget(null)}
      />

      {/* price edit dialog */}
      <EditPriceDialog
        key={priceEditTarget?.id}
        item={priceEditTarget}
        onClose={() => setPriceEditTarget(null)}
      />

      {/* expiry edit dialog */}
      <EditExpiryDialog
        key={expiryEditTarget?.id}
        item={expiryEditTarget}
        onClose={() => setExpiryEditTarget(null)}
      />

      {/* delete confirm dialog */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from inventory?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget}</strong> from your store inventory. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
