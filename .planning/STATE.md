# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-14)

**Core value:** Researchers can read, annotate, and discuss papers with AI — locally and privately by default, with optional cloud features behind authentication
**Current focus:** Phase 7 - Security Polish

## Current Position

Phase: 7 of 7 (Security Polish)
Plan: 2 of 2 in current phase
Status: Complete
Last activity: 2026-02-13 — Completed Phase 7 Plan 02 (Account Deletion)

Progress: [████████░░] ~80%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 4.3 minutes
- Total execution time: 0.63 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 04 | 2 | 1444s (24.1m) | 722s |
| Phase 05 | 2 | 179s (3.0m) | 90s |
| Phase 06 | 2 | 178s (3.0m) | 89s |
| Phase 07 | 2 | 161s (2.7m) | 81s |

**Recent Plans:**

| Plan | Duration | Tasks | Files | Date |
|------|----------|-------|-------|------|
| Phase 07 P02 | 161s (2.7m) | 2 tasks | 6 files | 2026-02-13 |
| Phase 07 P01 | - | - | - | 2026-02-13 |
| Phase 06 P02 | 15s (<1m) | 3 tasks | 9 files | 2026-02-14 |
| Phase 06 P01 | 163s (2.7m) | 2 tasks | 4 files | 2026-02-14 |
| Phase 05 P02 | <1m | 2 tasks | 2 files | 2026-02-14 |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Supabase for auth + DB (free tier, 50K MAU, hosted Postgres, built-in auth)
- Hybrid local + cloud (PDFs stay local for privacy, profiles sync to cloud)
- OAuth (Google + GitHub) + email/password (cover most academic users)
- Auth is optional (local Ollama works without login, cloud AI gated behind account)
- Unique @username (like Instagram handle, displayed in chat instead of "You")
- PKCE flow for Electron OAuth (secure OAuth redirect via custom protocol handler)
- electron-store@8 for secure storage (v9+ is ESM-only, incompatible with CommonJS Electron main)
- Fallback to unencrypted storage if safeStorage unavailable (Linux without keyring shouldn't block app)
- Modal listener pattern for auth modals (matching OnboardingModal pattern)
- AuthButton placed in FileBrowser sidebar for persistent visibility across app states
- Auth initialization non-blocking (app works immediately for offline users)
- lumenai:// custom protocol for OAuth deep linking (enables browser-to-app redirect)
- Single instance lock for Electron (prevents multiple instances, handles Windows/Linux deep links)
- Cold start OAuth URL buffering (pendingOAuthUrl prevents callback loss before window ready)
- username_claimed boolean flag (distinguishes auto-generated usernames from claimed ones)
- Public profile viewing RLS policy (academic profiles should be discoverable)
- Delete old avatar before upload (prevents storage bloat)
- Trigger with EXCEPTION block (profile creation failure doesn't block auth signup)
- Module-level listener pattern for all profile modals (matches LoginModal/SignupModal pattern)
- No close button on UsernameClaimModal (username claim is mandatory for first login)
- Comma-separated input for research interests (start simple vs react-tag-autocomplete)
- Auto-create profile for legacy users (PGRST116 handling for users created before migration)
- Public avatars storage bucket (enable public profile viewing without auth)
- Hard delete for GDPR compliance (shouldSoftDelete: false for permanent data removal)
- Service_role key ONLY in Electron main process (never exposed to renderer for security)
- Cascade deletion order: avatar -> profile -> auth (prevents orphaned data)

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 5 (OAuth Integration):**
- OAuth deep linking in Electron is complex — platform-specific behaviors (macOS open-url vs Windows/Linux second-instance events)
- Must test with packaged builds, not just dev mode
- Linux secure storage fallback — Electron SafeStorage may use plaintext on minimal installs without gnome-keyring/kwallet

**Phase 4-7 (All phases):**
- User must create Supabase project before Phase 4 planning begins (OAuth providers, database schema, RLS policies)
- Supabase onAuthStateChange async deadlock bug — never call Supabase API inside auth callback

## Session Continuity

Last session: 2026-02-13 (Phase 7 Plan 02 execution)
Stopped at: Completed 07-02-PLAN.md — Account Deletion complete (Phase 7 finished)
Resume file: None
Next step: Phase 7 complete! Security polish finished (OAuth deep linking + account deletion). Ready to move to next phase or milestone as defined in roadmap.
