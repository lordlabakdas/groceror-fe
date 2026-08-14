# groceror-fe

[![Netlify Status](https://api.netlify.com/api/v1/badges/40994b48-4f7f-4627-acb3-0773487df523/deploy-status)](https://app.netlify.com/projects/aesthetic-cascaron-d5c9c2/deploys)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![Capacitor](https://img.shields.io/badge/Capacitor-Android-119EFF)

React frontend for [groceror](https://github.com/lordlabakdas/groceror) — a platform connecting local grocery stores with the shoppers around them. Store owners manage inventory, pricing, coupons, and fulfillment; shoppers browse stores, build a cart, and check out.

See [ARCHITECTURE.md](ARCHITECTURE.md) for a system diagram.

**Live:** [groceror.store](https://groceror.store) · **Backend:** [groceror](https://github.com/lordlabakdas/groceror) ([groceror.fly.dev](https://groceror.fly.dev))

## Stack

| Layer | Tech |
|---|---|
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui (Radix primitives) |
| Routing | wouter |
| Data fetching | TanStack Query v5 |
| Dev server | Express + Vite (HMR) |
| Build | Vite → `dist/public` |
| Mobile | Capacitor (wraps this same build as a native Android app) |
| E2E tests | Playwright |

## Pages

Two roles share this app, gated by `entity_type` on the JWT — `StoreOwnerRoute` / `BuyerRoute` in `App.tsx` enforce the split and redirect otherwise.

| Route | Role | Description |
|---|---|---|
| `/` | Public | Landing page — hero, features, login / register |
| `/products` | Store owner | Static catalog — add items to your inventory |
| `/inventory` | Store owner | Live stock — stats, edit, delete, expiry, thresholds |
| `/dashboard` | Store owner | Today's orders, revenue trend, low stock, top sellers |
| `/store-orders` | Store owner | Manage and update the status of incoming orders |
| `/stock-alerts` | Store owner | Low-stock threshold alerts |
| `/flash-sales` | Store owner | Time-boxed discounts on specific inventory |
| `/bulk-rules` | Store owner | BXGF / bundle pricing rules |
| `/coupons` | Store owner | Create and manage discount codes |
| `/delivery-zone` | Store owner | Define the store's service-area geofence |
| `/stores` | Buyer | Browse all stores |
| `/stores/:id` | Buyer | Browse one store's inventory, add to cart |
| `/search` | Buyer | Global product search across stores |
| `/orders` | Buyer | Order history |
| `/loyalty` | Buyer | Points balance, rewards tier + progress, transaction history |
| `/wishlist` | Buyer | Saved items |
| `/scheduled-orders` | Buyer | Recurring orders |
| `/following` | Buyer | Followed stores |
| `/back-in-stock` | Buyer | Restock alert subscriptions |
| `/alerts` | Buyer | Price-drop alerts |
| `/disputes` | Any authenticated user | Order disputes |

Unauthenticated users who visit a protected route are redirected to `/`.

## Prerequisites

- Node.js 20+
- A running [groceror](https://github.com/lordlabakdas/groceror) backend (default port `8000`)

## Getting started

```bash
# Install dependencies
npm install

# Configure the backend URL
echo "VITE_API_URL=http://localhost:8000" > .env

# Start the dev server (frontend + Express proxy on :5000)
npm run dev
```

Open [http://localhost:5000](http://localhost:5000).

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `""` | Base URL for the groceror backend. Must be set for auth and data to work. |

Create a `.env` file in the project root (next to `vite.config.ts`):

```
VITE_API_URL=http://localhost:8000
```

> **Note:** The Vite root is `client/`, but `envDir` is overridden to the project root so `.env` is picked up correctly. In production, `VITE_API_URL` is set via the **Netlify dashboard**, not `netlify.toml` (which has no `[build.environment]` block) — env vars baked into a Vite build are compile-time, so this has to be set before/at build time on Netlify's side.

## Auth flow

Authentication is phone-based via groceror's OTP API:

1. Enter phone number → `POST /user/send-otp`
2. Enter 6-digit OTP → `POST /user/verify-otp`
3. Set password → `POST /user/register`
4. Auto-login → `POST /user/login` returns a JWT stored in `localStorage`

All subsequent API calls include `Authorization: Bearer <token>`.

The JWT payload includes `sub` (phone) and `entity_type` (`"user"` or `"store"`). The frontend decodes this client-side (no extra round-trip) to show the correct role in the navbar and conditionally render store-owner features.

## Testing

There's no unit test suite (`npm run check` is TypeScript's own verification). End-to-end coverage lives in `e2e/` via [Playwright](https://playwright.dev):

```bash
npm run test:e2e
```

`playwright.config.ts` spins up **two isolated servers** for the run — a frontend dev server and a backend instance (`scripts/run_e2e_server.py` in the `groceror` repo) pointed at a throwaway SQLite file, with Twilio disabled — so tests never touch the real production DB/SMS your `.env` points at. Since the real `/user/otp` debug endpoint was removed for security, `e2e/helpers/otp.ts` reads OTPs straight out of that SQLite file instead, mirroring how the backend's own pytest suite does it.

## Mobile (Capacitor)

`capacitor.config.ts` wraps this same Vite build (`dist/public`) as a native Android app — no separate codebase, no API changes; the WebView talks to `VITE_API_URL` exactly like the browser build does. The Express server in `server/` is dev/demo tooling only and isn't part of the mobile bundle.

```bash
npm run build:mobile   # vite build only (skips the Express server bundling step)
npm run cap:sync       # build:mobile + `cap sync` — refreshes android/ with the latest web build
npx cap open android   # opens the native project in Android Studio
```

Building/running the Android app requires Android Studio + the Android SDK locally. iOS (`npx cap add ios`) hasn't been scaffolded yet — it needs a Mac with Xcode + CocoaPods, which isn't available in every dev environment this project's been worked in.

For a from-scratch native experience instead of a wrapped WebView, see [groceror-mobile](https://github.com/lordlabakdas/groceror-mobile) — a separate Expo/React Native app hitting the same backend.

## Navbar behaviour

| State | What you see |
|---|---|
| Logged out | Logo + **Login** button only |
| Logged in | Logo + role-appropriate nav links + user chip + cart icon (buyers) |

The user chip shows the last 4 digits of your phone number. Clicking it opens a dropdown with your full phone, role badge (Buyer / Store Owner), and a **Log out** option. Logging out clears the token and returns to `/`.

## Project structure

```
├── client/
│   ├── public/
│   │   └── logo.png              # Groceror brand logo
│   └── src/
│       ├── components/
│       │   ├── auth-dialog.tsx     # OTP + password registration/login dialog
│       │   ├── cart-drawer.tsx     # Cart → payment → confirmation flow
│       │   ├── categories.tsx      # Category filter pills
│       │   ├── command-palette.tsx # Cmd-K quick navigation
│       │   ├── dashboard-charts.tsx
│       │   ├── inventory-csv.tsx   # Bulk inventory import/export
│       │   ├── layout.tsx          # App shell — navbar, route-aware container
│       │   ├── password-strength.tsx
│       │   ├── product-card.tsx
│       │   ├── profile-sheet.tsx
│       │   └── ui/                 # shadcn/ui primitives (~47 components)
│       ├── hooks/
│       │   ├── use-mobile.tsx
│       │   ├── use-order-alerts.ts
│       │   ├── use-sse.ts          # Server-Sent Events (live order notifications)
│       │   └── use-toast.ts
│       ├── lib/
│       │   ├── auth-context.tsx    # AuthProvider + useAuth hook (login/logout/openLogin)
│       │   ├── cart.tsx            # Cart context + reducer + localStorage + API sync
│       │   ├── catalog.ts          # Static product catalog + image lookup
│       │   ├── errors.ts
│       │   ├── queryClient.ts      # Fetch wrapper with JWT injection
│       │   └── utils.ts
│       ├── pages/                  # one file per route — see Pages table above
│       └── types/
│           └── models.ts           # Shared TypeScript types
├── e2e/                           # Playwright end-to-end tests
├── server/                        # Thin Express server (dev proxy + static serving) — not the production data source
├── android/                       # Capacitor native Android project
├── capacitor.config.ts
├── playwright.config.ts
├── .env                           # Local env vars (not committed)
├── vite.config.ts
└── tailwind.config.ts
```

## Available scripts

```bash
npm run dev           # Start dev server on :5000
npm run build         # Production build → dist/
npm run build:mobile  # Vite build only, for Capacitor
npm run start         # Serve production build
npm run check         # TypeScript type check
npm run test:e2e      # Playwright end-to-end tests
npm run cap:sync      # Rebuild + sync into the native Android project
```

## Product images

Product images are loaded from [Unsplash](https://unsplash.com) via their free CDN. No images are stored in the database — the frontend maps product names and categories to Unsplash URLs at render time. The Unsplash License permits free commercial and non-commercial use without attribution.
