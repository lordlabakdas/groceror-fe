import { useState } from "react";
import { Link } from "wouter";
import { X, ArrowLeft, Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/lib/cart";
import { getProductImage } from "@/lib/catalog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DrawerState = "cart" | "payment" | "confirmation";

// ---------------------------------------------------------------------------
// CartDrawer — top-level shell
// ---------------------------------------------------------------------------

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const [drawerState, setDrawerState] = useState<DrawerState>("cart");
  const { state, dispatch } = useCart();

  const items = state.items;
  const storeName = items[0]?.storeName ?? "";
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const total = items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  function handleClose() {
    setDrawerState("cart");
    onClose();
  }

  function onUpdateQuantity(id: string, storeId: string, delta: number, current: number) {
    const next = current + delta;
    dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity: next } });
    import("@/lib/queryClient").then(({ apiRequest }) =>
      apiRequest("PUT", `/cart/${storeId}/items/${id}`, { quantity: next }).catch(() => {})
    );
  }

  function onRemoveItem(id: string, storeId: string) {
    dispatch({ type: "REMOVE_ITEM", payload: id });
    import("@/lib/queryClient").then(({ apiRequest }) =>
      apiRequest("DELETE", `/cart/${storeId}/items/${id}`).catch(() => {})
    );
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <SheetContent side="right" className="w-full sm:w-96 p-0 flex flex-col [&>button]:hidden">
        {drawerState === "cart" && (
          <CartView
            items={items}
            storeName={storeName}
            itemCount={itemCount}
            total={total}
            onClose={handleClose}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveItem={onRemoveItem}
            onCheckout={() => setDrawerState("payment")}
            onClearCart={() => dispatch({ type: "CLEAR_CART" })}
          />
        )}
        {drawerState === "payment" && (
          <PaymentView
            items={items}
            total={total}
            itemCount={itemCount}
            storeName={storeName}
            onClose={handleClose}
            onBack={() => setDrawerState("cart")}
            onSuccess={() => setDrawerState("confirmation")}
          />
        )}
        {drawerState === "confirmation" && (
          <ConfirmationView storeName={storeName} onClose={handleClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// CartView
// ---------------------------------------------------------------------------

interface CartViewProps {
  items: CartItem[];
  storeName: string;
  itemCount: number;
  total: number;
  onClose: () => void;
  onUpdateQuantity: (id: string, storeId: string, delta: number, current: number) => void;
  onRemoveItem: (id: string, storeId: string) => void;
  onCheckout: () => void;
  onClearCart: () => void;
}

function CartView({
  items,
  storeName,
  itemCount,
  total,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onClearCart,
}: CartViewProps) {
  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-900 to-emerald-700 px-4 py-4 flex items-start justify-between shrink-0">
        <div>
          <h2 className="text-white text-lg font-semibold leading-tight">Your Cart</h2>
          {storeName && (
            <p className="text-emerald-200 text-sm mt-0.5">{storeName}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-200 hover:text-white hover:bg-emerald-800/60 h-8 px-2 text-xs"
              onClick={onClearCart}
            >
              Clear all
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-emerald-200 hover:text-white hover:bg-emerald-800/60 h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Items area */}
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground font-medium">Your cart is empty</p>
          <Link href="/stores">
            <Button variant="outline" size="sm" onClick={onClose}>
              Browse stores
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              onUpdateQuantity={onUpdateQuantity}
              onRemoveItem={onRemoveItem}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {items.length > 0 && (
        <div className="shrink-0 border-t px-4 py-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
            <span className="font-semibold text-emerald-600 text-base">
              ${total.toFixed(2)}
            </span>
          </div>
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={onCheckout}
          >
            Checkout →
          </Button>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// CartItemRow
// ---------------------------------------------------------------------------

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (id: string, storeId: string, delta: number, current: number) => void;
  onRemoveItem: (id: string, storeId: string) => void;
}

function CartItemRow({ item, onUpdateQuantity, onRemoveItem }: CartItemRowProps) {
  const imageUrl = item.imageUrl || getProductImage(item.name, "OTHER");
  const subtotal = (item.price * item.quantity).toFixed(2);

  return (
    <div className="flex gap-3 items-start">
      {/* Thumbnail */}
      <img
        src={imageUrl}
        alt={item.name}
        className="w-12 h-12 rounded-md object-cover shrink-0 border"
      />

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">${item.price.toFixed(2)} each</p>

        <div className="flex items-center justify-between mt-2">
          {/* Quantity stepper */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              disabled={item.quantity <= 1}
              onClick={() => onUpdateQuantity(item.id, item.storeId, -1, item.quantity)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              disabled={item.quantity >= item.stock}
              onClick={() => onUpdateQuantity(item.id, item.storeId, 1, item.quantity)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {/* Subtotal + remove */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-emerald-600">${subtotal}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => onRemoveItem(item.id, item.storeId)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PaymentView placeholder
// ---------------------------------------------------------------------------

interface PaymentViewProps {
  items: CartItem[];
  total: number;
  itemCount: number;
  storeName: string;
  onClose: () => void;
  onBack: () => void;
  onSuccess: () => void;
}

function PaymentView({ onClose, onBack }: PaymentViewProps) {
  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-900 to-emerald-700 px-4 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-emerald-200 hover:text-white hover:bg-emerald-800/60 h-8 w-8"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-white text-lg font-semibold">Checkout</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-emerald-200 hover:text-white hover:bg-emerald-800/60 h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Placeholder body */}
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Payment form — Task 4
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// ConfirmationView placeholder
// ---------------------------------------------------------------------------

interface ConfirmationViewProps {
  storeName: string;
  onClose: () => void;
}

function ConfirmationView({ onClose }: ConfirmationViewProps) {
  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-900 to-emerald-700 px-4 py-4 flex items-center justify-between shrink-0">
        <h2 className="text-white text-lg font-semibold">Order Confirmed</h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-emerald-200 hover:text-white hover:bg-emerald-800/60 h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Placeholder body */}
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Confirmation — Task 5
      </div>
    </>
  );
}
