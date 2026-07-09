import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Categories } from "@/components/categories";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

import { CATEGORY_ENUM, getProductImage } from "@/lib/catalog";
import type { GetProductsResponse } from "@/types/models";

// Reverse of CATEGORY_ENUM: "PRODUCE" -> "Produce".
const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_ENUM).map(([label, enumValue]) => [enumValue, label]),
);

// UI-facing catalog item, mapped from the raw GrocerorProduct API shape.
export interface CatalogItem {
  id: string;
  name: string;
  category: string; // display label, e.g. "Produce"
  imageUrl: string;
  defaultPrice: number;
}

// ---------------------------------------------------------------------------
// Add-to-inventory dialog
// ---------------------------------------------------------------------------

interface AddDialogProps {
  item: CatalogItem | null;
  onClose: () => void;
  onSuccess: (name: string) => void;
}

function AddInventoryDialog({ item, onClose, onSuccess }: AddDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(10);
  const [price, setPrice] = useState(item?.defaultPrice ?? 0);
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/inventory/add-inventory", {
        name: item!.name,
        quantity,
        category: CATEGORY_ENUM[item!.category] ?? "OTHER",
        price,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/inventory/get-store-inventory"] });
      toast({ title: "Added to Myventory", description: `${item!.name} added.` });
      onSuccess(item!.name);
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: "Failed to add inventory",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (!item) return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Myventory</DialogTitle>
        </DialogHeader>
        <div className="flex gap-4 mb-4">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
          />
          <div>
            <p className="font-semibold text-lg">{item.name}</p>
            <Badge variant="secondary" className="mt-1">{item.category}</Badge>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="qty">Quantity</Label>
            <Input
              id="qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="price">Price ($)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step={0.01}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g. organic, gluten-free…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Adding…" : "Add to Myventory"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Postcard-style catalog card
// ---------------------------------------------------------------------------

interface CatalogCardProps {
  item: CatalogItem;
  added: boolean;
  onAdd: () => void;
}

function CatalogCard({ item, added, onAdd }: CatalogCardProps) {
  return (
    <div className="rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      <div className="relative h-48 overflow-hidden">
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <Badge
          variant="secondary"
          className="absolute top-2 left-2 text-xs font-medium backdrop-blur-sm bg-card/80"
        >
          {item.category}
        </Badge>
      </div>
      <div className="p-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm leading-tight">{item.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            ${item.defaultPrice.toFixed(2)}
          </p>
        </div>
        <Button
          size="sm"
          variant={added ? "secondary" : "default"}
          className="ml-2 flex-shrink-0"
          onClick={onAdd}
          disabled={added}
        >
          {added ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Added
            </>
          ) : (
            "Add"
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Products() {
  const { openProfile } = useAuth();
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [dialogItem, setDialogItem] = useState<CatalogItem | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());

  const { data: profile } = useQuery<{ name: string | null; location: string | null }>({
    queryKey: ["/user/me"],
  });
  const profileIncomplete = profile && (!profile.name || !profile.location);

  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useQuery<GetProductsResponse>({
    queryKey: ["/products"],
  });

  const catalog: CatalogItem[] = (productsData?.products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    category: CATEGORY_LABEL[p.category] ?? p.category,
    imageUrl: p.image_url || getProductImage(p.name, p.category),
    defaultPrice: p.default_price,
  }));

  const filtered = catalog.filter((item) => {
    const matchesCategory = category === "All" || item.category === category;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  function handleSuccess(name: string) {
    setRecentlyAdded((prev) => {
      const next = new Set(prev);
      next.add(name);
      return next;
    });
    setTimeout(() => {
      setRecentlyAdded((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }, 3000);
  }

  return (
    <div className="space-y-6">
      {profileIncomplete && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-700/40 bg-amber-900/20 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-amber-800 dark:text-amber-300">
            {!profile.name && !profile.location
              ? "Your store profile is incomplete — add a name and location so shoppers can find you."
              : !profile.name
              ? "Your store has no name — shoppers won't know who you are."
              : "Your store has no location — it won't appear on the map."}
          </div>
          <button
            className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex-shrink-0"
            onClick={openProfile}
          >
            Complete profile
          </button>
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <Categories selected={category} onSelect={setCategory} />
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {productsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border overflow-hidden shadow-sm">
              <Skeleton className="h-48 w-full rounded-none" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : productsError ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-muted-foreground">Failed to load products.</p>
          <Button variant="outline" size="sm" onClick={() => refetchProducts()}>
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No products found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((item) => (
            <CatalogCard
              key={item.id}
              item={item}
              added={recentlyAdded.has(item.name)}
              onAdd={() => setDialogItem(item)}
            />
          ))}
        </div>
      )}

      <AddInventoryDialog
        item={dialogItem}
        onClose={() => setDialogItem(null)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
