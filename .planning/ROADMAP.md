# Roadmap: Lumen AI — Auth & Profiles

## Overview

This milestone adds authentication and user profiles to Lumen AI via Supabase, maintaining the app's local-first architecture. Users can work fully offline with Ollama (no account required), with authentication unlocking cloud AI features and future premium functionality. The roadmap prioritizes foundational infrastructure, isolates OAuth complexity for thorough testing, then builds profile management and security polish.

## Phases

**Phase Numbering:**
- Integer phases (4, 5, 6, 7): Planned milestone work (continuing from last milestone's Phase 3)
- Decimal phases (4.1, 4.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 4: Supabase Foundation & Email Auth** - Backend setup, session persistence, email/password flows
- [ ] **Phase 5: OAuth Integration** - Google and GitHub login with Electron deep linking
- [ ] **Phase 6: Profile System** - Username claiming, avatar upload, profile editing
- [ ] **Phase 7: Security Polish** - Email verification, password reset, account deletion

## Phase Details

### Phase 4: Supabase Foundation & Email Auth
**Goal**: Users can create accounts and log in with email/password, with sessions persisting across app restarts
**Depends on**: Nothing (first phase of this milestone)
**Requirements**: AUTH-01, AUTH-04, AUTH-05, SEC-04, SEC-05
**Success Criteria** (what must be TRUE):
  1. User can sign up with email and password
  2. User can log in with email and password
  3. User session persists across app restarts (tokens stored securely)
  4. User can log out from any screen
  5. App works fully offline with Ollama (no auth required)
  6. Auth actions show loading states and friendly error messages
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md — Electron secure storage IPC + Supabase client + auth store
- [ ] 04-02-PLAN.md — Auth modals (login/signup) + App integration + verification

### Phase 5: OAuth Integration
**Goal**: Users can log in with Google or GitHub accounts via PKCE OAuth flow in Electron
**Depends on**: Phase 4
**Requirements**: AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. User can sign up/log in with Google OAuth
  2. User can sign up/log in with GitHub OAuth
  3. OAuth deep linking works when app is not running (cold start)
  4. OAuth deep linking works when app is already running (warm handoff)
  5. OAuth tokens stored securely via Electron SafeStorage
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 6: Profile System
**Goal**: Users have complete academic profiles with username, avatar, bio, institution, and research interests
**Depends on**: Phase 5
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04, PROF-05
**Success Criteria** (what must be TRUE):
  1. New user must claim a unique @username on first login
  2. User can upload, crop, and save a profile image
  3. User can edit bio, institution, and research interests
  4. Profile changes save to Supabase and persist across sessions
  5. User sees their @username in chat interface (not "You")
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 7: Security Polish
**Goal**: Production-ready auth with email verification, password recovery, and account deletion
**Depends on**: Phase 6
**Requirements**: SEC-01, SEC-02, SEC-03
**Success Criteria** (what must be TRUE):
  1. User receives email verification link after signup
  2. User cannot use account until email is verified
  3. User can request password reset via email link
  4. User can set new password after clicking reset link
  5. User can delete their account and all associated data
  6. Account deletion removes profile, avatar, and Supabase auth record
**Plans**: TBD

Plans:
- [ ] TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 4. Supabase Foundation & Email Auth | 0/2 | Planning complete | - |
| 5. OAuth Integration | 0/TBD | Not started | - |
| 6. Profile System | 0/TBD | Not started | - |
| 7. Security Polish | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-14*
*Milestone: v0.3.0-alpha — Auth & Profiles*
