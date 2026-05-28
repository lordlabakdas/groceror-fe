# groceror-mobile Sub-project 1: Scaffold + Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `groceror-mobile` Expo repo with bottom-tab navigation, secure JWT storage, API client, auth context, and a working phone/OTP/register login flow so a shopper can log in on iOS or Android.

**Architecture:** Standalone Expo (managed workflow) repo using Expo Router v3 for file-based navigation, NativeWind v4 for Tailwind utility classes, TanStack Query v5 for data fetching, and expo-secure-store for encrypted JWT storage. The same FastAPI backend (`groceror`) is reused with no changes. Auth follows two paths: existing users log in with phone + password; new users go through phone → OTP → register.

**Tech Stack:** Expo SDK 51, Expo Router v3, NativeWind v4, TanStack Query v5, expo-secure-store, TypeScript, jest-expo, @testing-library/react-native

---

## Task 1: Initialize repo and install dependencies

**Files:**
- Create: `package.json` (via create-expo-app)
- Create: `jest.config.js`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Create the Expo project**

```bash
npx create-expo-app@latest groceror-mobile --template blank-typescript
cd groceror-mobile
```

Expected: directory `groceror-mobile/` with `app.json`, `App.tsx`, `package.json`, `tsconfig.json`.

- [ ] **Step 2: Delete App.tsx — Expo Router takes over**

```bash
rm App.tsx
```

- [ ] **Step 3: Install production dependencies**

```bash
npx expo install \
  expo-router \
  expo-secure-store \
  expo-location \
  @react-native-async-storage/async-storage \
  @tanstack/react-query \
  nativewind \
  tailwindcss \
  react-native-maps \
  lucide-react-native \
  react-native-svg
```

- [ ] **Step 4: Install dev dependencies**

```bash
npm install --save-dev \
  jest \
  jest-expo \
  @testing-library/react-native \
  @types/jest
```

- [ ] **Step 5: Create jest.config.js**

```javascript
// jest.config.js
module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|nativewind|tailwindcss)",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
};
```

- [ ] **Step 6: Add test script to package.json**

Open `package.json` and add to the `"scripts"` section:

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 7: Create .env.example**

```bash
# .env.example
EXPO_PUBLIC_API_URL=http://localhost:8000
```

Copy it to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and set `EXPO_PUBLIC_API_URL` to the groceror backend URL (the ngrok URL for development, or your production URL).

- [ ] **Step 8: Create lib and __tests__ directories**

```bash
mkdir -p lib __tests__
```

- [ ] **Step 9: Initial commit**

```bash
git init
git add .
git commit -m "chore: init expo project with dependencies"
```

---

## Task 2: Configure NativeWind and color tokens

**Files:**
- Create: `tailwind.config.js`
- Create: `global.css`
- Create: `metro.config.js`
- Modify: `babel.config.js`
- Create: `nativewind-env.d.ts`

- [ ] **Step 1: Create tailwind.config.js with the dark-green palette**

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "hsl(120, 28%, 14%)",
        foreground: "hsl(141, 67%, 93%)",
        card: "hsl(120, 24%, 23%)",
        "card-foreground": "hsl(141, 67%, 93%)",
        primary: "hsl(142, 69%, 58%)",
        "primary-foreground": "hsl(120, 35%, 9%)",
        secondary: "hsl(120, 27%, 33%)",
        "secondary-foreground": "hsl(141, 76%, 73%)",
        muted: "hsl(120, 26%, 19%)",
        "muted-foreground": "hsl(120, 18%, 52%)",
        accent: "hsl(120, 27%, 33%)",
        "accent-foreground": "hsl(141, 76%, 73%)",
        border: "hsl(120, 27%, 33%)",
        input: "hsl(120, 26%, 19%)",
        ring: "hsl(142, 69%, 58%)",
        destructive: "hsl(0, 84%, 60%)",
        "destructive-foreground": "hsl(0, 0%, 98%)",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Create global.css**

```css
/* global.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Create metro.config.js**

```javascript
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: "./global.css" });
```

- [ ] **Step 4: Replace babel.config.js**

```javascript
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

- [ ] **Step 5: Create nativewind-env.d.ts**

```typescript
// nativewind-env.d.ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.js global.css metro.config.js babel.config.js nativewind-env.d.ts
git commit -m "chore: configure NativeWind with dark-green palette"
```

---

## Task 3: Expo app config

**Files:**
- Create: `app.config.ts` (replaces `app.json`)

- [ ] **Step 1: Delete app.json and create app.config.ts**

```bash
rm app.json
```

```typescript
// app.config.ts
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "groceror",
  slug: "groceror-mobile",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    backgroundColor: "#1a2e1a",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.groceror.mobile",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#1a2e1a",
    },
    package: "com.groceror.mobile",
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "groceror uses your location to show nearby stores.",
      },
    ],
  ],
  scheme: "groceror",
});
```

- [ ] **Step 2: Verify it parses**

```bash
npx expo config --type introspect 2>&1 | head -5
```

Expected: JSON output starting with `{`. No errors.

- [ ] **Step 3: Commit**

```bash
git add app.config.ts
git commit -m "chore: add Expo app config"
```

---

## Task 4: Token storage — lib/secure-store.ts

**Files:**
- Create: `lib/secure-store.ts`
- Create: `__tests__/secure-store.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/secure-store.test.ts
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import * as SecureStore from "expo-secure-store";
import { getAuthToken, setAuthToken, clearAuthToken } from "../lib/secure-store";

const TOKEN_KEY = "groceror_auth_token";

describe("secure-store token helpers", () => {
  beforeEach(() => jest.clearAllMocks());

  it("getAuthToken calls SecureStore.getItemAsync with correct key", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("test-token");
    const result = await getAuthToken();
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
    expect(result).toBe("test-token");
  });

  it("getAuthToken returns null when no token stored", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    expect(await getAuthToken()).toBeNull();
  });

  it("setAuthToken calls SecureStore.setItemAsync with key and value", async () => {
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    await setAuthToken("my-jwt");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(TOKEN_KEY, "my-jwt");
  });

  it("clearAuthToken calls SecureStore.deleteItemAsync with correct key", async () => {
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
    await clearAuthToken();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- __tests__/secure-store.test.ts
```

Expected: FAIL — `Cannot find module '../lib/secure-store'`

- [ ] **Step 3: Implement lib/secure-store.ts**

```typescript
// lib/secure-store.ts
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "groceror_auth_token";

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npm test -- __tests__/secure-store.test.ts
```

Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/secure-store.ts __tests__/secure-store.test.ts
git commit -m "feat: add secure token storage"
```

---

## Task 5: API client — lib/api.ts

**Files:**
- Create: `lib/api.ts`
- Create: `__tests__/api.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/api.test.ts
jest.mock("../lib/secure-store", () => ({
  getAuthToken: jest.fn().mockResolvedValue(null),
}));

jest.mock("expo-constants", () => ({
  default: {
    expoConfig: { extra: { apiUrl: "http://test.local" } },
  },
}));

import { apiRequest, queryFn } from "../lib/api";
import { getAuthToken } from "../lib/secure-store";

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("apiRequest", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sends request to BASE_URL + url", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => "",
    });
    await apiRequest("GET", "/health");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/health",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("includes Authorization header when token is present", async () => {
    (getAuthToken as jest.Mock).mockResolvedValue("bearer-token");
    mockFetch.mockResolvedValue({ ok: true, text: async () => "" });
    await apiRequest("GET", "/protected");
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["Authorization"]).toBe("Bearer bearer-token");
  });

  it("omits Authorization header when no token", async () => {
    (getAuthToken as jest.Mock).mockResolvedValue(null);
    mockFetch.mockResolvedValue({ ok: true, text: async () => "" });
    await apiRequest("GET", "/public");
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("sends JSON body for POST requests", async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => "" });
    await apiRequest("POST", "/user/login", { phone: "+1234" });
    const [, options] = mockFetch.mock.calls[0];
    expect(options.body).toBe('{"phone":"+1234"}');
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("throws an Error with status code on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => "Unauthorized",
    });
    await expect(apiRequest("GET", "/protected")).rejects.toThrow("401");
  });
});

describe("queryFn", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns parsed JSON on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "",
      json: async () => ({ data: "ok" }),
    });
    const result = await queryFn<{ data: string }>({ queryKey: ["/stores"] as const });
    expect(result).toEqual({ data: "ok" });
  });

  it("returns null on 401", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => "Unauthorized",
    });
    const result = await queryFn<null>({ queryKey: ["/protected"] as const });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- __tests__/api.test.ts
```

Expected: FAIL — `Cannot find module '../lib/api'`

- [ ] **Step 3: Implement lib/api.ts**

```typescript
// lib/api.ts
import Constants from "expo-constants";
import { getAuthToken } from "./secure-store";

const BASE_URL: string = Constants.expoConfig?.extra?.apiUrl ?? "";

async function authHeaders(
  extra?: Record<string, string>,
): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function throwIfResNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const res = await fetch(`${BASE_URL}${url}`, {
    method,
    headers: await authHeaders(
      data ? { "Content-Type": "application/json" } : undefined,
    ),
    body: data ? JSON.stringify(data) : undefined,
  });
  await throwIfResNotOk(res);
  return res;
}

export async function queryFn<T>({
  queryKey,
}: {
  queryKey: readonly unknown[];
}): Promise<T> {
  const url = queryKey[0] as string;
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: await authHeaders(),
  });
  if (res.status === 401) return null as T;
  await throwIfResNotOk(res);
  return res.json();
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npm test -- __tests__/api.test.ts
```

Expected: PASS — 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/api.ts __tests__/api.test.ts
git commit -m "feat: add API client"
```

---

## Task 6: Auth context — lib/auth-context.tsx

**Files:**
- Create: `lib/auth-context.tsx`
- Create: `__tests__/auth-context.test.ts`

- [ ] **Step 1: Write failing tests for decodeToken**

```typescript
// __tests__/auth-context.test.ts
import { decodeToken } from "../lib/auth-context";

function makeToken(
  payload: object,
  exp = Math.floor(Date.now() / 1000) + 3600,
): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify({ ...payload, exp }));
  return `${header}.${body}.fakesig`;
}

describe("decodeToken", () => {
  it("returns phone and entityType from valid token", () => {
    const token = makeToken({ sub: "+1234567890", entity_type: "user" });
    expect(decodeToken(token)).toEqual({
      phone: "+1234567890",
      entityType: "user",
    });
  });

  it("returns null for expired token", () => {
    const token = makeToken(
      { sub: "+1234567890", entity_type: "user" },
      Math.floor(Date.now() / 1000) - 1,
    );
    expect(decodeToken(token)).toBeNull();
  });

  it("returns null for malformed token string", () => {
    expect(decodeToken("not.a.jwt")).toBeNull();
  });

  it("defaults entityType to 'user' when field is missing", () => {
    const token = makeToken({ sub: "+1234567890" });
    expect(decodeToken(token)?.entityType).toBe("user");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- __tests__/auth-context.test.ts
```

Expected: FAIL — `Cannot find module '../lib/auth-context'`

- [ ] **Step 3: Implement lib/auth-context.tsx**

```typescript
// lib/auth-context.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { router } from "expo-router";
import { getAuthToken, setAuthToken, clearAuthToken } from "./secure-store";
import { queryClient } from "./query-client";

export interface CurrentUser {
  phone: string;
  entityType: "user" | "store";
}

export function decodeToken(token: string): CurrentUser | null {
  try {
    const raw = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(raw));
    if (Date.now() / 1000 > (payload.exp ?? 0)) return null;
    return {
      phone: payload.sub,
      entityType: (payload.entity_type as "user" | "store") ?? "user",
    };
  } catch {
    return null;
  }
}

interface AuthContextValue {
  user: CurrentUser | null;
  ready: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  openLogin: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getAuthToken().then((token) => {
      if (token) setUser(decodeToken(token));
      setReady(true);
    });
  }, []);

  const login = useCallback(async (token: string) => {
    await setAuthToken(token);
    setUser(decodeToken(token));
  }, []);

  const logout = useCallback(async () => {
    await clearAuthToken();
    queryClient.clear();
    setUser(null);
    router.replace("/(auth)/phone");
  }, []);

  const openLogin = useCallback(() => {
    router.push("/(auth)/phone");
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, logout, openLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npm test -- __tests__/auth-context.test.ts
```

Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/auth-context.tsx __tests__/auth-context.test.ts
git commit -m "feat: add auth context with decodeToken"
```

---

## Task 7: QueryClient — lib/query-client.ts

**Files:**
- Create: `lib/query-client.ts`

- [ ] **Step 1: Implement lib/query-client.ts**

```typescript
// lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";
import { queryFn } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryFn: queryFn as any,
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors (or only errors in files not yet created — check output manually).

- [ ] **Step 3: Commit**

```bash
git add lib/query-client.ts
git commit -m "feat: add TanStack QueryClient"
```

---

## Task 8: Root layout with providers and auth guard

**Files:**
- Create: `app/_layout.tsx`

- [ ] **Step 1: Create app/_layout.tsx**

```typescript
// app/_layout.tsx
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { queryClient } from "../lib/query-client";
import "../global.css";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) {
      router.replace("/(auth)/phone");
    } else if (user && inAuth) {
      router.replace("/(tabs)/browse");
    }
  }, [user, ready, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGuard>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthGuard>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "^$"
```

Expected: No new errors from `app/_layout.tsx`.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: add root layout with providers and auth guard"
```

---

## Task 9: Tab navigator and placeholder screens

**Files:**
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/browse/index.tsx`
- Create: `app/(tabs)/search/index.tsx`
- Create: `app/(tabs)/cart/index.tsx`
- Create: `app/(tabs)/orders/index.tsx`

- [ ] **Step 1: Create app/(tabs)/_layout.tsx**

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { ShoppingCart, Search, Store, ClipboardList, User } from "lucide-react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0f1f0f",
          borderTopColor: "#3d6b3d",
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: "#4ade80",
        tabBarInactiveTintColor: "#6b9e6b",
      }}
    >
      <Tabs.Screen
        name="browse"
        options={{
          title: "Browse",
          tabBarIcon: ({ color, size }) => (
            <Store size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => (
            <Search size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color, size }) => (
            <ShoppingCart size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => (
            <ClipboardList size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Create placeholder screens**

```typescript
// app/(tabs)/browse/index.tsx
import { View, Text } from "react-native";
export default function BrowseScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-muted-foreground">Browse — coming in Sub-project 2</Text>
    </View>
  );
}
```

```typescript
// app/(tabs)/search/index.tsx
import { View, Text } from "react-native";
export default function SearchScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-muted-foreground">Search — coming in Sub-project 2</Text>
    </View>
  );
}
```

```typescript
// app/(tabs)/cart/index.tsx
import { View, Text } from "react-native";
export default function CartScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-muted-foreground">Cart — coming in Sub-project 2</Text>
    </View>
  );
}
```

```typescript
// app/(tabs)/orders/index.tsx
import { View, Text } from "react-native";
export default function OrdersScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-muted-foreground">Orders — coming in Sub-project 2</Text>
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/
git commit -m "feat: add tab navigator with placeholder screens"
```

---

## Task 10: Auth modal stack

**Files:**
- Create: `app/(auth)/_layout.tsx`

- [ ] **Step 1: Create app/(auth)/_layout.tsx**

```typescript
// app/(auth)/_layout.tsx
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#1a2e1a" },
      }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(auth)/_layout.tsx
git commit -m "feat: add auth modal stack layout"
```

---

## Task 11: PhoneScreen — login with phone + password

**Files:**
- Create: `app/(auth)/phone.tsx`

Existing users log in here with phone + password. New users tap "New here? Register" to start the OTP registration flow.

- [ ] **Step 1: Create app/(auth)/phone.tsx**

```typescript
// app/(auth)/phone.tsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

export default function PhoneScreen() {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!phone.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest("POST", "/user/login", { phone, password });
      const data = await res.json();
      await login(data.access_token);
      router.replace("/(tabs)/browse");
    } catch (e: any) {
      setError("Invalid phone or password");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartRegister() {
    if (!phone.trim()) {
      setError("Enter your phone number first");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiRequest("POST", "/user/send-otp", { phone });
      router.push({ pathname: "/(auth)/otp", params: { phone } });
    } catch (e: any) {
      setError(e.message ?? "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-primary text-3xl font-bold mb-1">groceror</Text>
        <Text className="text-muted-foreground mb-8">
          Fresh groceries, delivered fast
        </Text>

        <TextInput
          className="bg-input border border-border text-foreground rounded-lg px-4 py-3 mb-3"
          placeholder="Phone number"
          placeholderTextColor="#6b9e6b"
          keyboardType="phone-pad"
          autoComplete="tel"
          value={phone}
          onChangeText={setPhone}
          autoFocus
        />
        <TextInput
          className="bg-input border border-border text-foreground rounded-lg px-4 py-3 mb-4"
          placeholder="Password"
          placeholderTextColor="#6b9e6b"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && (
          <Text className="text-destructive mb-4 text-sm">{error}</Text>
        )}

        <TouchableOpacity
          className="bg-primary rounded-lg py-3 items-center mb-3"
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0f1f0f" />
          ) : (
            <Text className="text-primary-foreground font-semibold text-base">
              Log In
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="border border-border rounded-lg py-3 items-center"
          onPress={handleStartRegister}
          disabled={loading}
        >
          <Text className="text-muted-foreground text-base">
            New here? Register
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(auth)/phone.tsx
git commit -m "feat: add PhoneScreen (login + start register)"
```

---

## Task 12: OTPScreen — verify OTP for new users

**Files:**
- Create: `app/(auth)/otp.tsx`

- [ ] **Step 1: Create app/(auth)/otp.tsx**

```typescript
// app/(auth)/otp.tsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { apiRequest } from "../../lib/api";

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    if (otp.length < 4) return;
    setLoading(true);
    setError(null);
    try {
      await apiRequest("POST", "/user/verify-otp", { phone, otp });
      router.push({ pathname: "/(auth)/register", params: { phone } });
    } catch (e: any) {
      setError("Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-foreground text-2xl font-bold mb-2">
          Enter OTP
        </Text>
        <Text className="text-muted-foreground mb-8">
          Sent to {phone}
        </Text>

        <TextInput
          className="bg-input border border-border text-foreground rounded-lg px-4 py-3 mb-4 text-center text-2xl tracking-[0.5em]"
          placeholder="------"
          placeholderTextColor="#3d6b3d"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
          autoFocus
        />

        {error && (
          <Text className="text-destructive mb-4 text-sm">{error}</Text>
        )}

        <TouchableOpacity
          className="bg-primary rounded-lg py-3 items-center mb-3"
          onPress={handleVerify}
          disabled={loading || otp.length < 4}
        >
          {loading ? (
            <ActivityIndicator color="#0f1f0f" />
          ) : (
            <Text className="text-primary-foreground font-semibold text-base">
              Verify
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity className="items-center" onPress={() => router.back()}>
          <Text className="text-muted-foreground">← Change number</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(auth)/otp.tsx
git commit -m "feat: add OTPScreen"
```

---

## Task 13: RegisterScreen — name + password for new users

**Files:**
- Create: `app/(auth)/register.tsx`

- [ ] **Step 1: Create app/(auth)/register.tsx**

```typescript
// app/(auth)/register.tsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

export default function RegisterScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (!name.trim() || !password || password !== confirm) {
      setError(
        password !== confirm ? "Passwords do not match" : "All fields required",
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiRequest("POST", "/user/register", {
        phone,
        name,
        password,
        entity_type: "user",
      });
      const loginRes = await apiRequest("POST", "/user/login", {
        phone,
        password,
      });
      const data = await loginRes.json();
      await login(data.access_token);
      router.replace("/(tabs)/browse");
    } catch (e: any) {
      setError(e.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        className="px-6"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-foreground text-2xl font-bold mb-2">
          Create account
        </Text>
        <Text className="text-muted-foreground mb-8">{phone}</Text>

        <TextInput
          className="bg-input border border-border text-foreground rounded-lg px-4 py-3 mb-3"
          placeholder="Your name"
          placeholderTextColor="#6b9e6b"
          autoComplete="name"
          value={name}
          onChangeText={setName}
          autoFocus
        />
        <TextInput
          className="bg-input border border-border text-foreground rounded-lg px-4 py-3 mb-3"
          placeholder="Password"
          placeholderTextColor="#6b9e6b"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          className="bg-input border border-border text-foreground rounded-lg px-4 py-3 mb-4"
          placeholder="Confirm password"
          placeholderTextColor="#6b9e6b"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />

        {error && (
          <Text className="text-destructive mb-4 text-sm">{error}</Text>
        )}

        <TouchableOpacity
          className="bg-primary rounded-lg py-3 items-center"
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0f1f0f" />
          ) : (
            <Text className="text-primary-foreground font-semibold text-base">
              Create Account
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(auth)/register.tsx
git commit -m "feat: add RegisterScreen"
```

---

## Task 14: ProfileScreen

**Files:**
- Create: `app/(tabs)/profile/index.tsx`

- [ ] **Step 1: Create app/(tabs)/profile/index.tsx**

```typescript
// app/(tabs)/profile/index.tsx
import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "../../../lib/auth-context";
import { LogOut } from "lucide-react-native";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <Text className="text-primary text-2xl font-bold mb-1">groceror</Text>
      <Text className="text-muted-foreground mb-8">Your account</Text>

      <View className="bg-card border border-border rounded-xl p-4 mb-4">
        <Text className="text-muted-foreground text-xs uppercase tracking-widest mb-1">
          Phone
        </Text>
        <Text className="text-foreground text-base font-semibold">
          {user.phone}
        </Text>
      </View>

      <View className="bg-card border border-border rounded-xl p-4 mb-8">
        <Text className="text-muted-foreground text-xs uppercase tracking-widest mb-1">
          Account type
        </Text>
        <Text className="text-foreground text-base font-semibold capitalize">
          {user.entityType}
        </Text>
      </View>

      <TouchableOpacity
        className="flex-row items-center justify-center border border-destructive/40 rounded-xl py-3 gap-2"
        onPress={logout}
      >
        <LogOut size={18} color="#dc2626" />
        <Text className="text-destructive font-semibold">Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: All tests pass (12 tests across 3 test files).

- [ ] **Step 3: Start the app and verify manually**

```bash
npx expo start
```

Open in Expo Go on your device or iOS/Android simulator. Verify:
- App opens to PhoneScreen (not logged in)
- Enter phone + wrong password → error message shown
- "New here? Register" → OTPScreen with phone pre-filled
- After OTP → RegisterScreen → after register → Browse tab visible
- Profile tab shows phone number and logout button
- Logout → back to PhoneScreen

- [ ] **Step 4: Final commit**

```bash
git add app/
git commit -m "feat: add ProfileScreen — sub-project 1 complete"
```

- [ ] **Step 5: Push to GitHub**

```bash
git remote add origin git@github.com:lordlabakdas/groceror-mobile.git
git push -u origin main
```

---

## Verification Checklist

After all tasks complete:

- [ ] `npm test` → all 12 tests pass
- [ ] `npx tsc --noEmit` → no TypeScript errors
- [ ] `npx expo start` → app boots without red screen
- [ ] Unauthenticated user → redirected to PhoneScreen automatically
- [ ] Login with valid phone + password → Browse tab shown
- [ ] Register flow (phone → OTP → name + password) → Browse tab shown
- [ ] Profile tab shows phone, logout works
- [ ] Logout → redirected to PhoneScreen
