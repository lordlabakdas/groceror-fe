# groceror-mobile Design Spec

## Summary

Build `groceror-mobile` — a standalone React Native app (Expo, cross-platform iOS + Android) that delivers the shopper experience: browse nearby stores, search products, manage a cart, place orders, and receive push notifications on order status. The existing FastAPI backend is reused with two minor additions. The web app continues running in parallel.

---

## Sub-Projects

This migration is split into three independently shippable sub-projects:

| # | Sub-project | Delivers |
|---|---|---|
| 1 | **Scaffold + Auth** | App launches, phone/OTP login works, JWT persisted securely |
| 2 | **Shopper Core** | Full browse → cart → checkout → order history flow |
| 3 | **Push Notifications** | Order status alerts delivered to device |

Each sub-project gets its own implementation plan and produces a working, testable increment.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 51+ (managed workflow) |
| Routing | Expo Router v3 (file-based) |
| Styling | NativeWind v4 (Tailwind utility classes on RN) |
| Data fetching | TanStack Query v5 |
| Auth storage | `expo-secure-store` (encrypted JWT on-device) |
| Cart persistence | `@react-native-async-storage/async-storage` |
| Maps | `react-native-maps` |
| Location | `expo-location` (store distance calculation, permission requested on StoresScreen) |
| Push | Expo Notifications + EAS Push |
| HTTP client | Same `apiRequest` wrapper as web app |
| Build / OTA | EAS Build + EAS Update |

**Color tokens:** NativeWind is configured with the same dark-green palette as the web app (`--primary` lime, `--background` forest green, `--card`, `--muted`, etc.) so both products share a visual identity.

---

## Repository

- **Name:** `groceror-mobile`
- **Type:** Standalone repo (not a monorepo)
- **Language:** TypeScript
- **Minimum OS:** iOS 16+, Android 8+ (API 26+)

---

## Navigation Structure

Bottom tab navigator with 5 tabs. Auth is a separate modal stack, presented over the tab navigator when the user is unauthenticated.

```
app/
├── (tabs)/
│   ├── _layout.tsx          ← Tab navigator (5 tabs)
│   ├── browse/
│   │   ├── index.tsx         ← StoresScreen (root)
│   │   └── [storeId].tsx     ← StoreBrowseScreen
│   ├── search/
│   │   └── index.tsx         ← SearchScreen
│   ├── cart/
│   │   ├── index.tsx         ← CartScreen
│   │   └── checkout.tsx      ← CheckoutScreen → OrderConfirmationScreen
│   ├── orders/
│   │   ├── index.tsx         ← OrdersScreen
│   │   └── [id].tsx          ← OrderDetailScreen
│   └── profile/
│       ├── index.tsx         ← ProfileScreen
│       └── edit.tsx          ← EditProfileScreen
├── (auth)/
│   ├── _layout.tsx           ← Modal stack
│   ├── phone.tsx             ← PhoneScreen
│   ├── otp.tsx               ← OTPScreen
│   └── register.tsx          ← RegisterScreen
└── _layout.tsx               ← Root layout (AuthProvider, CartProvider, QueryProvider)
```

---

## Screen Inventory

### Browse Tab
| Screen | Description |
|---|---|
| `StoresScreen` | Nearby stores list. Search bar filters by name. Each row shows store name, distance, open/closed badge. |
| `StoreBrowseScreen` | Products grid for a single store. Category filter chips at top. Inline "Add to cart" button on each product card. |
| `ProductDetailSheet` | Bottom sheet over StoreBrowseScreen. Product image, name, description, price, qty picker, "Add to cart" CTA. |

### Search Tab
| Screen | Description |
|---|---|
| `SearchScreen` | Full-text product search across all stores. Results show product name, store name, price. Tap to add to cart or open product detail. |

### Cart Tab
| Screen | Description |
|---|---|
| `CartScreen` | Items list with qty +/− controls, line-item prices, subtotal, "Proceed to Checkout" CTA. Empty state shows "Browse Stores" shortcut. Cart badge on tab icon shows item count. |
| `CheckoutScreen` | Delivery address fields, order summary, "Cash on Delivery" payment label (no in-app payment in v1). "Place Order" CTA. |
| `OrderConfirmationScreen` | Order placed confirmation. Order ID, store name, "View Order" link to OrderDetailScreen. |

### Orders Tab
| Screen | Description |
|---|---|
| `OrdersScreen` | Order history list. Status pills: Pending, Confirmed, Delivered. Pull-to-refresh. |
| `OrderDetailScreen` | Full order breakdown: items, quantities, prices, delivery address, status. |

### Profile Tab
| Screen | Description |
|---|---|
| `ProfileScreen` | Displays phone number, name. Links to EditProfile. Logout button. |
| `EditProfileScreen` | Edit name and delivery address. |

### Auth Stack (modal)
| Screen | Description |
|---|---|
| `PhoneScreen` | Phone number input with country prefix. "Send OTP" CTA. |
| `OTPScreen` | 6-digit OTP entry. Auto-advances to next digit. "Verify" CTA. Resend timer. |
| `RegisterScreen` | Name + password fields for new users only (existing users skip this). |

---

## Shared Layer

### API Client
Identical to the web app's `apiRequest` function. `BASE_URL` reads from `expo-constants` (set via `app.config.ts` extra field), replacing `import.meta.env.VITE_API_URL`. All existing API endpoints are reused unchanged.

### Auth Context
Direct port of `auth-context.tsx`. Interface unchanged: `user`, `login(token)`, `logout()`, `openLogin()`. JWT is stored in `expo-secure-store` instead of `localStorage`. Token expiry decoded client-side (same `decodeToken` logic).

### Cart Context
Direct port of `cart.tsx` (`useReducer` + `CartContext`). Persisted to `AsyncStorage` on every dispatch so cart survives app restarts and background kills.

### Push Token Registration
On successful login, the app calls `Expo.getExpoPushTokenAsync()` and POSTs the token to `PATCH /api/users/push-token`. The token is refreshed on each login. Tokens are per-device.

---

## Push Notifications

### In-app (groceror-mobile)
- `expo-notifications` handles foreground banners, background delivery, and notification tap handling.
- Tapping an order notification navigates to `OrderDetailScreen` for that order ID.
- Notification permissions are requested after first successful login (not on app launch).

### Backend changes (groceror FastAPI) — 3 additions only

1. **Schema:** Add `push_token: str | None` column to the users table.
2. **Endpoint:** `PATCH /api/users/push-token` — authenticated, stores token on the current user record.
3. **Dispatch:** In `orders_service.py`, after order creation and after order status update, fire a push via the EAS Push API (`https://exp.host/--/api/v2/push/send`) using `httpx.post`. Fire-and-forget — errors are logged, not raised, so push failures never block order operations.

### Notifications shipped in v1
| Trigger | Title | Body |
|---|---|---|
| Order created | "Order Confirmed" | "Your order from {store_name} is being prepared 🛒" |
| Order → Delivered | "Order Delivered" | "Your order has arrived ✅" |

---

## Out of Scope (v1)

- Store owner flow (products, inventory, dashboard) — web app serves this
- Real-time order tracking / live map
- In-app payments (Stripe, Razorpay) — cash on delivery assumed
- Dark/light theme toggle — dark only (matches web app)
- Offline mode beyond cart persistence
- Deep links / universal links
