# Codebase Structure

**Analysis Date:** 2026-02-12

## Directory Layout

```
AI-paper-reader/
├── frontend/                   # React + TypeScript web UI
│   ├── src/
│   │   ├── components/         # React components by feature
│   │   ├── stores/             # Zustand state management
│   │   ├── api/                # HTTP/SSE client modules
│   │   ├── types/              # TypeScript interfaces
│   │   ├── utils/              # Helper functions
│   │   ├── assets/             # Static images/files
│   │   ├── styles/             # Global CSS
│   │   ├── App.tsx             # Root component
│   │   └── main.tsx            # Entry point
│   ├── package.json
│   └── vite.config.ts
├── backend/                    # FastAPI Python server
│   ├── app/
│   │   ├── routers/            # API endpoints
│   │   ├── services/           # Business logic (PDF, LLM, context)
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic validation schemas
│   │   ├── main.py             # FastAPI app setup
│   │   ├── database.py         # SQLAlchemy engine/session
│   │   └── config.py           # Settings and environment
│   ├── tests/                  # Test files
│   ├── pyproject.toml
│   └── .env.example
├── electron/                   # Desktop app wrapper
│   ├── main.js                 # Electron main process
│   ├── preload.js              # Preload script (IPC setup)
│   ├── package.json
│   └── electron-builder.json   # Build configuration
├── docs/                       # Project documentation
├── scripts/                    # Build and dev scripts
├── package.json                # Workspace root
└── README.md
```

## Directory Purposes

**`frontend/src/components/`:**
- Purpose: All React components organized by feature domain
- Contains: .tsx files and component-specific styling
- Key subdirectories:
  - `pdf-viewer/`: PDF rendering, highlighting, selection UI (PdfViewer, HighlightContainer, SelectionTip, NotePopup, HighlightPopup)
  - `chat/`: Chat panel and message display (ChatPanel, ChatMessage, ChatInput, ModelSelector)
  - `file-browser/`: File picker sidebar (FileBrowser)
  - `layout/`: Page layout components (TabBar)
  - `common/`: Shared UI components (OnboardingModal, KeyboardShortcuts, LoadingSpinner)

**`frontend/src/stores/`:**
- Purpose: Zustand store definitions for all application state
- Contains: Four stores:
  - `paperStore.ts`: Tab management, active paper, loading state
  - `highlightStore.ts`: Highlights for current paper, sync with backend
  - `chatStore.ts`: Chat messages, model selection, streaming state, abort control
  - `shortcutStore.ts`: Keyboard shortcut definitions and matching logic
- Pattern: Each store exports a `use*Store()` hook for component consumption

**`frontend/src/api/`:**
- Purpose: Backend communication layer (HTTP/SSE)
- Contains: Modular API client files:
  - `client.ts`: Base `apiFetch()` and `apiStreamUrl()` helpers, port resolution
  - `papers.ts`: PDF and metadata endpoints
  - `highlights.ts`: CRUD operations for highlights
  - `chat.ts`: Streaming ask/conversation endpoints with SSE parsing

**`frontend/src/types/`:**
- Purpose: TypeScript interfaces for domain models
- Contains:
  - `paper.ts`: PaperMetadata interface
  - `highlight.ts`: HighlightData interface
  - `chat.ts`: ChatMessage, ModelInfo interfaces
  - `file.ts`: File browser types

**`frontend/src/utils/`:**
- Purpose: Shared utility functions
- Contains:
  - `noteHelpers.ts`: Note serialization/parsing for highlight comments

**`backend/app/routers/`:**
- Purpose: FastAPI endpoints grouped by domain
- Contains:
  - `papers.py`: GET /papers/pdf (serve PDF file), GET /papers/metadata, GET /papers/text
  - `highlights.py`: GET/POST/PATCH/DELETE /highlights CRUD operations
  - `chat.py`: POST /chat/ask (single question), POST /chat/conversation (multi-turn), GET /chat/models
  - `files.py`: File browser / directory listing endpoints (if implemented)

**`backend/app/services/`:**
- Purpose: Business logic isolated from HTTP layer
- Contains:
  - `pdf_service.py`: PDF extraction and text parsing via PyMuPDF
  - `llm_service.py`: LLM provider integration (Ollama, OpenAI, Anthropic) via LiteLLM
  - `context_service.py`: Context window management, token counting, TF-IDF chunking

**`backend/app/models/`:**
- Purpose: SQLAlchemy ORM model definitions for database tables
- Contains:
  - `paper.py`: Paper table (id, file_path, title, page_count, last_opened)
  - `highlight.py`: Highlight table (id, paper_path, content_text, position_json, color, comment, created_at)
  - `chat.py`: Chat message models (if persistence implemented)

**`backend/app/schemas/`:**
- Purpose: Pydantic request/response validation schemas
- Contains:
  - `paper.py`: PaperMetadata, PaperText, PageText response models
  - `highlight.py`: HighlightCreate, HighlightUpdate, HighlightResponse
  - `chat.py`: AskRequest, ConversationRequest, ModelInfo
  - `file_browser.py`: File listing response schema

**`electron/`:**
- Purpose: Desktop application wrapper and build configuration
- Key files:
  - `main.js`: Manages Electron window lifecycle, backend process spawning, port discovery
  - `preload.js`: Sets up IPC for window communication (minimal setup)
  - `package.json`: Defines electron and builder dependencies
  - `electron-builder.json`: Platform-specific packaging rules

**`backend/`:**
- Purpose: Python project root for backend
- Key files:
  - `pyproject.toml`: Dependencies, Python version, tool configs
  - `.env.example`: Template for environment variables (API keys, DATABASE_URL)
  - `app/main.py`: FastAPI instance creation and router mounting
  - `app/database.py`: SQLAlchemy engine, async session factory, init_db()
  - `app/config.py`: Settings loaded from environment

## Key File Locations

**Entry Points:**
- `frontend/src/main.tsx`: React app initialization, mounts App.tsx to DOM
- `frontend/src/App.tsx`: Root component, manages layout and routing between FileBrowser, PdfViewer, ChatPanel
- `backend/app/main.py`: FastAPI app creation, router registration, CORS middleware
- `electron/main.js`: Electron main process, backend subprocess management

**Configuration:**
- `frontend/vite.config.ts`: Vite build and dev server configuration
- `backend/app/config.py`: Pydantic settings for DATABASE_URL, LLM API keys, Ollama base URL
- `backend/.env`: Environment variables (not committed; see .env.example)
- `electron/electron-builder.json`: Platform-specific build rules and code signing

**Core Logic:**
- `backend/app/services/pdf_service.py`: PDF text extraction logic
- `backend/app/services/llm_service.py`: LLM model resolution and streaming
- `backend/app/services/context_service.py`: Context window optimization and TF-IDF retrieval
- `frontend/src/stores/paperStore.ts`: Tab and paper state management
- `frontend/src/stores/highlightStore.ts`: Highlight sync with backend

**Testing:**
- `backend/tests/`: Test files (pytest-based)
- Frontend: No test directory visible; tests would be co-located with components or in dedicated test folder

## Naming Conventions

**Files:**
- React components: PascalCase with .tsx extension (e.g., PdfViewer.tsx, ChatPanel.tsx)
- API/utility modules: camelCase with .ts extension (e.g., client.ts, noteHelpers.ts)
- Python routers: snake_case with .py extension (e.g., papers.py, highlights.py)
- Python models/services: snake_case with .py extension (e.g., pdf_service.py, llm_service.py)

**Directories:**
- Feature-based grouping: Plural nouns (components, stores, routers, services, schemas, models)
- Feature names: Lowercase with hyphens (pdf-viewer, file-browser, common)

**Functions/Methods:**
- Camel case (TypeScript): getPaperMetadata(), addHighlight(), streamCompletion()
- Snake case (Python): get_metadata(), extract_text(), stream_completion()

**Types/Interfaces:**
- PascalCase (TypeScript): HighlightData, ChatMessage, ModelInfo, PaperMetadata
- Suffix with Interface (optional convention): HighlightDataInterface (not consistently used)

## Where to Add New Code

**New Feature (e.g., bookmark management):**
- Primary code:
  - Backend model: `backend/app/models/bookmark.py`
  - Backend schema: `backend/app/schemas/bookmark.py`
  - Backend router: `backend/app/routers/bookmark.py`
  - Backend service (if complex logic): `backend/app/services/bookmark_service.py`
  - Frontend type: `frontend/src/types/bookmark.ts`
  - Frontend store: `frontend/src/stores/bookmarkStore.ts`
  - Frontend API: `frontend/src/api/bookmarks.ts`
  - Frontend components: `frontend/src/components/bookmarks/` (new directory)
- Tests: `backend/tests/test_bookmark.py`

**New Component:**
- Implementation: `frontend/src/components/[feature]/[ComponentName].tsx`
- Co-located styles: CSS/Tailwind classes within .tsx file or adjacent .css
- Types: Share types from `frontend/src/types/` or define locally if component-specific

**Utilities:**
- Shared helpers: `frontend/src/utils/[feature]Helpers.ts`
- Python utilities: `backend/app/utils/[feature]_helpers.py`

**Database Schema Changes:**
- Add ORM model to `backend/app/models/`
- Create Alembic migration (if migration system is set up)
- Update `backend/app/schemas/` with request/response schemas
- Update router to handle new fields

## Special Directories

**`electron/`:**
- Purpose: Electron-specific code and build configuration
- Generated: Build output in `electron/build/`, bundled backend binary
- Committed: All source files committed; build artifacts in .gitignore

**`dist/`:**
- Purpose: Build output directory for desktop packages
- Generated: Yes, created during packaging
- Committed: No (.gitignore)

**`frontend/dist/`:**
- Purpose: Vite production build output
- Generated: Yes, via `npm run build`
- Committed: No

**`backend/dist/`:**
- Purpose: PyInstaller bundled backend executable
- Generated: Yes, during packaging (from build script)
- Committed: No

**`.env` files:**
- Purpose: Environment-specific configuration and secrets
- Generated: Created from .env.example or manually
- Committed: No (sensitive data)

---

*Structure analysis: 2026-02-12*
