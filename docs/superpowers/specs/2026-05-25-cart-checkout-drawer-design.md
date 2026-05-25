# Cart & Checkout Drawer Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the `/cart` page with a side drawer that handles the full cart → payment → confirmation flow without navigating away from the current page.

**Architecture:** A `CartDrawer` component manages three internal states (`cart`, `payment`, `confirmation`) as a state machine. It is rendered once at the app root (alongside the existing `ProfileSheet`), opened by a global `cartOpen` flag in `AuthContext` (or a new `CartContext` extension). The `/cart` route is removed; the nav cart icon dispatches `openCart()` instead of linking to `/cart`.

**Tech Stack:** React 18, TypeScript, shadcn/ui `Sheet`, TanStack React Query v5, existing `CartContext`/`CartItem` types, Tailwind CSS emerald theme.

---

## Components

### `CartDrawer` (`components/cart-drawer.tsx`)
The single entry point for the entire checkout experience. Renders a shadcn `Sheet` (side="right", w-96 on desktop, full-width on mobile).

**Internal state:**
```
type DrawerState = "cart" | "payment" | "confirmation"
```

Transitions:
- `cart` → `payment`: user taps "Checkout →"
- `payment` → `cart`: user taps "← Edit" or the back arrow in the header
- `payment` → `confirmation`: `POST /order/create-order` succeeds
- `confirmation` → closed: user taps "View my orders" (navigates to `/orders` and closes) or "Continue shopping" (closes only)

**Props:** `open: boolean`, `onClose: () => void`

---

### Header (inside `CartDrawer`)
- `cart` state: title "Your Cart", store name subtitle, close ✕ button
- `payment` state: ← back arrow + "Checkout" title + "Fresh Mart · Pickup" subtitle + close ✕
- `confirmation` state: centred "Order Confirmed" title, no close button (actions replace it)

---

### Cart state UI
- Item rows: 48×48 product thumbnail, name, unit price, quantity stepper (− / count / +, + disabled at `item.stock`), line subtotal
- Footer: item count + subtotal label, total price, green "Checkout →" button (disabled when cart is empty)
- "Clear all" ghost button top-right

---

### Payment state UI

**Collapsed cart summary strip** (top of form, always visible):
- Store name, item count, total
- "← Edit" pill — clicking transitions back to `cart` state

**Express payment buttons:**
- Black "⬛ Apple Pay" button — visual only, `onClick` is a no-op with a tooltip "Coming soon"
- White bordered "G Pay" button — same
- Divider: `— or pay by card —`

**Card form fields** (all required):
- Card number (full width, shows card-brand icon — Visa/MC/Amex detected by first digit)
- MM / YY and CVV side-by-side
- Name on card (full width)

**Validation:** all fields must be non-empty; card number must be 13–19 digits; expiry must be a future month; CVV must be 3–4 digits. Errors shown inline below each field on blur.

**CTA:** "Place Order — $X.XX" button — disabled while submitting, shows spinner during the API call.

---

### Confirmation state UI
- Animated green checkmark (scale-in on mount via Tailwind `animate-bounce` for one cycle)
- "You're all set!" heading
- Short order ID (first 8 chars of UUID, uppercased: `#A3F2B1C8`)
- Store name
- Info box: "Fresh Mart will confirm your order. Head to Orders to track its status."
- "View my orders" primary button → navigates to `/orders`, closes drawer
- "Continue shopping" text link → closes drawer only

---

## State management changes

### `CartContext` (`lib/cart.tsx`)
Add `cartOpen: boolean`, `openCart: () => void`, `closeCart: () => void` to `CartState`/`CartContext`. The nav cart icon and any "Add to cart" confirmation can call `openCart()` directly.

### Remove `/cart` route
- Delete `pages/cart.tsx`
- Remove `<Route path="/cart">` from `App.tsx`
- Remove cart `<Link href="/cart">` from `layout.tsx`; replace with `<button onClick={openCart}>`

---

## Data flow

**Checkout submission:**
```
POST /order/create-order
{
  items: string[],       // item UUID repeated × quantity
  total_price: number,
  status: "pending"
}
```
On success: dispatch `CLEAR_CART`, transition drawer to `confirmation`.
On error: show inline error below the "Place Order" button (do not close drawer).

**Simulated payment:** Any card input passes validation. No external API call. The `POST /order/create-order` call is the only network request.

---

## Integration points

| Touch point | Change |
|---|---|
| Nav cart icon (layout.tsx) | `onClick={openCart}` instead of `<Link href="/cart">` |
| `useAddToCart` (lib/cart.tsx) | Keep existing toast only — drawer does not auto-open when an item is added |
| `App.tsx` | Render `<CartDrawer>` at root alongside `<ProfileSheet>` |
| `/cart` BuyerRoute | Removed |
| Orders page (`/orders`) | No change — confirmation "View my orders" navigates there |

---

## Error handling

- **API failure on checkout:** Inline error message below the CTA button. Drawer stays open on payment screen. User can retry.
- **Empty cart:** "Checkout →" button disabled; cart state shows empty state with "Browse stores" link.
- **Cross-store cart:** Already blocked at `useAddToCart` level (existing behaviour — no change needed here).

---

## Out of scope

- Real payment processing (Stripe/Razorpay) — form is wired to `create-order` only; card fields are collected but not sent anywhere
- Delivery address
- Note to store
- Saved cards / wallet
- Order cancellation from confirmation screen
