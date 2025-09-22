import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'operator' | 'user';
}

export function useApiAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in by checking token
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data');
    
    if (token && userData) {
      // We have both token and user data
      console.log('Auth: Found token and user data, setting user');
      setUser(JSON.parse(userData));
      setLoading(false);
    } else if (token && !userData) {
      // We have token but no user data - validate token
      console.log('Auth: Found token but no user data, validating...');
      apiClient.getFiles()
        .then(() => {
          console.log('Auth: Token is valid but no user data found');
          // Token is valid but we don't have user data
          // This shouldn't happen in normal flow, but let's handle it
          // For now, we'll clear the token and let user login again
          apiClient.setToken(null);
          localStorage.removeItem('access_token');
          setLoading(false);
        })
        .catch(() => {
          console.log('Auth: Token is invalid, clearing...');
          // Token is invalid
          apiClient.setToken(null);
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_data');
          setLoading(false);
        });
    } else {
      // No token
      console.log('Auth: No token found');
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiClient.signIn(email, password);
      setUser(response.user);
      localStorage.setItem('user_data', JSON.stringify(response.user));
      // Não fazer reload - deixar o React gerenciar o estado
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
      setUser(null);
      localStorage.removeItem('user_data');
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