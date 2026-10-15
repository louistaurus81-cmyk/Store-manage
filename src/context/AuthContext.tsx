import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types/datasoft';
import { apiFetch, setAuthToken, getAuthToken } from '../utils/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, passwordPlain: string) => Promise<void>;
  logout: () => void;
  switchRoleDemo: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getAuthToken() || null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    const savedToken = getAuthToken();
    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const me = await apiFetch<User>('/api/auth/me');
      setUser(me);
    } catch {
      // Token hết hạn hoặc không hợp lệ
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, passwordPlain: string) => {
    const res = await apiFetch<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password: passwordPlain }),
    });

    setAuthToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  };

  const logout = () => {
    setAuthToken('');
    setTokenState(null);
    setUser(null);
  };

  const switchRoleDemo = async (role: UserRole) => {
    const credentials: Record<UserRole, { u: string; p: string }> = {
      admin: { u: 'admin', p: 'admin123' },
      manager: { u: 'chu_shop', p: 'shop123' },
      sales: { u: 'ban_hang', p: 'sales123' },
      technician: { u: 'ky_thuat', p: 'tech123' },
    };
    const cred = credentials[role];
    await login(cred.u, cred.p);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchRoleDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
