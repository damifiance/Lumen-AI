# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-14)

**Core value:** Researchers can read, annotate, and discuss papers with AI — locally and privately by default, with optional cloud features behind authentication
**Current focus:** Milestone v0.3.0-alpha — Auth & Profiles

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-14 — Milestone v0.3.0-alpha started

## Performance Metrics

**Velocity (from previous milestone):**
- Total plans completed: 4
- Average duration: 2.0 min
- Total execution time: 0.13 hours

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Supabase for auth + DB (free tier, 50K MAU)
- Hybrid local + cloud: PDFs local, profiles in Supabase
- OAuth (Google + GitHub) + email/password
- Auth is optional — local Ollama works without login
- Unique @username displayed in chat

### Pending Todos

None yet.

### Blockers/Concerns

- User needs to create Supabase project before Phase 1 can execute
- OAuth redirect in Electron requires PKCE flow with custom protocol handler

## Session Continuity

Last session: 2026-02-14
Stopped at: Milestone initialization
Resume file: None
Next action: Define requirements, create roadmap

---
*Last updated: 2026-02-14*
