# Cart Checkout Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/cart` page with a right-side drawer that handles the full cart → payment → confirmation flow without navigating away from the current page.

**Architecture:** A `CartDrawer` component owns a `DrawerState = "cart" | "payment" | "confirmation"` state machine rendered as a shadcn `Sheet`. `CartContext` gains `cartOpen / openCart / closeCart`. The `/cart` route and `pages/cart.tsx` are removed; the nav cart icon calls `openCart()`. The backend `POST /order/create-order` is updated to return the created order's `id`.

**Tech Stack:** React 18, TypeScript, shadcn/ui `Sheet`, TanStack React Query v5, existing `CartContext`/`CartItem` types, Tailwind CSS emerald theme, FastAPI + Pydantic.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `api/validators/order_validation.py` | Modify | Add `OrderCreatedResponse` with `id` + `status` |
| `api/order_api.py` | Modify | Return `OrderCreatedResponse` from `create_order` |
| `client/src/lib/cart.tsx` | Modify | Add `cartOpen`, `openCart`, `closeCart` |
| `client/src/components/cart-drawer.tsx` | Create | Full cart→payment→confirmation drawer |
| `client/src/components/layout.tsx` | Modify | Replace cart link with `openCart()` button; mount `<CartDrawer>` |
| `client/src/App.tsx` | Modify | Remove `/cart` BuyerRoute |
| `client/src/pages/cart.tsx` | Delete | Replaced by drawer |

---

### Task 1: Backend — return order ID from create-order

**Files:**
- Modify: `api/validators/order_validation.py`
- Modify: `api/order_api.py`

- [ ] **Step 1: Add `OrderCreatedResponse` to `order_validation.py`**

Open `api/validators/order_validation.py` and add after the `Order` class:

```python
class OrderCreatedResponse(BaseModel):
    id: UUID
    status: str
```

- [ ] **Step 2: Import and use it in `order_api.py`**

In `api/order_api.py`, update the import line:

```python
from api.validators.order_validation import (
    Order, OrderHistoryItem, OrderHistoryResponse,
    OrderCreatedResponse,
    StoreOrderItem, StoreOrdersResponse,
    UpdateOrderStatusPayload, UpdateOrderStatusResponse,
    VALID_STATUSES,
)
```

Change the route signature and its `return` statement (currently returns `return order`):

```python
@order_apis.post("/create-order", response_model=OrderCreatedResponse)
async def create_order(
    order: Order,
    current_user: User = Depends(_get_user_profile),
):
    logger.info(f"Creating order for user {current_user.id}")

    order_service = OrderService()
    order_entity = order_service.create_order(order, current_user)

    order_dict = _serialize(order.dict())
    order_dict["order_id"]  = str(order_entity.id)
    order_dict["user_id"]   = str(current_user.id)
    order_dict["order_date"] = order.order_date.isoformat()

    try:
        publisher.publish_message(
            queue_name="order_queue",
            routing_key="order_queue",
            event="order_created",
            **order_dict,
        )
    except Exception:
        logger.warning(
            "order_id=%s was saved but could not be published to RabbitMQ",
            order_entity.id,
        )

    return OrderCreatedResponse(id=order_entity.id, status=order_entity.status)
```

- [ ] **Step 3: Manual smoke-test (no unit test needed — existing integration catches regressions)**

Start the backend and run:
```bash
curl -s -X POST http://localhost:8000/order/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <valid-token>" \
  -d '{"items":["<uuid>"],"total_price":1.99,"status":"pending"}'
```
Expected: JSON with `{"id": "<uuid>", "status": "pending"}`.

- [ ] **Step 4: Commit**

```bash
cd /code/groceror
git add api/validators/order_validation.py api/order_api.py
git commit -m "feat: return order id from create-order endpoint"
```

---

### Task 2: Extend CartContext with drawer open/close state

**Files:**
- Modify: `client/src/lib/cart.tsx`

- [ ] **Step 1: Update `CartContext` type and `CartProvider`**

Replace the current context value type and provider in `client/src/lib/cart.tsx`:

```typescript
// Replace the CartContext definition:
const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
} | null>(null);
```

```typescript
// Replace CartProvider:
export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadCart);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(state));
  }, [state]);

  return (
    <CartContext.Provider
      value={{
        state,
        dispatch,
        cartOpen,
        openCart: () => setCartOpen(true),
        closeCart: () => setCartOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
```

Add `useState` to the import at the top (it's not currently imported):
```typescript
import { createContext, useContext, useReducer, useState, useEffect, ReactNode } from "react";
```

- [ ] **Step 2: Update `useCart` return type (no code change needed — TypeScript infers it)**

The existing `useCart()` hook already returns the full context value, so consumers will automatically get `cartOpen`, `openCart`, and `closeCart`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "/code/groceror-fe/GroceryCompanion (4)/GroceryCompanion"
npm run build 2>&1 | head -30
```
Expected: no type errors in `cart.tsx`.

- [ ] **Step 4: Commit**

```bash
git add client/src/lib/cart.tsx
git commit -m "feat: add cartOpen/openCart/closeCart to CartContext"
```

---

### Task 3: CartDrawer — shell + cart state UI

**Files:**
- Create: `client/src/components/cart-drawer.tsx`

- [ ] **Step 1: Create the file with DrawerState machine and cart view**

Create `client/src/components/cart-drawer.tsx`:

```typescript
import { useState } from "react";
import { Link } from "wouter";
import { X, ArrowLeft, Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { getProductImage } from "@/lib/catalog";

type DrawerState = "cart" | "payment" | "confirmation";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: Props) {
  const { state, dispatch } = useCart();
  const [drawerState, setDrawerState] = useState<DrawerState>("cart");

  const items = state.items;
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((n, i) => n + i.quantity, 0);
  const storeName = items[0]?.storeName ?? "";

  function handleClose() {
    setDrawerState("cart");
    onClose();
  }

  function handleUpdateQuantity(id: string, storeId: string, delta: number, current: number) {
    const next = current + delta;
    dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity: next } });
    // background sync — non-fatal
    import("@/lib/queryClient").then(({ apiRequest }) =>
      apiRequest("PUT", `/cart/${storeId}/items/${id}`, { quantity: next }).catch(() => {})
    );
  }

  function handleRemoveItem(id: string, storeId: string) {
    dispatch({ type: "REMOVE_ITEM", payload: id });
    import("@/lib/queryClient").then(({ apiRequest }) =>
      apiRequest("DELETE", `/cart/${storeId}/items/${id}`).catch(() => {})
    );
  }

  function handleClearCart() {
    const storeId = items[0]?.storeId;
    dispatch({ type: "CLEAR_CART" });
    if (storeId) {
      import("@/lib/queryClient").then(({ apiRequest }) =>
        apiRequest("POST", `/cart/${storeId}/clear`).catch(() => {})
      );
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-96 p-0 flex flex-col [&>button]:hidden"
      >
        {drawerState === "cart" && (
          <CartView
            items={items}
            total={total}
            itemCount={itemCount}
            storeName={storeName}
            onClose={handleClose}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onCheckout={() => setDrawerState("payment")}
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
          <ConfirmationView
            storeName={storeName}
            onClose={handleClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── CartView ─────────────────────────────────────────────────────────────────

interface CartViewProps {
  items: ReturnType<typeof useCart>["state"]["items"];
  total: number;
  itemCount: number;
  storeName: string;
  onClose: () => void;
  onUpdateQuantity: (id: string, storeId: string, delta: number, current: number) => void;
  onRemoveItem: (id: string, storeId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
}

function CartView({
  items,
  total,
  itemCount,
  storeName,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
}: CartViewProps) {
  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0a2614] to-emerald-700 text-white px-4 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="font-bold text-base">Your Cart</h2>
          {storeName && <p className="text-xs opacity-70 mt-0.5">{storeName}</p>}
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-xs text-white/60 hover:text-white/90 transition-colors px-2 py-1 rounded"
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
            <ShoppingCart className="h-14 w-14 text-muted-foreground/25" />
            <p className="text-muted-foreground font-medium">Your cart is empty</p>
            <Link href="/stores">
              <a onClick={onClose}>
                <Button variant="outline" size="sm">Browse stores</Button>
              </a>
            </Link>
          </div>
        ) : (
          items.map((item) => {
            const img = item.imageUrl || getProductImage(item.name, "OTHER");
            return (
              <div key={item.id} className="flex items-center gap-3">
                <img
                  src={img}
                  alt={item.name}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-muted"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    className="w-6 h-6 rounded border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40"
                    onClick={() => onUpdateQuantity(item.id, item.storeId, -1, item.quantity)}
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center text-sm font-semibold tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    className="w-6 h-6 rounded border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40"
                    onClick={() => onUpdateQuantity(item.id, item.storeId, +1, item.quantity)}
                    disabled={item.quantity >= item.stock}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-sm font-bold text-emerald-700 w-12 text-right tabular-nums">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                  <button
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => onRemoveItem(item.id, item.storeId)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="border-t px-4 py-4 space-y-3 flex-shrink-0">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
            <span>Subtotal</span>
          </div>
          <div className="flex justify-between items-center font-bold">
            <span>Total</span>
            <span className="text-emerald-700">${total.toFixed(2)}</span>
          </div>
          <Button
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
            onClick={onCheckout}
            disabled={items.length === 0}
          >
            Checkout →
          </Button>
        </div>
      )}
    </>
  );
}

// ── PaymentView placeholder (Task 4 fills this in) ────────────────────────────

interface PaymentViewProps {
  items: ReturnType<typeof useCart>["state"]["items"];
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
      <div className="bg-gradient-to-br from-[#0a2614] to-emerald-700 text-white px-4 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="opacity-80 hover:opacity-100">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="font-bold text-base">Checkout</h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Payment form — Task 4
      </div>
    </>
  );
}

// ── ConfirmationView placeholder (Task 5 fills this in) ───────────────────────

interface ConfirmationViewProps {
  storeName: string;
  onClose: () => void;
}

function ConfirmationView({ onClose }: ConfirmationViewProps) {
  return (
    <>
      <div className="bg-gradient-to-br from-[#0a2614] to-emerald-700 text-white px-4 py-4 text-center flex-shrink-0">
        <h2 className="font-bold text-base">Order Confirmed</h2>
      </div>
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Confirmation — Task 5
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/code/groceror-fe/GroceryCompanion (4)/GroceryCompanion"
npm run build 2>&1 | head -40
```
Expected: no errors in `cart-drawer.tsx`.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/cart-drawer.tsx
git commit -m "feat: add CartDrawer skeleton with cart state UI"
```

---

### Task 4: CartDrawer — payment state UI

**Files:**
- Modify: `client/src/components/cart-drawer.tsx`

- [ ] **Step 1: Replace the `PaymentView` placeholder with the full implementation**

Replace the entire `PaymentView` function (from the `interface PaymentViewProps` comment through its closing `}`) with:

```typescript
interface PaymentViewProps {
  items: ReturnType<typeof useCart>["state"]["items"];
  total: number;
  itemCount: number;
  storeName: string;
  onClose: () => void;
  onBack: () => void;
  onSuccess: () => void;
}

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
  const d = cardNumber.replace(/\s/g, "")[0];
  if (d === "4") return "💳 Visa";
  if (d === "5") return "💳 MC";
  if (d === "3") return "💳 Amex";
  return "💳";
}

function PaymentView({ items, total, itemCount, storeName, onClose, onBack, onSuccess }: PaymentViewProps) {
  const [form, setForm] = useState<CardForm>({
    cardNumber: "",
    expiry: "",
    cvv: "",
    nameOnCard: "",
  });
  const [touched, setTouched] = useState<Partial<Record<keyof CardForm, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const errors = validateCard(form);
  const hasErrors = Object.keys(errors).length > 0;

  function touch(field: keyof CardForm) {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  function set(field: keyof CardForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handlePlaceOrder() {
    setTouched({ cardNumber: true, expiry: true, cvv: true, nameOnCard: true });
    if (hasErrors) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const { apiRequest } = await import("@/lib/queryClient");
      const orderItems = items.flatMap(({ id, quantity }) => Array(quantity).fill(id));
      await apiRequest("POST", "/order/create-order", {
        items: orderItems,
        total_price: total,
        status: "pending",
      });
      onSuccess();
    } catch (err: any) {
      setApiError(err?.message ?? "Order failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = (field: keyof CardForm) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
      touched[field] && errors[field] ? "border-destructive" : "border-input"
    }`;

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0a2614] to-emerald-700 text-white px-4 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="opacity-80 hover:opacity-100 transition-opacity">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="font-bold text-base">Checkout</h2>
            {storeName && (
              <p className="text-xs opacity-70 mt-0.5">{storeName} · Pickup</p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Collapsed cart summary */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              {itemCount} item{itemCount !== 1 ? "s" : ""} · ${total.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">
              {items.slice(0, 2).map((i) => `${i.name} ×${i.quantity}`).join(", ")}
              {items.length > 2 ? ", …" : ""}
            </p>
          </div>
          <button
            onClick={onBack}
            className="text-xs text-emerald-700 font-semibold border border-emerald-300 rounded px-2 py-1 hover:bg-emerald-100 transition-colors flex-shrink-0"
          >
            ← Edit
          </button>
        </div>

        {/* Express buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            className="relative bg-black text-white rounded-lg py-2.5 text-sm font-semibold"
            title="Coming soon"
            disabled
          >
            ⬛ Apple Pay
            <span className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg text-xs opacity-0 hover:opacity-100 transition-opacity">
              Coming soon
            </span>
          </button>
          <button
            className="relative border rounded-lg py-2.5 text-sm font-semibold text-blue-600"
            title="Coming soon"
            disabled
          >
            G Pay
            <span className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg text-xs opacity-0 hover:opacity-100 transition-opacity">
              Coming soon
            </span>
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
          <div>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Card number"
                maxLength={19}
                value={form.cardNumber}
                onChange={(e) => set("cardNumber", e.target.value)}
                onBlur={() => touch("cardNumber")}
                className={inputCls("cardNumber")}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">
                {form.cardNumber ? cardBrandIcon(form.cardNumber) : "💳"}
              </span>
            </div>
            {touched.cardNumber && errors.cardNumber && (
              <p className="text-xs text-destructive mt-1">{errors.cardNumber}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="text"
                placeholder="MM / YY"
                maxLength={5}
                value={form.expiry}
                onChange={(e) => {
                  let v = e.target.value.replace(/[^0-9]/g, "");
                  if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2, 4);
                  set("expiry", v);
                }}
                onBlur={() => touch("expiry")}
                className={inputCls("expiry")}
              />
              {touched.expiry && errors.expiry && (
                <p className="text-xs text-destructive mt-1">{errors.expiry}</p>
              )}
            </div>
            <div>
              <input
                type="text"
                inputMode="numeric"
                placeholder="CVV"
                maxLength={4}
                value={form.cvv}
                onChange={(e) => set("cvv", e.target.value.replace(/\D/g, ""))}
                onBlur={() => touch("cvv")}
                className={inputCls("cvv")}
              />
              {touched.cvv && errors.cvv && (
                <p className="text-xs text-destructive mt-1">{errors.cvv}</p>
              )}
            </div>
          </div>

          <div>
            <input
              type="text"
              placeholder="Name on card"
              value={form.nameOnCard}
              onChange={(e) => set("nameOnCard", e.target.value)}
              onBlur={() => touch("nameOnCard")}
              className={inputCls("nameOnCard")}
            />
            {touched.nameOnCard && errors.nameOnCard && (
              <p className="text-xs text-destructive mt-1">{errors.nameOnCard}</p>
            )}
          </div>
        </div>

        {apiError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2.5">
            {apiError}
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="border-t px-4 py-4 flex-shrink-0">
        <Button
          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white gap-2"
          onClick={handlePlaceOrder}
          disabled={submitting}
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
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/code/groceror-fe/GroceryCompanion (4)/GroceryCompanion"
npm run build 2>&1 | head -40
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/cart-drawer.tsx
git commit -m "feat: add payment state to CartDrawer with card form validation"
```

---

### Task 5: CartDrawer — confirmation state + full API wiring

**Files:**
- Modify: `client/src/components/cart-drawer.tsx`

The `PaymentView` in Task 4 already calls `onSuccess()` after a successful API call and the parent `CartDrawer` dispatches `CLEAR_CART` and transitions to `"confirmation"`. This task replaces the `ConfirmationView` placeholder.

- [ ] **Step 1: Replace `ConfirmationView` placeholder**

Replace the placeholder `ConfirmationView` function with:

```typescript
interface ConfirmationViewProps {
  storeName: string;
  onClose: () => void;
}

function ConfirmationView({ storeName, onClose }: ConfirmationViewProps) {
  const { navigate } = (() => {
    // wouter doesn't export useNavigate; import useLocation and derive navigate
    const [, setLocation] = require("wouter").useLocation();
    return { navigate: setLocation };
  })();

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
              navigate("/orders");
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
```

Note: replace the `require("wouter")` pattern with a proper hook import. Add `useLocation` to the imports at the top of the file:

```typescript
import { useState } from "react";
import { Link, useLocation } from "wouter";
```

And rewrite `ConfirmationView` to use it cleanly:

```typescript
function ConfirmationView({ storeName, onClose }: ConfirmationViewProps) {
  const [, setLocation] = useLocation();

  return (
    <>
      <div className="bg-gradient-to-br from-[#0a2614] to-emerald-700 text-white px-4 py-4 text-center flex-shrink-0">
        <h2 className="font-bold text-base">Order Confirmed</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center text-center gap-4">
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/code/groceror-fe/GroceryCompanion (4)/GroceryCompanion"
npm run build 2>&1 | head -40
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/cart-drawer.tsx
git commit -m "feat: add confirmation state to CartDrawer"
```

---

### Task 6: Wire up — remove /cart route, update nav, mount CartDrawer

**Files:**
- Modify: `client/src/components/layout.tsx`
- Modify: `client/src/App.tsx`
- Delete: `client/src/pages/cart.tsx`

- [ ] **Step 1: Update `layout.tsx` — replace cart link with openCart button, mount CartDrawer**

Replace the entire `Layout` function in `client/src/components/layout.tsx` with the following. Key changes:
1. Import `CartDrawer` and `useCart`'s `openCart`/`closeCart`/`cartOpen`
2. Replace the cart `<Link href="/cart">` in the right-side nav with a `<button onClick={openCart}>`
3. Remove the mobile nav `<Link href="/cart">` (and replace with a button too)
4. Render `<CartDrawer>` inside the layout

```typescript
import { Link, useLocation } from "wouter";
import { ShoppingCart, Menu, User } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth-context";
import { ProfileSheet } from "@/components/profile-sheet";
import { CartDrawer } from "@/components/cart-drawer";
import { useState } from "react";

function navCls(href: string, current: string, mobile = false) {
  const active = current === href || current.startsWith(href + "/");
  const base = mobile
    ? "block px-3 py-2 rounded-md text-base font-medium transition-colors"
    : "px-3 py-1.5 rounded-md text-sm font-medium transition-colors";
  return active
    ? `${base} bg-emerald-50 text-emerald-800 font-semibold dark:bg-emerald-950/40 dark:text-emerald-300`
    : `${base} text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30`;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { state, cartOpen, openCart, closeCart } = useCart();
  const { user, openLogin, profileOpen, setProfileOpen } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [location] = useLocation();

  const totalItems = state.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* ---- left: hamburger + logo + nav ---- */}
          <div className="flex items-center gap-4">
            {/* mobile hamburger */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                {user?.entityType === "store" && (
                  <nav className="flex flex-col gap-1 mt-8">
                    <Link href="/products">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/products", location, true)}>
                        Products
                      </a>
                    </Link>
                    <Link href="/inventory">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/inventory", location, true)}>
                        Myventory
                      </a>
                    </Link>
                    <Link href="/store-orders">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/store-orders", location, true)}>
                        Orders
                      </a>
                    </Link>
                  </nav>
                )}
                {user?.entityType === "user" && (
                  <nav className="flex flex-col gap-1 mt-8">
                    <Link href="/stores">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/stores", location, true)}>
                        Browse
                      </a>
                    </Link>
                    <Link href="/search">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/search", location, true)}>
                        Search
                      </a>
                    </Link>
                    <Link href="/orders">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/orders", location, true)}>
                        Orders
                      </a>
                    </Link>
                    <button
                      onClick={() => { setDrawerOpen(false); openCart(); }}
                      className={navCls("/cart", location, true)}
                    >
                      Cart {totalItems > 0 && `(${totalItems})`}
                    </button>
                  </nav>
                )}

                <div className="absolute bottom-8 left-4 right-4">
                  {user ? (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => { setDrawerOpen(false); setProfileOpen(true); }}
                    >
                      <User className="h-4 w-4" />
                      My Profile
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => { setDrawerOpen(false); openLogin("login"); }}
                    >
                      Login
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* logo */}
            <Link href="/">
              <a href={user ? (user.entityType === "store" ? "/products" : "/stores") : "/"} className="text-xl font-bold tracking-tight">groceror</a>
            </Link>

            {/* desktop nav links — role-based */}
            {user?.entityType === "store" && (
              <nav className="hidden md:flex items-center gap-1 ml-2">
                <Link href="/products">
                  <a className={navCls("/products", location)}>Products</a>
                </Link>
                <Link href="/inventory">
                  <a className={navCls("/inventory", location)}>Myventory</a>
                </Link>
                <Link href="/store-orders">
                  <a className={navCls("/store-orders", location)}>Orders</a>
                </Link>
              </nav>
            )}
            {user?.entityType === "user" && (
              <nav className="hidden md:flex items-center gap-1 ml-2">
                <Link href="/stores">
                  <a className={navCls("/stores", location)}>Browse</a>
                </Link>
                <Link href="/search">
                  <a className={navCls("/search", location)}>Search</a>
                </Link>
                <Link href="/orders">
                  <a className={navCls("/orders", location)}>Orders</a>
                </Link>
              </nav>
            )}
          </div>

          {/* ---- right: auth + cart ---- */}
          <div className="flex items-center gap-2">
            {user ? (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setProfileOpen(true)}
                aria-label="Open profile"
              >
                <Menu className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => openLogin("login")}
              >
                <User className="h-4 w-4" />
                Login
              </Button>
            )}

            {/* cart icon — buyers only */}
            {user?.entityType === "user" && (
              <button className="relative" onClick={openCart} aria-label="Open cart">
                <Button variant="outline" size="icon" asChild>
                  <span>
                    <ShoppingCart className="h-5 w-5" />
                  </span>
                </Button>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center font-medium">
                    {totalItems}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className={location === "/" ? "" : "container mx-auto px-4 py-8"}>
        {children}
      </main>

      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
      <CartDrawer open={cartOpen} onClose={closeCart} />
    </div>
  );
}
```

- [ ] **Step 2: Remove `/cart` route from `App.tsx`**

In `client/src/App.tsx`, remove these two lines:
```typescript
import Cart from "@/pages/cart";
```
and
```typescript
<Route path="/cart">{() => <BuyerRoute component={Cart} />}</Route>
```

- [ ] **Step 3: Delete `pages/cart.tsx`**

```bash
rm "/code/groceror-fe/GroceryCompanion (4)/GroceryCompanion/client/src/pages/cart.tsx"
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "/code/groceror-fe/GroceryCompanion (4)/GroceryCompanion"
npm run build 2>&1 | head -40
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/layout.tsx client/src/App.tsx
git rm client/src/pages/cart.tsx
git commit -m "feat: wire up CartDrawer — remove /cart route, update nav cart icon"
```

---

## Verification checklist

After all tasks:

1. **Cart opens as drawer:** Click cart icon → Sheet slides in from the right showing cart items.
2. **Item stepper:** Minus disabled at qty=1, Plus disabled at stock limit.
3. **Clear all:** Ghost button in header wipes cart and shows empty state.
4. **Empty state:** "Browse stores" link visible when cart is empty.
5. **Checkout → Payment:** "Checkout →" button transitions to payment view.
6. **← Edit:** Returns to cart view, cart items unchanged.
7. **Card validation:** Each field shows inline error on blur; all fields must pass before order is placed.
8. **Place Order:** Spinner while submitting; transitions to confirmation on success; inline error on failure.
9. **Confirmation:** Bouncing checkmark, store name, "View my orders" navigates to `/orders` and closes; "Continue shopping" closes only.
10. **No `/cart` page:** Navigating to `/cart` hits `NotFound`.
11. **Backend response:** `POST /order/create-order` returns `{"id": "...", "status": "pending"}`.
