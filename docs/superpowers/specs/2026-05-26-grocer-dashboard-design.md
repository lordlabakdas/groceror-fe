# Grocer Dashboard Design

**Goal:** Give grocers a dedicated `/dashboard` page that surfaces four operational widgets — low stock alerts, today's sales summary, expiring products, and top-selling items — refreshed automatically every 60 seconds.

**Architecture:** A single `GET /dashboard` backend endpoint aggregates all four widgets in one response. Two new tables (`InventoryExpiry`, `StockThreshold`) hold per-item metadata without touching the existing `Inventory` table. The frontend renders a KPI strip + 2×2 panel grid, polling the endpoint on a 60-second interval via React Query.

**Tech Stack:** FastAPI + SQLModel + PostgreSQL (backend), React 18 + TypeScript + TanStack React Query v5 + shadcn/ui + Tailwind CSS emerald theme (frontend).

---

## Backend

### New tables

#### `StockThreshold` (`models/entity/stock_threshold_entity.py`)

One row per inventory item. Unique constraint on `inventory_id`.

```python
class StockThreshold(SQLModel, table=True):
    __tablename__ = "stockthreshold"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    inventory_id: UUID = Field(foreign_key="inventory.id", unique=True, index=True)
    threshold: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

#### `InventoryExpiry` (`models/entity/inventory_expiry_entity.py`)

`inventory_id` is indexed but **not** unique — allows future batch-level tracking (multiple batches of the same SKU with different expiry dates). For now the UI creates one record per item.

```python
class InventoryExpiry(SQLModel, table=True):
    __tablename__ = "inventoryexpiry"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    inventory_id: UUID = Field(foreign_key="inventory.id", index=True)
    expiry_date: date
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

### New API endpoints (`api/inventory_api.py`)

#### `PUT /inventory/{id}/threshold`

Auth-required (store token). Upserts the `StockThreshold` row for the given inventory item. Item must belong to the grocer's store.

Request body: `{ "threshold": int }`
Response: `{ "status": "success" }`

#### `PUT /inventory/{id}/expiry`

Auth-required (store token). Upserts the most-recent `InventoryExpiry` row for the given inventory item (create if none exists, update `expiry_date` + `updated_at` on the newest row if one exists).

Request body: `{ "expiry_date": "YYYY-MM-DD" }`
Response: `{ "status": "success" }`

#### `GET /dashboard`

Auth-required (store token). Returns all four widgets in one response. Computation is done in Python application code after fetching relevant rows from the database.

**Response shape:**

```json
{
  "low_stock": [
    { "id": "uuid", "name": "Milk", "quantity": 2, "threshold": 5 }
  ],
  "todays_summary": {
    "order_count": 14,
    "revenue": 312.40,
    "orders": [
      { "id": "uuid", "total_price": 24.50, "status": "pending", "order_date": "2026-05-26T09:00:00" }
    ]
  },
  "expiring_soon": [
    { "id": "uuid", "name": "Yogurt", "quantity": 5, "expiry_date": "2026-05-28", "days_remaining": 2 }
  ],
  "top_sellers": [
    { "id": "uuid", "name": "Apples", "units_sold": 42, "revenue": 125.58 }
  ]
}
```

**Widget computation:**

- **Low stock:** Fetch all `StockThreshold` rows for the store's inventory items. Filter to items where `inventory.quantity <= threshold`. Return item name, current quantity, and threshold.
- **Today's summary:** Fetch all `Order` rows where `store_id` matches and `order_date >= today 00:00 UTC`. Sum `total_price` for revenue. Return the list sorted by `order_date` descending (most recent first, capped at 20).
- **Expiring soon:** Fetch all `InventoryExpiry` rows joined with `Inventory` where `store_id` matches and `expiry_date` is between today and today + 7 days (inclusive). Compute `days_remaining = (expiry_date - today).days`. Sort by `expiry_date` ascending.
- **Top sellers:** Fetch all `Order` rows for the store in the last 7 days. Flatten each order's `items` array (list of inventory UUIDs as strings). Count occurrences of each UUID. Join top-5 IDs with `Inventory` to get names and current prices. `revenue = units_sold × item.price` (current price approximation — no historical price storage).

### Pydantic validators (`api/validators/inventory_validation.py`)

New models:

```python
class SetThresholdPayload(BaseModel):
    threshold: int = Field(ge=0)

class SetExpiryPayload(BaseModel):
    expiry_date: date

class LowStockItem(BaseModel):
    id: UUID
    name: str
    quantity: int
    threshold: int

class TodaysOrder(BaseModel):
    id: UUID
    total_price: float
    status: str
    order_date: datetime

class TodaysSummary(BaseModel):
    order_count: int
    revenue: float
    orders: list[TodaysOrder]

class ExpiringItem(BaseModel):
    id: UUID
    name: str
    quantity: int
    expiry_date: date
    days_remaining: int

class TopSellerItem(BaseModel):
    id: UUID
    name: str
    units_sold: int
    revenue: float

class DashboardResponse(BaseModel):
    low_stock: list[LowStockItem]
    todays_summary: TodaysSummary
    expiring_soon: list[ExpiringItem]
    top_sellers: list[TopSellerItem]
```

---

## Frontend

### New page: `client/src/pages/dashboard.tsx`

Single React Query fetch:

```typescript
useQuery({
  queryKey: ["/dashboard"],
  refetchInterval: 60_000,
})
```

**Layout (matches chosen option B):**

```
┌─────────────────────────────────────────────────┐
│  KPI STRIP: [Low Stock N] [Orders N] [$Revenue] [Expiring N]  │
├──────────────────────┬──────────────────────────┤
│  ⚠ Low Stock         │  📦 Today's Orders        │
│  item list           │  order list + total       │
├──────────────────────┼──────────────────────────┤
│  📅 Expiring Soon    │  🏆 Top Sellers            │
│  item + days left    │  ranked list + revenue    │
└──────────────────────┴──────────────────────────┘
```

Each panel: white card, coloured left border, panel title, scrollable list. Empty state shown when a panel has no items (e.g. "No low stock items — all good!"). Skeleton loader shown on first load. Auto-refresh timestamp shown in the page header ("Last updated HH:MM").

### Nav update: `client/src/components/layout.tsx`

Add a "Dashboard" link for store entity type (`entityType === "store"`), using `LayoutDashboard` from lucide-react. Inserted between the logo and the Myventory link in both desktop nav and mobile drawer.

### Route: `client/src/App.tsx`

Add `<Route path="/dashboard"><GrocerRoute><Dashboard /></GrocerRoute></Route>`.

### Inventory form updates: `client/src/pages/inventory.tsx`

**`AddInventoryDialog`** — two new optional fields at the bottom of the form:
- `low_stock_threshold` — number input (`min={1}`), label "Alert me when below". If filled, calls `PUT /inventory/{id}/threshold` after item creation.
- `expiry_date` — date input, label "Expiry date". If filled, calls `PUT /inventory/{id}/expiry` after item creation.

**`EditQuantityDialog`** — adds `low_stock_threshold` field alongside the quantity input. Sends `PUT /inventory/{id}/threshold` as a separate mutation on save (only if the threshold field was changed).

**`EditExpiryDialog`** — new dialog (same pattern as `EditPriceDialog`): single date input, calls `PUT /inventory/{id}/expiry`. Triggered by a new calendar-icon button on `InventoryCard`.

**`InventoryCard` hover strip** — gains a fourth button. Final order: `pencil (quantity) | $ (price) | calendar (expiry) | trash (delete)`. Calendar button uses amber colour on hover (`hover:bg-amber-50`, `hover:text-amber-600`).

---

## Data flow

### Grocer sets a low stock threshold

1. Grocer opens `EditQuantityDialog`, sets threshold to 5, saves
2. `PUT /inventory/{id}/threshold` → `{ threshold: 5 }` → upserts `StockThreshold` row
3. Next dashboard refresh: item appears in Low Stock panel if `quantity ≤ 5`

### Grocer sets an expiry date

1. Grocer clicks calendar icon on inventory card → `EditExpiryDialog` opens
2. Grocer picks a date, clicks Save
3. `PUT /inventory/{id}/expiry` → `{ expiry_date: "2026-05-28" }` → upserts `InventoryExpiry` row
4. Next dashboard refresh: item appears in Expiring Soon panel if within 7 days

### Dashboard auto-refresh

1. React Query fires `GET /dashboard` every 60 seconds
2. Backend computes all four widgets fresh from DB
3. UI updates panels; "Last updated" timestamp advances

---

## Error handling

| Scenario | Behaviour |
|---|---|
| `GET /dashboard` fails | Stale data shown with error toast; retry on next interval |
| `PUT /inventory/{id}/threshold` fails | Toast error, dialog stays open |
| `PUT /inventory/{id}/expiry` fails | Toast error, dialog stays open |
| Item has no threshold set | Excluded from Low Stock panel (threshold is opt-in) |
| Item has no expiry set | Excluded from Expiring Soon panel |
| No orders today | `todays_summary` returns `{ order_count: 0, revenue: 0.0, orders: [] }` |
| Top sellers: item deleted from inventory | Excluded from results (JOIN filters it out) |

---

## Out of scope

- Historical price tracking for accurate top-seller revenue
- Multiple expiry batches per item in the UI (table supports it; UI exposes one)
- Push notifications for low stock or expiry
- Configurable refresh interval
- Date range selector for top sellers (fixed: last 7 days)
- Grocer-level dashboard across multiple stores
