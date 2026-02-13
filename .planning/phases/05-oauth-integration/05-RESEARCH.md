# Phase 5: OAuth Integration - Research

**Researched:** 2026-02-14
**Domain:** Electron OAuth with Supabase (PKCE flow, custom protocol handlers, secure token storage)
**Confidence:** MEDIUM

## Summary

OAuth integration in Electron requires implementing the PKCE (Proof Key for Code Exchange) flow with custom protocol handlers for secure authentication. The standard approach involves opening OAuth providers (Google, GitHub) in the user's default browser, then using deep linking via a custom protocol (e.g., `lumenai://auth/callback`) to return the authorization code to the Electron app. Supabase Auth handles PKCE automatically via `signInWithOAuth()`, but Electron-specific challenges include platform-specific deep link events, development mode testing limitations, and secure token storage fallbacks.

**Primary recommendation:** Use external browser for OAuth (not embedded BrowserWindow), implement platform-specific deep link handlers (macOS `open-url` vs Windows/Linux `second-instance`), leverage Supabase's automatic PKCE handling, and store refresh tokens using existing secureStore module (which already handles SafeStorage with graceful fallback).

**Critical pitfalls identified:**
1. **Never call Supabase API inside onAuthStateChange callback** (causes deadlock — already documented in authStore.ts)
2. **Custom protocols only work in packaged apps on macOS/Linux** (Windows allows dev mode testing)
3. **External browser is security best practice** (embedded BrowserWindow exposes credentials)

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | Latest (already installed) | Supabase client with auth methods | Official Supabase SDK, handles PKCE automatically |
| Electron `app.setAsDefaultProtocolClient()` | Built-in | Register custom protocol handler | Native Electron API for deep linking |
| Electron `safeStorage` | Built-in | OS-level token encryption | Already used in `electron/secureStore.js` |
| `electron-store@8` | 8.x (already installed) | Persistent key-value storage | CommonJS compatible (v9+ is ESM-only), project already uses it |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `shell.openExternal()` | Built-in | Open external browser for OAuth | Security best practice for OAuth flows |
| `electron-deeplink` | Optional | Dev mode protocol testing on macOS | Only if dev testing is critical (protocols don't work in dev mode on macOS/Linux) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| External browser | Embedded BrowserWindow | Embedded violates OAuth security best practices (credential exposure, account hijacking risk) |
| Custom protocol | Loopback server | Loopback is desktop alternative, but protocols are simpler for single-instance apps |
| Automatic PKCE (Supabase) | Manual PKCE implementation | Manual requires crypto code (SHA256, base64url) — unnecessary with Supabase |

**Installation:**
No new dependencies required — all capabilities already present in project.

## Architecture Patterns

### Recommended Project Structure
```
electron/
├── main.js                 # Register protocol handler, listen for deep link events
├── secureStore.js          # Already exists — use for OAuth tokens
└── auth.js                 # NEW: OAuth flow orchestration (external browser + callback handling)

frontend/src/
├── stores/authStore.ts     # Already exists — add signInWithOAuth methods
└── lib/supabase.ts         # Already exists — ensure redirectTo points to custom protocol
```

### Pattern 1: External Browser OAuth with Custom Protocol Redirect

**What:** Open OAuth provider in user's default browser, redirect back to app via custom protocol

**When to use:** All OAuth flows in Electron apps (security best practice, superior UX)

**Example flow:**
```javascript
// In electron/auth.js (new file)
const { shell } = require('electron');

async function startOAuthFlow(provider) {
  // 1. Generate Supabase OAuth URL with custom protocol redirect
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider, // 'google' or 'github'
    options: {
      redirectTo: 'lumenai://auth/callback', // Custom protocol
      skipBrowserRedirect: true, // Don't auto-open in renderer
    }
  });

  if (error) throw error;

  // 2. Open in external browser (security best practice)
  shell.openExternal(data.url);

  // 3. Wait for callback via protocol handler (see Pattern 2)
}
```

**Anti-Patterns to Avoid:**
- **Using embedded BrowserWindow for OAuth:** Exposes user credentials to app, violates RFC 8252
- **Calling Supabase methods inside onAuthStateChange:** Causes deadlock (see Common Pitfalls)

### Pattern 2: Platform-Specific Deep Link Handlers

**What:** Listen for custom protocol callbacks differently on macOS vs Windows/Linux

**When to use:** Handling OAuth redirect from browser back to Electron app

**Example:**
```javascript
// In electron/main.js

// Register protocol handler (must be before app.whenReady)
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('lumenai', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('lumenai');
}

// macOS: listen for open-url
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleOAuthCallback(url); // Extract code, call exchangeCodeForSession
});

// Windows/Linux: listen for second-instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Find the protocol URL in commandLine array
    const url = commandLine.find((arg) => arg.startsWith('lumenai://'));
    if (url) {
      handleOAuthCallback(url);
    }

    // Focus existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function handleOAuthCallback(url) {
  // Parse URL: lumenai://auth/callback?code=<auth-code>&...
  const urlObj = new URL(url);
  const code = urlObj.searchParams.get('code');

  if (code) {
    // Send to renderer process to call supabase.auth.exchangeCodeForSession(code)
    mainWindow.webContents.send('oauth-callback', { code });
  }
}
```

**Why this pattern:**
- macOS emits `open-url` when app is running or cold-started
- Windows/Linux emit `second-instance` when app is already running
- Cold start on Windows/Linux: URL is in `process.argv[1]` (check on app startup)

### Pattern 3: Secure Token Storage (Already Implemented)

**What:** Store OAuth refresh tokens using Electron SafeStorage with graceful fallback

**When to use:** Persisting Supabase session across app restarts

**Example (already in `electron/secureStore.js`):**
```javascript
// Source: /Users/damifiance/workspace/AI-paper-reader/electron/secureStore.js
const { safeStorage } = require('electron');
const Store = require('electron-store');

const store = new Store({ name: 'secure-tokens' });

function set(key, value) {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(value);
    const base64 = encrypted.toString('base64');
    store.set(key, base64);
  } else {
    console.warn('[secureStore] Encryption unavailable - storing without encryption');
    store.set(key, value);
  }
}
```

**Why this pattern:**
- Uses OS keychain (macOS Keychain, Windows DPAPI, Linux kwallet/gnome-libsecret)
- Graceful fallback prevents app breakage on minimal Linux installs
- Already implemented in project — no new code needed

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PKCE code verifier/challenge generation | Manual crypto (SHA256, base64url encoding) | Supabase `signInWithOAuth()` | Supabase handles PKCE automatically, including verifier storage and code exchange |
| Token refresh logic | Custom refresh timers | Supabase client auto-refresh | Supabase client manages token lifecycle, handles `onAuthStateChange` events |
| OAuth provider configuration | Custom OAuth endpoints | Supabase Dashboard provider setup | Supabase abstracts provider differences, manages redirect URLs centrally |
| Session persistence | Custom localStorage/file storage | Supabase client with custom storage adapter | Supabase client includes storage adapter interface for Electron environments |

**Key insight:** Supabase Auth is designed for serverless environments and handles PKCE complexity. The only Electron-specific work is: (1) custom protocol handler registration, (2) platform-specific deep link events, (3) secure token storage (already done).

## Common Pitfalls

### Pitfall 1: Calling Supabase API Inside onAuthStateChange Callback

**What goes wrong:** Any `await supabase.*` call inside the `onAuthStateChange` callback causes subsequent Supabase calls to hang indefinitely (deadlock).

**Why it happens:** Supabase uses Web Locks API internally for session management. Async operations inside the auth callback create microtask execution order conflicts, blocking the lock.

**How to avoid:**
- Never call `supabase.auth.*`, `supabase.from().*`, or `supabase.rpc()` inside the callback
- Use reactive flag pattern to defer operations outside the listener
- Already documented in project's `authStore.ts` (line 77 comment: "CRITICAL: Do NOT call any supabase.* methods inside this callback")

**Warning signs:**
- API calls hang after login/logout
- Token refresh triggers but subsequent queries never resolve
- Page reload fixes the issue temporarily

**Sources:**
- [Supabase auth-js #762](https://github.com/supabase/auth-js/issues/762)
- Workaround: Upgrade to `supabase-js@2.33.1+` or use `setTimeout()` to defer calls

### Pitfall 2: Custom Protocol Handlers Don't Work in Development Mode (macOS/Linux)

**What goes wrong:** `app.setAsDefaultProtocolClient()` is ignored when running `npm run dev` on macOS and Linux. OAuth callback never fires.

**Why it happens:** macOS and Linux require the app to be packaged and installed to register protocol handlers. Windows allows runtime registration for unpacked apps.

**How to avoid:**
- Test OAuth flows in packaged builds (`npm run build && open dist/installers/...`)
- Use `electron-deeplink` npm package for dev mode testing (optional)
- On macOS: close production app, then run dev app (protocol handler transfers to dev instance if prod is closed)

**Warning signs:**
- OAuth redirects to browser but nothing happens
- Protocol URL shows "No application found" error
- Works fine on Windows but not macOS during development

**Sources:**
- [Electron Deep Links docs](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app)
- [electron-deeplink npm](https://www.npmjs.com/package/electron-deeplink)

### Pitfall 3: Using Embedded BrowserWindow for OAuth (Security Risk)

**What goes wrong:**
- App can intercept user credentials (violates OAuth security model)
- Cookies don't persist across sessions (poor UX)
- Authorization servers may block embedded webviews

**Why it happens:** Developers assume BrowserWindow is "more integrated" than external browser, not realizing it violates RFC 8252 (OAuth 2.0 for Native Apps).

**How to avoid:**
- Always use `shell.openExternal()` to open OAuth URLs in default browser
- Never load OAuth provider URLs in a BrowserWindow
- Configure `nodeIntegration: false` and `contextIsolation: true` if you must use embedded browser for non-auth flows

**Warning signs:**
- Users report having to log in every time (cookies not shared)
- OAuth provider blocks login with "unsupported browser" error
- Security audit flags credential exposure risk

**Sources:**
- [Auth0 Electron security guide](https://auth0.com/blog/securing-electron-applications-with-openid-connect-and-oauth-2/)
- RFC 8252 Section 8.12 (embedded user agents disallowed)

### Pitfall 4: Forgetting to Handle Cold Start Protocol Events

**What goes wrong:** App launched by clicking OAuth callback link (cold start) doesn't receive the auth code. Only works when app is already running.

**Why it happens:** macOS `open-url` fires on cold start, but Windows/Linux require checking `process.argv` on startup (no event fired).

**How to avoid:**
- On macOS: `app.on('open-url')` handles both warm and cold starts
- On Windows/Linux: Check `process.argv` in `app.whenReady()` for protocol URLs
- Test both scenarios: app running + app closed when clicking OAuth link

**Warning signs:**
- OAuth works when app is open but not when launching from browser
- Windows users report "nothing happens" after OAuth approval

### Pitfall 5: Linux SafeStorage Fallback Not Handled

**What goes wrong:** App crashes or fails to store tokens on Linux systems without gnome-keyring or kwallet installed.

**Why it happens:** Electron's `safeStorage.isEncryptionAvailable()` returns `false` on minimal Linux installs. Calling `encryptString()` throws error.

**How to avoid:**
- Always check `isEncryptionAvailable()` before calling `encryptString()`/`decryptString()`
- Gracefully fall back to unencrypted storage with warning log
- **Already handled in project's `secureStore.js`** (lines 14-21)

**Warning signs:**
- Linux users report auth not persisting
- Error logs show "safeStorage.encryptString is not a function"

## Code Examples

Verified patterns from official sources:

### PKCE Code Verifier/Challenge Generation (Reference Only — Not Needed with Supabase)

```javascript
// Source: https://gist.github.com/adeperio/73ce6680d4b80b45e624ab62bacfbdca
// NOTE: Supabase handles this automatically — included for understanding PKCE internals

const crypto = require('crypto');

function base64URLEncode(str) {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

function getPKCEChallengePair() {
  const verifier = base64URLEncode(crypto.randomBytes(32));
  const challenge = base64URLEncode(sha256(verifier));
  return { verifier, challenge };
}
```

**Why you don't need this:** Supabase's `signInWithOAuth()` generates and stores the verifier automatically. The code exchange via `exchangeCodeForSession()` uses the stored verifier internally.

### Supabase OAuth Initialization (Frontend)

```typescript
// In frontend/src/stores/authStore.ts (extend existing store)

signInWithOAuth: async (provider: 'google' | 'github') => {
  set({ isLoading: true, error: null });

  try {
    // Check if running in Electron
    const isElectron = window.electronAPI != null;

    if (isElectron) {
      // Request Electron main process to start OAuth flow
      window.electronAPI.startOAuth(provider);
    } else {
      // Web mode: use default Supabase redirect
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) throw error;
    }

    set({ isLoading: false });
  } catch (err) {
    const translated = translateAuthError(err);
    set({ error: translated, isLoading: false });
  }
}
```

### Electron IPC for OAuth (Main Process)

```javascript
// In electron/main.js (add to existing IPC handlers)

ipcMain.handle('start-oauth', async (event, provider) => {
  try {
    // Option 1: Generate URL in main process (requires Supabase client in main)
    // Option 2: Let renderer generate URL, send it to main process

    // Recommended: Let renderer handle Supabase, main only opens browser
    return { success: true };
  } catch (err) {
    console.error('OAuth start error:', err);
    return { success: false, error: err.message };
  }
});

// Handle OAuth callback URL
function handleOAuthCallback(url) {
  try {
    const urlObj = new URL(url);
    const code = urlObj.searchParams.get('code');
    const error = urlObj.searchParams.get('error');

    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('oauth-callback', { code, error });

      // Focus window
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  } catch (err) {
    console.error('OAuth callback parsing error:', err);
  }
}
```

### OAuth Callback Handler (Frontend Renderer)

```typescript
// In frontend/src/stores/authStore.ts or dedicated auth service

// Listen for Electron OAuth callback
if (window.electronAPI) {
  window.electronAPI.onOAuthCallback(async ({ code, error }) => {
    if (error) {
      useAuthStore.getState().set({
        error: `OAuth failed: ${error}`,
        isLoading: false
      });
      return;
    }

    if (code) {
      try {
        // Exchange code for session (Supabase handles PKCE verifier internally)
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) throw error;

        // Session is now stored in Supabase client, onAuthStateChange will fire
        console.log('OAuth success:', data.session);
      } catch (err) {
        useAuthStore.getState().set({
          error: translateAuthError(err),
          isLoading: false
        });
      }
    }
  });
}
```

### Protocol Handler Registration in electron-builder

```json
// In electron/electron-builder.json (add protocols field)
{
  "appId": "com.lumenai.app",
  "productName": "Lumen AI",
  "protocols": {
    "name": "lumenai-protocol",
    "schemes": ["lumenai"]
  },
  // ... rest of config
}
```

**Platform-specific additions:**

**macOS (Info.plist)** — electron-builder handles automatically via `protocols` field

**Linux (.desktop file)** — Add to existing .desktop:
```
MimeType=x-scheme-handler/lumenai;
```

**Windows** — electron-builder handles registry entries automatically

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Embedded BrowserWindow for OAuth | External browser (shell.openExternal) | RFC 8252 (2017) | Security best practice, better UX (shared cookies) |
| Manual PKCE implementation | Auth provider SDKs handle PKCE | 2020+ (widespread adoption) | Supabase, Auth0, Okta all auto-handle PKCE |
| node-keytar for token storage | Electron safeStorage API | Electron 13+ (2021) | Built-in, no native dependencies, better cross-platform support |
| electron-store v9+ (ESM) | electron-store v8 (CommonJS) | v9.0.0 (2023) | v8 required for CommonJS Electron apps (project is CommonJS) |

**Deprecated/outdated:**
- **node-keytar:** Replaced by Electron's built-in `safeStorage` API (eliminated native dependency issues)
- **Implicit OAuth flow:** Replaced by authorization code + PKCE (more secure, single-use codes)
- **In-app webview OAuth:** Violates RFC 8252, blocked by many providers (Google, Microsoft)

## Open Questions

1. **Should we implement session transfer across Electron and web builds?**
   - What we know: Same Supabase project, but Electron uses custom protocol, web uses HTTPS redirect
   - What's unclear: Can we share session tokens via Supabase's built-in cross-tab sync in Electron?
   - Recommendation: Test if Supabase localStorage sync works in Electron renderer; if not, implement manual IPC sync between main and renderer

2. **How should we handle OAuth provider token refresh errors in Electron?**
   - What we know: Supabase client auto-refreshes tokens, but network interruptions can fail
   - What's unclear: Does Electron's offline detection integrate with Supabase's retry logic?
   - Recommendation: Implement offline-aware auth state (show "offline mode" banner, retry on reconnect)

3. **Should Google/GitHub OAuth be tested in dev mode or only in packaged builds?**
   - What we know: Protocol handlers require packaging on macOS/Linux
   - What's unclear: Is the overhead of packaging for each test worth it vs using electron-deeplink?
   - Recommendation: Use packaged builds for testing (matches production), document as requirement in PLAN.md

## Sources

### Primary (HIGH confidence)
- [Supabase PKCE Flow Documentation](https://supabase.com/docs/guides/auth/sessions/pkce-flow) - PKCE implementation, code exchange
- [Supabase signInWithOAuth Reference](https://supabase.com/docs/reference/javascript/auth-signinwithoauth) - OAuth method parameters
- [Electron SafeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage) - Token encryption, platform behaviors
- [Electron Deep Links Tutorial](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app) - Custom protocol handlers
- [Supabase Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google) - Provider configuration
- [Supabase GitHub OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-github) - Provider configuration

### Secondary (MEDIUM confidence)
- [Supabase Auth Deadlock Issue #762](https://github.com/supabase/auth-js/issues/762) - onAuthStateChange async bug, workarounds
- [Electron OAuth Security Best Practices](https://auth0.com/blog/securing-electron-applications-with-openid-connect-and-oauth-2/) - External browser pattern
- [PKCE Implementation Gist](https://gist.github.com/adeperio/73ce6680d4b80b45e624ab62bacfbdca) - Code verifier/challenge generation
- [Electron Custom Protocol Testing](https://glebbahmutov.com/blog/electron-app-with-custom-protocol/) - Dev mode limitations
- [electron-store Documentation](https://github.com/sindresorhus/electron-store) - Storage API, CommonJS compatibility notes

### Tertiary (LOW confidence - needs validation)
- [Supabase Electron OAuth Discussion #17722](https://github.com/orgs/supabase/discussions/17722) - Community patterns (unresolved)
- [Supabase Electron Auth Discussion #22270](https://github.com/orgs/supabase/discussions/22270) - External browser approach (incomplete)
- [Bootstrapped Supabase Electron Guide](https://bootstrapped.app/guide/how-to-use-supabase-with-electron-for-desktop-apps) - Third-party tutorial

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - Supabase and Electron APIs are well-documented, project already uses both
- Architecture: **MEDIUM** - External browser + protocol handler pattern is proven, but Electron-Supabase integration lacks official examples
- Pitfalls: **HIGH** - Deadlock bug is documented in Supabase issues, protocol handler limitations in Electron docs, security risks in RFC 8252

**Research date:** 2026-02-14
**Valid until:** ~30 days (stable domain — Electron and Supabase Auth are mature, no fast-moving changes expected)

**Key unknowns requiring validation during implementation:**
- Exact flow for passing OAuth URL from renderer to main process (IPC pattern)
- Whether Supabase session storage works in Electron renderer without custom adapter
- Cold start handling on Windows/Linux (process.argv parsing needed vs event)
