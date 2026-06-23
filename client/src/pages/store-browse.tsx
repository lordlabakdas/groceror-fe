import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, ShoppingCart, ChevronLeft, MapPin, Globe, Minus, Plus } from "lucide-react";
import { useAddToCart, useCart } from "@/lib/cart";
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
      <div className="rounded-2xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4 border-l-4 border-l-emerald-500/60">
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xl"
          style={{ background: "linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)" }}
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
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm text-muted-foreground">
            {products.length} item{products.length !== 1 ? "s" : ""}
          </span>
          {store && (
            <Badge
              className={cn(
                "text-xs",
                store.is_active
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-muted text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {store.is_active ? "Open" : "Closed"}
            </Badge>
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
        <Badge className="absolute top-2 left-2 text-xs font-medium backdrop-blur-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
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
          <p className="text-base font-bold text-primary mt-0.5">${product.price}</p>
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
          <Badge className="absolute top-3 left-3 text-xs font-medium backdrop-blur-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {product.category}
          </Badge>
        </div>
        <div className="p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl">{product.name}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary">${product.price}</span>
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
