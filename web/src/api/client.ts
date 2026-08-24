const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

// Chamado quando qualquer request volta 401 — token expirado/inválido.
// A AuthContext registra o handler real (logout) no início da sessão.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const resposta = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (resposta.status === 401 && onUnauthorized) {
    onUnauthorized();
  }

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => ({}));
    throw new ApiError(corpo.message ?? `Erro ${resposta.status}`, resposta.status);
  }

  // NestJS não serializa um corpo "null" pra handlers que retornam null (ex.:
  // busca sem resultado) — o corpo vem vazio (também o caso de 204), não a
  // string "null", e resposta.json() quebra em SyntaxError nesse caso.
  const texto = await resposta.text();
  if (!texto) {
    return null as T;
  }
  return JSON.parse(texto) as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { method: 'GET' }, token),
  post: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, token),
  patch: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, token),
};
