import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService.js';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; authService.getCurrentUser().then((current) => {
    if (active) { setUser(current); setLoading(false); }
  }); return () => { active = false; }; }, []);
  const login = useCallback(async (credentials) => { const session = await authService.login(credentials); setUser(session.user); return session; }, []);
  const loginGoogle = useCallback(async (credential) => { const session = await authService.loginGoogle(credential); setUser(session.user); return session; }, []);
  const cadastro = useCallback((payload) => authService.cadastro(payload), []);
  const logout = useCallback(async () => { try { await authService.logout(); } finally { setUser(null); } }, []);
  const value = useMemo(() => ({ cadastro, isAuthenticated: Boolean(user), loading, login, loginGoogle, logout, user }), [cadastro, loading, login, loginGoogle, logout, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}
