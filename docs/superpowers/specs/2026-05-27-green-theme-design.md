# Groceror Green Theme Design Spec

## Summary

Replace the current white/light UI with a full dark-green theme — "Earthy & Rich". Every surface, component, and page is rethemed using a single cohesive palette of forest greens and lime accents. No new fonts, no new dependencies. The change is entirely CSS custom properties + Tailwind class updates.

---

## Design Decisions

| Decision | Choice |
|---|---|
| Theme direction | Earthy & Rich (dark forest green) |
| Typography | Current system sans-serif — no change |
| Home page | Keep as-is (no hero overhaul) |
| Nav treatment | Seamless dark — nav and page share the same background |

---

## Color Palette

All colors are defined as CSS custom properties in `client/src/index.css` and consumed via Tailwind's `hsl(var(--...))` tokens.

| Token | Hex | Role |
|---|---|---|
| `--background` | `#1a2e1a` | Page background and nav background (seamless) |
| `--card` | `#2d4a2d` | Card surfaces, dialogs, drawers |
| `--card-foreground` | `#dcfce7` | Primary text on cards |
| `--foreground` | `#dcfce7` | Primary body text |
| `--primary` | `#4ade80` | CTA buttons, active states, logo accent |
| `--primary-foreground` | `#0f1f0f` | Text on primary (lime) buttons |
| `--secondary` | `#3d6b3d` | Secondary surfaces, icon backgrounds |
| `--secondary-foreground` | `#86efac` | Text on secondary surfaces |
| `--muted` | `#243d24` | Depressed / input backgrounds |
| `--muted-foreground` | `#6b9e6b` | Secondary/helper text |
| `--accent` | `#3d6b3d` | Hover states, active nav pills |
| `--accent-foreground` | `#86efac` | Text on accent |
| `--border` | `#3d6b3d` | All borders |
| `--input` | `#243d24` | Input field backgrounds |
| `--ring` | `#4ade80` | Focus rings |
| `--destructive` | `#dc2626` | Delete / error states (unchanged) |
| `--destructive-foreground` | `#fef2f2` | Text on destructive (unchanged) |

Semantic extras (not Tailwind tokens, used as inline styles where needed):

| Name | Hex | Use |
|---|---|---|
| Warning amber | `#fbbf24` | Low-stock qty text, alert dots |
| Danger red | `#f87171` | Expiring-soon count on dashboard |
| Deep bg | `#0f1f0f` | Input inner bg, icon wells inside cards |

`theme.json` is updated to `appearance: "dark"` and `primary: "hsl(142 76% 61%)"` (lime-400).

---

## Component-by-Component Changes

### `client/src/index.css`
Replace the `:root` block with the dark-green palette above. No dark-mode media query needed — this is the single appearance.

### `theme.json`
- `appearance`: `"light"` → `"dark"`
- `primary`: `"hsl(142 76% 61%)"` (green-400, matches `#4ade80`)
- `variant`: keep `"professional"`
- `radius`: keep `0.5`

### `client/src/components/layout.tsx` (Nav / Header)
- `bg-background` already applies — will automatically pick up the dark token.
- Remove `bg-background/95 backdrop-blur` translucency — not needed when nav and page are the same color. Replace with solid `bg-background border-b border-border`.
- Logo (`groceror` text): add `text-primary` (lime).
- `navCls` active pill: `bg-accent text-accent-foreground font-semibold`.
- `navCls` inactive: `text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground`.
- Cart badge: already uses `bg-primary text-primary-foreground` — no change needed.
- Login button: `variant="outline"` will pick up dark border/text automatically.

### `client/src/pages/home.tsx`
No structural changes. The existing hero gradient (`#0a2614 → #14532d → #166534`) already fits the palette — keep it. The feature cards below the hero: replace `bg-white` / light classes with `bg-card border border-border text-card-foreground`.

### `client/src/components/auth-dialog.tsx`
- Dialog container: `bg-card border border-border`.
- Tab switcher: inactive tabs `text-muted-foreground`, active tab `text-primary bg-muted`.
- Input fields: `bg-input border-border text-foreground placeholder:text-muted-foreground`.
- Primary button: `bg-primary text-primary-foreground` (already via shadcn Button).
- "No account? Register" link: `text-primary`.

### `client/src/components/product-card.tsx`
- Card wrapper: `bg-card border border-border`.
- Icon well (category emoji background): `bg-secondary` (dark green).
- Item name: `text-card-foreground`.
- Category label: `text-muted-foreground uppercase text-xs tracking-wide`.
- Price: `text-primary font-bold`.
- "Add to cart" button: `bg-primary text-primary-foreground` (shadcn Button default).

### `client/src/pages/store-browse.tsx`
- Page title and subtitle: `text-foreground` / `text-muted-foreground`.
- Product grid: inherits product-card changes above.

### `client/src/pages/stores.tsx`
- Store cards: `bg-card border border-border hover:border-primary` transition.
- Store avatar well: `bg-secondary`.
- Store name: `text-card-foreground font-bold`.
- Location text: `text-muted-foreground`.
- "Open" badge: `bg-primary/15 text-primary border border-primary/25`.
- Search input: `bg-card border-border text-foreground placeholder:text-muted-foreground`.

### `client/src/pages/search.tsx`
- Search bar container: `bg-card border border-border`, focus `border-primary`.
- Result rows: `bg-card border border-border`.
- Result name: `text-foreground font-semibold`.
- Store name under result: `text-muted-foreground`.
- Price: `text-primary font-bold`.

### `client/src/pages/orders.tsx`
- Order cards: `bg-card border border-border`.
- Order ID: `text-muted-foreground text-xs tracking-wide`.
- Status pill "Confirmed": `bg-primary/15 text-primary border border-primary/25`.
- Status pill "Pending": `bg-border/50 text-muted-foreground border border-border`.
- Item summary: `text-muted-foreground`.
- Order total: `text-primary font-bold`.

### `client/src/components/cart-drawer.tsx`
- Drawer panel: `bg-card border-l border-border`.
- Cart item rows: `border-b border-border`.
- Item icon well: `bg-secondary`.
- Item name: `text-foreground font-semibold`.
- Price: `text-muted-foreground`.
- Qty +/− buttons: `bg-muted border border-border text-primary`.
- Total row: `text-primary font-bold`.
- "Place Order" button: `bg-primary text-primary-foreground` (shadcn Button).

### `client/src/pages/dashboard.tsx`
- Stat cards: `bg-card border border-border`.
- Stat label: `text-muted-foreground uppercase text-xs tracking-widest`.
- Revenue value: `text-primary font-black`.
- Low-stock count: `text-amber-400 font-black`.
- Expiring count: `text-red-400 font-black`.
- Alert rows: `bg-primary/10 border border-primary/20`.
- Alert dot (low stock): `bg-amber-400`.
- Alert dot (expiring): `bg-red-400`.

### `client/src/pages/inventory.tsx` (Myventory)
- Inventory rows: `bg-card border border-border`.
- Item icon well: `bg-secondary`.
- Item name: `text-foreground font-bold`.
- Qty (normal): `text-muted-foreground`.
- Qty (low stock): `text-amber-400` + ⚠ indicator.
- Price: `text-primary font-bold`.
- Edit button: `variant="outline"` (inherits dark border).
- Delete button: `variant="outline"` with `text-destructive border-destructive/40`.

### `client/src/components/profile-sheet.tsx`
- Sheet panel: `bg-card border-l border-border`.
- Labels: `text-muted-foreground`.
- Values: `text-foreground`.
- Logout button: `variant="outline"` with `text-destructive`.

### `client/src/pages/store-orders.tsx`
- Same pattern as `orders.tsx` above — order cards dark-themed, status pills with lime/muted treatment.

### `client/src/pages/products.tsx`
- Product list cards: same as inventory rows above.

---

## Files Changed

| File | Type |
|---|---|
| `client/src/index.css` | Edit — replace CSS custom properties |
| `theme.json` | Edit — appearance + primary |
| `client/src/components/layout.tsx` | Edit — nav classes |
| `client/src/pages/home.tsx` | Edit — feature card classes |
| `client/src/components/auth-dialog.tsx` | Edit — dialog, inputs, tabs |
| `client/src/components/product-card.tsx` | Edit — card classes |
| `client/src/pages/store-browse.tsx` | Edit — page title classes |
| `client/src/pages/stores.tsx` | Edit — store card + badge + search |
| `client/src/pages/search.tsx` | Edit — search bar + result rows |
| `client/src/pages/orders.tsx` | Edit — order cards + status pills |
| `client/src/components/cart-drawer.tsx` | Edit — drawer panel + items |
| `client/src/pages/dashboard.tsx` | Edit — stat cards + alerts |
| `client/src/pages/inventory.tsx` | Edit — inventory rows |
| `client/src/components/profile-sheet.tsx` | Edit — sheet panel |
| `client/src/pages/store-orders.tsx` | Edit — order cards |
| `client/src/pages/products.tsx` | Edit — product rows |

No new packages. No font changes. No structural/routing changes.

---

## Out of Scope

- Dark/light toggle (this is a single dark appearance)
- Font changes
- Home page hero redesign
- Any backend changes
