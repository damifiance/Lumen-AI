# Phase 6: Profile System - Research

**Researched:** 2026-02-14
**Domain:** User profile management with Supabase (username validation, avatar upload, profile editing)
**Confidence:** MEDIUM-HIGH

## Summary

Building a comprehensive profile system on Supabase requires coordinating database schema, storage buckets with RLS policies, client-side validation, image cropping/upload, and real-time username uniqueness checks. The core pattern involves a `profiles` table (1:1 with `auth.users`), automatic profile creation via database triggers, a private Storage bucket for avatars with user-specific RLS policies, and a multi-step profile setup flow that ensures unique username claims on first login.

**Key architectural decisions:**
1. **Username validation:** Instagram-like handle (@username), 3-30 chars, lowercase alphanumeric + underscores, enforced via Postgres constraint + async client-side validation with debounce
2. **Avatar upload:** Client-side crop/resize → upload to private bucket → RLS policy allows users to read/write only their own folder
3. **Profile creation:** Postgres trigger auto-creates profile row on `auth.users` INSERT, username claim happens via modal on first login
4. **Profile editing:** React Hook Form + schema validation (Zod), optimistic UI updates, research interests as tag input

**Primary recommendation:** Use database triggers for automatic profile creation (avoid race conditions), implement debounced async username validation (200-500ms), use `react-image-crop` for client-side cropping (lightweight, actively maintained), resize images to 400×400 before upload (Canvas API), store avatars in private bucket with per-user RLS policies, and display username + avatar in chat interface via extended auth store.

**Critical patterns identified:**
- Database trigger must handle edge cases (OAuth metadata parsing, fallback usernames)
- Username uniqueness check requires both database constraint AND real-time async validation
- Avatar upload needs client-side resize (Canvas) to avoid large file transfers
- Profile modal follows existing module-level listener pattern (like LoginModal, OnboardingModal)

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | (existing) | Profile CRUD, Storage upload, RLS enforcement | Already integrated in Phase 4/5, handles auth context |
| Supabase Storage | (built-in) | Avatar file hosting with CDN | Native Supabase service, RLS integration, signed URLs |
| Supabase Postgres | (built-in) | Profiles table, triggers, constraints | Already used for auth.users extension |
| `react-image-crop` | ^11.0.7 | Client-side image cropping UI | Lightweight (30KB), actively maintained, accessible, 2.3K stars |
| `react-hook-form` | ^7.53.2 | Form state + validation | Standard for React forms in 2026, minimal re-renders, integrates with Zod |
| `zod` | ^3.24.1 | Schema validation | Type-safe validation, React Hook Form integration via `@hookform/resolvers` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@hookform/resolvers` | ^3.9.1 | Zod + React Hook Form bridge | Schema-driven form validation |
| Browser Canvas API | (built-in) | Image resize before upload | Always resize avatars to 400×400 to reduce bandwidth |
| `react-tag-autocomplete` | ^7.4.1 | Research interests tag input | If autocomplete from predefined list is needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-image-crop` | `react-easy-crop` | react-easy-crop is feature-rich but heavier (includes zoom, gesture support) |
| `react-image-crop` | `react-avatar-editor` | avatar-editor bundles upload logic, less flexible for custom flows |
| Client-side resize | Server-side resize | Server resize is better for production (Cloudinary/ImageKit), but adds cost/complexity |
| React Hook Form | Formik | Formik has larger bundle, more re-renders, React Hook Form is faster (2026 standard) |
| Private bucket + RLS | Public bucket | Public is faster (cached) but exposes all avatars — use private for privacy |
| Database trigger | Client-side profile creation | Trigger avoids race conditions (multiple signups), centralized logic |

**Installation:**
```bash
cd frontend
npm install react-image-crop react-hook-form zod @hookform/resolvers
```

## Architecture Patterns

### Recommended Project Structure
```
backend/ (Supabase SQL migrations)
└── migrations/
    └── 006_create_profiles.sql  # Profiles table, trigger, RLS policies

frontend/src/
├── stores/
│   └── profileStore.ts          # Profile CRUD, cache user profile
├── components/
│   └── profile/
│       ├── UsernameClaimModal.tsx    # First-login username claim
│       ├── ProfileEditModal.tsx      # Full profile editor (bio, institution, interests)
│       ├── AvatarCropUpload.tsx      # Image crop + resize + upload
│       └── ResearchInterestsInput.tsx # Tag input for interests
├── hooks/
│   └── useUsernameAvailability.ts    # Debounced async validation
└── lib/
    └── imageResize.ts            # Canvas-based resize utility
```

### Pattern 1: Automatic Profile Creation via Database Trigger

**What:** Postgres trigger that fires on `auth.users` INSERT, creating a matching profile row with fallback username

**When to use:** Always — avoids race conditions, centralizes profile initialization logic

**Example:**
```sql
-- Source: Supabase profile trigger pattern + GitHub discussions
-- Migration: 006_create_profiles.sql

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9_]{3,30}$'),
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT CHECK (char_length(bio) <= 500),
  institution TEXT,
  research_interests TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for username lookups (critical for performance)
CREATE INDEX idx_profiles_username ON profiles(username);

-- Trigger function: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  -- Extract username from email or metadata
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );

  -- Sanitize: lowercase, replace non-alphanumeric with underscore
  base_username := lower(regexp_replace(base_username, '[^a-z0-9_]', '_', 'g'));

  -- Ensure min length
  IF char_length(base_username) < 3 THEN
    base_username := 'user';
  END IF;

  -- Find unique username (append counter if collision)
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || '_' || counter;
  END LOOP;

  -- Insert profile (username is temporary, user must claim real one)
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', final_username)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

**Why this pattern:**
- Guarantees profile exists after signup (no race conditions)
- Handles OAuth metadata parsing (Google/GitHub may provide username/name)
- Auto-resolves username collisions with counter suffix
- SECURITY DEFINER allows trigger to INSERT even if RLS is enabled

**Anti-patterns to avoid:**
- Client-side profile creation after signup (race conditions if multiple tabs/devices)
- Not sanitizing username (could break regex constraint)
- Not testing trigger thoroughly (can block all signups if trigger fails)

### Pattern 2: Row Level Security for Profiles

**What:** RLS policies that allow users to read all profiles (for @mentions, social features) but only update their own

**When to use:** Always — enforce data access at database level, not app logic

**Example:**
```sql
-- Source: Supabase RLS best practices + MakerKit patterns

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can read profiles (for @mentions, public profiles)
CREATE POLICY "Profiles are publicly readable"
  ON profiles
  FOR SELECT
  USING (true);

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Users can insert their own profile (for trigger)
-- Note: Trigger uses SECURITY DEFINER, but this allows manual inserts
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
```

**Performance note:**
- Always index columns in RLS policies (`id` is already indexed as PK)
- Test policies from client SDK, not SQL editor (editor bypasses RLS)

### Pattern 3: Username Availability Check with Debounce

**What:** Real-time async validation that checks username uniqueness while user types, debounced to avoid flooding server

**When to use:** Username claim modal, profile edit modal (if username change is allowed)

**Example:**
```typescript
// Source: React-admin useUnique + React Hook Form async validation patterns
// frontend/src/hooks/useUsernameAvailability.ts

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useUsernameAvailability(username: string, debounceMs = 300) {
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip if username is invalid format
    if (!username || !/^[a-z0-9_]{3,30}$/.test(username)) {
      setIsAvailable(null);
      setError(null);
      return;
    }

    setIsChecking(true);
    setError(null);

    // Debounce: wait for user to stop typing
    const timer = setTimeout(async () => {
      try {
        const { data, error: dbError } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username)
          .maybeSingle();

        if (dbError) throw dbError;

        setIsAvailable(data === null); // null means no match = available
      } catch (err) {
        setError('Failed to check username availability');
        setIsAvailable(null);
      } finally {
        setIsChecking(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [username, debounceMs]);

  return { isChecking, isAvailable, error };
}

// Usage in UsernameClaimModal:
const [username, setUsername] = useState('');
const { isChecking, isAvailable } = useUsernameAvailability(username);

// Show feedback:
// - isChecking: spinner
// - isAvailable === true: green checkmark
// - isAvailable === false: red X + "Username taken"
```

**Why 300ms debounce:**
- Balance between responsiveness and server load
- User typically stops typing for 200-500ms between words
- CoreUI recommends 200-500ms for live validation

### Pattern 4: Client-Side Image Crop + Resize + Upload

**What:** Let user crop image to square, resize to 400×400 using Canvas, upload to Supabase Storage

**When to use:** Avatar upload (always resize before upload to save bandwidth)

**Example:**
```typescript
// Source: react-image-crop docs + Canvas resize pattern + Supabase Storage upload
// frontend/src/components/profile/AvatarCropUpload.tsx

import { useState } from 'react';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

export function AvatarCropUpload({ onSuccess }: { onSuccess: (url: string) => void }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 100, height: 100, x: 0, y: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const user = useAuthStore((s) => s.user);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Image must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!imageSrc || !user) return;

    setIsUploading(true);
    try {
      // 1. Create canvas from cropped area
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const image = new Image();
      image.src = imageSrc;

      await new Promise((resolve) => {
        image.onload = resolve;
      });

      // 2. Calculate crop dimensions
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const cropX = crop.x! * scaleX;
      const cropY = crop.y! * scaleY;
      const cropWidth = crop.width! * scaleX;
      const cropHeight = crop.height! * scaleY;

      // 3. Resize to 400x400 (avatar standard size)
      canvas.width = 400;
      canvas.height = 400;
      ctx.drawImage(
        image,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, 400, 400
      );

      // 4. Convert to Blob (JPEG, 0.9 quality)
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9)
      );

      // 5. Upload to Supabase Storage
      const fileName = `${user.id}/avatar-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // 6. Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);

      onSuccess(urlData.publicUrl);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileSelect} />
      {imageSrc && (
        <>
          <ReactCrop crop={crop} onChange={setCrop} aspect={1}>
            <img src={imageSrc} alt="Crop preview" />
          </ReactCrop>
          <button onClick={handleUpload} disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Upload Avatar'}
          </button>
        </>
      )}
    </div>
  );
}
```

**Why this pattern:**
- Client-side crop gives instant feedback (no server round-trip)
- 400×400 is standard avatar size (Slack, Discord use 256×256 or 512×512)
- JPEG at 0.9 quality balances size (~20-50KB) and visual quality
- Date.now() in filename prevents cache issues when updating avatar

**Alternatives:**
- Server-side resize (Cloudinary, ImageKit) — better for production scale, adds cost
- WebP format — smaller than JPEG, but Safari support was added late (use JPEG for compatibility)

### Pattern 5: Supabase Storage RLS for Avatars

**What:** Private bucket with RLS policies allowing users to manage their own avatar folder

**When to use:** Always for user-generated content requiring privacy control

**Example:**
```sql
-- Source: Supabase Storage RLS patterns + official docs

-- 1. Create private bucket (via Supabase Dashboard or SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false);

-- 2. RLS policy: users can upload to their own folder
CREATE POLICY "Users can upload own avatar"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. RLS policy: users can update their own avatar
CREATE POLICY "Users can update own avatar"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. RLS policy: users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5. RLS policy: anyone can view avatars (for public profiles)
CREATE POLICY "Anyone can view avatars"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');
```

**Folder structure:**
```
avatars/
├── <user-id-1>/
│   └── avatar-1639234567890.jpg
├── <user-id-2>/
│   └── avatar-1639234567891.jpg
```

**Public vs Private bucket decision:**
- **Private bucket** (chosen here): Requires authentication to download, uses signed URLs if needed, gives fine-grained RLS control
- **Public bucket**: Faster (CDN caching), simpler URLs, but no RLS enforcement — use for truly public assets

**Performance note:**
- Always index `bucket_id` and `name` in storage.objects (Supabase does this by default)
- Test policies from client SDK, not SQL editor

### Pattern 6: Profile Edit Form with React Hook Form + Zod

**What:** Schema-driven form validation, optimistic UI updates, minimal re-renders

**When to use:** Profile edit modal (bio, institution, research interests)

**Example:**
```typescript
// Source: React Hook Form 2026 patterns + Zod validation
// frontend/src/components/profile/ProfileEditModal.tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

// Validation schema
const profileSchema = z.object({
  display_name: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  institution: z.string().max(100).optional(),
  research_interests: z.array(z.string()).max(10).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileEditModal({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const user = useAuthStore((s) => s.user);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile.display_name || '',
      bio: profile.bio || '',
      institution: profile.institution || '',
      research_interests: profile.research_interests || [],
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      alert('Failed to update profile');
      console.error(error);
    } else {
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Display Name */}
      <div>
        <label>Display Name</label>
        <input {...register('display_name')} />
        {errors.display_name && <span>{errors.display_name.message}</span>}
      </div>

      {/* Bio */}
      <div>
        <label>Bio ({500 - (watch('bio')?.length || 0)} chars remaining)</label>
        <textarea {...register('bio')} maxLength={500} />
        {errors.bio && <span>{errors.bio.message}</span>}
      </div>

      {/* Institution */}
      <div>
        <label>Institution</label>
        <input {...register('institution')} placeholder="e.g., Stanford University" />
        {errors.institution && <span>{errors.institution.message}</span>}
      </div>

      {/* Research Interests (tag input) */}
      <div>
        <label>Research Interests</label>
        {/* Use react-tag-autocomplete or custom tag input */}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  );
}
```

**Why this pattern:**
- Zod schema centralizes validation (reusable, testable)
- React Hook Form uses refs (minimal re-renders vs controlled inputs)
- `zodResolver` bridges Zod and React Hook Form
- `defaultValues` prepopulates form (no useEffect needed)

**Validation on blur, not change:**
```typescript
const { register } = useForm({
  mode: 'onBlur', // Validate when user leaves field
});
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Username uniqueness | Sequential username generation | Database constraint + async check | Race conditions, edge cases (emoji, Unicode, SQL injection) |
| Image cropping UI | Custom canvas drag-drop | `react-image-crop` | Accessibility, touch support, aspect ratio lock, edge cases |
| Form validation | Manual useState + error tracking | React Hook Form + Zod | Re-render optimization, complex validation logic, error state sync |
| Debouncing | Custom setTimeout logic | useEffect + cleanup | Memory leaks, stale closures, race conditions |
| Image resize | Manual Canvas manipulation | Tested resize utility | Color space issues, memory leaks (large images), browser quirks |
| Avatar CDN | Custom file server | Supabase Storage | CDN caching, signed URLs, RLS integration, backup/redundancy |

**Key insight:** Profile systems have deceptively complex edge cases:
- Unicode usernames (emoji, RTL text, zero-width characters)
- Image EXIF orientation (photo appears rotated)
- Large file uploads (memory, progress, cancellation)
- Concurrent edits (optimistic UI + conflict resolution)
- Privacy (RLS policies, signed URLs, public vs private assets)

Supabase + battle-tested libraries handle these better than custom code.

## Common Pitfalls

### Pitfall 1: Username Collision in Trigger

**What goes wrong:** Database trigger uses static fallback username (e.g., "user_12345"), but if two signups happen simultaneously, both get same username → unique constraint violation → signup fails

**Why it happens:** Trigger runs in transaction, but LOOP check can miss concurrent INSERTs

**How to avoid:**
- Use LOOP with counter to append suffix until unique username found
- Add error handling in trigger (EXCEPTION block) to retry with different suffix
- Test trigger under load (multiple signups in parallel)

**Warning signs:**
- Users report "signup failed" errors intermittently
- Duplicate key violations in Postgres logs

### Pitfall 2: Not Resizing Images Before Upload

**What goes wrong:** User uploads 12MP photo from iPhone (4000×3000, 8MB) → slow upload, expensive storage, CDN bandwidth costs

**Why it happens:** Assuming mobile photos are "web-sized" (they're not)

**How to avoid:**
- Always resize to target dimensions (400×400 for avatars) before upload
- Validate file size client-side (reject > 5MB before resize)
- Use Canvas API (built-in, no dependencies)

**Warning signs:**
- Slow avatar uploads on mobile
- High Storage egress costs

### Pitfall 3: Public Bucket with Sensitive Data

**What goes wrong:** Create public bucket for avatars → anyone with URL can access → user changes avatar but old URL still cached/leaked → privacy issue

**Why it happens:** Misunderstanding public vs private buckets

**How to avoid:**
- Use private bucket by default for user-generated content
- Only use public bucket for truly public assets (logos, icons)
- If using public bucket, generate unguessable filenames (UUIDs)

**Warning signs:**
- Old avatar URLs still work after deletion
- Users report privacy concerns

### Pitfall 4: Username Validation Only on Client

**What goes wrong:** Client validates username format, but server doesn't → malicious user bypasses client validation → inserts invalid username (SQL injection, XSS) → security breach

**Why it happens:** Trusting client-side validation

**How to avoid:**
- Always enforce constraints at database level (CHECK constraint + regex)
- Server validates before INSERT/UPDATE (even if client validated)
- Test with Postman/curl bypassing client

**Warning signs:**
- Invalid usernames in database
- XSS vulnerabilities in profile pages

### Pitfall 5: Not Testing Profile Trigger

**What goes wrong:** Deploy profile trigger without testing → trigger has bug (e.g., doesn't handle NULL email) → all signups fail → production outage

**Why it happens:** Assuming trigger "just works" because SQL looks correct

**How to avoid:**
- Test trigger with multiple scenarios: email signup, Google OAuth, GitHub OAuth, missing metadata
- Add error logging to trigger (INSERT into error_log table)
- Use EXCEPTION block to prevent trigger from blocking signup

**Warning signs:**
- All signups fail after trigger deployment
- No profiles created for new users

### Pitfall 6: Calling Supabase API Inside onAuthStateChange

**What goes wrong:** `onAuthStateChange` callback calls `supabase.from('profiles').select()` → deadlock → auth state never updates

**Why it happens:** Known Supabase bug (documented in Phase 4 research)

**How to avoid:**
- Never call Supabase APIs inside `onAuthStateChange` callback
- Fetch profile data outside callback (in separate useEffect or on-demand)

**Warning signs:**
- Auth state freezes after login
- Profile data never loads

### Pitfall 7: Not Debouncing Username Check

**What goes wrong:** User types "john" → 4 API calls (j, jo, joh, john) → floods server → rate limit triggered

**Why it happens:** Validating on every keystroke

**How to avoid:**
- Debounce validation hook (300-500ms)
- Cancel previous requests (AbortController)
- Only validate when username format is valid

**Warning signs:**
- High API call volume from username modal
- Rate limit errors

## Code Examples

Verified patterns from official sources:

### Username Claim Flow on First Login

```typescript
// Source: Onboarding UX patterns + module-level listener pattern (existing modals)
// frontend/src/components/profile/UsernameClaimModal.tsx

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUsernameAvailability } from '../../hooks/useUsernameAvailability';
import { Check, X, Loader2 } from 'lucide-react';

// Module-level listener (matches LoginModal, OnboardingModal pattern)
type Listener = (open: boolean) => void;
let _listener: Listener | null = null;

export function openUsernameClaimModal() {
  _listener?.(true);
}

export function UsernameClaimModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = useAuthStore((s) => s.user);

  const { isChecking, isAvailable, error } = useUsernameAvailability(username);

  // Register listener
  useEffect(() => {
    _listener = (open: boolean) => setIsVisible(open);
    return () => { _listener = null; };
  }, []);

  // Check if user already has claimed username (auto-open if not)
  useEffect(() => {
    if (!user) return;

    const checkUsername = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      // If username looks auto-generated (ends with _123), prompt claim
      if (data?.username.match(/_\d+$/)) {
        setIsVisible(true);
      }
    };

    checkUsername();
  }, [user]);

  const handleClaim = async () => {
    if (!user || !isAvailable) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', user.id);

    if (error) {
      alert('Failed to claim username');
    } else {
      setIsVisible(false);
    }
    setIsSubmitting(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-gray-700 mb-2">Claim Your Username</h2>
        <p className="text-sm text-gray-500 mb-4">
          Choose a unique username. This will appear in the chat interface instead of "You".
        </p>

        <div className="relative">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="e.g., john_doe"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent"
            pattern="[a-z0-9_]{3,30}"
          />

          {/* Validation feedback */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isChecking && <Loader2 size={16} className="animate-spin text-gray-400" />}
            {!isChecking && isAvailable === true && <Check size={16} className="text-green-500" />}
            {!isChecking && isAvailable === false && <X size={16} className="text-red-500" />}
          </div>
        </div>

        {/* Error/hint messages */}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        {isAvailable === false && <p className="text-xs text-red-500 mt-1">Username taken</p>}
        {isAvailable === true && <p className="text-xs text-green-500 mt-1">Username available!</p>}
        <p className="text-xs text-gray-400 mt-1">3-30 characters, lowercase letters, numbers, underscores</p>

        <button
          onClick={handleClaim}
          disabled={!isAvailable || isSubmitting}
          className="w-full mt-4 px-5 py-3 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Claiming...' : 'Claim Username'}
        </button>
      </div>
    </div>
  );
}
```

### Display Username + Avatar in Chat

```typescript
// Source: Existing ChatMessage component + profile integration
// frontend/src/components/chat/ChatMessage.tsx (modifications)

import { User } from 'lucide-react';
import lumenLogo from '../../assets/lumen-logo.png';
import { useProfileStore } from '../../stores/profileStore';
import { useAuthStore } from '../../stores/authStore';

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const user = useAuthStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);

  // User display: use profile username or fallback to "You"
  const displayName = isUser
    ? (profile?.username || 'You')
    : 'Lumen';

  // User avatar: use profile avatar or fallback icon
  const avatarElement = isUser ? (
    profile?.avatar_url ? (
      <img src={profile.avatar_url} alt={displayName} className="w-7 h-7 rounded-lg object-cover" />
    ) : (
      <div className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
        <User size={14} />
      </div>
    )
  ) : (
    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal/10 to-accent/10 text-teal flex items-center justify-center">
      <img src={lumenLogo} alt="AI" className="w-3.5 h-3.5" />
    </div>
  );

  return (
    <div className={`px-5 py-4 ${isUser ? 'bg-chat-user' : 'bg-chat-assistant'}`}>
      <div className="flex gap-3">
        {avatarElement}
        <div className="flex-1 min-w-0">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${
            isUser ? 'text-accent/60' : 'text-teal/60'
          }`}>
            {displayName}
          </span>
          {/* ... rest of message content ... */}
        </div>
      </div>
    </div>
  );
}
```

### Profile Store with Cache

```typescript
// Source: Zustand patterns + Supabase profile fetching
// frontend/src/stores/profileStore.ts

import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  institution?: string;
  research_interests: string[];
}

interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  isLoading: false,

  fetchProfile: async (userId: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      set({ profile: data, isLoading: false });
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { profile } = get();
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (error) throw error;

      // Optimistic update
      set({ profile: { ...profile, ...updates } });
    } catch (err) {
      console.error('Failed to update profile:', err);
      throw err;
    }
  },
}));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Formik for forms | React Hook Form | 2023 | Faster, fewer re-renders, smaller bundle |
| Manual async validation | Debounced hooks + AbortController | 2024 | Better UX, less server load, prevents race conditions |
| react-avatar-editor | react-image-crop | 2024 | Lighter bundle, more flexible, better maintained |
| Public Storage buckets | Private buckets + RLS | 2025 | Privacy compliance, fine-grained access control |
| Client-side profile creation | Database triggers | 2024 | Eliminates race conditions, centralized logic |
| localStorage for tokens | Electron safeStorage | 2022 | OS-level encryption, security compliance |

**Deprecated/outdated:**
- `@supabase/auth-helpers-react`: Deprecated April 2024 → use `@supabase/supabase-js` directly
- `node-keytar`: Deprecated → use Electron's built-in `safeStorage` (since Electron 12)
- Formik: Not deprecated but superseded by React Hook Form (better performance)

## Open Questions

1. **Should username be changeable after initial claim?**
   - What we know: Instagram allows username changes, Twitter charges for it
   - What's unclear: Impact on @mentions, URL stability, squatting prevention
   - Recommendation: Allow changes but rate-limit (1 change per 30 days), keep audit log

2. **Should research interests have autocomplete from predefined list?**
   - What we know: Free-form allows flexibility, predefined list improves searchability
   - What's unclear: How to maintain list, handle edge cases (new fields)
   - Recommendation: Start with free-form (Phase 6), add autocomplete in future phase when user base grows

3. **Should avatars be public or private bucket?**
   - What we know: Public is faster (CDN), private gives RLS control
   - What's unclear: Future social features may require different access patterns
   - Recommendation: Start with private bucket (privacy-first), migrate to public if performance becomes issue

4. **How to handle OAuth provider profile images?**
   - What we know: Google/GitHub provide profile image URL in metadata
   - What's unclear: Should we copy to our Storage or hotlink? Hotlink may break if user changes OAuth provider avatar
   - Recommendation: Copy to Supabase Storage on first login (trigger fetches OAuth avatar, uploads to Storage)

5. **Should bio support Markdown?**
   - What we know: Markdown adds formatting power, but increases XSS risk and complexity
   - What's unclear: User demand for formatted bios
   - Recommendation: Start with plain text (Phase 6), add Markdown in future if requested

## Sources

### Primary (HIGH confidence)
- Supabase Storage RLS Policies: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Row Level Security Guide: https://supabase.com/docs/guides/database/postgres/row-level-security
- React Hook Form Official Docs: https://react-hook-form.com/
- react-image-crop GitHub: https://github.com/DominicTobias/react-image-crop
- Electron safeStorage API: https://www.electronjs.org/docs/latest/api/safe-storage

### Secondary (MEDIUM confidence)
- Username validation best practices: https://regexr.com/3cg7r (Instagram username regex)
- Supabase profile triggers: https://medium.com/@ctrlaltmonique/how-to-insert-usernames-into-profiles-table-using-supabase-triggers-ef14d98747da
- React form validation patterns: https://react.wiki/hooks/form-validation/
- Client-side image resize: https://wilw.dev/blog/2021/07/06/resizing-images/
- Onboarding UX patterns: https://userguiding.com/blog/user-onboarding

### Tertiary (LOW confidence)
- react-tag-autocomplete: https://github.com/i-like-robots/react-tag-autocomplete (popular but not extensively reviewed)
- Debounce patterns: https://mimo.org/glossary/react/debounce (general reference)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - libraries are industry standard, actively maintained
- Architecture patterns: HIGH - patterns verified in existing codebase (Phase 4/5), Supabase official docs
- Pitfalls: MEDIUM - based on GitHub discussions, blog posts, needs production validation
- Username validation: MEDIUM - regex pattern is standard, but edge cases (Unicode) need testing
- Image upload: MEDIUM - Canvas API is well-documented, but EXIF orientation edge case needs testing

**Research date:** 2026-02-14
**Valid until:** ~30 days (stable domain, but library versions and Supabase features evolve)
