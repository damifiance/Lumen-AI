# Feature Research

**Domain:** User authentication, academic profiles, and cloud AI gating in Electron + React app
**Researched:** 2026-02-14
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email/password login | Standard auth method expected in all apps | LOW | Supabase provides out-of-box; includes email validation, password reset |
| OAuth social login (Google, GitHub) | Reduces friction; expected in 2026 academic/tech tools | MEDIUM | Supabase supports; Electron requires PKCE flow with deep links due to OAuth redirect challenges |
| Persistent session | Users expect to stay logged in across app restarts | MEDIUM | JWT stored in Electron safeStorage (encrypted keychain); localStorage for web. Supabase auto-refreshes tokens |
| Logout | Core security requirement | LOW | Clear session + redirect; standard Supabase method |
| Unique username | Social identity feature; expected in academic platforms (ResearchGate, Mendeley) | MEDIUM | Requires real-time uniqueness check; inline validation with server roundtrip |
| Profile avatar upload | Visual identity is table stakes; academic CVs include photos | MEDIUM | Supabase Storage for hosting; needs crop/resize UI (react-avatar-editor pattern) |
| Profile editing | Users expect to update bio, institution, interests | LOW | Standard CRUD on profiles table; form validation |
| Password reset flow | Required when email/password offered | LOW | Supabase magic link pattern; 15-min expiry token via email |
| Email verification | Prevents fake accounts; security best practice | LOW | Supabase built-in; blocks username claim until verified |
| Account deletion | GDPR requirement; user autonomy expectation | MEDIUM | Must delete from profiles + auth.users; 30-day confirmation pattern recommended |
| Feature gating (cloud AI requires auth) | Users understand freemium pattern; local free, cloud requires login | LOW | UI check + modal prompt "Login to use cloud AI"; Ollama ungated |
| API key management UI | If app requires API keys, users need CRUD interface | MEDIUM | Store encrypted in Supabase (never localStorage); per-provider sections |
| Loading states for auth actions | Users need feedback during network-dependent actions | LOW | Spinners, disabled buttons during login/signup/profile save |
| Error handling (auth failures) | Clear feedback when credentials wrong, network fails, etc. | LOW | User-friendly messages; avoid exposing security details |
| Offline behavior (Electron) | Electron apps work offline; graceful degradation expected | MEDIUM | Cache last-known auth state; sync on reconnect; Ollama works fully offline |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Academic profile fields (institution, research interests) | Positions Lumen as academic-first; Zotero/Mendeley have basic profiles, this goes deeper | LOW | Array of tags for research interests; autocomplete from common fields suggests 60% fewer typos, faster input |
| Hybrid local + cloud UX | App is fully functional without account (local Ollama); login unlocks cloud AI — respects privacy, no forced signup | MEDIUM | Clear messaging: "Use Lumen offline with Ollama, or login for OpenAI/Anthropic." Reduces abandonment from mandatory auth |
| Username as chat identity | Shows @username in chat instead of "You"; academic context benefits from identity | LOW | Small UX touch; reinforces profile investment |
| Avatar in chat messages | Visual consistency; user sees their avatar vs AI's logo | LOW | Replaces generic user icon; feels personal |
| Magic link (passwordless email) | Lower friction than password; Slack/Notion use this; good for infrequent academic users | MEDIUM | Supabase signInWithOtp; 10-15min expiry; requires email template customization for PKCE |
| Research interests autocomplete | Suggests common fields (e.g., "Machine Learning", "Neuroscience"); reduces typos, increases consistency | MEDIUM | Study shows autocomplete increases tag consistency 3x, reduces time 40%; fetch from common ontology or past user inputs |
| Login modal (not separate page) | Matches existing modal pattern (codebase uses module-level listener modals); faster flow | LOW | Overlay with Google/GitHub buttons + email form; follows Lumen's existing UI patterns |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Username change after claiming | "I made a typo" or "I want to rebrand" | Breaks @mentions, citations, future social features; opens squatting exploits | Allow during first 24 hours only; after that, contact support with verification |
| Multiple OAuth accounts per user | "I have Google work and personal" | Creates identity merging complexity; Supabase doesn't support out-of-box | One account, one email; user picks primary provider; can change provider but same email |
| Real-time profile sync across devices | "I want instant updates everywhere" | WebSocket overhead for profile data that rarely changes; not worth complexity for MVP | Poll on app focus (check for profile updates every 5min when active); sufficient for profile changes |
| Store API keys in localStorage | "Easy to implement" | Major security risk; XSS exposes keys; GDPR violation | Encrypt in Supabase user_metadata or separate encrypted table; Electron uses safeStorage |
| Auto-login after signup | "Smoother UX" | Email verification best practice requires verification before full access | Show "Check your email to verify" screen; verify → auto-login on return |
| Unlimited file storage for avatars | "Users want flexibility" | Cost and abuse risk; academic avatars don't need 10MB | 2MB limit, square crop, resize to 512x512; sufficient for profile photos |

## Feature Dependencies

```
[OAuth Login (Google/GitHub)]
    └──requires──> [PKCE flow with deep links in Electron]

[Username Claiming]
    └──requires──> [Email Verification]
    └──requires──> [Uniqueness Check API]

[Profile Editing]
    └──requires──> [Auth Session]
    └──requires──> [Avatar Upload to Supabase Storage]

[Cloud AI Gating]
    └──requires──> [Auth Session Check]
    └──requires──> [API Key Management]

[API Key Management]
    └──requires──> [Auth Session]
    └──requires──> [Encrypted Storage in Supabase]

[Account Deletion]
    └──requires──> [Auth Session]
    └──requires──> [Cascade delete profiles + auth.users + avatar files]

[Offline Mode Support] ──enhances──> [Hybrid Local + Cloud UX]

[Research Interests Autocomplete] ──enhances──> [Profile Editing]
```

### Dependency Notes

- **OAuth requires PKCE in Electron:** Standard OAuth redirects fail in Electron; must use authorization code flow with PKCE + custom URL protocol (e.g., `lumen://auth/callback`). Supabase discussion #22270 confirms this pattern.
- **Username claiming requires email verification:** Prevent username squatting; only verified emails can claim usernames. Username locked once claimed (except 24hr grace period).
- **Cloud AI gating requires auth check:** Before showing OpenAI/Anthropic models, check `authStore.session`. If null, show login modal with message "Cloud AI requires an account. Sign up free."
- **API keys require encrypted storage:** Never store in localStorage (XSS risk). Use Supabase user_metadata (encrypted at rest) or separate `api_keys` table with encryption. Electron can use safeStorage API as additional layer.
- **Account deletion cascades:** Delete from `profiles`, `auth.users`, and Supabase Storage avatar files. GDPR requires full deletion within 30 days; recommend immediate with 24hr undo window.
- **Offline support enhances UX:** Electron apps cache last auth state; if offline, show cached profile but disable cloud features. Ollama continues working. On reconnect, refresh session.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [x] **Email/password signup + login** — Core auth method; no OAuth dependencies
- [x] **Session persistence** — Users stay logged in across restarts; essential for desktop app
- [x] **Username claiming on first login** — Unique @handle; must happen before profile access
- [x] **Basic profile editing (username, bio, avatar)** — Minimal fields to have identity
- [x] **Avatar upload with crop** — Visual identity; 2MB limit, crop to square
- [x] **Cloud AI gating** — Core value prop: Ollama free, OpenAI/Anthropic require login
- [x] **Logout** — Security requirement
- [x] **Password reset** — Required when email/password offered
- [x] **Loading states + error messages** — UX baseline; users need feedback

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **OAuth (Google + GitHub)** — Add when Electron PKCE flow is stable; reduces friction but adds complexity
- [ ] **Email verification flow** — Add after launch to prevent username squatting (can launch with honor system)
- [ ] **Institution field** — Academic profile depth; useful but not blocking
- [ ] **Research interests with autocomplete** — Enhances profile but not required for v1
- [ ] **Magic link (passwordless email)** — Alternative auth; nice-to-have after core email/password proven
- [ ] **API key management UI** — Can defer if beta users manually add via settings; build when needed

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Account deletion (GDPR)** — Required for production but can be manual support flow for beta
- [ ] **Cross-device profile sync status UI** — Show "Last synced 2 hours ago"; informational only
- [ ] **Profile privacy controls** — Public vs private profiles; needed when social features launch
- [ ] **Avatar crop/rotate/filters** — Advanced editing; basic crop sufficient for MVP
- [ ] **Username change grace period (24hr)** — Reduces support burden but adds logic; defer until pattern emerges
- [ ] **"Continue with Apple"** — Third OAuth provider; wait to see if Google/GitHub cover 90%+

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Email/password auth | HIGH | LOW | P1 |
| Session persistence | HIGH | MEDIUM | P1 |
| Username claiming | HIGH | MEDIUM | P1 |
| Profile editing (basic) | HIGH | LOW | P1 |
| Avatar upload + crop | HIGH | MEDIUM | P1 |
| Cloud AI gating | HIGH | LOW | P1 |
| Password reset | MEDIUM | LOW | P1 |
| Logout | HIGH | LOW | P1 |
| Error handling | HIGH | LOW | P1 |
| OAuth (Google/GitHub) | MEDIUM | HIGH | P2 |
| Email verification | MEDIUM | LOW | P2 |
| Magic link auth | LOW | MEDIUM | P2 |
| Institution field | MEDIUM | LOW | P2 |
| Research interests + autocomplete | MEDIUM | MEDIUM | P2 |
| API key management UI | MEDIUM | MEDIUM | P2 |
| Account deletion | LOW | MEDIUM | P3 |
| Profile privacy controls | LOW | MEDIUM | P3 |
| Username change grace | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (MVP)
- P2: Should have, add when possible (v1.x)
- P3: Nice to have, future consideration (v2+)

## Competitor Feature Analysis

| Feature | Zotero | Mendeley | ResearchGate | Our Approach (Lumen AI) |
|---------|--------|----------|--------------|-------------------------|
| **Authentication** | Email/password only | Email/password + Google | Email/password + multiple OAuth | Email/password + Google + GitHub (Supabase); magic link as differentiator |
| **Username** | No unique username (just display name) | No @handle (email-based identity) | Has unique profile URL (researchgate.net/profile/Name) | Unique @username like Instagram; shows in chat for identity |
| **Profile fields** | Name, institution (basic) | Name, field of study, academic status (dropdown) | Name, institution, department, position, skills, research interests | Name, @username, bio, institution, research interests (tags with autocomplete) |
| **Avatar** | Optional gravatar from email | Upload profile photo | Upload profile photo | Upload + crop to square; stored in Supabase Storage; shows in chat |
| **Feature gating** | All features free | Free for basic, Pro for storage/collab | Freemium (reading free, publishing/stats require RG Score or payment) | Hybrid: Ollama free forever, cloud AI (OpenAI/Anthropic) requires account |
| **Account deletion** | Manual support request | Settings > Delete account | Settings > Delete account | GDPR-compliant deletion; one-click in settings (future P3) |
| **Session management** | Desktop app stays logged in | Desktop app stays logged in; web requires re-login | Web-based; cookie session | Electron: encrypted safeStorage; web: localStorage with auto-refresh |

## UX Flow Patterns

### First-Time User Flow (No Account)

1. **App opens** → User sees onboarding: "Use Lumen with local AI (Ollama) or sign up for cloud AI"
2. **User skips signup** → Full app access with Ollama models
3. **User tries to select OpenAI** → Modal: "Cloud AI requires an account. Sign up free." [Google] [GitHub] [Email]
4. **User chooses signup** → Email signup form or OAuth redirect
5. **After signup** → Username claiming screen: "Choose your @username (3-30 characters, unique)"
6. **Username claimed** → Profile setup: "Add a profile picture and bio (optional)"
7. **Profile complete** → Redirected to app; cloud AI now available

### Returning User Flow (Has Account)

1. **App opens** → Session auto-restored from encrypted storage
2. **User sees their avatar + @username** in sidebar and chat
3. **Cloud AI models available** immediately (no prompt)
4. **Session expires after 7 days** → Modal: "Your session expired. Please log in again."

### OAuth in Electron Flow (PKCE)

1. **User clicks "Continue with Google"**
2. **App opens system browser** (not embedded) with Supabase OAuth URL
3. **User authorizes on Google** in their default browser
4. **Google redirects to `lumen://auth/callback?code=...`**
5. **Electron deep link handler** catches URL, extracts code
6. **Frontend calls Supabase** `exchangeCodeForSession(code)` to get JWT
7. **Session stored** in Electron safeStorage (encrypted keychain)
8. **App redirects** to username claiming or main app

### Username Uniqueness Check UX

1. **User types username** in input field
2. **After 500ms debounce** → API call: `GET /api/profiles/check-username?username=...`
3. **If available** → Green checkmark: "✓ @username is available"
4. **If taken** → Red X: "✗ @username is taken. Try another."
5. **Real-time feedback** → No submit-and-fail; users know before clicking "Claim Username"

### Avatar Upload + Crop UX

1. **User clicks avatar placeholder** or "Change Avatar" button
2. **File picker opens** → User selects image (PNG, JPG, GIF; max 2MB)
3. **Crop modal appears** → react-avatar-editor with zoom slider and drag-to-reposition
4. **User adjusts** → Preview shows circular crop
5. **User clicks "Save"** → Uploads to Supabase Storage as 512x512 square
6. **Avatar updates** → Shows in profile and chat immediately

### Cloud AI Gating UX

1. **User not logged in** → Model selector shows only "Ollama (Local)" section
2. **User clicks "Add Model"** → Only Ollama models shown; "Cloud AI" section grayed out with lock icon
3. **User clicks locked section** → Modal: "Cloud AI requires a Lumen account. Sign up free to access OpenAI and Anthropic models." [Sign Up] [Log In]
4. **After login** → Model selector refreshes; "OpenAI" and "Anthropic" sections now active
5. **User selects GPT-4** → If no API key: "Add your OpenAI API key in Settings to use this model." [Go to Settings]

## Sources

### Authentication & Session Management
- [Use Supabase Auth with React | Supabase Docs](https://supabase.com/docs/guides/auth/quickstarts/react)
- [Authenticating user in Electron app via default browser | Supabase Discussion #22270](https://github.com/orgs/supabase/discussions/22270)
- [Electron Sessions: Is the Default Session Persistent? Complete 2026 Guide](https://copyprogramming.com/howto/in-electron-is-the-default-session-persistent)
- [safeStorage | Electron](https://www.electronjs.org/docs/latest/api/safe-storage)
- [Build and Secure an Electron App - OpenID, OAuth, Node.js, and Express](https://auth0.com/blog/securing-electron-applications-with-openid-connect-and-oauth-2/)

### OAuth & Social Login UX
- [Login & Signup UX: The 2025 Guide to Best Practices (Examples & Tips) - Authgear](https://www.authgear.com/post/login-signup-ux-guide)
- [Using OAuth 2.0 for Web Server Applications | Authorization | Google for Developers](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Best Practices | Authorization Resources | Google for Developers](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)

### Passwordless Authentication
- [Passwordless email logins | Supabase Docs](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Learn how magic links work, their benefits, and how to implement them | SuperTokens](https://supertokens.com/blog/magiclinks)
- [The beginner's guide to magic links | Postmark](https://postmarkapp.com/blog/magic-links)

### User Profiles & Metadata
- [User Management | Supabase Docs](https://supabase.com/docs/guides/auth/managing-user-data)
- [Best practices for adding "username" to profiles table at signup? | Supabase Discussion #3491](https://github.com/orgs/supabase/discussions/3491)
- [Zotero vs. Mendeley vs. AI: Which Reference Manager Is Best for You?](https://www.sourcely.net/resources/zotero-vs-mendeley-vs-ai-which-reference-manager-is-best-for-you)

### Form Validation & UX Patterns
- [The Ultimate UX Design of Form Validation](https://designmodo.com/ux-form-validation/)
- [Inline form validations — UX design considerations and React examples | by Shan Plourde | Medium](https://medium.com/@shanplourde/inline-form-validations-ux-design-considerations-and-react-examples-c2f53f89bebc)

### Avatar Upload & Cropping
- [react-avatar-editor | GitHub](https://github.com/mosch/react-avatar-editor)
- [Top React image cropping libraries - LogRocket Blog](https://blog.logrocket.com/top-react-image-cropping-libraries/)
- [Userpic UI design: Tutorial for Avatar states, anatomy, usability](https://www.setproduct.com/blog/avatar-ui-design)

### Feature Gating & Freemium Patterns
- [App paywall optimization - Business of Apps](https://www.businessofapps.com/guide/app-paywall-optimization/)
- [10 Types of Paywalls for Mobile Apps and Examples](https://adapty.io/blog/the-10-types-of-mobile-app-paywalls/)
- [App Monetization Models That Work in 2026 | Honeygain SDK](https://sdk.honeygain.com/blog/app-monetization-models/)

### Academic Tools & Research Interests
- [The effects of suggested tags and autocomplete features on social tagging behaviors](https://www.researchgate.net/publication/346387302_The_effects_of_suggested_tags_and_autocomplete_features_on_social_tagging_behaviors)
- [Customizable Tags in AI-Powered Research Tools](https://www.sourcely.net/resources/customizable-tags-in-ai-powered-research-tools)

### GDPR & Account Deletion
- [Art. 17 GDPR – Right to erasure ('right to be forgotten') - General Data Protection Regulation (GDPR)](https://gdpr-info.eu/art-17-gdpr/)
- [GDPR compliance and account deletion | Getaround Tech](https://getaround.tech/gdpr-account-deletion/)

### Offline-First Patterns
- [Offline-First Apps: Key Use Cases and Benefits in 2026](https://www.octalsoftware.com/blog/offline-first-apps)
- [A Design Guide for Building Offline First Apps](https://hasura.io/blog/design-guide-to-offline-first-apps)
- [Why Offline First Apps Will Dominate In 2026 | by Labeeb Ali | Dec, 2025 | Medium](https://medium.com/@tekwrites/why-offline-first-apps-are-dominating-2026-c76e5083d686)

---
*Feature research for: User authentication, academic profiles, and cloud AI gating in Lumen AI*
*Researched: 2026-02-14*
