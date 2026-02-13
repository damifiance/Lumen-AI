# Roadmap: Lumen AI UX Improvements

## Overview

This roadmap fixes critical UX breaks in the PDF annotation system and adds essential interactivity. Phase 1 resolves popup positioning bugs, preserves user highlight colors during AI interactions, adds visual markers for AI annotations, and implements zoom controls. Phase 2 enhances the experience by making popups draggable, allowing users to reposition annotations anywhere on screen to see underlying paper content.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Core UX Fixes** - Fix broken popup positioning, color preservation, add zoom and AI markers
- [x] **Phase 2: Interactive Enhancements** - Make popups draggable for flexible positioning
- [ ] **Phase 3: System Tray & Auto-Update** - System tray icon with menu and update checking

## Phase Details

### Phase 1: Core UX Fixes
**Goal**: Users can see popups correctly positioned, preserve their color-coded organization when using AI, distinguish AI annotations, and zoom PDFs.
**Depends on**: Nothing (first phase)
**Requirements**: POP-01, POP-04, HLT-01, HLT-02, HLT-03, PDF-01, PDF-02, PDF-03
**Success Criteria** (what must be TRUE):
  1. Note popups appear near their associated highlights (not at top-left under tab bar)
  2. User's highlight color persists when asking AI about that highlight
  3. Highlights with any notes (AI-generated or user-written) show a dotted underline visual marker
  4. User can zoom in and out on PDF and see the current zoom level
  5. Zoom controls work correctly with existing highlights and popups
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md -- Highlight color preservation on AI ask + dotted underline note markers
- [x] 01-02-PLAN.md -- Popup positioning fixes + universal notes access
- [x] 01-03-PLAN.md -- PDF zoom in/out controls with level display

### Phase 2: Interactive Enhancements
**Goal**: Users can reposition popups anywhere on screen to unblock paper content they need to read.
**Depends on**: Phase 1
**Requirements**: POP-02, POP-03
**Success Criteria** (what must be TRUE):
  1. User can drag note popups by their header to any position on screen
  2. User can drag selection tip popup by its header to any position on screen
  3. Popup position resets when reopened (starts fresh at default position)
  4. Dragging popups doesn't interfere with text selection or copying text from popup content
**Plans**: 1 plan

Plans:
- [ ] 02-01-PLAN.md -- Draggable popups via custom useDraggable hook (NotePopup + SelectionTip)

### Phase 3: System Tray & Auto-Update
**Goal**: Users can check for updates from the system tray and the app lives in the menu bar for quick access.
**Depends on**: Phase 2
**Requirements**: TRAY-01, UPD-01
**Success Criteria** (what must be TRUE):
  1. App shows an icon in the system tray (macOS menu bar / Windows system tray)
  2. Tray menu has: Open Lumen AI, Check for Updates, Quit
  3. Check for Updates compares current version with latest GitHub release
  4. If update available, shows dialog with version info and download link
  5. Closing the window hides to tray instead of quitting (quit only from tray menu)
  6. Works on both macOS and Windows
**Plans**: 1 plan

Plans:
- [ ] 03-01-PLAN.md -- System tray icon, menu, and GitHub release update checker

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core UX Fixes | 3/3 | ✓ Complete | 2026-02-12 |
| 2. Interactive Enhancements | 0/1 | Not started | - |

---
*Roadmap created: 2026-02-12*
*Last updated: 2026-02-12 (Phase 2 planned)*
