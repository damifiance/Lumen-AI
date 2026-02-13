# Requirements: Lumen AI Auth & Profiles

**Defined:** 2026-02-14
**Core Value:** Researchers can read, annotate, and discuss papers with AI — locally and privately by default, with optional cloud features behind authentication

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User can log in with Google OAuth
- [ ] **AUTH-03**: User can log in with GitHub OAuth
- [ ] **AUTH-04**: User session persists across app restarts
- [ ] **AUTH-05**: User can log out

### Profiles

- [ ] **PROF-01**: New user must pick a unique @username on first login
- [ ] **PROF-02**: User can upload and crop a profile image
- [ ] **PROF-03**: User can edit bio
- [ ] **PROF-04**: User can set institution
- [ ] **PROF-05**: User can add research interests

### Security & Polish

- [ ] **SEC-01**: User receives email verification after signup
- [ ] **SEC-02**: User can reset password via email link
- [ ] **SEC-03**: User can delete their account and all associated data
- [ ] **SEC-04**: All auth actions show loading states and user-friendly error messages
- [ ] **SEC-05**: App works fully offline with Ollama (auth is optional)

## v2 Requirements

### Premium & Cloud AI

- **PREM-01**: Logged-in premium users can use cloud AI models (OpenAI, Anthropic) via backend-proxied API key
- **PREM-02**: User can subscribe to premium tier
- **PREM-03**: Usage tracking and rate limiting for cloud AI

### Social & Sync

- **SYNC-01**: Cross-device paper sync
- **SOCL-01**: Share highlights with other users
- **SOCL-02**: Follow researchers

## Out of Scope

| Feature | Reason |
|---------|--------|
| API key management UI (user's own keys) | Using backend-proxied key for premium; users don't manage their own |
| Cloud AI gating | Deferred to premium/paid tiers milestone |
| Payment integration (Stripe) | Future milestone |
| Cross-device paper sync | Future milestone |
| Social features | Future milestone |
| Team/organization accounts | Future milestone |
| Dark mode | Not requested |
| Username change after claiming | Breaks future @mentions; contact support instead |
| Multiple OAuth accounts per user | Identity merging complexity; one account per email |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| AUTH-04 | — | Pending |
| AUTH-05 | — | Pending |
| PROF-01 | — | Pending |
| PROF-02 | — | Pending |
| PROF-03 | — | Pending |
| PROF-04 | — | Pending |
| PROF-05 | — | Pending |
| SEC-01 | — | Pending |
| SEC-02 | — | Pending |
| SEC-03 | — | Pending |
| SEC-04 | — | Pending |
| SEC-05 | — | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 0
- Unmapped: 15 ⚠️

---
*Requirements defined: 2026-02-14*
*Last updated: 2026-02-14 after milestone v0.3.0-alpha definition*
