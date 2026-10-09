import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Permission, Role } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (role: Role) => Promise<void>;
  hasPermission: (perm: Permission) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    try {
      const token = api.getToken();
      if (token) {
        const res = await api.getMe();
        setUser(res.user);
      } else {
        // Automatically sign in as default Admin for seamless review if no session
        const res = await api.switchDemoRole('admin');
        setUser(res.user);
      }
    } catch (e) {
      console.warn('Initial session check failed, switching to demo admin:', e);
      try {
        const res = await api.switchDemoRole('admin');
        setUser(res.user);
      } catch (err) {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    setUser(res.user);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const switchDemoRole = async (role: Role) => {
    setIsLoading(true);
    try {
      const res = await api.switchDemoRole(role);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch (e) {
      console.error('Failed refreshing user profile:', e);
    }
  };

  const hasPermission = (perm: Permission): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions.includes(perm);
  };

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        switchDemoRole,
        hasPermission,
        isAdmin,
        isManager,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
