import { createContext, useContext, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { getAuthToken, setAuthToken, clearAuthToken, queryClient } from "./queryClient";

export interface CurrentUser {
  phone: string;
  entityType: "user" | "store";
}

// Decode a JWT payload without verification (display only — server still verifies).
export function decodeToken(token: string): CurrentUser | null {
  try {
    const raw = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(raw));
    if (Date.now() / 1000 > (payload.exp ?? 0)) {
      clearAuthToken();
      return null;
    }
    return {
      phone: payload.sub,
      entityType: (payload.entity_type as "user" | "store") ?? "user",
    };
  } catch {
    return null;
  }
}

function initUser(): CurrentUser | null {
  const token = getAuthToken();
  return token ? decodeToken(token) : null;
}

interface AuthContextValue {
  user: CurrentUser | null;
  /** Call after a successful login with the JWT string. */
  login: (token: string) => void;
  logout: () => void;
  /** Open the auth dialog from anywhere in the app. */
  openLogin: (tab?: "login" | "register", entityType?: "user" | "store") => void;
  // Dialog state — consumed by AuthDialog via this context.
  dialogOpen: boolean;
  dialogTab: "login" | "register";
  dialogEntityType: "user" | "store";
  setDialogOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: () => {},
  logout: () => {},
  openLogin: () => {},
  dialogOpen: false,
  dialogTab: "login",
  dialogEntityType: "user",
  setDialogOpen: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(initUser);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<"login" | "register">("login");
  const [dialogEntityType, setDialogEntityType] = useState<"user" | "store">("user");
  const [, setLocation] = useLocation();

  const login = useCallback((token: string) => {
    setAuthToken(token);
    setUser(decodeToken(token));
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
    queryClient.clear();
    setLocation("/");
  }, [setLocation]);

  const openLogin = useCallback((tab: "login" | "register" = "login", entityType: "user" | "store" = "user") => {
    setDialogTab(tab);
    setDialogEntityType(entityType);
    setDialogOpen(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, login, logout, openLogin, dialogOpen, dialogTab, dialogEntityType, setDialogOpen }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
