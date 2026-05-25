import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Store, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAddToCart } from "@/lib/cart";
import { getProductImage } from "@/lib/catalog";

interface SearchResultItem {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  notes: string | null;
  store_id: string;
  store_name: string;
}

interface SearchResponse {
  query: string;
  results: SearchResultItem[];
}

export default function SearchPage() {
  const [input, setInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const addToCart = useAddToCart();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const searchUrl =
    debouncedQuery.length >= 2
      ? `/inventory/search?q=${encodeURIComponent(debouncedQuery)}`
      : null;

  const { data, isLoading, isFetching } = useQuery<SearchResponse>({
    queryKey: [searchUrl],
    enabled: searchUrl !== null,
  });

  const results = data?.results ?? [];
  const busy = isLoading || isFetching;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Search Products</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Find items across all stores</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          autoFocus
          placeholder="Search for apples, milk, bread…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="pl-9 h-11"
        />
      </div>

      {debouncedQuery.length >= 2 && busy && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl border bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {debouncedQuery.length >= 2 && !busy && results.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          No products found for &ldquo;{debouncedQuery}&rdquo;.
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{data?.query}&rdquo;
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {results.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border bg-card shadow-sm p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.name}</p>
                    <Link href={`/stores/${item.store_id}`}>
                      <a className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5 transition-colors">
                        <Store className="h-3 w-3" />
                        {item.store_name}
                      </a>
                    </Link>
                  </div>
                  <span className="font-bold text-sm flex-shrink-0">${item.price.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {item.category.toLowerCase()}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    disabled={item.quantity === 0}
                    onClick={() =>
                      addToCart(
                        {
                          id: item.id,
                          name: item.name,
                          price: item.price.toFixed(2),
                          category: item.category,
                          description: item.notes ?? "",
                          imageUrl: getProductImage(item.name, item.category),
                          stock: item.quantity,
                          storeId: item.store_id,
                          storeName: item.store_name,
                        },
                        1,
                      )
                    }
                  >
                    <ShoppingCart className="h-3 w-3" />
                    Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {input.length > 0 && input.length < 2 && (
        <p className="text-center text-sm text-muted-foreground">
          Type at least 2 characters to search.
        </p>
      )}

      {input.length === 0 && (
        <p className="text-center py-12 text-sm text-muted-foreground">
          Start typing to search for products across all stores.
        </p>
      )}
    </div>
  );
}
