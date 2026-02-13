# Technology Stack — Auth & Profiles

**Project:** Lumen AI — Milestone 3 (Auth & Profiles)
**Researched:** 2026-02-14
**Overall Confidence:** HIGH

## Executive Summary

Adding Supabase authentication, user profiles, and cloud AI gating to Lumen AI requires strategic stack additions that integrate seamlessly with the existing React 19 + FastAPI + Electron architecture. The recommended approach uses Supabase's native JS SDK on the frontend with PKCE flow for Electron OAuth, Python Supabase client on the backend for JWT validation, and Supabase Vault for encrypted API key storage. This maintains the local-first architecture while enabling optional cloud features.

## Recommended Stack Additions

### Frontend — Authentication & Profiles

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @supabase/supabase-js | 2.95.3+ | Core Supabase client (auth, storage, DB) | Official SDK with comprehensive auth methods (OAuth, email/password, MFA). Auto-refresh, session management, PKCE support. **CONFIDENCE: HIGH** (official SDK) |
| react-avatar-editor | 14.0.0+ | Avatar cropping & editing | Canvas-based image editor with 85K weekly downloads. Intuitive UI for crop/resize/rotate. Returns canvas or blob for upload. **CONFIDENCE: HIGH** (popular, stable) |
| electron-store | 9.0.0+ | Local preferences storage | Simple JSON-based persistence for user preferences (UI settings, etc). NOT for session tokens. **CONFIDENCE: HIGH** (standard Electron utility) |

**Note:** `@supabase/auth-helpers-react` is DEPRECATED. Do NOT use. Supabase recommends direct use of `@supabase/supabase-js` for client-side React apps.

### Backend — JWT Validation & API Key Encryption

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| supabase | 2.28.0+ | Python Supabase client | Official Python client for Supabase. Used for JWT validation via `auth.get_user()`, RLS-aware queries, and Vault access. Python >=3.9 required. **CONFIDENCE: HIGH** (official SDK) |
| PyJWT | 2.11.0+ | JWT decoding & validation | Validates Supabase access tokens using HS256 (or RS256/ES256 with JWKS). Industry standard for Python JWT handling. **CONFIDENCE: HIGH** (standard library) |
| python-multipart | 0.0.18+ | Multipart form parsing | Required for FastAPI file uploads (avatar images). Parses `multipart/form-data` encoding. **CONFIDENCE: HIGH** (FastAPI requirement) |

**Existing Dependencies (Already Installed):**
- `python-dotenv>=1.0` — Load Supabase credentials from `.env` (already in requires.txt)
- `pydantic-settings>=2.7` — Type-safe settings management (already in requires.txt)

### Database — Supabase Postgres + Vault

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase Postgres | 15+ | User profiles, API key storage | Managed Postgres with built-in RLS, full-text search, vector search. Free tier: 500MB DB, 50K MAU. **CONFIDENCE: HIGH** (official platform) |
| Supabase Vault | Built-in | Encrypted API key storage | Transparent column encryption using Authenticated Encryption. Secrets encrypted at rest, decrypted via SQL views (`vault.decrypted_secrets`). **CONFIDENCE: HIGH** (official feature) |
| Supabase Storage | Built-in | Avatar image storage | S3-compatible object storage with built-in image transformations. RLS policies control access. Presigned URLs for secure access. **CONFIDENCE: HIGH** (official feature) |

### Electron — Secure Token Storage

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Electron SafeStorage | Built-in | Secure session token storage | OS-level encryption via Keychain (macOS), Credential Vault (Windows), libsecret (Linux). Protects refresh tokens at rest. **CONFIDENCE: HIGH** (official Electron API) |

**Why NOT electron-store for tokens:** electron-store's encryption is "not intended for security purposes" (per docs) — key is easily found in plaintext Node.js app. Use only for non-sensitive preferences.

## Installation Instructions

### Frontend

```bash
cd frontend
npm install @supabase/supabase-js@latest
npm install react-avatar-editor@latest
npm install electron-store@latest
```

### Backend

```bash
cd backend
pip install supabase>=2.28.0
pip install PyJWT>=2.11.0
pip install python-multipart>=0.0.18
```

Note: `python-dotenv` and `pydantic-settings` already installed.

## Integration Architecture

### 1. Authentication Flow (Electron + Web)

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (React)                                            │
│  - @supabase/supabase-js client                            │
│  - PKCE flow for Electron OAuth (Google, GitHub)           │
│  - Email/password via signInWithPassword()                  │
│  - Session stored in SafeStorage (Electron) or localStorage│
│  - Auto-refresh enabled (default)                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ JWT in Authorization header
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend (FastAPI)                                           │
│  - JWT validation middleware (PyJWT or supabase.auth)      │
│  - Extract user_id from JWT claims                          │
│  - Pass user_id to protected routes                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Service role key + RLS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Supabase Backend                                            │
│  - Postgres DB with RLS policies (user_id = auth.uid())    │
│  - Vault for encrypted API keys (OpenAI, Anthropic)        │
│  - Storage for avatar images with RLS                       │
└─────────────────────────────────────────────────────────────┘
```

### 2. Frontend: Supabase Client Setup

**Implementation pattern:**

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.electron
      ? customElectronStorage  // SafeStorage wrapper
      : window.localStorage,   // Web fallback
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,  // For OAuth redirects
  }
})
```

**Custom Electron storage wrapper:**
```typescript
// Uses Electron SafeStorage via IPC to main process
const customElectronStorage = {
  getItem: (key: string) => window.electron.getSecureItem(key),
  setItem: (key: string, value: string) => window.electron.setSecureItem(key, value),
  removeItem: (key: string) => window.electron.removeSecureItem(key),
}
```

### 3. Backend: JWT Validation Middleware

**Two approaches (choose one):**

**Option A: Using supabase-py (recommended for RLS integration):**
```python
from supabase import create_client
from fastapi import Depends, HTTPException, Request

async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid token")

    token = auth_header.split(" ")[1]

    # Validate with Supabase
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    try:
        user = await supabase.auth.get_user(token)
        return user.user.id
    except Exception:
        raise HTTPException(401, "Invalid token")
```

**Option B: Using PyJWT (faster, no Supabase call):**
```python
import jwt
from fastapi import Depends, HTTPException, Request

async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid token")

    token = auth_header.split(" ")[1]

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload["sub"]  # user_id
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
```

**Recommendation:** Use Option A (supabase-py) initially for simplicity. Switch to Option B (PyJWT) if JWT validation becomes a bottleneck.

**JWKS Migration (late 2026):** Supabase is transitioning from symmetric (HS256) to asymmetric (RS256/ES256) JWT signing using JWKS. Expected completion: late 2026. When migrating, update to fetch JWKS from `https://<project>.supabase.co/.well-known/jwks.json` and use RS256 validation.

### 4. User Profiles Table Schema

```sql
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null check (length(username) >= 3 and length(username) <= 20),
  display_name text,
  avatar_url text,
  bio text,
  institution text,
  research_interests text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Username uniqueness check function
create or replace function public.is_username_available(username_to_check text)
returns boolean as $$
  select not exists (
    select 1 from public.profiles where username = username_to_check
  );
$$ language sql security definer;
```

### 5. API Keys Encrypted Storage (Supabase Vault)

```sql
-- Store encrypted API key
select vault.create_secret(
  'user-openai-key-' || auth.uid()::text,  -- Unique name per user
  'sk-...',  -- API key
  'OpenAI API key for user'  -- Description
);

-- Retrieve decrypted API key
select decrypted_secret
from vault.decrypted_secrets
where name = 'user-openai-key-' || auth.uid()::text;
```

**Backend Python implementation:**
```python
from supabase import create_client

async def get_user_api_key(user_id: str, provider: str):
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    result = supabase.rpc(
        'get_user_api_key',
        {'user_id': user_id, 'provider': provider}
    ).execute()
    return result.data
```

### 6. Avatar Upload Flow

**Frontend:**
```typescript
import AvatarEditor from 'react-avatar-editor'

// 1. User selects image, crops with AvatarEditor
const canvas = avatarEditorRef.current.getImage()
const blob = await new Promise<Blob>((resolve) =>
  canvas.toBlob(resolve, 'image/jpeg', 0.9)
)

// 2. Upload to Supabase Storage
const fileName = `${user.id}/${Date.now()}.jpg`
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(fileName, blob, {
    contentType: 'image/jpeg',
    upsert: true
  })

// 3. Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(fileName)

// 4. Update profile with avatar URL
await supabase
  .from('profiles')
  .update({ avatar_url: publicUrl })
  .eq('id', user.id)
```

**Supabase Storage bucket configuration:**
- Bucket: `avatars`
- Public: YES (for profile images)
- File size limit: 2MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
- RLS policy: Users can upload/update own avatars only

```sql
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');
```

### 7. Cloud AI Gating Logic

**Frontend API client modification:**
```typescript
// src/api/client.ts
export async function apiFetch(endpoint: string, options?: RequestInit) {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}${endpoint}`

  // Add JWT if user is logged in
  const { data: { session } } = await supabase.auth.getSession()
  const headers = {
    ...options?.headers,
    ...(session && { Authorization: `Bearer ${session.access_token}` })
  }

  return fetch(url, { ...options, headers })
}
```

**Backend gating:**
```python
from fastapi import Depends, HTTPException

async def require_auth(user_id: str = Depends(get_current_user)):
    """Dependency that requires authentication"""
    return user_id

async def allow_anonymous(request: Request):
    """Dependency that allows anonymous OR authenticated"""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

# Route examples
@app.post("/api/chat/ollama")
async def chat_ollama(
    request: ChatRequest,
    user_id: str | None = Depends(allow_anonymous)  # Optional auth
):
    # Ollama works for everyone
    ...

@app.post("/api/chat/openai")
async def chat_openai(
    request: ChatRequest,
    user_id: str = Depends(require_auth)  # Required auth
):
    # Get user's encrypted API key from Vault
    api_key = await get_user_api_key(user_id, "openai")
    if not api_key:
        raise HTTPException(403, "OpenAI API key not configured")
    ...
```

## OAuth Configuration (Supabase Dashboard)

### Google OAuth Setup
1. **Google Cloud Console:**
   - Create OAuth 2.0 Client ID (Web application)
   - Authorized JavaScript origins:
     - `https://<project>.supabase.co`
     - `http://localhost:5173` (dev)
     - `lumen://` (Electron deep link)
   - Authorized redirect URIs:
     - `https://<project>.supabase.co/auth/v1/callback`
     - `http://localhost:5173/auth/callback` (dev)
     - `lumen://auth/callback` (Electron)

2. **Supabase Dashboard:**
   - Auth > Providers > Google
   - Enable Google provider
   - Add Client ID and Client Secret
   - Redirect URL: `https://<project>.supabase.co/auth/v1/callback`

### GitHub OAuth Setup
1. **GitHub Settings:**
   - Developer settings > OAuth Apps > New OAuth App
   - Homepage URL: `https://<project>.supabase.co`
   - Authorization callback URL: `https://<project>.supabase.co/auth/v1/callback`

2. **Supabase Dashboard:**
   - Auth > Providers > GitHub
   - Enable GitHub provider
   - Add Client ID and Client Secret

### Electron Deep Linking
**electron/main.js:**
```javascript
import { protocol } from 'electron'

// Register custom protocol
protocol.registerSchemesAsPrivileged([
  { scheme: 'lumen', privileges: { standard: true, secure: true } }
])

app.whenReady().then(() => {
  protocol.registerHttpProtocol('lumen', (request, callback) => {
    // Handle OAuth callback: lumen://auth/callback?code=...
    const url = new URL(request.url)
    if (url.pathname === '/auth/callback') {
      mainWindow.webContents.send('oauth-callback', url.searchParams.toString())
    }
  })
})
```

**Frontend (React):**
```typescript
useEffect(() => {
  if (window.electron) {
    window.electron.onOAuthCallback((params: string) => {
      const urlParams = new URLSearchParams(params)
      const code = urlParams.get('code')

      // Exchange code for session using PKCE
      supabase.auth.exchangeCodeForSession(code)
    })
  }
}, [])
```

## Security Considerations

### 1. Token Storage Security
- **Web:** localStorage (acceptable for short-lived access tokens)
- **Electron:** SafeStorage (OS-level encryption for refresh tokens)
- **Never:** Store service role key in frontend

### 2. API Key Encryption
- **Always:** Use Supabase Vault for user API keys (OpenAI, Anthropic)
- **Never:** Store API keys in plaintext in profiles table
- **Backend only:** Service role key in `.env`, never exposed to frontend

### 3. Row Level Security (RLS)
- **Enable RLS** on all user-facing tables (profiles, encrypted_keys, etc.)
- **Policies use** `auth.uid()` to restrict access to own data
- **Test thoroughly** by attempting to access other users' data

### 4. JWT Validation
- **Verify audience:** `"authenticated"` for user tokens
- **Check expiration:** Access tokens expire in 1 hour (default)
- **Use JWKS** for asymmetric validation (late 2026 migration)

### 5. Avatar Upload Validation
- **Backend validation:** File size, MIME type, dimensions
- **Storage RLS:** Users can only upload to own folder
- **Malware scanning:** Consider Supabase Storage's built-in virus scanning (paid tiers)

## What NOT to Add

| Technology | Why NOT |
|------------|---------|
| @supabase/auth-helpers-react | DEPRECATED. Use @supabase/supabase-js directly |
| @supabase/ssr | Only for SSR frameworks (Next.js, Remix). Not needed for SPA + FastAPI |
| Auth.js/NextAuth | Overkill. Supabase Auth is simpler and sufficient |
| Clerk / Auth0 | Adds cost ($25-99/mo). Supabase Auth free tier (50K MAU) is sufficient |
| Firebase Auth | Vendor lock-in. Supabase Auth better aligns with Postgres |
| bcrypt (Python) | Not needed. Supabase handles password hashing |
| node-keytar | Replaced by Electron SafeStorage (built-in) |
| secure-electron-store | Unnecessary complexity. SafeStorage is simpler |

## Environment Variables Required

### Frontend (.env)
```bash
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Backend (.env)
```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret
```

**Security notes:**
- Anon key is safe to expose (client-side). RLS protects data.
- Service role key MUST stay server-side. Bypasses RLS.
- JWT secret used for local JWT validation (optional, can validate with Supabase API).

## Cost Analysis (Supabase Free Tier)

| Resource | Free Tier Limit | Lumen AI Usage Estimate | Sufficient? |
|----------|-----------------|-------------------------|-------------|
| Database | 500MB | ~100MB (10K users, profiles + keys) | YES |
| Storage | 1GB | ~500MB (10K users, 50KB avatars) | YES |
| Auth MAU | 50,000 | Likely <1K initially | YES |
| Bandwidth | 5GB/month | ~2GB (avatar loads, API calls) | YES |
| Edge Functions | 500K invocations | Not used | N/A |

**Paid upgrade ($25/mo) needed when:**
- Users exceed 50K MAU
- Storage exceeds 1GB (avatar heavy usage)
- Need database backups (not included in free tier)

## Migration Path from Local to Supabase

**Phase 1: Add Auth (no breaking changes)**
- Auth is optional
- Existing features work without login
- Ollama remains free

**Phase 2: Add Profiles (new feature)**
- Profile creation on first login
- Username selection
- Avatar upload

**Phase 3: Migrate API Keys (breaking change)**
- Move API keys from local storage to Supabase Vault
- Require login for OpenAI/Anthropic
- Migration script for existing users

**Phase 4: Cloud Sync (future)**
- Sync highlights/notes to Supabase
- Cross-device sync
- Still local-first (offline capable)

## Testing Considerations

### Unit Tests
- JWT validation middleware (mock tokens)
- RLS policies (Supabase test helpers)
- Avatar upload validation (file size, MIME type)

### Integration Tests
- OAuth flow (E2E with test accounts)
- Profile CRUD operations
- API key encryption/decryption (Vault)

### Security Tests
- Attempt to access other users' profiles
- Attempt to upload oversized avatars
- Attempt to use expired JWT tokens

## Sources

**HIGH CONFIDENCE (Official Documentation):**
- [Supabase JavaScript API Reference](https://supabase.com/docs/reference/javascript/auth-api)
- [Supabase PKCE Flow Documentation](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Vault Documentation](https://supabase.com/docs/guides/database/vault)
- [FastAPI Settings and Environment Variables](https://fastapi.tiangolo.com/advanced/settings/)
- [Electron SafeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage)
- [PyJWT Documentation](https://pyjwt.readthedocs.io/)

**MEDIUM CONFIDENCE (Official npm/PyPI):**
- [@supabase/supabase-js on npm](https://www.npmjs.com/package/@supabase/supabase-js) — Version 2.95.3
- [supabase-py on PyPI](https://pypi.org/project/supabase/) — Version 2.28.0
- [PyJWT on PyPI](https://pypi.org/project/PyJWT/) — Version 2.11.0
- [react-avatar-editor on npm](https://www.npmjs.com/package/react-avatar-editor) — Version 14.0.0
- [electron-store on npm](https://www.npmjs.com/package/electron-store) — Version 9.0.0

**MEDIUM CONFIDENCE (Implementation Guides):**
- [Using Supabase with Electron](https://bootstrapped.app/guide/how-to-use-supabase-with-electron-for-desktop-apps)
- [Supabase Authorization with FastAPI](https://iamstarcode.hashnode.dev/using-supabase-authorization-with-fastapi)
- [Supabase Auth with FastAPI Implementation](https://medium.com/@ojasskapre/implementing-supabase-authentication-with-next-js-and-fastapi-5656881f449b)
- [React Image Upload with Supabase](https://www.restack.io/docs/supabase-knowledge-react-image-upload-supabase-example)
- [FastAPI File Uploads Guide (2026)](https://oneuptime.com/blog/post/2026-01-26-fastapi-file-uploads/view)

**LOW CONFIDENCE (Community Discussions, needs validation):**
- [Supabase Electron Auth Discussion](https://github.com/orgs/supabase/discussions/27181) — Deep linking approach
- [Best Practices for Avatars](https://github.com/orgs/supabase/discussions/18877) — Storage patterns
- [FastAPI Supabase Integration Discussion](https://github.com/orgs/supabase/discussions/33811) — Architecture patterns
