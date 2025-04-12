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
        console.log("Auth state change:", event, session ? "Session exists" : "No session");
        
        if (session) {
          // Fetch the user profile
          const profile = await getProfile();
          console.log("Profile fetched on auth change:", profile);
          
          setState(prevState => ({
            ...prevState,
            session,
            user: profile,
            isLoading: false
          }));
        } else {
          setState(prevState => ({
            ...prevState,
            session: null,
            user: null,
            isLoading: false
          }));
        }
      }
    );

    // Initial session check
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Fetch the user profile
        const profile = await getProfile();
        setState(prevState => ({
          ...prevState,
          session,
          user: profile,
          isLoading: false
        }));
      } else {
        setState(prevState => ({
          ...prevState,
          isLoading: false
        }));
      }
    };

    initializeAuth();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Update the getProfile function in contexts/AuthContext.tsx

    const getProfile = async (): Promise<UserProfile | null> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return null;

        // Fetch profile directly
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          // If the profile doesn't exist yet, we'll create it
          if (profileError.code === 'PGRST116') {
            const userMetadata = user.user_metadata;
            const role = userMetadata?.role || 'mahasiswa';
            const roles = Array.isArray(role) ? role : [role];
            
            // Create the profile record
            const { data: newProfile, error: insertError } = await supabase
              .from('profiles')
              .insert([
                {
                  id: user.id,
                  name: userMetadata?.name || user.email?.split('@')[0] || 'User',
                  username: userMetadata?.username || null,
                  roles: roles
                }
              ])
              .select('*')
              .single();
              
            if (insertError) {
              console.error('Error creating profile:', insertError);
              return null;
            }
            
            // Create role-specific profile
            try {
              if (roles.includes('mahasiswa')) {
                await createMahasiswaProfile(user.id, userMetadata);
              }
              
              if (roles.includes('dosen')) {
                await createDosenProfile(user.id, userMetadata);
              }
              
              if (roles.includes('tendik') || roles.includes('koorpro')) {
                await createTendikProfile(user.id, userMetadata);
              }
            } catch (roleError) {
              console.error("Error creating role-specific profile:", roleError);
              // Continue anyway since the main profile was created
            }
            
            return newProfile as UserProfile;
          }
          
          // Fall back to creating a profile from user metadata
          const userMetadata = user.user_metadata;
          const role = userMetadata?.role || 'mahasiswa';
          const roles = Array.isArray(role) ? role : [role];
          
          return {
            id: user.id,
            name: userMetadata?.name || user.email?.split('@')[0] || 'User',
            username: userMetadata?.username || null,
            roles: roles,
          } as UserProfile;
        }
        
        return profileData as UserProfile;
      } catch (error) {
        console.error('Error in getProfile:', error);
        return null;
      }
    };

    // Add these helper functions for role-specific profile creation
    const createMahasiswaProfile = async (userId: string, userMetadata: any) => {
      const { error } = await supabase
        .from('mahasiswas')
        .insert([
          {
            user_id: userId,
            nama: userMetadata?.name || '',
            nim: userMetadata?.username || '',
            email: userMetadata?.email || ''
          }
        ]);
        
      if (error) throw error;
    };

    const createDosenProfile = async (userId: string, userMetadata: any) => {
      const { error } = await supabase
        .from('dosens')
        .insert([
          {
            user_id: userId,
            nama_dosen: userMetadata?.name || '',
            nip: userMetadata?.username || '',
            email: userMetadata?.email || ''
          }
        ]);
        
      if (error) throw error;
    };

    const createTendikProfile = async (userId: string, userMetadata: any) => {
      const { error } = await supabase
        .from('tendiks')
        .insert([
          {
            user_id: userId,
            nama_tendik: userMetadata?.name || '',
            nip: userMetadata?.username || '',
            email: userMetadata?.email || ''
          }
        ]);
        
      if (error) throw error;
    };

  const login = async (credentials: LoginCredentials) => {
    try {
      setState(prevState => ({ ...prevState, isLoading: true, error: null }));
      
      console.log("Login attempt started for:", credentials.email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });
  
      if (error) {
        console.error("Auth error:", error);
        setState(prevState => ({ ...prevState, error: error as unknown as Error, isLoading: false }));
        return { error: error as unknown as Error };
      }
  
      console.log("Auth successful, session:", data.session?.access_token ? "Present" : "Missing");
  
      // Get the user profile
      const profile = await getProfile();
      console.log("Profile fetched after login:", profile);
      
      // Update state with the new session and user info
      setState(prevState => ({
        ...prevState,
        session: data.session,
        user: profile,
        isLoading: false,
        error: null
      }));
  
      // Let the login component handle redirects
      return { error: null };
    } catch (error) {
      console.error("Unexpected login error:", error);
      setState(prevState => ({ ...prevState, error: error as Error, isLoading: false }));
      return { error: error as Error };
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      setState(prevState => ({ ...prevState, isLoading: true, error: null }));
      
      // Register user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            name: credentials.name,
            role: credentials.role,
            username: credentials.username || null,
            email: credentials.email
          }
        }
      });
  
      if (error) {
        setState(prevState => ({ ...prevState, error: error as unknown as Error, isLoading: false }));
        return { error: error as unknown as Error, user: null };
      }
  
      // Only attempt profile creation if user was created and we can get to it
      if (data.user && data.user.id) {
        try {
          // Create the main profile
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
            console.error('Error creating profile:', profileError);
          } else {
            console.log('Profile created successfully');
            
            // Create role-specific profile
            try {
              if (credentials.role === 'mahasiswa') {
                await createMahasiswaProfile(data.user.id, {
                  name: credentials.name, 
                  username: credentials.username,
                  email: credentials.email
                });
              } else if (credentials.role === 'dosen') {
                await createDosenProfile(data.user.id, {
                  name: credentials.name, 
                  username: credentials.username,
                  email: credentials.email
                });
              } else if (credentials.role === 'tendik' || credentials.role === 'koorpro') {
                await createTendikProfile(data.user.id, {
                  name: credentials.name, 
                  username: credentials.username,
                  email: credentials.email
                });
              }
            } catch (roleError) {
              console.error("Error creating role-specific profile:", roleError);
            }
          }
        } catch (insertError) {
          console.error('Error in register process:', insertError);
        }
      }
  
      // Get the user profile
      const profile = data.user ? await getProfile() : null;
      setState(prevState => ({
        ...prevState,
        session: data.session,
        user: profile,
        isLoading: false,
        error: null
      }));
  
      return { error: null, user: data.user };
    } catch (error) {
      console.error("Unexpected error in register:", error);
      setState(prevState => ({ ...prevState, error: error as Error, isLoading: false }));
      return { error: error as Error, user: null };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setState(prevState => ({
      ...prevState,
      session: null,
      user: null
    }));
    router.push('/login');
  };

  const resetPassword = async (credentials: ResetPasswordCredentials) => {
    try {
      setState(prevState => ({ ...prevState, isLoading: true, error: null }));
      
      const { error } = await supabase.auth.resetPasswordForEmail(
        credentials.email,
        {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
        }
      );

      setState(prevState => ({ ...prevState, isLoading: false, error: error as unknown as Error | null }));
      return { error: error as unknown as Error | null };
    } catch (error) {
      setState(prevState => ({ ...prevState, error: error as Error, isLoading: false }));
      return { error: error as Error };
    }
  };

  const updatePassword = async (credentials: UpdatePasswordCredentials) => {
    try {
      setState(prevState => ({ ...prevState, isLoading: true, error: null }));
      
      const { error } = await supabase.auth.updateUser({
        password: credentials.password
      });

      setState(prevState => ({ ...prevState, isLoading: false, error: error as unknown as Error | null }));
      return { error: error as unknown as Error | null };
    } catch (error) {
      setState(prevState => ({ ...prevState, error: error as Error, isLoading: false }));
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