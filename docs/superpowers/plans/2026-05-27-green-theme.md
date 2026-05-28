# Groceror Green Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retheme the entire Groceror frontend to an earthy dark-green palette (forest green backgrounds, lime accents, dark cards) without changing any logic or fonts.

**Architecture:** All shadcn/ui components consume CSS custom properties via `hsl(var(--name))` in the Tailwind config. Task 1 overrides those properties in `index.css`; this auto-themes everything using tokens. Tasks 2–13 fix the remaining hardcoded Tailwind classes (`emerald-*`, `bg-white/80`, light badge colours, etc.) that bypass the token system.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui, Vite, `@replit/vite-plugin-shadcn-theme-json`

---

## Dev server

```bash
cd "/code/groceror-fe/GroceryCompanion (4)/GroceryCompanion"
npm run dev
```

Visit `http://localhost:5173` (or the port Vite prints). **No automated tests exist for CSS — verification is visual after each task.** After each task, navigate to the relevant page in the browser and confirm it looks dark-green.

---

## File map

| File | Task |
|---|---|
| `client/src/index.css` | 1 |
| `theme.json` | 1 |
| `client/src/components/layout.tsx` | 2 |
| `client/src/components/auth-dialog.tsx` | 3 |
| `client/src/components/cart-drawer.tsx` | 4 |
| `client/src/pages/store-browse.tsx` | 5 |
| `client/src/pages/stores.tsx` | 6 |
| `client/src/pages/search.tsx` | 7 |
| `client/src/pages/orders.tsx` | 8 |
| `client/src/pages/dashboard.tsx` | 9 |
| `client/src/pages/inventory.tsx` | 10 |
| `client/src/pages/products.tsx` | 11 |
| `client/src/components/profile-sheet.tsx` | 12 |
| `client/src/pages/store-orders.tsx` | 13 |

---

## Task 1: CSS tokens + theme.json

**Files:**
- Modify: `client/src/index.css`
- Modify: `theme.json`

- [ ] **Step 1: Replace `index.css` with the dark-green token set**

The file currently only has `@tailwind` directives and a minimal `@layer base` block. Replace the entire file:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Dark-green palette — overrides @replit/vite-plugin-shadcn-theme-json */
:root {
  --background: 120 28% 14%;
  --foreground: 141 67% 93%;
  --card: 120 24% 23%;
  --card-foreground: 141 67% 93%;
  --popover: 120 24% 23%;
  --popover-foreground: 141 67% 93%;
  --primary: 142 69% 58%;
  --primary-foreground: 120 35% 9%;
  --secondary: 120 27% 33%;
  --secondary-foreground: 141 76% 73%;
  --muted: 120 26% 19%;
  --muted-foreground: 120 18% 52%;
  --accent: 120 27% 33%;
  --accent-foreground: 141 76% 73%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --border: 120 27% 33%;
  --input: 120 26% 19%;
  --ring: 142 69% 58%;
  --radius: 0.5rem;
  --chart-1: 142 69% 58%;
  --chart-2: 141 76% 73%;
  --chart-3: 120 27% 33%;
  --chart-4: 38 92% 50%;
  --chart-5: 0 84% 60%;
  --sidebar-background: 120 28% 14%;
  --sidebar-foreground: 141 67% 93%;
  --sidebar-primary: 142 69% 58%;
  --sidebar-primary-foreground: 120 35% 9%;
  --sidebar-accent: 120 27% 33%;
  --sidebar-accent-foreground: 141 76% 73%;
  --sidebar-border: 120 27% 33%;
  --sidebar-ring: 142 69% 58%;
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply font-sans antialiased bg-background text-foreground;
  }
}
```

- [ ] **Step 2: Update `theme.json`**

Replace the file contents:

```json
{
  "variant": "professional",
  "primary": "hsl(142 69% 58%)",
  "appearance": "dark",
  "radius": 0.5
}
```

- [ ] **Step 3: Verify**

Start the dev server (`npm run dev`), open `http://localhost:5173`. The page background should be dark forest green (`#1a2e1a`), text cream-white, and the nav/cards should look dark-themed. Navigate to `/stores` (after logging in) — store cards should be dark green.

- [ ] **Step 4: Commit**

```bash
cd "/code/groceror-fe/GroceryCompanion (4)/GroceryCompanion"
git add client/src/index.css theme.json
git commit -m "feat: add dark green CSS token palette"
```

---

## Task 2: Layout / nav

**Files:**
- Modify: `client/src/components/layout.tsx`

The nav currently uses `bg-background/95 backdrop-blur` (translucent) and `navCls` has explicit emerald classes. We want a solid seamless nav and use accent tokens for active states.

- [ ] **Step 1: Update the `navCls` function**

Find this block (lines 11–18):
```typescript
function navCls(href: string, current: string, mobile = false) {
  const active = current === href || current.startsWith(href + "/");
  const base = mobile
    ? "block px-3 py-2 rounded-md text-base font-medium transition-colors"
    : "px-3 py-1.5 rounded-md text-sm font-medium transition-colors";
  return active
    ? `${base} bg-emerald-50 text-emerald-800 font-semibold dark:bg-emerald-950/40 dark:text-emerald-300`
    : `${base} text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30`;
}
```

Replace with:
```typescript
function navCls(href: string, current: string, mobile = false) {
  const active = current === href || current.startsWith(href + "/");
  const base = mobile
    ? "block px-3 py-2 rounded-md text-base font-medium transition-colors"
    : "px-3 py-1.5 rounded-md text-sm font-medium transition-colors";
  return active
    ? `${base} bg-accent text-accent-foreground font-semibold`
    : `${base} text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground`;
}
```

- [ ] **Step 2: Update the header element**

Find:
```typescript
<header className="border-b sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
```

Replace with:
```typescript
<header className="border-b border-border sticky top-0 z-40 bg-background">
```

- [ ] **Step 3: Add logo colour**

Find the logo `<a>` tag:
```typescript
<a href={user ? (user.entityType === "store" ? "/products" : "/stores") : "/"} className="text-xl font-bold tracking-tight">groceror</a>
```

Replace with:
```typescript
<a href={user ? (user.entityType === "store" ? "/products" : "/stores") : "/"} className="text-xl font-bold tracking-tight text-primary">groceror</a>
```

- [ ] **Step 4: Verify**

Navigate around the app. The nav should be the same dark green as the page (seamless), the logo should be lime green, and the active nav pill should use the accent colour.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/layout.tsx
git commit -m "feat: apply green theme to nav"
```

---

## Task 2b: Shared ProductCard component

**Files:**
- Modify: `client/src/components/product-card.tsx`

This component has a hardcoded `text-green-600` for price display.

- [ ] **Step 1: Fix price colour**

Find:
```typescript
<span className="text-green-600 font-medium">${product.price}</span>
```
Replace with:
```typescript
<span className="text-primary font-medium">${product.price}</span>
```

- [ ] **Step 2: Verify no other hardcoded colours**

```bash
grep -n "green-\|emerald-\|bg-white" "/code/groceror-fe/GroceryCompanion (4)/GroceryCompanion/client/src/components/product-card.tsx"
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/product-card.tsx
git commit -m "feat: apply green theme to shared ProductCard"
```

---

## Task 3: Auth dialog

**Files:**
- Modify: `client/src/components/auth-dialog.tsx`

The auth dialog uses shadcn `Dialog`, `Input`, `Button`, `Label`, `RadioGroup` — all of which use CSS tokens and will auto-theme. The only hardcoded colour is in the entity-type tab switcher, which is built with plain `div`/`button` elements.

- [ ] **Step 1: Find and update any hardcoded tab/toggle classes**

Search the file for any occurrence of `emerald`, `green`, `white`, or `gray` class names (not variable names). The tab switcher that lets users pick "Shopper" / "Store Owner" role typically renders something like:

```typescript
className={`... ${entityType === "user" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
```

If the current code has any of the following patterns, replace them:

- `bg-emerald-*` → `bg-primary` (if active) or `bg-accent` (if highlight)
- `text-emerald-*` → `text-primary` or `text-accent-foreground`
- `bg-white` / `bg-gray-*` on tab elements → `bg-muted`
- `border-gray-*` → `border-border`

Run this search to find them:
```bash
grep -n "emerald\|bg-white\|bg-gray\|text-gray" "/code/groceror-fe/GroceryCompanion (4)/GroceryCompanion/client/src/components/auth-dialog.tsx"
```

- [ ] **Step 2: Verify**

Open the login dialog (click "Login" in the nav while logged out). The dialog background should be dark green (`bg-card`), inputs dark, and buttons lime. Try switching between Login/Register tabs.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/auth-dialog.tsx
git commit -m "feat: apply green theme to auth dialog"
```

---

## Task 4: Cart drawer

**Files:**
- Modify: `client/src/components/cart-drawer.tsx`

This file has the most hardcoded emerald classes. Three sub-views: `CartView`, `PaymentView`, `ConfirmationView`.

- [ ] **Step 1: Fix `CartView` header gradient**

Find:
```typescript
<div className="bg-gradient-to-br from-emerald-900 to-emerald-700 px-4 py-4 flex items-start justify-between shrink-0">
```

Replace with:
```typescript
<div className="bg-card border-b border-border px-4 py-4 flex items-start justify-between shrink-0">
```

- [ ] **Step 2: Fix `CartView` header button colours**

Find (the "Clear all" button):
```typescript
className="text-emerald-200 hover:text-white hover:bg-emerald-800/60 h-8 px-2 text-xs"
```
Replace with:
```typescript
className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 px-2 text-xs"
```

Find (the close button):
```typescript
className="text-emerald-200 hover:text-white hover:bg-emerald-800/60 h-8 w-8"
```
Replace with:
```typescript
className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8"
```

- [ ] **Step 3: Fix `CartView` total price and checkout button**

Find:
```typescript
<span className="font-semibold text-emerald-600 text-base">
```
Replace with:
```typescript
<span className="font-semibold text-primary text-base">
```

Find:
```typescript
<Button
  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
  onClick={onCheckout}
>
```
Replace with:
```typescript
<Button
  className="w-full"
  onClick={onCheckout}
>
```

- [ ] **Step 4: Fix `CartItemRow` subtotal colour**

Find:
```typescript
<span className="text-sm font-semibold text-emerald-600">${subtotal}</span>
```
Replace with:
```typescript
<span className="text-sm font-semibold text-primary">${subtotal}</span>
```

- [ ] **Step 5: Fix `PaymentView` header gradient**

Find:
```typescript
<div className="bg-gradient-to-br from-[#0a2614] to-emerald-700 px-4 py-4 flex items-start justify-between shrink-0">
```
Replace with:
```typescript
<div className="bg-card border-b border-border px-4 py-4 flex items-start justify-between shrink-0">
```

- [ ] **Step 6: Fix `PaymentView` header button colours**

Find (back arrow button):
```typescript
className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8"
```
Replace with:
```typescript
className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8"
```

Find (close button):
```typescript
className="h-8 w-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
```
Replace with:
```typescript
className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
```

- [ ] **Step 7: Fix `PaymentView` cart summary strip**

Find:
```typescript
<div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 flex items-center justify-between">
  <div>
    <p className="text-emerald-700 font-semibold text-sm">
```
Replace with:
```typescript
<div className="bg-muted border border-border rounded-lg px-3 py-2.5 flex items-center justify-between">
  <div>
    <p className="text-foreground font-semibold text-sm">
```

Find:
```typescript
    <p className="text-emerald-600 text-xs mt-0.5">
```
Replace with:
```typescript
    <p className="text-muted-foreground text-xs mt-0.5">
```

Find (the "← Edit" button):
```typescript
className="text-xs text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-full px-3 py-1 transition-colors"
```
Replace with:
```typescript
className="text-xs text-secondary-foreground bg-secondary hover:bg-secondary/80 border border-border rounded-full px-3 py-1 transition-colors"
```

- [ ] **Step 8: Fix `PaymentView` card input focus ring**

Find (the `inputCls` function):
```typescript
const inputCls = (field: keyof CardForm) =>
  `w-full border rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
    touched[field] && errors[field] ? "border-destructive" : "border-input"
  }`;
```
Replace with:
```typescript
const inputCls = (field: keyof CardForm) =>
  `w-full border rounded-lg px-3 py-2.5 text-sm outline-none transition-colors bg-input text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/60 focus:border-primary ${
    touched[field] && errors[field] ? "border-destructive" : "border-border"
  }`;
```

- [ ] **Step 9: Fix `PaymentView` Place Order button**

Find:
```typescript
<Button
  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
  disabled={submitting}
  onClick={handlePlaceOrder}
>
```
Replace with:
```typescript
<Button
  className="w-full"
  disabled={submitting}
  onClick={handlePlaceOrder}
>
```

- [ ] **Step 10: Fix `ConfirmationView`**

Find the header:
```typescript
<div className="bg-gradient-to-br from-[#0a2614] to-emerald-700 text-white px-4 py-4 text-center flex-shrink-0">
```
Replace with:
```typescript
<div className="bg-card border-b border-border text-foreground px-4 py-4 text-center flex-shrink-0">
```

Find the checkmark circle:
```typescript
<div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-300 flex items-center justify-center shadow-lg animate-bounce">
  <span className="text-3xl text-emerald-700">✓</span>
```
Replace with:
```typescript
<div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shadow-lg animate-bounce">
  <span className="text-3xl text-primary">✓</span>
```

Find the info box:
```typescript
<div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left">
  <p className="text-xs font-bold text-emerald-800 mb-1.5">What happens next</p>
```
Replace with:
```typescript
<div className="w-full bg-muted border border-border rounded-xl p-4 text-left">
  <p className="text-xs font-bold text-foreground mb-1.5">What happens next</p>
```

Find (store name span inside the info box):
```typescript
<span className="text-emerald-700 font-semibold">Orders</span>
```
Replace with:
```typescript
<span className="text-primary font-semibold">Orders</span>
```

Find the View Orders button:
```typescript
<Button
  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
```
Replace with:
```typescript
<Button
  className="w-full"
```

Find the "Continue shopping" link:
```typescript
<button
  className="text-sm text-emerald-700 font-semibold hover:underline"
```
Replace with:
```typescript
<button
  className="text-sm text-primary font-semibold hover:underline"
```

- [ ] **Step 11: Verify**

Log in as a shopper, browse a store, add items to cart, open the cart drawer. All three states (cart, payment form, confirmation) should be dark-themed with lime accents.

- [ ] **Step 12: Commit**

```bash
git add client/src/components/cart-drawer.tsx
git commit -m "feat: apply green theme to cart drawer"
```

---

## Task 5: Store browse page

**Files:**
- Modify: `client/src/pages/store-browse.tsx`

The inline `ProductCard` component (at the bottom of the file) has a category badge with `bg-white/80` and an out-of-stock overlay.

- [ ] **Step 1: Fix category badge**

Find:
```typescript
<Badge
  variant="secondary"
  className="absolute top-2 left-2 text-xs font-medium backdrop-blur-sm bg-white/80"
>
```
Replace with:
```typescript
<Badge
  variant="secondary"
  className="absolute top-2 left-2 text-xs font-medium backdrop-blur-sm bg-card/80"
>
```

- [ ] **Step 2: Fix "Added" button variant**

Find:
```typescript
variant={justAdded ? "secondary" : "default"}
```

No change needed — `secondary` and `default` both use CSS tokens and will look correct.

- [ ] **Step 3: Verify**

Browse to a store as a shopper. Product cards should be dark with readable category badges.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/store-browse.tsx
git commit -m "feat: apply green theme to store browse page"
```

---

## Task 6: Stores list

**Files:**
- Modify: `client/src/pages/stores.tsx`

The `StoreCard` component has hardcoded `bg-emerald-50`, `border-emerald-200`, and `text-emerald-600` for the store icon and badge.

- [ ] **Step 1: Fix the store icon background**

Find:
```typescript
<div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
  <Store className="h-5 w-5 text-emerald-600" />
```
Replace with:
```typescript
<div className="w-10 h-10 rounded-lg bg-secondary/50 border border-border flex items-center justify-center flex-shrink-0 group-hover:bg-secondary transition-colors">
  <Store className="h-5 w-5 text-secondary-foreground" />
```

- [ ] **Step 2: Fix the "Open/Closed" badge**

Find:
```typescript
<Badge
  variant="secondary"
  className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200"
>
```
Replace with:
```typescript
<Badge
  variant="secondary"
  className="text-xs bg-primary/15 text-primary border border-primary/25"
>
```

- [ ] **Step 3: Check for any view toggle button hardcoded colors**

Search for `emerald` in the file:
```bash
grep -n "emerald" "/code/groceror-fe/GroceryCompanion (4)/GroceryCompanion/client/src/pages/stores.tsx"
```

If any remain (e.g. on the Map/List view toggle buttons), update them:
- `bg-emerald-600 text-white` → `bg-primary text-primary-foreground`
- `text-emerald-700` → `text-primary`
- `border-emerald-400` → `border-primary`

- [ ] **Step 4: Verify**

Browse to `/stores`. Store cards should be dark. The store icon should use the dark secondary background. The "Open" badge should be lime-tinted.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/stores.tsx
git commit -m "feat: apply green theme to stores list"
```

---

## Task 7: Search page

**Files:**
- Modify: `client/src/pages/search.tsx`

The search page uses `bg-card`, `text-muted-foreground`, `hover:text-primary`, `Badge variant="secondary"`, `Button variant="outline"` — all token-based. The only hardcoded piece is the "Add" button in results which uses `variant="outline"` (fine). No changes needed unless `grep` reveals hardcoded colours.

- [ ] **Step 1: Verify no hardcoded colours remain**

```bash
grep -n "emerald\|bg-white\|bg-gray\|text-green" "/code/groceror-fe/GroceryCompanion (4)/GroceryCompanion/client/src/pages/search.tsx"
```

If any emerge, replace with token equivalents:
- `text-emerald-*` → `text-primary`
- `bg-emerald-*` → `bg-primary/15` or `bg-muted`

- [ ] **Step 2: Verify**

Use the search page as a logged-in shopper. Results should render with dark cards and lime prices.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/search.tsx
git commit -m "feat: verify green theme on search page"
```

---

## Task 8: Buyer orders page

**Files:**
- Modify: `client/src/pages/orders.tsx`

The `OrderRow` expanded area uses `bg-muted/20` which is token-based. The `statusVariant` function maps to shadcn `Badge` variants (`"default"`, `"secondary"`, `"destructive"`). These all use CSS tokens.

- [ ] **Step 1: Check for hardcoded colours**

```bash
grep -n "emerald\|bg-white\|text-green-\|text-gray-" "/code/groceror-fe/GroceryCompanion (4)/GroceryCompanion/client/src/pages/orders.tsx"
```

- [ ] **Step 2: Fix `bg-muted/40` hover on the expand button (if needed)**

The expand button uses `hover:bg-muted/40` which is token-based — no change needed.

- [ ] **Step 3: Fix the package icon background**

Find:
```typescript
<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
  <Package className="h-5 w-5 text-primary" />
```

This already uses token classes — no change needed.

- [ ] **Step 4: Verify**

Navigate to `/orders` as a logged-in shopper. Order cards should be dark, status badges readable.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/orders.tsx
git commit -m "feat: verify green theme on buyer orders page"
```

---

## Task 9: Dashboard page

**Files:**
- Modify: `client/src/pages/dashboard.tsx`

The `KpiCard` uses hardcoded light backgrounds. `STATUS_COLORS` maps use light `bg-*-100 text-*-800` classes. Revenue/seller values use hardcoded `text-emerald-*` and `text-purple-*`.

- [ ] **Step 1: Replace the `KpiCard` color classes**

Find the `KpiCard` function and its color map:
```typescript
const colorCls = {
  red: "border-red-200 bg-red-50 text-red-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
}[color];
```
Replace with:
```typescript
const colorCls = {
  red: "border-red-800/40 bg-red-900/20 text-red-400",
  green: "border-primary/30 bg-primary/10 text-primary",
  amber: "border-amber-700/40 bg-amber-900/20 text-amber-400",
}[color];
```

- [ ] **Step 2: Replace the `STATUS_COLORS` map**

Find:
```typescript
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  ready: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};
```
Replace with:
```typescript
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-900/30 text-amber-300 border-amber-700/40",
  confirmed: "bg-blue-900/30 text-blue-300 border-blue-700/40",
  ready: "bg-purple-900/30 text-purple-300 border-purple-700/40",
  delivered: "bg-primary/15 text-primary border-primary/25",
  cancelled: "bg-muted text-muted-foreground border-border",
};
```

- [ ] **Step 3: Fix revenue and top-seller hardcoded colours**

Find (today's orders revenue):
```typescript
<span className="font-semibold text-emerald-700">
  ${order.total_price.toFixed(2)}
```
Replace with:
```typescript
<span className="font-semibold text-primary">
  ${order.total_price.toFixed(2)}
```

Find (low stock hover link):
```typescript
<a className="font-medium hover:text-emerald-700 hover:underline underline-offset-2">
```
Replace with:
```typescript
<a className="font-medium hover:text-primary hover:underline underline-offset-2">
```

Find (top sellers revenue):
```typescript
<span className="font-semibold text-purple-700">
```
Replace with:
```typescript
<span className="font-semibold text-purple-400">
```

- [ ] **Step 4: Verify**

Navigate to `/dashboard` as a logged-in grocer. KPI cards should be dark-tinted (red/green/amber), panels dark, status badges dark-tinted.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/dashboard.tsx
git commit -m "feat: apply green theme to dashboard"
```

---

## Task 10: Inventory page (Myventory)

**Files:**
- Modify: `client/src/pages/inventory.tsx`

Three areas: `CATEGORY_COLOR` map, `stockStatus` function, action button hovers on `InventoryCard`.

- [ ] **Step 1: Replace `CATEGORY_COLOR` map**

Find:
```typescript
const CATEGORY_COLOR: Record<string, string> = {
  GROCERY: "bg-amber-100 text-amber-800",
  PRODUCE: "bg-green-100 text-green-800",
  MEAT: "bg-red-100 text-red-800",
  DAIRY: "bg-sky-100 text-sky-800",
  BAKERY: "bg-orange-100 text-orange-800",
  OTHER: "bg-purple-100 text-purple-800",
};
```
Replace with:
```typescript
const CATEGORY_COLOR: Record<string, string> = {
  GROCERY: "bg-amber-900/40 text-amber-300",
  PRODUCE: "bg-primary/15 text-primary",
  MEAT: "bg-red-900/40 text-red-300",
  DAIRY: "bg-sky-900/40 text-sky-300",
  BAKERY: "bg-orange-900/40 text-orange-300",
  OTHER: "bg-purple-900/40 text-purple-300",
};
```

- [ ] **Step 2: Replace `stockStatus` colour classes**

Find:
```typescript
function stockStatus(qty: number): { label: string; color: string } {
  if (qty === 0) return { label: "Out of Stock", color: "bg-red-100 text-red-700" };
  if (qty < 5) return { label: "Critical", color: "bg-red-100 text-red-700" };
  if (qty < 20) return { label: "Low Stock", color: "bg-amber-100 text-amber-700" };
  return { label: "In Stock", color: "bg-emerald-100 text-emerald-700" };
}
```
Replace with:
```typescript
function stockStatus(qty: number): { label: string; color: string } {
  if (qty === 0) return { label: "Out of Stock", color: "bg-red-900/30 text-red-400" };
  if (qty < 5) return { label: "Critical", color: "bg-red-900/30 text-red-400" };
  if (qty < 20) return { label: "Low Stock", color: "bg-amber-900/30 text-amber-400" };
  return { label: "In Stock", color: "bg-primary/15 text-primary" };
}
```

- [ ] **Step 3: Fix action button hovers in `InventoryCard`**

Find (edit/pencil button):
```typescript
className="bg-white/90 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-full p-1.5 shadow-sm"
```
Replace with:
```typescript
className="bg-card/90 hover:bg-blue-900/30 text-muted-foreground hover:text-blue-400 rounded-full p-1.5 shadow-sm"
```

Find (price/dollar button):
```typescript
className="bg-white/90 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 rounded-full p-1.5 shadow-sm"
```
Replace with:
```typescript
className="bg-card/90 hover:bg-primary/20 text-muted-foreground hover:text-primary rounded-full p-1.5 shadow-sm"
```

Find (expiry/calendar button):
```typescript
className="bg-white/90 hover:bg-amber-50 text-gray-400 hover:text-amber-600 rounded-full p-1.5 shadow-sm"
```
Replace with:
```typescript
className="bg-card/90 hover:bg-amber-900/30 text-muted-foreground hover:text-amber-400 rounded-full p-1.5 shadow-sm"
```

Find (delete/trash button):
```typescript
className="bg-white/90 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-full p-1.5 shadow-sm"
```
Replace with:
```typescript
className="bg-card/90 hover:bg-red-900/30 text-muted-foreground hover:text-red-400 rounded-full p-1.5 shadow-sm"
```

- [ ] **Step 4: Verify**

Navigate to `/inventory` as a logged-in grocer. Cards should be dark, category badges dark-tinted, stock status readable, action button hovers correct.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/inventory.tsx
git commit -m "feat: apply green theme to inventory page"
```

---

## Task 11: Products catalog page

**Files:**
- Modify: `client/src/pages/products.tsx`

Two areas: the "profile incomplete" warning banner and the `CatalogCard` category badge.

- [ ] **Step 1: Fix the profile incomplete banner**

Find:
```typescript
<div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-4 py-3">
  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
  <div className="flex-1 text-sm text-amber-800 dark:text-amber-300">
```
Replace with:
```typescript
<div className="flex items-start gap-3 rounded-xl border border-amber-700/40 bg-amber-900/20 px-4 py-3">
  <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
  <div className="flex-1 text-sm text-amber-300">
```

Find (the "Complete profile" button):
```typescript
className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex-shrink-0"
```
Replace with:
```typescript
className="text-xs font-semibold text-amber-400 hover:underline flex-shrink-0"
```

- [ ] **Step 2: Fix `CatalogCard` category badge**

Find:
```typescript
<Badge
  variant="secondary"
  className="absolute top-2 left-2 text-xs font-medium backdrop-blur-sm bg-white/80"
>
```
Replace with:
```typescript
<Badge
  variant="secondary"
  className="absolute top-2 left-2 text-xs font-medium backdrop-blur-sm bg-card/80"
>
```

- [ ] **Step 3: Verify**

Navigate to `/products` as a logged-in grocer with incomplete profile. Banner should be amber-tinted on dark background. Product catalog cards should look dark-themed.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/products.tsx
git commit -m "feat: apply green theme to products catalog page"
```

---

## Task 12: Profile sheet

**Files:**
- Modify: `client/src/components/profile-sheet.tsx`

The header gradient (`#0a2614 → #166534`) already matches our dark-green palette. The interior uses shadcn components (Input, Label, Button, Separator) which auto-theme. The only fix needed is ensuring `SheetContent` has `bg-card` so it contrasts with the page background, and the role badge is correct.

- [ ] **Step 1: Add `bg-card` to `SheetContent`**

Find:
```typescript
<SheetContent
  side="right"
  className="w-full sm:w-96 p-0 flex flex-col overflow-y-auto"
>
```
Replace with:
```typescript
<SheetContent
  side="right"
  className="w-full sm:w-96 p-0 flex flex-col overflow-y-auto bg-card"
>
```

- [ ] **Step 2: Verify role badge is readable**

The role badge currently has:
```typescript
<Badge className="bg-emerald-500/30 text-emerald-100 border border-emerald-400/30 hover:bg-emerald-500/30">
```

On the dark gradient header this already looks good (it's a translucent overlay on a dark background). Leave it as-is.

- [ ] **Step 3: Verify**

Open the profile sheet (click the hamburger icon when logged in). The sheet panel background should be the dark card green, content readable.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/profile-sheet.tsx
git commit -m "feat: apply green theme to profile sheet"
```

---

## Task 13: Store orders page

**Files:**
- Modify: `client/src/pages/store-orders.tsx`

Two areas: `STATUS_COLORS` map (same fix as dashboard) and filter tab active state.

- [ ] **Step 1: Replace `STATUS_COLORS` map**

Find:
```typescript
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  ready: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};
```
Replace with:
```typescript
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-900/30 text-amber-300 border-amber-700/40",
  confirmed: "bg-blue-900/30 text-blue-300 border-blue-700/40",
  ready: "bg-purple-900/30 text-purple-300 border-purple-700/40",
  delivered: "bg-primary/15 text-primary border-primary/25",
  cancelled: "bg-muted text-muted-foreground border-border",
};
```

- [ ] **Step 2: Fix filter tab active/inactive classes**

Find:
```typescript
className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
  filter === tab
    ? "bg-emerald-600 text-white border-emerald-600"
    : "bg-background text-muted-foreground border-border hover:border-emerald-400 hover:text-emerald-700"
}`}
```
Replace with:
```typescript
className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
  filter === tab
    ? "bg-primary text-primary-foreground border-primary"
    : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
}`}
```

- [ ] **Step 3: Fix `OrderCard` total price colour**

Find (in `OrderCard`):
```typescript
<span className="font-semibold text-base">${order.total_price.toFixed(2)}</span>
```

This uses `text-foreground` by inheritance — no change needed. But verify it's readable.

- [ ] **Step 4: Verify**

Navigate to `/store-orders` as a logged-in grocer. Filter tabs should use lime active state. Status badges should be dark-tinted. Order totals readable.

- [ ] **Step 5: Final full-app verification**

Walk through every page:
- `/` (home page) — dark hero, dark nav
- `/stores` (shopper) — dark store cards
- `/stores/:id` (shopper) — dark product cards
- `/search` (shopper) — dark result cards
- `/orders` (shopper) — dark order rows
- Cart drawer — dark, lime checkout button
- `/products` (grocer) — dark catalog cards
- `/inventory` (grocer) — dark inventory cards
- `/dashboard` (grocer) — dark KPI cards, dark panels
- `/store-orders` (grocer) — dark order cards, lime filter tabs
- Profile sheet — dark panel, dark profile fields
- Auth dialog — dark dialog, dark inputs

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/store-orders.tsx
git commit -m "feat: apply green theme to store orders page"
```
