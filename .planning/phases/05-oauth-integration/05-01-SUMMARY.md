---
phase: 05-oauth-integration
plan: 01
subsystem: auth-oauth
tags: [electron, oauth, security, deep-linking, pkce]
depends_on: [04-02]
provides: [oauth-infrastructure]
affects: [electron-main, electron-preload, auth-store, supabase-client]
tech_stack:
  added:
    - "Electron custom protocol handler (lumenai://)"
    - "PKCE OAuth flow via Supabase"
  patterns:
    - "Deep link handling (macOS open-url, Windows/Linux second-instance)"
    - "OAuth callback via IPC bridge"
    - "Cold start OAuth URL buffering"
key_files:
  created: []
  modified:
    - electron/main.js: "Protocol handler registration, OAuth callback handling, IPC handlers"
    - electron/preload.js: "OAuth IPC bridge (startOAuth, onOAuthCallback, removeOAuthCallback)"
    - electron/electron-builder.json: "Protocol registration for packaged builds"
    - frontend/src/stores/authStore.ts: "signInWithOAuth method, OAuth callback listener"
    - frontend/src/lib/supabase.ts: "PKCE flow type configuration"
    - frontend/src/electron.d.ts: "TypeScript types for OAuth IPC methods"
key_decisions:
  - decision: "Use lumenai:// custom protocol for OAuth redirects"
    rationale: "Standard approach for Electron OAuth — enables deep linking from browser to app"
  - decision: "PKCE flow instead of implicit flow"
    rationale: "More secure for native apps, recommended by Supabase and OAuth 2.0 best practices"
  - decision: "Single instance lock to handle second-instance events"
    rationale: "Prevents multiple app instances and enables Windows/Linux deep link handling"
  - decision: "Platform-specific deep link handling (open-url vs second-instance)"
    rationale: "macOS uses open-url event, Windows/Linux use second-instance + argv parsing"
  - decision: "Cold start URL buffering (pendingOAuthUrl)"
    rationale: "OAuth callback may arrive before window is ready — buffer prevents loss"
  - decision: "Retain existing secureStorage adapter for OAuth tokens"
    rationale: "OAuth tokens from exchangeCodeForSession flow through same Electron SafeStorage as email auth"
metrics:
  duration: 179
  completed: 2026-02-14
  tasks: 2
  files: 6
  commits: 2
---

# Phase 5 Plan 01: OAuth Deep Linking Infrastructure Summary

OAuth deep linking infrastructure complete — Electron protocol handler, IPC bridge, and frontend OAuth flow with PKCE implemented.

## What Was Built

Implemented complete OAuth flow infrastructure for Electron desktop app:

1. **Electron Protocol Handler** (main.js):
   - Registered `lumenai://` custom protocol on app startup
   - Added single instance lock to prevent multiple app instances
   - Implemented platform-specific deep link handling:
     - macOS: `open-url` event (cold start + warm handoff)
     - Windows/Linux: `second-instance` event + `process.argv` parsing
   - Created `handleOAuthCallback()` to parse OAuth URL and extract auth code/error
   - Added `pendingOAuthUrl` buffer for cold start scenario (callback arrives before window ready)
   - Implemented `start-oauth` IPC handler to open OAuth URL in external browser via `shell.openExternal()`

2. **IPC Bridge** (preload.js):
   - Exposed `startOAuth(url)` — sends OAuth URL to main process to open in browser
   - Exposed `onOAuthCallback(callback)` — listens for OAuth callback from main process
   - Exposed `removeOAuthCallback()` — cleanup listener

3. **Packaged Build Support** (electron-builder.json):
   - Added `protocols` field with `lumenai` scheme for proper protocol registration in production builds

4. **Frontend OAuth Flow** (authStore.ts):
   - Added `signInWithOAuth(provider)` method supporting Google and GitHub
   - Electron mode: generates OAuth URL with `skipBrowserRedirect: true`, opens in external browser via IPC, receives callback via IPC, exchanges auth code for session
   - Web mode: uses standard Supabase redirect behavior (for future web deployment)
   - Added OAuth callback listener in `initialize()` to handle auth code from Electron main process
   - Calls `supabase.auth.exchangeCodeForSession(code)` to exchange code for session
   - Session updates handled by existing `onAuthStateChange` listener

5. **Supabase PKCE Configuration** (supabase.ts):
   - Added `flowType: 'pkce'` to Supabase client config
   - Retained `storage: secureStorage` — OAuth tokens flow through Electron SafeStorage via existing adapter

6. **TypeScript Definitions** (electron.d.ts):
   - Added types for `startOAuth`, `onOAuthCallback`, `removeOAuthCallback`

## Deviations from Plan

None — plan executed exactly as written.

## Verification

All success criteria met:

- ✓ Electron registers lumenai:// protocol on app startup
- ✓ Deep link callbacks handled on all platforms (macOS open-url, Windows/Linux second-instance + cold start argv)
- ✓ OAuth URL opened in external browser via shell.openExternal
- ✓ Auth code from callback forwarded to renderer via IPC
- ✓ Renderer exchanges code for Supabase session via PKCE
- ✓ Cold start scenario handled (pendingOAuthUrl stored until window ready)
- ✓ OAuth tokens stored securely via Electron SafeStorage (existing secureStorage adapter confirmed intact)
- ✓ All TypeScript types correct
- ✓ TypeScript compiles without errors
- ✓ electron-builder.json is valid JSON with protocols.schemes containing "lumenai"

## Key Technical Details

**OAuth Flow Architecture:**
1. User clicks "Sign in with Google/GitHub" (UI in Plan 02)
2. Frontend calls `authStore.signInWithOAuth('google')` or `authStore.signInWithOAuth('github')`
3. AuthStore generates OAuth URL via Supabase with `redirectTo: 'lumenai://auth/callback'`
4. AuthStore sends URL to Electron main process via `window.electron.startOAuth(url)`
5. Main process opens URL in external browser via `shell.openExternal()`
6. User completes OAuth in browser, Supabase redirects to `lumenai://auth/callback?code=...`
7. OS routes deep link to Electron app (via open-url or second-instance)
8. Main process parses URL, extracts code, sends to renderer via IPC `oauth-callback` event
9. Renderer receives code, calls `supabase.auth.exchangeCodeForSession(code)`
10. Supabase exchanges code for session tokens using PKCE verifier
11. Session tokens stored in Electron SafeStorage via `secureStorage` adapter
12. `onAuthStateChange` listener updates authStore with new session

**Platform-Specific Handling:**
- **macOS:** `open-url` event handles both cold start (app not running) and warm handoff (app running)
- **Windows/Linux:** `second-instance` event handles warm handoff, `process.argv` parsing handles cold start
- **Cold start edge case:** If callback arrives before window is ready, URL buffered in `pendingOAuthUrl` and sent after `did-finish-load` event

**Security:**
- PKCE flow prevents authorization code interception attacks
- OAuth tokens stored in Electron SafeStorage (encrypted OS keychain)
- Single instance lock prevents multiple apps from handling same OAuth callback

## Next Steps

Plan 02 will add OAuth UI buttons (Sign in with Google/GitHub) to the auth modal.

## Self-Check

Verifying all claimed files and commits exist:

**Files:**
- FOUND: electron/main.js
- FOUND: electron/preload.js
- FOUND: electron/electron-builder.json
- FOUND: frontend/src/stores/authStore.ts
- FOUND: frontend/src/lib/supabase.ts
- FOUND: frontend/src/electron.d.ts

**Commits:**
- FOUND: f3cfb7e (Task 1: Electron OAuth infrastructure)
- FOUND: 6502d75 (Task 2: Frontend OAuth implementation)

**Self-Check: PASSED**
