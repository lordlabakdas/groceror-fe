import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { X, ArrowLeft, Minus, Plus, Trash2, ShoppingCart, Tag, Star, Package, ChevronDown, Truck, MapPin } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart, type CartItem } from "@/lib/cart";
import { getProductImage } from "@/lib/catalog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/currency";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DrawerState = "cart" | "payment" | "confirmation";

interface AvailableCoupon {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_amount: number | null;
  valid_until: string | null;
}

interface CouponResult {
  valid: boolean;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  message: string;
}

interface LoyaltyBalance {
  points_balance: number;
  dollar_value: number;
}

interface BulkRuleAPI {
  id: string;
  name: string;
  rule_type: string;
  bxgf_inventory_id: string | null;
  buy_quantity: number | null;
  free_quantity: number | null;
  discount_type: string | null;
  discount_value: number | null;
  bundle_items: { inventory_id: string; name: string }[];
}

function computeBulkDiscount(items: CartItem[], rules: BulkRuleAPI[]): { discount: number; applied: string[] } {
  const qtyMap: Record<string, number> = {};
  const priceMap: Record<string, number> = {};
  for (const item of items) { qtyMap[item.id] = item.quantity; priceMap[item.id] = item.price; }

  let discount = 0;
  const applied: string[] = [];

  for (const rule of rules) {
    if (rule.rule_type === "bxgf" && rule.bxgf_inventory_id && rule.buy_quantity && rule.free_quantity) {
      const qty = qtyMap[rule.bxgf_inventory_id] ?? 0;
      const freeUnits = Math.floor(qty / (rule.buy_quantity + rule.free_quantity)) * rule.free_quantity;
      if (freeUnits > 0) {
        const d = freeUnits * (priceMap[rule.bxgf_inventory_id] ?? 0);
        discount += d;
        applied.push(`${rule.name} (−${formatPrice(d)})`);
      }
    } else if (rule.rule_type === "bundle" && rule.discount_value) {
      const bundleIds = rule.bundle_items.map((b) => b.inventory_id);
      if (bundleIds.length >= 2 && bundleIds.every((id) => id in qtyMap)) {
        const bundleSubtotal = bundleIds.reduce((sum, id) => sum + (qtyMap[id] ?? 0) * (priceMap[id] ?? 0), 0);
        const d = rule.discount_type === "percent"
          ? Math.round(bundleSubtotal * rule.discount_value / 100 * 100) / 100
          : Math.min(rule.discount_value, bundleSubtotal);
        discount += d;
        applied.push(`${rule.name} (−${formatPrice(d)})`);
      }
    }
  }

  return { discount: Math.round(discount * 100) / 100, applied };
}

interface CheckoutInventory {
  id: string;
  quantity: number;
  price: number;
  sale_price?: number | null;
  flash_sale_price?: number | null;
}

function stockIssue(items: CartItem[], inventory: CheckoutInventory[]): string | null {
  const unavailable = items.filter((item) => {
    const row = inventory.find((inv) => inv.id === item.id);
    return !row || row.quantity < item.quantity;
  });
  return unavailable.length ? `Stock changed for ${unavailable.map((i) => i.name).join(", ")}. Edit your cart to continue.` : null;
}

function checkoutError(error: unknown): string {
  const message = error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : "Please try again.";
  try {
    const detail = JSON.parse(message).detail;
    return typeof detail === "string" ? detail : message;
  } catch { return message; }
}

interface ConfirmationData {
  storeName: string;
  pointsEarned: number;
  discountAmount: number;
  finalTotal: number;
  deliveryFee?: number | null;
}

// ---------------------------------------------------------------------------
// CartDrawer — top-level shell
// ---------------------------------------------------------------------------

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const [drawerState, setDrawerState] = useState<DrawerState>("cart");
  const [confirmData, setConfirmData] = useState<ConfirmationData>({ storeName: "", pointsEarned: 0, discountAmount: 0, finalTotal: 0 });
  const { state, dispatch } = useCart();
  const { toast } = useToast();
  const items = state.items;

  const inventory = useQuery<{ inventory: CheckoutInventory[] }>({
    queryKey: [`/inventory/browse/${items[0]?.storeId}`],
    enabled: open && items.length > 0,
    staleTime: 0,
    refetchInterval: open ? 15_000 : false,
    refetchOnWindowFocus: true,
  });
  const stockMessage = inventory.isError
    ? "Could not check stock. Please retry before checkout."
    : inventory.data ? stockIssue(items, inventory.data.inventory) : null;
  const stockBlocked = inventory.isPending || inventory.isError || !!stockMessage;

  useEffect(() => {
    if (!inventory.data) return;
    const rows = inventory.data.inventory;
    const prices = rows.map((inv) => ({ id: inv.id, price: inv.flash_sale_price ?? inv.sale_price ?? inv.price }));
    if (items.some((item) => prices.some((p) => p.id === item.id && p.price !== item.price))) {
      dispatch({ type: "UPDATE_PRICES", payload: prices });
      toast({ title: "Prices updated", description: "Some item prices have changed since you last shopped." });
    }
    const stock = items.map((item) => ({ id: item.id, stock: rows.find((inv) => inv.id === item.id)?.quantity ?? 0 }));
    if (stock.some((item) => items.find((i) => i.id === item.id)?.stock !== item.stock)) {
      dispatch({ type: "UPDATE_STOCK", payload: stock });
    }
  }, [inventory.data, items, dispatch, toast]);

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
      <SheetContent
        side="right"
        className="w-full sm:w-96 p-0 flex flex-col [&>button]:hidden"
        aria-describedby={undefined}
      >
        {drawerState !== "confirmation" && items.length > 0 && stockMessage && (
          <div role="alert" className="p-3 text-sm text-destructive bg-destructive/10">
            {stockMessage}
            {inventory.isError && <Button variant="ghost" size="sm" onClick={() => inventory.refetch()}>Retry stock check</Button>}
          </div>
        )}
        {drawerState === "cart" && (
          <CartView
            items={items}
            storeName={storeName}
            itemCount={itemCount}
            total={total}
            onClose={handleClose}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveItem={onRemoveItem}
            onCheckout={() => { if (!stockBlocked) setDrawerState("payment"); }}
            stockBlocked={stockBlocked}
            onClearCart={() => dispatch({ type: "CLEAR_CART" })}
          />
        )}
        {drawerState === "payment" && (
          <PaymentView
            stockBlocked={stockBlocked}
            items={items}
            total={total}
            itemCount={itemCount}
            storeName={storeName}
            onClose={handleClose}
            onBack={() => setDrawerState("cart")}
            onSuccess={(data) => {
              setConfirmData(data);
              dispatch({ type: "CLEAR_CART" });
              setDrawerState("confirmation");
            }}
          />
        )}
        {drawerState === "confirmation" && (
          <ConfirmationView {...confirmData} onClose={handleClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// CartView
// ---------------------------------------------------------------------------

interface CartViewProps {
  stockBlocked: boolean;
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

function CartView({ stockBlocked,
  items, storeName, itemCount, total, onClose, onUpdateQuantity, onRemoveItem, onCheckout, onClearCart,
}: CartViewProps) {
  return (
    <>
      <div className="bg-card border-b border-border px-4 py-4 flex items-start justify-between shrink-0">
        <div>
          <SheetTitle className="text-white text-lg font-semibold leading-tight">Your Cart</SheetTitle>
          {storeName && <p className="text-muted-foreground text-sm mt-0.5">{storeName}</p>}
        </div>
        <div className="flex items-center gap-1">
          {items.length > 0 && (
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:bg-muted h-8 px-2 text-xs" onClick={onClearCart}>
              Clear all
            </Button>
          )}
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground font-medium">Your cart is empty</p>
          <Link href="/stores">
            <Button variant="outline" size="sm" onClick={onClose}>Browse stores</Button>
          </Link>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.map((item) => (
            <CartItemRow key={item.id} item={item} onUpdateQuantity={onUpdateQuantity} onRemoveItem={onRemoveItem} />
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="shrink-0 border-t px-4 py-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
            <span className="font-semibold text-primary text-base">{formatPrice(total)}</span>
          </div>
          <Button className="w-full" onClick={onCheckout} disabled={stockBlocked}>Checkout →</Button>
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
  const subtotal = item.price * item.quantity;

  return (
    <div className="flex gap-3 items-start">
      <img src={imageUrl} alt={item.name} className="w-12 h-12 rounded-md object-cover shrink-0 border" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{formatPrice(item.price)} each</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="h-6 w-6" disabled={item.quantity <= 1} onClick={() => onUpdateQuantity(item.id, item.storeId, -1, item.quantity)}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
            <Button variant="outline" size="icon" className="h-6 w-6" disabled={item.quantity >= item.stock} onClick={() => onUpdateQuantity(item.id, item.storeId, 1, item.quantity)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary">{formatPrice(subtotal)}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onRemoveItem(item.id, item.storeId)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card form helpers
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
  if (!digits || !/^\d{13,19}$/.test(digits)) errors.cardNumber = "Enter a valid card number (13–19 digits)";
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
  if (!form.cvv || !/^\d{3,4}$/.test(form.cvv)) errors.cvv = "3 or 4 digits";
  if (!form.nameOnCard.trim()) errors.nameOnCard = "Required";
  return errors;
}

function cardBrandIcon(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, "");
  if (/^4/.test(digits)) return "Visa";
  const prefix = Number(digits.slice(0, 4));
  if (/^5[1-5]/.test(digits) || (digits.length >= 4 && prefix >= 2221 && prefix <= 2720)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "American Express";
  return "Card";
}

// ---------------------------------------------------------------------------
// Remembered drop-off (localStorage — per browser, not per account)
// ---------------------------------------------------------------------------

const DROPOFF_STORAGE_KEY = "groceror_last_dropoff";

interface StoredDropoff {
  fulfillment: "pickup" | "delivery";
  address: string;
  coords: { lat: number; lng: number } | null;
}

function loadStoredDropoff(): StoredDropoff {
  try {
    const raw = localStorage.getItem(DROPOFF_STORAGE_KEY);
    if (!raw) return { fulfillment: "delivery", address: "", coords: null };
    const parsed = JSON.parse(raw);
    const coords =
      parsed?.coords && Number.isFinite(parsed.coords.lat) && Math.abs(parsed.coords.lat) <= 90 && Number.isFinite(parsed.coords.lng) && Math.abs(parsed.coords.lng) <= 180
        ? { lat: parsed.coords.lat, lng: parsed.coords.lng }
        : null;
    return {
      fulfillment: "delivery", // Pickup is disabled for the MVP, including saved preferences.
      address: typeof parsed?.address === "string" ? parsed.address : "",
      coords,
    };
  } catch {
    return { fulfillment: "delivery", address: "", coords: null };
  }
}

// ---------------------------------------------------------------------------
// PaymentView
// ---------------------------------------------------------------------------

interface PaymentViewProps {
  stockBlocked: boolean;
  items: CartItem[];
  total: number;
  itemCount: number;
  storeName: string;
  onClose: () => void;
  onBack: () => void;
  onSuccess: (data: ConfirmationData) => void;
}

function PaymentView({ stockBlocked, items, total, itemCount, storeName, onClose, onBack, onSuccess }: PaymentViewProps) {
  const demoExpiry = `12/${String(new Date().getFullYear() + 2).slice(-2)}`;
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [form, setForm] = useState<CardForm>({ cardNumber: "4242 4242 4242 4242", expiry: demoExpiry, cvv: "123", nameOnCard: "Demo Shopper" });
  const [touched, setTouched] = useState<Partial<Record<keyof CardForm, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { toast } = useToast();

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);

  // Loyalty state
  const [loyaltyBalance, setLoyaltyBalance] = useState<LoyaltyBalance | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  // Bulk rules
  const [bulkRules, setBulkRules] = useState<BulkRuleAPI[]>([]);
  const storeId = items[0]?.storeId;

  // Delivery (see SPEC_DELIVERY_DISPATCH.md). v1 only supports setting the
  // dropoff point via the browser's geolocation API — same pattern the
  // store-owner delivery-zone page already uses — rather than a full
  // address-entry/geocoding UI.
  // Pickup selection is commented out for the delivery-only MVP.
  const fulfillment = "delivery";
  const [deliveryAddress, setDeliveryAddress] = useState(() => loadStoredDropoff().address);
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(
    () => loadStoredDropoff().coords
  );
  const [locating, setLocating] = useState(false);


  // Remember the shopper's last drop-off so they aren't asked to re-share
  // location on every checkout — a per-browser convenience only, not synced
  // to their account. The delivery quote itself is never trusted from
  // storage; the effect below always re-fetches a fresh one.
  useEffect(() => {
    try {
      localStorage.setItem(
        DROPOFF_STORAGE_KEY,
        JSON.stringify({ fulfillment, address: deliveryAddress, coords: deliveryCoords })
      );
    } catch {
      // Private browsing / storage disabled — checkout still works, it just re-asks next time.
    }
  }, [fulfillment, deliveryAddress, deliveryCoords]);

  function useMyLocationForDelivery() {
    if (!navigator.geolocation) {
      toast({ title: "Location unavailable", description: "This browser does not support location sharing.", variant: "destructive" });
      return;
    }
    setDeliveryCoords(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeliveryCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        toast({ title: "Could not detect location", variant: "destructive" });
        setLocating(false);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  // Coordinates are part of the key, so a late response for an older
  // location can never enable checkout for the current location.
  const deliveryQuote = useQuery<{ fee: number }>({
    queryKey: ["delivery-quote", storeId, deliveryCoords?.lat, deliveryCoords?.lng],
    enabled: !!deliveryCoords && !!storeId,
    staleTime: 0,
    retry: false,
    queryFn: async () => {
      const response = await apiRequest("POST", "/order/delivery-quote", {
        store_id: storeId,
        dropoff_lat: deliveryCoords!.lat,
        dropoff_lng: deliveryCoords!.lng,
      });
      return response.json();
    },
  });
  const quote = deliveryCoords && !deliveryQuote.isError ? deliveryQuote.data : null;
  const quoting = deliveryQuote.isFetching;
  const quoteError = deliveryQuote.isError ? checkoutError(deliveryQuote.error) : null;

  const deliveryFee = fulfillment === "delivery" ? (quote?.fee ?? 0) : 0;

  useEffect(() => {
    apiRequest("GET", "/loyalty/balance")
      .then((r) => r.json())
      .then((d: LoyaltyBalance) => setLoyaltyBalance(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!storeId) return;
    apiRequest("GET", `/bulk-rules/store/${storeId}`)
      .then((r) => r.json())
      .then((d: BulkRuleAPI[]) => setBulkRules(d))
      .catch(() => {});
  }, [storeId]);

  const { data: availableCoupons = [] } = useQuery<AvailableCoupon[]>({
    queryKey: [`/coupons/available?store_id=${storeId}`],
    enabled: !!storeId,
  });
  const [showCouponList, setShowCouponList] = useState(false);

  const { discount: bulkDiscount, applied: bulkApplied } = computeBulkDiscount(items, bulkRules);
  const couponDiscount = couponResult?.valid ? couponResult.discount_amount : 0;
  const loyaltyDiscount = Math.min(pointsToRedeem / 100, Math.max(0, total - bulkDiscount));
  const finalTotal = Math.max(0, total - bulkDiscount - couponDiscount - loyaltyDiscount) + deliveryFee;

  const errors = validateCard(form);
  const hasErrors = Object.keys(errors).length > 0;

  function set(field: keyof CardForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }
  function touch(field: keyof CardForm) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  const inputCls = (field: keyof CardForm) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/60 focus:border-primary bg-input text-foreground ${
      touched[field] && errors[field] ? "border-destructive" : "border-input"
    }`;

  async function applyCoupon(code?: string) {
    const raw = (code ?? couponInput).trim().toUpperCase();
    if (!raw) return;
    if (code) setCouponInput(code.toUpperCase());
    setCouponChecking(true);
    try {
      const res = await apiRequest("GET", `/coupons/${raw}/validate?order_total=${total}`);
      const data: CouponResult = await res.json();
      setCouponResult(data);
      if (data.valid) {
        toast({ description: `Coupon applied — you save ${formatPrice(data.discount_amount)}!` });
      } else {
        toast({ description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ description: "Could not validate coupon. Try again.", variant: "destructive" });
      setCouponResult(null);
    } finally {
      setCouponChecking(false);
      setShowCouponList(false);
    }
  }

  async function handlePlaceOrder() {
    setTouched({ cardNumber: true, expiry: true, cvv: true, nameOnCard: true });
    if (submitting || stockBlocked || (paymentMethod === "card" && hasErrors)) return;
    if (fulfillment === "delivery" && !deliveryCoords) {
      toast({ description: "Set a delivery location first.", variant: "destructive" });
      return;
    }
    if (!quote || quoting || locating || quoteError) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const { apiRequest: req } = await import("@/lib/queryClient");
      const stockResponse = await req("GET", `/inventory/browse/${storeId}`);
      const stockData: { inventory: CheckoutInventory[] } = await stockResponse.json();
      const issue = stockIssue(items, stockData.inventory);
      if (issue) throw new Error(issue);
      const orderItems = items.map(({ id, quantity }) => ({ inventory_id: id, quantity }));
      const res = await req("POST", "/order/create-order", {
        items: orderItems,
        coupon_code: couponResult?.valid ? couponInput.trim().toUpperCase() : undefined,
        points_to_redeem: pointsToRedeem,
        ...(fulfillment === "delivery" && deliveryCoords
          ? {
              delivery_address_line: deliveryAddress || undefined,
              delivery_lat: deliveryCoords.lat,
              delivery_lng: deliveryCoords.lng,
            }
          : {}),
      });
      const data = await res.json();
      onSuccess({
        storeName,
        pointsEarned: data.points_earned ?? 0,
        discountAmount: data.discount_amount ?? 0,
        finalTotal: data.total_price ?? finalTotal,
        deliveryFee: data.delivery_fee ?? null,
      });
    } catch (err: unknown) {
      const message = checkoutError(err);
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const summaryItems = items.slice(0, 2).map((i) => `${i.name} ×${i.quantity}`).join(", ");
  const summaryMore = items.length > 2 ? "…" : "";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4 flex items-start justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted h-8 w-8" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <SheetTitle className="text-white text-lg font-semibold leading-tight">Checkout</SheetTitle>
            {storeName && (
              <p className="text-muted-foreground text-sm mt-0.5">
                {storeName} · {fulfillment === "delivery" ? "Delivery" : "Pickup"}
              </p>
            )}
          </div>
        </div>
        <button className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Collapsed cart summary */}
        <div className="bg-muted border border-border rounded-lg px-3 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-foreground font-semibold text-sm">{itemCount} {itemCount === 1 ? "item" : "items"} · {formatPrice(total)}</p>
            <p className="text-foreground text-xs mt-0.5">{summaryItems}{summaryMore}</p>
          </div>
          <button className="text-xs text-muted-foreground bg-muted hover:bg-muted/80 border border-border rounded-full px-3 py-1 transition-colors" onClick={onBack}>
            ← Edit
          </button>
        </div>

        {/* Pickup disabled for the MVP. Restore only with product approval:
            <button onClick={() => setFulfillment("pickup")}>Pickup</button>
        */}
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2"><Truck className="h-4 w-4" /> Delivery</p>

          {fulfillment === "delivery" && (
            <div className="space-y-2 bg-muted/50 border border-border rounded-lg px-3 py-2.5">
              <Input
                placeholder="Delivery address (for the rider)"
                aria-label="Delivery address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="h-9 text-sm"
              />
              <p className="text-xs text-muted-foreground">Use location sharing to set the delivery point. The address above provides directions for the rider.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs w-full"
                disabled={locating}
                onClick={useMyLocationForDelivery}
              >
                <MapPin className="h-3.5 w-3.5 mr-1" />
                {locating ? "Locating…" : deliveryCoords ? "Location set — update" : "Use my location"}
              </Button>
              {!deliveryCoords && !locating && (
                <p className="text-xs text-muted-foreground">
                  Tap "Use my location" to set where we deliver — typing below doesn't set it.
                </p>
              )}

              <Input
                placeholder="Landmark or note for the rider (optional)"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="h-9 text-sm"
              />

              {quoting && <p className="text-xs text-muted-foreground">Checking delivery fee…</p>}
              {quote && !quoting && (
                <p className="text-xs text-emerald-400">Delivery fee: {formatPrice(quote.fee)}</p>
              )}
              {quoteError && !quoting && (
                <div className="flex items-center justify-between gap-2">
                  <p role="alert" className="text-xs text-destructive">{quoteError}</p>
                  <Button variant="ghost" size="sm" onClick={() => deliveryQuote.refetch()}>Retry</Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Coupon code */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Tag className="h-3 w-3" /> Coupon code
          </p>

          {/* Available coupons list */}
          {availableCoupons.length > 0 && (
            <div>
              <button
                className="flex items-center gap-1 text-xs text-primary hover:underline mb-1.5"
                onClick={() => setShowCouponList((v) => !v)}
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${showCouponList ? "rotate-180" : ""}`} />
                {availableCoupons.length} coupon{availableCoupons.length !== 1 ? "s" : ""} available
              </button>
              {showCouponList && (
                <div className="space-y-1.5 mb-2">
                  {availableCoupons.map((c) => (
                    <button
                      key={c.id}
                      className="w-full flex items-center justify-between rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-left hover:bg-primary/10 transition-colors"
                      onClick={() => applyCoupon(c.code)}
                    >
                      <div>
                        <span className="font-mono text-sm font-semibold text-primary">{c.code}</span>
                        {c.min_order_amount && (
                          <span className="text-xs text-muted-foreground ml-2">min {formatPrice(c.min_order_amount)}</span>
                        )}
                        {c.valid_until && (
                          <span className="text-xs text-muted-foreground ml-2">expires {new Date(c.valid_until).toLocaleDateString()}</span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-emerald-400">
                        {c.discount_type === "percent" ? `${c.discount_value}% off` : `${formatPrice(c.discount_value)} off`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {couponResult?.valid ? (
            <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-emerald-400 font-mono">{couponInput}</p>
                <p className="text-xs text-emerald-400/80">{couponResult.message}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => { setCouponInput(""); setCouponResult(null); }}
              >
                Remove
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. SAVE10"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponResult(null); }}
                  className="h-9 text-sm font-mono"
                  onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                />
                <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={() => applyCoupon()} disabled={couponChecking || !couponInput.trim()}>
                  {couponChecking ? "…" : "Apply"}
                </Button>
              </div>
              {couponResult && !couponResult.valid && (
                <div className="flex items-center gap-1.5 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2">
                  <p className="text-xs text-destructive">{couponResult.message}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Loyalty points */}
        {loyaltyBalance && loyaltyBalance.points_balance > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Star className="h-3 w-3" /> Loyalty points ({loyaltyBalance.points_balance} pts = {formatPrice(loyaltyBalance.dollar_value)})
            </p>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="0"
                min={0}
                max={loyaltyBalance.points_balance}
                step={100}
                value={pointsToRedeem || ""}
                onChange={(e) => {
                  const v = Math.min(parseInt(e.target.value) || 0, loyaltyBalance.points_balance);
                  setPointsToRedeem(Math.floor(v / 100) * 100);
                }}
                className="h-9 text-sm"
              />
              <span className="text-xs text-muted-foreground shrink-0">
                = {formatPrice(pointsToRedeem / 100)} off
              </span>
              <Button variant="ghost" size="sm" className="h-9 shrink-0 text-xs" onClick={() => setPointsToRedeem(Math.floor(Math.min(loyaltyBalance.points_balance, total * 100) / 100) * 100)}>
                Max
              </Button>
            </div>
          </div>
        )}

        {/* Bulk deals applied */}
        {bulkApplied.length > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5 space-y-1">
            <p className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
              <Package className="h-3 w-3" /> Deals applied
            </p>
            {bulkApplied.map((label, i) => (
              <p key={i} className="text-xs text-emerald-400/80">{label}</p>
            ))}
          </div>
        )}

        {/* Order total breakdown — always visible once any discount or the delivery fee applies */}
        {(bulkDiscount > 0 || couponDiscount > 0 || loyaltyDiscount > 0 || deliveryFee > 0) && (
          <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            {bulkDiscount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Bulk deals</span>
                <span>−{formatPrice(bulkDiscount)}</span>
              </div>
            )}
            {couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-400 font-medium">
                <span>Coupon ({couponInput})</span>
                <span>−{formatPrice(couponDiscount)}</span>
              </div>
            )}
            {loyaltyDiscount > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Loyalty points ({pointsToRedeem} pts)</span>
                <span>−{formatPrice(loyaltyDiscount)}</span>
              </div>
            )}
            {deliveryFee > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery fee</span>
                <span>{formatPrice(deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-1">
              <span>Total</span>
              <span className="text-primary">{formatPrice(finalTotal)}</span>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
          <p className="text-sm font-semibold">Demo payment — no charge</p>
          <p className="text-xs">Payments are not connected yet. This places an order without charging you. Use test details only.</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Demo payment method">
            {[["card", "Card"], ["apple", "Apple Pay"], ["gpay", "G Pay / UPI"]].map(([value, label]) => (
              <Button key={value} variant={paymentMethod === value ? "default" : "outline"} size="sm" aria-pressed={paymentMethod === value} onClick={() => setPaymentMethod(value)}>{label} (demo)</Button>
            ))}
          </div>
        </div>

        {/* Test card details remain in memory only; never saved or submitted. */}
        {paymentMethod === "card" && <div className="space-y-3">
          <label className="text-xs block">Preselected test card
            <select aria-label="Preselected test card" className="block w-full mt-1 bg-input border rounded-lg p-2" value={form.cardNumber.replace(/\s/g, "")} onChange={(e) => setForm({ cardNumber: e.target.value, expiry: demoExpiry, cvv: "123", nameOnCard: "Demo Shopper" })}>
              <option value="4242424242424242">Visa ending 4242 (test)</option>
              <option value="5555555555554444">Mastercard ending 4444 (test)</option>
              <option value="2223003122003222">Mastercard ending 3222 (test)</option>
              {!['4242424242424242', '5555555555554444', '2223003122003222'].includes(form.cardNumber.replace(/\s/g, "")) && <option value={form.cardNumber.replace(/\s/g, "")}>Custom test card</option>}
            </select>
          </label>
          <div>
            <div className="relative">
              <input className={inputCls("cardNumber")} aria-label="Test card number" placeholder="Card number" value={form.cardNumber} maxLength={23} onChange={(e) => set("cardNumber", e.target.value)} onBlur={() => touch("cardNumber")} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">{cardBrandIcon(form.cardNumber)}</span>
            </div>
            {touched.cardNumber && errors.cardNumber && <p className="text-destructive text-xs mt-1">{errors.cardNumber}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input className={inputCls("expiry")} placeholder="MM/YY" value={form.expiry} maxLength={5}
                onChange={(e) => { let v = e.target.value.replace(/[^0-9]/g, ""); if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2, 4); set("expiry", v); }}
                onBlur={() => touch("expiry")} />
              {touched.expiry && errors.expiry && <p className="text-destructive text-xs mt-1">{errors.expiry}</p>}
            </div>
            <div>
              <input className={inputCls("cvv")} placeholder="CVV" value={form.cvv} maxLength={4} onChange={(e) => set("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))} onBlur={() => touch("cvv")} />
              {touched.cvv && errors.cvv && <p className="text-destructive text-xs mt-1">{errors.cvv}</p>}
            </div>
          </div>
          <div>
            <input className={inputCls("nameOnCard")} placeholder="Name on card" value={form.nameOnCard} onChange={(e) => set("nameOnCard", e.target.value)} onBlur={() => touch("nameOnCard")} />
            {touched.nameOnCard && errors.nameOnCard && <p className="text-destructive text-xs mt-1">{errors.nameOnCard}</p>}
          </div>
        </div>}

        {apiError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2.5">{apiError}</p>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="border-t px-4 py-4 flex-shrink-0 space-y-2">
        <Button
          className="w-full"
          disabled={submitting || stockBlocked || locating || quoting || !!quoteError || !deliveryCoords || !quote}
          onClick={handlePlaceOrder}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Placing order…
            </span>
          ) : (
            `Place Order — ${formatPrice(finalTotal)}`
          )}
        </Button>

        {/* Recurring checkout controls deferred until after MVP. */}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConfirmationView
// ---------------------------------------------------------------------------

function ConfirmationView({ storeName, pointsEarned, discountAmount, finalTotal, deliveryFee, onClose }: ConfirmationData & { onClose: () => void }) {
  const [, setLocation] = useLocation();

  return (
    <>
      <div className="bg-card border-b border-border px-4 py-4 text-center flex-shrink-0">
        <SheetTitle className="font-bold text-base">Order Confirmed</SheetTitle>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shadow-lg animate-bounce">
          <span className="text-3xl text-primary">✓</span>
        </div>
        <div>
          <h3 className="font-bold text-xl">You're all set!</h3>
          {storeName && <p className="text-sm text-muted-foreground mt-1">{storeName}</p>}
          <p className="text-sm font-semibold text-primary mt-1">{formatPrice(finalTotal)} order total — no payment collected</p>
        </div>

        {(discountAmount > 0 || pointsEarned > 0 || !!deliveryFee) && (
          <div className="w-full bg-muted border border-border rounded-xl p-4 text-left space-y-1.5">
            {discountAmount > 0 && (
              <p className="text-sm text-emerald-400 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Saved {formatPrice(discountAmount)} with discounts
              </p>
            )}
            {pointsEarned > 0 && (
              <p className="text-sm text-amber-400 flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5" /> Earned {pointsEarned} loyalty points
              </p>
            )}
            {!!deliveryFee && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" /> Delivery fee: {formatPrice(deliveryFee)}
              </p>
            )}
          </div>
        )}

        <div className="w-full bg-muted border border-border rounded-xl p-4 text-left">
          <p className="text-xs font-bold text-foreground mb-1.5">What happens next</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {deliveryFee != null
              ? <>{storeName || "The store"} will pack your order, then request a courier. Head to{" "}
                  <span className="text-primary font-semibold">Orders</span> to track delivery status.</>
              : <>{storeName || "The store"} has confirmed your order. Head to{" "}
                  <span className="text-primary font-semibold">Orders</span> to track its status.</>}
          </p>
        </div>

        <div className="w-full space-y-3 mt-2">
          <Button className="w-full" onClick={() => { setLocation("/orders"); onClose(); }}>
            View my orders
          </Button>
          <button className="text-sm text-primary font-semibold hover:underline" onClick={onClose}>
            Continue shopping
          </button>
        </div>
      </div>
    </>
  );
}
