# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-14)

**Core value:** Researchers can read, annotate, and discuss papers with AI — locally and privately by default, with optional cloud features behind authentication
**Current focus:** Phase 4 - Supabase Foundation & Email Auth

## Current Position

Phase: 4 of 7 (Supabase Foundation & Email Auth)
Plan: 1 of TBD in current phase
Status: In progress
Last activity: 2026-02-13 — Completed Phase 4 Plan 01 (Supabase Foundation)

Progress: [█░░░░░░░░░] ~10%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 3.1 minutes
- Total execution time: 0.05 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 04 | 1 | 184s (3.1m) | 184s |

**Recent Plans:**

| Plan | Duration | Tasks | Files | Date |
|------|----------|-------|-------|------|
| Phase 04 P01 | 184s | 2 tasks | 10 files | 2026-02-13 |

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

Last session: 2026-02-13 (Phase 4 Plan 01 execution)
Stopped at: Completed 04-01-PLAN.md — Supabase foundation and secure storage infrastructure ready
Resume file: None
Next step: User must create Supabase project and add env vars before continuing to Plan 02
