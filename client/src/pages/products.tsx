import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Product, type GetStoreInventoryResponse } from "@/types/models";
import { ProductCard } from "@/components/product-card";
import { Categories } from "@/components/categories";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// ---------------------------------------------------------------------------
// Category mapping  (groceror enum → display label used by the filter)
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  GROCERY: "Grocery",
  PRODUCE: "Produce",
  MEAT: "Meat",
  DAIRY: "Dairy",
  BAKERY: "Bakery",
  OTHER: "Other",
};

const CATEGORY_IMAGES: Record<string, string> = {
  GROCERY:
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&fit=crop",
  PRODUCE:
    "https://images.unsplash.com/photo-1518843875459-f738682238a6?w=300&fit=crop",
  MEAT: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=300&fit=crop",
  DAIRY:
    "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&fit=crop",
  BAKERY:
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&fit=crop",
  OTHER:
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&fit=crop",
};

function toProduct(item: GetStoreInventoryResponse["inventory"][number]): Product {
  const label = CATEGORY_LABELS[item.category] ?? item.category;
  return {
    id: item.id,
    name: item.name,
    description: item.notes ?? "",
    price: item.price.toFixed(2),
    category: label,
    imageUrl: CATEGORY_IMAGES[item.category] ?? CATEGORY_IMAGES.OTHER,
    stock: item.quantity,
    storeId: item.store_id,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Products() {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  const {
    data,
    isLoading,
    error,
  } = useQuery<GetStoreInventoryResponse>({
    queryKey: ["/inventory/get-store-inventory"],
  });

  // ---- loading skeleton
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-muted aspect-square rounded-lg mb-4" />
            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  // ---- auth / error state
  if (error) {
    const msg = (error as Error).message ?? "";
    const isUnauth = msg.startsWith("401") || msg.startsWith("403");
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-2">
        <p className="text-lg font-medium">
          {isUnauth ? "Please log in to view products" : "Could not load products"}
        </p>
        {!isUnauth && (
          <p className="text-sm text-muted-foreground">
            Make sure you are logged in as a store owner.
          </p>
        )}
      </div>
    );
  }

  const products: Product[] = (data?.inventory ?? []).map(toProduct);

  const filtered = products.filter((p) => {
    const matchesCategory = category === "All" || p.category === category;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
