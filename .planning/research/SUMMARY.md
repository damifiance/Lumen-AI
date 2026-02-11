# Project Research Summary

**Project:** AI Paper Reader - PDF Annotation UX Improvements
**Domain:** PDF Viewer with AI-Powered Annotations
**Researched:** 2026-02-12
**Confidence:** MEDIUM

## Executive Summary

This project involves improving the annotation UX for an AI-powered PDF reader built with React, TypeScript, and react-pdf-highlighter-extended. The core issues are broken popup positioning (appearing at top-left under tab bar), AI overwrites destroying user's highlight colors, and missing visual distinction for AI-generated annotations. Expert PDF annotation tools like Adobe Acrobat and PDF Expert establish clear patterns: viewport-aware popup positioning with automatic above/below flipping, 6-8 color palette for user organization, and distinct visual markers for different annotation types.

The recommended approach prioritizes fixing critical UX breaks first (popup positioning, color preservation), then adding differentiating features (AI annotation markers, draggable popups). Use custom pointer-event-based dragging instead of react-draggable (broken in React 19), implement positioning with getBoundingClientRect() and React Portals to escape stacking contexts, and preserve user color choices when AI adds annotations. The architecture is well-understood with clear component boundaries, but the bug fixes require careful attention to coordinate systems, race conditions, and database schema compatibility.

Key risks include breaking existing highlight data during schema changes, coordinate system confusion between PDF.js (bottom-left origin) and DOM (top-left origin) during zoom, and popup drag handlers interfering with text selection. Mitigation strategies include using database migrations with fallbacks, leveraging react-pdf-highlighter-extended's coordinate conversion utilities, and restricting drag behavior to specific handle elements rather than entire popups.

## Key Findings

### Recommended Stack

The project already uses appropriate technologies. The main stack decision is **avoiding react-draggable and dnd-kit libraries** in favor of custom drag implementation using pointer events and CSS transforms. React-draggable uses deprecated findDOMNode which breaks in React 19 strict mode, while dnd-kit is overkill for simple popup repositioning. The lightweight custom approach with useRef state tracking avoids re-renders during drag operations and maintains full control over drag behavior.

**Core technologies:**
- **Custom pointer events + CSS transform**: Drag behavior without library dependencies — avoids React 19 compatibility issues, lighter bundle, better performance
- **CSS border-bottom**: Dotted underline for AI markers — works on overlay divs unlike text-decoration, more controllable
- **React Portal**: Popup rendering strategy — escapes stacking contexts, ensures correct z-index behavior, enables viewport-relative positioning
- **Zustand with useRef pattern**: Drag state management — useRef during drag avoids re-renders, sync to Zustand only on drop for persistence

**Critical version requirements:**
- react-pdf-highlighter-extended v8.0.0 includes zoom support via pdfScaleValue prop
- React 19 strict mode compatibility requires avoiding findDOMNode patterns

### Expected Features

The feature research identified clear tiers based on industry standards and competitive analysis.

**Must have (table stakes):**
- Smart popup positioning (viewport-aware, flip above/below) — users expect this from all professional PDF tools; current bug breaks core UX
- Persistent highlight colors (fix AI overwrite bug) — users rely on color-coding for organization; AI destroying colors breaks workflows
- Zoom in/out controls (+/- buttons, keyboard shortcuts) — basic PDF reader functionality; users cannot read without zoom
- Visual distinction for AI-annotated highlights — differentiates AI contributions from manual annotations; core value proposition

**Should have (competitive advantage):**
- Draggable/repositionable note popups — PDF Expert's tap-hold pattern; reduces visual clutter in dense annotations
- Annotation filtering/sidebar by color — Zotero implements this; enables users to leverage their color-coding systems
- Keyboard shortcuts (highlight, zoom, navigation) — standard across Adobe Acrobat, PDF Annotator; power user efficiency
- Hover tooltips for annotations — non-intrusive way to find annotations without opening all popups

**Defer (v2+):**
- Multi-color highlights (gradient, patterns) — edge case; adds UI complexity
- Annotation templates/stamps — niche workflow; most users don't need
- Export annotations grouped by color — valuable but not core reader experience
- Collaborative annotations (real-time) — requires backend infrastructure; conflicts with local-first architecture

### Architecture Approach

The architecture follows react-pdf-highlighter-extended's context-based pattern with PdfHighlighterContext consolidating all state. The main architectural fixes involve correcting popup positioning calculations and AI highlight color flow.

**Major components:**
1. **NotePopup & SelectionTip** — Popup positioning fix requires getBoundingClientRect() for viewport coordinates, React Portal for correct stacking, and drag behavior via pointer events on header handle
2. **HighlightContainer & TextHighlight** — Color preservation requires passing existing highlight color through AI ask flow, conditional CSS class for dotted underline when highlight has AI notes
3. **chatStore & highlightStore** — Data flow fix requires checking for existing highlight overlap before creating new highlight, preserving color when appending AI notes, using update vs create operations appropriately

**Key integration points:**
- Positioning logic lives in NotePopup/SelectionTip components (frontend/src/components/pdf-viewer/)
- Color preservation spans chatStore (frontend/src/stores/chatStore.ts) through API to highlights router
- Visual markers controlled by conditional className on TextHighlight based on comment metadata
- Drag state uses useRef locally, only syncs to Zustand on drop if persistence needed

### Critical Pitfalls

Research identified 8 pitfalls with varying severity, but these 5 are most critical for the planned phases:

1. **Popup positioning in scrollable/transformed containers** — Using position: absolute inside containers with overflow: scroll or CSS transforms causes popups to position relative to wrong parent. Prevention: use getBoundingClientRect() for viewport coordinates, React Portal to render outside PDF container, useLayoutEffect for calculations to avoid flicker.

2. **Breaking existing highlights in database** — Changing highlight data model without migration causes data loss. Prevention: never change meaning of existing fields, add new fields instead, test with existing data, provide fallback defaults for new fields.

3. **React 19 + findDOMNode deprecation** — Libraries using findDOMNode fail silently in React 19. Prevention: implement custom drag with pointer events, avoid react-draggable, test in strict mode during development.

4. **Popup drag breaking text selection** — onPointerDown on entire popup prevents selecting/copying text inside popup. Prevention: use specific drag handle (header bar), stop propagation on interactive elements, require minimum movement threshold (5px) before initiating drag.

5. **Race conditions in highlight state updates** — Multiple rapid operations (create + update color + add AI note) can race, losing data. Prevention: use optimistic updates with rollback, queue operations sequentially per highlight ID, ensure API completion before new operations on same highlight.

## Implications for Roadmap

Based on research, the recommended phase structure follows dependency order and risk mitigation:

### Phase 1: Fix Core UX Breaks (Foundation)
**Rationale:** These four features address currently broken functionality and establish the foundation for all subsequent improvements. Popup positioning must work before adding drag behavior. Color preservation must work before adding visual markers (need to know which highlights have AI notes). These are P1 issues causing immediate user frustration.

**Delivers:**
- Viewport-aware popup positioning with above/below flip logic
- Persistent highlight colors with AI note preservation
- Zoom in/out controls (+/- buttons, keyboard shortcuts)
- Dotted underline visual marker for AI-annotated highlights

**Addresses features from FEATURES.md:**
- Smart popup positioning (table stakes)
- Persistent highlight colors (table stakes)
- Zoom controls (table stakes)
- AI annotation markers (differentiator)

**Avoids pitfalls from PITFALLS.md:**
- Popup positioning in scroll containers (HIGH severity)
- Breaking existing highlights (HIGH severity)
- React 19 + findDOMNode (MEDIUM severity)
- Race conditions in state updates (MEDIUM severity)

**Implementation order within Phase 1:**
1. Fix popup positioning (foundation for everything else)
2. Fix color preservation in AI flow (independent, high value)
3. Add dotted underline marker (depends on color fix)
4. Add zoom controls (independent, parallel track)

### Phase 2: Quality-of-Life Enhancements
**Rationale:** Once core functionality works, add features that improve UX quality but aren't blockers. These features depend on Phase 1 foundation (draggable popups need correct positioning first). Defer until user feedback validates that these improvements are needed (draggable popups matter when users complain about blocking content, filtering matters when users create 10+ annotations per document).

**Delivers:**
- Draggable/repositionable popups with header handle
- Annotation filtering/sidebar by color
- Comprehensive keyboard shortcuts (highlight, navigate)
- Hover tooltips for annotations

**Uses stack from STACK.md:**
- Custom pointer events + CSS transform for drag behavior
- Zustand + useRef pattern for drag state
- React Portal for popup rendering

**Implements architecture from ARCHITECTURE.md:**
- Drag handle on NotePopup/SelectionTip headers
- Position tracking with useRef during drag
- Color filter integration with highlightStore

**Avoids pitfalls from PITFALLS.md:**
- Drag breaking text selection (use specific handle element)
- Stacking context issues (React Portal already implemented in Phase 1)

### Phase 3: Advanced Features (Future)
**Rationale:** Defer until product-market fit is established. These features add complexity without being essential for the core AI-powered PDF reader value proposition.

**Delivers:**
- Color palette customization
- Export annotations grouped by color
- Auto-reposition popups on scroll/zoom
- Advanced keyboard customization

**Research notes:**
- Auto-reposition on scroll/zoom has HIGH complexity (PDF.js coordinate system confusion)
- Export by color is MEDIUM complexity but valuable for academic users
- Defer collaborative features entirely (conflicts with local-first architecture)

### Phase Ordering Rationale

- **Phase 1 before Phase 2:** Popup positioning must work before adding drag behavior (can't drag something that's positioned incorrectly). Color preservation must work before filtering by color (can't filter if colors are unreliable).

- **Fix before enhance:** Phase 1 focuses on fixing broken functionality; Phase 2 adds enhancements. This prioritizes user trust (fix bugs first) over feature additions.

- **Foundation before complexity:** Simple positioning fixes (Phase 1) establish patterns for complex auto-reposition behavior (Phase 3). Get the basics right before tackling zoom coordinate transformations.

- **Pitfall avoidance:** Phase 1 addresses all HIGH severity pitfalls (popup positioning, data loss, React 19 compatibility). Phase 2 addresses MEDIUM severity pitfalls (drag behavior, text selection). Phase 3 defers the most complex pitfall (PDF.js coordinate confusion) until simpler cases are validated.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (Auto-reposition):** PDF.js coordinate system is complex; need research on viewportToScaled() patterns, page re-render events, zoom level scaling strategies. The PITFALLS.md notes coordinate confusion but doesn't provide full implementation guidance.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Popup positioning):** Well-documented pattern in STACK.md and ARCHITECTURE.md (getBoundingClientRect, React Portal, useLayoutEffect). Established solution exists.
- **Phase 1 (Color preservation):** Architecture clearly defines data flow changes needed. Straightforward state management fix.
- **Phase 2 (Drag behavior):** STACK.md provides complete implementation pattern using pointer events and useRef. No additional research needed.
- **Phase 2 (Keyboard shortcuts):** FEATURES.md documents industry-standard shortcuts from Adobe Acrobat, PDF Annotator. Just implement the standard.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Clear recommendation to avoid libraries, use custom implementation. React 19 compatibility well-researched. |
| Features | HIGH | Table stakes features consistent across all professional PDF tools. Differentiators validated through competitor analysis. |
| Architecture | MEDIUM | Component architecture understood, but positioning fix approach is derived from patterns, not tested in this codebase yet. |
| Pitfalls | MEDIUM | High severity pitfalls well-documented with prevention strategies. PDF.js coordinate pitfall has MEDIUM confidence (complex domain). |

**Overall confidence:** MEDIUM

The research provides solid direction for Phase 1 and Phase 2. Stack recommendations are confident (HIGH) because they're based on React 19 compatibility requirements and performance patterns. Feature expectations are confident (HIGH) because they're validated across multiple professional PDF tools. Architecture confidence is MEDIUM because the positioning fix approach, while theoretically sound, hasn't been validated in this specific codebase's stacking context and scroll container structure. Pitfall confidence is MEDIUM because PDF.js coordinate system complexity is well-known but implementation details require experimentation.

### Gaps to Address

**Gap 1: Exact popup positioning algorithm details**
- Research provides general pattern (getBoundingClientRect, viewport edge detection, flip logic) but lacks precise threshold values (how close to edge triggers flip? what margin from viewport edges?)
- **How to handle:** Use industry standard thresholds during implementation (200px from top triggers flip, 12px minimum margin from edges per PDF Expert analysis), validate with user testing

**Gap 2: User preference for scroll behavior (dismiss vs auto-reposition)**
- Research notes both patterns exist (Adobe auto-repositions, others dismiss) but doesn't identify which users prefer
- **How to handle:** Phase 1 implements simpler dismiss behavior, defer auto-reposition to Phase 3 after gathering user feedback on whether popups should stay open during scroll

**Gap 3: AI annotation marker visual design**
- Research identifies need for visual distinction but doesn't provide specific icon/design guidance (sparkle? AI badge? border style?)
- **How to handle:** Start with dotted underline as simplest approach (confirmed to work on overlay divs), iterate based on user feedback on whether more prominent marker is needed

**Gap 4: Database schema for new fields**
- Research identifies need to preserve color and mark AI annotations but doesn't confirm existing database schema structure
- **How to handle:** During Phase 1 planning, inspect current highlights table schema, determine if new fields needed (e.g., `has_ai_notes` boolean) or if existing comment field metadata is sufficient

**Gap 5: React Portal impact on existing styling**
- Research recommends React Portal to escape stacking contexts but doesn't confirm what styling will break when moving popups outside PDF container
- **How to handle:** During Phase 1 implementation, audit NotePopup/SelectionTip styles for dependencies on parent container, refactor to absolute viewport positioning

## Sources

### Primary (HIGH confidence)
- react-pdf-highlighter-extended v8.0.0 documentation — architecture patterns, zoom support, positioning system
- React 19 migration docs — findDOMNode deprecation, strict mode compatibility requirements
- PDF Expert official help docs — popup positioning behavior, drag patterns, annotation workflows
- Adobe Acrobat preferences reference — annotation and commenting standards, keyboard shortcuts

### Secondary (MEDIUM confidence)
- Zotero PDF Reader documentation — color filtering, annotation sidebar patterns
- PDF Annotator manual — keyboard shortcuts standardization
- Drawboard PDF features blog — competitive feature analysis
- Multiple PDF tool comparison articles — table stakes feature validation

### Tertiary (LOW confidence)
- Tom Critchlow blog on web annotations UX — general annotation UX patterns (not PDF-specific)
- General UI design best practices articles — popup positioning principles, not PDF-specific
- User community discussions (Zotero forums, Adobe community) — pain points and feature requests

**Source quality notes:**
- Stack recommendations based on React 19 official docs (HIGH confidence) and library compatibility testing
- Feature table stakes validated across 4+ professional PDF tools (HIGH confidence)
- Popup positioning algorithm derived from behavioral analysis, not official spec (MEDIUM confidence)
- AI annotation marker UX is greenfield with no direct competitor research (LOW confidence)

---
*Research completed: 2026-02-12*
*Ready for roadmap: yes*
