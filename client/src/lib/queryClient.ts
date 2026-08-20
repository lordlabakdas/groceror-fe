import { MutationCache, QueryClient, QueryFunction } from "@tanstack/react-query";

import { toast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// JWT token helpers — groceror returns a Bearer token on login
// ---------------------------------------------------------------------------

const TOKEN_KEY = "groceror_auth_token";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAuthToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

// A store's subscription lock (SPEC_SUBSCRIPTION.md §3.3) — attached to
// the thrown Error so callers can distinguish it from a generic failure
// without parsing the message string.
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new ApiError(res.status, `${res.status}: ${text}`);
  }
}

// Base URL comes from VITE_API_URL env var (set to http://localhost:8000 for local dev).
// Falls back to same-origin so production deployments behind a proxy just work.
export const BASE_URL = import.meta.env.VITE_API_URL || "";

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const res = await fetch(`${BASE_URL}${url}`, {
    method,
    headers: authHeaders(data ? { "Content-Type": "application/json" } : undefined),
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

export const getQueryFn: <T>(options: {
  on401: "returnNull" | "throw";
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(`${BASE_URL}${queryKey[0]}`, {
      headers: authHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Global 402 handling — a store-owner mutation hitting a billing-locked
// store (§3.3). One touchpoint here covers every mutation on every page
// rather than adding an onError to each of coupons/bulk-rules/delivery-zone/
// flash-sales/inventory/stock-alerts individually.
function handleGlobalMutationError(error: unknown) {
  if (error instanceof ApiError && error.status === 402) {
    toast({
      title: "Payment required",
      description: "Your store's subscription payment is past due. Redirecting to Billing…",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/billing";
    }, 1500);
  }
}

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: handleGlobalMutationError,
  }),
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
