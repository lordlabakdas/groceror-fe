# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Express + Vite HMR) on :5000
npm run build      # Production build: Vite → dist/public, esbuild server → dist/index.js
npm run start      # Serve the production build
npm run check      # TypeScript type-check (no tests exist)
npm run db:push    # Push Drizzle schema changes to the database
```

There is no test suite. `npm run check` is the only automated verification step.

## Environment

Create a `.env` in the project root:

```
VITE_API_URL=http://localhost:8000   # groceror backend base URL
DATABASE_URL=<postgres connection>   # only needed for db:push
```

`envDir` in `vite.config.ts` is set to the project root so Vite picks up `.env` even though its `root` is `client/`.

## Architecture

This is a **React SPA frontend** for the [groceror](https://github.com/lordlabakdas/groceror) backend. The Express server (`server/`) is a thin dev-time wrapper — it serves Vite HMR in development and static files in production. All real application data comes from the external groceror API at `VITE_API_URL`.

### Two-role system

Users have one of two `entityType` values decoded from their JWT:

- `"store"` — Store owners: access `/products`, `/inventory`, `/dashboard`, `/store-orders`
- `"user"` — Buyers: access `/stores`, `/stores/:id`, `/search`, `/orders`

Route guards in `App.tsx` (`StoreOwnerRoute`, `BuyerRoute`) enforce this via redirect. Auth state lives in `AuthContext` (`client/src/lib/auth-context.tsx`), which decodes the JWT client-side and exposes `user`, `login`, `logout`, and `openLogin`.

### API communication

`client/src/lib/queryClient.ts` is the central API layer:
- `apiRequest(method, url, data)` — wraps `fetch`, prepends `VITE_API_URL`, injects `Authorization: Bearer <token>` from `localStorage`
- `getQueryFn` — default TanStack Query fetcher, also auth-aware
- Token helpers: `getAuthToken` / `setAuthToken` / `clearAuthToken` (key: `groceror_auth_token`)

All pages use TanStack Query (`useQuery` / `useMutation`) for data fetching and cache management.

### Cart

`client/src/lib/cart.tsx` manages a client-side cart with a `useReducer`. The cart is persisted to `localStorage` and synced with the groceror cart API. Cart items carry `storeId` to enforce single-store checkout — adding items from a second store prompts a confirmation to clear the existing cart.

### Shared schema

`shared/schema.ts` contains Drizzle/Zod schemas for `products` and `cartItems` tables — used only by the local Express stub routes in `server/routes.ts`. These stub routes (`/api/products`, `/api/cart`) are **not** the production data source; production calls go to the external groceror backend.

### Path aliases

| Alias | Resolves to |
|---|---|
| `@/` | `client/src/` |
| `@shared/` | `shared/` |

### Key files

| File | Purpose |
|---|---|
| `client/src/App.tsx` | Route definitions and role-based route guards |
| `client/src/lib/auth-context.tsx` | Auth state, JWT decode, login/logout, dialog & profile sheet state |
| `client/src/lib/queryClient.ts` | Fetch wrapper, auth headers, TanStack Query setup |
| `client/src/lib/cart.tsx` | Cart context, reducer, localStorage persistence, API sync |
| `client/src/lib/catalog.ts` | Static product catalog and image lookup (Unsplash URLs) |
| `client/src/types/models.ts` | TypeScript interfaces for API shapes (`Product`, `GrocerorInventoryItem`, etc.) |
| `client/src/components/layout.tsx` | App shell: navbar with role-aware nav links, cart icon, profile sheet |
| `client/src/components/auth-dialog.tsx` | OTP-based phone auth flow (send OTP → verify → register/login) |
| `shared/schema.ts` | Drizzle table schemas + Zod insert schemas (stub only) |
| `server/routes.ts` | Local Express stub API (products + cart) — not used in production |

### UI components

All UI primitives are shadcn/ui components in `client/src/components/ui/`. The theme is defined in `theme.json` and driven by `@replit/vite-plugin-shadcn-theme-json`. Icons come from `lucide-react`.

### Groceror API endpoints (external backend)

Auth: `POST /user/send-otp`, `POST /user/verify-otp`, `POST /user/register`, `POST /user/login`

Inventory (store owners): `GET /inventory/get-store-inventory`, `POST /inventory/add-inventory`, `DELETE /inventory/delete-inventory`, `PATCH /inventory/:id`, `PATCH /inventory/:id/expiry`, `PATCH /inventory/:id/threshold`

Cart (buyers): `GET /cart/:storeId/items`, `POST /cart/:storeId/items`, `PATCH /cart/:storeId/items/:id`, `DELETE /cart/:storeId/items/:id`

Orders: `POST /order/create-order`, `GET /order/:id/status`
