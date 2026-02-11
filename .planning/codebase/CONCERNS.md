# Codebase Concerns

**Analysis Date:** 2026-02-12

## Tech Debt

**Global CORS security configuration:**
- Issue: `allow_origins=["*"]` in production mode allows any origin to access the API
- Files: `backend/app/main.py` (lines 18-25)
- Impact: Sensitive endpoints like `/api/chat`, `/api/highlights`, `/api/papers` are exposed to cross-origin requests from any website. Attackers could perform cross-site request forgery (CSRF) attacks, steal PDF paths, or monitor highlight data.
- Fix approach: Replace wildcard CORS with explicit origin whitelist. In Electron app, restrict to localhost only. For web deployment, use environment-specific origins.

**In-memory text cache with unbounded growth:**
- Issue: `_text_cache` in context_service.py stores full PDF text in memory with no eviction policy
- Files: `backend/app/services/context_service.py` (line 5)
- Impact: Long-running backends will accumulate memory as users read different PDFs. A user opening 100 large PDFs could consume gigabytes of RAM, causing slowdowns or crashes.
- Fix approach: Implement LRU cache with max size limit (e.g., 500MB), or add TTL-based cache expiration.

**No error recovery for large PDF text extraction:**
- Issue: `get_full_text()` loads entire PDF content for token counting and chunking without checking file size
- Files: `backend/app/services/pdf_service.py` (lines 40-42), `context_service.py` (lines 15-28)
- Impact: Opening a 1GB PDF or scanned document with embedded images could freeze the backend during text extraction. No timeout or streaming support.
- Fix approach: Add file size checks before extraction, implement streaming token counting, and set extraction timeouts.

**Unreliable async/await error handling in chat streaming:**
- Issue: Fire-and-forget promise in `streamAsk()` and `streamConversation()` with minimal error handling
- Files: `frontend/src/api/chat.ts` (lines 25-36, 49-60)
- Impact: If the fetch request fails (network error, server crash), the error callback might not fire consistently. User sees loading state indefinitely.
- Fix approach: Add explicit timeout, retry logic, and ensure callbacks always fire. Wrap in try/catch or Promise.all().

**Missing cleanup on component unmount:**
- Issue: Event listeners added to `window` in `NotePopup` and `PdfViewer` may not clean up properly if component unmounts during drag operations
- Files: `frontend/src/components/pdf-viewer/NotePopup.tsx` (lines 148-174), `frontend/src/stores/chatStore.ts` (line 141)
- Impact: Memory leaks possible if user rapidly opens/closes notes or switches PDFs while dragging. Multiple listeners attached to same events.
- Fix approach: Ensure all useEffect cleanup functions properly remove listeners. Test with React DevTools Profiler.

**Type unsafety in highlight color handling:**
- Issue: `(highlight as any).color` used instead of proper type narrowing
- Files: `frontend/src/components/pdf-viewer/HighlightContainer.tsx` (line 25)
- Impact: Color could be undefined or invalid, causing rendering issues. No validation that color is a valid hex code or reserved value like 'note'.
- Fix approach: Add type guard function or discriminated union type for highlight objects.

**Uncaught exceptions in PDF text extraction:**
- Issue: `pymupdf.open()` and page iteration not wrapped in try/catch in `extract_text()`
- Files: `backend/app/services/pdf_service.py` (lines 11-18)
- Impact: Corrupted PDF files, permission issues, or out-of-memory conditions could crash the backend without proper error context.
- Fix approach: Add try/catch around doc operations, handle specific PyMuPDF exceptions.

**No validation on highlight position data:**
- Issue: Position JSON parsed without schema validation in `PdfViewer.tsx`
- Files: `frontend/src/components/pdf-viewer/PdfViewer.tsx` (line 36)
- Impact: Malformed position_json could cause runtime errors when rendering highlights. Invalid indices could reference wrong page positions.
- Fix approach: Validate position schema at API boundary and add error boundary for rendering.

**Database connection leaks in concurrent requests:**
- Issue: `get_db()` generator may not properly close connections if exceptions occur during request processing
- Files: `backend/app/database.py` (lines 20-22)
- Impact: Under high load or errors, database connections could accumulate, exhausting the connection pool.
- Fix approach: Use explicit try/finally or context manager, add connection pool monitoring.

## Known Bugs

**Model auto-selection inconsistency:**
- Symptoms: User's preferred model not loaded if they switch tabs or refresh before models list populates
- Files: `frontend/src/stores/chatStore.ts` (lines 35-43)
- Trigger: Open app, select model, switch to another tab before API request completes, then return
- Workaround: Manually select model again from dropdown

**Drag boundary calculation uses stale container height:**
- Symptoms: Note popup jumps off-screen when dragged near viewport edges on window resize
- Files: `frontend/src/components/pdf-viewer/NotePopup.tsx` (lines 155-162)
- Trigger: Resize browser window while dragging note popup, drag near bottom edge
- Workaround: Drop the note first, then drag again

**Highlight position data mismatch on zoom:**
- Symptoms: Highlights appear at wrong locations when PDF is zoomed out
- Files: `frontend/src/components/pdf-viewer/PdfViewer.tsx` (line 35-44) - highlights array doesn't account for pdfScaleValue changes
- Trigger: Load PDF, zoom out using browser zoom or PDF zoom feature, open existing highlight
- Workaround: Zoom back to 100%, reload PDF

**Chat streaming stops if backend briefly disconnects:**
- Symptoms: Incomplete responses, frozen chat panel
- Files: `frontend/src/api/chat.ts` (lines 82-84) - no retry or reconnection logic
- Trigger: Network interrupt during LLM response streaming
- Workaround: Close chat, re-open, ask same question again

## Security Considerations

**Path traversal vulnerability in file browser:**
- Risk: While home directory restriction exists, symlinks to system directories could expose sensitive files
- Files: `backend/app/services/file_service.py` (lines 24-28)
- Current mitigation: Basic path prefix check, no symlink resolution
- Recommendations: Use `Path.resolve()` with symlink follow-up validation, or use `pathlib.Path.is_relative_to()` for stricter checks. Consider restricting to user documents only, not entire home directory.

**Unencrypted sensitive data in localStorage:**
- Risk: Preferred model name and API responses cached in browser localStorage without encryption
- Files: `frontend/src/stores/chatStore.ts` (line 29), `frontend/src/components/file-browser/FileBrowser.tsx` (line 27)
- Current mitigation: None - data is plaintext
- Recommendations: For Electron app, use secure storage. For web version, consider sessionStorage or remove persistence.

**API key exposure in error messages:**
- Risk: LLM service errors could leak partial API key info in backend logs
- Files: `backend/app/routers/chat.py` (lines 48, 65, 86, 101)
- Current mitigation: Logs are not exposed publicly
- Recommendations: Sanitize error messages before returning to client, use structured logging with redaction for sensitive fields.

**No CSRF token on state-changing operations:**
- Risk: Highlights, notes, and paper deletions have no CSRF protection
- Files: `backend/app/routers/highlights.py` (POST, PATCH, DELETE endpoints), `backend/app/routers/papers.py`
- Current mitigation: None, relies only on CORS (which is wildcard)
- Recommendations: Add CSRF token validation via double-submit cookie pattern or SameSite cookie attribute.

**Ollama connection without timeout or verification:**
- Risk: Backend could hang indefinitely if Ollama server becomes unresponsive
- Files: `backend/app/services/llm_service.py` (line 27)
- Current mitigation: 3-second timeout on model fetch, but none on actual completions
- Recommendations: Add configurable timeout to `acompletion()` calls, implement circuit breaker pattern for repeated failures.

## Performance Bottlenecks

**Full PDF text extraction on every paper open:**
- Problem: `prepare_paper_context()` always calls `get_full_text()` even if cached
- Files: `backend/app/services/context_service.py` (lines 21-28)
- Cause: Cache check happens on first call, but token counting re-reads entire PDF
- Improvement path: Pre-calculate and cache token count with the text, or implement lazy chunking.

**TF-IDF similarity search on every question:**
- Problem: Rebuilds vectorizer and recomputes similarities for every API request
- Files: `backend/app/services/context_service.py` (lines 31-50)
- Cause: No caching of TF-IDF matrices, repeated computation with same paper
- Improvement path: Cache vectorizer per paper, or use faster similarity methods (e.g., approximate nearest neighbors).

**Synchronous PDF metadata extraction:**
- Problem: `get_metadata()` blocks during page iteration for large PDFs
- Files: `backend/app/services/pdf_service.py` (lines 22-37)
- Cause: No async support in pymupdf, blocking IO in FastAPI endpoint
- Improvement path: Use thread pool for PDF operations, or implement async wrapper.

**Re-rendering entire highlight list on single highlight update:**
- Problem: `updateHighlight()` in highlightStore reconstructs entire highlights array
- Files: `frontend/src/stores/highlightStore.ts` (lines 48-53)
- Cause: Zustand re-triggers all subscribers even if only one highlight changed
- Improvement path: Use selector pattern or split store by paper path to minimize re-renders.

**Chat message streaming without batching:**
- Problem: Every token received triggers full re-render of messages array
- Files: `frontend/src/stores/chatStore.ts` (lines 72-79)
- Cause: Zustand update happens per token, causing unnecessary React reconciliation
- Improvement path: Buffer tokens into chunks, batch updates every 100ms, use React.memo for message list.

## Fragile Areas

**Highlight synchronization race condition:**
- Files: `frontend/src/components/pdf-viewer/PdfViewer.tsx` (lines 91-122), `frontend/src/stores/highlightStore.ts` (lines 37-52)
- Why fragile: Multiple `addHighlight()` calls can execute simultaneously. If user rapidly clicks "Ask AI" + create highlight, two concurrent POST requests could have race condition on state update.
- Safe modification: Use optimistic updates with rollback on error, or implement request deduplication by paper+selection content.
- Test coverage: No tests for concurrent highlight operations exist.

**Note serialization format:**
- Files: `frontend/src/utils/noteHelpers.ts`, `frontend/src/components/pdf-viewer/NotePopup.tsx`
- Why fragile: Notes stored as JSON-serialized array in single comment field. Breaking the parser will lose all notes for that highlight.
- Safe modification: Any change to serialization format needs migration logic. Consider storing notes as separate DB table entries.
- Test coverage: No tests for noteHelpers utility functions.

**Electron backend startup race condition:**
- Files: `electron/main.js` (lines 138-160)
- Why fragile: Window created before backend fully ready. If backend takes >60 attempts (30 seconds), app could show blank window.
- Safe modification: Add loading screen that waits for backend health check, don't create window until backend.ready event.
- Test coverage: No integration tests for Electron startup sequence.

**Dynamic model loading at request time:**
- Files: `backend/app/routers/chat.py` (lines 20-29), `frontend/src/stores/chatStore.ts` (lines 27-43)
- Why fragile: Model availability changes between requests. User selects model, it becomes unavailable, request fails mid-stream.
- Safe modification: Validate model availability before streaming, cache model list with TTL, handle model removal gracefully.
- Test coverage: No tests for model availability validation.

**PDF URL construction without validation:**
- Files: `frontend/src/components/pdf-viewer/PdfViewer.tsx` (line 138), `frontend/src/api/papers.ts`
- Why fragile: `getPdfUrl()` could return invalid URL if paperPath contains special characters or is already a URL.
- Safe modification: Sanitize path, use `encodeURIComponent()`, or validate URL before passing to PDF loader.
- Test coverage: No tests for edge cases in file paths.

## Scaling Limits

**Single SQLite database for local data:**
- Current capacity: SQLite can handle ~100MB database before noticing slowdowns
- Limit: Users with 1000+ papers and thousands of highlights could see query slowdowns
- Scaling path: Migrate to PostgreSQL if deployed server-side, add indexing on paper_path + created_at

**In-memory text cache on single backend instance:**
- Current capacity: ~5GB typical on 8GB system before memory pressure
- Limit: User opening 50+ large PDFs exhausts cache
- Scaling path: Use Redis/Memcached for distributed caching, implement disk-based LRU cache

**Token counting via GPT-4 tokenizer:**
- Current capacity: Can handle documents up to ~100k tokens before context window issues
- Limit: Very large academic papers or scanned document PDFs hit token limit
- Scaling path: Implement intelligent chunking strategy, use smaller tokenizer for estimation

**Single Ollama connection for local models:**
- Current capacity: Can handle ~20 concurrent requests before queueing
- Limit: Multiple simultaneous chat requests will slow down
- Scaling path: Load balance across multiple Ollama instances, implement request queue with priority

## Dependencies at Risk

**litellm>=1.55:**
- Risk: Library actively maintained but rapid API changes between minor versions. Used for streaming completions and model routing.
- Impact: Update to 1.60+ could break `acompletion()` streaming interface or change error types
- Migration plan: Pin to specific version, implement abstraction layer around LLM calls to decouple from litellm internals

**scikit-learn>=1.6:**
- Risk: Heavy dependency (70MB+) only used for TF-IDF in context chunking. Could be replaced with lightweight alternative.
- Impact: Installation bloat, slow first run due to scikit-learn compilation
- Migration plan: Replace with simpler BM25 implementation or remove for MVP, use sparse matrix libraries

**pdfjs-dist@4.10:**
- Risk: Large library (9MB), new versions break APIs. React PDF highlighter depends on specific versions.
- Impact: Browser bundle bloat, potential rendering issues with certain PDF features
- Migration plan: Evaluate alternatives like pdf-lib or pdfcore, monitor for version compatibility issues

**react-pdf-highlighter-extended:**
- Risk: Custom fork of unmaintained library. Could have unpatched security or compatibility issues.
- Impact: No upstream updates, potential breakage with future React versions
- Migration plan: Contribute back to original or maintain fork long-term, create abstraction layer to ease migration

## Missing Critical Features

**No offline mode for locally cached PDFs:**
- Problem: Backend required even for viewing previously opened PDFs or highlights. Flight mode will break app.
- Blocks: Offline reading, mobile usage with unreliable connectivity

**No user preferences persistence across sessions:**
- Problem: Sidebar width, chat panel width, keyboard shortcuts customization lost on app restart
- Blocks: Customization for power users, accessibility settings

**No highlight export functionality:**
- Problem: Highlights and notes trapped in SQLite database. No way to export for papers management.
- Blocks: Backup, migration to other tools, sharing annotations

**No full-text search across papers:**
- Problem: Can only search within current PDF and highlight content via notes
- Blocks: Finding where a concept was discussed across library of papers

**No theme/dark mode toggle:**
- Problem: UI hardcoded to light theme only
- Blocks: Eye strain in low-light environments, accessibility for light-sensitive users

## Test Coverage Gaps

**No unit tests for context service:**
- What's not tested: Token counting accuracy, chunk retrieval ranking, context truncation edge cases
- Files: `backend/app/services/context_service.py`
- Risk: Changes to chunking algorithm could silently break retrieval quality. TF-IDF similarity could produce wrong results.
- Priority: High - affects core LLM functionality

**No integration tests for API endpoints:**
- What's not tested: Concurrent highlight creation, chat streaming interruption recovery, model switching mid-stream
- Files: `backend/app/routers/*.py`
- Risk: Race conditions and error states only discovered in production
- Priority: High - affects stability

**No E2E tests for Electron app startup:**
- What's not tested: Backend startup timing, window creation, communication between renderer and main process
- Files: `electron/main.js`, `electron/preload.js`
- Risk: Startup failures only caught when building/distributing
- Priority: Medium - critical UX but easy to test manually

**No tests for highlight rendering edge cases:**
- What's not tested: Multi-page selections, overlapping highlights, highlights at page boundaries
- Files: `frontend/src/components/pdf-viewer/*.tsx`
- Risk: Display bugs with complex PDFs only caught in real usage
- Priority: Medium - affects user experience on non-standard PDFs

**No security tests for file path validation:**
- What's not tested: Symlink traversal, special characters in paths, relative path exploitation
- Files: `backend/app/services/file_service.py`
- Risk: Path traversal vulnerability not caught by automated testing
- Priority: High - security critical

---

*Concerns audit: 2026-02-12*
