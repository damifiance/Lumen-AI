# Feature Research

**Domain:** PDF Annotation UX (Popups, Highlights, Visual Markers)
**Researched:** 2026-02-12
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Smart popup positioning (viewport-aware) | Standard in all professional PDF tools; popups appearing in wrong location breaks core UX | MEDIUM | Must position relative to highlight, avoid viewport edges, flip above/below based on available space. Current issue: popups appear at top-left under tab bar |
| Highlight color palette (4-8 colors) | Users organize by color-coding system; industry standard includes yellow, blue, green, red, purple | LOW | Common pattern: yellow=key points, blue=references, green=action items, red=urgent/critical, purple=theoretical |
| Zoom in/out controls | Core PDF reader functionality; users cannot read without zoom | LOW | Standard: Ctrl +/- keyboard shortcuts, +/- buttons, zoom slider, fit-to-width/height modes |
| Visual distinction between annotation types | Users need to differentiate highlights from notes/comments at a glance | MEDIUM | Common pattern: plain highlights=no icon, highlights with notes=speech bubble icon, standalone notes=sticky note icon |
| Persistent highlight colors | Color must not change unless user explicitly changes it; AI actions should not alter annotation color | LOW | Current issue: asking AI overwrites highlight color to yellow |
| Click-outside-to-close for popups | Standard modal/popup behavior; users expect Esc or clicking outside to dismiss | LOW | Currently implemented in NotePopup with click-outside detection |
| Annotation filtering/search by color | Users employ color-coding systems to organize; must be able to filter/view by color | MEDIUM | Zotero implements this with color filter in annotations sidebar |
| Highlight opacity control | Text must remain readable under highlights; standard opacity ~40% | LOW | Currently implemented at 40% opacity |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI-annotated highlights with visual marker | Distinguishes AI-generated annotations from manual ones; adds value to AI-powered PDF reader | MEDIUM | Implement distinct icon overlay (e.g., sparkle/AI badge) or border style for AI-annotated highlights; current gap in Lumen AI |
| Draggable/repositionable note popups | Allows users to move popups out of the way while reviewing; reduces visual clutter | MEDIUM | PDF Expert implements with "tap and hold bottom-right corner to move"; creates better UX for dense annotations |
| Context-aware popup arrow positioning | Arrow points to associated highlight, adapts when popup flips above/below | LOW | Currently implemented with top/bottom arrow based on flip logic |
| Multi-note threading per highlight | Single highlight can have conversation-style thread of notes | MEDIUM | Currently implemented with NoteEntry system; differentiates from simpler "one note per highlight" pattern |
| Relative timestamps (just now, 3h ago) | Makes annotation timeline more human-friendly than absolute dates | LOW | Currently implemented; small UX polish that users appreciate |
| Auto-reposition on scroll/zoom | Popups stay anchored to highlight during viewport changes | HIGH | Adobe Acrobat implements this; prevents disorientation during navigation |
| Keyboard shortcuts for annotations | Power users expect shortcuts for highlight colors, zoom, navigation | MEDIUM | Standard: Ctrl+H=highlight, Ctrl+E=comment, Ctrl+=/- =zoom; improves accessibility |
| Color-coded annotation export/summary | Export highlights grouped by color with headers | MEDIUM | Valuable for academic/research use; Zotero users frequently request this |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Unlimited custom colors | Users want precise color matching | Creates organizational chaos; defeats purpose of color-coding system | Provide 6-8 carefully chosen colors that are visually distinct; allow customizing the palette but limit active colors |
| Always-visible annotation icons | Seems helpful for finding annotations | Creates visual clutter; makes reading difficult when many annotations exist | Show icons on hover only; provide sidebar/summary view for navigation |
| Real-time collaborative annotations | Popular in web annotation tools | High complexity; requires backend infrastructure; out of scope for local-first tool | Focus on single-user excellence; export/import for sharing |
| Full markdown/rich text in notes | Power users want formatting | Increases complexity; most notes are short informal text | Support multi-line text, basic structure via line breaks; defer rich formatting |
| Popup auto-open on highlight hover | Seems convenient | Intrusive during reading/scrolling; creates accidental popup spam | Require explicit click to open; show lightweight tooltip on hover instead |
| Annotation templates/stamps | Professional tools offer this | Adds UI complexity; niche feature for specific workflows (architecture, legal) | Defer until core annotation UX is solid; most users don't need it |

## Feature Dependencies

```
Popup Positioning (viewport-aware)
    └──requires──> Bounding box calculation
    └──requires──> Viewport dimensions detection
    └──enhances──> Draggable popups (if popup can be dragged, positioning becomes starting point)

Visual Annotation Markers
    └──requires──> Annotation type metadata (is_note, has_ai, etc.)
    └──requires──> Icon rendering system

Persistent Highlight Colors
    └──requires──> Color metadata stored with highlight
    └──conflicts──> AI overwrites (bug to fix, not feature)

Annotation Filtering by Color
    └──requires──> Persistent highlight colors
    └──requires──> Annotation list/sidebar view

Draggable Popups
    └──requires──> Popup positioning foundation
    └──requires──> Drag event handlers
    └──optional──> Save preferred position per annotation

Keyboard Shortcuts
    └──requires──> Global keyboard event listener
    └──conflicts──> Native browser shortcuts (must handle conflicts)

Auto-reposition on Scroll/Zoom
    └──requires──> Popup positioning foundation
    └──requires──> Scroll/zoom event listeners
    └──high-complexity──> Coordinate transformation on zoom
```

### Dependency Notes

- **Popup Positioning is foundation for all popup features:** Must be fixed first before adding draggable or auto-reposition
- **Persistent colors blocks filtering:** Can't filter by color if colors change unexpectedly
- **Visual markers require metadata architecture:** Need to decide on data model before implementing icons
- **Keyboard shortcuts must coexist with browser:** Use Ctrl/Cmd modifiers to avoid conflicts

## MVP Definition

### Launch With (v1) - Current Milestone

Minimum viable fixes for existing issues.

- [x] Viewport-aware popup positioning (above/below highlight, avoid edges) — Essential; broken UX currently
- [x] Persistent highlight colors (fix AI overwrite bug) — Essential; users lose organizational system
- [ ] Visual distinction: AI-annotated highlights — Essential; core value proposition of AI-powered reader
- [ ] Zoom in/out controls — Essential; basic PDF reader functionality

**Rationale:** These four features fix critical UX breaks and establish baseline PDF annotation functionality.

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Draggable/repositionable popups — Trigger: users complain about popups blocking content
- [ ] Annotation filtering/sidebar by color — Trigger: users create 10+ annotations per document
- [ ] Keyboard shortcuts (highlight, zoom, navigation) — Trigger: power users request efficiency improvements
- [ ] Color palette customization (pick 6-8 colors) — Trigger: users want different color meanings
- [ ] Hover tooltips for annotations (non-intrusive) — Trigger: users can't find annotations without opening all popups
- [ ] Auto-reposition popups on scroll/zoom — Trigger: users navigate while popup is open

**Rationale:** These improve UX quality but aren't blockers for core functionality.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Multi-color highlights (gradient, patterns) — Why defer: edge case; adds UI complexity
- [ ] Annotation templates/stamps — Why defer: niche workflow; most users don't need
- [ ] Export annotations grouped by color — Why defer: valuable but not core reader experience
- [ ] Voice annotations (audio notes) — Why defer: high complexity; storage concerns for local-first
- [ ] Handwriting/drawing annotations — Why defer: requires different input model; tablet-focused
- [ ] Collaborative annotations (real-time) — Why defer: requires backend; conflicts with local-first architecture

**Rationale:** These are "nice to have" but not essential for an AI-powered PDF reader's core value.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Viewport-aware popup positioning | HIGH | MEDIUM | P1 |
| Persistent highlight colors (fix bug) | HIGH | LOW | P1 |
| Zoom in/out controls | HIGH | LOW | P1 |
| AI-annotated highlight marker | HIGH | MEDIUM | P1 |
| Draggable popups | MEDIUM | MEDIUM | P2 |
| Annotation filtering by color | MEDIUM | MEDIUM | P2 |
| Keyboard shortcuts | MEDIUM | MEDIUM | P2 |
| Hover tooltips | MEDIUM | LOW | P2 |
| Auto-reposition on scroll/zoom | MEDIUM | HIGH | P2 |
| Color palette customization | LOW | MEDIUM | P3 |
| Export by color | MEDIUM | MEDIUM | P3 |
| Annotation templates | LOW | HIGH | P3 |
| Collaborative annotations | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch — fixes broken UX or establishes core value
- P2: Should have, add when possible — improves quality, addresses user friction
- P3: Nice to have, future consideration — niche or complex features

## Competitor Feature Analysis

| Feature | Adobe Acrobat | PDF Expert | Hypothesis | Zotero | Lumen AI (Current) | Our Approach |
|---------|---------------|------------|------------|--------|-------------------|--------------|
| Popup positioning | Auto-repositions on scroll; viewport-aware | Tap-hold corner to drag | Sidebar-based (no popups) | Sidebar + inline | Broken (top-left) | **Fix to viewport-aware + add drag in v1.x** |
| Highlight colors | Full palette + custom | 8 preset colors | Single color (yellow) | 8 preset colors | Multiple, but AI overwrites | **Fix persistence bug + 6-8 preset colors** |
| Visual markers | Icon overlay for notes | Icon for notes | Sidebar flags | Color-coded sidebar | None (no AI distinction) | **Add AI badge/icon for AI annotations** |
| Zoom controls | Slider + buttons + shortcuts + fit modes | Pinch + buttons + fit modes | Browser zoom only | +/- buttons + fit width | Missing | **Add +/- buttons + keyboard shortcuts** |
| Annotation filtering | Filter by type, author, color | Search annotations | Public/private toggle | Filter by color in sidebar | None | **Add color filter in v1.x** |
| Draggable popups | Auto-position only | Tap-hold to drag | N/A (sidebar) | N/A (sidebar) | Not draggable | **Add drag functionality in v1.x** |
| Keyboard shortcuts | Extensive (20+ shortcuts) | Basic navigation | Web standard | Basic (arrows, zoom) | None | **Add core shortcuts (highlight, zoom, nav) in v1.x** |

**Key Insights:**
- **Sidebar vs Popup:** Hypothesis and Zotero use sidebar approach to avoid positioning issues; we're committed to popups so must nail positioning
- **Draggable popups:** PDF Expert's tap-hold pattern is proven; Adobe skips it with auto-repositioning
- **Color systems:** 6-8 colors is sweet spot; more creates chaos, fewer limits organization
- **AI distinction:** No competitor has AI-annotated highlights; this is our differentiator

## UX Patterns from Research

### Popup Positioning Algorithm (Industry Standard)

1. **Default placement:** Above highlight, centered horizontally
2. **Viewport edge detection:**
   - If top < 200px from viewport top, flip to below
   - If left edge would overflow, shift right (min margin: 12px)
   - If right edge would overflow, shift left (min margin: 12px)
3. **Arrow indicator:** Points to highlight; flips with popup (top/bottom)
4. **Scroll behavior:** Either dismiss popup or auto-reposition (we should pick one)

**Source pattern:** PDF Expert, Adobe Acrobat behavior analysis

### Visual Annotation Markers

1. **Plain highlight:** No icon, just colored background at 40% opacity
2. **Highlight + note:** Small speech bubble icon overlaid at highlight position
3. **Standalone note:** Sticky note icon at insertion point
4. **AI annotation (our differentiator):** Sparkle/AI badge icon or distinct border style

**Toggle option:** "Hide annotation icons" preference for reading mode vs review mode

**Source pattern:** Adobe Acrobat icon system, user feedback about clutter

### Color-Coding Systems (User Patterns)

From academic research user interviews:
- **Yellow:** Key points, important quotes
- **Blue:** References, citations, related work
- **Green:** Action items, things to implement
- **Red:** Critical issues, urgent fixes, disagreements
- **Purple:** Theoretical concepts, definitions
- **Orange:** Questions, unclear sections
- **(AI-generated):** Maintain user's chosen color, add AI icon overlay

**Our implementation:** Preserve user's color choice even when AI adds annotations; add visual marker instead.

### Keyboard Shortcuts (Standard Across Tools)

**Navigation:**
- `Ctrl/Cmd + =` or `+`: Zoom in
- `Ctrl/Cmd + -`: Zoom out
- `Ctrl/Cmd + 0`: Reset zoom to 100%
- `Arrow keys`: Scroll
- `Home`: Jump to start
- `End`: Jump to end
- `Page Up/Down`: Page navigation

**Annotation:**
- `Ctrl/Cmd + H`: Highlight selected text
- `Ctrl/Cmd + E`: Add comment/note
- `Delete`: Remove selected annotation
- `Esc`: Close popup/cancel action

**Color selection (if implementing):**
- `1-8`: Quick select highlight color (if annotation mode active)

**Source:** Adobe Acrobat, PDF Annotator, Foxit Reader

## Sources

### Official Documentation
- [PDF Expert: Add text annotations and pop-up notes](https://helpspot.readdle.com/pdfexpert6/index.php?pg=kb.page&id=1107) — MEDIUM confidence
- [Adobe Acrobat: Annotations and Commenting](https://www.adobe.com/devnet-docs/acrobatetk/tools/PrefRef/Windows/Annots.html) — MEDIUM confidence
- [PDF Annotator Manual: Keyboard Shortcuts](https://www.pdfannotator.com/en/help/keyboardshortcuts) — MEDIUM confidence
- [Zotero PDF Reader Documentation](https://www.zotero.org/support/pdf_reader) — MEDIUM confidence

### UX Research & Best Practices
- [Exploring the UX of web-annotations](https://tomcritchlow.com/2019/02/12/annotations/) — LOW confidence (blog, but thoughtful analysis)
- [Interactive TOCs, Bookmarks, and Notes: UX Patterns Readers Actually Use](https://www.3dissue.com/interactive-tocs-bookmarks-and-notes-ux-patterns-readers-actually-use/) — MEDIUM confidence
- [11 UI Design Best Practices for UX Designers (2026 Guide)](https://uxplaybook.org/articles/ui-fundamentals-best-practices-for-ux-designers) — LOW confidence (general UX, not PDF-specific)

### Competitor Analysis
- [Top 9 PDF Annotation Apps to Know in 2026](https://www.drawboard.com/blog/top-pdf-annotation-apps) — MEDIUM confidence
- [Drawboard PDF features and tricks](https://www.drawboard.com/blog/12-drawboard-pdf-features-and-tricks-to-increase-productivity-that-you-might-not-know-about) — MEDIUM confidence

### Technical Implementation
- [Create text highlight annotations in multiple colors – PDF Studio](https://kbpdfstudio.qoppa.com/create-text-highlight-annotations-in-multiple-colors/) — MEDIUM confidence
- [How to Change Highlight Color in PDF](https://pdf.easeus.com/pdf-knowledge-center/how-to-change-highlight-color-in-pdf.html) — LOW confidence (tutorial, but shows user expectations)

### User Communities & Discussions
- [Zotero Forums: Extract Annotations by Color](https://forums.zotero.org/discussion/110131/extract-annotations-by-color) — MEDIUM confidence (real user needs)
- [Adobe Community: Remove unnecessary comment icon on highlight](https://community.adobe.com/questions-9/remove-unnecessary-comment-icon-on-highlight-1313583) — MEDIUM confidence (pain point validation)

---

**Confidence Assessment:**

- **Table Stakes Features:** HIGH confidence — consistent across all professional PDF tools
- **Visual Marker Patterns:** MEDIUM confidence — based on Adobe/PDF Expert patterns, but limited 2026-specific docs
- **Popup Positioning Algorithm:** MEDIUM confidence — derived from multiple sources, not single authoritative spec
- **AI Annotation Distinction:** LOW confidence — no direct competitor research; our innovation
- **Keyboard Shortcuts:** HIGH confidence — standardized across industry for 20+ years

**Research Gaps:**

1. No authoritative spec for popup positioning algorithm (derived from behavior observation)
2. Limited 2026-specific updates on PDF annotation UX evolution (most patterns are stable)
3. No direct research on AI-annotated highlight UX patterns (greenfield for us)
4. Unclear user preference: auto-reposition vs dismiss popups on scroll (need user testing)

**Recommendation for Roadmap:**

Phase 1 should focus on P1 features (popup positioning, persistent colors, zoom, AI markers) to establish solid foundation. Phase 2 can add P2 quality-of-life improvements (draggable, filtering, shortcuts) based on user feedback. P3 features should wait for validated product-market fit.

---
*Feature research for: Lumen AI PDF Annotation UX Improvements*
*Researched: 2026-02-12*
