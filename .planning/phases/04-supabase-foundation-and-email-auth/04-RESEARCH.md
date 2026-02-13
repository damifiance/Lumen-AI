# Phase 04: Supabase Foundation & Email Auth - Research

**Researched:** 2026-02-14
**Domain:** Supabase authentication in Electron + React applications
**Confidence:** HIGH

## Summary

Supabase provides a JavaScript client (`@supabase/supabase-js` v2.95.3) with built-in email/password authentication, automatic token refresh, and session persistence. For Electron apps, the critical challenge is **secure token storage** — sessions must be stored using Electron's `safeStorage` API (not localStorage) to leverage OS-level encryption (Keychain/DPAPI/kwallet). A custom storage adapter bridges Supabase's storage interface with IPC calls to the main process.

The architecture follows an **offline-first pattern**: auth is optional, users can work with local Ollama without any login, but cloud AI features require authentication. Session state lives in a Zustand store with custom persistence that routes sensitive data through Electron's secure storage.

**Primary recommendation:** Use `@supabase/supabase-js` with a custom storage adapter that routes token storage through IPC to the main process, where tokens are encrypted via `safeStorage.encryptString()`. Never call Supabase APIs inside `onAuthStateChange` callbacks (known deadlock bug).

**Critical architectural decision:** Build custom storage adapter (100 LOC) rather than using localStorage — this is non-negotiable for Electron security.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.95.3 | Auth client, session management, API calls | Official Supabase client, handles JWT refresh, session lifecycle |
| `zustand` | (existing) | Auth state management | Already used in project, integrates with custom persistence |
| Electron `safeStorage` | (built-in) | Token encryption | OS-level encryption (Keychain/DPAPI), no extra dependencies |

**Note:** `@supabase/auth-helpers-react` is **deprecated** as of April 2024. The `@supabase/ssr` package replaces it, but SSR is **not needed** for client-side React apps — use `@supabase/supabase-js` directly with `createClient()`.

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React hooks (custom) | — | `useAuth()`, `useAuthLoading()` | Consume auth state from Zustand store |
| IPC handlers (custom) | — | `secureStore:set/get/remove` | Bridge renderer to main process for token storage |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom storage adapter | `localStorage` | **Never do this** — localStorage is unencrypted, visible to any XSS attack, fails Electron security audits |
| `@supabase/supabase-js` | Build custom auth | Supabase handles password hashing, JWT validation, token refresh, PKCE flows — **don't hand-roll** |
| Electron `safeStorage` | `node-keytar` | Keytar is deprecated and replaced by `safeStorage` (built-in since Electron 12) |

**Installation:**
```bash
npm install @supabase/supabase-js
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/
├── lib/
│   ├── supabase.ts          # Supabase client with custom storage
│   └── secureStorage.ts     # IPC wrapper for secure token storage
├── stores/
│   └── authStore.ts         # Zustand auth state (user, session, loading)
├── hooks/
│   └── useAuth.ts           # React hook for auth state + actions
├── components/
│   └── auth/
│       ├── LoginModal.tsx   # Email/password login form
│       └── SignupModal.tsx  # Email/password signup form
electron/
├── main.js                  # Register secureStore IPC handlers
└── secureStore.js           # safeStorage encrypt/decrypt logic
```

### Pattern 1: Custom Storage Adapter for Supabase

**What:** Supabase client accepts a custom `storage` option that implements `getItem()`, `setItem()`, `removeItem()`. In Electron, this adapter must route calls through IPC to the main process for `safeStorage` encryption.

**When to use:** **Always** in Electron apps. Never use default localStorage for Supabase sessions.

**Example:**
```typescript
// frontend/src/lib/secureStorage.ts
// Source: Electron safeStorage docs + Supabase custom storage pattern

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    return window.electron.secureStore.get(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    await window.electron.secureStore.set(key, value);
  },

  async removeItem(key: string): Promise<void> {
    await window.electron.secureStore.remove(key);
  }
};

// frontend/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { secureStorage } from './secureStorage';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Not needed for Electron
    }
  }
);
```

### Pattern 2: Main Process IPC Handlers

**What:** Main process handlers that encrypt/decrypt tokens using `safeStorage` before storing in `electron-store` or similar.

**When to use:** Required for the custom storage adapter.

**Example:**
```javascript
// electron/secureStore.js
// Source: Electron safeStorage API docs + secure-electron-store pattern

const { safeStorage } = require('electron');
const Store = require('electron-store');

const store = new Store({ name: 'secure-tokens' });

module.exports = {
  set(key, value) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption not available on this platform');
    }
    const encrypted = safeStorage.encryptString(value);
    store.set(key, encrypted.toString('base64'));
  },

  get(key) {
    const encrypted = store.get(key);
    if (!encrypted) return null;
    const buffer = Buffer.from(encrypted, 'base64');
    return safeStorage.decryptString(buffer);
  },

  remove(key) {
    store.delete(key);
  }
};

// electron/main.js
const { ipcMain } = require('electron');
const secureStore = require('./secureStore');

ipcMain.handle('secureStore:set', async (event, key, value) => {
  secureStore.set(key, value);
});

ipcMain.handle('secureStore:get', async (event, key) => {
  return secureStore.get(key);
});

ipcMain.handle('secureStore:remove', async (event, key) => {
  secureStore.remove(key);
});
```

### Pattern 3: Zustand Auth Store with Session Management

**What:** Centralized auth state that tracks user, session, loading states, and auth actions (login, signup, logout).

**When to use:** Single source of truth for auth state, consumed by `useAuth()` hook.

**Example:**
```typescript
// frontend/src/stores/authStore.ts
// Source: Zustand patterns + Supabase session management

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, isInitialized: true });

    // WARNING: Never call supabase.* inside this callback (deadlock bug)
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },

  signUp: async (email, password) => {
    set({ isLoading: true });
    const { error } = await supabase.auth.signUp({ email, password });
    set({ isLoading: false });
    if (error) return { error: error.message };
    return {};
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ isLoading: false });
    if (error) return { error: error.message };
    return {};
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  }
}));
```

### Pattern 4: Auth Modal with Loading States

**What:** Modal overlay (matching existing `OnboardingModal` pattern) with email/password form, loading indicators, and user-friendly error messages.

**When to use:** Login and signup flows.

**Example:**
```typescript
// frontend/src/components/auth/LoginModal.tsx
// Source: Existing OnboardingModal.tsx pattern + Supabase auth

import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';

let _listener: ((open: boolean) => void) | null = null;

export function openLoginModal() {
  _listener?.(true);
}

export function LoginModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { signIn, isLoading } = useAuthStore();

  useEffect(() => {
    _listener = setIsVisible;
    return () => { _listener = null; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await signIn(email, password);
    if (result.error) {
      setError(translateError(result.error));
    } else {
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50">
      <form onSubmit={handleSubmit} className="...">
        {error && <div className="text-red-500">{error}</div>}
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={isLoading}
          required
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={isLoading}
          required
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login')) return 'Invalid email or password';
  if (msg.includes('Email not confirmed')) return 'Please confirm your email first';
  return 'Unable to sign in. Please try again.';
}
```

### Anti-Patterns to Avoid

- **Never use localStorage directly** — Unencrypted, visible to any XSS, fails security audits
- **Never call Supabase APIs inside `onAuthStateChange`** — Known deadlock bug, will hang all subsequent API calls
- **Never use `--no-verify` to skip contextIsolation** — Breaks security boundary between renderer and main process
- **Never expose `ipcRenderer` directly via contextBridge** — Wrap in specific API methods with validation
- **Never assume auth is required** — Offline-first means local Ollama works without login

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom bcrypt/argon2 | Supabase Auth | Handles salting, work factors, constant-time comparison, password policy |
| JWT validation | Manual token parsing | Supabase client `getUser()` | Validates signature, expiry, issuer; handles refresh automatically |
| Token refresh | Manual refresh logic | `autoRefreshToken: true` | Supabase refreshes 60s before expiry, handles refresh token reuse detection |
| Session persistence | Manual localStorage/cookies | Custom storage adapter | Supabase manages storage key, serialization, session lifecycle |
| Email confirmation | Custom email + token verification | Supabase email templates | Built-in templates, rate limiting, SMTP integration |

**Key insight:** Auth is a **minefield of edge cases** (timing attacks, refresh token reuse, clock skew, session fixation). Supabase has battle-tested implementations; custom implementations take months to secure properly.

## Common Pitfalls

### Pitfall 1: Calling Supabase APIs inside `onAuthStateChange`

**What goes wrong:** All subsequent Supabase API calls hang indefinitely (never return). The app appears frozen.

**Why it happens:** Known bug in `supabase-js` — using `await` inside `onAuthStateChange` callback creates a deadlock due to the lock acquisition mechanism.

**How to avoid:**
- **Never** call `supabase.from()`, `supabase.auth.*`, or any async Supabase method inside the callback
- Only update local state (`set()` in Zustand, `setState()` in React)
- If you must make async calls, wrap in `setTimeout(..., 0)` to defer execution outside the callback

**Warning signs:** Auth flow works initially, but after first login/logout, the app stops responding to clicks.

**Sources:**
- [Supabase Issue #762](https://github.com/supabase/auth-js/issues/762)
- [Supabase Troubleshooting: Why is my API call not returning?](https://supabase.com/docs/guides/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0)

### Pitfall 2: Using localStorage in Electron

**What goes wrong:** Tokens stored in localStorage are unencrypted, visible to XSS attacks, fail security audits, and aren't protected from other processes.

**Why it happens:** Web dev habit carries over to Electron, but Electron renderer processes need elevated protection.

**How to avoid:** Always use custom storage adapter that routes to `safeStorage` in main process via IPC.

**Warning signs:** Security audit flags token exposure; tokens accessible via DevTools.

### Pitfall 3: Supabase Default Email Rate Limits

**What goes wrong:** During development, signup/login emails stop sending after 2-4 attempts. Error: "Email rate limit exceeded."

**Why it happens:** Default Supabase email service has **2 emails/hour** rate limit. For production, default service is **disabled for non-team emails**.

**How to avoid:**
- **Development:** Test with few accounts, wait 1 hour between batches, or use magic link sparingly
- **Production:** **MUST configure custom SMTP** (SendGrid, AWS SES, Mailgun) — default service will NOT work

**Warning signs:** Signup works 2-3 times, then silently fails; no confirmation emails received.

**Sources:**
- [Supabase Auth SMTP Docs](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase Rate Limits](https://supabase.com/docs/guides/auth/rate-limits)

### Pitfall 4: Not Handling Auth Loading States

**What goes wrong:** UI flashes unauthenticated state before session loads, causing protected routes to redirect momentarily.

**Why it happens:** Session check is async (`getSession()`), but React renders immediately.

**How to avoid:**
- Add `isInitialized` flag to auth store
- Show loading spinner until `initialize()` completes
- Gate protected UI on `isInitialized && user !== null`

**Warning signs:** UI flickers between login screen and dashboard on app launch.

### Pitfall 5: Email Confirmation Required by Default

**What goes wrong:** Users can sign up, but can't log in. Error: "Email not confirmed."

**Why it happens:** Supabase **requires email confirmation by default**. User must click link in email before `signInWithPassword()` works.

**How to avoid:**
- **Option 1 (Recommended):** Keep confirmation enabled, show "Check your email" message after signup, handle "Email not confirmed" error gracefully
- **Option 2 (Dev only):** Disable "Confirm Email" in Supabase dashboard under Authentication → Email Provider (NOT for production)

**Warning signs:** Signup succeeds, but login immediately fails with "Email not confirmed."

**Sources:**
- [Supabase General Configuration](https://supabase.com/docs/guides/auth/general-configuration)

### Pitfall 6: safeStorage Not Available on All Linux Setups

**What goes wrong:** `safeStorage.isEncryptionAvailable()` returns `false` on some Linux systems (no kwallet/gnome-keyring). Tokens fall back to unencrypted storage.

**Why it happens:** Linux secret stores vary by desktop environment; some minimal setups lack any secret store.

**How to avoid:**
- Always check `safeStorage.isEncryptionAvailable()` before use
- If unavailable, show error: "Secure storage not available. Please install gnome-keyring or kwallet."
- **Never silently fall back to unencrypted storage** — fail loudly

**Warning signs:** Works on macOS/Windows, fails on Linux CI or minimal Docker containers.

**Sources:**
- [Electron safeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage)

## Code Examples

Verified patterns from official sources:

### Session Structure
```typescript
// Source: Supabase Sessions Docs
interface Session {
  access_token: string;      // JWT, valid 1 hour (default)
  refresh_token: string;     // Single-use token for refresh
  expires_in: number;        // Seconds until expiry
  expires_at: number;        // Unix timestamp
  user: User;                // { id, email, user_metadata, ... }
  provider_token?: string;   // OAuth provider token (if OAuth)
  provider_refresh_token?: string;
}
```

### Error Handling with Friendly Messages
```typescript
// Source: Supabase Error Codes Docs
import { AuthError, AuthApiError } from '@supabase/supabase-js';

function translateAuthError(error: AuthError): string {
  // Always use error.code/name, not string matching on message
  if (error instanceof AuthApiError) {
    switch (error.code) {
      case 'invalid_credentials':
        return 'Invalid email or password';
      case 'email_not_confirmed':
        return 'Please confirm your email before signing in';
      case 'user_already_exists':
        return 'An account with this email already exists';
      case 'weak_password':
        return 'Password must be at least 6 characters';
      default:
        return 'Unable to sign in. Please try again.';
    }
  }
  return 'Network error. Please check your connection.';
}
```

### contextBridge Secure API
```javascript
// electron/preload.js
// Source: Electron contextBridge + security best practices

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  secureStore: {
    get: (key) => ipcRenderer.invoke('secureStore:get', key),
    set: (key, value) => ipcRenderer.invoke('secureStore:set', key, value),
    remove: (key) => ipcRenderer.invoke('secureStore:remove', key),
  }
});

// NEVER expose raw ipcRenderer:
// ❌ ipcRenderer: ipcRenderer  // Breaks security boundary
```

### Initialize Auth on App Start
```typescript
// frontend/src/App.tsx
// Source: React auth initialization pattern

import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';

export function App() {
  const { initialize, isInitialized } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return <MainUI />;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-react` | `@supabase/supabase-js` directly | April 2024 | Auth-helpers deprecated; use `createClient()` + custom storage for client-side apps |
| `node-keytar` for secrets | Electron `safeStorage` | Electron 12+ (2021) | `keytar` is deprecated; `safeStorage` is built-in, no native compilation |
| Access token in localStorage | Custom storage adapter | Always for Electron | Electron security best practice, not new but often missed |
| `refreshSession()` manual calls | `autoRefreshToken: true` | Always available | Let Supabase handle refresh automatically 60s before expiry |

**Deprecated/outdated:**
- **`@supabase/auth-helpers-react`**: Deprecated April 2024, no longer maintained. Use `@supabase/supabase-js` directly.
- **`@supabase/ssr`**: Only for SSR frameworks (Next.js, Remix). Not needed for client-side React SPAs or Electron apps.
- **`node-keytar`**: Replaced by Electron's built-in `safeStorage` API. Keytar requires native compilation and is no longer maintained.

## Open Questions

1. **How to handle session expiry while offline?**
   - What we know: Supabase sessions expire after 1 hour (access token). Refresh tokens can extend this, but require network.
   - What's unclear: Should we show "Session expired, please reconnect" or silently re-auth on next network?
   - Recommendation: For offline-first, track last successful auth timestamp. If > 7 days offline, show "Please sign in to sync." Don't block local Ollama usage.

2. **Should we validate session on every app restart?**
   - What we know: `getSession()` retrieves locally-stored session, doesn't validate against server.
   - What's unclear: Risk of stale sessions if user changed password on another device.
   - Recommendation: Call `getSession()` on startup (fast), but also call `getUser()` in background (validates with server). If `getUser()` fails, clear session and show login.

3. **How to test auth flows without hitting rate limits?**
   - What we know: Default Supabase email service has 2 emails/hour limit.
   - What's unclear: Best dev workflow for testing signup/login repeatedly.
   - Recommendation: Use Supabase local dev (`supabase start`) with Inbucket email testing, or create 5-10 test accounts and rotate through them.

## Sources

### Primary (HIGH confidence)
- [Supabase React Auth Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react) — Official setup guide
- [Supabase JavaScript API: signInWithPassword](https://supabase.com/docs/reference/javascript/auth-signinwithpassword) — Method signature and return types
- [Supabase User Sessions](https://supabase.com/docs/guides/auth/sessions) — Session structure, lifecycle, refresh behavior
- [Supabase Client Initialization](https://supabase.com/docs/reference/javascript/initializing) — Custom storage adapter interface
- [Electron safeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage) — Encryption methods, platform behavior
- [Electron contextBridge API](https://www.electronjs.org/docs/latest/api/context-bridge) — Secure IPC exposure pattern
- [Supabase Auth Error Codes](https://supabase.com/docs/guides/auth/debugging/error-codes) — Error types and handling
- [Supabase Auth SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp) — Production email setup
- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) — Latest version (2.95.3)

### Secondary (MEDIUM confidence)
- [Supabase Issue #762: onAuthStateChange deadlock](https://github.com/supabase/auth-js/issues/762) — Bug description and workarounds
- [Supabase Troubleshooting: API call not returning](https://supabase.com/docs/guides/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0) — Deadlock documentation
- [Auth0 Blog: Securing Electron Apps with OAuth](https://auth0.com/blog/securing-electron-applications-with-openid-connect-and-oauth-2/) — Electron auth patterns
- [Bishop Fox: Reasonably Secure Electron Framework](https://bishopfox.com/blog/reasonably-secure-electron) — IPC security patterns
- [Medium: Zustand Persistent Login](https://medium.com/@giwon.yi339/react-persistant-login-using-zustand-state-management-prevent-ui-change-on-refreshing-the-page-4ec53fe8ce5e) — Auth store patterns
- [LogRocket: UI Best Practices for Loading States](https://blog.logrocket.com/ui-design-best-practices-loading-error-empty-state-react/) — UX patterns for async auth

### Tertiary (LOW confidence)
- [Textify: Supabase 2026 Predictions](https://textify.ai/supabase-relational-ai-2026-guide/) — Speculative future roadmap
- [GitHub Discussions: Supabase Offline-First](https://github.com/orgs/supabase/discussions/357) — Community workarounds, not official guidance

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — Verified with official docs, current npm versions, established patterns
- Architecture patterns: **HIGH** — Custom storage adapter is standard Electron security practice; Zustand + Supabase is well-documented
- Pitfalls: **HIGH** — All pitfalls verified with official docs or GitHub issues (onAuthStateChange deadlock, email rate limits, safeStorage availability)
- Offline-first approach: **MEDIUM** — Supabase auth is designed for online; offline requires custom logic around session validation

**Research date:** 2026-02-14
**Valid until:** ~60 days (April 2026) — Supabase is stable, but auth-related security updates can change recommendations
