---
phase: 01-core-ux-fixes
plan: 01
subsystem: ui
tags: [react, typescript, pdf-viewer, highlights, color-preservation]

# Dependency graph
requires:
  - phase: 00-foundation
    provides: PDF viewer with highlight and notes functionality
provides:
  - Color-preserving AI ask functionality that respects user-selected palette colors
  - Dotted underline visual markers for highlights containing notes
  - SelectionTip with tracked color state for AI asks
affects: [ai-features, notes-panel, highlight-system]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Color state tracking in SelectionTip for multi-mode interactions"
    - "Conditional styling based on hasNotes state for visual feedback"

key-files:
  created: []
  modified:
    - frontend/src/components/pdf-viewer/PdfViewer.tsx
    - frontend/src/components/pdf-viewer/SelectionTip.tsx
    - frontend/src/components/pdf-viewer/HighlightContainer.tsx
    - frontend/src/stores/highlightStore.ts

key-decisions:
  - "Retired 'note' as a color value - highlights preserve original user-selected colors when notes are added"
  - "Use borderBottom instead of textDecoration for dotted underline (overlay divs require border-based styling)"
  - "All highlights can open notes panel regardless of color (removed isNote-based restrictions)"

patterns-established:
  - "Pattern 1: Highlight color preservation - color stays with highlight through entire lifecycle, notes do not overwrite"
  - "Pattern 2: Visual distinction via decoration - hasNotes check adds dotted underline without changing color"

# Metrics
duration: 1m 37s
completed: 2026-02-12
---

# Phase 1 Plan 01: Highlight Color Preservation Summary

**Color-preserving AI asks and dotted underline visual markers for notes using palette color tracking and borderBottom styling**

## Performance

- **Duration:** 1m 37s
- **Started:** 2026-02-12T06:25:08Z
- **Completed:** 2026-02-12T06:26:45Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Asking AI about existing highlights preserves their original color instead of overwriting to yellow
- Asking AI from new text selections uses the currently selected palette color
- Highlights with notes display a subtle dotted underline border for visual distinction
- Removed color overwrite logic from addNoteToHighlight in store layer
- All highlights can now open the notes panel (retired isNote-based restrictions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Preserve highlight color on AI ask and use palette color** - `75371be` (feat)
2. **Task 2: Add dotted underline visual marker for highlights with notes** - `f4fb283` (feat)

## Files Created/Modified
- `frontend/src/components/pdf-viewer/PdfViewer.tsx` - Changed handleAskAI to accept selectedColor parameter, uses it instead of hardcoded 'note'
- `frontend/src/components/pdf-viewer/SelectionTip.tsx` - Tracks selected palette color state, passes to onAskAI, adds visual ring indicator for selected color
- `frontend/src/components/pdf-viewer/HighlightContainer.tsx` - Added hasNotes check, conditional borderBottom dotted styling, removed isNote variable, backward compatibility for legacy 'note' color
- `frontend/src/stores/highlightStore.ts` - Removed color overwrite logic in addNoteToHighlight (color no longer changes when notes are added)

## Decisions Made

**1. Retired 'note' as a color value**
- Notes no longer trigger a color change to 'note'
- Existing 'note' highlights render as yellow (#FDE68A) for backward compatibility
- Future highlights keep their original user-selected color throughout their lifecycle

**2. Use borderBottom instead of textDecoration for dotted underline**
- TextHighlight renders overlay divs, not inline text elements
- text-decoration only works on inline text content
- borderBottom on overlay divs produces visible dotted underlines

**3. Remove isNote-based restrictions**
- All highlights can now open the notes panel
- HighlightPopup receives note prop for all highlights
- Simplifies logic and improves UX flexibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Color preservation complete, ready for draggable popups implementation (01-02)
- Visual markers established for notes distinction
- No blockers for next plan

## Self-Check: PASSED

All files and commits verified:

**Files:**
- FOUND: frontend/src/components/pdf-viewer/PdfViewer.tsx
- FOUND: frontend/src/components/pdf-viewer/SelectionTip.tsx
- FOUND: frontend/src/components/pdf-viewer/HighlightContainer.tsx
- FOUND: frontend/src/stores/highlightStore.ts

**Commits:**
- FOUND: 75371be (Task 1)
- FOUND: f4fb283 (Task 2)

---
*Phase: 01-core-ux-fixes*
*Completed: 2026-02-12*
