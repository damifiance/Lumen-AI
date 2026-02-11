# Requirements: Lumen AI UX Improvements

**Defined:** 2026-02-12
**Core Value:** Users can see and interact with their notes and highlights without fighting the interface

## v1 Requirements

### Popup UX

- [ ] **POP-01**: Note popups appear near the associated highlight (not at top-left/under tab bar)
- [ ] **POP-02**: Note popups are draggable to any position on screen
- [ ] **POP-03**: Selection tip popup is draggable to any position on screen
- [ ] **POP-04**: Popup position resets when reopened

### Highlight Integrity

- [ ] **HLT-01**: Asking AI about an existing highlight preserves the original highlight color
- [ ] **HLT-02**: Asking AI about a new text selection uses current palette color (not hardcoded yellow)
- [ ] **HLT-03**: Highlights with any notes (AI-generated or user-written) display a dotted underline visual marker

### PDF Controls

- [ ] **PDF-01**: User can zoom in on PDF
- [ ] **PDF-02**: User can zoom out on PDF
- [ ] **PDF-03**: Zoom level displayed to user

## v2 Requirements

### Selection & Color Management

- **SEL-01**: User can re-select text that is already highlighted
- **CLR-01**: User can change highlight color without losing attached notes

### Navigation & Filtering

- **FLT-01**: User can filter highlights by color
- **KBD-01**: Keyboard shortcuts for zoom and highlight colors

## Out of Scope

| Feature | Reason |
|---------|--------|
| Auto-reposition popup on scroll/zoom | High complexity, defer to v2+ |
| Collaborative annotations | Conflicts with local-first architecture |
| Rich text/markdown in notes | Most notes are short text |
| Highlight export by color | Not core reader experience |
| Dark mode | Not requested |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| POP-01 | Phase 1 | Pending |
| POP-02 | Phase 1 | Pending |
| POP-03 | Phase 1 | Pending |
| POP-04 | Phase 1 | Pending |
| HLT-01 | Phase 1 | Pending |
| HLT-02 | Phase 1 | Pending |
| HLT-03 | Phase 1 | Pending |
| PDF-01 | Phase 2 | Pending |
| PDF-02 | Phase 2 | Pending |
| PDF-03 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-12*
*Last updated: 2026-02-12 after initial definition*
