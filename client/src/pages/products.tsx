import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { type Product } from "@/types/models";
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
import { Search, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ---------------------------------------------------------------------------
// Static product catalog
// ---------------------------------------------------------------------------

interface CatalogItem {
  name: string;
  category: string;
  imageUrl: string;
  defaultPrice: number;
}

const CATALOG: CatalogItem[] = [
  {
    name: "Bananas",
    category: "Produce",
    imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&fit=crop",
    defaultPrice: 1.29,
  },
  {
    name: "Carrots",
    category: "Produce",
    imageUrl: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&fit=crop",
    defaultPrice: 0.99,
  },
  {
    name: "Avocado",
    category: "Produce",
    imageUrl: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&fit=crop",
    defaultPrice: 1.49,
  },
  {
    name: "Tomatoes",
    category: "Produce",
    imageUrl: "https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=400&fit=crop",
    defaultPrice: 2.49,
  },
  {
    name: "Sourdough Bread",
    category: "Bakery",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&fit=crop",
    defaultPrice: 4.99,
  },
  {
    name: "Croissants",
    category: "Bakery",
    imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&fit=crop",
    defaultPrice: 3.49,
  },
  {
    name: "Whole Milk",
    category: "Dairy",
    imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&fit=crop",
    defaultPrice: 3.29,
  },
  {
    name: "Cheddar Cheese",
    category: "Dairy",
    imageUrl: "https://images.unsplash.com/photo-1618164435226-9e8e7ccfade7?w=400&fit=crop",
    defaultPrice: 5.49,
  },
  {
    name: "Greek Yogurt",
    category: "Dairy",
    imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&fit=crop",
    defaultPrice: 2.99,
  },
  {
    name: "Chicken Breast",
    category: "Meat",
    imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&fit=crop",
    defaultPrice: 7.99,
  },
  {
    name: "Salmon Fillet",
    category: "Meat",
    imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&fit=crop",
    defaultPrice: 12.99,
  },
  {
    name: "Penne Pasta",
    category: "Grocery",
    imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&fit=crop",
    defaultPrice: 1.79,
  },
  {
    name: "Jasmine Rice",
    category: "Grocery",
    imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&fit=crop",
    defaultPrice: 3.49,
  },
  {
    name: "Olive Oil",
    category: "Grocery",
    imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&fit=crop",
    defaultPrice: 8.99,
  },
  {
    name: "Orange Juice",
    category: "Grocery",
    imageUrl: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&fit=crop",
    defaultPrice: 4.29,
  },
  {
    name: "Honey",
    category: "Other",
    imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&fit=crop",
    defaultPrice: 6.99,
  },
  {
    name: "Dark Chocolate",
    category: "Other",
    imageUrl: "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=400&fit=crop",
    defaultPrice: 3.99,
  },
];

const CATEGORY_ENUM: Record<string, string> = {
  Grocery: "GROCERY",
  Produce: "PRODUCE",
  Meat: "MEAT",
  Dairy: "DAIRY",
  Bakery: "BAKERY",
  Other: "OTHER",
};

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
      toast({ title: "Added to inventory", description: `${item!.name} added.` });
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
          <DialogTitle>Add to Inventory</DialogTitle>
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
              {mutation.isPending ? "Adding…" : "Add to Inventory"}
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
          className="absolute top-2 left-2 text-xs font-medium backdrop-blur-sm bg-white/80"
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
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [dialogItem, setDialogItem] = useState<CatalogItem | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());

  const filtered = CATALOG.filter((item) => {
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

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No products found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((item) => (
            <CatalogCard
              key={item.name}
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
