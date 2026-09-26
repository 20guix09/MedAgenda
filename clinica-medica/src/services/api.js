// comunicação deste recurso com a API


const DEFAULT_TIMEOUT = 12000;
const SESSION_TOKEN_KEY = 'medagenda_session_token';

export function getSessionToken() {
  try { return localStorage.getItem(SESSION_TOKEN_KEY); } catch { return null; }
}

export function setSessionToken(token) {
  try { localStorage.setItem(SESSION_TOKEN_KEY, token); } catch { /* armazenamento indisponível */ }
}

export function clearSessionToken() {
  try { localStorage.removeItem(SESSION_TOKEN_KEY); } catch { /* armazenamento indisponível */ }
}

export const API_CONFIG = {
  baseUrl: (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, ''),
  useMocks: import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true',
};

export class ApiError extends Error {
  constructor(message, { status = 500, data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// função para should use mocks
export function shouldUseMocks() {
  return API_CONFIG.useMocks;
}

// função para api request
export async function apiRequest(endpoint, options = {}) {
  const {
    body,
    headers = {},
    method = 'GET',
    signal,
    timeout = DEFAULT_TIMEOUT,
  } = options;

  if (!API_CONFIG.baseUrl) {
    throw new ApiError('VITE_API_URL não foi configurada.', { status: 0 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const requestSignal = signal ?? controller.signal;
  const sessionToken = getSessionToken();

  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
      method,
      credentials: 'include',
      signal: requestSignal,
      headers: {
        Accept: 'application/json',
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(sessionToken && !headers.Authorization ? { Authorization: `Bearer ${sessionToken}` } : {}),
        ...headers,
      },
      body: body instanceof FormData || body === undefined ? body : JSON.stringify(body),
    });

    const data = await parseResponse(response);

    if (!response.ok) {
      const message =
        data?.erro ??
        data?.mensagem ??
        data?.message ??
        (Array.isArray(data?.erros) ? data.erros.join(', ') : null) ??
        (typeof data === 'string' && data.trim() ? data : null) ??
        `Erro na requisição (${response.status}).`;

      throw new ApiError(message, {
        status: response.status,
        data,
      });
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError('A requisição demorou mais que o esperado.', { status: 408 });
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError('Não foi possível conectar ao servidor.', {
      status: 0,
      data: error,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

// função para parse response
async function parseResponse(response) {
  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return response.json();
  return response.text();
}
