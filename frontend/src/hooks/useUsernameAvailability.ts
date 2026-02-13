import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UsernameAvailabilityResult {
  isChecking: boolean;
  isAvailable: boolean | null;
  error: string | null;
}

/**
 * Hook to check username availability with debouncing.
 *
 * @param username - The username to check
 * @param currentUsername - The user's current username (skip check if same)
 * @param debounceMs - Debounce delay in milliseconds (default: 300)
 * @returns Object with isChecking, isAvailable, and error states
 */
export function useUsernameAvailability(
  username: string,
  currentUsername?: string,
  debounceMs = 300
): UsernameAvailabilityResult {
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state
    setError(null);

    // Skip if username is empty
    if (!username) {
      setIsAvailable(null);
      setIsChecking(false);
      return;
    }

    // Skip if username is same as current
    if (currentUsername && username === currentUsername) {
      setIsAvailable(true);
      setIsChecking(false);
      return;
    }

    // Validate username format (3-30 chars, lowercase alphanumeric + underscore)
    const usernameRegex = /^[a-z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
      setIsAvailable(null);
      setIsChecking(false);
      return;
    }

    // Set checking state
    setIsChecking(true);

    // Debounce the availability check
    const timeoutId = setTimeout(async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username)
          .maybeSingle();

        if (queryError) throw queryError;

        // data === null means username is available
        setIsAvailable(data === null);
        setIsChecking(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to check availability';
        setError(message);
        setIsAvailable(null);
        setIsChecking(false);
      }
    }, debounceMs);

    // Cleanup timeout on unmount or when dependencies change
    return () => clearTimeout(timeoutId);
  }, [username, currentUsername, debounceMs]);

  return { isChecking, isAvailable, error };
}
