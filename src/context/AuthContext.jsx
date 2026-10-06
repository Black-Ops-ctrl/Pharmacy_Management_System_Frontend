import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { request, TOKEN_KEY, getToken } from '../config/api';
import { WARN_MS } from '../config/permissions';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const USER_KEY = 'pharma_user';

const readUser = () => {
  try { const raw = sessionStorage.getItem(USER_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
};
const store = (token, user) => {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token); else sessionStorage.removeItem(TOKEN_KEY);
    if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user)); else sessionStorage.removeItem(USER_KEY);
  } catch { }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => (getToken() ? readUser() : null));
  const [expiresAt, setExpiresAt] = useState(null);
  const [ready, setReady] = useState(() => !getToken());
  const [warnLeft, setWarnLeft] = useState(0);
  const tick = useRef(null);

  const clear = useCallback(() => {
    store(null, null); setUser(null); setExpiresAt(null); setWarnLeft(0);
  }, []);

  const refreshUser = useCallback(async () => {
    const j = await request('GET', '/auth/me');
    const u = { id: j.data.id, username: j.data.username, name: j.data.name, role: j.data.role, permissions: j.data.permissions || {} };
    setUser(u); store(getToken(), u);
    if (j.data.expires_at) setExpiresAt(new Date(j.data.expires_at).getTime());
    return u;
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    refreshUser().catch(() => clear()).finally(() => setReady(true));
  }, [refreshUser, clear]);

  useEffect(() => {
    const onActivity = (e) => { const t = new Date(e.detail).getTime(); if (t) setExpiresAt(t); };
    const onExpired = () => clear();
    window.addEventListener('auth:activity', onActivity);
    window.addEventListener('auth:expired', onExpired);
    return () => { window.removeEventListener('auth:activity', onActivity); window.removeEventListener('auth:expired', onExpired); };
  }, [clear]);

  const login = useCallback(async (username, password) => {
    try {
      const j = await request('POST', '/auth/login', { body: { username: String(username).trim(), password } });
      const u = j.data.user;
      store(j.data.token, u);
      setUser(u); setExpiresAt(new Date(j.data.expires_at).getTime()); setWarnLeft(0); setReady(true);
      return { ok: true, user: u };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  const logout = useCallback(async () => {
    if (getToken()) { try { await request('POST', '/auth/logout'); } catch { } }
    clear();
  }, [clear]);

  const extendSession = useCallback(async () => {
    try { await refreshUser(); setWarnLeft(0); } catch { clear(); }
  }, [refreshUser, clear]);

  useEffect(() => {
    if (!user || !expiresAt) { setWarnLeft(0); return undefined; }
    tick.current = setInterval(() => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) { clear(); }
      else if (remaining <= WARN_MS) { setWarnLeft(Math.ceil(remaining / 1000)); }
      else { setWarnLeft(0); }
    }, 1000);
    return () => clearInterval(tick.current);
  }, [user, expiresAt, clear]);

  const can = useCallback((pageKey, action = 'view') => {
    if (!user) return false;
    if (user.role === 'Super Admin') return true;
    const p = user.permissions && user.permissions[pageKey];
    return !!(p && p[action]);
  }, [user]);

  const value = {
    ready,
    isAuthed: !!user,
    user,
    login, logout, extendSession, refreshUser,
    warnLeft, warnSeconds: warnLeft,
    can,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
