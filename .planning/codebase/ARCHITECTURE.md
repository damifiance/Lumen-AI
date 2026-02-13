# Architecture

**Analysis Date:** 2026-02-12

## Pattern Overview

**Overall:** Client-Server with Hybrid Desktop/Web Architecture

**Key Characteristics:**
- Backend-agnostic frontend built with React/TypeScript
- FastAPI backend with streaming-first design for real-time LLM responses
- State management via Zustand stores (decoupled from backend)
- Electron wrapper enabling desktop deployment while maintaining web compatibility
- PDF processing with in-memory caching and context-aware LLM prompting

## Layers

**Presentation Layer (Frontend):**
- Purpose: User interface for PDF reading, annotation, and AI-assisted research
- Location: `frontend/src/components/`
- Contains: React components organized by feature (pdf-viewer, chat, file-browser, layout)
- Depends on: Zustand stores, API client, PDF libraries (react-pdf-highlighter-extended, pdfjs)
- Used by: Electron main window or web browsers

**State Management Layer:**
- Purpose: Centralized state for papers, highlights, chat, and shortcuts
- Location: `frontend/src/stores/`
- Contains: Four Zustand stores (paperStore, highlightStore, chatStore, shortcutStore)
- Depends on: API client (`frontend/src/api/`)
- Used by: All React components via hooks (usePaperStore, useHighlightStore, etc.)

**API Client Layer:**
- Purpose: HTTP/SSE communication bridge to backend
- Location: `frontend/src/api/`
- Contains: Modular API modules (papers.ts, chat.ts, highlights.ts) and shared client (client.ts)
- Depends on: Base URL resolution for localhost or proxy scenarios
- Used by: Zustand stores and components directly

**Backend API Layer (FastAPI):**
- Purpose: REST/SSE endpoints for papers, highlights, chat, and file browsing
- Location: `backend/app/routers/`
- Contains: Four routers (papers.py, highlights.py, chat.py, files.py)
- Depends on: Services, database, schemas
- Used by: Frontend API calls at `/api/*` endpoints

**Service Layer:**
- Purpose: Business logic for PDF processing, LLM interaction, and context retrieval
- Location: `backend/app/services/`
- Contains:
  - `pdf_service.py`: PDF text extraction using PyMuPDF
  - `llm_service.py`: LLM completion streaming via LiteLLM (supports Ollama, OpenAI, Anthropic)
  - `context_service.py`: Smart context window management with TF-IDF-based chunking
- Depends on: Database, external LLM APIs
- Used by: Routers

**Data Layer:**
- Purpose: Persistent storage and database access
- Location: `backend/app/`
- Contains: SQLAlchemy ORM models, async database session management, migrations
- Depends on: SQLite (development) or configurable database
- Used by: Services and routers

## Data Flow

**PDF Loading and Metadata:**
1. User selects file in FileBrowser component
2. Frontend calls `getPaperMetadata()` → `GET /api/papers/metadata?path=...`
3. Backend extracts metadata (title, page count) via `pdf_service.extract_text()`
4. Frontend stores metadata in `paperStore` and loads highlights for current paper
5. PDF is served via `GET /api/papers/pdf?path=...` to react-pdf-highlighter

**Highlighting and Notes:**
1. User selects text or makes a highlight in PdfViewer
2. PdfViewer captures selection and position via react-pdf-highlighter API
3. User clicks highlight color or adds note
4. Frontend calls `POST /api/highlights` with position_json, content_text, color, comment
5. Backend persists to database via Highlight model
6. Frontend updates highlightStore and re-renders

**Chat and AI Interaction:**
1. User asks question about selected text or converses in ChatPanel
2. Frontend calls either:
   - `POST /api/chat/ask` (single question about selection) → EventSource stream
   - `POST /api/chat/conversation` (multi-turn conversation) → EventSource stream
3. Backend calls `context_service.prepare_paper_context()` to intelligently select paper sections
4. System prompt injected with paper context, user question added
5. Backend calls `llm_service.stream_completion()` which:
   - Auto-detects available models (Ollama, OpenAI, Anthropic)
   - Streams tokens via Server-Sent Events
6. Frontend consumes SSE stream in `chat.ts` → updates chatStore → renders in ChatPanel

**State Management:**
- All UI state lives in Zustand stores (papers, highlights, messages, models)
- Stores handle optimistic updates and reconciliation with backend
- No Redux/Context patterns; stores are singleton and directly mutated

## Key Abstractions

**Highlight (Domain Model):**
- Purpose: Represents a text selection with metadata and optional AI-generated note
- Examples: `backend/app/models/highlight.py`, `frontend/src/types/highlight.ts`
- Pattern:
  - Backend: SQLAlchemy ORM model with UUID primary key
  - Frontend: TypeScript interface with deserialized position_json
  - Color field doubles as type indicator ("note", hex color, etc.)
  - Comment field stores serialized note entries (JSON-encoded)

**Paper Context (Service Concept):**
- Purpose: Smart extraction of relevant text for LLM processing
- Examples: `backend/app/services/context_service.py`
- Pattern:
  - Full paper extracted once and cached in-memory (`_text_cache`)
  - If <30k tokens: use entire paper
  - If >30k tokens: use TF-IDF to select top 15 most-relevant chunks to query
  - Chunks split by 1000-word boundaries

**Streaming Response (Frontend Protocol):**
- Purpose: Real-time token delivery from backend to frontend without blocking
- Examples: `frontend/src/api/chat.ts`, `backend/app/routers/chat.py`
- Pattern:
  - Backend yields SSE events with event type ("token", "done", "error") and JSON data
  - Frontend consumes via TextDecoder and EventSource-style reader
  - chatStore updates on each token, triggering React re-render

**Dual Deployment (Desktop + Web):**
- Purpose: Support both Electron desktop app and web deployment
- Examples: `electron/main.js`, `frontend/src/api/client.ts`
- Pattern:
  - Electron spawns Python backend as subprocess
  - Frontend detects backend port via `window.__BACKEND_PORT__` or proxy
  - Same codebase runs in both environments

## Entry Points

**Frontend Web:**
- Location: `frontend/src/main.tsx` → `frontend/src/App.tsx`
- Triggers: Browser load or Electron window creation
- Responsibilities:
  - Initialize React app with Zustand stores
  - Mount App.tsx as root component
  - Fetch available models and populate chatStore
  - Set up keyboard shortcut listeners

**Frontend App Component:**
- Location: `frontend/src/App.tsx`
- Triggers: Page load or state changes
- Responsibilities:
  - Manage layout (sidebar, tab bar, PDF viewer, chat panel)
  - Route between file browser, empty state, and PDF viewer
  - Handle file selection and paper loading
  - Orchestrate global keyboard shortcuts (Cmd+K for chat toggle, Cmd+/ for shortcuts)

**Backend API Server:**
- Location: `backend/app/main.py`
- Triggers: Startup command or Electron subprocess spawn
- Responsibilities:
  - Initialize FastAPI app with CORS middleware
  - Mount four routers at `/api/*` endpoints
  - Initialize SQLite database on first run
  - Expose `/api/health` for startup verification

**Electron Main Process:**
- Location: `electron/main.js`
- Triggers: Package launch
- Responsibilities:
  - Start backend subprocess (production) or connect to dev backend
  - Create BrowserWindow and load frontend
  - Manage backend port discovery and health checks
  - Handle window lifecycle and app quit

## Error Handling

**Strategy:** Graceful degradation with user-facing error messages

**Patterns:**
- **API Errors:** HTTPException raised by routers → JSON detail → Frontend catches and displays toast/error state
- **File Not Found:** FileNotFoundError in pdf_service → 404 HTTPException → User sees "PDF not found" in UI
- **LLM Unavailable:** No models available → 422 response → Frontend shows modal prompt to set API keys or start Ollama
- **Stream Errors:** Exception during event_generator → "error" event sent → chatStore displays error message alongside assistant response
- **PDF Processing:** PyMuPDF exceptions logged, wrapped in 500 response, frontend shows "Failed to read PDF" message

## Cross-Cutting Concerns

**Logging:**
- Backend: Python logging module (configured per router, service)
- Frontend: console.error() for critical issues, silent failures for non-critical
- Electron: stdout/stderr from backend subprocess logged to console

**Validation:**
- Backend: Pydantic schemas (HighlightCreate, AskRequest, ConversationRequest) validate all inputs
- Frontend: TypeScript interfaces provide compile-time safety; runtime validation via API contract
- Papers: Path validation ensures only valid PDFs are served

**Authentication:**
- Not implemented; assumes trusted local environment (Electron) or secured network (web)
- API keys for LLM providers stored in .env (backend/.env)
- Database access via SQLAlchemy dependency injection (no auth between frontend/backend layers)

---

*Architecture analysis: 2026-02-12*
