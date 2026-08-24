import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler } from '../api/client';
import type { LoginResponse, Usuario } from '../api/types';

const STORAGE_KEY = 'planicie.sessao';

interface Sessao {
  accessToken: string;
  usuario: Usuario;
}

interface AuthContextValue {
  sessao: Sessao | null;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function carregarSessao(): Sessao | null {
  const bruto = localStorage.getItem(STORAGE_KEY);
  if (!bruto) return null;
  try {
    return JSON.parse(bruto) as Sessao;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(() => carregarSessao());

  useEffect(() => {
    setUnauthorizedHandler(() => {
      localStorage.removeItem(STORAGE_KEY);
      setSessao(null);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      sessao,
      login: async (email: string, senha: string) => {
        const resposta = await api.post<LoginResponse>('/auth/login', { email, senha });
        const nova: Sessao = { accessToken: resposta.accessToken, usuario: resposta.usuario };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nova));
        setSessao(nova);
      },
      logout: () => {
        localStorage.removeItem(STORAGE_KEY);
        setSessao(null);
      },
    }),
    [sessao],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
