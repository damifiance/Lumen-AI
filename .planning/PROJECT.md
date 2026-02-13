# Lumen AI — UX Improvements

## What This Is

Lumen AI is a local AI-powered tool for reading academic papers. Users highlight text, ask AI to explain passages, and chat about entire papers — all running locally. This milestone focuses on fixing critical UX issues with the highlight/notes system and adding PDF zoom controls.

## Core Value

Users can see and interact with their notes and highlights without fighting the interface. Popup visibility and highlight integrity are the foundation of the annotation experience.

## Requirements

### Validated

- ✓ PDF viewing with clean, modern interface — existing
- ✓ Multi-tab paper management — existing
- ✓ Text highlighting in multiple colors, saved automatically — existing
- ✓ Notes attached to text selections — existing
- ✓ Select text and ask AI questions about passages — existing
- ✓ Multi-turn AI chat about entire paper — existing
- ✓ Pin folders for quick access — existing
- ✓ Local model support via Ollama — existing
- ✓ Multi-model support (OpenAI, Anthropic) — existing
- ✓ LaTeX/KaTeX rendering — existing
- ✓ Customizable keyboard shortcuts — existing
- ✓ Cross-platform desktop app (macOS, Windows, Linux) — existing
- ✓ File browser for paper navigation — existing
- ✓ SSE streaming for real-time AI responses — existing

### Active

- [ ] Fix popup positioning (notes appear under tab bar, not near highlight)
- [ ] Make note popups draggable anywhere on screen
- [ ] Make selection tip popup draggable anywhere on screen
- [ ] Preserve highlight color when asking AI (don't overwrite to yellow)
- [ ] Add dotted underline visual marker for highlights with AI-generated notes
- [ ] Add PDF zoom in/zoom out controls

### Out of Scope

- Re-select text that's already highlighted — deferred, lower priority than visibility fixes
- Independent color/notes control (change color without losing notes) — deferred, requires data model changes
- Dark mode — not requested
- Full-text search across papers — not requested
- Highlight export — not requested

## Context

**Existing codebase:** React 19 + FastAPI + Electron, using react-pdf-highlighter-extended for PDF rendering and annotations. Zustand stores manage state. Highlights stored in SQLite via SQLAlchemy.

**Key pain points:**
1. Note popups appear at top-left of screen (likely under tab bar) instead of near the highlight — makes notes unusable
2. Popups can't be moved — blocks paper context the user needs to read
3. Asking AI about highlighted text overwrites the user's chosen color to yellow — loses organizational meaning
4. No visual distinction between plain highlights and highlights with AI notes attached

**Codebase mapping:** Full analysis available in `.planning/codebase/` (7 documents covering stack, architecture, structure, conventions, testing, integrations, concerns).

## Constraints

- **Tech stack**: Must work within existing react-pdf-highlighter-extended library (or work around its limitations)
- **Compatibility**: Changes must not break existing highlights stored in the database
- **Platform**: Must work in both Electron desktop and web browser modes

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dotted underline for AI notes | Visual distinction between user highlights and AI-annotated highlights without changing color | — Pending |
| Draggable popups (unconstrained) | User wants to move popups anywhere on screen to see paper context | — Pending |
| Preserve highlight color on AI ask | Current behavior overwrites color to yellow, losing user's organizational system | — Pending |

---
*Last updated: 2026-02-12 after initialization*
