---
phase: 02-interactive-enhancements
plan: 01
subsystem: pdf-viewer
tags:
  - draggable-ui
  - popups
  - ux
  - interaction
dependency_graph:
  requires:
    - NotePopup component (phase 01)
    - SelectionTip component (existing)
    - HighlightContainer component (existing)
  provides:
    - useDraggable hook
    - Draggable NotePopup
    - Draggable SelectionTip
  affects:
    - All popup interactions in PDF viewer
tech_stack:
  added:
    - Custom pointer events API (replacing deprecated react-draggable)
  patterns:
    - Custom React hook for drag behavior
    - CSS transform-based positioning
    - Pointer capture for smooth dragging
    - Transient state with useRef (avoid re-renders during drag)
key_files:
  created:
    - frontend/src/hooks/useDraggable.ts
  modified:
    - frontend/src/components/pdf-viewer/NotePopup.tsx
    - frontend/src/components/pdf-viewer/HighlightContainer.tsx
    - frontend/src/components/pdf-viewer/SelectionTip.tsx
decisions:
  - "Custom pointer events instead of react-draggable library (avoids deprecated findDOMNode incompatible with React 19 strict mode)"
  - "3px drag threshold prevents accidental drags when clicking buttons"
  - "Zero re-renders during drag using direct DOM manipulation with useRef"
  - "Arrow caret hidden when NotePopup dragged away from default position"
  - "Position resets on popup reopen and mode changes for predictable UX"
metrics:
  duration: 243
  completed: 2026-02-12
---

# Phase 02 Plan 01: Draggable Popups Summary

**One-liner:** Custom pointer event-based draggable popups (NotePopup and SelectionTip) with position reset and arrow hiding, avoiding deprecated react-draggable library.

## What Was Built

### Core Components

**1. useDraggable Hook** (`frontend/src/hooks/useDraggable.ts`)
- Reusable React hook for making elements draggable by a handle selector
- Uses modern pointer events API (pointerdown/pointermove/pointerup) with pointer capture
- CSS transform-based positioning (no layout thrashing)
- Zero re-renders during drag via direct DOM manipulation with useRef
- 3px movement threshold prevents accidental drags when clicking buttons
- Returns containerRef, offset state, resetPosition function, and isDragging flag
- Touch-action: none applied during drag to prevent scroll interference

**2. Draggable NotePopup**
- Header div now has `drag-handle` class with `cursor-grab` styling
- Portal wrapper in HighlightContainer uses useDraggable hook
- Drag offset applied via CSS transform combining library positioning with user drag
- Arrow caret hidden when popup dragged away from default position (showArrow prop)
- Position automatically resets when popup reopened (resetPosition called in handleOpenNotes)
- Note content areas remain selectable (drag only works on header)

**3. Draggable SelectionTip**
- Both default mode (color toolbar) and expanded mode (Ask AI / Add Note) are draggable
- Default mode: entire toolbar is drag handle (no text to select)
- Expanded mode: only header is drag handle, textarea remains interactive
- Position resets when switching between modes (resetPosition in mode change handlers)
- Position naturally resets on new text selection (component remount by react-pdf-highlighter)
- Drag offset additive to library's calculated positioning

## Task Breakdown

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create useDraggable hook and make NotePopup draggable | 7cfdff3 | useDraggable.ts, NotePopup.tsx, HighlightContainer.tsx |
| 2 | Make SelectionTip draggable with position reset on mode change | 66686a7 | SelectionTip.tsx |
| - | Fix TypeScript type for containerRef (null union) | daccb34 | useDraggable.ts |

## Verification Results

**TypeScript Compilation:** ✅ PASSED
- `npx tsc --noEmit` - no errors

**Build:** ✅ PASSED
- `npm run build` - successful production build

**Manual Testing Required:**
1. Open app, highlight text, drag SelectionTip toolbar → should move
2. Click "Ask AI", drag by header → should move, textarea still editable
3. Switch back to default mode → position should reset
4. Open note popup on existing highlight, drag by header → should move
5. Close and reopen note popup → should appear at default position (not dragged location)
6. Verify arrow caret disappears when NotePopup dragged away
7. Verify note content text is selectable and copyable

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type error in useDraggable**
- **Found during:** Build verification after Task 2
- **Issue:** `RefObject<HTMLDivElement>` incompatible with `useRef<HTMLDivElement>(null)` which returns `RefObject<HTMLDivElement | null>`
- **Fix:** Changed interface type to `RefObject<HTMLDivElement | null>` to match useRef behavior
- **Files modified:** frontend/src/hooks/useDraggable.ts
- **Commit:** daccb34

## Architecture Notes

**Why custom pointer events instead of react-draggable?**
Per .planning/research/STACK.md, react-draggable uses deprecated findDOMNode() which breaks in React 19 strict mode. Our custom implementation:
- Uses modern pointer capture API for smooth dragging
- Applies CSS transforms directly to DOM during drag (zero re-renders)
- Commits final offset to React state only on pointerup
- Fully compatible with React 19 and future versions

**Why useRef for transient drag state?**
Following Zustand pattern from STACK.md research: avoiding useState during active drag prevents thousands of re-renders. We only commit the final offset to state when drag completes.

**Why 3px threshold?**
Users clicking the close button or other header elements shouldn't accidentally trigger a drag. 3px minimum movement ensures intentional dragging.

## Next Steps

**Manual Verification:**
- Test all drag behaviors in development environment
- Verify touch/mobile drag behavior (pointer events support touch)
- Confirm no performance issues during drag

**Potential Future Enhancements:**
- Constrain drag bounds to viewport (prevent dragging popups offscreen)
- Persist drag positions across sessions (localStorage)
- Add snap-to-edge behavior for better organization

## Self-Check: PASSED

**Files created:**
✅ frontend/src/hooks/useDraggable.ts

**Files modified:**
✅ frontend/src/components/pdf-viewer/NotePopup.tsx
✅ frontend/src/components/pdf-viewer/HighlightContainer.tsx
✅ frontend/src/components/pdf-viewer/SelectionTip.tsx

**Commits exist:**
✅ 7cfdff3 - feat(02-01): create useDraggable hook and make NotePopup draggable
✅ 66686a7 - feat(02-01): make SelectionTip draggable with position reset on mode change
✅ daccb34 - fix(02-01): correct useDraggable containerRef type to allow null

**TypeScript compiles:** ✅ PASSED
**Build succeeds:** ✅ PASSED

All files created, all commits exist, TypeScript compiles, build succeeds.
