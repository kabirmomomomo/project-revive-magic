import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Cache key for database connection status
const DB_CONNECTION_KEY = 'database-connection';

// Function to check database connection
const checkDatabaseConnection = async () => {
  try {
    // Use a lightweight query that's guaranteed to work if DB is connected
    const { error } = await supabase.from('restaurants').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
};

export const useDatabaseConnection = () => {
  return useQuery({
    queryKey: [DB_CONNECTION_KEY],
    queryFn: checkDatabaseConnection,
    // Cache the result for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Keep the data in cache for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Retry up to 3 times with exponential backoff
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}; 