# Phase 1: Core UX Fixes - Research

**Researched:** 2026-02-12
**Domain:** React + TypeScript PDF annotation UI/UX improvements
**Confidence:** HIGH

## Summary

Phase 1 addresses four critical UX issues in a React-based PDF reader built with `react-pdf-highlighter-extended` v8.0.0 and PDF.js v4.10.38:

1. **Popup Positioning** - Note popups currently appear at top-left/under tab bar instead of near highlights
2. **Highlight Color Preservation** - Asking AI about an existing highlight incorrectly overwrites the color to yellow ("note")
3. **Visual Note Markers** - Need to add dotted underlines to distinguish highlights with notes from plain highlights
4. **PDF Zoom Controls** - Add zoom in/out functionality with zoom level display

The application uses React 19.2, TypeScript, Zustand for state management, and Tailwind CSS 4.0. The PDF viewer is implemented with `react-pdf-highlighter-extended`, which provides a customizable annotation layer on top of PDF.js.

**Primary recommendation:** Focus on understanding the library's built-in tip positioning system before implementing custom portal-based popups. The zoom feature requires accessing the PDFViewer instance through `usePdfHighlighterContext()` and controlling its `currentScale` property.

## Current Architecture

### Component Structure
```
App.tsx
├── TabBar (fixed header, potential popup overlap issue)
├── PdfViewer
│   ├── PdfLoader (loads PDF document)
│   └── PdfHighlighter (viewport + selection handling)
│       ├── SelectionTip (color picker + Note/Ask AI buttons)
│       └── HighlightContainer (per-highlight renderer)
│           ├── MonitoredHighlightContainer (hover detection + tip management)
│           ├── TextHighlight (colored background)
│           └── HighlightPopup (in library's tip system)
└── ChatPanel (sidebar for AI conversations)
```

### Data Flow
**Source:** Codebase analysis (`/Users/damifiance/workspace/AI-paper-reader/frontend/src`)

1. **Highlight Creation:**
   - User selects text → `PdfHighlighter.onSelection` fires
   - User clicks color button → `handleHighlight(color)` in PdfViewer
   - User clicks "Ask AI" → `handleAskAI()` creates highlight with `color: 'note'`
   - Data saved to backend via `highlightApi.createHighlight()`

2. **Note Popup Flow:**
   - User hovers highlight → `MonitoredHighlightContainer` shows `HighlightPopup`
   - User clicks "Open notes" → `handleOpenNotes()` in HighlightContainer
   - Custom portal-based `NotePopup` positioned with `getBoundingClientRect()`

3. **AI Ask Flow:**
   - From SelectionTip: Creates new highlight with `color: 'note'`, calls `askAboutSelection()`
   - From HighlightPopup: Uses existing highlight, calls `askAboutSelection()` with `highlightId`
   - AI response saved as note entry to highlight's `comment` field

### Highlight Data Model
**Source:** `/Users/damifiance/workspace/AI-paper-reader/frontend/src/types/highlight.ts`

```typescript
interface HighlightData {
  id: string;
  paper_path: string;
  content_text: string;
  position_json: string;  // Serialized Position object
  color: string;          // Hex color OR 'note'
  comment: string;        // JSON array of NoteEntry objects
  created_at: string;
}
```

**Color semantics:**
- Hex colors (`#FFFF00`, `#86EFAC`, etc.) = user-selected palette highlight
- `'note'` = special marker for highlights with notes (renders as yellow `#FDE68A`)

**Problem:** When asking AI about an existing colored highlight, `PdfViewer.handleAskAI()` creates a NEW highlight with `color: 'note'`, not preserving the original color.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-pdf-highlighter-extended | 8.0.0 | PDF annotation layer | Modern fork with zoom support, React 19 compatible, actively maintained |
| pdfjs-dist | 4.10.38 | PDF rendering engine | Mozilla's official PDF.js library, industry standard |
| zustand | 5.0.0 | State management | Lightweight, TypeScript-first, no boilerplate |
| Tailwind CSS | 4.0.0 | Styling | Utility-first, small bundle, rapid iteration |

**Installation:**
```bash
# Already installed in project
npm install react-pdf-highlighter-extended pdfjs-dist zustand
```

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.470.0 | Icons | Already in use, consistent icon set |
| react-dom (createPortal) | 19.2.0 | Portal rendering | For popups that escape parent overflow/z-index |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-pdf-highlighter-extended | react-pdf-viewer with highlight plugin | Would require major rewrite, losing existing architecture |
| Custom popup positioning | Floating UI / Popper.js | Adds dependency for problem we can solve with library's built-in system |

## Architecture Patterns

### Pattern 1: Library's Built-in Tip System
**Source:** [react-pdf-highlighter-extended docs](https://danielarnould.github.io/react-pdf-highlighter-extended/docs/)

**What:** `MonitoredHighlightContainer` provides hover detection + `highlightTip` prop for automatic positioning

**When to use:** For simple hover popups that don't need external state or complex interactions

**Example:**
```typescript
// From HighlightContainer.tsx (current implementation)
const tip: Tip = {
  position: highlight.position,
  content: <HighlightPopup ... />
};

<MonitoredHighlightContainer highlightTip={tip}>
  <TextHighlight highlight={highlight} ... />
</MonitoredHighlightContainer>
```

**Positioning behavior:**
- Tips automatically place centered above the highlight
- If too close to top edge, flips to below
- Left-edge clipping prevention built-in
- Updates on scroll via library's internal listeners

**Caveat:** Library positions relative to the highlight's bounding box in the PDF viewport. If the viewport container has overflow or transforms, positioning may be offset. The TabBar is outside the PDF viewport, so shouldn't cause issues for library-managed tips.

### Pattern 2: Custom Portal Positioning
**Source:** [Teleportation in React: Positioning, Stacking Context, and Portals](https://www.developerway.com/posts/positioning-and-portals-in-react)

**What:** Manual positioning using `createPortal` + `getBoundingClientRect()` for full control

**When to use:** For complex popups with external state, multiple interaction modes, or non-hover triggers

**Example:**
```typescript
// From HighlightContainer.tsx (NotePopup implementation)
const handleOpenNotes = useCallback(() => {
  const rect = highlightRef.current.getBoundingClientRect();
  const popupWidth = 320;
  let x = rect.left + rect.width / 2;
  let y = rect.top - margin;

  // Edge detection + clamping logic...

  setNotePopupPosition({ x, y });
  setNotePopupOpen(true);
}, []);

{notePopupOpen && createPortal(
  <div style={{
    position: 'fixed',
    left: x,
    top: y,
    transform: 'translate(-50%, -100%)',
    zIndex: 9999
  }}>
    <NotePopup ... />
  </div>,
  document.body
)}
```

**Best practices:**
- Use `fixed` positioning for viewport-relative placement
- Add `getBoundingClientRect()` on open/reopen to capture current scroll state
- Portal to `document.body` to escape stacking context issues
- Use high `z-index` (9999) to ensure popup appears above all content
- Reset position state on close/reopen to prevent stale coordinates

**Problem in current code:** NotePopup positioning works correctly because it recalculates on `handleOpenNotes()`. HighlightPopup (in library's tip system) may have positioning issues if library doesn't account for TabBar offset.

### Pattern 3: PDF.js Viewer Scale Control
**Source:** [PDFViewer API types](https://github.com/mozilla/pdf.js/blob/master/web/pdf_viewer.d.ts)

**What:** Access PDFViewer instance through `usePdfHighlighterContext().getViewer()` and control zoom via `currentScale` property

**Example:**
```typescript
const utils = usePdfHighlighterContext();
const viewer = utils.getViewer();

// Get current zoom
const currentZoom = viewer?.currentScale ?? 1.0;

// Zoom in (increment by 0.1)
if (viewer) {
  viewer.currentScale = Math.min(currentZoom + 0.1, 3.0);
}

// Zoom out
if (viewer) {
  viewer.currentScale = Math.max(currentZoom - 0.1, 0.5);
}

// Set specific scale
viewer.currentScaleValue = 'page-width'; // or 'page-fit', 'page-actual', 'auto', or number
```

**Available scale modes:**
```typescript
type PdfScaleValue =
  | 'page-actual'  // 100% zoom
  | 'page-width'   // Fit to width (current default)
  | 'page-height'  // Fit to height
  | 'page-fit'     // Fit entire page
  | 'auto'         // Auto-size based on viewport
  | number;        // Explicit scale (1.0 = 100%, 1.5 = 150%)
```

**Important:** `currentScale` is a **number** (e.g., 1.5), while `currentScaleValue` is a **string** that can be a mode name OR a number string. For custom zoom controls, use `currentScale` directly.

### Pattern 4: Conditional Styling for Note Markers
**Source:** [CSS text-decoration best practices](https://www.tempertemper.net/blog/styling-underlines-with-css), [MDN text-decoration-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-decoration-style)

**What:** Add visual distinction to highlights with notes using CSS text-decoration

**Recommended approach:** Use `text-decoration: underline dotted` for better typography than `border-bottom`

**Example:**
```typescript
// In HighlightContainer.tsx
const hasNotes = comment.trim().length > 0;

<TextHighlight
  highlight={highlight}
  style={{
    background: highlightColor,
    opacity: 0.4,
    ...(hasNotes && {
      textDecoration: 'underline dotted',
      textDecorationColor: 'rgba(0, 0, 0, 0.4)',
      textDecorationThickness: '2px',
      textUnderlineOffset: '2px'
    })
  }}
/>
```

**Why text-decoration over border-bottom:**
- Underlines sit on the baseline, passing through descenders naturally
- Border-bottom sits below descenders, looks disconnected
- Browsers automatically skip descenders for text-decoration

**Design consideration:** Dotted underlines can resemble spell-check errors. Ensure adequate context (e.g., color + dotted pattern) to differentiate from errors.

### Anti-Patterns to Avoid

- **Don't hardcode popup positions** - Always recalculate `getBoundingClientRect()` on open to account for scroll state
- **Don't mutate highlight color on AI ask** - Preserve original color in a separate field if needed, or use highlight linking instead of overwriting
- **Don't use absolute positioning for viewport-level popups** - `absolute` is relative to nearest positioned ancestor, not viewport; use `fixed` instead
- **Don't skip updateTipPosition() after tip content changes** - Library doesn't auto-detect size changes; call `utils.updateTipPosition()` in useLayoutEffect

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF rendering | Custom canvas-based renderer | pdfjs-dist | Complex font handling, CIDFont support, memory management, security |
| Highlight positioning | Custom coordinate transform system | react-pdf-highlighter-extended's Position API | Handles viewport scaling, multi-page layouts, rotation edge cases |
| Zoom with highlight sync | Manual scale + re-render all highlights | PDFViewer.currentScale + library's built-in rescaling | Library automatically updates highlight coordinates on zoom |
| Floating element positioning (if needed) | Custom edge detection + flip logic | Floating UI / Popper.js | Handles collision detection, auto-flipping, scroll tracking, 100+ edge cases |

**Key insight:** PDF rendering and annotation positioning are deceptively complex. Seemingly simple operations like "zoom in" involve:
- Recalculating text layer coordinates
- Updating canvas resolution
- Adjusting highlight bounding boxes
- Maintaining scroll position
- Preventing memory leaks from canvas contexts

The libraries handle these edge cases. Don't reinvent unless absolutely necessary.

## Common Pitfalls

### Pitfall 1: Stale getBoundingClientRect() Coordinates
**What goes wrong:** Popup appears at wrong location after scrolling, or position doesn't update on reopen

**Why it happens:** `getBoundingClientRect()` returns viewport-relative coordinates. If you calculate position once and store it, scrolling changes the element's viewport position but your stored coordinates remain stale.

**How to avoid:**
- Call `getBoundingClientRect()` **inside** the function that opens the popup, not during render
- Reset position state when closing popup
- For scroll-persistent popups, add scroll listener and recalculate

**Current code status:** ✅ NotePopup correctly calls `getBoundingClientRect()` in `handleOpenNotes()` callback

**Warning signs:**
- Popup jumps to wrong location after scroll
- Popup position is correct first time but wrong on second open

### Pitfall 2: Overwriting Highlight Color Instead of Preserving
**What goes wrong:** User highlights text in blue, asks AI about it, highlight turns yellow ("note" color)

**Why it happens:** Current `handleAskAI()` implementation creates a new highlight with `color: 'note'` instead of checking if highlight already exists and preserving its color

**Relevant code:**
```typescript
// PdfViewer.tsx line 91-114
const handleAskAI = useCallback(async (question: string) => {
  const selection = selectionRef.current;
  if (!selection) return;

  const ghost = selection.makeGhostHighlight();

  // 🔴 PROBLEM: Always creates with color: 'note'
  const highlight = await addHighlight({
    paper_path: paperPath,
    content_text: text,
    position_json: JSON.stringify(ghost.position),
    color: 'note',  // ← Hardcoded!
    comment: ''
  });

  askAboutSelection(paperPath, text, question, highlight.id);
}, []);
```

**How to avoid:**
1. **For SelectionTip AI ask (new selection):** Use current palette color instead of 'note'
2. **For HighlightPopup AI ask (existing highlight):** Preserve the highlight's current color
3. Separate "has notes" indicator from color (use `comment` field presence, not color value)

**Warning signs:**
- All AI-related highlights are yellow regardless of user's color choice
- Users complain about losing their color organization when using AI

### Pitfall 3: Library Tip vs Portal Popup Confusion
**What goes wrong:** Mixing library's tip system with custom portal popups causes duplicate popups, positioning conflicts, or z-index issues

**Why it happens:**
- `MonitoredHighlightContainer.highlightTip` is managed by the library (shows on hover)
- Custom `createPortal` popups are manually managed (show on click/state)
- If both try to render at once, you get two popups

**Current code:** Already avoids this correctly - HighlightPopup in library tip, NotePopup in custom portal with explicit `notePopupOpen` state

**How to avoid:**
- Use library tip for hover-triggered, simple popups
- Use custom portal for click-triggered, stateful popups
- Never render both for the same highlight simultaneously

**Warning signs:**
- Two popups appear at once
- Popup closes unexpectedly when mouse moves
- Click opens popup but hover closes it

### Pitfall 4: Z-Index Stacking Context Issues
**What goes wrong:** Popup appears behind TabBar or other elements despite high z-index

**Why it happens:** CSS stacking contexts are created by:
- `position: relative/absolute/fixed` with z-index
- `transform`, `opacity`, `filter` properties
- Flexbox/grid items with z-index

If popup's parent has lower stacking context, popup can't escape to appear above siblings.

**How to avoid:**
- Portal to `document.body` (outside all stacking contexts)
- Use `position: fixed` (viewport-relative)
- Set high `z-index` (9999 is safe for most apps)

**Current code:** ✅ NotePopup portals to `document.body` with `zIndex: 9999`

**Warning signs:**
- Popup works in one part of UI but not another (different stacking contexts)
- Increasing z-index doesn't help
- Popup appears behind fixed headers/sidebars

### Pitfall 5: Zoom Scale Without Highlight Update
**What goes wrong:** After zooming, highlights appear offset from the actual text

**Why it happens:** If you manually change zoom without going through PDFViewer's scale API, the library doesn't know to recalculate highlight positions

**How to avoid:**
- Use `viewer.currentScale = newScale` NOT manual CSS transforms
- Library listens to PDFViewer scale changes and auto-updates highlights
- Don't cache highlight DOM elements or coordinates across zoom changes

**Warning signs:**
- Highlights misaligned after zoom
- Selection creates highlights in wrong location
- Zoom in works but zoom out doesn't

## Code Examples

Verified patterns from codebase and official sources:

### Example 1: Accessing PDFViewer for Zoom Control
**Source:** `/Users/damifiance/workspace/AI-paper-reader/frontend/node_modules/react-pdf-highlighter-extended/dist/esm/contexts/PdfHighlighterContext.d.ts`

```typescript
import { usePdfHighlighterContext } from 'react-pdf-highlighter-extended';

function ZoomControls() {
  const utils = usePdfHighlighterContext();
  const [scale, setScale] = useState(1.0);

  useEffect(() => {
    const viewer = utils.getViewer();
    if (viewer) {
      setScale(viewer.currentScale);
    }
  }, [utils]);

  const zoomIn = () => {
    const viewer = utils.getViewer();
    if (viewer) {
      const newScale = Math.min(viewer.currentScale + 0.1, 3.0);
      viewer.currentScale = newScale;
      setScale(newScale);
    }
  };

  const zoomOut = () => {
    const viewer = utils.getViewer();
    if (viewer) {
      const newScale = Math.max(viewer.currentScale - 0.1, 0.5);
      viewer.currentScale = newScale;
      setScale(newScale);
    }
  };

  return (
    <div className="zoom-controls">
      <button onClick={zoomOut}>-</button>
      <span>{Math.round(scale * 100)}%</span>
      <button onClick={zoomIn}>+</button>
    </div>
  );
}
```

### Example 2: Preserving Highlight Color on AI Ask
**Source:** `/Users/damifiance/workspace/AI-paper-reader/frontend/src/components/pdf-viewer/PdfViewer.tsx` (modified)

```typescript
// For new selection (from SelectionTip)
const handleAskAI = useCallback(async (question: string, selectedColor?: string) => {
  const selection = selectionRef.current;
  if (!selection) return;

  const ghost = selection.makeGhostHighlight();
  const text = ghost.content.text || '';

  // ✅ Use provided color or default palette color, NOT 'note'
  const highlight = await addHighlight({
    paper_path: paperPath,
    content_text: text,
    position_json: JSON.stringify(ghost.position),
    color: selectedColor || '#FFFF00',  // Preserve user's choice
    comment: ''
  });

  askAboutSelection(paperPath, text, question, highlight.id);
  setOpen(true);
}, [paperPath, addHighlight, askAboutSelection, setOpen]);

// For existing highlight (from HighlightPopup)
const handleHighlightAskAI = useCallback((
  text: string,
  question: string,
  highlightId?: string
) => {
  // ✅ Don't create new highlight, just reference existing one
  askAboutSelection(paperPath, text, question, highlightId);
  setOpen(true);
}, [paperPath, askAboutSelection, setOpen]);
```

### Example 3: Adding Dotted Underline for Notes
**Source:** [CSS text-decoration MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-decoration-style)

```typescript
// In HighlightContainer.tsx
export function HighlightContainer({ onDelete, onAskAI, onUpdateNote }: Props) {
  const { highlight, isScrolledTo } = useHighlightContainerContext();

  const highlightColor = (highlight as any).color || '#FFFF00';
  const isNote = highlightColor === 'note';
  const comment = (highlight as any).comment || '';
  const hasNotes = comment.trim().length > 0;  // ✅ Check for notes

  return (
    <MonitoredHighlightContainer highlightTip={tip}>
      <TextHighlight
        highlight={highlight}
        isScrolledTo={isScrolledTo}
        style={{
          background: isNote ? '#FDE68A' : highlightColor,
          opacity: 0.4,
          // ✅ Add dotted underline if has notes
          ...(hasNotes && {
            textDecoration: 'underline dotted',
            textDecorationColor: 'rgba(0, 0, 0, 0.4)',
            textDecorationThickness: '2px',
            textUnderlineOffset: '2px'
          })
        }}
      />
    </MonitoredHighlightContainer>
  );
}
```

### Example 4: Proper Portal Popup Positioning
**Source:** Current implementation in `/Users/damifiance/workspace/AI-paper-reader/frontend/src/components/pdf-viewer/HighlightContainer.tsx`

```typescript
const [notePopupOpen, setNotePopupOpen] = useState(false);
const [notePopupPosition, setNotePopupPosition] = useState({ x: 0, y: 0 });
const [notePopupBelow, setNotePopupBelow] = useState(false);
const highlightRef = useRef<HTMLDivElement>(null);

const handleOpenNotes = useCallback(() => {
  if (highlightRef.current) {
    // ✅ Calculate position at open time, not render time
    const rect = highlightRef.current.getBoundingClientRect();
    const popupWidth = 320;
    const margin = 12;

    // Center horizontally
    let x = rect.left + rect.width / 2;

    // ✅ Edge detection - prevent overflow
    const halfPopup = popupWidth / 2;
    x = Math.max(
      halfPopup + margin,
      Math.min(x, window.innerWidth - halfPopup - margin)
    );

    // Place above by default
    let y = rect.top - margin;
    let below = false;

    // ✅ Flip if too close to top
    if (rect.top < 200) {
      y = rect.bottom + margin;
      below = true;
    }

    setNotePopupPosition({ x, y });
    setNotePopupBelow(below);
  }
  setNotePopupOpen(true);
}, []);

const handleCloseNotes = useCallback(() => {
  setNotePopupOpen(false);
  // Position resets on next open via getBoundingClientRect()
}, []);

{notePopupOpen && createPortal(
  <div style={{
    position: 'fixed',  // ✅ Viewport-relative
    left: notePopupPosition.x,
    top: notePopupPosition.y,
    transform: notePopupBelow
      ? 'translate(-50%, 0)'      // Below: anchor at top-center
      : 'translate(-50%, -100%)', // Above: anchor at bottom-center
    zIndex: 9999  // ✅ High z-index
  }}>
    <NotePopup
      comment={comment}
      onUpdateNote={(c) => onUpdateNote(highlight.id, c)}
      onDelete={() => {
        onDelete(highlight.id);
        setNotePopupOpen(false);
      }}
      onClose={handleCloseNotes}
      arrowPosition={notePopupBelow ? 'top' : 'bottom'}
    />
  </div>,
  document.body  // ✅ Portal outside stacking context
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| border-bottom for underlines | text-decoration with text-underline-offset | ~2020 (CSS 3) | Better typography, respects descenders |
| Class-based React components | Hooks + functional components | 2019 (React 16.8) | Simpler state management, better composition |
| Global CSS for PDF styling | CSS-in-JS via style prop | 2024 (library v8.0) | Dynamic styling, no global conflicts |
| react-pdf-highlighter (original) | react-pdf-highlighter-extended | 2023 | Zoom support, React 19 compat, active maintenance |

**Deprecated/outdated:**
- `findController` in PDF.js viewer options - Now integrated into PDFViewer by default
- CSS `background` for text highlights - Use library's `style` prop on TextHighlight for proper layering
- Manual selection clearing - Library handles via `removeGhostHighlight()` utility

## Open Questions

1. **Does TabBar interfere with library tip positioning?**
   - What we know: TabBar is fixed header outside PDF viewport, library tips render inside viewport
   - What's unclear: Whether library accounts for fixed headers in edge detection
   - Recommendation: Test library tip (HighlightPopup) near top of page. If it appears under TabBar, switch to custom portal like NotePopup

2. **Should "note" color remain a special value or become a flag?**
   - What we know: Current system uses `color: 'note'` to distinguish note highlights from colored highlights
   - What's unclear: Whether this was intentional design or implementation convenience
   - Recommendation: Keep color as user-selected value, add `hasNotes()` helper function checking `comment.length > 0`

3. **What's the optimal zoom step increment?**
   - What we know: PDF.js uses 0.1 (10%) increments by default, we can customize
   - What's unclear: User preference for this application (10% vs 25% steps)
   - Recommendation: Start with 0.1, make configurable later based on user feedback

4. **Should zoom controls be in TabBar or floating overlay?**
   - What we know: TabBar is per-paper, zoom could be per-paper or global
   - What's unclear: Whether users want per-paper zoom settings or global zoom
   - Recommendation: Place in TabBar (per-paper), persist zoom level in paper metadata store

## Sources

### Primary (HIGH confidence)
- **Codebase:** `/Users/damifiance/workspace/AI-paper-reader/frontend/src/components/pdf-viewer/*.tsx` - Current implementation analysis
- **Library types:** `/Users/damifiance/workspace/AI-paper-reader/frontend/node_modules/react-pdf-highlighter-extended/dist/esm/**/*.d.ts` - API signatures
- **PDF.js types:** `/Users/damifiance/workspace/AI-paper-reader/frontend/node_modules/pdfjs-dist/types/web/pdf_viewer.d.ts` - PDFViewer API
- **Package.json:** `/Users/damifiance/workspace/AI-paper-reader/frontend/package.json` - Verified versions

### Secondary (MEDIUM confidence)
- [react-pdf-highlighter-extended official docs](https://danielarnould.github.io/react-pdf-highlighter-extended/docs/) - Component usage patterns
- [MDN text-decoration-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-decoration-style) - CSS underline implementation
- [Teleportation in React: Positioning, Stacking Context, and Portals](https://www.developerway.com/posts/positioning-and-portals-in-react) - Portal positioning best practices
- [React PDF Viewer - Zoom plugin](https://react-pdf-viewer.dev/plugins/zoom/) - Alternative library's zoom patterns (for comparison)

### Tertiary (LOW confidence)
- GitHub issues search for react-pdf-highlighter-extended - No specific positioning bugs found in recent issues
- CSS-Tricks articles on underlines - General web dev best practices, not PDF-specific

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - All versions verified from package.json, libraries are already integrated
- Architecture: **HIGH** - Direct codebase analysis, verified all component relationships
- Pitfalls: **HIGH** - Identified specific code locations and root causes from existing implementation
- Zoom implementation: **MEDIUM** - PDFViewer API verified in types, but no existing implementation to reference
- Visual markers (dotted underline): **HIGH** - Straightforward CSS, standard browser support

**Research date:** 2026-02-12
**Valid until:** ~30 days (stable React/PDF.js ecosystem, unlikely to change rapidly)

**Key risks:**
- **Low risk:** Popup positioning - Well-understood problem with proven solutions in codebase
- **Low risk:** Dotted underlines - Standard CSS feature
- **Medium risk:** Zoom feature - No existing implementation to reference, but API is clear
- **Low risk:** Color preservation - Logic fix, not architectural change
