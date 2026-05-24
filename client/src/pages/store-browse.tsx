import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, ChevronLeft, Check } from "lucide-react";
import { useAddToCart, useCart } from "@/lib/cart";
import { type GetStoreInventoryResponse, type Product } from "@/types/models";
import { getProductImage } from "@/lib/catalog";

export default function StoreBrowse() {
  const [, params] = useRoute("/stores/:id");
  const storeId = params?.id ?? "";

  const [search, setSearch] = useState("");
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<GetStoreInventoryResponse>({
    queryKey: [`/inventory/browse/${storeId}`],
    enabled: !!storeId,
  });

  const { state: cartState } = useCart();
  const addToCart = useAddToCart();

  const products: Product[] = (data?.inventory ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    description: item.notes ?? "",
    price: item.price.toFixed(2),
    category: item.category,
    imageUrl: getProductImage(item.name, item.category),
    stock: item.quantity,
    storeId: item.store_id,
  }));

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const cartItemIds = new Set(cartState.items.map((i) => i.id));

  function handleAddToCart(product: Product) {
    addToCart(product, 1);
    setRecentlyAdded((prev) => {
      const next = new Set(prev);
      next.add(product.id);
      return next;
    });
    setTimeout(() => {
      setRecentlyAdded((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/stores">
            <a className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" />
              Stores
            </a>
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-xl font-bold">Shop</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Link href="/cart">
            <a>
              <Button variant="outline" size="sm" className="gap-2 flex-shrink-0">
                <ShoppingCart className="h-4 w-4" />
                Cart
                {cartState.items.length > 0 && (
                  <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {cartState.items.reduce((s, i) => s + i.quantity, 0)}
                  </Badge>
                )}
              </Button>
            </a>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-64 rounded-xl border bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {search ? "No items match your search." : "This store has no items yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              inCart={cartItemIds.has(product.id)}
              justAdded={recentlyAdded.has(product.id)}
              onAdd={() => handleAddToCart(product)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  inCart: boolean;
  justAdded: boolean;
  onAdd: () => void;
}

function ProductCard({ product, inCart, justAdded, onAdd }: ProductCardProps) {
  const outOfStock = product.stock <= 0;

  return (
    <div className="rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      <div className="relative h-48 overflow-hidden bg-muted">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <Badge
          variant="secondary"
          className="absolute top-2 left-2 text-xs font-medium backdrop-blur-sm bg-white/80"
        >
          {product.category}
        </Badge>
        {outOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-sm font-semibold bg-black/60 px-3 py-1 rounded-full">
              Out of stock
            </span>
          </div>
        )}
      </div>
      <div className="p-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm leading-tight">{product.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">${product.price}</p>
        </div>
        <Button
          size="sm"
          variant={justAdded ? "secondary" : "default"}
          className="ml-2 flex-shrink-0"
          onClick={onAdd}
          disabled={outOfStock || justAdded}
        >
          {justAdded ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Added
            </>
          ) : inCart ? (
            <>
              <ShoppingCart className="h-3 w-3 mr-1" />
              Add more
            </>
          ) : (
            "Add"
          )}
        </Button>
      </div>
    </div>
  );
}
