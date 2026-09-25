import { apiRequest, shouldUseMocks } from './api.js';
import { ENDPOINTS } from './endpoints.js';
import { mockAuthService } from '../mocks/mockAuthService.js';

let mockSession = null;
export const authService = {
  async login(credentials) {
    if (shouldUseMocks()) {
      mockSession = await mockAuthService.login(credentials);
      return { user: mockSession.user };
    }
    const data = await apiRequest(ENDPOINTS.auth.login, { method: 'POST', body: credentials, auth: false });
    return { user: data.usuario };
  },
  async loginGoogle(credential) {
    const data = await apiRequest(ENDPOINTS.auth.google, { method: 'POST', body: { credential }, auth: false });
    return { user: data.usuario, novoUsuario: Boolean(data.novoUsuario) };
  },
  cadastro(payload) {
    return shouldUseMocks() ? mockAuthService.cadastro(payload) : apiRequest(ENDPOINTS.auth.cadastro, {
      method: 'POST', body: { nome: payload.nome, email: payload.email, senha: payload.senha }, auth: false,
    });
  },
  async logout() {
    if (shouldUseMocks()) { mockSession = null; return; }
    await apiRequest('/auth/logout', { method: 'POST' });
  },
  async getCurrentUser() {
    if (shouldUseMocks()) return mockSession?.user ?? null;
    try { return (await apiRequest('/auth/me')).usuario; } catch { return null; }
  },
};
