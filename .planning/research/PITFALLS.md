# Pitfalls Research

**Domain:** PDF Annotation UX Improvements
**Researched:** 2026-02-12
**Confidence:** MEDIUM

## Critical Pitfalls

### 1. Popup Positioning in Scrollable/Transformed Containers
**Severity:** HIGH — This is likely the root cause of the current bug

**The trap:** Using `position: absolute` inside a container that has `overflow: scroll` or CSS transforms. The popup positions relative to the wrong parent, appearing at (0,0) of the scroll container instead of near the highlight.

**Warning signs:**
- Popups appear at top-left of screen
- Popups jump when scrolling
- Popups appear under fixed headers (tab bar)

**Prevention:**
- Use `getBoundingClientRect()` for viewport-relative coordinates
- Consider React Portal to render popup outside the PDF container
- Account for scroll position of parent containers
- Use `useLayoutEffect` (not `useEffect`) for position calculations to avoid flicker

**Phase:** Phase 1 — Fix popup positioning

### 2. Breaking Existing Highlights in Database
**Severity:** HIGH — Data loss risk

**The trap:** Changing the highlight data model (adding fields, changing color logic) without migration breaks existing saved highlights.

**Warning signs:**
- Highlights disappear after code change
- Notes appear empty
- Colors reset to default

**Prevention:**
- Never change the meaning of existing database fields
- Add new fields instead of repurposing old ones
- Test with existing highlight data before deploying
- Add fallback/default values for new fields on existing records

**Phase:** Phase 1 — Color preservation fix

### 3. React 19 + findDOMNode Deprecation
**Severity:** MEDIUM — Library compatibility

**The trap:** Libraries like react-draggable use `findDOMNode` internally, which is removed in React 19. Using them causes silent failures or crashes.

**Warning signs:**
- Drag doesn't work at all
- Console warnings about deprecated APIs
- Components don't render in strict mode

**Prevention:**
- Don't use react-draggable — implement custom drag with pointer events
- Always use `nodeRef` pattern if any library requires DOM node access
- Test in React strict mode during development

**Phase:** Phase 1 — Draggable popup implementation

### 4. PDF.js Coordinate System Confusion
**Severity:** MEDIUM — Affects zoom feature

**The trap:** PDF.js uses bottom-left origin (PDF standard) while canvas/DOM uses top-left origin. Viewport transformation matrix handles this, but custom elements added to pages disappear on zoom/re-render.

**Warning signs:**
- Highlights appear at wrong position after zoom
- Custom DOM elements disappear when page re-renders
- Y-coordinates are inverted

**Prevention:**
- Use react-pdf-highlighter-extended's `viewportToScaled()` for coordinate conversion
- Listen for page re-render events to reattach custom elements
- Scale element positions by zoom level
- Don't mix PDF coordinates with DOM coordinates

**Phase:** Phase 2 — Zoom controls

### 5. Race Conditions in Highlight State Updates
**Severity:** MEDIUM — Can cause data loss

**The trap:** Multiple rapid highlight operations (create + update color + add AI note) can race. If the AI response arrives before the highlight create completes, the note gets lost.

**Warning signs:**
- AI notes sometimes don't appear
- Highlight color randomly resets
- Duplicate highlights appear

**Prevention:**
- Use optimistic updates with rollback
- Queue highlight operations sequentially per highlight ID
- Ensure API calls complete before allowing new operations on same highlight
- Use unique IDs (UUID) for highlights, not auto-increment

**Phase:** Phase 1 — Color preservation and AI note flow

### 6. Popup Drag Breaking Text Selection
**Severity:** MEDIUM — UX regression

**The trap:** Adding drag behavior to popups with `onPointerDown` captures all pointer events, preventing text selection inside the popup (e.g., copying AI response text).

**Warning signs:**
- Can't select/copy text inside popup
- Clicking buttons inside popup starts a drag instead
- Text cursor doesn't appear in popup

**Prevention:**
- Use a specific drag handle element (e.g., header bar), not entire popup
- Stop propagation on interactive elements inside popup
- Only initiate drag after minimum movement threshold (5px)
- Use `pointer-events: auto` on interactive children

**Phase:** Phase 1 — Draggable popup implementation

### 7. Stacking Context Issues with Popups
**Severity:** LOW — Visual bug

**The trap:** CSS `transform`, `opacity`, `filter`, or `will-change` on parent elements create new stacking contexts. A popup with `z-index: 9999` still appears behind elements in a higher stacking context.

**Warning signs:**
- Popup appears behind other UI elements
- z-index has no effect
- Popup appears behind tab bar or chat panel

**Prevention:**
- Render popups via React Portal at document body level
- Avoid unnecessary CSS transforms on parent containers
- Test popup visibility with all panels open

**Phase:** Phase 1 — Fix popup positioning

### 8. CSS Dotted Underline Conflicting with Highlight Overlay
**Severity:** LOW — Visual issue

**The trap:** Adding `border-bottom` to highlight overlay divs may not be visible because highlights are positioned absolutely and may not have the right dimensions.

**Warning signs:**
- Dotted underline doesn't appear
- Underline appears at wrong position
- Underline thickness varies with zoom

**Prevention:**
- Use `::after` pseudo-element on the highlight container
- Position the underline relative to the bottom of the highlight bounds
- Test at multiple zoom levels
- Consider using `box-shadow` as alternative: `box-shadow: 0 2px 0 0 dotted-color`

**Phase:** Phase 1 — Dotted underline marker

## Summary Priority Matrix

| Pitfall | Severity | Likelihood | Phase |
|---------|----------|------------|-------|
| Popup positioning in scroll containers | HIGH | HIGH (current bug) | 1 |
| Breaking existing highlights | HIGH | MEDIUM | 1 |
| React 19 + findDOMNode | MEDIUM | HIGH (if using library) | 1 |
| PDF.js coordinate confusion | MEDIUM | MEDIUM | 2 |
| Race conditions in state updates | MEDIUM | MEDIUM | 1 |
| Drag breaking text selection | MEDIUM | HIGH | 1 |
| Stacking context issues | LOW | MEDIUM | 1 |
| CSS underline on overlay | LOW | MEDIUM | 1 |

---
*Pitfalls research: 2026-02-12*
