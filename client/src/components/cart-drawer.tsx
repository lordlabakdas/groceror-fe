import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { X, ArrowLeft, Minus, Plus, Trash2, ShoppingCart, Tag, Star, Package, CalendarClock, ChevronDown } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCart, type CartItem } from "@/lib/cart";
import { getProductImage } from "@/lib/catalog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
        applied.push(`${rule.name} (−$${d.toFixed(2)})`);
      }
    } else if (rule.rule_type === "bundle" && rule.discount_value) {
      const bundleIds = rule.bundle_items.map((b) => b.inventory_id);
      if (bundleIds.length >= 2 && bundleIds.every((id) => id in qtyMap)) {
        const bundleSubtotal = bundleIds.reduce((sum, id) => sum + (qtyMap[id] ?? 0) * (priceMap[id] ?? 0), 0);
        const d = rule.discount_type === "percent"
          ? Math.round(bundleSubtotal * rule.discount_value / 100 * 100) / 100
          : Math.min(rule.discount_value, bundleSubtotal);
        discount += d;
        applied.push(`${rule.name} (−$${d.toFixed(2)})`);
      }
    }
  }

  return { discount: Math.round(discount * 100) / 100, applied };
}

interface ConfirmationData {
  storeName: string;
  pointsEarned: number;
  discountAmount: number;
  finalTotal: number;
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
      .catch(() => {});
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
  items, storeName, itemCount, total, onClose, onUpdateQuantity, onRemoveItem, onCheckout, onClearCart,
}: CartViewProps) {
  return (
    <>
      <div className="bg-card border-b border-border px-4 py-4 flex items-start justify-between shrink-0">
        <div>
          <h2 className="text-white text-lg font-semibold leading-tight">Your Cart</h2>
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
            <span className="font-semibold text-primary text-base">${total.toFixed(2)}</span>
          </div>
          <Button className="w-full" onClick={onCheckout}>Checkout →</Button>
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
      <img src={imageUrl} alt={item.name} className="w-12 h-12 rounded-md object-cover shrink-0 border" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">${item.price.toFixed(2)} each</p>
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
            <span className="text-sm font-semibold text-primary">${subtotal}</span>
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
  onSuccess: (data: ConfirmationData) => void;
}

function PaymentView({ items, total, itemCount, storeName, onClose, onBack, onSuccess }: PaymentViewProps) {
  const [form, setForm] = useState<CardForm>({ cardNumber: "", expiry: "", cvv: "", nameOnCard: "" });
  const [touched, setTouched] = useState<Partial<Record<keyof CardForm, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [scheduleFreq, setScheduleFreq] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);

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
  const finalTotal = Math.max(0, total - bulkDiscount - couponDiscount - loyaltyDiscount);

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
        toast({ description: `Coupon applied — you save $${data.discount_amount.toFixed(2)}!` });
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
    if (hasErrors) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const { apiRequest: req } = await import("@/lib/queryClient");
      const orderItems = items.map(({ id, quantity }) => ({ inventory_id: id, quantity }));
      const res = await req("POST", "/order/create-order", {
        items: orderItems,
        coupon_code: couponResult?.valid ? couponInput.trim().toUpperCase() : undefined,
        points_to_redeem: pointsToRedeem,
      });
      const data = await res.json();
      onSuccess({
        storeName,
        pointsEarned: data.points_earned ?? 0,
        discountAmount: data.discount_amount ?? 0,
        finalTotal: data.total_price ?? finalTotal,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Order failed. Please try again.";
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
            <h2 className="text-white text-lg font-semibold leading-tight">Checkout</h2>
            {storeName && <p className="text-muted-foreground text-sm mt-0.5">{storeName} · Pickup</p>}
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
            <p className="text-foreground font-semibold text-sm">{itemCount} {itemCount === 1 ? "item" : "items"} · ${total.toFixed(2)}</p>
            <p className="text-foreground text-xs mt-0.5">{summaryItems}{summaryMore}</p>
          </div>
          <button className="text-xs text-muted-foreground bg-muted hover:bg-muted/80 border border-border rounded-full px-3 py-1 transition-colors" onClick={onBack}>
            ← Edit
          </button>
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
                          <span className="text-xs text-muted-foreground ml-2">min ${c.min_order_amount.toFixed(2)}</span>
                        )}
                        {c.valid_until && (
                          <span className="text-xs text-muted-foreground ml-2">expires {new Date(c.valid_until).toLocaleDateString()}</span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-emerald-400">
                        {c.discount_type === "percent" ? `${c.discount_value}% off` : `$${c.discount_value.toFixed(2)} off`}
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
              <Star className="h-3 w-3" /> Loyalty points ({loyaltyBalance.points_balance} pts = ${loyaltyBalance.dollar_value.toFixed(2)})
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
                = ${(pointsToRedeem / 100).toFixed(2)} off
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

        {/* Order total breakdown — always visible once any discount applies */}
        {(bulkDiscount > 0 || couponDiscount > 0 || loyaltyDiscount > 0) && (
          <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            {bulkDiscount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Bulk deals</span>
                <span>−${bulkDiscount.toFixed(2)}</span>
              </div>
            )}
            {couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-400 font-medium">
                <span>Coupon ({couponInput})</span>
                <span>−${couponDiscount.toFixed(2)}</span>
              </div>
            )}
            {loyaltyDiscount > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Loyalty points ({pointsToRedeem} pts)</span>
                <span>−${loyaltyDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-1">
              <span>Total</span>
              <span className="text-primary">${finalTotal.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Express payment */}
        <div className="grid grid-cols-2 gap-2">
          <button disabled title="Coming soon" className="flex items-center justify-center gap-1.5 bg-muted text-muted-foreground border border-border text-sm font-medium rounded-lg py-2.5 cursor-not-allowed opacity-60">
            <span>⬛</span> Apple Pay
          </button>
          <button disabled title="Coming soon" className="flex items-center justify-center gap-1.5 bg-muted text-muted-foreground border border-border text-sm font-medium rounded-lg py-2.5 cursor-not-allowed opacity-60">
            G Pay
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or pay by card</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Card form */}
        <div className="space-y-3">
          <div>
            <div className="relative">
              <input className={inputCls("cardNumber")} placeholder="Card number" value={form.cardNumber} maxLength={23} onChange={(e) => set("cardNumber", e.target.value)} onBlur={() => touch("cardNumber")} />
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
        </div>

        {apiError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2.5">{apiError}</p>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="border-t px-4 py-4 flex-shrink-0 space-y-2">
        <Button className="w-full" disabled={submitting} onClick={handlePlaceOrder}>
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Placing order…
            </span>
          ) : (
            `Place Order — $${finalTotal.toFixed(2)}`
          )}
        </Button>

        {/* Schedule recurring */}
        <div className="flex items-center gap-2">
          <Select value={scheduleFreq ?? ""} onValueChange={(v) => setScheduleFreq(v || null)}>
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue placeholder="Schedule recurring…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Every week</SelectItem>
              <SelectItem value="biweekly">Every 2 weeks</SelectItem>
              <SelectItem value="monthly">Every month</SelectItem>
            </SelectContent>
          </Select>
          {scheduleFreq && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs flex-shrink-0"
              disabled={scheduling}
              onClick={async () => {
                setScheduling(true);
                try {
                  await apiRequest("POST", "/scheduled-orders", {
                    frequency: scheduleFreq,
                    items: items.map((i) => ({ inventory_id: i.id, quantity: i.quantity })),
                  });
                  toast({ description: "Recurring order saved" });
                  setScheduleFreq(null);
                } catch {
                  toast({ description: "Could not save recurring order", variant: "destructive" });
                } finally {
                  setScheduling(false);
                }
              }}
            >
              <CalendarClock className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConfirmationView
// ---------------------------------------------------------------------------

function ConfirmationView({ storeName, pointsEarned, discountAmount, finalTotal, onClose }: ConfirmationData & { onClose: () => void }) {
  const [, setLocation] = useLocation();

  return (
    <>
      <div className="bg-card border-b border-border px-4 py-4 text-center flex-shrink-0">
        <h2 className="font-bold text-base">Order Confirmed</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shadow-lg animate-bounce">
          <span className="text-3xl text-primary">✓</span>
        </div>
        <div>
          <h3 className="font-bold text-xl">You're all set!</h3>
          {storeName && <p className="text-sm text-muted-foreground mt-1">{storeName}</p>}
          <p className="text-sm font-semibold text-primary mt-1">${finalTotal.toFixed(2)} charged</p>
        </div>

        {(discountAmount > 0 || pointsEarned > 0) && (
          <div className="w-full bg-muted border border-border rounded-xl p-4 text-left space-y-1.5">
            {discountAmount > 0 && (
              <p className="text-sm text-emerald-400 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Saved ${discountAmount.toFixed(2)} with discounts
              </p>
            )}
            {pointsEarned > 0 && (
              <p className="text-sm text-amber-400 flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5" /> Earned {pointsEarned} loyalty points
              </p>
            )}
          </div>
        )}

        <div className="w-full bg-muted border border-border rounded-xl p-4 text-left">
          <p className="text-xs font-bold text-foreground mb-1.5">What happens next</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {storeName || "The store"} will confirm your order. Head to{" "}
            <span className="text-primary font-semibold">Orders</span> to track its status.
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
