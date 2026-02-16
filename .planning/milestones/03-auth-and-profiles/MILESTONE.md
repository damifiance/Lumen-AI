# Milestone 3: User Authentication & Profiles

## What This Is

Add user accounts to Lumen AI using Supabase as the cloud backend. Users can sign up, log in, and have a full academic profile. The app remains fully functional offline with local Ollama AI — accounts unlock cloud AI providers (OpenAI, Anthropic) and future premium features.

## Core Value

Users have a persistent identity across devices. Their profile, API keys, and preferences sync to the cloud while papers and local AI remain on-device. This is the foundation for future social features, cloud sync, and premium tiers.

## Architecture Decision: Hybrid Local + Cloud

| Layer | Local (unchanged) | Cloud (new — Supabase) |
|-------|-------------------|------------------------|
| PDF storage | On-device filesystem | — |
| Highlights/notes | Local SQLite | — (future: optional sync) |
| AI chat (Ollama) | Local backend | — |
| AI chat (OpenAI/Anthropic) | — | Requires account + API keys |
| User profiles | — | Supabase Postgres |
| Auth | — | Supabase Auth |
| Avatar storage | — | Supabase Storage |

## Auth Strategy

- **Provider**: Supabase Auth (free tier: 50K MAU)
- **Methods**: Google OAuth + GitHub OAuth + email/password
- **Login scope**: Optional — app works fully with local Ollama without login. Cloud AI requires account.
- **Session**: Supabase JWT stored in Electron's secure storage / browser localStorage

## User Profile Schema

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,        -- @handle, unique like Instagram
  display_name TEXT,
  avatar_url TEXT,                       -- Supabase Storage URL
  bio TEXT,
  institution TEXT,                      -- University/company
  research_interests TEXT[],             -- Array of tags
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Username rules:**
- 3-30 characters, lowercase alphanumeric + underscores
- Unique, claimed on signup (like Instagram @handle)
- Displayed in chat as username instead of "You"
- Profile avatar replaces the default User icon in chat

## Phases

### Phase 1: Supabase Setup & Auth Backend
**Goal**: Users can sign up and log in via Google, GitHub, or email.

**Tasks:**
1. Create Supabase project, configure OAuth providers (Google, GitHub)
2. Add `@supabase/supabase-js` to frontend dependencies
3. Create Supabase client singleton with anon key
4. Build auth context/store (Zustand) — session state, login/logout actions
5. Add login/signup UI (modal or page)
6. Wire Electron: store refresh token securely, handle OAuth redirect
7. Add RLS (Row Level Security) policies on profiles table

**Success Criteria:**
- User can sign up with email or OAuth
- User can log in and session persists across app restart
- User can log out
- Works in both Electron and web browser

### Phase 2: User Profiles
**Goal**: Users have a complete academic profile with unique username and avatar.

**Tasks:**
1. Create `profiles` table in Supabase (schema above)
2. Username claiming flow on first login (check uniqueness, validate format)
3. Profile edit page/modal (avatar upload, bio, institution, research interests)
4. Avatar upload to Supabase Storage with size/format validation
5. Profile display in sidebar (replace generic icon with avatar + username)
6. Chat messages show username + avatar for the user, "Lumen" + logo for AI

**Success Criteria:**
- New user must pick a unique username on first login
- User can upload/change profile picture
- User can edit bio, institution, research interests
- Username and avatar appear in chat messages
- Profile persists across sessions

### Phase 3: Cloud AI Gating
**Goal**: Cloud AI providers (OpenAI, Anthropic) require an authenticated account.

**Tasks:**
1. Add API key management UI (store encrypted in Supabase, never in localStorage)
2. Gate cloud AI model selection behind auth check
3. Show "Login to use cloud AI" prompt when unauthenticated user selects cloud model
4. Keep Ollama models fully accessible without login
5. Add account settings page (API keys, connected accounts, danger zone)

**Success Criteria:**
- Ollama works without any account
- Selecting an OpenAI/Anthropic model prompts login if not authenticated
- API keys stored securely in Supabase (encrypted at rest)
- User can add/remove/rotate API keys from settings

### Phase 4: Polish & Security
**Goal**: Production-ready auth with proper security and UX edge cases.

**Tasks:**
1. Email verification flow
2. Password reset flow
3. Rate limiting on auth endpoints
4. Account deletion (GDPR compliance)
5. Loading states, error handling, session expiry UX
6. Onboarding flow update (show login option, explain local vs cloud)

**Success Criteria:**
- Email verification required for email signups
- Password reset works end-to-end
- User can fully delete their account and all associated data
- All auth errors show user-friendly messages

## Tech Stack Additions

| Tool | Purpose | Cost |
|------|---------|------|
| Supabase | Auth, Postgres DB, file storage | Free (50K MAU) → $25/mo Pro |
| `@supabase/supabase-js` | Frontend SDK | Free (npm) |
| `@supabase/ssr` | Server-side auth helpers | Free (npm) |

## Out of Scope (Future)

- Premium purchases / payment integration (Stripe)
- Cross-device paper sync
- Social features (sharing highlights, following researchers)
- Team/organization accounts
- Usage analytics dashboard

## Risks

| Risk | Mitigation |
|------|-----------|
| OAuth redirect in Electron is tricky | Use Supabase's PKCE flow with deep links / custom protocol handler |
| Username squatting | Require email verification before username claim; add reserved words list |
| API key security | Encrypt at rest in Supabase; never expose in frontend; use Supabase Edge Functions as proxy |
| Free tier limits | 50K MAU is generous; monitor usage; upgrade path is $25/mo |

---
*Created: 2026-02-13*
*Status: Planning*
