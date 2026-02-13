import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  institution: string | null;
  research_interests: string[];
  username_claimed: boolean;
  created_at: string;
  updated_at: string;
}

interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  updateAvatar: (userId: string, blob: Blob) => Promise<string>;
  claimUsername: (userId: string, username: string) => Promise<void>;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,

  /**
   * Fetches user profile from Supabase.
   * IMPORTANT: Never call this inside onAuthStateChange callback (deadlock bug).
   * Call from useEffect watching auth user changes instead.
   */
  fetchProfile: async (userId: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      set({ profile: data, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch profile';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  /**
   * Updates profile with optimistic UI updates.
   * Reverts state on error.
   */
  updateProfile: async (updates: Partial<Profile>) => {
    const { profile } = get();
    if (!profile) {
      throw new Error('No profile loaded');
    }

    // Optimistic update
    const previousProfile = profile;
    set({ profile: { ...profile, ...updates }, error: null });

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (error) throw error;
    } catch (err) {
      // Revert on error
      set({ profile: previousProfile });
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      set({ error: message });
      throw err;
    }
  },

  /**
   * Uploads avatar blob to Supabase Storage and updates profile.
   * Deletes old avatar file if it exists.
   * Returns new avatar URL.
   */
  updateAvatar: async (userId: string, blob: Blob) => {
    const { profile } = get();
    if (!profile) {
      throw new Error('No profile loaded');
    }

    try {
      // Delete old avatar if it exists
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/').slice(-2).join('/'); // Extract "userId/filename.jpg"
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Upload new avatar
      const fileName = `avatar-${Date.now()}.jpg`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const newAvatarUrl = data.publicUrl;

      // Update profile with new avatar URL
      await get().updateProfile({ avatar_url: newAvatarUrl });

      return newAvatarUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload avatar';
      set({ error: message });
      throw err;
    }
  },

  /**
   * Claims a username (sets username and username_claimed = true).
   * Used when user intentionally changes their auto-generated username.
   */
  claimUsername: async (userId: string, username: string) => {
    const { profile } = get();
    if (!profile) {
      throw new Error('No profile loaded');
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username, username_claimed: true, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      set({ profile: { ...profile, username, username_claimed: true } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to claim username';
      set({ error: message });
      throw err;
    }
  },

  /**
   * Clears profile state (called on signout).
   */
  clearProfile: () => {
    set({ profile: null, error: null });
  },
}));
