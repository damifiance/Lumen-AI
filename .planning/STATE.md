# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-14)

**Core value:** Researchers can read, annotate, and discuss papers with AI — locally and privately by default, with optional cloud features behind authentication
**Current focus:** Phase 6 - Profile System

## Current Position

Phase: 6 of 7 (Profile System)
Plan: 1 of 2 in current phase
Status: Complete
Last activity: 2026-02-14 — Completed Phase 6 Plan 01 (Profile System Foundation)

Progress: [█████░░░░░] ~50%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 6.9 minutes
- Total execution time: 0.57 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 04 | 2 | 1444s (24.1m) | 722s |
| Phase 05 | 2 | 179s (3.0m) | 90s |
| Phase 06 | 1 | 163s (2.7m) | 163s |

**Recent Plans:**

| Plan | Duration | Tasks | Files | Date |
|------|----------|-------|-------|------|
| Phase 06 P01 | 163s (2.7m) | 2 tasks | 4 files | 2026-02-14 |
| Phase 05 P02 | <1m | 2 tasks | 2 files | 2026-02-14 |
| Phase 05 P01 | 179s (3.0m) | 2 tasks | 6 files | 2026-02-14 |
| Phase 04 P02 | 1260s (21m) | 3 tasks | 5 files | 2026-02-14 |
| Phase 04 P01 | 184s (3.1m) | 2 tasks | 10 files | 2026-02-13 |

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

Last session: 2026-02-14 (Phase 6 Plan 01 execution)
Stopped at: Completed 06-01-PLAN.md — Profile System Foundation complete
Resume file: None
Next step: Phase 6 Plan 02 (Profile UI Components) ready to start. Will build profile viewer, editor, username claim flow, and avatar crop/upload UI.
