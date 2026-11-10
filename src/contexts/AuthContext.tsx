import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User } from '@/types/question';
import { authLogin, authLogout, authRegister, fetchMe, api } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState(true);

  // Ao montar, revalida o token armazenado
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      fetchMe()
        .then((me) => setUser(me))
        .catch(() => {
          // token inválido ou expirado
          localStorage.removeItem('auth_token');
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authLogin(email, password);
    localStorage.setItem('auth_token', result.token);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, passwordConfirmation: string) => {
    const result = await authRegister(name, email, password, passwordConfirmation);
    localStorage.setItem('auth_token', result.token);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authLogout();
    } catch {
      // ignora erros de rede no logout
    }
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
