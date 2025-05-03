import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
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

  useEffect(() => {
    // Handle hash fragment from OAuth redirect
    if (window.location.hash) {
      console.log('Found hash fragment, handling OAuth callback');
      const { access_token, refresh_token } = parseHashFragment(window.location.hash);
      if (access_token) {
        // Clear the hash fragment to prevent parsing it again
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session ? 'Logged in' : 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(error => {
      console.error('Error getting session:', error);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session ? 'Has session' : 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Redirect to menu editor on successful login
      if (event === 'SIGNED_IN' && session) {
        navigate('/menu-editor');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Helper function to parse hash fragments safely
  const parseHashFragment = (hash: string) => {
    try {
      // Remove the leading '#'
      const hashWithoutPrefix = hash.substring(1);
      const params = new URLSearchParams(hashWithoutPrefix);
      
      return {
        access_token: params.get('access_token'),
        refresh_token: params.get('refresh_token')
      };
    } catch (error) {
      console.error('Error parsing hash fragment:', error);
      return {
        access_token: null,
        refresh_token: null
      };
    }
  };

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
          redirectTo: `${window.location.origin}/login`,
          skipBrowserRedirect: false
        }
      });

      if (error) {
        console.error('Supabase Google signin error:', error);
        throw error;
      }
      
      // No need for navigation here as the OAuth process will handle redirection
    } catch (error) {
      console.error('Error signing in with Google:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          toast.error('Network error. Please check your connection and try again.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Failed to sign in with Google. Please try again later.');
      }
      setLoading(false);
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
