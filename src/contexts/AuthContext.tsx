
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  supabase: typeof supabase;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Handle potential auth redirect with hash fragments
    if (window.location.hash && window.location.hash.includes('access_token')) {
      // Let Supabase handle the token in the hash
      setLoading(true);
      // Using setTimeout to ensure this doesn't block rendering
      setTimeout(() => {
        // The hash will be processed by the auth.getSession() call
        console.log('Auth redirect detected, hash will be processed');
      }, 0);
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session ? 'Has session' : 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session ? 'Logged in' : 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(error => {
      console.error('Error getting session:', error);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Clean hash fragments after processing to avoid issues with URL parsing
  useEffect(() => {
    if (location.hash && (location.hash.includes('access_token') || location.hash.includes('error'))) {
      // Wait until auth processing is likely complete
      const timer = setTimeout(() => {
        // Replace the URL without the hash fragment
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [location.hash]);

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      console.log('Attempting to sign up with email:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name
          }
        }
      });

      if (error) {
        console.error('Supabase signup error:', error);
        throw error;
      }
      
      if (data?.user) {
        console.log('Signup successful, user created:', data.user.id);
        toast.success("Account created successfully!");
        navigate('/menu-editor');
      } else {
        console.log('Signup completed without error but no user returned');
        toast.info("Please check your email to confirm your account");
      }
    } catch (error) {
      console.error('Error signing up:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          toast.error('Network error. Please check your connection and try again.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Failed to sign up. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Attempting to sign in with email:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Supabase signin error:', error);
        throw error;
      }
      
      console.log('Login successful:', data.user?.id);
      toast.success("Login successful!");
      navigate('/menu-editor');
    } catch (error) {
      console.error('Error signing in:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          toast.error('Network error. Please check your connection and try again.');
        } else if (error.message.includes('Invalid login')) {
          toast.error('Invalid email or password');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Failed to sign in. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      console.log('Attempting to sign in with Google');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/menu-editor`
        }
      });

      if (error) {
        console.error('Supabase Google signin error:', error);
        throw error;
      }
      
      // No need for navigation here - the OAuth flow will redirect
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setLoading(false);
      
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to sign in with Google. Please try again later.');
      }
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      console.log('Attempting to sign out');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase signout error:', error);
        throw error;
      }
      
      console.log('Sign out successful');
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      loading, 
      supabase,
      signUp, 
      signIn,
      signInWithGoogle,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
