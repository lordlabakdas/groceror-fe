import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, ShoppingCart, ChevronLeft, MapPin, Globe, Minus, Plus, Star } from "lucide-react";
import { useAddToCart, useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type GetStoreInventoryResponse, type Product } from "@/types/models";
import { getProductImage } from "@/lib/catalog";
import { cn } from "@/lib/utils";

interface StoreDetail {
  id: string;
  name: string;
  email: string;
  location: string | null;
  website: string | null;
  is_active: boolean;
  avg_rating?: number | null;
  rating_count?: number;
}

interface RatingItem {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface RatingSummary {
  avg_rating: number | null;
  rating_count: number;
  ratings: RatingItem[];
}

// ── Star components ───────────────────────────────────────────────────────────

function StarDisplay({ rating, count }: { rating?: number | null; count?: number }) {
  if (!rating) return null;
  const full = Math.round(rating);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("h-3.5 w-3.5", i <= full ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
      ))}
      <span className="text-sm font-medium ml-0.5">{rating.toFixed(1)}</span>
      {count != null && count > 0 && (
        <span className="text-xs text-muted-foreground">({count} review{count !== 1 ? "s" : ""})</span>
      )}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
        >
          <Star
            className={cn(
              "h-6 w-6 transition-colors",
              i <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30 hover:text-amber-400/50"
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ── Ratings section ───────────────────────────────────────────────────────────

function RatingsSection({ storeId }: { storeId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data } = useQuery<RatingSummary>({
    queryKey: [`/stores/${storeId}/ratings`],
    enabled: !!storeId,
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/stores/${storeId}/ratings`, { rating: myRating, comment: myComment || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/stores/${storeId}/ratings`] });
      queryClient.invalidateQueries({ queryKey: [`/stores/${storeId}`] });
      toast({ title: "Rating submitted", description: "Thanks for your feedback!" });
      setShowForm(false);
      setMyRating(0);
      setMyComment("");
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message ?? "Could not submit rating.", variant: "destructive" });
    },
  });

  const ratings = data?.ratings ?? [];

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">Customer Reviews</h2>
          {data?.avg_rating ? (
            <StarDisplay rating={data.avg_rating} count={data.rating_count} />
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">No reviews yet</p>
          )}
        </div>
        {user?.entityType === "user" && !showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            Rate this store
          </Button>
        )}
      </div>

      {showForm && (
        <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your rating</p>
          <StarPicker value={myRating} onChange={setMyRating} />
          <Textarea
            placeholder="Leave a comment (optional)"
            value={myComment}
            onChange={(e) => setMyComment(e.target.value)}
            className="text-sm resize-none"
            rows={3}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setMyRating(0); setMyComment(""); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={myRating === 0 || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </div>
      )}

      {ratings.length > 0 && (
        <div className="space-y-3">
          {ratings.map((r) => (
            <div key={r.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className={cn("h-3 w-3", i <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StoreBrowse() {
  const [, params] = useRoute("/stores/:id");
  const storeId = params?.id ?? "";

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: store } = useQuery<StoreDetail>({
    queryKey: [`/stores/${storeId}`],
    enabled: !!storeId,
  });

  const { data: inventoryData, isLoading } = useQuery<GetStoreInventoryResponse>({
    queryKey: [`/inventory/browse/${storeId}`],
    enabled: !!storeId,
  });

  const { state: cartState, dispatch, openCart } = useCart();
  const addToCart = useAddToCart();

  const storeName = store?.name ?? "Store";

  const products: Product[] = (inventoryData?.inventory ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    description: item.notes ?? "",
    price: item.price.toFixed(2),
    category: item.category,
    imageUrl: getProductImage(item.name, item.category),
    stock: item.quantity,
    storeId: item.store_id,
    storeName: storeName,
    salePrice: item.sale_price ?? null,
  }));

  const categories = ["All", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const cartItemMap = new Map(cartState.items.map((i) => [i.id, i.quantity]));

  function handleIncrement(product: Product) {
    const current = cartItemMap.get(product.id) ?? 0;
    dispatch({ type: "UPDATE_QUANTITY", payload: { id: product.id, quantity: current + 1 } });
  }

  function handleDecrement(product: Product) {
    const current = cartItemMap.get(product.id) ?? 0;
    if (current <= 1) {
      dispatch({ type: "REMOVE_ITEM", payload: product.id });
    } else {
      dispatch({ type: "UPDATE_QUANTITY", payload: { id: product.id, quantity: current - 1 } });
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Back link ─────────────────────────────────────── */}
      <Link href="/stores">
        <a className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" />
          All Stores
        </a>
      </Link>

      {/* ── Store banner ──────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4 border-l-4 border-l-amber-500/60">
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xl"
          style={{ background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)" }}
        >
          {storeName.charAt(0).toUpperCase()}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{storeName}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            {store?.location && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {store.location}
              </span>
            )}
            {store?.website && (
              <a
                href={store.website.startsWith("http") ? store.website : `https://${store.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Globe className="h-3.5 w-3.5" />
                {store.website}
              </a>
            )}
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {products.length} item{products.length !== 1 ? "s" : ""}
            </span>
            {store && (
              <Badge
                className={cn(
                  "text-xs",
                  store.is_active
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
                    : "bg-muted text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {store.is_active ? "Open" : "Closed"}
              </Badge>
            )}
          </div>
          {store?.avg_rating && (
            <StarDisplay rating={store.avg_rating} count={store.rating_count} />
          )}
        </div>
      </div>

      {/* ── Search + cart ─────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-2 flex-shrink-0" onClick={openCart}>
          <ShoppingCart className="h-4 w-4" />
          Cart
          {cartState.items.length > 0 && (
            <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {cartState.items.reduce((s, i) => s + i.quantity, 0)}
            </Badge>
          )}
        </Button>
      </div>

      {/* ── Category pills ────────────────────────────────── */}
      {categories.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm transition-colors",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground font-medium"
                  : "border border-border text-muted-foreground hover:border-primary hover:text-primary"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Product grid ──────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-xl border bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {search || activeCategory !== "All"
            ? "No items match your search."
            : "This store has no items yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              cartQuantity={cartItemMap.get(product.id) ?? 0}
              onAdd={() => addToCart(product, 1)}
              onIncrement={() => handleIncrement(product)}
              onDecrement={() => handleDecrement(product)}
              onProductClick={() => setSelectedProduct(product)}
            />
          ))}
        </div>
      )}

      <ProductDetailModal
        product={selectedProduct}
        cartQuantity={selectedProduct ? (cartItemMap.get(selectedProduct.id) ?? 0) : 0}
        onClose={() => setSelectedProduct(null)}
        onAdd={() => selectedProduct && addToCart(selectedProduct, 1)}
        onIncrement={() => selectedProduct && handleIncrement(selectedProduct)}
        onDecrement={() => selectedProduct && handleDecrement(selectedProduct)}
      />

      {/* ── Ratings ───────────────────────────────────────── */}
      <RatingsSection storeId={storeId} />
    </div>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product;
  cartQuantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onProductClick: () => void;
}

function ProductCard({ product, cartQuantity, onAdd, onIncrement, onDecrement, onProductClick }: ProductCardProps) {
  const outOfStock = product.stock <= 0;

  return (
    <div className="rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      <div
        className="relative h-48 overflow-hidden bg-muted cursor-pointer"
        onClick={onProductClick}
      >
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <Badge className="absolute top-2 left-2 text-xs font-medium backdrop-blur-sm bg-amber-500/20 text-amber-400 border border-amber-500/30">
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
      <div className="p-4 flex items-center justify-between">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onProductClick}>
          <p className="font-semibold text-sm leading-tight">{product.name}</p>
          {product.salePrice != null ? (
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-bold text-rose-400">${product.salePrice.toFixed(2)}</span>
              <span className="text-xs line-through text-muted-foreground">${product.price}</span>
            </div>
          ) : (
            <p className="text-base font-bold text-primary mt-0.5">${product.price}</p>
          )}
        </div>
        {cartQuantity > 0 ? (
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={onDecrement}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-5 text-center text-sm font-semibold">{cartQuantity}</span>
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
          <Button size="sm" className="ml-2 flex-shrink-0" onClick={onAdd} disabled={outOfStock}>
            Add
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Product detail modal ──────────────────────────────────────────────────────

interface ProductDetailModalProps {
  product: Product | null;
  cartQuantity: number;
  onClose: () => void;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

function ProductDetailModal({ product, cartQuantity, onClose, onAdd, onIncrement, onDecrement }: ProductDetailModalProps) {
  if (!product) return null;

  const outOfStock = product.stock <= 0;

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="relative h-56 bg-muted">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <Badge className="absolute top-3 left-3 text-xs font-medium backdrop-blur-sm bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {product.category}
          </Badge>
        </div>
        <div className="p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl">{product.name}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between">
            <div>
              {product.salePrice != null ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-rose-400">${product.salePrice.toFixed(2)}</span>
                  <span className="text-base line-through text-muted-foreground">${product.price}</span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-primary">${product.price}</span>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {outOfStock ? "Out of stock" : `${product.stock} in stock`}
            </span>
          </div>

          {product.description && (
            <p className="text-sm text-muted-foreground">{product.description}</p>
          )}

          {product.storeName && (
            <p className="text-sm">
              <span className="text-muted-foreground">Sold by </span>
              <span className="font-medium">{product.storeName}</span>
            </p>
          )}

          <div className="pt-1">
            {cartQuantity > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">In your cart</span>
                <div className="flex items-center gap-3">
                  <Button size="icon" variant="outline" onClick={onDecrement}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center font-semibold">{cartQuantity}</span>
                  <Button size="icon" variant="default" onClick={onIncrement} disabled={outOfStock}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button className="w-full" onClick={onAdd} disabled={outOfStock}>
                {outOfStock ? "Out of stock" : "Add to cart"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
