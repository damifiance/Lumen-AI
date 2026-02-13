# Pitfalls Research: Adding Supabase Auth to Existing Electron App

**Domain:** Retrofitting authentication and cloud features into local-first desktop application
**Researched:** 2026-02-14
**Confidence:** MEDIUM-HIGH

> Focus: Common mistakes when ADDING Supabase auth to an existing Electron + React app that was originally fully local. Not generic auth advice, but integration-specific pitfalls.

## Critical Pitfalls

### Pitfall 1: OAuth Deep Link Fails When App Not Running

**What goes wrong:**
User clicks OAuth callback URL (e.g., `lumen://auth/callback?code=...`) after authenticating with Google/GitHub, but the app doesn't launch, leaving the user stranded in the browser with no way to complete authentication.

**Why it happens:**
On **macOS and Linux**, deep linking only works when the app is packaged and properly installed. Development builds fail silently. On **Windows**, `app.setAsDefaultProtocolClient()` needs different parameters for development vs production. Many developers test OAuth in development, see it fail, and assume their implementation is wrong.

**How to avoid:**
1. Always test OAuth flow with a packaged build first (use `electron-builder` to create a proper installer)
2. For Windows development, call `setAsDefaultProtocolClient()` with extra parameters:
   ```javascript
   if (process.env.NODE_ENV === 'development') {
     app.setAsDefaultProtocolClient('lumen', process.execPath, [path.resolve(process.argv[1])])
   } else {
     app.setAsDefaultProtocolClient('lumen')
   }
   ```
3. Update `package.json` build config to include protocol handler in all platforms:
   - macOS: Add to `Info.plist` via `electron-builder.json`
   - Windows: Automatically registered by electron-builder
   - Linux: Add to `.desktop` file

**Warning signs:**
- OAuth works in browser but clicking callback URL does nothing
- Console shows "No application found for custom protocol"
- OAuth only works if app is already running

**Phase to address:**
Phase 1 (Supabase Setup & Auth Backend) — test with packaged builds before marking as complete

---

### Pitfall 2: OAuth Deep Link Works But App Is Already Running

**What goes wrong:**
App is already open when user completes OAuth flow. The callback URL fires, but nothing happens — the app doesn't navigate to the auth handler, leaving the user logged out despite successful OAuth approval.

**Why it happens:**
When a deep link is clicked while the app is running, Electron fires different events on different platforms:
- **macOS**: Fires `open-url` event
- **Windows/Linux**: Fires `second-instance` event (NOT `open-url`)

Most tutorials only show the `open-url` handler, which works during development testing (app not running) but fails in real usage (app already open).

**How to avoid:**
Handle **both** events in `main.js`:

```javascript
// For macOS when app is already running
app.on('open-url', (event, url) => {
  event.preventDefault()
  handleDeepLink(url)
})

// For Windows/Linux when app is already running
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // commandLine contains the deep link URL
  const url = commandLine.find(arg => arg.startsWith('lumen://'))
  if (url) handleDeepLink(url)

  // Focus the existing window
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// For when app launches via deep link (not already running)
// Must also check process.argv on startup!
if (process.platform === 'win32' || process.platform === 'linux') {
  const url = process.argv.find(arg => arg.startsWith('lumen://'))
  if (url) handleDeepLink(url)
}
```

**Warning signs:**
- OAuth works when app is closed, fails when app is open
- No error messages — just nothing happens
- OAuth flow completes successfully in browser but app remains logged out

**Phase to address:**
Phase 1 (Supabase Setup & Auth Backend) — must handle all platform event paths

---

### Pitfall 3: Async Supabase Calls in onAuthStateChange Cause Deadlock

**What goes wrong:**
App hangs whenever authentication state changes. The UI freezes, and subsequent Supabase calls never return. This is especially noticeable during login, logout, or session refresh (which happens every hour).

**Why it happens:**
**Critical bug in supabase-js**: Making ANY async Supabase API call inside the `onAuthStateChange` callback causes a deadlock. The lock mechanism has reentrancy issues where storage operations inside the lock trigger additional lock-related events, creating a circular wait condition.

Example that WILL deadlock:
```javascript
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session) {
    // THIS WILL HANG THE APP
    const { data } = await supabase.from('profiles').select('*')
  }
})
```

**How to avoid:**
**Never make Supabase calls inside `onAuthStateChange`**. Instead, use the session data provided and defer any database calls:

```javascript
// GOOD: No async Supabase calls
supabase.auth.onAuthStateChange((event, session) => {
  setSession(session)
  // Trigger side effects via state changes, not direct calls
})

// In a separate useEffect that watches session state
useEffect(() => {
  if (session) {
    loadUserProfile() // This can safely call Supabase
  }
}, [session])
```

Alternative: Use a message queue or setTimeout to break the execution context:
```javascript
supabase.auth.onAuthStateChange((event, session) => {
  setTimeout(async () => {
    // Now safe to call Supabase (different execution context)
    const { data } = await supabase.from('profiles').select('*')
  }, 0)
})
```

**Warning signs:**
- `supabase.auth.getSession()` hangs indefinitely
- App freezes for exactly 60 minutes, then unfreezes (session refresh timing)
- Works fine initially, but hangs after first session refresh
- Error: "AbortError" on subsequent auth calls

**Phase to address:**
Phase 1 (Supabase Setup & Auth Backend) — critical to establish pattern correctly from start

---

### Pitfall 4: React 19 Strict Mode Causes Double Auth Initialization

**What goes wrong:**
User logs in twice, session is created twice, auth state flickers between logged in/logged out, or you see duplicate profile creation attempts.

**Why it happens:**
React 19 Strict Mode (enabled by default in development) intentionally mounts/unmounts components twice to verify proper cleanup. This means `useEffect` auth initialization runs twice:

```javascript
useEffect(() => {
  // This runs TWICE in Strict Mode
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    setSession(session)
  })

  // If you don't return cleanup, second mount leaks the first listener
  return () => subscription.unsubscribe()
}, [])
```

Without proper cleanup, you have TWO active listeners, causing duplicate events for every auth state change.

**How to avoid:**
1. **Always return cleanup function** from useEffect:
   ```javascript
   useEffect(() => {
     const { data: { subscription } } = supabase.auth.onAuthStateChange(...)

     return () => {
       subscription.unsubscribe() // Critical!
     }
   }, [])
   ```

2. **Use AbortController for fetch requests**:
   ```javascript
   useEffect(() => {
     const controller = new AbortController()

     fetch('/api/profile', { signal: controller.signal })
       .then(...)

     return () => controller.abort()
   }, [])
   ```

3. **Make auth initialization idempotent** — if called twice, should not create duplicate state

**Warning signs:**
- Network tab shows duplicate API calls
- Console shows auth state changes multiple times per event
- Profile created twice in database
- "User already exists" errors during signup

**Phase to address:**
Phase 1 (Supabase Setup & Auth Backend) — establish cleanup pattern from start

---

### Pitfall 5: Storing Refresh Tokens in localStorage on Linux (Insecure)

**What goes wrong:**
User's refresh token (which never expires and grants full account access) is stored in plaintext on disk. Anyone with filesystem access can steal it and hijack the account indefinitely.

**Why it happens:**
Electron's `safeStorage` API uses different backends per platform:
- **macOS**: System Keychain (secure)
- **Windows**: Credential Manager (secure)
- **Linux**: gnome-libsecret or kwallet (secure IF available)

On Linux, if neither gnome-keyring nor kwallet is available (common in minimal installs, Docker, or headless environments), `safeStorage` falls back to `basic_text` — which is just plaintext encryption with a hardcoded password.

You can detect this with:
```javascript
const backend = safeStorage.getSelectedStorageBackend() // returns "basic_text" = INSECURE
```

Many developers test on macOS/Windows, never discover the Linux fallback issue, and ship with insecure token storage.

**How to avoid:**
1. **Check the storage backend** before storing sensitive data:
   ```javascript
   if (safeStorage.getSelectedStorageBackend() === 'basic_text') {
     // Warn user: "Secure storage unavailable. Install gnome-keyring or kwallet."
     // Or fall back to web-only auth (localStorage in browser is acceptable there)
   }
   ```

2. **Encrypt tokens yourself** before storing if `basic_text` detected:
   ```javascript
   import crypto from 'crypto'

   function encryptToken(token, userPassword) {
     // Use password-based encryption (PBKDF2 + AES-256)
     // Store only encrypted token; require password on app launch
   }
   ```

3. **Require password on launch** (like password managers do) if secure storage unavailable

4. **Document Linux requirements** — tell users to install `gnome-keyring` or `kwallet`

**Warning signs:**
- `safeStorage.getSelectedStorageBackend()` returns "basic_text"
- Tokens stored in plaintext in `~/.config/lumen/` or similar
- Security audit flags plaintext secrets

**Phase to address:**
Phase 1 (Supabase Setup & Auth Backend) — must handle before shipping

---

### Pitfall 6: Breaking Existing Local-Only Workflows

**What goes wrong:**
User who was happily using the app offline with Ollama suddenly can't use the app without logging in, or features that worked before now require authentication, or the app crashes/breaks when offline.

**Why it happens:**
When retrofitting auth into an existing app, developers often:
1. Add auth checks globally without considering existing paths
2. Assume network is always available (breaks offline)
3. Gate features that should remain local-only
4. Migrate existing local data to cloud without user consent

**How to avoid:**
1. **Feature gating, not app gating**:
   ```javascript
   // BAD: Gates the entire app
   if (!session) return <LoginScreen />

   // GOOD: Gates only cloud features
   function selectCloudModel(model) {
     if (!session) {
       showModal("Login required for cloud AI")
       return
     }
     // ...
   }
   ```

2. **Graceful degradation pattern**:
   ```javascript
   function getAvailableModels() {
     const local = getOllamaModels() // Always available
     const cloud = session ? getCloudModels() : []
     return [...local, ...cloud]
   }
   ```

3. **Hybrid data model** — keep clear boundaries:
   - **Local SQLite**: PDFs, highlights, notes (never synced)
   - **Supabase**: Profiles, API keys, settings (requires auth)
   - **No mixing**: Don't move existing local data to cloud

4. **Offline-first checks**:
   ```javascript
   if (!navigator.onLine && requiresCloud(feature)) {
     showError("Feature requires internet connection")
     return
   }
   ```

**Warning signs:**
- Existing users complain app "stopped working"
- App requires login to access previously local features
- Offline mode is broken
- User data synced to cloud without permission

**Phase to address:**
All phases — especially Phase 3 (Cloud AI Gating) where boundaries are established

---

### Pitfall 7: Session Refresh Token Reuse Lockout

**What goes wrong:**
User is suddenly logged out with "Invalid refresh token" error. Attempting to log in again fails. Session works for ~1 hour, then breaks.

**Why it happens:**
Supabase has **refresh token rotation** enabled by default (security feature). Each refresh token can only be used ONCE. After ~1 hour (when access token expires), the app automatically refreshes the session using the refresh token, which returns a NEW refresh token.

If you:
1. Have multiple tabs/windows open (each tries to refresh with same token)
2. Call `refreshSession()` manually while auto-refresh is happening
3. Store refresh token in multiple places and they get out of sync
4. App crashes/closes during refresh (new token not saved)

...you'll use the old refresh token twice, which Supabase rejects as a replay attack.

**How to avoid:**
1. **Single source of truth** for Supabase client:
   ```javascript
   // Singleton pattern — ONE client instance across entire app
   let supabaseClient = null
   export function getSupabase() {
     if (!supabaseClient) {
       supabaseClient = createClient(...)
     }
     return supabaseClient
   }
   ```

2. **Don't call refreshSession() manually** — let auto-refresh handle it

3. **In Electron, ensure token storage is atomic**:
   ```javascript
   supabase.auth.onAuthStateChange((event, session) => {
     if (session) {
       // Save BEFORE any async operation that could crash
       ipcRenderer.invoke('save-session', session)
     }
   })
   ```

4. **Configure reuse interval** (Supabase dashboard → Auth → Settings):
   - Default: 0 seconds (no reuse allowed)
   - Set to 10 seconds to handle race conditions (but less secure)

**Warning signs:**
- "Invalid refresh token" errors after ~1 hour
- Login works, then stops working after first session expiry
- Multiple "GoTrueClient instances detected" warnings

**Phase to address:**
Phase 1 (Supabase Setup & Auth Backend) — critical for session reliability

---

### Pitfall 8: API Keys Stored in Supabase But Readable Client-Side

**What goes wrong:**
User's OpenAI/Anthropic API keys (worth real money) are exposed via browser DevTools or Electron's remote debugging, allowing anyone to steal and abuse them.

**Why it happens:**
Developers store API keys in Supabase with RLS (Row Level Security), thinking "only the user can read their own keys" means they're secure. But if the client-side code can read them, so can anyone who inspects the client.

```javascript
// BAD: Keys are encrypted in Supabase but DECRYPTED client-side
const { data } = await supabase
  .from('api_keys')
  .select('openai_key') // Now visible in Network tab!

await fetch('https://api.openai.com/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${data.openai_key}` } // Exposed!
})
```

**How to avoid:**
**Never send API keys to the client**. Use server-side proxy:

1. **Store keys in Supabase** (encrypted at rest) ✓
2. **Create Supabase Edge Function** (Deno) that:
   - Fetches user's API key (server-side, never exposed)
   - Makes request to OpenAI/Anthropic with that key
   - Returns response to client
3. **Client calls Edge Function**, never touches API key:
   ```javascript
   // GOOD: Client never sees the API key
   const response = await supabase.functions.invoke('call-openai', {
     body: { prompt: '...' }
   })
   ```

**For Electron specifically:**
- Could also proxy through FastAPI backend (local server)
- Store keys in Electron's secure storage, send to backend via IPC
- Backend makes API calls, frontend never sees keys

**Warning signs:**
- API keys visible in Network tab
- Keys appear in Redux DevTools or React DevTools
- Keys logged to console
- Security audit flags exposed secrets

**Phase to address:**
Phase 3 (Cloud AI Gating) — must implement proxy before exposing API key management

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing session in localStorage instead of Electron safeStorage | Works in both browser and Electron with same code | Refresh tokens exposed on disk; security vulnerability | Development/testing only — never production |
| Disabling React Strict Mode to avoid double calls | "Fixes" auth initialization issues | Hides bugs that will appear in production; React 19+ may require it | Never — fix root cause instead |
| Using setTimeout(0) to avoid onAuthStateChange deadlock | Quick fix without refactoring | Hides race conditions; doesn't solve root cause | Acceptable short-term, but refactor to separate concerns |
| Skipping email verification in development | Faster testing iteration | Forget to enable in production; spam accounts | Acceptable in dev, must enable for production |
| Using same OAuth redirect URL for dev and prod | Simpler setup | Breaks when testing with packaged builds; localhost doesn't work in production | Never — use different callback URLs per environment |
| Storing all user data in Supabase immediately | Simplifies architecture | Forces users to log in for local-only features; breaks offline mode | Never for local-first apps |
| Using username as primary key instead of UUID | Simpler queries | Username changes break all foreign keys; migration nightmare | Never — always use stable UUID |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth in Electron | Using `window.location.href` for OAuth redirect | Use custom protocol handler (`lumen://`) + deep linking |
| Supabase RLS policies | Testing only as authenticated user | Test as anonymous user, wrong user, and correct user |
| OAuth provider setup | Forgetting to add custom protocol to allowed redirect URLs | Add `lumen://auth/callback` to Google/GitHub OAuth app config |
| Supabase Storage (avatars) | No size/format validation before upload | Validate client-side (quick feedback) AND server-side (security) |
| Email/password signup | No email validation regex | Use proper email validation; Supabase will accept invalid emails |
| Session persistence | Assuming session auto-saves | Must manually persist to Electron secure storage via IPC |
| Profile creation | Creating profile in separate API call after signup | Use Supabase database trigger to auto-create profile on auth.users insert |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all profiles on auth check | Slow login as user count grows | Only load current user's profile; paginate if listing others | >1000 users |
| Uploading full-size avatar images | 10MB+ uploads; slow profile page | Resize client-side before upload (max 500px square) | First HD phone photo |
| Not using Supabase Storage CDN | Slow avatar loading from primary region | Enable CDN in Supabase dashboard | Users outside primary region |
| Fetching API keys on every AI request | Unnecessary DB queries | Cache in memory after first fetch; invalidate on key rotation | High AI usage |
| No database indexes on profiles.username | Slow username uniqueness checks during signup | Add unique index (created automatically by UNIQUE constraint) | >10k profiles |
| Storing chat history in Supabase | Massive storage costs; slow queries | Keep chat history local (SQLite); only sync profiles/settings | >100 chats per user |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Not validating username format server-side | SQL injection via username; reserved word conflicts | Server-side validation: `/^[a-z0-9_]{3,30}$/` + reserved words list |
| Exposing Supabase anon key | Allows anyone to bypass auth and access public data | **Expected** — anon key is public. Security comes from RLS policies. |
| Storing API keys client-side | Keys stolen via DevTools; abused for costly API calls | Use server-side proxy (Edge Functions or FastAPI backend) |
| No rate limiting on auth endpoints | Brute-force attacks; credential stuffing | Enable Supabase rate limiting (free tier includes basic protection) |
| Trusting OAuth provider data | User could manipulate email via MITM | Always verify email via Supabase's email confirmation flow |
| Not requiring email verification | Fake accounts; spam; disposable emails | Require email verification before username claim (Phase 4) |
| Hardcoding Supabase URL/keys | Keys in version control; leaked in compiled Electron app | Use environment variables; Electron app can read from `.env` file |
| Avatar upload without size limit | Storage bomb attacks (upload 1GB images) | Enforce max file size (e.g., 5MB) in Supabase Storage bucket policies |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Requiring login before explaining value | User sees login screen, closes app | Show app capabilities first, prompt login only when accessing cloud features |
| No indication that local features work offline | User assumes they need to login to use anything | Prominent "No account needed for local AI" message |
| Session expires silently | User thinks feature is broken when request fails | Detect expired session, show "Session expired, please log in again" modal |
| Username already taken error after long form | User fills bio/interests, then finds username is taken | Check username availability in real-time with debounced API call |
| No loading state during avatar upload | Upload takes 5s, no feedback, user clicks again | Show progress bar; disable upload button during upload |
| Auth error messages are technical | "Invalid grant" (OAuth error) confuses user | Map error codes to friendly messages: "Login expired, try again" |
| Forcing cloud sync of local data | User loses control of their PDFs/notes | Make sync opt-in; clearly label what's local vs cloud |
| No way to log out | User stuck in account they don't want | Always provide visible "Log out" button in settings |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **OAuth flow:** Often missing second-instance handler — verify OAuth works when app is ALREADY running (not just cold start)
- [ ] **Session persistence:** Often missing Electron storage sync — verify session survives app restart (don't rely on memory)
- [ ] **Profile creation:** Often missing email verification gate — verify user can't claim username without verified email
- [ ] **Avatar upload:** Often missing server-side validation — verify can't upload 100MB file or invalid format
- [ ] **API key security:** Often missing server proxy — verify keys never appear in Network tab / DevTools
- [ ] **Linux support:** Often missing safeStorage backend check — verify tokens are secure on minimal Linux installs
- [ ] **Offline mode:** Often missing offline state handling — verify app doesn't crash when offline after adding auth
- [ ] **Session refresh:** Often missing singleton Supabase client — verify no "multiple instances" warnings and no duplicate refreshes
- [ ] **Username uniqueness:** Often missing race condition handling — verify two users can't claim same username simultaneously
- [ ] **Auth cleanup:** Often missing useEffect cleanup — verify no duplicate auth state listeners (check in Strict Mode)
- [ ] **RLS policies:** Often missing anonymous user tests — verify unauthenticated users can't read other profiles
- [ ] **Deep linking:** Often missing macOS/Linux packaging — verify OAuth callback works in packaged app, not just development

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| OAuth deep link broken on macOS | LOW | Release hotfix with proper Info.plist configuration; users must reinstall app |
| Refresh token lockout | LOW | User must log in again (session lost); no data lost; fix by ensuring singleton client |
| API keys exposed client-side | HIGH | Rotate all affected API keys (user action required); deploy proxy architecture; notify users via email |
| Duplicate profiles created | MEDIUM | Database migration to merge duplicates; identify primary profile (latest or most complete); update foreign keys |
| React Strict Mode double auth | LOW | Add cleanup function to useEffect; deploy update; no user action needed |
| Linux insecure storage | MEDIUM | Add storage backend check; force re-login to migrate to secure storage; warn users to install keyring |
| Local workflows broken by auth | HIGH | Remove auth gates from local features; deploy hotfix; user trust damaged — requires careful messaging |
| Session refresh loop | MEDIUM | Revoke all sessions via Supabase dashboard; users must re-login; fix auto-refresh logic |
| Username collision | LOW | Prompt affected users to choose new username on next login; extremely rare if proper validation exists |
| Avatar upload bomb | LOW | Delete oversized files from Storage; enforce size limits; affected users must re-upload |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| OAuth deep link fails (app not running) | Phase 1 | Test with packaged build on all platforms (macOS/Windows/Linux) |
| OAuth deep link fails (app already running) | Phase 1 | Test OAuth flow with app already open; verify all event handlers |
| Async calls in onAuthStateChange deadlock | Phase 1 | Manual code review; test session refresh by advancing system clock 1 hour |
| React Strict Mode double auth | Phase 1 | Check for cleanup functions in all useEffects; verify single subscription in DevTools |
| Insecure token storage on Linux | Phase 1 | Test on Linux VM without gnome-keyring; verify safeStorage backend detection |
| Breaking local workflows | Phase 3 | Acceptance test: New user uses Ollama without ever logging in |
| Session refresh token reuse | Phase 1 | Test by manually triggering session refresh multiple times; check for token rotation errors |
| API keys exposed client-side | Phase 3 | Security audit: Verify keys never appear in Network tab when making AI requests |
| No email verification before profile | Phase 4 | Attempt to create profile with unverified email; should be blocked |
| Username race condition | Phase 2 | Load test: 10 concurrent users try to claim same username; verify only 1 succeeds |
| Missing platform-specific OAuth config | Phase 1 | Checklist: Verify Info.plist (macOS), .desktop (Linux), electron-builder config all include protocol |
| Session doesn't survive restart | Phase 1 | Close and reopen app; verify user still logged in without re-authentication |

---

## Sources

### Official Documentation (HIGH confidence)
- [Supabase PKCE Flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Supabase User Sessions](https://supabase.com/docs/guides/auth/sessions)
- [Supabase JavaScript API Reference](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [Electron Deep Links](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app)
- [Electron safeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage)
- [React StrictMode Reference](https://react.dev/reference/react/StrictMode)

### Known Issues (MEDIUM-HIGH confidence)
- [Supabase auth-js deadlock issue](https://github.com/supabase/auth-js/issues/762) — onAuthStateChange async calls
- [Supabase session hanging indefinitely](https://github.com/supabase/supabase/issues/41968) — auth-js bug
- [Electron deep linking cold start issue](https://github.com/electron/electron/issues/40173) — Windows/Linux argv handling
- [Electron second-instance vs open-url](https://github.com/electron/electron/issues/20088) — macOS vs Windows event differences
- [React 18 useEffect double call](https://github.com/facebook/react/issues/24455) — Strict Mode behavior
- [safeStorage basic_text fallback](https://github.com/electron/electron/blob/main/docs/api/safe-storage.md) — Linux insecure storage

### Community Patterns (MEDIUM confidence)
- [Auth0 Electron OAuth Guide](https://auth0.com/blog/securing-electron-applications-with-openid-connect-and-oauth-2/)
- [Custom Protocols in Electron Apps](https://blog.bloomca.me/2025/07/20/electron-apps-custom-protocols.html)
- [Supabase Token Refresh Best Practices](https://prosperasoft.com/blog/database/supabase/supabase-token-refresh/)
- [Building Deep Links in Electron](https://www.bigbinary.com/blog/deep-link-electron-app)
- [Local-First Software Principles](https://www.inkandswitch.com/essay/local-first/)
- [Graceful Degradation Patterns](https://systemdr.substack.com/p/graceful-service-degradation-patterns)

### Security Best Practices (MEDIUM confidence)
- [API Key Security Best Practices](https://www.legitsecurity.com/aspm-knowledge-base/api-key-security-best-practices)
- [Securing API Keys Guide](https://www.nightfall.ai/blog/securing-api-keys-guide-for-analysts-and-engineers)
- [Feature Gating Patterns](https://docs.statsig.com/feature-flags/best-practices)

---

*Pitfalls research for: Adding Supabase Auth to Existing Electron + React 19 App*
*Researched: 2026-02-14*
*Confidence: MEDIUM-HIGH (official docs verified; some issues based on GitHub reports; patterns from community sources)*
