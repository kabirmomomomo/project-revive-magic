
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

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
    });

    return () => subscription.unsubscribe();
  }, []);

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
        toast({
          title: "Success",
          description: "Account created successfully!",
          variant: "default",
        });
        navigate('/menu-editor');
      } else {
        console.log('Signup completed without error but no user returned');
        toast({
          title: "Please check your email",
          description: "Please check your email to confirm your account",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error signing up:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          toast({
            title: "Network Error",
            description: "Network error. Please check your connection and try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign Up Error",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Sign Up Error",
          description: "Failed to sign up. Please try again later.",
          variant: "destructive",
        });
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
      toast({
        title: "Success",
        description: "Login successful!",
        variant: "default",
      });
      navigate('/menu-editor');
    } catch (error) {
      console.error('Error signing in:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          toast({
            title: "Network Error",
            description: "Network error. Please check your connection and try again.",
            variant: "destructive",
          });
        } else if (error.message.includes('Invalid login')) {
          toast({
            title: "Login Error",
            description: "Invalid email or password",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login Error",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Login Error",
          description: "Failed to sign in. Please try again later.",
          variant: "destructive",
        });
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
      
      // No need to navigate here as the OAuth flow will handle the redirect
    } catch (error) {
      console.error('Error signing in with Google:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          toast({
            title: "Network Error",
            description: "Network error. Please check your connection and try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Google Login Error",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Google Login Error",
          description: "Failed to sign in with Google. Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
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
      toast({
        title: "Sign Out Error",
        description: error instanceof Error ? error.message : 'Failed to sign out',
        variant: "destructive",
      });
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
