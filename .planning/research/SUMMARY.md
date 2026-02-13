# Project Research Summary

**Project:** Lumen AI — Milestone 3 (Auth & Profiles)
**Domain:** Hybrid local-first + cloud authentication for Electron PDF reader with React 19 + FastAPI
**Researched:** 2026-02-14
**Confidence:** HIGH

## Executive Summary

Lumen AI needs authentication and user profiles to unlock cloud AI features while preserving its local-first architecture. Research shows this is best achieved using Supabase as a complete auth and profile solution, with PKCE OAuth flow for Electron, encrypted token storage, and hybrid data architecture that keeps PDFs local while syncing only identity/settings to the cloud.

The recommended approach maintains Lumen's core value proposition: fully functional offline with Ollama (no account required), with authentication gating only cloud AI providers (OpenAI, Anthropic). This respects user privacy and avoids the forced-signup dark pattern common in modern apps. The architecture uses Supabase's native JavaScript SDK for frontend auth, Python client for backend JWT validation, and Electron SafeStorage for secure token persistence.

The primary risk is breaking existing local-only workflows during integration. Prevention requires strict feature gating (cloud features only), graceful degradation (offline mode continues working), and maintaining clear boundaries between local SQLite data (papers, highlights, notes) and cloud Supabase data (profiles, API keys, settings). Secondary risks include Electron OAuth deep linking complexity (requires platform-specific handling) and Supabase auth-js deadlock bugs (must avoid async calls in onAuthStateChange callback).

## Key Findings

### Recommended Stack

**Frontend:** Add Supabase JavaScript SDK for auth + storage, react-avatar-editor for avatar cropping, electron-store for non-sensitive preferences. The existing React 19 + Zustand architecture continues unchanged, with a new auth store using Zustand's persist middleware for session management.

**Core technologies:**
- **@supabase/supabase-js 2.95.3+**: Official SDK with OAuth, email/password, and PKCE support for Electron
- **react-avatar-editor 14.0.0+**: Canvas-based avatar cropping (85K weekly downloads, stable)
- **supabase (Python) 2.28.0+**: Backend JWT validation and RLS-aware queries
- **PyJWT 2.11.0+**: Alternative JWT validation (faster than Supabase API calls)
- **Electron SafeStorage (built-in)**: OS-level encrypted token storage (Keychain on macOS, Credential Vault on Windows, libsecret on Linux)

**Critical version note:** DO NOT use @supabase/auth-helpers-react (deprecated). Use supabase-js directly for React apps.

### Expected Features

**Must have (table stakes):**
- Email/password signup and login — standard auth, no OAuth dependencies
- Session persistence across app restarts — essential for desktop apps
- Unique @username claiming — academic identity, shows in chat
- Avatar upload with crop — visual identity baseline
- Cloud AI gating (Ollama free, OpenAI/Anthropic require login) — core value prop
- Logout, password reset, loading states — security and UX baseline

**Should have (competitive):**
- OAuth login (Google + GitHub) — lower friction, but adds Electron PKCE complexity
- Email verification — prevents username squatting
- Academic profile fields (institution, research interests with autocomplete) — positions as academic-first
- Magic link passwordless auth — alternative to passwords
- API key management UI — secure storage in Supabase Vault

**Defer (v2+):**
- Account deletion (GDPR) — required eventually, but can be manual support flow for beta
- Profile privacy controls — needed when social features launch
- Username change grace period — wait for support patterns to emerge
- "Continue with Apple" OAuth — wait to see if Google/GitHub cover 90%+ of users

### Architecture Approach

The integration maintains Lumen's existing single-page React architecture with minimal changes: new auth store (Zustand + persist), new auth components (LoginModal, ProfileModal, SettingsPanel using existing module-level listener pattern), and modified ModelSelector/ChatMessage to show auth-aware UI. Backend adds JWT validation middleware for cloud AI endpoints while leaving Ollama endpoints open.

**Major components:**
1. **Supabase Client Singleton** (`api/supabase.ts`) — single instance prevents auth state desync
2. **Auth Store** (`stores/authStore.ts`) — Zustand with persist middleware for session + profile state
3. **OAuth Handler** (`electron/main.js`) — custom protocol (`lumen://`) registration, platform-specific deep link events
4. **Auth Middleware** (`backend/middleware/auth.py`) — PyJWT validation for cloud AI requests
5. **Profile Components** (`components/auth/`) — LoginModal, ProfileModal, SettingsPanel following existing modal pattern
6. **Hybrid Storage** — Local SQLite (papers, highlights, notes) + Cloud Supabase (profiles, API keys, settings)

**Data boundaries:** Papers never leave device. Identity is portable across devices. No forced cloud sync.

### Critical Pitfalls

1. **OAuth Deep Link Platform Differences** — macOS fires `open-url` event, Windows/Linux fire `second-instance` event. Must handle BOTH or OAuth fails when app is already running. Test with packaged builds, not just dev mode.

2. **Supabase onAuthStateChange Deadlock** — Making ANY async Supabase call inside `onAuthStateChange` callback causes indefinite hang (known bug in auth-js). Never call Supabase API in this callback; defer to separate useEffect watching session state.

3. **Breaking Local Workflows** — Adding auth can accidentally gate local features. Must use feature gating (cloud AI only), not app gating (entire app). Ollama must work without login, offline mode must continue functioning.

4. **Linux Secure Storage Fallback** — Electron SafeStorage falls back to `basic_text` (plaintext) on Linux systems without gnome-keyring/kwallet. Must detect backend with `safeStorage.getSelectedStorageBackend()` and warn users or require additional encryption.

5. **Session Refresh Token Reuse** — Supabase rotates refresh tokens on each refresh. Multiple clients or manual refresh calls can use the same token twice, causing "Invalid refresh token" lockout. Use singleton Supabase client, never call refreshSession() manually.

## Implications for Roadmap

Based on research, suggested phase structure prioritizes foundational infrastructure before user-facing features, isolates OAuth complexity in dedicated phase, and maintains strict separation between local and cloud concerns.

### Phase 1: Supabase Backend & Auth Foundation
**Rationale:** Infrastructure must exist before any UI can use it. Supabase setup, database schema, and RLS policies are prerequisites for all subsequent phases.

**Delivers:**
- Supabase project configured (OAuth providers, database schema, RLS policies)
- Frontend auth store with session persistence
- Backend JWT validation middleware

**Addresses:**
- Foundation for all auth features from FEATURES.md
- Establishes security boundaries (RLS policies) from ARCHITECTURE.md

**Avoids:**
- Pitfall 7 (refresh token reuse) — establish singleton pattern from start
- Pitfall 4 (React Strict Mode double auth) — implement cleanup functions immediately

**Research flag:** Standard patterns, skip /gsd:research-phase

### Phase 2: OAuth Flow & Electron Deep Linking
**Rationale:** OAuth is the hardest technical challenge and most error-prone. Isolate complexity in dedicated phase, test thoroughly with packaged builds before adding UI.

**Delivers:**
- Custom protocol handler (`lumen://`) registered
- Platform-specific deep link event handlers (macOS open-url, Windows/Linux second-instance)
- PKCE code exchange working end-to-end

**Uses:**
- Electron SafeStorage for secure token persistence (STACK.md)
- Supabase PKCE flow documentation (STACK.md sources)

**Implements:**
- OAuth Handler component from ARCHITECTURE.md

**Avoids:**
- Pitfall 1 (OAuth fails when app not running) — platform-specific protocol registration
- Pitfall 2 (OAuth fails when app already running) — handle both event types
- Pitfall 5 (Linux insecure storage) — detect and warn about basic_text backend

**Research flag:** NEEDS research-phase — Electron deep linking is complex, sparse docs, platform-specific edge cases

### Phase 3: Login & Profile UI
**Rationale:** Once backend auth works, build user-facing flows. Email/password first (simpler), then connect OAuth (already tested in Phase 2).

**Delivers:**
- LoginModal with OAuth buttons + email/password form
- ProfileModal for username claiming and profile setup
- ProfileCard showing username + avatar in sidebar
- First-time user flow (signup → username claim → profile)

**Uses:**
- Module-level listener pattern (existing OnboardingModal pattern)
- react-avatar-editor for avatar cropping (STACK.md)

**Addresses:**
- Email/password auth, username claiming, avatar upload (FEATURES.md must-haves)

**Avoids:**
- Pitfall 6 (breaking local workflows) — auth is optional, local features ungated
- Pitfall 3 (onAuthStateChange deadlock) — no Supabase calls in auth callback

**Research flag:** Standard patterns, skip /gsd:research-phase

### Phase 4: Cloud AI Gating
**Rationale:** Auth UI complete. Now gate cloud models to enforce business model (local free, cloud requires account).

**Delivers:**
- ModelSelector filters cloud models by auth state
- Auth check on model change (prompt login if needed)
- Backend validation rejects unauthenticated cloud requests
- Error handling for expired sessions

**Addresses:**
- Cloud AI gating (FEATURES.md core value prop)
- Feature gating not app gating (PITFALLS.md critical pattern)

**Uses:**
- Auth Middleware from ARCHITECTURE.md
- PyJWT validation (STACK.md)

**Avoids:**
- Pitfall 6 (breaking local workflows) — Ollama remains ungated
- Pitfall 8 (API keys exposed) — keys stay backend-only

**Research flag:** Standard patterns, skip /gsd:research-phase

### Phase 5: Settings & Profile Management
**Rationale:** Core flows work. Add management UI for editing profiles, changing settings, logging out.

**Delivers:**
- SettingsPanel with profile editing
- Avatar upload/change flow
- API key management placeholder (full implementation deferred)
- Sign out functionality

**Addresses:**
- Profile editing (FEATURES.md table stakes)
- API key management UI (FEATURES.md should-have, implementation deferred to v1.x)

**Uses:**
- Supabase Storage for avatar uploads (STACK.md)
- RLS policies on avatars bucket (ARCHITECTURE.md)

**Research flag:** Standard patterns, skip /gsd:research-phase

### Phase 6: Polish & Edge Cases
**Rationale:** Core features complete. Handle error states, loading states, edge cases for production readiness.

**Delivers:**
- Loading spinners for auth operations
- Error handling (network errors, invalid credentials, expired sessions)
- Email verification flow
- Password reset flow
- Session expiry UX

**Addresses:**
- Loading states + error messages (FEATURES.md baseline)
- Email verification (FEATURES.md should-have)
- Password reset (FEATURES.md table stakes)

**Avoids:**
- UX pitfalls from PITFALLS.md (silent session expiry, technical error messages)

**Research flag:** Standard patterns, skip /gsd:research-phase

### Phase Ordering Rationale

- **Phase 1 before 2-6:** Infrastructure must exist before features can use it
- **Phase 2 isolated:** OAuth deep linking is hardest technical challenge; test separately before UI
- **Phase 3 before 4:** UI must exist before gating can prompt login
- **Phase 4 before 5:** Core gating logic must work before adding management UI
- **Phase 6 last:** Polish touches all previous phases; needs everything working

**Dependency chain:** 1 → 2 → 3 → 4 → 5 → 6 (strictly sequential)

**Parallel opportunities:** None — each phase depends on previous completion

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (OAuth & Deep Linking):** Complex Electron integration, platform-specific behaviors, sparse documentation for OAuth + PKCE + deep links combination

Phases with standard patterns (skip research-phase):
- **Phase 1 (Supabase Backend):** Well-documented official Supabase setup guides
- **Phase 3 (Login UI):** Standard React form patterns, module-level listener pattern already in codebase
- **Phase 4 (Cloud AI Gating):** JWT validation is standard FastAPI middleware pattern
- **Phase 5 (Settings UI):** CRUD operations on profiles table, standard patterns
- **Phase 6 (Polish):** Error handling and loading states, standard UX patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official Supabase SDKs, well-documented libraries, existing Lumen architecture proven |
| Features | HIGH | Table stakes validated against Zotero/Mendeley/ResearchGate competitors, academic user patterns well-documented |
| Architecture | HIGH | Supabase + Electron integration patterns verified from official docs, existing Lumen patterns (modal listeners, Zustand stores) applicable |
| Pitfalls | MEDIUM-HIGH | OAuth deep linking pitfalls verified from GitHub issues, onAuthStateChange deadlock is known bug, Linux storage fallback confirmed in Electron docs |

**Overall confidence:** HIGH

### Gaps to Address

Research was comprehensive, but some areas need validation during implementation:

- **Electron SafeStorage on Linux minimal installs:** Test on Ubuntu Server, Debian minimal, Alpine to verify detection logic catches all insecure backends
- **Session refresh timing:** Supabase default is 1-hour access token expiry. Validate that auto-refresh happens transparently without UX interruption
- **Username uniqueness race conditions:** Theoretical gap — two users claiming same username simultaneously. Supabase RLS + unique constraint should handle, but needs load testing
- **OAuth callback timeout:** Google/GitHub OAuth tokens expire quickly. Validate that slow user approval (e.g., user distracted for 5 minutes) doesn't break flow

**Handling strategy:** Validate during Phase 1 (Linux storage), Phase 2 (OAuth timing), Phase 3 (username races), Phase 4 (session refresh). Add automated tests where possible.

## Sources

### Primary (HIGH confidence)
- Supabase JavaScript API Reference — auth methods, session management, PKCE flow
- Supabase Row Level Security Guide — RLS policies, auth.uid() patterns
- Supabase Vault Documentation — encrypted API key storage
- Electron SafeStorage API — OS-level encryption, backend detection
- Electron Deep Links Tutorial — custom protocol registration, platform-specific events
- FastAPI Settings and Environment Variables — configuration patterns
- PyJWT Documentation — JWT decoding and validation
- React StrictMode Reference — double-render behavior, cleanup requirements

### Secondary (MEDIUM confidence)
- Supabase auth-js deadlock issue (#762) — onAuthStateChange async bug
- Supabase session hanging issue (#41968) — related auth-js bug
- Electron deep linking cold start issue (#40173) — Windows/Linux argv handling
- Supabase Electron integration guide (bootstrapped.app) — practical patterns
- Supabase FastAPI authorization guide (hashnode) — middleware implementation
- React avatar editor library (mosch/react-avatar-editor) — cropping patterns

### Tertiary (LOW confidence)
- Supabase Electron auth discussion (#27181) — deep linking approach, community patterns
- Best practices for avatars discussion (#18877) — storage patterns
- FastAPI Supabase integration discussion (#33811) — architecture patterns

---
*Research completed: 2026-02-14*
*Ready for roadmap: yes*
