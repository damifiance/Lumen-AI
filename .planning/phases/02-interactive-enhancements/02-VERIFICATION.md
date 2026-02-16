---
phase: 02-interactive-enhancements
verified: 2026-02-12T00:00:00Z
status: human_needed
score: 4/4
re_verification: false
human_verification:
  - test: "Drag note popup by header"
    expected: "Popup moves smoothly across screen, following cursor"
    why_human: "Visual drag behavior and smooth motion require manual observation"
  - test: "Drag selection tip toolbar"
    expected: "Toolbar moves with cursor, color buttons remain clickable"
    why_human: "Interactive drag while maintaining button functionality needs manual testing"
  - test: "Close and reopen note popup"
    expected: "Popup appears at default position (not previous dragged location)"
    why_human: "Position reset behavior needs manual verification across open/close cycles"
  - test: "Switch SelectionTip modes (default to Ask AI/Note and back)"
    expected: "Position resets when switching modes"
    why_human: "State reset across mode transitions requires manual verification"
  - test: "Select and copy text from note popup content"
    expected: "Text selection works normally, drag doesn't interfere"
    why_human: "User interaction quality (text selection vs drag) needs manual testing"
  - test: "Type in Ask AI/Add Note textarea while dragged"
    expected: "Textarea remains editable, cursor doesn't trigger drag"
    why_human: "Input interaction quality needs manual verification"
  - test: "Arrow caret visibility when dragging NotePopup"
    expected: "Arrow disappears after dragging, reappears at default position"
    why_human: "Visual indicator behavior based on position needs manual observation"
---

# Phase 2: Interactive Enhancements Verification Report

**Phase Goal:** Users can reposition popups anywhere on screen to unblock paper content they need to read.
**Verified:** 2026-02-12T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can drag note popups by their header to any position on screen | ✓ VERIFIED | useDraggable hook implemented, NotePopup header has drag-handle class, HighlightContainer applies dragOffset via CSS transform |
| 2 | User can drag selection tip popup by its header to any position on screen | ✓ VERIFIED | SelectionTip imports useDraggable, both default and expanded modes have drag-handle classes, offset applied via transform |
| 3 | Popup position resets when reopened (starts fresh at default position) | ✓ VERIFIED | HighlightContainer calls resetPosition() in handleOpenNotes (line 44), SelectionTip calls resetPosition() in resetMode (line 38) and mode switches (lines 147, 157) |
| 4 | Dragging popups does not interfere with text selection or copying text from popup content | ✓ VERIFIED | NotePopup: drag-handle only on header (line 149), content areas remain selectable; SelectionTip expanded mode: drag-handle only on header (line 71), textarea not included |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/hooks/useDraggable.ts` | Reusable drag hook using pointer events and CSS transform | ✓ VERIFIED | 144 lines, exports useDraggable with pointer capture, 3px threshold, CSS transform positioning, resetPosition function |
| `frontend/src/components/pdf-viewer/NotePopup.tsx` | Draggable note popup with header drag handle | ✓ VERIFIED | Contains drag-handle class on header (line 149) with cursor-grab styling, showArrow prop (line 28) for conditional arrow display |
| `frontend/src/components/pdf-viewer/HighlightContainer.tsx` | Portal-rendered NotePopup with drag offset applied via CSS transform | ✓ VERIFIED | Imports useDraggable (line 11), uses hook (line 39), applies dragOffset to transform (lines 118-119), calls resetPosition in handleOpenNotes (line 44), showArrow wired (line 134) |
| `frontend/src/components/pdf-viewer/SelectionTip.tsx` | Draggable selection tip with header drag handle in both default and expanded modes | ✓ VERIFIED | Imports useDraggable (line 3), uses hook (line 25), drag-handle on toolbar (line 127) and expanded header (line 71), offset applied (lines 69, 128), resetPosition called (lines 38, 147, 157) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `frontend/src/hooks/useDraggable.ts` | `frontend/src/components/pdf-viewer/HighlightContainer.tsx` | useDraggable hook import | ✓ WIRED | Import at line 11, destructured usage at line 39 with containerRef, offset, resetPosition |
| `frontend/src/hooks/useDraggable.ts` | `frontend/src/components/pdf-viewer/SelectionTip.tsx` | useDraggable hook import | ✓ WIRED | Import at line 3, destructured usage at line 25 with containerRef, offset, resetPosition |
| `frontend/src/components/pdf-viewer/NotePopup.tsx` | `frontend/src/components/pdf-viewer/HighlightContainer.tsx` | drag-handle className on header div | ✓ WIRED | NotePopup header has drag-handle class (line 149), HighlightContainer passes handleSelector: '.drag-handle' (line 40) to useDraggable |

**Additional Wiring Verification:**

- **resetPosition called in handleOpenNotes:** ✓ Line 44 in HighlightContainer.tsx
- **dragOffset applied to transform:** ✓ Lines 118-119 with calc() combining library positioning and drag offset
- **showArrow conditional rendering:** ✓ Line 134 checks dragOffset.x === 0 && dragOffset.y === 0
- **SelectionTip mode reset:** ✓ Lines 38 (resetMode), 147 (note mode), 157 (askAI mode)

### Requirements Coverage

No explicit requirements mapping found in REQUIREMENTS.md for Phase 02. Phase ROADMAP references POP-02 and POP-03 requirements, but these are not detailed in REQUIREMENTS.md. Automated verification cannot assess requirements coverage.

### Anti-Patterns Found

No anti-patterns detected in phase files:

- No TODO/FIXME/PLACEHOLDER comments found
- No empty implementations (return null, return {}, console.log only)
- No stub patterns detected

**Commits Verified:**
- ✓ 7cfdff3 - feat(02-01): create useDraggable hook and make NotePopup draggable
- ✓ 66686a7 - feat(02-01): make SelectionTip draggable with position reset on mode change
- ✓ daccb34 - fix(02-01): correct useDraggable containerRef type to allow null

All commits exist in git history.

### Human Verification Required

Automated checks cannot verify visual drag behavior, interaction quality, or user experience. The following manual tests are required:

#### 1. Drag Note Popup by Header

**Test:** Open a note popup on an existing highlight, click and drag the header area
**Expected:** Popup moves smoothly across screen following cursor, does not snap or jump
**Why human:** Visual smoothness of drag motion and pointer tracking quality require manual observation

#### 2. Drag Selection Tip Toolbar

**Test:** Highlight text, drag the selection tip toolbar by clicking anywhere on it
**Expected:** Toolbar moves with cursor, color picker buttons remain clickable after drag
**Why human:** Drag interaction while maintaining button functionality needs manual testing

#### 3. Position Reset on Note Popup Reopen

**Test:** Drag note popup to new position, close it, reopen it (click highlight again)
**Expected:** Popup appears at default position (centered above/below highlight), not at previous dragged location
**Why human:** Position reset behavior across open/close cycles requires manual verification

#### 4. Position Reset on SelectionTip Mode Switch

**Test:** Drag selection tip in default mode, click "Ask AI" button, drag expanded mode, click X to return to default
**Expected:** Position resets when switching from default to expanded and back to default
**Why human:** State reset across mode transitions requires manual verification

#### 5. Text Selection in Note Popup Content

**Test:** Open note popup, try to select existing note text or type and select new note text
**Expected:** Text selection works normally, clicking in content area doesn't trigger drag
**Why human:** User interaction quality (text selection vs drag initiation) needs manual testing

#### 6. Typing in Dragged Ask AI/Note Textarea

**Test:** Drag SelectionTip expanded mode (Ask AI or Add Note), click in textarea, type text
**Expected:** Textarea remains fully editable, cursor doesn't trigger drag, text input works normally
**Why human:** Input interaction quality in dragged state needs manual verification

#### 7. Arrow Caret Visibility on Drag

**Test:** Open note popup (observe arrow pointing at highlight), drag popup away from default position
**Expected:** Arrow caret disappears after drag starts, reappears when popup closed and reopened at default position
**Why human:** Visual indicator behavior based on position state needs manual observation

### Gaps Summary

No gaps found. All must-haves are verified at all three levels:
- **Level 1 (Exists):** All artifacts present in codebase
- **Level 2 (Substantive):** All artifacts contain expected patterns (useDraggable implementation, drag-handle classes, transform applications)
- **Level 3 (Wired):** All key links verified (imports, usage, resetPosition calls, dragOffset applications)

Automated verification passes. Human verification required for interaction quality and visual behavior.

---

_Verified: 2026-02-12T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
