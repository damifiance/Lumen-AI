---
phase: 06-profile-system
plan: 02
subsystem: profile-ui
tags: [react, zustand, modals, react-hook-form, react-image-crop, ui-components]
dependency_graph:
  requires:
    - phase-06-plan-01 (profileStore, useUsernameAvailability, imageResize)
    - phase-05-oauth (auth state management)
  provides:
    - username-claim-modal
    - profile-edit-modal
    - avatar-crop-upload-component
    - chat-profile-integration
  affects:
    - App.tsx (profile loading and modal rendering)
    - ChatMessage.tsx (username and avatar display)
    - AuthButton.tsx (profile edit access)
tech_stack:
  added: []
  patterns:
    - Module-level listener pattern for modals
    - React Hook Form with Zod validation
    - react-image-crop for avatar cropping
    - Optimistic UI updates via Zustand
key_files:
  created:
    - frontend/src/components/profile/UsernameClaimModal.tsx
    - frontend/src/components/profile/ProfileEditModal.tsx
    - frontend/src/components/profile/AvatarCropUpload.tsx
  modified:
    - frontend/src/App.tsx
    - frontend/src/components/chat/ChatMessage.tsx
    - frontend/src/components/auth/AuthButton.tsx
    - frontend/src/stores/profileStore.ts
    - frontend/src/components/profile/AvatarCropUpload.tsx
    - frontend/src/components/profile/ProfileEditModal.tsx
    - backend/migrations/006_create_profiles.sql
decisions:
  - decision: Module-level listener pattern for all profile modals
    rationale: Matches existing LoginModal/SignupModal pattern for consistency
    impact: Programmatic modal control via exported functions
  - decision: No close button on UsernameClaimModal
    rationale: Username claim is mandatory for first login
    impact: Users cannot dismiss modal until they claim a username
  - decision: Comma-separated input for research interests
    rationale: Research recommended starting simple vs react-tag-autocomplete
    impact: Users enter interests as free-form text
  - decision: Auto-create profile for legacy users (PGRST116 handling)
    rationale: Users created before migration don't have profile rows
    impact: fetchProfile creates profile on-the-fly if missing
  - decision: Public avatars storage bucket
    rationale: Enable public profile viewing without auth
    impact: Avatar URLs are publicly accessible (changed from private)
metrics:
  duration: 15s
  tasks_completed: 3
  files_created: 3
  files_modified: 6
  commits: 3
  completed: 2026-02-14T16:08:21Z
---

# Phase 06 Plan 02: Profile UI Components Summary

**One-liner:** Complete profile UI with username claim modal, profile editor with avatar crop/upload, and chat integration showing @username and avatars

## What Was Built

### Task 1: Create UsernameClaimModal, ProfileEditModal, and AvatarCropUpload
**Commit:** f367378

Created three core profile UI components in `frontend/src/components/profile/`:

**UsernameClaimModal.tsx:**
- Module-level listener pattern: `openUsernameClaimModal()` export
- State management: username input, submission state
- Real-time validation via `useUsernameAvailability` hook
- Visual feedback: Loader2 (checking), Check (green, available), X (red, taken)
- Input validation: lowercase-only transform, 3-30 chars, alphanumeric + underscore
- No close button (username claim is mandatory for first login)
- On submit: calls `profileStore.claimUsername(userId, username)` and closes
- Matches LoginModal aesthetic (rounded-2xl, shadow-2xl, accent colors)

**ProfileEditModal.tsx:**
- Module-level listener pattern: `openProfileEditModal()` export
- React Hook Form with Zod resolver validation
- Schema: display_name (max 50), bio (max 500 with char counter), institution (max 100), research_interests (comma-separated, max 10)
- Pre-populated with current profile data via `defaultValues`
- Includes `<AvatarCropUpload />` component at top
- Validation mode: `onBlur` (validates when user leaves field)
- Submit: calls `profileStore.updateProfile(data)`, closes on success
- Has close button (X in top-right) — profile editing is optional

**AvatarCropUpload.tsx:**
- Props: `currentAvatarUrl?: string`, `onUploadComplete?: (url: string) => void`
- Circular avatar preview (current or User icon placeholder)
- Click to open file input (`accept="image/*"`, max 5MB validation)
- File select → shows react-image-crop overlay with 1:1 aspect ratio
- Default crop: centered, 80% of smaller image dimension
- "Crop & Upload" button: calls `cropAndResize(imageSrc, cropPixels, 400)`, then `profileStore.updateAvatar(userId, blob)`
- Upload progress: Loader2 spinner during upload
- Success: calls `onUploadComplete` with new URL, resets state

### Task 2: Integrate profile into App.tsx, ChatMessage, and AuthButton
**Commit:** eee1c77

**App.tsx modifications:**
- Imported UsernameClaimModal and ProfileEditModal
- Imported useProfileStore
- Added useEffect watching `useAuthStore.user`:
  - User becomes non-null → `profileStore.fetchProfile(user.id)`
  - User becomes null → `profileStore.clearProfile()`
  - Separate from auth initialize useEffect (avoids Supabase deadlock bug)
- Added useEffect watching `profileStore.profile`:
  - When `profile.username_claimed === false` → `openUsernameClaimModal()`
  - Auto-opens username claim for new users
- Rendered `<UsernameClaimModal />` and `<ProfileEditModal />` in modals section

**ChatMessage.tsx modifications:**
- Imported useProfileStore and useAuthStore
- For user messages (`isUser === true`):
  - Display name: `profile?.username ? @${profile.username} : 'You'`
  - Avatar: If `profile?.avatar_url`, render `<img>` with `w-7 h-7 rounded-lg object-cover`, otherwise User icon fallback
- For assistant messages: no changes (still "Lumen" with logo)
- All existing functionality preserved (markdown, save-as-note, etc.)

**AuthButton.tsx modifications:**
- Imported `openProfileEditModal` from ProfileEditModal
- Imported useProfileStore
- When logged in: shows "Edit Profile" button with avatar thumbnail
- Click → opens ProfileEditModal via `openProfileEditModal()`
- On sign out: also calls `profileStore.clearProfile()`

### Task 3: Verify complete profile system
**Type:** checkpoint:human-verify
**Status:** PASSED

All 5 verification flows passed:
1. ✓ Username claim flow works with real-time availability feedback
2. ✓ Profile editing works and persists (bio, institution, interests)
3. ✓ Avatar upload, crop, and display works correctly
4. ✓ Chat messages show @username and avatar
5. ✓ Session persistence works (sign out/in)

### Post-Checkpoint Fixes
**Commit:** afc4027

After human verification passed, applied the following fixes:

**profileStore.ts:**
- Added PGRST116 error handling in `fetchProfile`
- If profile row doesn't exist (users created before migration), auto-create one
- Extracts username from email prefix, sanitizes, ensures minimum 3 chars
- Sets `username_claimed = false` for auto-generated usernames

**AvatarCropUpload.tsx:**
- Fixed `completedCrop` initialization in `handleImageLoad`
- Sets both `crop` and `completedCrop` state simultaneously
- Fixed upload icon centering in hover overlay

**ProfileEditModal.tsx:**
- Removed redundant "Avatar" label above AvatarCropUpload component

**006_create_profiles.sql:**
- Changed avatars storage bucket from `public: false` to `public: true`
- Enables RLS policies to work correctly with `getPublicUrl()`
- Avatar URLs are now publicly accessible

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Auto-create profile for legacy users**
- **Found during:** Task 3 (human verification)
- **Issue:** Users created before migration don't have profile rows, causing PGRST116 error
- **Fix:** Added PGRST116 error handling in `profileStore.fetchProfile` to auto-create profile on-the-fly
- **Files modified:** frontend/src/stores/profileStore.ts
- **Commit:** afc4027

**2. [Rule 1 - Bug] Fixed completedCrop initialization**
- **Found during:** Task 3 (human verification)
- **Issue:** Crop interface didn't work properly on image load
- **Fix:** Initialize both `crop` and `completedCrop` in `handleImageLoad`
- **Files modified:** frontend/src/components/profile/AvatarCropUpload.tsx
- **Commit:** afc4027

**3. [Rule 2 - Missing Critical Functionality] Public avatars bucket**
- **Found during:** Task 3 (human verification)
- **Issue:** Private avatars bucket prevented RLS policies from working with `getPublicUrl()`
- **Fix:** Changed bucket to public in migration SQL
- **Files modified:** backend/migrations/006_create_profiles.sql
- **Commit:** afc4027

**4. [Rule 1 - Bug] Fixed upload icon centering**
- **Found during:** Task 3 (human verification)
- **Issue:** Upload icon in avatar hover overlay wasn't properly centered
- **Fix:** Updated flex/centering classes in hover overlay
- **Files modified:** frontend/src/components/profile/AvatarCropUpload.tsx
- **Commit:** afc4027

## Verification Results

All verification criteria passed:

- ✓ TypeScript compiles: `npx tsc --noEmit` passes
- ✓ All 3 profile components exist in `frontend/src/components/profile/`
- ✓ UsernameClaimModal exports `openUsernameClaimModal` function
- ✓ ProfileEditModal exports `openProfileEditModal` function
- ✓ AvatarCropUpload imports react-image-crop and imageResize correctly
- ✓ App.tsx imports and renders both modals
- ✓ App.tsx has useEffect for profile fetching on auth state change
- ✓ ChatMessage.tsx renders @username and avatar for user messages
- ✓ AuthButton.tsx has profile edit trigger

**Human verification (5 flows):**
1. ✓ Username claim modal auto-opens for new users
2. ✓ Real-time username availability checking works
3. ✓ Profile editing persists across sessions
4. ✓ Avatar crop and upload works correctly
5. ✓ Chat integration shows @username and avatar
6. ✓ Sign out/in preserves profile state

## User Setup Required

**Supabase Migration:**
1. Navigate to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy/paste updated `backend/migrations/006_create_profiles.sql` (with public avatars bucket)
4. Run query
5. Verify 'avatars' bucket is public in Storage section

**Testing:**
1. Sign up or log in with test account
2. If username not claimed: verify UsernameClaimModal appears
3. Claim a username
4. Click "Edit Profile" in sidebar
5. Edit profile fields and upload avatar
6. Send chat message — verify @username and avatar display

## Dependencies

**Requires:**
- Phase 06 Plan 01 (profileStore, useUsernameAvailability, imageResize)
- Phase 05 (OAuth integration, auth state management)
- Phase 04 (Supabase foundation)

**Provides:**
- Complete profile UI system
- Username claim flow for new users
- Profile editing interface
- Avatar crop and upload
- Chat integration with user identity

**Affects:**
- App initialization flow (profile loading on auth)
- Chat UI (user messages show profile data)
- Auth sidebar (profile edit access)

## Next Steps

Phase 06 complete! Next phase will be Phase 07 (deployment/production readiness) or other features as defined in roadmap.

Profile system is now fully functional:
- New users claim unique @username on first login
- Users can edit profile (bio, institution, interests, avatar)
- Chat shows @username and avatar instead of generic "You"
- All data persists to Supabase and survives sessions

## Self-Check

Verifying all claimed artifacts exist and commits are valid...

**Files created:**
- ✓ FOUND: frontend/src/components/profile/UsernameClaimModal.tsx
- ✓ FOUND: frontend/src/components/profile/ProfileEditModal.tsx
- ✓ FOUND: frontend/src/components/profile/AvatarCropUpload.tsx

**Files modified:**
- ✓ FOUND: frontend/src/App.tsx
- ✓ FOUND: frontend/src/components/chat/ChatMessage.tsx
- ✓ FOUND: frontend/src/components/auth/AuthButton.tsx
- ✓ FOUND: frontend/src/stores/profileStore.ts
- ✓ FOUND: backend/migrations/006_create_profiles.sql

**Commits:**
- ✓ FOUND: f367378 (Task 1 - profile UI components)
- ✓ FOUND: eee1c77 (Task 2 - app integration)
- ✓ FOUND: afc4027 (Post-checkpoint fixes)

## Self-Check: PASSED
