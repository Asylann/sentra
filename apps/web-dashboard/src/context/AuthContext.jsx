import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// API base URL — hardcoded to localhost:8000 to bypass Vite proxy issues during dev
// Override with VITE_API_URL env var if you need to point to a different host
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('sentra_jwt'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate token and fetch user profile on mount / token change
  const fetchUser = useCallback(async (jwt) => {
    if (!jwt) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) {
        // Token is invalid or expired — clear it
        localStorage.removeItem('sentra_jwt');
        setToken(null);
        setUser(null);
      } else {
        const data = await res.json();
        setUser(data);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser(token);
  }, [token, fetchUser]);

  // Called by the /auth/callback page after extracting the JWT from the URL
  const saveToken = useCallback((jwt) => {
    localStorage.setItem('sentra_jwt', jwt);
    setToken(jwt);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sentra_jwt');
    setToken(null);
    setUser(null);
  }, []);

  // Convenience wrapper: automatically prepends API_BASE and injects the Bearer token.
  // Usage: const res = await fetchWithAuth('/api/v1/prs');
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  const fetchWithAuth = useCallback(async (path, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (tokenRef.current) {
      headers['Authorization'] = `Bearer ${tokenRef.current}`;
    }
    return fetch(`${API_BASE}${path}`, { ...options, headers });
  }, []);

  // Refresh user data (e.g., after installing the GitHub App)
  const refreshUser = useCallback(() => {
    fetchUser(token);
  }, [token, fetchUser]);

  const value = {
    token,
    user,
    loading,
    isAuthenticated: !!token && !!user,
    hasInstallation: !!user?.installation_id,
    apiBase: API_BASE,
    saveToken,
    logout,
    refreshUser,
    fetchWithAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
