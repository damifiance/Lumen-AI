# Phase 2: Interactive Enhancements - Research

**Researched:** 2026-02-12
**Domain:** Draggable UI components in React
**Confidence:** HIGH

## Summary

This phase adds drag-to-reposition functionality to two existing popup components: NotePopup and SelectionTip. The technical challenge involves making absolutely-positioned portal-rendered components draggable while avoiding conflicts with text selection and maintaining clean state management for position resets.

The current codebase uses React 19.2.0 with TypeScript in strict mode, Tailwind CSS 4.0, and renders popups via React portals with fixed positioning. The NotePopup is already portal-rendered to `document.body`, while SelectionTip is rendered by the `react-pdf-highlighter-extended` library's selection system.

**Primary recommendation:** Use `react-draggable` 4.5.0 with the `handle` prop to restrict dragging to popup headers. This proven library handles cross-browser compatibility, touch events, and TypeScript types out of the box, avoiding the complexity of hand-rolling pointer event management.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-draggable | 4.5.0 | Draggable component wrapper | Industry standard with 2300+ dependents, mature TypeScript support, works with React 16.3+ including React 19 |
| React | 19.2.0 | UI framework | Already in use, draggable libraries built for React hooks |
| TypeScript | 5.9.3 | Type safety | Already in use, react-draggable includes built-in types |
| Tailwind CSS | 4.0.0 | Styling | Already in use, provides `select-none` utility for preventing text selection during drag |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-portal | Built-in | Render outside DOM hierarchy | Already used for NotePopup, necessary for proper z-index management |
| @types/react | 19.2.5 | TypeScript definitions | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-draggable | Hand-rolled pointer events | More control but must handle: touch vs mouse events, browser inconsistencies, drag preview management, event cleanup, TypeScript typing. Only justified if library limitations block core requirements. |
| react-draggable | dnd-kit | More powerful but designed for sortable lists/drag-drop between containers. Overkill for simple "drag popup to reposition" use case. |
| react-draggable | react-rnd | Adds resizing capability we don't need. Extra complexity. |

**Installation:**
```bash
npm install react-draggable
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/components/pdf-viewer/
├── NotePopup.tsx           # Add Draggable wrapper, handle prop, position reset
├── SelectionTip.tsx        # Add Draggable wrapper, handle prop, position reset
├── HighlightContainer.tsx  # May need adjustment for portal rendering
└── PdfViewer.tsx           # No changes expected
```

### Pattern 1: Draggable Portal Component with Handle
**What:** Wrap portal-rendered component in Draggable, restrict dragging to header, reset position on close/reopen.

**When to use:** Making modal/popup draggable by header without allowing drag on content areas.

**Example:**
```typescript
// Source: Verified pattern from react-draggable docs + portal best practices
import { useState } from 'react';
import Draggable from 'react-draggable';
import { createPortal } from 'react-dom';

interface DraggablePopupProps {
  onClose: () => void;
  children: React.ReactNode;
}

function DraggablePopup({ onClose, children }: DraggablePopupProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);

  // Reset position when popup closes (via useEffect watching isOpen)
  useEffect(() => {
    setPosition({ x: 0, y: 0 });
  }, [isOpen]);

  return createPortal(
    <Draggable
      nodeRef={nodeRef}
      handle=".drag-handle"
      position={position}
      onStop={(e, data) => setPosition({ x: data.x, y: data.y })}
    >
      <div ref={nodeRef} style={{ position: 'fixed', /* ... */ }}>
        <div className="drag-handle select-none cursor-grab active:cursor-grabbing">
          {/* Header content */}
        </div>
        <div>{children}</div>
      </div>
    </Draggable>,
    document.body
  );
}
```

### Pattern 2: Controlled vs Uncontrolled Position
**What:** Draggable supports both controlled (`position` prop) and uncontrolled (`defaultPosition` prop) patterns.

**When to use:**
- **Controlled**: When you need to reset position externally (popup reopen) or synchronize with other state.
- **Uncontrolled**: When Draggable manages position internally and you don't care about resets.

**Example:**
```typescript
// Controlled (for position reset on reopen)
<Draggable
  position={position}
  onStop={(e, data) => setPosition({ x: data.x, y: data.y })}
>

// Uncontrolled (simpler, no reset capability)
<Draggable defaultPosition={{ x: 0, y: 0 }}>
```

**Recommendation:** Use controlled pattern since requirements explicitly state "position resets when reopened."

### Pattern 3: Handle Selector with User-Select Prevention
**What:** Use `handle` prop with CSS class selector + Tailwind `select-none` to prevent text selection during drag.

**When to use:** Always, to avoid text selection conflict with dragging.

**Example:**
```typescript
<Draggable handle=".drag-handle">
  <div>
    <div className="drag-handle select-none cursor-grab active:cursor-grabbing">
      <span className="text-[12px] font-semibold text-gray-700">
        Notes ({notes.length})
      </span>
    </div>
    {/* ... rest of popup */}
  </div>
</Draggable>
```

### Anti-Patterns to Avoid

- **Using HTML5 Drag-and-Drop API:** Unreliable on mobile, poor touch support, less control over behavior. Use pointer-event-based libraries like react-draggable instead.
- **Forgetting nodeRef in React 18+:** React 18 StrictMode causes warnings if you don't use a ref. Always pass `nodeRef` to Draggable.
- **Applying user-select: none globally:** Only apply to drag handle, not entire popup. Users need to select/copy text from popup content.
- **Not resetting position:** Draggable maintains position in its internal state. Must explicitly reset via controlled `position` prop or component remount.
- **Dragging breaks text selection inside popup:** If handle selector is too broad or missing, users can't select text. Keep handle specific to header area.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-browser drag events | Custom onPointerDown/Move/Up handlers | react-draggable | Must handle: mouse vs touch events, Safari quirks, preventDefault timing, event cleanup, pointer capture, coordinate transforms. Library solves all this. |
| Touch event support | Separate touch and mouse handlers | react-draggable | Library unifies mouse and touch with single API. Hand-rolling requires duplicate logic and mobile testing. |
| Drag constraints | Manual boundary checking math | react-draggable `bounds` prop | Off-by-one errors, viewport resize handling, scroll position accounting. Library handles edge cases. |
| Position state management | useState with complex update logic | react-draggable controlled mode | DraggableData provides x, y, deltaX, deltaY, lastX, lastY. Don't recalculate from raw events. |

**Key insight:** Dragging seems simple but has 10+ edge cases (touch vs mouse, preventDefault timing, text selection conflicts, coordinate systems, browser inconsistencies). react-draggable is 2300+ dependents because it solves these correctly. Only hand-roll if you hit actual library limitations (none identified for this phase).

## Common Pitfalls

### Pitfall 1: Text Selection Conflicts with Dragging
**What goes wrong:** User tries to select text in popup, accidentally drags it instead. Or tries to drag popup, accidentally selects text.

**Why it happens:** Mouse events power both text selection and dragging. Without proper separation, they interfere.

**How to avoid:**
1. Use `handle` prop to restrict dragging to header area only
2. Apply Tailwind `select-none` class to drag handle to prevent text selection on header
3. Keep handle selector specific - don't include content area
4. Test: user can select/copy text from note content while still being able to drag by header

**Warning signs:**
- Users report "can't select text in notes"
- Dragging starts when clicking text areas
- Text highlights during drag operations

### Pitfall 2: Position Doesn't Reset on Popup Reopen
**What goes wrong:** User drags popup to corner, closes it, reopens it - popup appears in corner instead of default center position.

**Why it happens:** Draggable maintains position state internally (or in component state). Closing popup doesn't reset this state.

**How to avoid:**
- Use controlled mode with `position` prop
- Track popup open/closed state
- Reset position to `{ x: 0, y: 0 }` when popup reopens via useEffect
- Alternative: Force remount by changing component `key` prop when reopening

**Warning signs:**
- QA reports "popup appears in wrong location after reopening"
- Position persists across open/close cycles

### Pitfall 3: Portal + Fixed Positioning Stacking Context Issues
**What goes wrong:** Dragged popup appears behind other UI elements despite high z-index.

**Why it happens:** `position: fixed` doesn't escape stacking context created by parent transforms, filters, or other properties. Even if z-index is 9999, it's scoped to parent stacking context.

**How to avoid:**
- NotePopup already uses createPortal to document.body (correct approach)
- Ensure portal rendering persists with Draggable wrapper
- Verify z-index applies at document.body level, not nested context
- Use browser DevTools to inspect actual stacking context hierarchy

**Warning signs:**
- Popup hidden behind PDF viewer or other components
- z-index changes don't fix layering

### Pitfall 4: React 18+ StrictMode findDOMNode Warnings
**What goes wrong:** Console warnings about deprecated findDOMNode when using Draggable in React 18+.

**Why it happens:** React 18 StrictMode is stricter about deprecated APIs. Draggable used findDOMNode in older patterns.

**How to avoid:**
- Always pass `nodeRef` prop to Draggable
- Attach ref to child element being dragged
- Pattern: `const nodeRef = useRef<HTMLDivElement>(null);` then `<Draggable nodeRef={nodeRef}><div ref={nodeRef}>...</div></Draggable>`

**Warning signs:**
- StrictMode console warnings mentioning findDOMNode
- Warnings disappear when StrictMode disabled

### Pitfall 5: Draggable Child Must Accept Style Props
**What goes wrong:** Draggable wrapper doesn't work - component doesn't move when dragged.

**Why it happens:** Draggable applies CSS transform via style prop to child. If child doesn't spread style prop, transforms are lost.

**How to avoid:**
- Ensure child element accepts and applies style prop
- Pattern: `<div style={props.style} {...otherProps}>` or use intrinsic elements (div, span) as direct child
- Don't wrap in Fragment - Draggable needs single child that accepts style

**Warning signs:**
- Drag handle works (cursor changes) but component doesn't move
- Browser DevTools shows no transform applied during drag

### Pitfall 6: SelectionTip Positioning Complexity
**What goes wrong:** SelectionTip is rendered by react-pdf-highlighter-extended's selection system, not directly controlled by our code. Adding Draggable wrapper may conflict with library's positioning logic.

**Why it happens:** SelectionTip is passed as `selectionTip` prop to PdfHighlighter, which controls its rendering position based on text selection bounding box.

**How to avoid:**
- Verify if SelectionTip positioning is controlled or absolute
- May need to extract SelectionTip rendering from library control to add Draggable wrapper
- Test interaction between library's selection positioning and Draggable transform
- Alternative: Request library renders draggable version or provides positioning hooks

**Warning signs:**
- SelectionTip position jumps on drag
- Library positioning conflicts with Draggable transform
- SelectionTip doesn't respond to drag at all

## Code Examples

Verified patterns from official sources and current codebase analysis:

### NotePopup with Draggable (Controlled)
```typescript
// Source: react-draggable docs + current NotePopup structure
import { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import { createPortal } from 'react-dom';
import type { DraggableData, DraggableEvent } from 'react-draggable';

interface NotePopupProps {
  comment: string;
  onUpdateNote: (comment: string) => void;
  onDelete: () => void;
  onClose?: () => void;
  arrowPosition?: 'top' | 'bottom';
  isOpen?: boolean; // Add to track open state for reset
}

export function NotePopup({
  comment,
  onUpdateNote,
  onDelete,
  onClose,
  arrowPosition,
  isOpen = true
}: NotePopupProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);

  // Reset position when popup reopens
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  const handleStop = (e: DraggableEvent, data: DraggableData) => {
    setPosition({ x: data.x, y: data.y });
  };

  const content = (
    <Draggable
      nodeRef={nodeRef}
      handle=".drag-handle"
      position={position}
      onStop={handleStop}
    >
      <div
        ref={nodeRef}
        className="relative bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/60 w-80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Arrow caret (existing) */}
        {arrowPosition === 'bottom' && (
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-2">{/* ... */}</div>
        )}

        {/* Header - Make draggable */}
        <div className="drag-handle select-none cursor-grab active:cursor-grabbing px-3 pt-3 pb-2 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-gray-700">
            Notes ({notes.length})
          </span>
          {onClose && (
            <button onClick={onClose} /* ... */>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Rest of popup content - existing code */}
        {/* ... */}
      </div>
    </Draggable>
  );

  // Return portal-rendered if needed, or just content
  return onClose ? createPortal(content, document.body) : content;
}
```

### SelectionTip with Draggable
```typescript
// Source: Adapted from current SelectionTip structure
import { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import type { DraggableData, DraggableEvent } from 'react-draggable';

export function SelectionTip({ onHighlight, onAskAI, onNote }: SelectionTipProps) {
  const [mode, setMode] = useState<'default' | 'askAI' | 'note'>('default');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);

  // Reset position when mode changes (reopen behavior)
  useEffect(() => {
    setPosition({ x: 0, y: 0 });
  }, [mode]);

  const handleStop = (e: DraggableEvent, data: DraggableData) => {
    setPosition({ x: data.x, y: data.y });
  };

  // Expanded mode (askAI or note)
  if (mode !== 'default') {
    return (
      <Draggable
        nodeRef={nodeRef}
        handle=".drag-handle"
        position={position}
        onStop={handleStop}
      >
        <div
          ref={nodeRef}
          className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/60 p-3 w-72"
        >
          <div className="drag-handle select-none cursor-grab active:cursor-grabbing flex items-center justify-between mb-2">
            {/* Header content */}
          </div>
          {/* Rest of expanded mode content */}
        </div>
      </Draggable>
    );
  }

  // Default mode (color picker + buttons)
  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".drag-handle"
      position={position}
      onStop={handleStop}
    >
      <div
        ref={nodeRef}
        className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/60"
      >
        <div className="drag-handle select-none cursor-grab active:cursor-grabbing px-2.5 py-2 flex items-center gap-1.5">
          {/* Existing color picker and buttons */}
        </div>
      </div>
    </Draggable>
  );
}
```

### TypeScript Import Pattern
```typescript
// Source: react-draggable TypeScript definitions
import Draggable, {
  DraggableData,
  DraggableEvent,
  DraggableEventHandler
} from 'react-draggable';

// DraggableData contains:
// - node: HTMLElement
// - x, y: number (current position)
// - deltaX, deltaY: number (change since last event)
// - lastX, lastY: number (previous position)

// Use in event handlers:
const handleDrag: DraggableEventHandler = (e: DraggableEvent, data: DraggableData) => {
  console.log('Position:', data.x, data.y);
  console.log('Delta:', data.deltaX, data.deltaY);
};
```

### Testing User Interactions
```typescript
// Test scenarios to verify requirements
describe('Draggable Popups', () => {
  it('User can drag note popup by header', () => {
    // 1. Open note popup
    // 2. Click and hold on header
    // 3. Move mouse
    // 4. Verify popup follows cursor
    // 5. Release - popup stays in new position
  });

  it('User can select text in note content', () => {
    // 1. Open note popup with existing note
    // 2. Click and drag inside note text area
    // 3. Verify text selection works (not dragging)
    // 4. Copy selected text - verify clipboard
  });

  it('Position resets when popup reopens', () => {
    // 1. Open note popup
    // 2. Drag to corner
    // 3. Close popup
    // 4. Reopen popup
    // 5. Verify popup at default center position (not corner)
  });

  it('Dragging does not interfere with popup functionality', () => {
    // 1. Drag popup to new position
    // 2. Add new note
    // 3. Edit existing note
    // 4. Delete note
    // 5. Verify all actions work normally
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTML5 Drag-and-Drop API | Pointer Events (libraries) | ~2020-2021 | Better mobile support, more control, consistent cross-browser behavior |
| react-beautiful-dnd | dnd-kit / pragmatic-drag-and-drop | 2023-2024 | react-beautiful-dnd unmaintained, new libraries support React 18+ |
| Mouse events only | Unified pointer events | 2018+ (widespread 2020+) | Single code path for mouse + touch |
| Uncontrolled position | Controlled with explicit reset | Current best practice | Required for position reset behavior |

**Deprecated/outdated:**
- HTML5 Drag-and-Drop API for UI dragging: Still exists but avoided due to poor mobile support and limited control
- react-beautiful-dnd: No longer maintained, doesn't support React 18+
- findDOMNode approach: Triggers warnings in React 18 StrictMode, use refs instead

## Open Questions

1. **SelectionTip rendering control**
   - What we know: SelectionTip is passed to PdfHighlighter which controls its rendering
   - What's unclear: Can we wrap it in Draggable without breaking library's positioning?
   - Recommendation: Test Draggable wrapper with library positioning. If conflict, may need to fork rendering or request library update.

2. **Drag boundaries**
   - What we know: Requirements say "anywhere on screen" (unconstrained)
   - What's unclear: Should we prevent dragging off-screen where popup becomes unreachable?
   - Recommendation: Start unconstrained (matches requirement). If users report lost popups, add viewport bounds via `bounds` prop.

3. **Default position calculation**
   - What we know: NotePopup currently centers on highlight, SelectionTip positions near selection
   - What's unclear: After dragging, what is "default position" on reset? Original calculation or fixed viewport center?
   - Recommendation: Reset to original calculated position (relative to highlight/selection), not arbitrary viewport center. Preserves existing positioning logic.

## Sources

### Primary (HIGH confidence)
- [react-draggable GitHub Repository](https://github.com/react-grid-layout/react-draggable) - Library docs, TypeScript definitions
- [react-draggable npm package](https://www.npmjs.com/package/react-draggable) - Version info, installation, basic usage
- [Tailwind CSS user-select](https://tailwindcss.com/docs/user-select) - Official docs for select-none utility
- [MDN Drag Operations](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations) - HTML5 drag-and-drop limitations
- [React createPortal](https://react.dev/reference/react-dom/components/common) - Portal rendering patterns

### Secondary (MEDIUM confidence)
- [Top 5 Drag-and-Drop Libraries for React in 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) - Library comparison, current trends
- [Teleportation in React: Positioning, Stacking Context, and Portals](https://www.developerway.com/posts/positioning-and-portals-in-react) - Stacking context issues with portals
- [Create a draggable popup/modal in react](https://medium.com/@jplaniran01/create-a-draggable-popup-modal-in-react-90cb1ed247c4) - Implementation pattern
- [How I Built Drag and Drop in React Without Libraries (Using Pointer Events)](https://medium.com/@aswathyraj/how-i-built-drag-and-drop-in-react-without-libraries-using-pointer-events-a0f96843edb7) - Alternative approach details
- [react-draggable handle prop examples](https://medium.com/@jplaniran01/create-a-draggable-popup-modal-in-react-90cb1ed247c4) - Handle pattern usage

### Tertiary (LOW confidence - informational only)
- Various WebSearch results on drag-and-drop libraries - Used for ecosystem awareness, not specific technical claims

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - react-draggable is proven, widely used, compatible with React 19
- Architecture: HIGH - Patterns verified against official docs and current codebase structure
- Pitfalls: MEDIUM-HIGH - Common issues documented across multiple sources, some specific to this codebase structure (SelectionTip rendering) are assumptions pending verification

**Research date:** 2026-02-12
**Valid until:** ~2026-03-12 (30 days - react-draggable is stable, not fast-moving)
