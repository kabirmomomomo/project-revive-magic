import { supabase } from '@/lib/supabase';

export const cleanupExpiredSessions = async () => {
  try {
    // Delete expired sessions
    const { error } = await supabase
      .from('bill_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error cleaning up expired sessions:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error);
  }
};

// Function to check if current session is expired
export const isSessionExpired = () => {
  const expiresAt = localStorage.getItem('billSessionExpiresAt');
  if (!expiresAt) return true;
  
  return new Date(expiresAt) < new Date();
};

// Function to clear expired session from localStorage
export const clearExpiredSession = () => {
  if (isSessionExpired()) {
    localStorage.removeItem('billSessionId');
    localStorage.removeItem('billSessionCode');
    localStorage.removeItem('billSessionOwner');
    localStorage.removeItem('billSessionExpiresAt');
    return true;
  }
  return false;
}; 