# groceror-fe

React frontend for [groceror](https://github.com/lordlabakdas/groceror) — a grocery store management platform. Store owners can browse a product catalog, manage their inventory, and track cart activity. Buyers can browse and shop.

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

| Route | Description |
|---|---|
| `/` | Landing page with login / register dialog |
| `/products` | Static product catalog — add items to your store inventory |
| `/inventory` | Your store's live inventory with stats, edit, and delete |
| `/cart` | Shopping cart with quantity controls and checkout |

## Prerequisites

- Node.js 18+
- A running [groceror](https://github.com/lordlabakdas/groceror) backend (default port `8000`)

## Getting started

```bash
# Install dependencies
npm install

# Configure the backend URL (copy and edit)
cp .env.example .env
# VITE_API_URL=http://localhost:8000

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

Authentication is phone-based via groceror's OTP API — no passwords are required at the OTP stage:

1. Enter phone number → `POST /user/send-otp`
2. Enter 6-digit OTP → `POST /user/verify-otp`
3. Set password → `POST /user/register`
4. Auto-login → `POST /user/login` returns a JWT stored in `localStorage`

All subsequent API calls include `Authorization: Bearer <token>`.

## Project structure

```
├── client/
│   └── src/
│       ├── components/       # Shared UI components
│       │   ├── auth-dialog.tsx
│       │   ├── categories.tsx
│       │   ├── layout.tsx
│       │   └── ui/           # shadcn/ui primitives
│       ├── lib/
│       │   ├── catalog.ts    # Static product catalog + image lookup
│       │   ├── cart.tsx      # Cart context + groceror cart API sync
│       │   └── queryClient.ts # Fetch wrapper with JWT injection
│       ├── pages/
│       │   ├── home.tsx
│       │   ├── products.tsx
│       │   ├── inventory.tsx
│       │   └── cart.tsx
│       └── types/
│           └── models.ts     # Shared TypeScript types
├── server/                   # Thin Express server (dev proxy + static serving)
├── .env                      # Local env vars (not committed)
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
