// ============================================================================
// frontend/src/context/AuthContext.tsx
// ----------------------------------------------------------------------------
// Phase 0 (May 2026):
//   - Removed hardcoded "http://localhost:3000" - now uses the shared http
//     client (lib/http.ts) which reads baseURL from apiBase.ts (env-driven).
//   - Listens for the "auth:unauthorized" window event dispatched by the
//     http 401 interceptor and clears local state. We deliberately do NOT
//     navigate from here; RequireAuth already redirects to /login when user
//     becomes null. logout() still does a hard /login navigation (unchanged).
//
//   Public API (user, loading, refreshUser, logout) is byte-identical, so no
//   consumer (RequireAuth, LogoutButton, AppShell, feature pages) needs to
//   change.
// ============================================================================

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { http } from "@/lib/http";

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  role: "AGENT" | "SUPERVISOR" | "ADMIN";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await http.get<User>("/auth/me");
      setUser(res.data);
      return res.data;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await http.post("/auth/logout", {});
    } catch {
      // Even if the server-side call fails (network error, expired token,
      // etc.) we still clear local state and force navigation. Logout must
      // never be blocked.
    }
    setUser(null);
    window.location.href = "/login";
  };

  useEffect(() => {
    refreshUser();

    // 401 from any http-instance call -> drop client session state.
    // No navigation here; RequireAuth handles redirects when user is null.
    const handleUnauthorized = () => {
      setUser(null);
      setLoading(false);
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
