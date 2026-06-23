# Design Spec: Stores UI Polish (Option B — Split-Pane Explorer)

**Date:** 2026-06-22  
**Scope:** `client/src/pages/stores.tsx`, `client/src/pages/home.tsx`  
**Out of scope:** checkout, payments, backend changes

---

## Goals

- Make the stores listing page feel like a real grocery app (Instacart-level quality)
- Dark map tiles that match the app's dark theme
- Interactive split-pane: map + card panel with mutual hover highlighting
- Richer store cards with store-initial avatars and open/closed status
- Subtle animated landing page hero + a "How it works" strip

---

## 1. Stores Page — Layout

### Desktop (`md` and above)
Replace the current full-width map/list toggle layout with a fixed split-pane:

- **Left pane (55% width):** Map, fixed height to fill viewport below the navbar (`calc(100vh - 4rem)`), sticky
- **Right pane (45% width):** Scrollable card panel with search bar at the top and store cards below
- The map/list toggle buttons move into the right panel header so users can still switch to full-map or full-list if preferred

### Mobile (below `md`)
Keep the existing map/list toggle UX. Apply the upgraded card design in list view and dark tiles + custom markers in map view.

### Shared state
A `hoveredStoreId: string | null` state lives in the parent `Stores` component and is passed to both panes, enabling cross-pane highlighting.

---

## 2. Map Upgrades

### Tile layer
Switch from OpenStreetMap to **CartoDB Dark Matter**:
```
https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
```
Attribution: `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>`

No API key required.

### Custom markers
Replace the default Leaflet blue pin with a custom `L.divIcon`:
- Shape: circular dot (12px) with a subtle downward pointer (CSS triangle), drop shadow
- Default state: emerald (`#22c55e`) fill, white border
- Active/hovered state: larger (16px), brighter glow (`box-shadow: 0 0 12px rgba(34,197,94,0.8)`)
- Marker becomes active when `hoveredStoreId` matches the store's id

Marker active state is applied by passing a `activeStoreId` prop to the map; the map re-renders markers with the correct class when this changes.

### Popups
Style Leaflet popups to match the dark theme:
- Dark background (`hsl(var(--card))`), rounded corners, emerald accent on store name
- Content: store name, location, open/closed badge, "Browse store →" link
- Remove default Leaflet popup border/shadow, replace with custom CSS

---

## 3. Store Cards

### Visual structure (per card)
```
[ Avatar ] Store Name                    [Open]
           123 Main St, City
                                         Browse →
```

- **Avatar:** 40×40px circle, emerald-to-teal CSS gradient (`from-emerald-500 to-teal-400`), white bold initial letter of store name
- **Store name:** `font-semibold text-sm`, truncated
- **Location:** `text-xs text-muted-foreground` with `MapPin` icon
- **Open/closed badge:** `bg-emerald-500/20 text-emerald-400 border border-emerald-500/30` when open; `bg-muted text-muted-foreground` when closed
- **Browse arrow:** right-aligned `text-xs`, transitions to emerald on hover

### Hover interaction
- Card gets a left border (`border-l-2 border-emerald-500`) and a faint emerald `box-shadow` on hover
- `onMouseEnter` sets `hoveredStoreId` to this store's id; `onMouseLeave` clears it
- The map reads `hoveredStoreId` and applies the active marker style to the matching marker

### Click on map marker
- Sets `hoveredStoreId` to that store's id
- Scrolls the card panel to the matching card (`scrollIntoView({ behavior: 'smooth', block: 'nearest' })`)
- Briefly applies a highlight class (1.5s flash animation) to the card

---

## 4. Landing Page

### Floating emoji animation
Add a CSS `@keyframes float` animation that gently bobs each emoji up and down (±8px, 3–4s period). Each emoji gets a different `animation-delay` so they move out of phase — avoids the "marching in unison" look.

```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-8px); }
}
```

Each emoji span gets `animation: float 3.5s ease-in-out infinite` with a unique delay via inline style. The existing Tailwind `rotate-*` classes on the spans are kept as-is — the animation only adds the Y translation on top.

### "How it works" strip
Insert between the features section and the bottom CTA strip:

```
─────────────────────────────────────────────────────
  How Groceror works

  1. Browse Stores        2. Fill Your Cart       3. Place Your Order
  [Store icon]            [Cart icon]             [CheckCircle icon]
  Find stores near you    Add items as you go     One tap checkout
─────────────────────────────────────────────────────
```

- Background: slightly differentiated (`bg-muted/30` or a very subtle gradient) to break up the page
- Numbers: large emerald numerals (`text-5xl font-black text-primary/20`) behind the icon (decorative)
- Three columns on desktop, stacked on mobile
- No new data dependencies — purely static content

---

## Files Changed

| File | Change |
|------|--------|
| `client/src/pages/stores.tsx` | Split-pane layout, dark tiles, custom markers, card redesign, hover state wiring |
| `client/src/pages/home.tsx` | Float animation on emojis, "How it works" section |
| `client/src/index.css` (or inline styles) | `@keyframes float`, Leaflet popup dark-theme overrides |

---

## Non-Goals

- No new API calls or data fetching changes
- No distance/geolocation features
- No category filtering
- No changes to `/stores/:id` (store browse/product listing)
- No checkout or payment work
