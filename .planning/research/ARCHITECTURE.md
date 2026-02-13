# Architecture Research: Supabase Auth Integration

**Domain:** Hybrid local-first + cloud authentication for Electron PDF reader
**Researched:** 2026-02-14
**Confidence:** HIGH

## Integration Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           ELECTRON LAYER                                  │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │  main.js     │  │ preload.js   │  │  OAuth       │                   │
│  │              │  │ (IPC Bridge) │  │ Deep Links   │                   │
│  │ - Backend    │  │              │  │ (Protocol    │                   │
│  │   spawning   │  │ - Port       │  │  Handler)    │                   │
│  │ - SQLite DB  │  │ - Updates    │  │              │                   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                   │
│         │                 │                 │                            │
├─────────┴─────────────────┴─────────────────┴───────────────────────────┤
│                          REACT FRONTEND                                   │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                         NEW: Auth Layer                          │    │
│  │  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐    │    │
│  │  │ Supabase   │  │  Auth Store  │  │  Auth Components     │    │    │
│  │  │ Client     │  │  (Zustand +  │  │  - LoginModal        │    │    │
│  │  │ Singleton  │  │   Persist)   │  │  - ProfileModal      │    │    │
│  │  │            │  │              │  │  - SettingsPanel     │    │    │
│  │  └─────┬──────┘  └──────┬───────┘  └──────────┬───────────┘    │    │
│  │        │                │                     │                 │    │
│  └────────┼────────────────┼─────────────────────┼─────────────────┘    │
│           │                │                     │                       │
│  ┌────────┴────────────────┴─────────────────────┴─────────────────┐    │
│  │              EXISTING: UI Components                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │ MODIFIED:    │  │ NEW:         │  │ ChatPanel    │           │    │
│  │  │ ModelSelector│  │ ProfileCard  │  │ (user avatar)│           │    │
│  │  │ (auth check) │  │ (sidebar)    │  │              │           │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │    │
│  └───────────────────────────────────────────────────────────────────┘    │
│           │                │                     │                       │
│  ┌────────┴────────────────┴─────────────────────┴─────────────────┐    │
│  │            EXISTING: Zustand Stores (unchanged)                   │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │ chatStore    │  │ paperStore   │  │ highlightStore│          │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │    │
│  └───────────────────────────────────────────────────────────────────┘    │
│           │                │                     │                       │
├───────────┴────────────────┴─────────────────────┴───────────────────────┤
│                         FASTAPI BACKEND                                   │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  NEW: Auth Middleware (JWT validation for cloud models)        │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │     │
│  │  │ MODIFIED:    │  │ chat.py      │  │ llm_service  │         │     │
│  │  │ /api/models  │  │ (auth check  │  │ (cloud model │         │     │
│  │  │ (filter by   │  │  for cloud)  │  │  gating)     │         │     │
│  │  │  auth)       │  │              │  │              │         │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘         │     │
│  └────────────────────────────────────────────────────────────────┘     │
│           │                │                     │                       │
│  ┌────────┴────────────────┴─────────────────────┴─────────────────┐    │
│  │              EXISTING: Local SQLite (unchanged)                   │    │
│  │  papers.db: highlights, chat history, paper metadata             │    │
│  └───────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE CLOUD                                    │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐             │
│  │ Auth Service   │  │ Postgres       │  │ Storage        │             │
│  │ - Google OAuth │  │ - profiles     │  │ - avatars      │             │
│  │ - GitHub OAuth │  │ - api_keys     │  │                │             │
│  │ - Email/Pass   │  │   (encrypted)  │  │                │             │
│  └────────────────┘  └────────────────┘  └────────────────┘             │
└──────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | New or Modified |
|-----------|----------------|-----------------|
| **Supabase Client Singleton** | Initialize Supabase with anon key, manage session lifecycle | NEW |
| **Auth Store (Zustand)** | Session state, user profile, login/logout actions, persist with localStorage | NEW |
| **OAuth Handler (Electron)** | Register custom protocol (`lumen://`), handle PKCE redirect, extract code & exchange for session | NEW |
| **Auth Middleware (FastAPI)** | Validate JWT for cloud AI requests, extract user ID from token | NEW |
| **ModelSelector** | Filter cloud models behind auth check, show "Login required" prompt | MODIFIED |
| **ProfileCard** | Display username + avatar in sidebar, quick access to settings | NEW |
| **ChatMessage** | Show user avatar + username instead of generic "You" | MODIFIED |
| **Settings Panel** | API key management (OpenAI/Anthropic), profile editing, account deletion | NEW |
| **Profile Modal** | Username claiming flow, bio/institution/interests editing, avatar upload | NEW |
| **Login Modal** | OAuth buttons, email/password form, password reset flow | NEW |

## Data Layer Architecture

### Hybrid Storage Strategy

```
LOCAL (SQLite - Electron userData)         CLOUD (Supabase Postgres)
─────────────────────────────────────     ─────────────────────────────
✓ PDF file paths & metadata               ✓ User profiles
✓ Highlights & annotations                ✓ API keys (encrypted)
✓ Chat history                            ✓ Avatar URLs
✓ Local AI model preferences              ✓ Session tokens
✓ Window state, sidebar pins              ✓ Future: usage analytics

Rationale: Papers are private, never leave device. Identity is portable across devices.
```

### Session Persistence

```typescript
// Auth store with Zustand persist middleware
const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,        // Supabase session (access + refresh tokens)
      user: null,           // User object from auth.users
      profile: null,        // Profile from profiles table
      // ... actions
    }),
    {
      name: 'lumen-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: state.session,  // Persist session for auto-login
      }),
    }
  )
);
```

**Why localStorage not Electron secure storage?**
- Electron secure storage requires main process IPC, adds complexity
- Supabase refresh tokens already use short expiry (7 days default)
- RLS policies prevent token misuse even if stolen
- User can revoke session from Supabase dashboard

## Recommended Project Structure

### New Files/Folders

```
frontend/src/
├── api/
│   └── supabase.ts                # NEW: Supabase client singleton
├── stores/
│   └── authStore.ts               # NEW: Auth state (Zustand + persist)
├── components/
│   ├── auth/                      # NEW folder
│   │   ├── LoginModal.tsx         # OAuth + email/password
│   │   ├── ProfileModal.tsx       # Username claim, bio, avatar
│   │   └── SettingsPanel.tsx      # API keys, account settings
│   ├── common/
│   │   └── ProfileCard.tsx        # NEW: Sidebar user card
│   └── chat/
│       ├── ModelSelector.tsx      # MODIFIED: Auth-aware gating
│       └── ChatMessage.tsx        # MODIFIED: Show user avatar
├── types/
│   └── auth.ts                    # NEW: Profile, Session types

electron/
└── main.js                        # MODIFIED: OAuth protocol handler

backend/app/
├── middleware/
│   └── auth.py                    # NEW: JWT validation middleware
├── routers/
│   └── chat.py                    # MODIFIED: Auth check for cloud models
└── services/
    └── llm_service.py             # MODIFIED: Cloud model gating logic
```

### Structure Rationale

- **`api/supabase.ts`:** Single source of truth for Supabase client. Prevents multiple instances with stale auth state.
- **`components/auth/`:** Isolated auth flows (login, profile, settings). Matches existing `components/chat/`, `components/pdf-viewer/` pattern.
- **`middleware/auth.py`:** Centralized JWT validation. Reusable for future authenticated endpoints (usage tracking, premium features).

## Architectural Patterns

### Pattern 1: Supabase Client Singleton

**What:** Single Supabase client instance shared across the app, initialized on first import.

**When to use:** Always. Multiple clients cause auth state desync (one client logs in, another doesn't know).

**Trade-offs:**
- Pro: Auth state consistent across components
- Pro: Session refresh happens automatically
- Con: Global state can be harder to test (but fine for auth)

**Example:**
```typescript
// frontend/src/api/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,  // We handle persistence via Zustand
    detectSessionInUrl: false,  // We handle OAuth callback manually
  },
});
```

### Pattern 2: Auth Store with Persist Middleware

**What:** Zustand store with persist middleware for session storage. Auth state survives app restart.

**When to use:** For all session-related state (user, profile, tokens).

**Trade-offs:**
- Pro: Auto-login after app restart (good UX)
- Pro: Persist middleware handles serialization automatically
- Con: Must handle session expiry (check `expires_at` on app mount)

**Example:**
```typescript
// frontend/src/stores/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../api/supabase';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (provider: 'google' | 'github' | 'email') => Promise<void>;
  signOut: () => Promise<void>;
  loadProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      profile: null,
      isLoading: false,

      signIn: async (provider) => {
        if (provider === 'google' || provider === 'github') {
          // OAuth flow with PKCE
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo: 'lumen://auth/callback',  // Electron deep link
            },
          });
          if (error) throw error;
          // Electron handles redirect and calls handleOAuthCallback
        } else {
          // Email/password flow (Phase 1)
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, profile: null });
      },

      loadProfile: async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', get().session?.user.id)
          .single();
        if (!error) set({ profile: data });
      },

      updateProfile: async (updates) => {
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', get().session?.user.id)
          .single();
        if (!error) set({ profile: data });
      },
    }),
    {
      name: 'lumen-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ session: state.session }),
    }
  )
);
```

### Pattern 3: OAuth PKCE Flow with Deep Links (Electron)

**What:** Register custom protocol (`lumen://`), open OAuth in browser, handle redirect with code exchange.

**When to use:** OAuth in Electron (required for Google, GitHub).

**Trade-offs:**
- Pro: Most secure OAuth flow for native apps (no token in URL)
- Pro: Uses system browser (trust indicators, saved passwords)
- Con: Requires compiled app to test (dev mode needs workaround)

**Example:**
```javascript
// electron/main.js
const { app, shell } = require('electron');

// Register protocol handler
if (process.defaultApp) {
  // Dev mode: must pass args
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('lumen', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('lumen');
}

// Handle deep link (macOS)
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleOAuthCallback(url);
});

// Handle deep link (Windows/Linux)
app.on('second-instance', (event, commandLine) => {
  const url = commandLine.find(arg => arg.startsWith('lumen://'));
  if (url) handleOAuthCallback(url);
});

function handleOAuthCallback(url) {
  // Extract code from lumen://auth/callback?code=...
  const code = new URL(url).searchParams.get('code');
  // Send to renderer via IPC or store temporarily
  mainWindow.webContents.send('oauth-callback', { code });
}

// In renderer (frontend), exchange code for session
ipcRenderer.on('oauth-callback', async (event, { code }) => {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) {
    useAuthStore.getState().setSession(data.session);
  }
});
```

### Pattern 4: Cloud AI Gating with JWT Validation

**What:** FastAPI middleware validates Supabase JWT for cloud AI requests. Ollama remains open.

**When to use:** Any endpoint that proxies expensive cloud APIs (OpenAI, Anthropic).

**Trade-offs:**
- Pro: Prevents abuse (unauthenticated users can't use your API keys)
- Pro: Tracks usage per user (future analytics)
- Con: Adds latency (~10ms for JWT decode + RLS check)

**Example:**
```python
# backend/app/middleware/auth.py
from fastapi import Request, HTTPException
from jose import jwt, JWTError
import os

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

async def verify_jwt(request: Request):
    """Extract and verify Supabase JWT from Authorization header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None  # Optional auth (Ollama works without)

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
        return payload.get("sub")  # User ID
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# backend/app/routers/chat.py (modified)
from app.middleware.auth import verify_jwt

@router.post("/conversation")
async def chat_conversation(request: ConversationRequest, req: Request):
    model = _resolve_model(request.model)

    # Cloud models require auth
    if model.startswith("openai/") or model.startswith("anthropic/"):
        user_id = await verify_jwt(req)
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Cloud AI requires authentication. Please log in."
            )

    # ... rest of existing logic
```

### Pattern 5: Module-Level Listener for Modals (Existing Pattern)

**What:** Export `openLoginModal()` function from LoginModal component, used for cross-component triggers.

**When to use:** When ModelSelector needs to prompt login, or settings icon opens profile modal.

**Trade-offs:**
- Pro: Matches existing pattern (`openOnboarding()` in OnboardingModal)
- Pro: No prop drilling or context needed
- Con: Module state (but fine for UI triggers)

**Example:**
```typescript
// frontend/src/components/auth/LoginModal.tsx
import { useState, useEffect } from 'react';

let _listener: ((open: boolean) => void) | null = null;

export function openLoginModal() {
  _listener?.(true);
}

export function LoginModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    _listener = setIsOpen;
    return () => { _listener = null; };
  }, []);

  if (!isOpen) return null;
  // ... modal UI
}

// Usage in ModelSelector.tsx
import { openLoginModal } from '../auth/LoginModal';

const handleModelChange = (modelId: string) => {
  const isCloudModel = modelId.startsWith('openai/') || modelId.startsWith('anthropic/');
  if (isCloudModel && !session) {
    openLoginModal();
    return;
  }
  setModel(modelId);
};
```

## Data Flow

### Authentication Flow (OAuth)

```
[User clicks "Login with Google"]
    ↓
[LoginModal] → supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: 'lumen://...' })
    ↓
[Default browser opens] → Google OAuth consent screen
    ↓
[User approves] → Google redirects to lumen://auth/callback?code=ABC123
    ↓
[Electron protocol handler] → Catches deep link, extracts code
    ↓
[IPC to renderer] → window.electron.handleOAuthCallback({ code: 'ABC123' })
    ↓
[Auth Store] → supabase.auth.exchangeCodeForSession(code)
    ↓
[Supabase] → Returns { session: { access_token, refresh_token, user } }
    ↓
[Auth Store] → Persist session, load profile from profiles table
    ↓
[UI Updates] → ProfileCard shows avatar, ModelSelector enables cloud models
```

### Profile Creation Flow (First Login)

```
[User logs in for first time] → session created, but no profile
    ↓
[App.tsx useEffect] → Checks if profile exists for user.id
    ↓
[Profile null] → openProfileModal() (username claiming flow)
    ↓
[ProfileModal] → User picks username, validates uniqueness
    ↓
[Submit] → supabase.from('profiles').insert({ id: user.id, username, ... })
    ↓
[RLS Policy] → Allows insert if auth.uid() == id (user creating own profile)
    ↓
[Auth Store] → Reload profile, close modal
    ↓
[UI] → ProfileCard shows username + default avatar
```

### Cloud AI Request Flow (with Auth)

```
[User selects "GPT-4o"] → ModelSelector checks session
    ↓
[Session exists] → setModel("openai/gpt-4o")
    ↓
[User sends message] → chatStore.sendMessage(paperPath, content)
    ↓
[Frontend] → apiFetch('/api/conversation', {
                headers: { Authorization: `Bearer ${session.access_token}` },
                body: { model: 'openai/gpt-4o', ... }
             })
    ↓
[FastAPI] → auth middleware extracts + validates JWT
    ↓
[Valid token] → llm_service.stream_completion() → LiteLLM → OpenAI API
    ↓
[Invalid/missing token] → 401 Unauthorized → Frontend shows "Login required"
    ↓
[Stream response] → SSE tokens → chatStore updates messages
```

### API Key Storage Flow (Secure)

```
[User opens Settings] → Clicks "Add OpenAI API Key"
    ↓
[SettingsPanel] → Input field, validates format (sk-...)
    ↓
[Submit] → supabase.from('api_keys').insert({
              user_id: session.user.id,
              provider: 'openai',
              key_encrypted: encrypted_value,  // Encrypted client-side OR via Edge Function
           })
    ↓
[RLS Policy] → auth.uid() == user_id (users can only manage their own keys)
    ↓
[Backend API call] → FastAPI fetches key from Supabase, decrypts, sets env var
    ↓
[LiteLLM] → Uses OPENAI_API_KEY from env
```

**Note:** For MVP (Phase 3), API keys stored in backend `.env` (shared across all users). Phase 4+ adds per-user key storage in Supabase with encryption.

## Integration Points

### Frontend → Supabase

| Operation | Method | Notes |
|-----------|--------|-------|
| Sign up (OAuth) | `supabase.auth.signInWithOAuth({ provider, redirectTo })` | Returns URL to open in browser |
| Sign up (Email) | `supabase.auth.signUp({ email, password })` | Sends verification email |
| Sign in (Email) | `supabase.auth.signInWithPassword({ email, password })` | Returns session |
| Sign out | `supabase.auth.signOut()` | Clears session |
| Session refresh | `supabase.auth.refreshSession()` | Auto-refresh enabled by default |
| Load profile | `supabase.from('profiles').select('*').eq('id', userId).single()` | Filtered by RLS |
| Update profile | `supabase.from('profiles').update(data).eq('id', userId)` | RLS enforces ownership |
| Upload avatar | `supabase.storage.from('avatars').upload(path, file)` | Returns public URL |

### Frontend → Backend (Modified)

| Endpoint | Change | Auth Required |
|----------|--------|---------------|
| `GET /api/models` | Filter by auth (Ollama always shown, cloud only if authenticated) | No (but affects response) |
| `POST /api/ask` | Add Authorization header if cloud model | Yes (if cloud model) |
| `POST /api/conversation` | Add Authorization header if cloud model | Yes (if cloud model) |

### Electron → Frontend (IPC)

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `oauth-callback` | Main → Renderer | Send OAuth code after deep link redirect |
| `get-backend-port` | Renderer → Main | Existing (unchanged) |

### Supabase RLS Policies

```sql
-- profiles table
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- api_keys table (future)
CREATE POLICY "Users can manage own keys"
  ON api_keys FOR ALL
  USING (auth.uid() = user_id);

-- avatars storage bucket
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
```

## Anti-Patterns

### Anti-Pattern 1: Multiple Supabase Client Instances

**What people do:** Import `createClient` in every component that needs auth.

**Why it's wrong:** Each client has separate auth state. User logs in via LoginModal, but ModelSelector's client doesn't know about the session.

**Do this instead:** Single client singleton in `api/supabase.ts`, import that everywhere.

### Anti-Pattern 2: Storing Supabase Service Role Key in Frontend

**What people do:** Use service role key (bypasses RLS) for convenience.

**Why it's wrong:** Bundled in Electron executable, easily extracted. Allows full DB access (read all users' data).

**Do this instead:** Use anon key in frontend, service role only in backend/Edge Functions if needed.

### Anti-Pattern 3: Hardcoding OAuth Redirect to localhost

**What people do:** `redirectTo: 'http://localhost:3000/callback'` for testing.

**Why it's wrong:** Breaks in production (no localhost in packaged app). Electron needs custom protocol.

**Do this instead:** `redirectTo: 'lumen://auth/callback'` for Electron. Test in compiled app or use conditional redirects.

### Anti-Pattern 4: Not Checking Session Expiry on App Mount

**What people do:** Load session from localStorage, assume it's valid.

**Why it's wrong:** Tokens expire (default 1 hour access, 7 days refresh). User sees logged-in UI but API calls fail.

**Do this instead:** On app mount, call `supabase.auth.getSession()` (auto-refreshes if expired). Update auth store.

```typescript
// App.tsx useEffect
useEffect(() => {
  const initAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    useAuthStore.getState().setSession(session);
  };
  initAuth();
}, []);
```

### Anti-Pattern 5: Blocking Ollama Behind Auth

**What people do:** Require login for all AI features (consistency).

**Why it's wrong:** Lumen is local-first. Forcing cloud auth for local AI breaks offline use, betrays trust.

**Do this instead:** Gate only cloud models. Ollama works offline, no account needed.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-10k users** | Current architecture fine. Supabase free tier (50K MAU). Backend API keys shared (admin's keys in `.env`). |
| **10k-50k users** | Move to per-user API key storage (Supabase `api_keys` table). Add rate limiting (Supabase Edge Functions or FastAPI middleware). Monitor Supabase usage (upgrade to Pro $25/mo if needed). |
| **50k+ users** | Consider Supabase Pro for better performance. Add caching layer for profiles (Redis). Implement usage quotas (e.g., 100 cloud AI requests/month free, pay for more). May need horizontal scaling for FastAPI (multiple instances behind load balancer). |

### Scaling Priorities

1. **First bottleneck: API costs.** Cloud AI is expensive. When user base grows, shared API keys drain budget fast.
   - **Fix:** Per-user API keys (users bring their own OpenAI/Anthropic keys). Alternatively, add premium tier with usage quotas.

2. **Second bottleneck: Supabase auth throughput.** Free tier: 50K MAU. Above that, $25/mo Pro (unlimited).
   - **Fix:** Upgrade to Pro. If costs become issue, consider self-hosted Supabase (advanced, requires DevOps).

3. **Third bottleneck: Backend spawning (Electron).** Each Electron instance spawns own FastAPI process. At scale (many concurrent users on same machine?), CPU usage grows.
   - **Fix:** Not a real concern. Desktop apps = 1 user per machine. Server deployment (if added) would use single FastAPI instance.

## Build Order

Based on dependencies and integration points:

### Phase 1: Auth Backend (Supabase Setup)
**Why first:** Foundation. Nothing else works without auth infrastructure.

**Tasks:**
1. Create Supabase project, note URL + anon key
2. Configure OAuth providers (Google, GitHub) in Supabase dashboard
3. Create `profiles` table in Supabase SQL editor
4. Set up RLS policies on `profiles`
5. Create `avatars` storage bucket, set RLS policies

**Deliverable:** Supabase project ready, OAuth configured, database schema deployed.

---

### Phase 2: Frontend Auth Foundation
**Why second:** Build auth layer before modifying existing components.

**Tasks:**
1. Add `@supabase/supabase-js` to `frontend/package.json`
2. Create `api/supabase.ts` (client singleton)
3. Create `stores/authStore.ts` (Zustand + persist)
4. Create `types/auth.ts` (Profile, Session types)
5. Test auth in isolation (console.log session after login)

**Deliverable:** Auth store works, can sign in/out via console.

---

### Phase 3: OAuth Flow (Electron Deep Links)
**Why third:** OAuth is hardest part. Needs compiled app to test. Isolate complexity.

**Tasks:**
1. Modify `electron/main.js`: register protocol, handle deep links
2. Add IPC channel `oauth-callback` to `preload.js`
3. Test with compiled app: `npm run build:electron`, open app, try OAuth
4. Handle code exchange in frontend (listener on IPC event)

**Deliverable:** OAuth redirect works end-to-end in packaged app.

---

### Phase 4: Login UI
**Why fourth:** Now that backend works, build user-facing UI.

**Tasks:**
1. Create `components/auth/LoginModal.tsx` (OAuth buttons, email/password form)
2. Wire up `authStore.signIn()` methods
3. Add module-level `openLoginModal()` export (matches OnboardingModal pattern)
4. Test login flow: OAuth + email/password

**Deliverable:** Users can sign up and log in via modal.

---

### Phase 5: Profile Creation & Display
**Why fifth:** After login works, handle first-time user flow.

**Tasks:**
1. Create `components/auth/ProfileModal.tsx` (username claiming, bio, avatar upload)
2. Create `components/common/ProfileCard.tsx` (sidebar display)
3. Add check in `App.tsx`: if session exists but no profile, open ProfileModal
4. Implement avatar upload to Supabase Storage (max 1MB, validate image MIME type)
5. Display username + avatar in ProfileCard

**Deliverable:** New users claim username, existing users see profile in sidebar.

---

### Phase 6: Cloud AI Gating (Frontend)
**Why sixth:** Auth works, profiles display. Now gate cloud models.

**Tasks:**
1. Modify `ModelSelector.tsx`: filter models by auth state
2. Add auth check on model change: if cloud model + no session, call `openLoginModal()`
3. Pass `Authorization: Bearer ${token}` header in `apiFetch()` for cloud requests
4. Test: unauthenticated → select GPT-4o → login prompt shows

**Deliverable:** Cloud models hidden/prompt login when unauthenticated.

---

### Phase 7: Backend Auth Validation
**Why seventh:** Frontend gating is UX. Backend gating is security.

**Tasks:**
1. Create `backend/app/middleware/auth.py` (JWT validation helper)
2. Modify `backend/app/routers/chat.py`: add auth check for cloud models
3. Add `SUPABASE_JWT_SECRET` to backend config (from Supabase dashboard)
4. Test: send request with invalid/missing token → 401 error
5. Frontend handles 401 → show "Session expired, please log in again"

**Deliverable:** Backend rejects unauthenticated cloud AI requests.

---

### Phase 8: Settings & Profile Editing
**Why eighth:** Core flows work. Add management UI.

**Tasks:**
1. Create `components/auth/SettingsPanel.tsx` (profile editing, API key management placeholder)
2. Add settings icon to sidebar (opens SettingsPanel)
3. Allow editing bio, institution, research interests, avatar
4. Add "Sign out" button (calls `authStore.signOut()`)

**Deliverable:** Users can edit profile and sign out.

---

### Phase 9: Polish & Edge Cases
**Why last:** Core features complete. Handle error states, loading states, edge cases.

**Tasks:**
1. Add loading spinners (login in progress, profile loading)
2. Error handling: network errors, invalid credentials, expired session
3. Email verification flow (Supabase sends email, user clicks link, redirect to app)
4. Password reset flow (forgot password → email → reset link)
5. Update onboarding modal: mention "Login to use cloud AI"
6. Session expiry UX: if token expired mid-session, show re-login prompt

**Deliverable:** Production-ready auth with good UX for all states.

---

### Dependencies Between Phases

```
Phase 1 (Supabase Setup)
    ↓
Phase 2 (Auth Store) ←──────────┐
    ↓                            │
Phase 3 (OAuth Deep Links)       │
    ↓                            │
Phase 4 (Login UI) ──────────────┘
    ↓
Phase 5 (Profile Creation) ──→ Can parallelize with Phase 6
    ↓                            ↓
Phase 6 (Cloud AI Gating)    (Independent: Frontend gating)
    ↓
Phase 7 (Backend Validation) (Depends on Phase 6's auth header)
    ↓
Phase 8 (Settings UI) (Needs Phase 5's profile display)
    ↓
Phase 9 (Polish) (Touches all previous phases)
```

## Sources

### Authentication & OAuth
- [Use Supabase Auth with React | Supabase Docs](https://supabase.com/docs/guides/auth/quickstarts/react)
- [PKCE flow | Supabase Docs](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Supabase Zustand Integration Guide — Restack](https://www.restack.io/docs/supabase-knowledge-supabase-zustand-integration)
- [How to use Zustand with Supabase and Next.js App Router? | Medium](https://medium.com/@ozergklp/how-to-use-zustand-with-supabase-and-next-js-app-router-0473d6744abc)

### Electron Deep Links
- [Deep Links | Electron](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app)
- [Building deep-links in Electron application | BigBinary Blog](https://www.bigbinary.com/blog/deep-link-electron-app)
- [How to generate a session for Electron deep link auth? | Supabase Discussion](https://github.com/orgs/supabase/discussions/27181)

### Security Best Practices
- [Understanding API keys | Supabase Docs](https://supabase.com/docs/guides/api/api-keys)
- [Secure Storage of API Keys with Supabase | Medium](https://medium.com/@darvin.dev/secure-storage-of-api-keys-with-supabase-45e3a35d8bb1)
- [How to use Supabase with Electron for desktop apps? | Bootstrapped](https://bootstrapped.app/guide/how-to-use-supabase-with-electron-for-desktop-apps)
- [Best Security Practices in Supabase | Supadex](https://www.supadex.app/blog/best-security-practices-in-supabase-a-comprehensive-guide)

### Row Level Security
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Row Level Security (RLS): Complete Guide 2026 | Vibe App Scanner](https://vibeappscanner.com/supabase-row-level-security)
- [Supabase Row Level Security Explained With Real Examples | Medium](https://medium.com/@jigsz6391/supabase-row-level-security-explained-with-real-examples-6d06ce8d221c)

### Storage & File Upload
- [Supabase Storage: How to Implement File Upload Properly | Niko Fischer](https://nikofischer.com/supabase-storage-file-upload-guide)
- [Standard Uploads | Supabase Docs](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
- [Best practice for loading profiles and avatars? | Supabase Discussion](https://github.com/orgs/supabase/discussions/18877)

### State Management
- [Persisting store data - Zustand](https://zustand.docs.pmnd.rs/integrations/persisting-store-data)
- [persist - Zustand Middleware](https://zustand.docs.pmnd.rs/middlewares/persist)
- [Managing User Sessions with Zustand in React | Medium](https://medium.com/@jkc5186/managing-user-sessions-with-zustand-in-react-5bf30f6bc536)

### Edge Functions & Security
- [Securing Edge Functions | Supabase Docs](https://supabase.com/docs/guides/functions/auth)
- [Environment Variables | Supabase Docs](https://supabase.com/docs/guides/functions/secrets)

---
*Architecture research for: Supabase auth integration with React 19 + FastAPI + Electron*
*Researched: 2026-02-14*
