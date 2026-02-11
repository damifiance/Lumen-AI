# Stack Research

**Domain:** PDF Annotation UX Improvements
**Researched:** 2026-02-12
**Confidence:** MEDIUM

## Drag-and-Drop Approach

### Recommended: Custom CSS Transform Implementation
**Confidence:** HIGH

For simple popup dragging (not sortable lists), a lightweight custom implementation using mouse/pointer events + CSS transforms is preferred over adding a library dependency.

**Why not react-draggable:**
- Uses deprecated `findDOMNode` — broken in React 19 strict mode
- Requires `nodeRef` workaround which adds complexity
- Overkill for simple popup repositioning

**Why not dnd-kit:**
- Designed for sortable lists and complex DnD — overkill for popup dragging
- Adds ~10kb to bundle for simple use case

**Implementation pattern:**
```typescript
// Track drag state with useRef (not useState — avoids re-renders during drag)
const dragRef = useRef({ startX: 0, startY: 0, offsetX: 0, offsetY: 0 });

// Use pointer events for cross-device support
onPointerDown → capture start position
onPointerMove → calculate delta, apply CSS transform
onPointerUp → finalize position
```

### CSS Dotted Underline for AI Markers
**Confidence:** HIGH

Use CSS `border-bottom: 2px dotted` on highlight containers rather than `text-decoration-style: dotted` because:
- `text-decoration` applies to text content, not to overlay elements
- Highlights in react-pdf-highlighter-extended are positioned overlay divs
- `border-bottom` works on any element and is more controllable

**Pattern:**
```css
.highlight-with-notes {
  border-bottom: 2px dotted currentColor;
  /* or use ::after pseudo-element for more control */
}
```

## react-pdf-highlighter-extended v8.0.0

### Key Architecture Points
- `PdfHighlighterContext` consolidates all state (tips, selections, highlights)
- `MonitoredHighlightContainer` provides mouse listeners for hover interactions
- `highlightTip` prop controls popup content displayed above highlights
- `TextHighlight` accepts `style` prop for custom colors: `style={{ background: color }}`
- Position data is viewport-independent (safe for persistence)

### Popup Positioning
- Library has built-in tip position clipping on left edge of screen
- Tips system uses `setTip()` and `getTip()` with automatic above/below positioning
- Selection events fire on PointerUp (not debounced selection change)

### Zoom Support
- Built into v8.0.0 via `pdfScaleValue` prop
- `viewportToScaled()` handles coordinate conversion across zoom levels

## Zustand State for Drag Positions

**Pattern:** Don't persist drag positions in Zustand store during drag (causes re-renders). Use local ref during drag, only sync to store on drop.

```typescript
// During drag: useRef for position
// On drop: update Zustand store if position should persist
// On close: reset position
```

## What NOT to Use

| Don't | Why | Instead |
|-------|-----|---------|
| react-draggable | Broken findDOMNode in React 19 | Custom pointer events |
| dnd-kit | Overkill for popup dragging | Custom pointer events |
| Redux for drag state | Too heavy, unnecessary re-renders | useRef during drag |
| z-index hacks for popup visibility | Creates stacking context issues | React portal to body |

---
*Stack research: 2026-02-12*
