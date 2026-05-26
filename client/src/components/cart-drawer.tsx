import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { X, ArrowLeft, Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/lib/cart";
import { getProductImage } from "@/lib/catalog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const items = state.items;

  useEffect(() => {
    if (!open || items.length === 0) return;
    const storeId = items[0].storeId;
    apiRequest("GET", `/inventory/browse/${storeId}`)
      .then((res) => res.json())
      .then((data: { inventory: { id: string; price: number }[] }) => {
        const priceMap: Record<string, number> = {};
        for (const inv of data.inventory) {
          priceMap[inv.id] = inv.price;
        }
        const changed = items.filter(
          (i) => priceMap[i.id] !== undefined && priceMap[i.id] !== i.price
        );
        if (changed.length > 0) {
          dispatch({
            type: "UPDATE_PRICES",
            payload: changed.map((i) => ({ id: i.id, price: priceMap[i.id] })),
          });
          toast({
            title: "Prices updated",
            description: "Some item prices have changed since you last shopped.",
          });
        }
      })
      .catch(() => {
        // Non-critical — silently keep cached prices on network failure.
      });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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
            onSuccess={() => {
              dispatch({ type: "CLEAR_CART" });
              setDrawerState("confirmation");
            }}
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
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
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
// PaymentView — card form helpers
// ---------------------------------------------------------------------------

interface CardForm {
  cardNumber: string;
  expiry: string;
  cvv: string;
  nameOnCard: string;
}

interface CardErrors {
  cardNumber?: string;
  expiry?: string;
  cvv?: string;
  nameOnCard?: string;
}

function validateCard(form: CardForm): CardErrors {
  const errors: CardErrors = {};
  const digits = form.cardNumber.replace(/\s/g, "");
  if (!digits || !/^\d{13,19}$/.test(digits)) {
    errors.cardNumber = "Enter a valid card number (13–19 digits)";
  }
  if (!form.expiry) {
    errors.expiry = "Required";
  } else {
    const match = form.expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!match) {
      errors.expiry = "Use MM/YY format";
    } else {
      const [, mm, yy] = match;
      const month = parseInt(mm, 10);
      const year = 2000 + parseInt(yy, 10);
      const now = new Date();
      const expDate = new Date(year, month - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      if (month < 1 || month > 12) errors.expiry = "Invalid month";
      else if (expDate < thisMonth) errors.expiry = "Card has expired";
    }
  }
  if (!form.cvv || !/^\d{3,4}$/.test(form.cvv)) {
    errors.cvv = "3 or 4 digits";
  }
  if (!form.nameOnCard.trim()) {
    errors.nameOnCard = "Required";
  }
  return errors;
}

function cardBrandIcon(cardNumber: string): string {
  const first = cardNumber.replace(/\s/g, "")[0];
  if (first === "4") return "💳 Visa";
  if (first === "5") return "💳 MC";
  if (first === "3") return "💳 Amex";
  return "💳";
}

// ---------------------------------------------------------------------------
// PaymentView
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

function PaymentView({ items, total, itemCount, storeName, onClose, onBack, onSuccess }: PaymentViewProps) {
  const [form, setForm] = useState<CardForm>({ cardNumber: "", expiry: "", cvv: "", nameOnCard: "" });
  const [touched, setTouched] = useState<Partial<Record<keyof CardForm, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const errors = validateCard(form);
  const hasErrors = Object.keys(errors).length > 0;

  function set(field: keyof CardForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function touch(field: keyof CardForm) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  const inputCls = (field: keyof CardForm) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
      touched[field] && errors[field] ? "border-destructive" : "border-input"
    }`;

  async function handlePlaceOrder() {
    setTouched({ cardNumber: true, expiry: true, cvv: true, nameOnCard: true });
    if (hasErrors) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const { apiRequest } = await import("@/lib/queryClient");
      const orderItems = items.flatMap(({ id, quantity }) =>
        Array<string>(quantity).fill(id)
      );
      await apiRequest("POST", "/order/create-order", {
        items: orderItems,
        total_price: total,
        status: "pending",
      });
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Order failed. Please try again.";
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  }

  // Build collapsed cart summary
  const summaryItems = items.slice(0, 2).map((i) => `${i.name} ×${i.quantity}`).join(", ");
  const summaryMore = items.length > 2 ? "…" : "";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0a2614] to-emerald-700 px-4 py-4 flex items-start justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-white text-lg font-semibold leading-tight">Checkout</h2>
            {storeName && (
              <p className="text-emerald-200 text-sm mt-0.5">{storeName} · Pickup</p>
            )}
          </div>
        </div>
        <button
          className="h-8 w-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Collapsed cart summary strip */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-emerald-700 font-semibold text-sm">
              {itemCount} {itemCount === 1 ? "item" : "items"} · ${total.toFixed(2)}
            </p>
            <p className="text-emerald-600 text-xs mt-0.5">
              {summaryItems}{summaryMore}
            </p>
          </div>
          <button
            className="text-xs text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-full px-3 py-1 transition-colors"
            onClick={onBack}
          >
            ← Edit
          </button>
        </div>

        {/* Express payment buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled
            title="Coming soon"
            className="flex items-center justify-center gap-1.5 bg-black text-white text-sm font-medium rounded-lg py-2.5 cursor-not-allowed opacity-60"
          >
            <span>⬛</span> Apple Pay
          </button>
          <button
            disabled
            title="Coming soon"
            className="flex items-center justify-center gap-1.5 bg-white text-blue-600 text-sm font-medium rounded-lg py-2.5 border border-gray-300 cursor-not-allowed opacity-60"
          >
            G Pay
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or pay by card</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Card form */}
        <div className="space-y-3">
          {/* Card number */}
          <div>
            <div className="relative">
              <input
                className={inputCls("cardNumber")}
                placeholder="Card number"
                value={form.cardNumber}
                maxLength={23}
                onChange={(e) => set("cardNumber", e.target.value)}
                onBlur={() => touch("cardNumber")}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
                {cardBrandIcon(form.cardNumber)}
              </span>
            </div>
            {touched.cardNumber && errors.cardNumber && (
              <p className="text-destructive text-xs mt-1">{errors.cardNumber}</p>
            )}
          </div>

          {/* Expiry + CVV */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                className={inputCls("expiry")}
                placeholder="MM/YY"
                value={form.expiry}
                maxLength={5}
                onChange={(e) => {
                  let v = e.target.value.replace(/[^0-9]/g, "");
                  if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2, 4);
                  set("expiry", v);
                }}
                onBlur={() => touch("expiry")}
              />
              {touched.expiry && errors.expiry && (
                <p className="text-destructive text-xs mt-1">{errors.expiry}</p>
              )}
            </div>
            <div>
              <input
                className={inputCls("cvv")}
                placeholder="CVV"
                value={form.cvv}
                maxLength={4}
                onChange={(e) => set("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))}
                onBlur={() => touch("cvv")}
              />
              {touched.cvv && errors.cvv && (
                <p className="text-destructive text-xs mt-1">{errors.cvv}</p>
              )}
            </div>
          </div>

          {/* Name on card */}
          <div>
            <input
              className={inputCls("nameOnCard")}
              placeholder="Name on card"
              value={form.nameOnCard}
              onChange={(e) => set("nameOnCard", e.target.value)}
              onBlur={() => touch("nameOnCard")}
            />
            {touched.nameOnCard && errors.nameOnCard && (
              <p className="text-destructive text-xs mt-1">{errors.nameOnCard}</p>
            )}
          </div>
        </div>

        {/* API error */}
        {apiError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2.5">
            {apiError}
          </p>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="border-t px-4 py-4 flex-shrink-0">
        <Button
          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
          disabled={submitting}
          onClick={handlePlaceOrder}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Placing order…
            </span>
          ) : (
            `Place Order — $${total.toFixed(2)}`
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConfirmationView placeholder
// ---------------------------------------------------------------------------

interface ConfirmationViewProps {
  storeName: string;
  onClose: () => void;
}

function ConfirmationView({ storeName, onClose }: ConfirmationViewProps) {
  const [, setLocation] = useLocation();

  return (
    <>
      {/* Header — centred, no close button */}
      <div className="bg-gradient-to-br from-[#0a2614] to-emerald-700 text-white px-4 py-4 text-center flex-shrink-0">
        <h2 className="font-bold text-base">Order Confirmed</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center text-center gap-4">
        {/* Animated checkmark */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-300 flex items-center justify-center shadow-lg animate-bounce">
          <span className="text-3xl text-emerald-700">✓</span>
        </div>

        <div>
          <h3 className="font-bold text-xl">You're all set!</h3>
          {storeName && (
            <p className="text-sm text-muted-foreground mt-1">{storeName}</p>
          )}
        </div>

        <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left">
          <p className="text-xs font-bold text-emerald-800 mb-1.5">What happens next</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {storeName || "The store"} will confirm your order. Head to{" "}
            <span className="text-emerald-700 font-semibold">Orders</span> to track its status.
          </p>
        </div>

        <div className="w-full space-y-3 mt-2">
          <Button
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
            onClick={() => {
              setLocation("/orders");
              onClose();
            }}
          >
            View my orders
          </Button>
          <button
            className="text-sm text-emerald-700 font-semibold hover:underline"
            onClick={onClose}
          >
            Continue shopping
          </button>
        </div>
      </div>
    </>
  );
}
