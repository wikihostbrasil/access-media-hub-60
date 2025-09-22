import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'operator' | 'user';
}

// Singleton auth store so all hook consumers share the same state
let initialized = false;
let authUser: User | null = null;
let authLoading = true;
const listeners = new Set<(user: User | null, loading: boolean) => void>();

function notify() {
  for (const cb of listeners) cb(authUser, authLoading);
}

function decodeJwt(token: string): Partial<User> | null {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    const json = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    // Common claim shapes
    const data = json.data || json;
    const id = data.user_id || data.sub || data.id;
    const email = data.email || '';
    const role = (data.role as User['role']) || 'user';
    const full_name = data.full_name || email || 'Usuário';
    if (!id || !email) return null;
    return { id, email, role, full_name } as User;
  } catch {
    return null;
  }
}

function initAuthOnce() {
  if (initialized) return;
  initialized = true;

  const token = localStorage.getItem('access_token');
  const userData = localStorage.getItem('user_data');

  if (token && userData) {
    try {
      authUser = JSON.parse(userData);
    } catch {
      authUser = null;
    }
    authLoading = false;
    notify();
    return;
  }

  if (token && !userData) {
    // Derive user from JWT without extra network calls
    const partial = decodeJwt(token);
    if (partial) {
      authUser = partial as User;
      localStorage.setItem('user_data', JSON.stringify(authUser));
    }
    authLoading = false;
    notify();
    return;
  }

  // No token
  authUser = null;
  authLoading = false;
  notify();
}

export function useApiAuth() {
  const [user, setUser] = useState<User | null>(authUser);
  const [loading, setLoading] = useState<boolean>(authLoading);

  useEffect(() => {
    // Subscribe to global auth updates
    const handler = (u: User | null, l: boolean) => {
      setUser(u);
      setLoading(l);
    };
    listeners.add(handler);
    // Initialize once on first consumer mount
    initAuthOnce();
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiClient.signIn(email, password);
      // apiClient.signIn already persists the token
      authUser = response.user as User;
      localStorage.setItem('user_data', JSON.stringify(authUser));
      authLoading = false;
      notify();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      await apiClient.signUp(email, password, fullName);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await apiClient.signOut();
      authUser = null;
      localStorage.removeItem('user_data');
      authLoading = false;
      notify();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return {
    user,
    session: user ? { user } : null,
    loading,
    signIn,
    signUp,
    signOut,
  };
}
