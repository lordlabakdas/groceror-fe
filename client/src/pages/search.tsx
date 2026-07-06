import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Store, Minus, Plus, TrendingDown, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddToCart, useCart } from "@/lib/cart";
import { getProductImage } from "@/lib/catalog";

const CATEGORIES = ["Fruits & Vegetables", "Dairy & Eggs", "Meat & Seafood", "Bakery", "Beverages", "Snacks", "Frozen", "Pantry", "Personal Care", "Household"];

interface SearchResultItem {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  notes: string | null;
  store_id: string;
  store_name: string;
  sale_price?: number | null;
}

interface SearchResponse {
  query: string;
  results: SearchResultItem[];
}

// ---------------------------------------------------------------------------
// Comparison card — shown when the same item name is sold at ≥2 stores
// ---------------------------------------------------------------------------

function CompareCard({
  name,
  variants,
  cartItemMap,
  onAdd,
  onIncrement,
  onDecrement,
}: {
  name: string;
  variants: SearchResultItem[];
  cartItemMap: Map<string, number>;
  onAdd: (item: SearchResultItem) => void;
  onIncrement: (item: SearchResultItem) => void;
  onDecrement: (item: SearchResultItem) => void;
}) {
  const effectivePrice = (item: SearchResultItem) => item.sale_price ?? item.price;
  const sorted = [...variants].sort((a, b) => effectivePrice(a) - effectivePrice(b));
  const cheapestId = sorted[0].id;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden col-span-1 sm:col-span-2">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b bg-muted/30">
        <TrendingDown className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        <span className="font-semibold text-sm">{name}</span>
        <Badge variant="secondary" className="text-xs ml-auto">
          {variants.length} stores
        </Badge>
      </div>
      <div className="divide-y">
        {sorted.map((item) => {
          const cartQty = cartItemMap.get(item.id) ?? 0;
          const outOfStock = item.quantity === 0;
          const isCheapest = item.id === cheapestId;

          return (
            <div key={item.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <Link href={`/stores/${item.store_id}`}>
                  <a className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                    <Store className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{item.store_name}</span>
                  </a>
                </Link>
                {outOfStock && (
                  <span className="text-xs text-muted-foreground">Out of stock</span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  {item.sale_price != null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-sm text-rose-400">${item.sale_price.toFixed(2)}</span>
                      <span className="text-xs line-through text-muted-foreground">${item.price.toFixed(2)}</span>
                    </div>
                  ) : (
                    <span className="font-bold text-sm">${item.price.toFixed(2)}</span>
                  )}
                  {isCheapest && (
                    <Badge className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20">
                      Best
                    </Badge>
                  )}
                </div>
                {cartQty > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => onDecrement(item)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-4 text-center text-sm font-semibold">{cartQty}</span>
                    <Button
                      size="icon"
                      variant="default"
                      className="h-7 w-7"
                      onClick={() => onIncrement(item)}
                      disabled={outOfStock}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={outOfStock}
                    onClick={() => onAdd(item)}
                  >
                    Add
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single-store result card
// ---------------------------------------------------------------------------

function ResultCard({
  item,
  cartQty,
  onAdd,
  onIncrement,
  onDecrement,
}: {
  item: SearchResultItem;
  cartQty: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const outOfStock = item.quantity === 0;
  return (
    <div className="rounded-xl border bg-card shadow-sm p-4 flex flex-col gap-3">
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
        <div className="flex-shrink-0 text-right">
          {item.sale_price != null ? (
            <>
              <span className="font-bold text-sm text-rose-400">${item.sale_price.toFixed(2)}</span>
              <span className="text-xs line-through text-muted-foreground ml-1">${item.price.toFixed(2)}</span>
            </>
          ) : (
            <span className="font-bold text-sm">${item.price.toFixed(2)}</span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs capitalize">
          {item.category.toLowerCase()}
        </Badge>
        {cartQty > 0 ? (
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={onDecrement}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-4 text-center text-sm font-semibold">{cartQty}</span>
            <Button
              size="icon"
              variant="default"
              className="h-7 w-7"
              onClick={onIncrement}
              disabled={outOfStock}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={outOfStock}
            onClick={onAdd}
          >
            Add
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SearchPage() {
  const [input, setInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(true);
  const addToCart = useAddToCart();
  const { state, dispatch } = useCart();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const searchUrl = useMemo(() => {
    if (debouncedQuery.length < 2) return null;
    const params = new URLSearchParams({ q: debouncedQuery });
    if (category) params.set("category", category);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    if (!inStockOnly) params.set("in_stock", "false");
    return `/inventory/search?${params.toString()}`;
  }, [debouncedQuery, category, minPrice, maxPrice, inStockOnly]);

  const activeFilters = [category, minPrice, maxPrice, !inStockOnly].filter(Boolean).length;

  const { data, isLoading, isFetching } = useQuery<SearchResponse>({
    queryKey: [searchUrl],
    enabled: searchUrl !== null,
  });

  const results = data?.results ?? [];
  const busy = isLoading || isFetching;
  const cartItemMap = new Map(state.items.map((i) => [i.id, i.quantity]));

  // Group by normalised name; multi-store groups become comparison cards.
  const grouped = useMemo(() => {
    const map = new Map<string, SearchResultItem[]>();
    for (const item of results) {
      const key = item.name.toLowerCase().trim();
      const bucket = map.get(key);
      if (bucket) bucket.push(item);
      else map.set(key, [item]);
    }
    return map;
  }, [results]);

  function handleAdd(item: SearchResultItem) {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price.toFixed(2),
      category: item.category,
      description: item.notes ?? "",
      imageUrl: getProductImage(item.name, item.category),
      stock: item.quantity,
      storeId: item.store_id,
      storeName: item.store_name,
    });
  }

  function handleIncrement(item: SearchResultItem) {
    const current = cartItemMap.get(item.id) ?? 0;
    dispatch({ type: "UPDATE_QUANTITY", payload: { id: item.id, quantity: current + 1 } });
  }

  function handleDecrement(item: SearchResultItem) {
    const current = cartItemMap.get(item.id) ?? 0;
    if (current <= 1) dispatch({ type: "REMOVE_ITEM", payload: item.id });
    else dispatch({ type: "UPDATE_QUANTITY", payload: { id: item.id, quantity: current - 1 } });
  }

  const compareCount = Array.from(grouped.values()).filter((v) => v.length >= 2).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Search Products</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Find items across all stores</p>
      </div>

      <div className="space-y-2">
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search for apples, milk, bread…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="pl-9 h-11"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="icon"
            className="h-11 w-11 flex-shrink-0 relative"
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                {activeFilters}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="p-3 rounded-xl border bg-card space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 text-xs col-span-2">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                className="h-8 text-xs"
                placeholder="Min price"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value.replace(/[^\d.]/g, ""))}
              />
              <Input
                className="h-8 text-xs"
                placeholder="Max price"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d.]/g, ""))}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded"
                />
                In stock only
              </label>
              {activeFilters > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setCategory(""); setMinPrice(""); setMaxPrice(""); setInStockOnly(true); }}>
                  <X className="h-3 w-3 mr-1" /> Clear filters
                </Button>
              )}
            </div>
          </div>
        )}
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
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{data?.query}&rdquo;
            </p>
            {compareCount > 0 && (
              <Badge variant="secondary" className="text-xs gap-1">
                <TrendingDown className="h-3 w-3" />
                {compareCount} price comparison{compareCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from(grouped.entries()).map(([key, variants]) =>
              variants.length >= 2 ? (
                <CompareCard
                  key={key}
                  name={variants[0].name}
                  variants={variants}
                  cartItemMap={cartItemMap}
                  onAdd={handleAdd}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                />
              ) : (
                <ResultCard
                  key={variants[0].id}
                  item={variants[0]}
                  cartQty={cartItemMap.get(variants[0].id) ?? 0}
                  onAdd={() => handleAdd(variants[0])}
                  onIncrement={() => handleIncrement(variants[0])}
                  onDecrement={() => handleDecrement(variants[0])}
                />
              ),
            )}
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
