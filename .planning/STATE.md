# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-14)

**Core value:** Researchers can read, annotate, and discuss papers with AI — locally and privately by default, with optional cloud features behind authentication
**Current focus:** Phase 4 - Supabase Foundation & Email Auth

## Current Position

Phase: 4 of 7 (Supabase Foundation & Email Auth)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-02-14 — Roadmap created for v0.3.0-alpha milestone

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: N/A
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: None yet
- Trend: N/A

*Updated after each plan completion*

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

Last session: 2026-02-14 (roadmap creation)
Stopped at: Roadmap and STATE.md written, requirements traceability updated
Resume file: None
