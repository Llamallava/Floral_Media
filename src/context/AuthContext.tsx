import { createContext, useContext, useEffect, useState } from 'react';
import * as AuthService from '../services/AuthService';
import type { User } from '../services/AuthService';

type AuthContextType = {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, displayName: string, password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = AuthService.subscribeToAuthChanges(user => {
      setCurrentUser(user);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  async function login(email: string, password: string) {
    const user = await AuthService.login(email, password);
    setCurrentUser(user);
  }

  async function logout() {
    await AuthService.logout();
    setCurrentUser(null);
  }

  async function register(email: string, displayName: string, password: string) {
    const user = await AuthService.register(email, displayName, password);
    setCurrentUser(user);
  }

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
