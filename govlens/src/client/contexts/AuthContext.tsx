import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getTenant } from "../api";
import type { Tenant } from "../types";

interface AuthState {
  apiKey: string | null;
  slug: string | null;
  tenant: Tenant | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (slug: string, apiKey: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "govlens_auth";

function loadStored(): { slug: string; apiKey: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.slug && parsed.apiKey) return parsed;
  } catch {}
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    apiKey: null,
    slug: null,
    tenant: null,
    loading: true,
  });

  // Validate stored credentials on mount
  useEffect(() => {
    const stored = loadStored();
    if (!stored) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    getTenant(stored.slug, stored.apiKey)
      .then((res) => {
        setState({
          apiKey: stored.apiKey,
          slug: stored.slug,
          tenant: res.data,
          loading: false,
        });
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        setState({ apiKey: null, slug: null, tenant: null, loading: false });
      });
  }, []);

  const login = useCallback((slug: string, apiKey: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ slug, apiKey }));
    // Fetch tenant to populate state
    getTenant(slug, apiKey)
      .then((res) => {
        setState({ apiKey, slug, tenant: res.data, loading: false });
      })
      .catch(() => {
        setState({ apiKey, slug, tenant: null, loading: false });
      });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ apiKey: null, slug: null, tenant: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
