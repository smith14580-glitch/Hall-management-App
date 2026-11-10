// Auth state: JWT tokens in localStorage, user profile from /auth/me.
// Roles come from the JWT/user record: super_admin (manager), staff, waiter.
// Staff and waiters never see financial pages — the sidebar hides them AND
// the backend enforces it (ARCHITECTURE.md §5.2). Hiding is UX only.

"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ApiError, clearSession, fetchMe, getStoredUser, login as apiLogin, saveSession, USE_SAMPLE_DATA } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<User>;
  logout: () => void;
  isManager: boolean;
  isStaff: boolean;
  isDemo: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {
    throw new Error("Auth not ready");
  },
  logout: () => undefined,
  isManager: false,
  isStaff: false,
  isDemo: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Lazy init from localStorage so no setState-in-effect is needed.
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [loading, setLoading] = useState<boolean>(() => getStoredUser() !== null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) return;
    if (USE_SAMPLE_DATA) {
      // Defer state update out of synchronous effect body to avoid
      // cascading renders (react-hooks/set-state-in-effect).
      const id = window.setTimeout(() => setLoading(false), 0);
      return () => window.clearTimeout(id);
    }
    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch((err: unknown) => {
        // Token invalid/expired — drop the session entirely so the user
        // is sent to /login instead of seeing API errors on every page.
        if (!cancelled && err instanceof ApiError && err.status === 401) {
          clearSession();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (phone: string, password: string): Promise<User> => {
    const res = await apiLogin(phone, password);
    saveSession(res.access_token, res.refresh_token, res.user);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    login,
    logout,
    isManager: user?.role === "super_admin",
    isStaff: user?.role === "staff" || user?.role === "waiter",
    isDemo: !loading && !user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
