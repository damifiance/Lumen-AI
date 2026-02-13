# Milestones: Lumen AI

## Completed

### v0.2.1 — UX Improvements
**Shipped:** 2026-02-13
**Phases:** 1-3 (Core UX Fixes, Interactive Enhancements, System Tray & Auto-Update)
**Last phase number:** 3

**What shipped:**
- Fixed popup positioning (notes appear near highlights, not at top-left)
- Draggable note popups and selection tip popups
- Highlight color preservation when asking AI
- Dotted underline markers for highlights with notes
- PDF zoom in/out controls with level display
- System tray icon with menu (Open, Check for Updates, Quit)
- Auto-update checker against GitHub releases
- New Lumen.ai branding/logo
- Text selection fix in PDF viewer

**Requirements completed:** POP-01, POP-02, POP-03, POP-04, HLT-01, HLT-02, HLT-03, PDF-01, PDF-02, PDF-03, TRAY-01, UPD-01

**Key decisions carried forward:**
- Custom pointer events for dragging (no react-draggable, React 19 compatible)
- 3px drag threshold prevents accidental drags
- Zero re-renders during drag via direct DOM manipulation
- 25% zoom step increments
- Highlight color no longer overwritten on AI ask

## Current

### v0.3.0-alpha — Auth & Profiles
**Started:** 2026-02-14
**Status:** Defining requirements

---
*Last updated: 2026-02-14*
