-- Migration 006: Create profiles table, trigger, RLS policies, and avatars storage bucket
-- Purpose: Establishes user profile system with auto-generated usernames, avatar uploads, and public profile viewing

-- ============================================================
-- 1. Profiles table
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9_]{3,30}$'),
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT CHECK (char_length(bio) <= 500),
  institution TEXT CHECK (char_length(institution) <= 100),
  research_interests TEXT[] DEFAULT '{}',
  username_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. Index for username lookups
-- ============================================================
CREATE INDEX idx_profiles_username ON profiles(username);

-- ============================================================
-- 3. Trigger function to auto-create profile on user signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  base_username TEXT;
  sanitized_username TEXT;
  final_username TEXT;
  counter INT := 1;
  display_name_value TEXT;
BEGIN
  -- Start transaction with exception handling so auth signup doesn't fail if profile creation fails
  BEGIN
    -- Extract base username from OAuth metadata or email
    base_username := COALESCE(
      NEW.raw_user_meta_data->>'preferred_username',  -- GitHub
      NEW.raw_user_meta_data->>'user_name',           -- Google (sometimes)
      split_part(NEW.email, '@', 1)                   -- Fallback to email prefix
    );

    -- Sanitize: lowercase, replace non-alphanumeric with underscore
    sanitized_username := lower(regexp_replace(base_username, '[^a-z0-9_]', '_', 'g'));

    -- Ensure minimum length (pad with 'user' prefix if too short)
    IF char_length(sanitized_username) < 3 THEN
      sanitized_username := 'user_' || sanitized_username;
    END IF;

    -- Truncate to max 26 chars (leaving room for _NNN suffix)
    sanitized_username := left(sanitized_username, 26);

    -- Find unique username by appending counter if needed
    final_username := sanitized_username;
    WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username) LOOP
      final_username := sanitized_username || '_' || counter;
      counter := counter + 1;
    END LOOP;

    -- Extract display name from OAuth metadata
    display_name_value := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    );

    -- Insert profile with auto-generated username
    INSERT INTO profiles (id, username, display_name, username_claimed)
    VALUES (NEW.id, final_username, display_name_value, false);

  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't block user signup
      RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 4. Attach trigger to auth.users
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 5. Row Level Security policies on profiles
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read all profiles (for public profile viewing)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles
  FOR SELECT
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Allow users to insert their own profile (needed for trigger's SECURITY DEFINER)
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 6. Avatars storage bucket and RLS policies
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

-- Allow users to upload to their own folder
CREATE POLICY "Users can upload own avatar"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to update their own avatar files
CREATE POLICY "Users can update own avatar"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own avatar files
CREATE POLICY "Users can delete own avatar"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow anyone to view avatar files (for public profile viewing)
CREATE POLICY "Anyone can view avatars"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- ============================================================
-- 7. Updated_at trigger for profiles
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Migration complete
-- ============================================================
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Verify 'avatars' storage bucket exists in Storage section
-- 3. Test profile auto-creation by signing up a new test user
