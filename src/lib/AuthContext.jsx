import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import auth from '@/api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,            setUser]            = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading,       setIsLoading]       = useState(true);

  const bootstrap = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);

    // ── Dev mock: set VITE_MOCK_AUTH=true in .env to skip backend ────────────
    if (import.meta.env.VITE_MOCK_AUTH === 'true') {
      setUser({
        id: 'mock-user-1',
        email: 'dev@apexium.com',
        full_name: 'Dev User',
        username: 'devuser',
        role: 'user',
        xp_total: 500,
        average_pi_score: 75,
        total_jobs_completed: 3,
        top_categories: ['development', 'design'],
      });
      setIsAuthenticated(true);
      if (!silent) setIsLoading(false);
      return;
    }

    if (!auth.hasToken()) { if (!silent) setIsLoading(false); return; }
    try {
      const me = await auth.me();
      setUser(me);
      setIsAuthenticated(true);
    } catch (_) {
      // Token invalid, user deleted, or backend unavailable — force logout
      auth.clearToken();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const login = useCallback(async (email, password) => {
    const { user: me } = await auth.login(email, password);
    setUser(me);
    setIsAuthenticated(true);
    return me;
  }, []);

  const logout = useCallback(async () => {
    await auth.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const updateProfile = useCallback(async (fields) => {
    const updated = await auth.updateMe(fields);
    setUser(updated);
    return updated;
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, updateProfile, refetch: () => bootstrap(true) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
