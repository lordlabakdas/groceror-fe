# On-Demand Pricing Design

**Goal:** Let grocers update item prices instantly from the Myventory page, and ensure shoppers always see current prices when they open their cart.

**Architecture:** The `Inventory.price` field already exists in the database. This feature (1) makes the `PUT /inventory/{id}` endpoint accept partial updates so price and quantity can be changed independently, (2) splits the combined edit dialog in the Myventory UI into two focused dialogs, and (3) re-fetches current prices from the backend whenever the cart drawer opens.

**Tech Stack:** FastAPI + SQLModel (backend), React 18 + TypeScript + TanStack React Query v5 + shadcn/ui (frontend).

---

## Backend

### `api/validators/inventory_validation.py`

Make both fields in `UpdateInventoryPayload` optional:

```python
class UpdateInventoryPayload(BaseModel):
    quantity: Optional[int] = None
    price: Optional[float] = None
```

Existing callers that pass both fields continue to work unchanged. Callers that pass only one field are now valid.

### `api/helpers/inventory_helper.py`

Update `update_inventory_fields` to skip `None` values — only write fields that are explicitly provided:

```python
def update_inventory_fields(self, inventory_id, quantity=None, price=None):
    item = db_session.get(Inventory, inventory_id)
    if not item:
        raise ValueError(f"Inventory {inventory_id} not found")
    if quantity is not None:
        item.quantity = quantity
    if price is not None:
        item.price = price
    item.updated_at = datetime.utcnow()
    db_session.add(item)
    db_session.commit()
```

### `api/inventory_api.py`

No route changes needed. `PUT /inventory/{id}` continues to accept the same JSON body — the validator now simply allows either field to be omitted.

### No schema migration

`price` already exists on the `Inventory` table with a default of `0.0`. Nothing to migrate.

---

## Myventory UI — grocer side

All changes are in `client/src/pages/inventory.tsx`.

### Rename `EditInventoryDialog` → `EditQuantityDialog`

Remove the price field entirely. The dialog contains only the quantity input and its Save/Cancel buttons. The existing pencil button on `InventoryCard` continues to trigger this dialog.

### New `EditPriceDialog`

A price-only dialog triggered by the new dollar-sign button on `InventoryCard`:

- Pre-filled with the item's current price
- Single numeric input (`step={0.01}`, `min={0}`)
- "Update Price" button calls `PUT /inventory/{id}` with `{ price }` only (no quantity)
- On success: invalidates `["/inventory/get-store-inventory"]`, shows toast "Price updated", closes dialog
- On error: shows toast error, dialog stays open for retry

### `InventoryCard` — second action button

The hover action strip gains a dollar-sign icon button between the pencil and trash:

```
[pencil → quantity]  [$ → price]  [trash → delete]
```

All three buttons are visible on card hover (`opacity-0 group-hover:opacity-100`). The dollar button uses the same styling as the pencil button.

---

## Cart price re-fetch — shopper side

### `client/src/lib/cart.tsx`

Add `UPDATE_PRICES` to `CartAction`:

```typescript
| { type: "UPDATE_PRICES"; payload: { id: string; price: number }[] }
```

Reducer case — maps over items and applies matching price changes:

```typescript
case "UPDATE_PRICES": {
  const priceMap = Object.fromEntries(action.payload.map(p => [p.id, p.price]));
  return {
    items: state.items.map(i =>
      priceMap[i.id] !== undefined ? { ...i, price: priceMap[i.id] } : i
    ),
  };
}
```

### `client/src/components/cart-drawer.tsx`

Add a `useEffect` that fires when `open` becomes `true` and the cart is non-empty:

```typescript
useEffect(() => {
  if (!open || items.length === 0) return;
  const storeId = items[0].storeId;
  apiRequest("GET", `/inventory/browse/${storeId}`)
    .then((data: { inventory: { id: string; price: number }[] }) => {
      const priceMap = Object.fromEntries(data.inventory.map(i => [i.id, i.price]));
      const changed = items.filter(i => priceMap[i.id] !== undefined && priceMap[i.id] !== i.price);
      if (changed.length > 0) {
        dispatch({ type: "UPDATE_PRICES", payload: changed.map(i => ({ id: i.id, price: priceMap[i.id] })) });
        toast({ title: "Prices updated", description: "Some item prices have changed since you last shopped." });
      }
    })
    .catch(() => {
      // Non-critical — silently keep cached prices on network failure
    });
}, [open]);
```

The fetch completes before the shopper interacts with the cart (drawer opens, items render with fresh prices). No price flicker. If the fetch fails, the shopper's cached prices remain and nothing breaks.

---

## Data flow

### Grocer updates a price

1. Grocer clicks "$ Set price" on an inventory card
2. `EditPriceDialog` opens, pre-filled with current price
3. Grocer types new price, clicks "Update Price"
4. `PUT /inventory/{id}` → `{ price: newPrice }`
5. Backend writes `Inventory.price`, returns `{ status: "success" }`
6. React Query invalidates `["/inventory/get-store-inventory"]`
7. Card re-renders with new price

### Shopper opens cart after price change

1. Shopper taps cart icon → `CartDrawer` opens (`open = true`)
2. `useEffect` fires: `GET /inventory/browse/{storeId}`
3. Response compared against cart items
4. Changed prices dispatched as `UPDATE_PRICES`
5. Toast: "Prices updated" (only shown if something changed)
6. Shopper sees current prices; cart total is recalculated

---

## Error handling

| Scenario | Behaviour |
|---|---|
| Price update API fails | Toast error, `EditPriceDialog` stays open, grocer can retry |
| Cart price re-fetch fails | Silently ignored, shopper keeps cached prices |
| Grocer sets price to 0 | Allowed — grocer's intent, not validated by the app |
| Cart is empty when drawer opens | Re-fetch skipped entirely |
| Cart has items from multiple stores | Not possible — cross-store adds are blocked at `useAddToCart` level |

---

## Out of scope

- Price history / audit log
- Scheduled pricing (e.g. "apply this price from 5 PM")
- Shopper notification of price changes outside the cart
- Real-time websocket price push to open cart sessions
