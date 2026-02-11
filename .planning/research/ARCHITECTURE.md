# Architecture Research

**Domain:** PDF Annotation UX Improvements
**Researched:** 2026-02-12
**Confidence:** MEDIUM

## Component Architecture

### Current Component Hierarchy
```
App.tsx
├── TabBar
├── PdfViewer (react-pdf-highlighter-extended)
│   ├── PdfHighlighter (provides PdfHighlighterContext)
│   │   ├── HighlightContainer (per highlight)
│   │   │   ├── TextHighlight (renders colored overlay)
│   │   │   ├── HighlightPopup (hover tooltip)
│   │   │   └── NotePopup (click to view notes) ← POSITIONING BUG HERE
│   │   └── SelectionTip (appears on text selection) ← POSITIONING BUG HERE
│   └── pdfjs viewer
├── ChatPanel
└── FileBrowser
```

### Proposed Changes

**1. Popup Positioning Fix**
- Problem: NotePopup and SelectionTip calculate position relative to wrong container
- Root cause: Likely using absolute positioning within a scrollable/transformed container
- Fix: Use `getBoundingClientRect()` of the highlight element + viewport-aware positioning
- Consider: React Portal to render popups at document body level to escape stacking context

**2. Draggable Popups**
- Add drag handle to NotePopup and SelectionTip headers
- Track position with `useRef` during drag, CSS transform for movement
- Reset position when popup closes
- No persistence needed (popup position resets each open)

**3. Highlight Color Preservation**
- Problem: AI "ask" flow creates new highlight with hardcoded yellow color
- Fix: When asking AI about existing highlight, preserve original color
- When asking AI about new selection, use user's currently selected color (not yellow)
- Data flow: `chatStore.askAboutSelection()` → should pass existing highlight color

**4. Dotted Underline Marker**
- Add CSS class to TextHighlight when highlight has AI notes (comment field contains AI response)
- Detection: Check if `highlight.comment` contains AI-generated note entries
- Rendering: Apply `border-bottom: 2px dotted` via conditional className

## Data Flow

### Current Highlight Creation Flow
```
User selects text → SelectionTip appears → User picks color
→ POST /api/highlights (color, position, content_text)
→ highlightStore.addHighlight() → re-render
```

### Current AI Ask Flow (BUGGY)
```
User selects text → User clicks "Ask AI"
→ POST /api/chat/ask (selected text, paper context)
→ Creates NEW highlight with color="yellow" ← BUG: overwrites existing color
→ highlightStore.addHighlight()
```

### Proposed AI Ask Flow (FIXED)
```
User selects text (or clicks existing highlight) → User asks AI
→ Check if selection overlaps existing highlight
  → YES: Use existing highlight's color, append AI note to comment
  → NO: Create new highlight with current palette color
→ POST /api/highlights (preserved color, AI note in comment)
→ highlightStore.updateHighlight() or addHighlight()
```

## Build Order

1. **Fix popup positioning** — Foundation for everything else
2. **Add draggable behavior** — Depends on positioning being correct
3. **Fix highlight color preservation** — Independent of positioning
4. **Add dotted underline marker** — Depends on color fix (needs to know which highlights have AI notes)
5. **Add zoom controls** — Independent, can be Phase 2

## Key Integration Points

| Component | File | What Changes |
|-----------|------|-------------|
| NotePopup | `frontend/src/components/pdf-viewer/NotePopup.tsx` | Positioning, drag behavior |
| SelectionTip | `frontend/src/components/pdf-viewer/SelectionTip.tsx` | Positioning, drag behavior |
| HighlightContainer | `frontend/src/components/pdf-viewer/HighlightContainer.tsx` | Dotted underline CSS class |
| TextHighlight style | `frontend/src/components/pdf-viewer/HighlightContainer.tsx` | Color preservation |
| chatStore | `frontend/src/stores/chatStore.ts` | Pass existing color to API |
| highlightStore | `frontend/src/stores/highlightStore.ts` | Update vs create logic |
| chat.ts API | `frontend/src/api/chat.ts` | Accept color parameter |
| highlights router | `backend/app/routers/highlights.py` | No changes needed |

---
*Architecture research: 2026-02-12*
