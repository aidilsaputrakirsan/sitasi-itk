'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  AuthState, 
  LoginCredentials,
  RegisterCredentials,
  ResetPasswordCredentials,
  UpdatePasswordCredentials,
  UserProfile
} from '../types/auth';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<{ error: Error | null }>;
  register: (credentials: RegisterCredentials) => Promise<{ error: Error | null, user: any | null }>;
  logout: () => Promise<void>;
  resetPassword: (credentials: ResetPasswordCredentials) => Promise<{ error: Error | null }>;
  updatePassword: (credentials: UpdatePasswordCredentials) => Promise<{ error: Error | null }>;
  getProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    error: null
  });
  const router = useRouter();

  useEffect(() => {
    // Check for active session on mount
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (session) {
          // Fetch the user profile
          const profile = await getProfile();
          setState({
            ...state,
            session,
            user: profile,
            isLoading: false
          });
        } else {
          setState({
            ...state,
            session: null,
            user: null,
            isLoading: false
          });
        }
      }
    );

    // Initial session check
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Fetch the user profile
        const profile = await getProfile();
        setState({
          ...state,
          session,
          user: profile,
          isLoading: false
        });
      } else {
        setState({
          ...state,
          isLoading: false
        });
      }
    };

    initializeAuth();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const getProfile = async (): Promise<UserProfile | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      // Get the user profile data
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return profile as UserProfile;
    } catch (error) {
      console.error('Error in getProfile:', error);
      return null;
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setState({ ...state, isLoading: true, error: null });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        setState({ ...state, error: error as unknown as Error, isLoading: false });
        return { error: error as unknown as Error };
      }

      const profile = await getProfile();
      setState({
        ...state,
        session: data.session,
        user: profile,
        isLoading: false,
        error: null
      });

      return { error: null };
    } catch (error) {
      setState({ ...state, error: error as Error, isLoading: false });
      return { error: error as Error };
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      setState({ ...state, isLoading: true, error: null });
      
      // Register user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            name: credentials.name,
            role: credentials.role,
            username: credentials.username || null
          }
        }
      });

      if (error) {
        setState({ ...state, error: error as unknown as Error, isLoading: false });
        return { error: error as unknown as Error, user: null };
      }

      // Create profile entry in profiles table
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              name: credentials.name,
              username: credentials.username || null,
              roles: [credentials.role]
            }
          ]);

        if (profileError) {
          setState({ ...state, error: profileError as unknown as Error, isLoading: false });
          return { error: profileError as unknown as Error, user: null };
        }

        // Create role-specific profile (mahasiswa/dosen/tendik)
        if (credentials.role === 'mahasiswa') {
          const { error: mahasiswaError } = await supabase
            .from('mahasiswas')
            .insert([
              {
                user_id: data.user.id,
                nama: credentials.name,
                nim: credentials.username || '',
                email: credentials.email
              }
            ]);

          if (mahasiswaError) {
            setState({ ...state, error: mahasiswaError as unknown as Error, isLoading: false });
            return { error: mahasiswaError as unknown as Error, user: null };
          }
        } else if (credentials.role === 'dosen') {
          const { error: dosenError } = await supabase
            .from('dosens')
            .insert([
              {
                user_id: data.user.id,
                nama_dosen: credentials.name,
                nip: credentials.username || '',
                email: credentials.email
              }
            ]);

          if (dosenError) {
            setState({ ...state, error: dosenError as unknown as Error, isLoading: false });
            return { error: dosenError as unknown as Error, user: null };
          }
        } else if (credentials.role === 'tendik') {
          const { error: tendikError } = await supabase
            .from('tendiks')
            .insert([
              {
                user_id: data.user.id,
                nama_tendik: credentials.name,
                nip: credentials.username || '',
                email: credentials.email
              }
            ]);

          if (tendikError) {
            setState({ ...state, error: tendikError as unknown as Error, isLoading: false });
            return { error: tendikError as unknown as Error, user: null };
          }
        }
      }

      // Get the user profile
      const profile = await getProfile();
      setState({
        ...state,
        session: data.session,
        user: profile,
        isLoading: false,
        error: null
      });

      return { error: null, user: data.user };
    } catch (error) {
      setState({ ...state, error: error as Error, isLoading: false });
      return { error: error as Error, user: null };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setState({
      ...state,
      session: null,
      user: null
    });
    router.push('/login');
  };

  const resetPassword = async (credentials: ResetPasswordCredentials) => {
    try {
      setState({ ...state, isLoading: true, error: null });
      
      const { error } = await supabase.auth.resetPasswordForEmail(
        credentials.email,
        {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
        }
      );

      setState({ ...state, isLoading: false, error: error as unknown as Error | null });
      return { error: error as unknown as Error | null };
    } catch (error) {
      setState({ ...state, error: error as Error, isLoading: false });
      return { error: error as Error };
    }
  };

  const updatePassword = async (credentials: UpdatePasswordCredentials) => {
    try {
      setState({ ...state, isLoading: true, error: null });
      
      const { error } = await supabase.auth.updateUser({
        password: credentials.password
      });

      setState({ ...state, isLoading: false, error: error as unknown as Error | null });
      return { error: error as unknown as Error | null };
    } catch (error) {
      setState({ ...state, error: error as Error, isLoading: false });
      return { error: error as Error };
    }
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    resetPassword,
    updatePassword,
    getProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;