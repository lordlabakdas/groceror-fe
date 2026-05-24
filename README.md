# groceror-fe

React frontend for [groceror](https://github.com/lordlabakdas/groceror) — a grocery store management platform. Store owners can browse a product catalog, manage their Myventory, and track cart activity. Buyers can browse and shop.

## Stack

| Layer | Tech |
|---|---|
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui (Radix primitives) |
| Routing | wouter |
| Data fetching | TanStack Query v5 |
| Dev server | Express + Vite (HMR) |
| Build | Vite → `dist/public` |

## Pages

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page — hero, features, login / register |
| `/products` | Auth required | Static product catalog — add items to your Myventory |
| `/inventory` | Auth required | Myventory — live stock with stats, edit, and delete |
| `/cart` | Auth required | Shopping cart with quantity controls |

Unauthenticated users who visit a protected route are redirected to `/`.

## Prerequisites

- Node.js 18+
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

> **Note:** The Vite root is `client/`, but `envDir` is overridden to the project root so `.env` is picked up correctly.

## Auth flow

Authentication is phone-based via groceror's OTP API:

1. Enter phone number → `POST /user/send-otp`
2. Enter 6-digit OTP → `POST /user/verify-otp`
3. Set password → `POST /user/register`
4. Auto-login → `POST /user/login` returns a JWT stored in `localStorage`

All subsequent API calls include `Authorization: Bearer <token>`.

The JWT payload includes `sub` (phone) and `entity_type` (`"user"` or `"store"`). The frontend decodes this client-side (no extra round-trip) to show the correct role in the navbar and conditionally render store-owner features.

## Navbar behaviour

| State | What you see |
|---|---|
| Logged out | Logo + **Login** button only |
| Logged in | Logo + Products + Myventory nav links + user chip + cart icon |

The user chip shows the last 4 digits of your phone number. Clicking it opens a dropdown with your full phone, role badge (Buyer / Store Owner), and a **Log out** option. Logging out clears the token and returns to `/`.

## Project structure

```
├── client/
│   ├── public/
│   │   └── logo.png              # Groceror brand logo
│   └── src/
│       ├── components/
│       │   ├── auth-dialog.tsx   # OTP + password registration/login dialog
│       │   ├── categories.tsx    # Category filter pills
│       │   ├── layout.tsx        # App shell — navbar, route-aware container
│       │   └── ui/               # shadcn/ui primitives
│       ├── lib/
│       │   ├── auth-context.tsx  # AuthProvider + useAuth hook (login/logout/openLogin)
│       │   ├── catalog.ts        # Static product catalog + image lookup
│       │   ├── cart.tsx          # Cart context + groceror cart API sync
│       │   └── queryClient.ts    # Fetch wrapper with JWT injection
│       ├── pages/
│       │   ├── home.tsx          # Public landing page
│       │   ├── products.tsx      # Product catalog (protected)
│       │   ├── inventory.tsx     # Myventory dashboard (protected)
│       │   └── cart.tsx          # Shopping cart (protected)
│       └── types/
│           └── models.ts         # Shared TypeScript types
├── server/                       # Thin Express server (dev proxy + static serving)
├── .env                          # Local env vars (not committed)
├── vite.config.ts
└── tailwind.config.ts
```

## Available scripts

```bash
npm run dev        # Start dev server on :5000
npm run build      # Production build → dist/
npm run start      # Serve production build
npm run check      # TypeScript type check
```

## Product images

Product images are loaded from [Unsplash](https://unsplash.com) via their free CDN. No images are stored in the database — the frontend maps product names and categories to Unsplash URLs at render time. The Unsplash License permits free commercial and non-commercial use without attribution.
