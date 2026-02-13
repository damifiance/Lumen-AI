---
phase: 06-profile-system
plan: 01
subsystem: profile-foundation
tags: [database, supabase, zustand, validation, image-processing]
dependency_graph:
  requires:
    - phase-04-supabase-foundation (auth, storage)
  provides:
    - profiles-table-schema
    - profile-store-with-crud
    - username-availability-validation
    - image-crop-resize-utility
  affects:
    - auth-flow (profile auto-creation on signup)
    - storage (avatars bucket)
tech_stack:
  added:
    - react-image-crop@11.0.10
    - react-hook-form@7.71.1
    - zod@4.3.6
    - @hookform/resolvers@5.2.2
  patterns:
    - Zustand store with optimistic updates
    - Debounced async validation hook
    - Canvas-based image processing
key_files:
  created:
    - backend/migrations/006_create_profiles.sql
    - frontend/src/stores/profileStore.ts
    - frontend/src/hooks/useUsernameAvailability.ts
    - frontend/src/lib/imageResize.ts
  modified:
    - frontend/package.json
    - frontend/package-lock.json
decisions:
  - decision: username_claimed boolean flag
    rationale: Distinguishes auto-generated usernames from claimed ones (better than regex-matching _\d+ suffix)
    impact: Users can later claim/customize their username
  - decision: Public profile viewing (SELECT RLS policy USING true)
    rationale: Academic profiles should be discoverable for collaboration
    impact: Anyone can view profiles without authentication
  - decision: Private avatars storage bucket
    rationale: Control access via RLS, generate signed URLs for viewing
    impact: Avatar URLs require Supabase authentication context
  - decision: Trigger with EXCEPTION block
    rationale: Profile creation failure shouldn't block user signup
    impact: Auth still works if profile table has issues
  - decision: Delete old avatar before upload
    rationale: Prevent storage bloat from repeated avatar changes
    impact: Only current avatar stored per user
metrics:
  duration: 163s
  tasks_completed: 2
  files_created: 4
  files_modified: 2
  commits: 2
  completed: 2026-02-13T19:43:38Z
---

# Phase 06 Plan 01: Profile System Foundation Summary

**One-liner:** Database schema with auto-profile-creation trigger, Zustand profile store with optimistic updates and avatar management, debounced username validation, and canvas-based image processing

## What Was Built

### Task 1: Database Migration and Dependencies
**Commit:** bff5ec1

Created comprehensive SQL migration `006_create_profiles.sql` with:

**Profiles table:**
- UUID primary key referencing auth.users (cascade delete)
- Username: unique, 3-30 chars, lowercase alphanumeric + underscore, regex validated
- Display name, avatar URL, bio (500 char limit), institution (100 char limit)
- Research interests as TEXT array
- `username_claimed` boolean flag to distinguish auto-generated from claimed usernames
- Timestamps: created_at, updated_at

**Auto-profile-creation trigger:**
- `handle_new_user()` function with SECURITY DEFINER
- Extracts base username from OAuth metadata (`preferred_username`, `user_name`, or email prefix)
- Sanitizes: lowercase, replace non-alphanumeric with underscore
- Ensures minimum 3 chars (pads with 'user' prefix if needed)
- Truncates to 26 chars (leaving room for `_NNN` suffix)
- LOOP to find unique username (appends `_1`, `_2`, etc.)
- Extracts display_name from OAuth metadata (`full_name` or `name`)
- EXCEPTION block ensures auth signup succeeds even if profile creation fails
- Triggered AFTER INSERT on auth.users

**Row-Level Security (RLS):**
- Profiles: SELECT (anyone), UPDATE (own profile), INSERT (own profile)
- Storage objects (avatars): INSERT/UPDATE/DELETE (own folder), SELECT (anyone)

**Avatars storage bucket:**
- Created via `INSERT INTO storage.buckets` (if not exists)
- Private bucket with public URL access via RLS

**Updated_at trigger:**
- Auto-updates `updated_at` timestamp on profile changes

**Frontend dependencies installed:**
- react-image-crop (image cropping UI)
- react-hook-form (form management)
- zod (schema validation)
- @hookform/resolvers (zod + react-hook-form integration)

Used `--legacy-peer-deps` due to React 19 peer dependency conflicts (same pattern as Phase 4).

### Task 2: Profile Store, Validation Hook, and Image Utility
**Commit:** 8d19ac0

**profileStore.ts** — Zustand store following authStore patterns:

Interface:
```typescript
interface Profile {
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
```

Actions:
- `fetchProfile(userId)` — SELECT from profiles, single()
- `updateProfile(updates)` — Optimistic update: set state immediately, then UPDATE Supabase. Revert on error.
- `updateAvatar(userId, blob)` — Deletes old avatar file, uploads new blob to `avatars/${userId}/avatar-${timestamp}.jpg`, updates profile.avatar_url
- `claimUsername(userId, username)` — UPDATE username and set username_claimed = true
- `clearProfile()` — Reset to null (called on signout)

**Critical note in code:** Never call Supabase API inside onAuthStateChange callback (deadlock bug). Profile fetching must be triggered separately.

**useUsernameAvailability.ts** — Custom validation hook:

Parameters:
- `username: string` — Username to check
- `currentUsername?: string` — Skip check if same as current
- `debounceMs = 300` — Debounce delay

Returns:
```typescript
{
  isChecking: boolean;
  isAvailable: boolean | null;
  error: string | null;
}
```

Logic:
- Skips if username is empty
- Skips if username equals currentUsername (returns isAvailable = true)
- Validates regex `^[a-z0-9_]{3,30}$` (returns isAvailable = null if invalid)
- Debounces with setTimeout + cleanup
- Queries: `supabase.from('profiles').select('username').eq('username', username).maybeSingle()`
- `data === null` means available

**imageResize.ts** — Pure utility function:

```typescript
export async function cropAndResize(
  imageSrc: string,
  crop: { x: number; y: number; width: number; height: number },
  targetSize: number = 400
): Promise<Blob>
```

- Loads image from data URL into HTMLImageElement
- Creates canvas at `targetSize x targetSize`
- drawImage with crop coordinates (in natural image pixels)
- Returns canvas.toBlob as JPEG quality 0.9
- Throws if toBlob returns null

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria passed:

- ✓ Migration file exists at `backend/migrations/006_create_profiles.sql`
- ✓ SQL contains: CREATE TABLE profiles, CREATE TRIGGER, 7× CREATE POLICY, INSERT INTO storage.buckets
- ✓ TypeScript compiles cleanly: `npx tsc --noEmit` passes
- ✓ All dependencies in package.json: react-image-crop, react-hook-form, zod, @hookform/resolvers
- ✓ profileStore exports: useProfileStore, fetchProfile, updateProfile, updateAvatar, claimUsername, clearProfile
- ✓ useUsernameAvailability hook exports correctly
- ✓ cropAndResize utility exports correctly

## User Setup Required

**Supabase SQL Editor:**
1. Navigate to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy/paste contents of `backend/migrations/006_create_profiles.sql`
4. Run query
5. Verify success: Check "profiles" table exists in Table Editor
6. Verify 'avatars' storage bucket exists in Storage section

**Testing profile auto-creation:**
1. Sign up a new test user (email/password or OAuth)
2. Check profiles table in Supabase: should see new row with auto-generated username
3. Verify `username_claimed = false` for auto-generated username

## Dependencies

**Requires:**
- Phase 04 (Supabase foundation): auth.users table, storage.buckets, RLS
- Phase 05 (OAuth integration): OAuth metadata for username extraction

**Provides:**
- Database schema for user profiles
- Profile CRUD operations via profileStore
- Username uniqueness validation
- Avatar upload/management
- Image crop and resize utilities

**Affects:**
- Auth flow: Trigger auto-creates profile on user signup
- Storage: Avatars bucket with RLS policies
- Future profile UI: Will consume profileStore, useUsernameAvailability, cropAndResize

## Next Steps

Phase 06 Plan 02 will build the profile UI components:
- Profile viewer (display username, avatar, bio, etc.)
- Profile editor (edit profile fields, crop/upload avatar)
- Username claim flow (if user has auto-generated username)
- Integration with chat UI (show @username instead of "You")

## Self-Check

Verifying all claimed artifacts exist and commits are valid...

**Files created:**
- ✓ FOUND: backend/migrations/006_create_profiles.sql
- ✓ FOUND: frontend/src/stores/profileStore.ts
- ✓ FOUND: frontend/src/hooks/useUsernameAvailability.ts
- ✓ FOUND: frontend/src/lib/imageResize.ts

**Commits:**
- ✓ FOUND: bff5ec1 (Task 1 - database migration and dependencies)
- ✓ FOUND: 8d19ac0 (Task 2 - profile store, hooks, utilities)

## Self-Check: PASSED
