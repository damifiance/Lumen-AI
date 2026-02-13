# Lumen AI

## What This Is

Lumen AI is a local AI-powered tool for reading academic papers. Users highlight text, ask AI to explain passages, and chat about entire papers — running locally via Ollama or through cloud providers (OpenAI, Anthropic). Desktop app built with React 19 + FastAPI + Electron.

## Core Value

Researchers can read, annotate, and discuss papers with AI — locally and privately by default, with optional cloud features behind authentication.

## Current Milestone: v0.3.0-alpha Auth & Profiles

**Goal:** Add user accounts via Supabase. App remains fully functional offline with Ollama — accounts unlock cloud AI providers and future premium features.

**Target features:**
- Sign up/login via Google OAuth, GitHub OAuth, or email/password
- Full academic profile (unique @username, avatar, bio, institution, research interests)
- Cloud AI (OpenAI/Anthropic) gated behind authentication
- Production-ready auth (email verification, password reset, account deletion)

## Requirements

### Validated

- ✓ PDF viewing with clean, modern interface — v0.1.0
- ✓ Multi-tab paper management — v0.1.0
- ✓ Text highlighting in multiple colors, saved automatically — v0.1.0
- ✓ Notes attached to text selections — v0.1.0
- ✓ Select text and ask AI questions about passages — v0.1.0
- ✓ Multi-turn AI chat about entire paper — v0.1.0
- ✓ Pin folders for quick access — v0.1.0
- ✓ Local model support via Ollama — v0.1.0
- ✓ Multi-model support (OpenAI, Anthropic) — v0.1.0
- ✓ LaTeX/KaTeX rendering — v0.1.0
- ✓ Customizable keyboard shortcuts — v0.1.0
- ✓ Cross-platform desktop app (macOS, Windows, Linux) — v0.1.0
- ✓ File browser for paper navigation — v0.1.0
- ✓ SSE streaming for real-time AI responses — v0.1.0
- ✓ Popup positioning near highlights — v0.2.0
- ✓ Draggable note and selection popups — v0.2.0
- ✓ Highlight color preservation on AI ask — v0.2.0
- ✓ Dotted underline markers for highlights with notes — v0.2.0
- ✓ PDF zoom in/out controls — v0.2.0
- ✓ System tray icon with menu — v0.2.1
- ✓ Auto-update checker (GitHub releases) — v0.2.1

### Active

- [ ] User authentication (Google, GitHub, email/password) via Supabase
- [ ] User profiles with unique @username, avatar, bio, institution, research interests
- [ ] Cloud AI gating behind authentication
- [ ] Email verification, password reset, account deletion
- [ ] Secure API key management for cloud AI providers

### Out of Scope

- Premium purchases / payment integration (Stripe) — future milestone
- Cross-device paper sync — future milestone
- Social features (sharing highlights, following researchers) — future milestone
- Team/organization accounts — future milestone
- Usage analytics dashboard — future milestone
- Re-select already-highlighted text — deferred, lower priority
- Independent color/notes control — deferred, requires data model changes
- Dark mode — not requested

## Context

**Existing codebase:** React 19 + FastAPI + Electron, using react-pdf-highlighter-extended for PDF rendering and annotations. Zustand stores manage state. Highlights stored in SQLite via SQLAlchemy.

**Architecture:** Hybrid local + cloud. PDFs, highlights, notes, and Ollama AI stay local. User profiles, auth, and cloud AI keys stored in Supabase. Session via Supabase JWT.

**Codebase mapping:** Full analysis available in `.planning/codebase/` (7 documents covering stack, architecture, structure, conventions, testing, integrations, concerns).

## Constraints

- **Tech stack**: React 19, FastAPI, Electron — no changes to core stack
- **Auth provider**: Supabase (free tier, 50K MAU)
- **Backward compatibility**: App must work fully without login (local Ollama)
- **Platform**: Must work in both Electron desktop and web browser modes
- **Security**: API keys encrypted at rest, never exposed in frontend

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for auth + DB | Free tier (50K MAU), hosted Postgres, built-in auth, storage | — Pending |
| Hybrid local + cloud | PDFs stay local for privacy; profiles sync to cloud | — Pending |
| OAuth (Google + GitHub) + email/password | Cover most academic users; GitHub for devs, Google for everyone | — Pending |
| Auth is optional | Local Ollama works without login; cloud AI gated behind account | — Pending |
| Unique @username | Like Instagram handle; displayed in chat instead of "You" | — Pending |
| PKCE flow for Electron OAuth | Secure OAuth redirect in desktop app via custom protocol handler | — Pending |

---
*Last updated: 2026-02-14 after milestone v0.3.0-alpha initialization*
